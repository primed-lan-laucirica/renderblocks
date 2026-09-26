#!/usr/bin/env python3
"""
Whole-word recordings made locally with Kokoro (no API), for the words
voices.txt assigns to it — the few ElevenLabs keeps saying wrong. Each is
spoken from the word's exact dictionary pronunciation (CMU), so the vowel
is right by construction.

Needs `pip install kokoro-onnx soundfile` and the model files
(kokoro-v1.0.onnx, voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases) in $KOKORO_DIR.

    KOKORO_DIR=~/kokoro python3 tools/words/sounds.py [--force]
"""
import csv
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, '..', '..')
WORD_DIR = os.path.join(REPO, 'packages', 'app', 'public', 'games', 'words', 'audio')
VOICE = 'af_heart'

ARPA_IPA = {
    'AA': 'ɑː', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔː', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɜː', 'EY': 'eɪ',
    'IH': 'ɪ', 'IY': 'iː', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'uː',
    'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'JH': 'dʒ', 'K': 'k', 'L': 'l',
    'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ', 'T': 't', 'TH': 'θ', 'V': 'v',
    'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ',
}
VOWELS = {'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'}


def pronunciations():
    """{word: [ARPAbet]}: sight words, then the sound-it-out words (both from CMU)."""
    cmu = {}
    for name in ('sight_words.csv', 'phonemes_extra.csv'):
        for r in csv.DictReader(open(os.path.join(HERE, name), encoding='utf-8-sig')):
            cmu.setdefault(r['word'], r['phonemes_arpabet'].split())
    return cmu


def word_voices():
    """{word: 'kokoro'} from voices.txt (every other word: ElevenLabs)."""
    out = {}
    for line in open(os.path.join(HERE, 'voices.txt'), encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#'):
            voice, words = [s.strip() for s in line.split('|')]
            out.update({w: voice for w in words.split()})
    return out


def ipa(arpa):
    """Phonetic spelling for Kokoro; each vowel gets stress so it is said fully."""
    return ''.join(('ˈ' if a in VOWELS else '') + ARPA_IPA[a] for a in arpa)


def main():
    from kokoro_onnx import Kokoro
    import soundfile as sf
    force = '--force' in sys.argv
    kdir = os.path.expanduser(os.environ.get('KOKORO_DIR', '~/kokoro'))
    k = Kokoro(os.path.join(kdir, 'kokoro-v1.0.onnx'), os.path.join(kdir, 'voices-v1.0.bin'))
    cmu = pronunciations()
    made = 0
    for word, voice in sorted(word_voices().items()):
        mp3 = os.path.join(WORD_DIR, f'{word}.mp3')
        if voice != 'kokoro' or (os.path.exists(mp3) and not force):
            continue
        samples, rate = k.create(ipa(cmu[word]), voice=VOICE, speed=0.85, is_phonemes=True)
        wav = os.path.join(tempfile.mkdtemp(), 'x.wav')
        sf.write(wav, samples, rate)
        # Trim silence at both ends only, level, house format.
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', wav, '-af',
                        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,'
                        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
                        'loudnorm=I=-16:TP=-1.5:LRA=11',
                        '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
        print(f'  "{word}" /{ipa(cmu[word])}/', flush=True)
        made += 1
    print(f'{made} Kokoro word recordings made')


if __name__ == '__main__':
    main()
