import { numberToClips } from '@renderblocks/kernel'
import { boxClips, type Clip } from './model'

const urlOf = (c: Clip) => (c.kind === 'number' ? `/games/shared/number/${c.name}.mp3` : c.kind === 'letter' ? `/games/shapes/audio/${c.letter}.mp3` : `/games/words/audio/${c.word}.mp3`)

const cache = new Map<string, HTMLAudioElement>()
const audio = (url: string) => {
  let a = cache.get(url)
  if (!a) {
    a = new Audio(url)
    a.preload = 'auto'
    cache.set(url, a)
  }
  return a
}

let token = 0
/** Clips one after another; a new call cuts off the last. A clip that is missing (a typed word with no voice) is skipped. */
function playAll(urls: string[]) {
  const mine = ++token
  for (const a of cache.values()) a.pause()
  let i = 0
  const next = () => {
    if (mine !== token || i >= urls.length) return
    const a = audio(urls[i++])
    a.currentTime = 0
    a.onended = next
    a.onerror = next
    void a.play().catch(next)
  }
  next()
}

/**
 * Say what a box asks for, whole: the number, the letter's name, the word,
 * the sum. Numbers and signs in the app's number voice; letters and words in
 * the Shapes and Words tiles' clips (a word with no clip is not said).
 */
export function say(s: string) {
  playAll(boxClips(s, (n) => numberToClips(n, 0)).map(urlOf))
}

export function effect(name: 'celebrate' | 'pop', volume = 0.5) {
  const a = audio(`/games/shared/sfx/${name}.mp3`)
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}
