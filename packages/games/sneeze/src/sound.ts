/**
 * Sneeze sounds (generated once with ElevenLabs, tools/audio/manifest.json):
 * the "ah… ah…" wind-up and the AH-CHOO, the sniff of an unsneeze, and a
 * synthesised thud when something lands and pop when a ring closes up. (No voice: he sneezes them in quick succession.) Bigger squares sneeze deeper.
 */
let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<void>>()
let windupNode: AudioBufferSourceNode | null = null

const FILES = {
  windup1: '/games/sneeze/sfx/windup1.mp3',
  windup2: '/games/sneeze/sfx/windup2.mp3',
  choo1: '/games/sneeze/sfx/choo1.mp3',
  choo2: '/games/sneeze/sfx/choo2.mp3',
  choo3: '/games/sneeze/sfx/choo3.mp3',
  sniff1: '/games/sneeze/sfx/sniff1.mp3',
  sniff2: '/games/sneeze/sfx/sniff2.mp3',
  correct: '/games/shared/sfx/correct.mp3',
  squarepower: '/games/sneeze/voice/squarepower.mp3',
} as const
type Name = keyof typeof FILES

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Load every clip (on the first touch, when sound is allowed). */
export function wake() {
  const a = audio()
  if (!a) return
  for (const [name, url] of Object.entries(FILES)) {
    if (loading.has(name)) continue
    loading.set(
      name,
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => a.decodeAudioData(b))
        .then((buf) => void buffers.set(name, buf))
        .catch(() => {}),
    )
  }
}

/** Deeper for bigger numbers: 4 sneezes high, ten billion low. */
export const pitchFor = (n: bigint) => Math.max(0.72, Math.min(1.3, 1.3 - 0.06 * Math.log10(Number(n))))

function play(name: Name, rate = 1, volume = 1): AudioBufferSourceNode | null {
  const a = audio()
  const buf = buffers.get(name)
  if (!a || !buf) return null
  const src = a.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const gain = a.createGain()
  gain.gain.value = volume
  src.connect(gain).connect(a.destination)
  src.start()
  return src
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

/** "Ah… ah…": the build-up (cut short by the sneeze). */
export function windup(n: bigint) {
  windupNode?.stop()
  windupNode = play(pick(['windup1', 'windup2'] as const), pitchFor(n), 0.9)
}

/** When each AH-CHOO's CHOO comes (s into the clip), measured from the clips: the moment the square flies. */
const BURST = { choo1: 0.45, choo2: 0.4, choo3: 0.22 } as const

/** AH-CHOO! Returns how long until the CHOO (s), for the sneeze to land on it. */
export function choo(n: bigint): number {
  try {
    windupNode?.stop()
  } catch {
    /* already ended */
  }
  windupNode = null
  const name = pick(['choo1', 'choo2', 'choo3'] as const)
  const rate = pitchFor(n)
  return play(name, rate) ? BURST[name] / rate : 0.3
}

/** An unsneeze: the square is sniffed back in. */
export function sniff(n: bigint) {
  play(pick(['sniff1', 'sniff2'] as const), pitchFor(n), 0.9)
}

/** The ring closing up round it: a soft pop, lower the bigger (0–1). */
export function pop(big: number) {
  const a = audio()
  if (!a) return
  const osc = a.createOscillator()
  const f = 520 - 300 * big
  osc.frequency.setValueAtTime(f, a.currentTime)
  osc.frequency.exponentialRampToValueAtTime(f * 2.2, a.currentTime + 0.08)
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.35, a.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12)
  osc.connect(gain).connect(a.destination)
  osc.start()
  osc.stop(a.currentTime + 0.13)
}

/** "Square power!" (the chorus voice), now and then. */
export function squarePower() {
  play('squarepower', 1, 0.9)
}

export function correct() {
  play('correct', 1, 0.7)
}

function noise(a: AudioContext, seconds: number) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/** A landing: a soft knock, louder the harder, lower the bigger (0–1 each). */
export function thud(strength: number, big: number) {
  const a = audio()
  if (!a) return
  const src = a.createBufferSource()
  src.buffer = noise(a, 0.14)
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 700 - 450 * big
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.2 + strength * 0.5, a.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
}
