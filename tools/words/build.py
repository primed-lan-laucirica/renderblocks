#!/usr/bin/env python3
"""
Build the Words app's data and whole-word audio (build time only — the app never calls an API).

For each word in parts.txt:
  1. Its whole-word recording — the only audio the app plays: ElevenLabs
     (Alexandra, normal speed, for clarity), or Kokoro where voices.txt says
     so (made by sounds.py). Spoken on an English-only model from the word's
     exact dictionary pronunciation, every vowel stressed so it is said
     fully: a multilingual model guesses the language of a lone word ("fin"
     came out French). Levelled by level.py, house format (MP3 64 kbps mono).
  2. packages/games/words/src/data/words.json written: each word's parts,
     for the silent slider to light up.

    python3 tools/words/build.py            # only fetch what's missing
    python3 tools/words/build.py --force    # re-speak every word

The key is read from ~/.config/elevenlabs/key (or $ELEVENLABS_API_KEY) and
never written anywhere.
"""
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

# The voice already used for spoken instructions (Gifted). Normal speed:
# slowing a single short word blurred its vowel.
MANIFEST = json.load(open(os.path.join(REPO, 'tools', 'audio', 'manifest.json')))
VOICE = MANIFEST['voice']
SPEED = 1.0
# English-only, and it follows a phoneme tag (the multilingual model does not).
MODEL = 'eleven_turbo_v2'


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


def speak(word: str, arpa: list, key: str, force: bool, speed: float = SPEED) -> None:
    mp3 = os.path.join(AUDIO, f'{word}.mp3')
    if os.path.exists(mp3) and not force:
        return
    def say(text):
        body = json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': {**VOICE['settings'], 'speed': speed}}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE['id']}", data=body,
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        return urllib.request.urlopen(req).read()

    raw = mp3 + '.raw.mp3'
    # Now and then a very short word comes back as near-silence: ask again. A
    # few ("the") never speak with the phoneme tag; the English-only model
    # then gets the plain word — with no other language to guess from.
    for text in [phoneme_text(word, arpa)] * 3 + [word] * 3:
        open(raw, 'wb').write(say(text))
        if loudness(raw)[0] > -45:
            break
        print(f'  "{word}" came back silent, retrying', flush=True)
    else:
        os.remove(raw)
        raise SystemExit(f'"{word}": silent every time')
    if text == word:
        print(f'  "{word}": spoken from the plain word (the phoneme tag gave silence)', flush=True)
    level(mp3, src=raw)
    os.remove(raw)
    print(f'  spoke "{word}" /{" ".join(arpa)}/', flush=True)


def main():
    force = '--force' in sys.argv
    os.makedirs(AUDIO, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    key = api_key()
    cmu = pronunciations()
    words = parse_parts()
    # Each part's own sound (a shared Kokoro clip in public/games/words/sounds/).
    voices = word_voices()
    for entry in words:
        voice = voices.get(entry['word'], 'elevenlabs')
        if voice == 'kokoro':
            if not os.path.exists(os.path.join(AUDIO, f"{entry['word']}.mp3")):
                print(f"  missing Kokoro recording for \"{entry['word']}\" — run sounds.py")
            continue
        speak(entry['word'], cmu[entry['word']], key, force)
    json.dump(words, open(OUT, 'w'), indent=1)
    print(f'{len(words)} words → {os.path.relpath(OUT, REPO)}')


if __name__ == '__main__':
    main()
