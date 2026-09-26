#!/usr/bin/env python3
"""
Build the Words app's data and whole-word audio (build time only — the app never calls an API).

For each word in parts.txt:
  1. Its whole-word recording, by the voice voices.txt names: ElevenLabs
     (Alexandra, slowed to 0.75 unless listed "elevenlabs-normal"), or
     Kokoro (made by sounds.py). Levelled, house format (MP3 64 kbps mono).
     ElevenLabs' per-letter timestamps are cached in alignment/ for later
     experiments; the app doesn't use them.
  2. Each part linked to its own sound — a shared Kokoro clip made by
     sounds.py.
  3. packages/games/words/src/data/words.json written.

    python3 tools/words/build.py            # only fetch what's missing
    python3 tools/words/build.py --force    # re-speak every word

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

from sounds import part_sounds, sound_id, word_voices

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, '..', '..')
AUDIO = os.path.join(REPO, 'packages', 'app', 'public', 'games', 'words', 'audio')
ALIGN = os.path.join(HERE, 'alignment')
OUT = os.path.join(REPO, 'packages', 'games', 'words', 'src', 'data', 'words.json')

# The voice already used for spoken instructions (Gifted), slowed so each sound is longer.
MANIFEST = json.load(open(os.path.join(REPO, 'tools', 'audio', 'manifest.json')))
VOICE = MANIFEST['voice']
SPEED = 0.75

# Consonant sounds that can be held ("mmm", "sss"); the rest are stops, said once.
STOPS = {'b', 'c', 'k', 'ck', 'd', 'g', 'p', 't', 'tt', 'ch', 'tch', 'j', 'x', 'q', 'qu'}


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
                'stretch': not silent and (vowel or g.lower() not in STOPS),
            })
        assert ''.join(p['g'] for p in parts) == word, f'{word}: parts do not join up'
        words.append({'word': word, 'level': int(level), 'parts': parts})
    return words


def speak(word: str, key: str, force: bool, speed: float = SPEED) -> None:
    mp3 = os.path.join(AUDIO, f'{word}.mp3')
    align_path = os.path.join(ALIGN, f'{word}.json')
    if os.path.exists(mp3) and os.path.exists(align_path) and not force:
        return
    body = json.dumps({
        'text': word,
        'model_id': VOICE['model'],
        'voice_settings': {**VOICE['settings'], 'speed': speed},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE['id']}/with-timestamps",
        data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    res = json.load(urllib.request.urlopen(req))
    raw = mp3 + '.raw.mp3'
    open(raw, 'wb').write(base64.b64decode(res['audio_base64']))
    # Level loudness and encode; no trimming, so the timestamps stay valid.
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    os.remove(raw)
    json.dump(res['alignment'], open(align_path, 'w'))
    print(f'  spoke "{word}"', flush=True)


def main():
    force = '--force' in sys.argv
    os.makedirs(AUDIO, exist_ok=True)
    os.makedirs(ALIGN, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    key = api_key()
    words = parse_parts()
    # Each part's own sound (a shared Kokoro clip in public/games/words/sounds/).
    sounds = dict(part_sounds())
    voices = word_voices()
    for entry in words:
        for part, arpa in zip(entry['parts'], sounds[entry['word']]):
            part['sound'] = sound_id(arpa) if arpa else None
        voice = voices.get(entry['word'], 'elevenlabs')
        if voice == 'kokoro':
            if not os.path.exists(os.path.join(AUDIO, f"{entry['word']}.mp3")):
                print(f"  missing Kokoro recording for \"{entry['word']}\" — run sounds.py")
            continue
        speak(entry['word'], key, force, 1.0 if voice == 'elevenlabs-normal' else SPEED)
    json.dump(words, open(OUT, 'w'), indent=1)
    print(f'{len(words)} words → {os.path.relpath(OUT, REPO)}')


if __name__ == '__main__':
    main()
