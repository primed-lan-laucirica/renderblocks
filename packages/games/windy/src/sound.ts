/** Wind and thuds, synthesised (nothing to record); the shared whoosh for flings and gusts. */
let ctx: AudioContext | null = null
let wind: { gain: GainNode; filter: BiquadFilterNode } | null = null

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

/** Start the wind sound (on a touch, when sound is allowed). */
export function wake() {
  const a = audio()
  if (!a || wind) return
  const src = a.createBufferSource()
  src.buffer = noise(a, 3)
  src.loop = true
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.7
  filter.frequency.value = 400
  const gain = a.createGain()
  gain.gain.value = 0
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
  wind = { gain, filter }
}

/** The wind's sound: louder and higher the stronger it blows (blocks/s). */
export function blowing(speed: number) {
  if (!ctx || !wind) return
  const f = Math.min(1, speed / 35)
  wind.gain.gain.setTargetAtTime(0.03 + f * 0.25, ctx.currentTime, 0.2)
  wind.filter.frequency.setTargetAtTime(250 + f * 1100, ctx.currentTime, 0.2)
}

export function silence() {
  if (ctx && wind) wind.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
}

/** A landing: a soft knock, louder the harder. */
export function thud(strength: number) {
  const a = audio()
  if (!a) return
  const src = a.createBufferSource()
  src.buffer = noise(a, 0.12)
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 500
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.25 + strength * 0.5, a.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
}

const files = new Map<string, HTMLAudioElement>()
export function whoosh(volume = 0.5) {
  let el = files.get('whoosh')
  if (!el) {
    el = new Audio('/games/shared/sfx/whoosh.mp3')
    files.set('whoosh', el)
  }
  el.volume = volume
  el.currentTime = 0
  void el.play().catch(() => {})
}
