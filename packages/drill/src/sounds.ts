export type Effect = 'yes' | 'no' | 'cheer'

let toneContext: AudioContext | null = null

/** Short synthesized pop at the given pitch (no asset needed). */
export function playTone(frequency: number, duration = 0.18, volume = 0.35): void {
  try {
    toneContext ??= new AudioContext()
    if (toneContext.state === 'suspended') void toneContext.resume()
    const osc = toneContext.createOscillator()
    const gain = toneContext.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(volume, toneContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, toneContext.currentTime + duration)
    osc.connect(gain)
    gain.connect(toneContext.destination)
    osc.start()
    osc.stop(toneContext.currentTime + duration)
  } catch {
    // No audio available — visual activation still works.
  }
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
