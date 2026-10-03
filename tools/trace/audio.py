#!/usr/bin/env python3
"""
Voice clips for the Trace app, in the Words app's voice (tools/words/build.py):
letter names (a.mp3 … z.mp3, said as the capital letter) and shape names.
Build time only — the app plays the files and never calls the API.

    python3 tools/trace/audio.py           # only missing clips
    python3 tools/trace/audio.py --force   # redo all
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'words'))
from build import api_key, speak  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'packages', 'app', 'public', 'games', 'trace')
SHAPES = ['line down', 'line across', 'slant', 'zigzag', 'wave', 'loop', 'circle', 'square', 'triangle', 'star']


def main():
    force = '--force' in sys.argv
    key = api_key()
    jobs = [(c.upper(), os.path.join(OUT, 'letters', f'{c}.mp3')) for c in 'abcdefghijklmnopqrstuvwxyz']
    jobs += [(s, os.path.join(OUT, 'shapes', f"{s.replace(' ', '-')}.mp3")) for s in SHAPES]
    for text, out in jobs:
        if os.path.exists(out) and not force:
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        speak(text, [], 'plain', key, out)


if __name__ == '__main__':
    main()
