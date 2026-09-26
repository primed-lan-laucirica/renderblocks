#!/usr/bin/env python3
"""
Build the Words app's data and audio (build time only — the app never calls an API).

For each word in parts.txt:
  1. Speak it once with ElevenLabs text-to-speech, slowed a little, asking
     for per-letter timestamps (cached: alignment/<word>.json + the mp3).
  2. Level the loudness and encode in the house format (MP3 64 kbps mono) —
     no silence trimming, so the timestamps still line up.
  3. Correct the timings against the sound: the raw letter timings run from
     0 s to the clip's end, silence included, and sit a little early. They are
     fitted onto the part of the clip that actually has sound, and in words
     with one vowel sound the vowel is snapped to the loudest stretch, with
     the consonants fitted before and after it.
  4. Link each part to its own sound, a shared clip made locally by
     sounds.py (Kokoro) — the whole word comes from ElevenLabs, the parts
     from Kokoro.
  5. Write packages/games/words/src/data/words.json.

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

import numpy as np

from sounds import part_sounds, sound_id

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


def speak(word: str, key: str, force: bool) -> dict:
    mp3 = os.path.join(AUDIO, f'{word}.mp3')
    align_path = os.path.join(ALIGN, f'{word}.json')
    if os.path.exists(mp3) and os.path.exists(align_path) and not force:
        return json.load(open(align_path))
    body = json.dumps({
        'text': word,
        'model_id': VOICE['model'],
        'voice_settings': {**VOICE['settings'], 'speed': SPEED},
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
    return res['alignment']


def envelope(mp3: str):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', mp3, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop = 480  # 10 ms
    env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x), hop)])
    db = 20 * np.log10(env / (env.max() + 1e-9) + 1e-9)
    return db, len(x) / 48000, hop / 48000


def timings(entry, alignment, mp3):
    """Start/end seconds for each part, corrected against the sound (see module docstring)."""
    parts = entry['parts']
    starts = alignment['character_start_times_seconds']
    ends = alignment['character_end_times_seconds']
    db, duration, dt = envelope(mp3)
    loud = np.where(db > -40)[0]
    sound0, sound1 = loud[0] * dt, (loud[-1] + 1) * dt
    a0, a1 = starts[0], ends[-1]
    fit = lambda t: sound0 + (t - a0) / (a1 - a0) * (sound1 - sound0)

    i = 0
    for p in parts:
        n = len(p['g'])
        p['t0'], p['t1'] = fit(starts[i]), fit(ends[i + n - 1])
        i += n

    vowels = [p for p in parts if p['vowel']]
    if len(vowels) == 1:
        # One vowel sound: it is the loud middle. Snap it there; fit consonants around it.
        peak = int(np.argmax(db))
        lo = hi = peak
        while lo > 0 and db[lo - 1] > db[peak] - 12:
            lo -= 1
        while hi < len(db) - 1 and db[hi + 1] > db[peak] - 12:
            hi += 1
        v0, v1 = lo * dt, (hi + 1) * dt
        vi = parts.index(vowels[0])
        before, after = parts[:vi], parts[vi + 1:]

        def spread(group, t_from, t_to):
            sounding = [p for p in group if not p['silent']]
            total = sum(p['t1'] - p['t0'] for p in sounding) or 1
            t = t_from
            for p in group:
                if p['silent']:
                    p['t0'] = p['t1'] = t
                    continue
                share = (p['t1'] - p['t0']) / total * (t_to - t_from)
                p['t0'], p['t1'] = t, t + share
                t += share

        # Nothing sounding before or after it: the vowel runs to that edge of the sound.
        if not any(not p['silent'] for p in before):
            v0 = sound0
        if not any(not p['silent'] for p in after):
            v1 = sound1
        spread(before, sound0, v0)
        vowels[0]['t0'], vowels[0]['t1'] = v0, v1
        spread(after, v1, sound1)

    for p in parts:
        if p['silent']:
            p['t1'] = p['t0']  # silent letters make no sound of their own
        p['t0'], p['t1'] = round(float(p['t0']), 3), round(float(p['t1']), 3)
    return round(float(duration), 3), round(float(sound0), 3), round(float(sound1), 3)


def main():
    force = '--force' in sys.argv
    os.makedirs(AUDIO, exist_ok=True)
    os.makedirs(ALIGN, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    key = api_key()
    words = parse_parts()
    # Each part's own sound (a shared Kokoro clip in public/games/words/sounds/).
    sounds = dict(part_sounds())
    for entry in words:
        for part, arpa in zip(entry['parts'], sounds[entry['word']]):
            part['sound'] = sound_id(arpa) if arpa else None
    for entry in words:
        alignment = speak(entry['word'], key, force)
        mp3 = os.path.join(AUDIO, f"{entry['word']}.mp3")
        entry['duration'], entry['soundStart'], entry['soundEnd'] = timings(entry, alignment, mp3)
    json.dump(words, open(OUT, 'w'), indent=1)
    print(f'{len(words)} words → {os.path.relpath(OUT, REPO)}')


if __name__ == '__main__':
    main()
