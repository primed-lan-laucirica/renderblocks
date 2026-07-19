type Effect = 'yes' | 'no' | 'cheer'

const cache = new Map<Effect, HTMLAudioElement>()

function get(effect: Effect): HTMLAudioElement {
  let audio = cache.get(effect)
  if (!audio) {
    audio = new Audio(`/games/tasks/audio/${effect}.mp3`)
    audio.preload = 'auto'
    cache.set(effect, audio)
  }
  return audio
}

export function playEffect(effect: Effect, volume = 1): void {
  const audio = get(effect)
  audio.volume = volume
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Autoplay restrictions before first interaction — safe to ignore.
  })
}
