import { pickScream, type ScreamClip } from './screams'

/**
 * Web Audio for battle sounds: up to 60 blocks can land at once, which
 * needs overlapping, low-latency playback (spec 14.8). MVP stand-ins:
 * pop = thud, whoosh = sizzle (spec 14.10).
 */
type Effect = 'pop' | 'whoosh' | 'celebrate'

const VOICE_DIR = '/games/lava/voice'

let ctx: AudioContext | null = null
const effects = new Map<Effect, AudioBuffer>()
const playing = new Set<AudioBufferSourceNode>()

/**
 * Falling screams (8 types × 8 lengths). Kept compressed and decoded only
 * when a fall needs one — decoding all 64 up front would hold ~50 MB of PCM.
 */
let screamClips: ScreamClip[] = []
const screamBytes = new Map<string, ArrayBuffer>()
const screamDecoded = new Map<string, AudioBuffer>()
const DECODED_KEEP = 12

function context(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    for (const name of ['pop', 'whoosh', 'celebrate'] as Effect[]) {
      fetch(`/games/shared/sfx/${name}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx!.decodeAudioData(data))
        .then((buf) => effects.set(name, buf))
        .catch(() => {
          // Missing clip: that sound is silent, the game still works.
        })
    }
    fetch(`${VOICE_DIR}/index.json`)
      .then((r) => r.json() as Promise<{ clips: ScreamClip[] }>)
      .then(({ clips }) => {
        screamClips = clips
        for (const c of clips) {
          fetch(`${VOICE_DIR}/${c.name}.mp3`)
            .then((r) => r.arrayBuffer())
            .then((data) => screamBytes.set(c.name, data))
            .catch(() => {})
        }
      })
      .catch(() => {
        // No screams: falls are silent, the game still works.
      })
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

function playBuffer(buf: AudioBuffer, volume: number, rate: number): Voice | null {
  const c = context()
  if (c.state !== 'running') return null
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

function play(name: Effect, volume: number, rate = 1): Voice | null {
  const buf = effects.get(name)
  return buf ? playBuffer(buf, volume, rate) : null
}

/** Pitch by size: little blocks squeak, big blocks rumble. */
const sizeRate = (size: number, hi: number, lo: number) =>
  Math.min(hi, Math.max(lo, hi - 0.3 * Math.log10(Math.max(1, size * size))))

/** Bigger blocks thud lower. */
export function thud(strength: number, size: number): void {
  play('pop', 0.25 + 0.75 * strength, sizeRate(size, 1.3, 0.45))
}

/** A scream in progress — or about to start, if its clip is still decoding. */
export interface Scream {
  voice: Voice | null
  cancelled: boolean
}

let screamTurn = 0
const screaming = new Set<Scream>()
/** A pile knocked off at once should sound like a crowd, not a wall of noise. */
const MAX_SCREAMS = 4

async function decoded(name: string): Promise<AudioBuffer | null> {
  const hit = screamDecoded.get(name)
  if (hit) {
    // Refresh its place in the keep-list.
    screamDecoded.delete(name)
    screamDecoded.set(name, hit)
    return hit
  }
  const bytes = screamBytes.get(name)
  if (!bytes || !ctx) return null
  // decodeAudioData detaches its input, so decode a copy.
  const buf = await ctx.decodeAudioData(bytes.slice(0))
  screamDecoded.set(name, buf)
  while (screamDecoded.size > DECODED_KEEP) screamDecoded.delete(screamDecoded.keys().next().value!)
  return buf
}

/**
 * A falling block's scream, chosen to last `fall` seconds — the time until
 * it reaches the lava. Types rotate so consecutive falls sound different;
 * pitch follows size. Returns a handle for cutScream.
 */
export function scream(size: number, fall: number): Scream | null {
  if (screaming.size >= MAX_SCREAMS) return null
  const choice = pickScream(screamClips, fall, sizeRate(size, 1.35, 0.7), screamTurn++)
  if (!choice) return null
  const s: Scream = { voice: null, cancelled: false }
  screaming.add(s)
  void decoded(choice.name)
    .then((buf) => {
      if (!buf || s.cancelled) {
        screaming.delete(s)
        return
      }
      s.voice = playBuffer(buf, 0.85, choice.rate)
      if (!s.voice) screaming.delete(s)
      else s.voice.src.addEventListener('ended', () => screaming.delete(s))
    })
    .catch(() => screaming.delete(s))
  return s
}

/** Cut a scream short with a quick fade — it hit the lava, or was rescued. */
export function cutScream(s: Scream | null, fade = 0.12): void {
  if (!s) return
  s.cancelled = true
  screaming.delete(s)
  const v = s.voice
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
  for (const s of screaming) s.cancelled = true
  screaming.clear()
}
