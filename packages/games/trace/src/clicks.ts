/**
 * The tracing dial: a short tick each time his ink covers a little more of
 * the path, rising in pitch through the stroke, and a small two-note tone
 * when a stroke is done. Off the path it goes quiet. Synthesised (Web
 * Audio), so spacing, pitch and volume are easy to tune.
 */

/** Path covered between ticks (units; x-height is 1). */
export const TICK_EVERY = 0.12
/** Pitch at the start and the end of a stroke (Hz). */
const LOW = 520
const HIGH = 1500
const VOLUME = 0.16

let ctx: AudioContext | null = null
let last = 0

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, at: number, length: number, volume: number, type: OscillatorType = 'triangle') {
  const a = audio()
  if (!a) return
  const t = a.currentTime + at
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

/** Wake the audio on a touch (browsers only allow sound after one). */
export const wake = () => void audio()

/** One tick, `f` of the way through the stroke (0–1). Ticks closer than 28 ms apart are dropped. */
export function tick(f: number) {
  const now = performance.now()
  if (now - last < 28) return
  last = now
  blip(LOW * Math.pow(HIGH / LOW, Math.max(0, Math.min(1, f))), 0, 0.035, VOLUME)
}

/** A stroke is done: two quick rising notes. */
export function strokeDone() {
  blip(HIGH, 0, 0.09, VOLUME * 0.9, 'sine')
  blip(HIGH * 1.5, 0.07, 0.14, VOLUME * 0.9, 'sine')
}
