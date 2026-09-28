#!/usr/bin/env python3
"""
Build the Words app's data and whole-word audio (build time only — the app never calls an API).

For each word in parts.txt:
  1. Its whole-word recording — the only audio the app plays — in the take
     voices.txt picks for it (see TAKES; Kokoro ones are made by sounds.py).
     Levelled by level.py, house format (MP3 64 kbps mono).
  2. packages/games/words/src/data/words.json written: each word's parts,
     for the silent slider to light up.
  3. Each sentence in sentences.txt spoken (public/games/words/sentences/),
     with its words' timings for the card to light them up as they are read,
     into packages/games/words/src/data/sentences.json. A sentence is
     re-spoken only when its text changes.

    python3 tools/words/build.py                 # only fetch what's missing
    python3 tools/words/build.py --force         # re-speak every word
    python3 tools/words/build.py --takes DIR [--take plain]   # every word in every take (or one), for review

The key is read from ~/.config/elevenlabs/key (or $ELEVENLABS_API_KEY) and
never written anywhere.
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.request

from level import level, loudness
from sounds import VOWELS, pronunciations, word_voices

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, '..', '..')
AUDIO = os.path.join(REPO, 'packages', 'app', 'public', 'games', 'words', 'audio')
OUT = os.path.join(REPO, 'packages', 'games', 'words', 'src', 'data', 'words.json')
SENT_AUDIO = os.path.join(REPO, 'packages', 'app', 'public', 'games', 'words', 'sentences')
SENT_OUT = os.path.join(REPO, 'packages', 'games', 'words', 'src', 'data', 'sentences.json')

# The voice already used for spoken instructions (Gifted). Normal speed:
# slowing a single short word blurred its vowel.
MANIFEST = json.load(open(os.path.join(REPO, 'tools', 'audio', 'manifest.json')))
VOICE = MANIFEST['voice']
SPEED = 1.0

# The ways a word can be asked for, all in Alexandra's voice. Single short
# words go wrong in different ways on each, so each word gets whichever
# sounds right by ear (voices.txt); default 'plain' — spelling out the
# phonemes (tag) over-specified and mangled many words.
TAKES = {
    # English-only model given the exact dictionary pronunciation, every
    # vowel stressed so it is said fully.
    'tag': {'model': 'eleven_turbo_v2', 'phonemes': True},
    # English-only model, just the word: nothing to guess the language from.
    'plain': {'model': 'eleven_turbo_v2'},
    # Newer model, English enforced.
    'en': {'model': 'eleven_turbo_v2_5', 'language': 'en'},
    # The original: multilingual, so it guesses the language ("fin" came out French).
    'multi': {'model': 'eleven_multilingual_v2'},
}


def api_key() -> str:
    if os.environ.get('ELEVENLABS_API_KEY'):
        return os.environ['ELEVENLABS_API_KEY'].strip()
    raw = open(os.path.expanduser('~/.config/elevenlabs/key')).read().strip()
    m = re.search(r"=\s*['\"]?([^'\"\s]+)['\"]?\s*$", raw)
    return m.group(1) if m else raw


def parse_parts():
    words = []
    for line in open(os.path.join(HERE, 'parts.txt'), encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        level, word, spec = [s.strip() for s in line.split('|')]
        parts = []
        for tok in spec.split():
            g = tok.rstrip('^!_')
            flags = tok[len(g):]
            silent = '_' in flags
            vowel = '^' in flags
            parts.append({
                'g': g,
                'vowel': vowel,
                'heart': '!' in flags,
                'silent': silent,
            })
        assert ''.join(p['g'] for p in parts) == word, f'{word}: parts do not join up'
        words.append({'word': word, 'level': int(level), 'parts': parts})
    return words


def phoneme_text(word: str, arpa: list) -> str:
    """The word with its exact pronunciation attached, every vowel stressed so it is said fully."""
    ph = ' '.join(a + '1' if a in VOWELS else a for a in arpa)
    return f'<phoneme alphabet="cmu-arpabet" ph="{ph}">{word}</phoneme>'


def speak(word: str, arpa: list, take: str, key: str, out: str, speed: float = SPEED) -> None:
    """One take of a word, levelled into `out`."""
    t = TAKES[take]

    def say(text):
        body = {'text': text, 'model_id': t['model'], 'voice_settings': {**VOICE['settings'], 'speed': speed}}
        if 'language' in t:
            body['language_code'] = t['language']
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE['id']}",
                                     data=json.dumps(body).encode(),
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        return urllib.request.urlopen(req).read()

    raw = out + '.raw.mp3'
    # Now and then a very short word comes back as near-silence: ask again,
    # then with a full stop, which voices it more reliably. A few ("the")
    # never speak with the phoneme tag; those get the plain word.
    texts = ([phoneme_text(word, arpa)] * 3 if t.get('phonemes') else []) + [word] * 3 + [f'{word}.'] * 3
    for text in texts:
        open(raw, 'wb').write(say(text))
        if loudness(raw)[0] > -45:
            break
        print(f'  "{word}" ({take}) came back silent, retrying', flush=True)
    else:
        os.remove(raw)
        raise SystemExit(f'"{word}" ({take}): silent every time')
    level(out, src=raw)
    os.remove(raw)
    note = ', with a full stop' if text.endswith('.') else ', plain word' if t.get('phonemes') and text == word else ''
    print(f'  spoke "{word}" ({take}{note})', flush=True)


def parse_sentences():
    """{word: [(concept, text with {braces} round the word)]} from sentences.txt."""
    out = {}
    for line in open(os.path.join(HERE, 'sentences.txt'), encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        word, concept, text = [x.strip() for x in line.split('|', 2)]
        assert '{' in text, f'{word}: no {{word}} marked in "{text}"'
        out.setdefault(word, []).append((concept, text))
    return out


def speak_sentence(text: str, key: str, out: str):
    """Speak a sentence (Alexandra, English-only model, the instructions' pace) and time its words."""
    body = {'text': text, 'model_id': TAKES['plain']['model'], 'voice_settings': VOICE['settings']}
    for _ in range(4):
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE['id']}/with-timestamps",
                                     data=json.dumps(body).encode(),
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        res = json.load(urllib.request.urlopen(req))
        raw = out + '.raw.mp3'
        open(raw, 'wb').write(base64.b64decode(res['audio_base64']))
        if loudness(raw)[0] > -45:
            break
    level(out, src=raw)
    os.remove(raw)
    a = res['alignment']
    assert ''.join(a['characters']) == text, f'timings do not line up with "{text}"'
    # Each word: [first char, end char, start s, end s].
    return [[m.start(), m.end(), a['character_start_times_seconds'][m.start()], a['character_end_times_seconds'][m.end() - 1]]
            for m in re.finditer(r"[\w'-]+", text)]


def build_sentences(key: str, force: bool) -> None:
    os.makedirs(SENT_AUDIO, exist_ok=True)
    old = json.load(open(SENT_OUT)) if os.path.exists(SENT_OUT) else {}
    out = {}
    for word, items in parse_sentences().items():
        out[word] = []
        for i, (concept, marked) in enumerate(items):
            text = marked.replace('{', '').replace('}', '')
            # The marked spans ([start, end) in the plain text): every {…}.
            marks, shift = [], 0
            for m in re.finditer(r'\{([^}]*)\}', marked):
                marks.append([m.start() - shift, m.end() - shift - 2])
                shift += 2
            name = f'{word}-{i + 1}'
            mp3 = os.path.join(SENT_AUDIO, f'{name}.mp3')
            prev = next((e for e in old.get(word, []) if e['audio'] == name and e['text'] == text), None)
            if prev and os.path.exists(mp3) and not force:
                words = prev['words']
            else:
                words = speak_sentence(text, key, mp3)
                print(f'  said "{text}"', flush=True)
            out[word].append({'text': text, 'marks': marks, 'concept': concept, 'audio': name, 'words': words})
    json.dump(out, open(SENT_OUT, 'w'), indent=1)
    print(f'{sum(len(v) for v in out.values())} sentences for {len(out)} words → {os.path.relpath(SENT_OUT, REPO)}')


def main():
    force = '--force' in sys.argv
    key = api_key()
    cmu = pronunciations()
    words = parse_parts()
    if '--takes' in sys.argv:
        folder = sys.argv[sys.argv.index('--takes') + 1]
        only = sys.argv[sys.argv.index('--take') + 1] if '--take' in sys.argv else None
        failed = []
        for take in [only] if only else TAKES:
            os.makedirs(os.path.join(folder, take), exist_ok=True)
            for entry in words:
                out = os.path.join(folder, take, f"{entry['word']}.mp3")
                if force or not os.path.exists(out):
                    try:
                        speak(entry['word'], cmu[entry['word']], take, key, out)
                    except SystemExit as e:
                        failed.append(str(e))
        print('failed: ' + '; '.join(failed) if failed else 'all takes made')
        return
    os.makedirs(AUDIO, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    voices = word_voices()
    for entry in words:
        take = voices.get(entry['word'], 'plain')
        out = os.path.join(AUDIO, f"{entry['word']}.mp3")
        if take == 'kokoro':
            if not os.path.exists(out):
                print(f"  missing Kokoro recording for \"{entry['word']}\" — run sounds.py")
            continue
        if force or not os.path.exists(out):
            speak(entry['word'], cmu[entry['word']], take, key, out)
    json.dump(words, open(OUT, 'w'), indent=1)
    print(f'{len(words)} words → {os.path.relpath(OUT, REPO)}')
    build_sentences(key, force)


if __name__ == '__main__':
    main()
