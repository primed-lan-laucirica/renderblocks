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

/** The background song: looped without a gap (Web Audio), quietly under everything else. */
let music: { gain: GainNode; src: AudioBufferSourceNode | null; buffer: AudioBuffer | null; on: boolean; loading: boolean } | null = null
const MUSIC_VOLUME = 0.32

/** Turn the song on or off (it starts once sound is allowed: after a touch). */
export function setMusic(on: boolean) {
  const a = audio()
  if (!a) return
  if (!music) {
    const gain = a.createGain()
    gain.gain.value = 0
    gain.connect(a.destination)
    music = { gain, src: null, buffer: null, on, loading: false }
  }
  const m = music
  m.on = on
  if (on && !m.buffer && !m.loading) {
    m.loading = true
    void fetch('/games/skate/music.mp3')
      .then((r) => r.arrayBuffer())
      .then((b) => a.decodeAudioData(b))
      .then((buffer) => {
        m.buffer = buffer
        m.loading = false
        if (m.on) setMusic(true)
      })
      .catch(() => {
        m.loading = false
      })
    return
  }
  if (on && m.buffer && !m.src) {
    const src = a.createBufferSource()
    src.buffer = m.buffer
    src.loop = true
    src.connect(m.gain)
    src.start()
    m.src = src
  }
  m.gain.gain.setTargetAtTime(on ? MUSIC_VOLUME : 0, a.currentTime, 0.15)
}

/** Leaving the game: the song stops. */
export function stopMusic() {
  if (!music?.src) return
  try {
    music.src.stop()
  } catch {
    // already stopped
  }
  music.src.disconnect()
  music.src = null
  music.gain.gain.value = 0
}
