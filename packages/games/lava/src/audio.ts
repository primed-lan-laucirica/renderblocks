/**
 * Web Audio for battle sounds: up to 60 blocks can land at once, which
 * needs overlapping, low-latency playback (spec 14.8). MVP stand-ins:
 * pop = thud, whoosh = sizzle (spec 14.10).
 */
type Sound = 'pop' | 'whoosh' | 'celebrate' | 'fall1' | 'fall2' | 'fall3' | 'fall4'

const SOURCES: Record<Sound, string> = {
  pop: '/games/shared/sfx/pop.mp3',
  whoosh: '/games/shared/sfx/whoosh.mp3',
  celebrate: '/games/shared/sfx/celebrate.mp3',
  // Falling screams, so Render doesn't have to do them all himself.
  fall1: '/games/lava/voice/fall1.mp3', // "Aaaaah!"
  fall2: '/games/lava/voice/fall2.mp3', // "Noooo!"
  fall3: '/games/lava/voice/fall3.mp3', // "Whoaaa!"
  fall4: '/games/lava/voice/fall4.mp3', // "Heeelp!"
}
const SCREAMS: Sound[] = ['fall1', 'fall2', 'fall3', 'fall4']

let ctx: AudioContext | null = null
const buffers = new Map<Sound, AudioBuffer>()
const playing = new Set<AudioBufferSourceNode>()

function context(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    for (const name of Object.keys(SOURCES) as Sound[]) {
      fetch(SOURCES[name])
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

interface Voice {
  src: AudioBufferSourceNode
  gain: GainNode
}

function play(name: Sound, volume: number, rate = 1): Voice | null {
  const c = context()
  const buf = buffers.get(name)
  if (!buf || c.state !== 'running') return null
  const src = c.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const gain = c.createGain()
  gain.gain.value = volume
  src.connect(gain).connect(c.destination)
  src.onended = () => playing.delete(src)
  playing.add(src)
  src.start()
  return { src, gain }
}

/** Pitch by size: little blocks squeak, big blocks rumble. */
const sizeRate = (size: number, hi: number, lo: number) =>
  Math.min(hi, Math.max(lo, hi - 0.3 * Math.log10(Math.max(1, size * size))))

/** Bigger blocks thud lower. */
export function thud(strength: number, size: number): void {
  play('pop', 0.25 + 0.75 * strength, sizeRate(size, 1.3, 0.45))
}

let screamTurn = 0
const screaming = new Set<Voice>()
/** A pile knocked off at once should sound like a crowd, not a wall of noise. */
const MAX_SCREAMS = 4

/**
 * A falling block's scream. Variants rotate so neighbours sound different;
 * pitch follows size (a slower, deeper scream also lasts longer, which suits
 * a big block's longer fall). Returns a handle for cutScream.
 */
export function scream(size: number): Voice | null {
  if (screaming.size >= MAX_SCREAMS) return null
  const v = play(SCREAMS[screamTurn++ % SCREAMS.length], 0.85, sizeRate(size, 1.35, 0.7))
  if (v) {
    screaming.add(v)
    v.src.addEventListener('ended', () => screaming.delete(v))
  }
  return v
}

/** Cut a scream short with a quick fade — it hit the lava, or was rescued. */
export function cutScream(v: Voice | null, fade = 0.12): void {
  if (!v || !ctx) return
  const t = ctx.currentTime
  v.gain.gain.cancelScheduledValues(t)
  v.gain.gain.setValueAtTime(v.gain.gain.value, t)
  v.gain.gain.linearRampToValueAtTime(0, t + fade)
  try {
    v.src.stop(t + fade + 0.02)
  } catch {
    // Already stopped.
  }
  screaming.delete(v)
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
  screaming.clear()
}
