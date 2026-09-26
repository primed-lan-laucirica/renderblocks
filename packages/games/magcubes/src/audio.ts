/**
 * Web Audio for snaps: two hands can drop pieces at once and clicks must
 * land the instant the cube does, so clips are decoded up front and played
 * overlapping. All clips are generated at build time (tools/audio).
 */
export type Sound = 'click' | 'tear' | 'away'

const CLIPS: Record<Sound, string[]> = {
  click: ['/games/magcubes/sfx/click1.mp3', '/games/magcubes/sfx/click2.mp3', '/games/magcubes/sfx/click3.mp3'],
  tear: ['/games/magcubes/sfx/tear1.mp3', '/games/magcubes/sfx/tear2.mp3'],
  away: ['/games/shared/sfx/whoosh.mp3'],
}

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()

/** Create the context and decode everything; call from a user gesture. */
export function unlockAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return
  }
  ctx = new AudioContext()
  for (const url of Object.values(CLIPS).flat()) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx!.decodeAudioData(data))
      .then((buf) => buffers.set(url, buf))
      .catch(() => {
        // Missing clip: that sound is silent, building still works.
      })
  }
}

export function play(sound: Sound, volume = 1): void {
  if (!ctx) return
  const list = CLIPS[sound]
  const buf = buffers.get(list[Math.floor(Math.random() * list.length)])
  if (!buf) return
  const src = ctx.createBufferSource()
  src.buffer = buf
  // A little pitch variety keeps a run of snaps from sounding mechanical.
  src.playbackRate.value = 0.94 + Math.random() * 0.12
  const gain = ctx.createGain()
  gain.gain.value = volume
  src.connect(gain).connect(ctx.destination)
  src.start()
}

export function closeAudio(): void {
  void ctx?.close()
  ctx = null
  buffers.clear()
}
