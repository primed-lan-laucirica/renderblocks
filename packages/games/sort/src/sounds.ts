/**
 * Sort's sounds, shared with the other apps: the chime and thunk, and the
 * children's-chorus "yes"/"no" Render already knows (from Gifted). No spoken
 * instructions: the screen explains itself.
 */
const cache = new Map<string, HTMLAudioElement>()

function play(path: string, volume: number) {
  let a = cache.get(path)
  if (!a) {
    a = new Audio(path)
    a.preload = 'auto'
    cache.set(path, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}

export const effect = (name: 'correct' | 'wrong' | 'celebrate' | 'pop' | 'whoosh', volume = 0.8) => play(`/games/shared/sfx/${name}.mp3`, volume)

/** The chorus, a beat after the effect, so they don't muddy each other. */
export const chorus = (word: 'yes' | 'no' | 'cheer', volume = 1) => setTimeout(() => play(`/games/gifted/audio/${word}.mp3`, volume), 200)
