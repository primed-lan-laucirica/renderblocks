import { numberToClips } from '@renderblocks/kernel'
import { charClips, itemClips, type Cell, type Clip } from './model'

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
 * Say what a box asks for: the digit, the letter's name, the sign. Before the
 * first box of a number, word or sum, the whole of it first (cat … c).
 * Numbers in the app's number voice; letters and words in the Letters and
 * Words tiles' clips.
 */
export function say(cell: Cell, item: string, whole = cell.first) {
  const words = (n: number) => numberToClips(n, 0)
  // A whole number in one box (10) is said once.
  const before = whole && cell.ch !== item ? (itemClips(item, words) ?? []) : []
  playAll([...before, ...charClips(cell.ch, words)].map(urlOf))
}

export function effect(name: 'celebrate' | 'pop', volume = 0.5) {
  const a = audio(`/games/shared/sfx/${name}.mp3`)
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}
