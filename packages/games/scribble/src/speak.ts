import { numberToClips, playClips, stopSpeech } from '@renderblocks/kernel'
import { spokenOf } from './model'

const cache = new Map<string, HTMLAudioElement>()
function play(url: string, volume: number) {
  let a = cache.get(url)
  if (!a) {
    a = new Audio(url)
    cache.set(url, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}

/** Say what a box asks for: a number in the app's number voice, a letter by its name (the Shapes tile's letter clips). */
export function say(token: string) {
  const s = spokenOf(token)
  if (!s) return
  stopSpeech()
  for (const a of cache.values()) a.pause()
  if (s.kind === 'number') playClips(numberToClips(s.n, 0))
  else play(`/games/shapes/audio/${s.letter}.mp3`, 1)
}

export function effect(name: 'celebrate' | 'pop', volume = 0.5) {
  play(`/games/shared/sfx/${name}.mp3`, volume)
}
