import data from './data/words.json'

/** One part of a word: the letters that make one sound (or none — a silent e). */
export interface Part {
  /** The letters, e.g. "sh", "ai", "e". */
  g: string
  vowel: boolean
  /** Doesn't say what these letters usually say (the "ai" in said). */
  heart: boolean
  /** No sound of its own (the e in like). */
  silent: boolean
  /** A sound that can be held ("mmm", "aaa"); stops like t and p are said once. */
  stretch: boolean
  /** Its sound clip in /games/words/sounds (made locally with Kokoro), or null if silent. */
  sound: string | null
}

export interface Word {
  word: string
  level: number
  parts: Part[]
}

/** Built by tools/words/build.py from tools/words/parts.txt. */
export const WORDS = data as Word[]

export const LEVELS = [1, 2, 3, 4, 5].map((level) => ({
  level,
  words: WORDS.filter((w) => w.level === level),
}))
