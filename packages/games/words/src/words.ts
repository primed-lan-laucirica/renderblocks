import data from './data/words.json'
import sentenceData from './data/sentences.json'

/** One part of a word: the letters that make one sound (or none — a silent e). */
export interface Part {
  /** The letters, e.g. "sh", "ai", "e". */
  g: string
  vowel: boolean
  /** Doesn't say what these letters usually say (the "ai" in said). */
  heart: boolean
  /** No sound of its own (the e in like). */
  silent: boolean
}

export interface Word {
  word: string
  level: number
  parts: Part[]
}

/** Built by tools/words/build.py from tools/words/parts.txt. */
export const WORDS = data as Word[]

/** A sentence for the 💬 card, with timings to light its words as they are read. */
export interface Sentence {
  text: string
  /** [start, end) character spans of the word being learnt (or its form: fins, bigger). */
  marks: number[][]
  /** What it teaches: category, parts, opposite … */
  concept: string
  /** Clip name in /games/words/sentences/. */
  audio: string
  /** Each word: [first char, end char, start s, end s]. */
  words: number[][]
}

/** Built by tools/words/build.py from tools/words/sentences.txt: word → its sentences. */
export const SENTENCES = sentenceData as Record<string, Sentence[]>

/**
 * Levels 1–5: his Preschool Prep sight words (known already — familiar ground).
 * Levels 6–12: the point of the app — common words that follow the sound
 * rules, in phonics order, for sounding out.
 */
const PATTERNS: Record<number, string> = {
  6: 'short a',
  7: 'short i and o',
  8: 'short u and e',
  9: 'sh ch th ck',
  10: 'blends',
  11: 'silent e',
  12: 'ai ee oa ar or',
}

export interface Level {
  level: number
  /** Sight words, or sound-it-out words. */
  kind: 'sight' | 'sound'
  /** Spelling pattern, for sound-it-out levels. */
  pattern?: string
  words: Word[]
}

export const LEVELS: Level[] = [...new Set(WORDS.map((w) => w.level))]
  .sort((a, b) => a - b)
  .map((level) => ({
    level,
    kind: level <= 5 ? 'sight' : 'sound',
    pattern: PATTERNS[level],
    words: WORDS.filter((w) => w.level === level),
  }))

export const levelOf = (n: number) => LEVELS.find((l) => l.level === n)!
