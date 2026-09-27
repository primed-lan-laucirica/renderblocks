#!/usr/bin/env python3
"""
Level spoken words to one loudness.

ffmpeg's one-pass loudnorm is built for programme-length audio: on a clip
under a second it often barely acts, which left word clips anywhere from
-14 to -59 LUFS ("hat" was nearly silent). Instead: measure each clip's
momentary loudness (EBU R128, the loudest 400 ms — right for a single
word), then apply exactly the gain that brings it to TARGET. A word whose brief
consonant burst (the t of "hat") would pass CEILING first gets up to
LIMIT_DB of that burst shaved by a fast limiter, which the ear doesn't
notice; beyond that the gain stops short. Timing is untouched.

  python3 tools/words/level.py            # level every clip in the words app
  python3 tools/words/level.py --check    # report only
  python3 tools/words/level.py a.mp3 ...  # level just these
"""
import glob
import os
import re
import statistics
import subprocess
import sys

TARGET = -16.0  # LUFS, momentary max
CEILING = -1.5  # dBFS, sample peak after gain
LIMIT_DB = 6.0  # most a peak may be limited to reach TARGET
AUDIO = os.path.join(os.path.dirname(__file__), '../../packages/app/public/games/words/audio')


def loudness(path):
    """(momentary max LUFS, sample peak dBFS) of a clip."""
    err = subprocess.run(
        ['ffmpeg', '-nostdin', '-hide_banner', '-v', 'verbose', '-i', path, '-af', 'ebur128=framelog=verbose:peak=sample',
         '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = [float(v) for v in re.findall(r' M:\s*(-?[\d.]+)', err)]
    peak = re.findall(r'Peak:\s*(-?[\d.]+|-inf) dBFS', err)
    return (max(m) if m else float('-inf')), (float(peak[-1]) if peak and peak[-1] != '-inf' else float('-inf'))


def level(path, src=None):
    """Level `src` (default: the file itself) into `path` as house-format MP3. Returns (before, gain, capped)."""
    src = src or path
    m, peak = loudness(src)
    if m == float('-inf'):
        raise SystemExit(f'{src}: silent')
    gain = TARGET - m
    over = peak + gain - CEILING  # dB the peak would pass the ceiling by
    capped = over > LIMIT_DB
    if capped:
        gain -= over - LIMIT_DB
    chain = f'volume={gain:.2f}dB'
    if over > 0:
        # 1 ms attack: the limiter's look-ahead delays the audio by only that.
        chain += f',alimiter=limit={10 ** (CEILING / 20):.4f}:attack=1:release=40:level=false'
    tmp = path + '.level.mp3'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', src, '-af', chain,
                    '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', tmp], check=True)
    os.replace(tmp, path)
    return m, gain, capped


def main():
    check = '--check' in sys.argv
    files = [a for a in sys.argv[1:] if not a.startswith('--')] or sorted(glob.glob(os.path.join(AUDIO, '*.mp3')))
    rows = []
    for f in files:
        name = os.path.basename(f)[:-4]
        if check:
            m, _ = loudness(f)
            rows.append((m, name))
            continue
        m, gain, capped = level(f)
        rows.append((m, name))
        if abs(gain) > 6 or capped:
            print(f'  {name:10} {m:6.1f} LUFS  {gain:+5.1f} dB{"  (peak-capped)" if capped else ""}')
    vals = sorted(v for v, _ in rows)
    print(f'{len(rows)} clips {"measured" if check else "levelled"}; before: {vals[0]:.1f} to {vals[-1]:.1f} LUFS, '
          f'median {statistics.median(vals):.1f}')


if __name__ == '__main__':
    main()
