export type Effect = 'yes' | 'no' | 'cheer'

export interface EffectPlayer {
  play(effect: Effect, volume?: number): void
  preload(): void
}

export function createEffectPlayer(base: string): EffectPlayer {
  const cache = new Map<Effect, HTMLAudioElement>()

  const get = (effect: Effect): HTMLAudioElement => {
    let audio = cache.get(effect)
    if (!audio) {
      audio = new Audio(`${base}/${effect}.mp3`)
      audio.preload = 'auto'
      cache.set(effect, audio)
    }
    return audio
  }

  return {
    play(effect, volume = 1) {
      const audio = get(effect)
      audio.volume = volume
      audio.currentTime = 0
      void audio.play().catch(() => {
        // Autoplay restrictions before first interaction — safe to ignore.
      })
    },
    preload() {
      get('yes')
      get('no')
      get('cheer')
    },
  }
}
