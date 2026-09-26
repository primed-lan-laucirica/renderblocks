#!/usr/bin/env python3
"""
Build-time check that chorus clips say their word — offline, no API.

ElevenLabs sound-effect takes sometimes start part-way into the word when
the requested length is too short for it ("illion" for "million"). Start
loudness alone can't tell (many words legitimately start fast), so this
listens: a local speech recognizer (faster-whisper) transcribes each clip,
padded with silence, and flags any clip not heard as its own word.

    python tools/audio/check-words.py shared/number
    python tools/audio/check-words.py shared/equations --model small.en

Needs `pip install faster-whisper` (a scratch venv is fine); the model
downloads on first use. Fix flagged clips by regenerating them with more
room, e.g.:
    node tools/audio/generate.mjs --only shared/number --items sixty --stretch 2
then run this again. A child's voice on one word is often heard with low
confidence even when fine — only MISHEARD clips need attention.
"""
import argparse
import json
import os
import re
import subprocess
import tempfile

from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, '..', '..', 'packages', 'app', 'public', 'games')

ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
TENS = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'}


def spell(n: int) -> str:
    """Whole numbers the recognizer writes as digits, back into words (to 999,999)."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10 * 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + spell(n % 100))
    return spell(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else ' ' + spell(n % 1000))


def norm(text: str) -> str:
    t = text.lower().replace(',', '')
    t = re.sub(r'\d+', lambda m: spell(int(m.group())), t)
    t = t.replace('+', ' plus ').replace('=', ' equals ').replace('×', ' times ').replace('÷', ' divided by ')
    t = re.sub(r'(?<=\w)-(?=\w)', ' ', t)
    t = re.sub(r'[^a-z ]', ' ', t)
    t = re.sub(r'\bone hundred\b', 'hundred', t) if t.strip() == 'one hundred' else t
    t = re.sub(r'\bone thousand\b', 'thousand', t) if t.strip() == 'one thousand' else t
    return ' '.join(t.split())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('dir', help='chorus group dir from tools/audio/manifest.json, e.g. shared/number')
    ap.add_argument('--model', default='medium.en')
    args = ap.parse_args()

    manifest = json.load(open(os.path.join(HERE, 'manifest.json')))
    group = next(g for g in manifest['chorus'] if g['dir'] == args.dir)
    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    tmp = tempfile.mkdtemp()

    misheard = []
    for name, spec in group['items'].items():
        want = norm(spec if isinstance(spec, str) else spec['text'])
        src = os.path.join(PUBLIC, args.dir, f'{name}.mp3')
        wav = os.path.join(tmp, 'clip.wav')
        # Half a second of silence either side stops the model inventing words on very short clips.
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', 'adelay=500|500,apad=pad_dur=0.5',
                        '-ar', '16000', '-ac', '1', wav], check=True)
        segs = list(model.transcribe(wav, language='en', beam_size=5, word_timestamps=True,
                                     condition_on_previous_text=False)[0])
        heard = norm(' '.join(s.text for s in segs))
        conf = min((w.probability for s in segs for w in (s.words or [])), default=0.0)
        ok = heard == want
        if not ok:
            misheard.append(name)
        print(f"{'ok      ' if ok else 'MISHEARD'} {name:16} heard {heard!r:32} conf {conf:.2f}", flush=True)
    print(f'\n{len(misheard)} misheard of {len(group["items"])}: {",".join(misheard)}')


if __name__ == '__main__':
    main()
