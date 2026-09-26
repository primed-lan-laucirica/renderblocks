import type { Word } from './words'

/**
 * Web Audio for the word parts and whole words. Part sounds are short
 * Kokoro clips; a held sound keeps going by looping a slice from its middle,
 * cut at zero crossings so the loop doesn't click.
 */
const SOUNDS = '/games/words/sounds'
const WORDS = '/games/words/audio'

let ctx: AudioContext | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()
const playing = new Set<AudioBufferSourceNode>()

function context(): AudioContext {
  ctx ??= new AudioContext()
  return ctx
}

/** Call from a touch: browsers only start audio after a user gesture. */
export function unlockAudio(): void {
  const c = context()
  if (c.state === 'suspended') void c.resume()
}

function load(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => context().decodeAudioData(data))
      .catch(() => null)
    buffers.set(url, p)
  }
  return p
}

const soundUrl = (id: string) => `${SOUNDS}/${id}.mp3`
const wordUrl = (w: string) => `${WORDS}/${w}.mp3`

/** Fetch and decode a word and all its part sounds ahead of use. */
export function preload(word: Word): void {
  void load(wordUrl(word.word))
  for (const p of word.parts) if (p.sound) void load(soundUrl(p.sound))
}

export interface Voice {
  stop(fade?: number): void
}

const silentVoice: Voice = { stop: () => {} }

/** Nearest zero crossing to `t` (seconds), searching ±6 ms. */
function zeroCrossing(buf: AudioBuffer, t: number): number {
  const x = buf.getChannelData(0)
  const i0 = Math.round(t * buf.sampleRate)
  const reach = Math.round(0.006 * buf.sampleRate)
  for (let d = 0; d < reach; d++) {
    for (const i of [i0 + d, i0 - d]) {
      if (i > 0 && i < x.length && Math.sign(x[i - 1]) !== Math.sign(x[i])) return i / buf.sampleRate
    }
  }
  return t
}

function start(url: string, opts: { hold?: boolean; when?: number } = {}): Voice {
  const c = context()
  let src: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  let stopped = false
  void load(url).then((buf) => {
    if (!buf || stopped || c.state !== 'running') return
    src = c.createBufferSource()
    src.buffer = buf
    if (opts.hold) {
      // Held: play the start, then loop the steady middle until let go.
      src.loop = true
      src.loopStart = zeroCrossing(buf, buf.duration * 0.35)
      src.loopEnd = zeroCrossing(buf, buf.duration * 0.7)
    }
    gain = c.createGain()
    src.connect(gain).connect(c.destination)
    src.onended = () => src && playing.delete(src)
    playing.add(src)
    src.start(opts.when ?? 0)
  })
  return {
    stop(fade = 0.05) {
      stopped = true
      if (!src || !gain) return
      const t = c.currentTime
      gain.gain.setValueAtTime(gain.gain.value, t)
      gain.gain.linearRampToValueAtTime(0, t + fade)
      try {
        src.stop(t + fade + 0.01)
      } catch {
        // Already stopped.
      }
    },
  }
}

/** A part's sound. With `hold`, a stretchable sound keeps going until stopped. */
export function playSound(id: string | null, hold = false): Voice {
  return id ? start(soundUrl(id), { hold }) : silentVoice
}

/** The whole word, spoken naturally. */
export function playWord(word: string): Voice {
  return start(wordUrl(word))
}

/** Several part sounds run together, as when tiles are pushed into one. */
export function playBlend(ids: string[]): Voice {
  const c = context()
  const voices: Voice[] = []
  void Promise.all(ids.map((id) => load(soundUrl(id)))).then((bufs) => {
    let t = c.currentTime + 0.02
    bufs.forEach((buf, i) => {
      if (!buf) return
      voices.push(start(soundUrl(ids[i]), { when: t }))
      t += Math.max(0.08, buf.duration - 0.06) // overlap a little, so it runs together
    })
  })
  return { stop: (fade) => voices.forEach((v) => v.stop(fade)) }
}

export function stopAll(): void {
  for (const src of playing) {
    try {
      src.stop()
    } catch {
      // Already stopped.
    }
  }
  playing.clear()
}
