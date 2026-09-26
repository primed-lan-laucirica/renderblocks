#!/usr/bin/env python3
"""
Individual sounds for the Words app, generated locally with Kokoro (no API).

Each word part in parts.txt gets its sound from the word's dictionary
pronunciation (CMU, in sight_words.csv): one sound per part, except letter
groups that make two (or = aw+r, le = u+l, the o in "one" = w+u …). Every
distinct sound is spoken once by Kokoro from its exact phonetic spelling
and shared by all words that use it.

Needs `pip install kokoro-onnx soundfile` and the model files
(kokoro-v1.0.onnx, voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases) in $KOKORO_DIR.

    KOKORO_DIR=~/kokoro python3 tools/words/sounds.py [--force]
"""
import csv
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, '..', '..')
OUT_DIR = os.path.join(REPO, 'packages', 'app', 'public', 'games', 'words', 'sounds')
VOICE = 'af_heart'

ARPA_IPA = {
    'AA': 'ɑː', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔː', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɜː', 'EY': 'eɪ',
    'IH': 'ɪ', 'IY': 'iː', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'uː',
    'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'JH': 'dʒ', 'K': 'k', 'L': 'l',
    'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ', 'T': 't', 'TH': 'θ', 'V': 'v',
    'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ',
}
VOWELS = {'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'}
# Parts that make two sounds.
TWO_SOUNDS = {'or', 'ar', 'ere', 'eir', 'our', 'le'}
TWO_SOUNDS_IN = {('one', 'o'), ('use', 'u')}


def part_sounds():
    """[(word, [arpabet list per sounding part])] for every word in parts.txt."""
    cmu = {r['word']: r['phonemes_arpabet'].split()
           for r in csv.DictReader(open(os.path.join(HERE, 'sight_words.csv'), encoding='utf-8-sig'))}
    out = []
    for line in open(os.path.join(HERE, 'parts.txt'), encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        _, word, spec = [s.strip() for s in line.split('|')]
        ph = list(cmu[word])
        per_part = []
        for tok in spec.split():
            g = tok.rstrip('^!_')
            if '_' in tok:
                per_part.append([])
                continue
            # A letter group makes two sounds only if the second really is its r / l
            # ("for" = f + aw-r, but in "word" the "or" is the single sound "er").
            two = (g in TWO_SOUNDS and len(ph) > 1 and ph[1] == ('L' if g == 'le' else 'R')) or (word, g) in TWO_SOUNDS_IN
            n = 2 if two else 1
            per_part.append(ph[:n])
            ph = ph[n:]
            assert per_part[-1], f'{word}: part "{g}" has no sound'
        assert not ph, f'{word}: sounds left over {ph}'
        out.append((word, per_part))
    return out


def ipa(arpa):
    """Phonetic spelling for Kokoro; a vowel gets stress so it is said fully."""
    return ''.join(('ˈ' if a in VOWELS else '') + ARPA_IPA[a] for a in arpa)


def sound_id(arpa):
    return '-'.join(a.lower() for a in arpa)


def main():
    from kokoro_onnx import Kokoro
    import soundfile as sf
    force = '--force' in sys.argv
    kdir = os.path.expanduser(os.environ.get('KOKORO_DIR', '~/kokoro'))
    k = Kokoro(os.path.join(kdir, 'kokoro-v1.0.onnx'), os.path.join(kdir, 'voices-v1.0.bin'))
    os.makedirs(OUT_DIR, exist_ok=True)
    needed = {sound_id(a): a for _, parts in part_sounds() for a in parts if a}
    for sid, arpa in sorted(needed.items()):
        mp3 = os.path.join(OUT_DIR, f'{sid}.mp3')
        if os.path.exists(mp3) and not force:
            continue
        samples, rate = k.create(ipa(arpa), voice=VOICE, speed=0.8, is_phonemes=True)
        wav = os.path.join(tempfile.mkdtemp(), 'x.wav')
        sf.write(wav, samples, rate)
        # Trim silence at both ends only, level, house format.
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', wav, '-af',
                        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,areverse,'
                        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,'
                        'loudnorm=I=-16:TP=-1.5:LRA=11',
                        '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
        print(f'  {sid:10} /{ipa(arpa)}/', flush=True)
    json.dump({sid: ipa(a) for sid, a in sorted(needed.items())}, open(os.path.join(OUT_DIR, 'index.json'), 'w'), indent=1)
    print(f'{len(needed)} sounds → {os.path.relpath(OUT_DIR, REPO)}')


if __name__ == '__main__':
    main()
