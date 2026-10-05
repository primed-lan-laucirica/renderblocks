/**
 * Skate sounds: wheels rolling (filtered noise, louder with speed) and
 * grinding, a clack on takeoffs and landings, footsteps, and the shared
 * effects for flips and lucky tricks.
 * Synthesised where possible, so there's nothing to record.
 */
let ctx: AudioContext | null = null
let roll: { gain: GainNode; filter: BiquadFilterNode } | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noise(a: AudioContext, seconds: number) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/** Start the wheels (on the first touch, when sound is allowed). */
export function wake() {
  const a = audio()
  if (!a || roll) return
  const src = a.createBufferSource()
  src.buffer = noise(a, 2)
  src.loop = true
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 300
  const gain = a.createGain()
  gain.gain.value = 0
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
  roll = { gain, filter }
}

/** Wheels: louder and brighter the faster he goes (0 in the air, or on foot); on a rail, a bright grinding scrape. */
export function rolling(speed: number, grind = false) {
  if (!ctx || !roll) return
  const f = Math.min(1, speed / 25)
  roll.gain.gain.setTargetAtTime(speed > 0 ? (grind ? 0.2 : 0.05) + f * 0.22 : 0, ctx.currentTime, 0.05)
  roll.filter.frequency.setTargetAtTime(grind ? 2600 + f * 1500 : 180 + f * 900, ctx.currentTime, 0.05)
}

/** The board hitting the coping: a short knock. */
export function clack(loud = 1) {
  const a = audio()
  if (!a) return
  const src = a.createBufferSource()
  src.buffer = noise(a, 0.08)
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1400
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.5 * loud, a.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.08)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
}

const files = new Map<string, HTMLAudioElement>()
export function effect(name: 'whoosh' | 'pop' | 'celebrate', volume = 0.6) {
  let el = files.get(name)
  if (!el) {
    el = new Audio(`/games/shared/sfx/${name}.mp3`)
    files.set(name, el)
  }
  el.volume = volume
  el.currentTime = 0
  void el.play().catch(() => {})
}
