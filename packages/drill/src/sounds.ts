export type Effect = 'yes' | 'no' | 'cheer'

const NUMBER_WORDS = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
const numberCache = new Map<number, HTMLAudioElement>()

/**
 * Speak an answer using the recorded number words (shared across drill
 * games). Silently does nothing outside 1–20 — no recording exists.
 */
export function playNumber(n: number, volume = 1): void {
  if (n < 1 || n >= NUMBER_WORDS.length) return
  let audio = numberCache.get(n)
  if (!audio) {
    audio = new Audio(`/games/drill/audio/numbers/${NUMBER_WORDS[n]}.mp3`)
    audio.preload = 'auto'
    numberCache.set(n, audio)
  }
  audio.volume = volume
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Autoplay restrictions before first interaction — safe to ignore.
  })
}

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
