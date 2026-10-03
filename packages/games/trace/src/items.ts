/**
 * What can be traced (Handwriting-MVP-spec.md: tracing, what can be traced)
 * and the Practice pool. Words and sentences come from the Words app, so
 * they are ones he can read and they already have recordings.
 */
import { LEVELS, SENTENCES, WORDS } from '@renderblocks/words/words'
import { NUMBER_START } from './fade'

export type Kind = 'number' | 'upper' | 'lower' | 'word' | 'sentence' | 'shape'

/** How an item is said when its page opens. */
export type Say = { number: string } | { letter: string } | { word: string } | { sentence: string } | { shape: string } | null

export interface Item {
  /** Stable id for progress and the gallery, e.g. "lower:a", "word:cat". */
  key: string
  kind: Kind
  text: string
  say: Say
}

const WORD_SET = new Set(WORDS.map((w) => w.word))

export const numberItem = (n: string): Item => ({ key: `number:${n}`, kind: 'number', text: n, say: { number: n } })
export const letterItem = (ch: string): Item => ({
  key: `${ch === ch.toUpperCase() ? 'upper' : 'lower'}:${ch}`,
  kind: ch === ch.toUpperCase() ? 'upper' : 'lower',
  text: ch,
  say: { letter: ch.toLowerCase() },
})
export const wordItem = (w: string): Item => ({ key: `word:${w}`, kind: 'word', text: w, say: WORD_SET.has(w) ? { word: w } : null })
const sentenceItem = (text: string, audio: string | null): Item => ({ key: `sentence:${text}`, kind: 'sentence', text, say: audio ? { sentence: audio } : null })
const shapeItem = (name: string): Item => ({ key: `shape:${name}`, kind: 'shape', text: name, say: { shape: name } })

/** Plain text (typed by a parent): one word, a number, or a sentence. */
export function textItem(text: string): Item {
  const t = text.trim()
  if (/^\d+$/.test(t)) return numberItem(t)
  if (/^[A-Za-z]$/.test(t)) return letterItem(t)
  if (!/\s/.test(t)) return wordItem(t)
  return sentenceItem(t, null)
}

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step)
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('')
const UPPER = LOWER.map((c) => c.toUpperCase())

export const SHAPE_NAMES = ['line down', 'line across', 'slant', 'zigzag', 'wave', 'loop', 'circle', 'square', 'triangle', 'star']

export interface TraceSet {
  id: string
  title: string
  /** Shown on its button. */
  sample: string
  items: Item[]
}

export interface TraceGroup {
  title: string
  sets: TraceSet[]
}

/** A run of numbers across one page, e.g. "2 4 6 8 10". */
const run = (title: string, nums: number[]): Item => ({ key: `run:${title}`, kind: 'number', text: nums.join(' '), say: null })

export function traceGroups(myWords: string[]): TraceGroup[] {
  const alphabet = [LOWER.slice(0, 7), LOWER.slice(7, 14), LOWER.slice(14, 21), LOWER.slice(21)]
  const sentenceSets: TraceSet[] = LEVELS.filter((l) => l.words.some((w) => SENTENCES[w.word])).map((l) => ({
    id: `sentences-${l.level}`,
    title: `Sentences ${l.level}`,
    sample: SENTENCES[l.words.find((w) => SENTENCES[w.word])!.word][0].text.split(' ').slice(0, 2).join(' '),
    items: l.words.flatMap((w) => (SENTENCES[w.word] ?? []).map((s) => sentenceItem(s.text, s.audio))),
  }))
  return [
    {
      title: 'Numbers',
      sets: [
        { id: 'digits', title: '0 to 9', sample: '123', items: range(0, 9).map((n) => numberItem(String(n))) },
        { id: 'teens', title: '10 to 20', sample: '15', items: range(10, 20).map((n) => numberItem(String(n))) },
        { id: 'tens', title: 'Tens', sample: '50', items: range(10, 100, 10).map((n) => numberItem(String(n))) },
        {
          id: 'counting',
          title: 'Counting',
          sample: '2 4 6',
          items: [
            run('1 to 10', range(1, 10)),
            run('11 to 20', range(11, 20)),
            run('by 2s', range(2, 20, 2)),
            run('by 5s', range(5, 50, 5)),
            run('by 10s', range(10, 100, 10)),
          ],
        },
      ],
    },
    {
      title: 'Letters',
      sets: [
        { id: 'lower', title: 'a to z', sample: 'abc', items: LOWER.map(letterItem) },
        { id: 'upper', title: 'A to Z', sample: 'ABC', items: UPPER.map(letterItem) },
        { id: 'pairs', title: 'Aa to Zz', sample: 'Aa', items: LOWER.map((c) => ({ key: `pair:${c}`, kind: 'upper' as const, text: `${c.toUpperCase()}${c}`, say: { letter: c } })) },
        { id: 'alphabet', title: 'Alphabet', sample: 'a b c', items: alphabet.map((row) => ({ key: `alphabet:${row[0]}`, kind: 'lower' as const, text: row.join(' '), say: null })) },
      ],
    },
    {
      title: 'Words',
      sets: [
        ...(myWords.length ? [{ id: 'mine', title: 'My words', sample: myWords[0], items: myWords.map(textItem) }] : []),
        ...LEVELS.map((l) => ({ id: `words-${l.level}`, title: `Words ${l.level}`, sample: l.words[0].word, items: l.words.map((w) => wordItem(w.word)) })),
      ],
    },
    { title: 'Sentences', sets: sentenceSets },
    { title: 'Shapes', sets: [{ id: 'shapes', title: 'Shapes', sample: '★', items: SHAPE_NAMES.map(shapeItem) }] },
  ]
}

// --- Practice ----------------------------------------------------------------------------------

export interface Progress {
  /** Fade level. */
  level: number
  /** When last practised (ms). */
  seen: number
}

export type ProgressMap = Record<string, Progress>

export interface PracticeSettings {
  numbers: boolean
  lower: boolean
  upper: boolean
  words: boolean
  /** Words app levels included (1 up to this). */
  wordLevels: number
}

export const DEFAULT_PRACTICE: PracticeSettings = { numbers: true, lower: true, upper: true, words: true, wordLevels: 2 }

export function practicePool(s: PracticeSettings, myWords: string[]): Item[] {
  return [
    ...(s.numbers ? range(0, 9).map((n) => numberItem(String(n))) : []),
    ...(s.lower ? LOWER.map(letterItem) : []),
    ...(s.upper ? UPPER.map(letterItem) : []),
    ...(s.words ? [...LEVELS.filter((l) => l.level <= s.wordLevels).flatMap((l) => l.words.map((w) => wordItem(w.word))), ...myWords.filter((w) => !/\s/.test(w.trim())).map(textItem)] : []),
  ]
}

/** Where an item starts on the dial: numbers at start dots, everything else at the solid path. */
export const startLevel = (item: Item) => (item.kind === 'number' ? NUMBER_START : 0)
export const levelOf = (item: Item, progress: ProgressMap) => progress[item.key]?.level ?? startLevel(item)

/**
 * A round: the items least recently practised, taken in turn from each kind
 * so a round mixes numbers, letters and words, and never repeats one.
 */
export function pickRound(pool: Item[], progress: ProgressMap, n = 5, rand = Math.random): Item[] {
  const byKind = new Map<string, Item[]>()
  for (const item of pool) {
    const kind = item.kind === 'upper' || item.kind === 'lower' ? 'letter' : item.kind
    byKind.set(kind, [...(byKind.get(kind) ?? []), item])
  }
  const queues = [...byKind.values()].map((items) =>
    items
      .map((item) => ({ item, order: (progress[item.key]?.seen ?? 0) + rand() * 1000 }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.item),
  )
  // Start from a different kind each round.
  const offset = Math.floor(rand() * queues.length)
  const out: Item[] = []
  for (let i = 0; out.length < Math.min(n, pool.length); i++) {
    const q = queues[(i + offset) % queues.length]
    const next = q.shift()
    if (next) out.push(next)
  }
  return out
}
