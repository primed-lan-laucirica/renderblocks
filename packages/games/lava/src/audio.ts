/**
 * Web Audio for battle sounds: up to 60 blocks can land at once, which
 * needs overlapping, low-latency playback (spec 14.8). MVP stand-ins:
 * pop = thud, whoosh = sizzle (spec 14.10).
 */
type Sound = 'pop' | 'whoosh' | 'celebrate'

let ctx: AudioContext | null = null
const buffers = new Map<Sound, AudioBuffer>()
const playing = new Set<AudioBufferSourceNode>()

function context(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    for (const name of ['pop', 'whoosh', 'celebrate'] as Sound[]) {
      fetch(`/games/shared/sfx/${name}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx!.decodeAudioData(data))
        .then((buf) => buffers.set(name, buf))
        .catch(() => {
          // Missing clip: that sound is silent, the game still works.
        })
    }
  }
  return ctx
}

/** Call from a touch handler: browsers only start audio after a user gesture. */
export function unlockAudio(): void {
  const c = context()
  if (c.state === 'suspended') void c.resume()
}

function play(name: Sound, volume: number, rate = 1): void {
  const c = context()
  const buf = buffers.get(name)
  if (!buf || c.state !== 'running') return
  const src = c.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const gain = c.createGain()
  gain.gain.value = volume
  src.connect(gain).connect(c.destination)
  src.onended = () => playing.delete(src)
  playing.add(src)
  src.start()
}

/** Bigger blocks thud lower. */
export function thud(strength: number, size: number): void {
  const rate = Math.min(1.3, Math.max(0.45, 1.3 - 0.3 * Math.log10(Math.max(1, size * size))))
  play('pop', 0.25 + 0.75 * strength, rate)
}

export function sizzle(): void {
  play('whoosh', 0.6, 0.7)
}

export function celebrate(): void {
  play('celebrate', 0.9)
}

export function stopAudio(): void {
  for (const src of playing) {
    try {
      src.stop()
    } catch {
      // Already stopped.
    }
  }
  playing.clear()
}
