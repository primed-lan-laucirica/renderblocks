import { speakNumber } from '@renderblocks/kernel'
import type { Say } from './items'

/** One voice at a time: a new item cuts off the last. */
let voice: HTMLAudioElement | null = null

function playFile(src: string, volume = 1) {
  voice?.pause()
  voice = new Audio(src)
  voice.volume = volume
  void voice.play().catch(() => {})
}

/** Say an item: numbers in the number voice, letters and shapes from tools/trace/audio.py, words and sentences from the Words app. */
export function say(s: Say) {
  if (!s) return
  if ('number' in s) {
    voice?.pause()
    return speakNumber(BigInt(s.number))
  }
  if ('letter' in s) return playFile(`/games/trace/letters/${s.letter}.mp3`)
  if ('shape' in s) return playFile(`/games/trace/shapes/${s.shape.replace(/ /g, '-')}.mp3`)
  if ('word' in s) return playFile(`/games/words/audio/${s.word}.mp3`)
  if ('sentence' in s) return playFile(`/games/words/sentences/${s.sentence}.mp3`)
}

const sfx = new Map<string, HTMLAudioElement>()
export function effect(name: 'celebrate' | 'correct' | 'pop', volume = 0.6) {
  let a = sfx.get(name)
  if (!a) {
    a = new Audio(`/games/shared/sfx/${name}.mp3`)
    sfx.set(name, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}
