/** Tick, untick and cheer — the chimes Render knows from Tasks. */
type Effect = 'yes' | 'no' | 'cheer'

const cache = new Map<Effect, HTMLAudioElement>()

export function playEffect(effect: Effect, volume = 1): void {
  let audio = cache.get(effect)
  if (!audio) {
    audio = new Audio(`/games/calendar/audio/${effect}.mp3`)
    audio.preload = 'auto'
    cache.set(effect, audio)
  }
  audio.volume = volume
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Before the first touch the browser blocks sound: nothing to do.
  })
}
