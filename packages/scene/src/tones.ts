import type { SceneEvent } from './scene'

/**
 * The sound of every cue: a short sine or triangle tone. One table, used by
 * the player (live Web Audio) and by the export (an offline render), so they
 * sound the same. Pitches climb a major scale with n, the way counting climbs.
 */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98, 1760]

export interface Tone {
  freq: number[]
  wave: OscillatorType
  decay: number
  gain: number
}

export function tone(e: SceneEvent): Tone {
  const step = SCALE[((e.n % 10) + 10) % 10]
  switch (e.kind) {
    case 'notch':
      return { freq: [SCALE[e.n % 5] * 0.5], wave: 'triangle', decay: 0.7, gain: 0.18 }
    case 'zero':
      return { freq: [261.63], wave: 'sine', decay: 1.6, gain: 0.18 }
    case 'fuse':
      // A chord: many becoming one.
      return { freq: [261.63, 329.63, 392, 523.25], wave: 'sine', decay: 1.4, gain: 0.12 }
    case 'break':
      return { freq: [523.25, 392, 329.63, 261.63], wave: 'triangle', decay: 0.9, gain: 0.1 }
    case 'slide':
      return { freq: [392], wave: 'triangle', decay: 0.35, gain: 0.08 }
    case 'equals':
      return { freq: [523.25, 659.25, 783.99], wave: 'sine', decay: 1.2, gain: 0.12 }
    default:
      return { freq: [step], wave: 'sine', decay: 0.7, gain: 0.18 }
  }
}

/** Schedule one cue on an audio context (live or offline) at context time `at`. */
export function play(ctx: BaseAudioContext, e: SceneEvent, at: number, out: AudioNode = ctx.destination): OscillatorNode[] {
  const t = tone(e)
  return t.freq.map((f, i) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = t.wave
    o.frequency.value = f
    // A chord's notes roll in, a few milliseconds apart.
    const start = at + i * (e.kind === 'fuse' || e.kind === 'break' ? 0.07 : 0)
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(t.gain, start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.decay)
    o.connect(g).connect(out)
    o.start(start)
    o.stop(start + t.decay + 0.1)
    return o
  })
}
