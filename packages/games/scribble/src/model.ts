/**
 * Scribble (Lan, Nov 13 2026; "Scribble MVP spec" in Drive RenderBlocks/Scribble/):
 * the chalkboard on a screen. Empty boxes, one character to write in each;
 * the example of what goes in a box is written directly above that box,
 * never in it (Lan, Nov 13: "the key here is that the example character
 * should be directly above the box"); he writes freehand. No tracing, no
 * guides, no recognition, nothing marked wrong: a box is filled when he has
 * written in it. A full page earns a star and is kept in the gallery.
 *
 * The pages go along a path (Lan, Nov 13): one box first, then more and
 * more, then bigger numbers, words, sums and other things.
 *
 * Pure rules: the path, where the boxes sit, whose turn it is.
 */

export type PromptMode = 'shown' | 'spoken' | 'both'
/** How the turn passes to the next box: by itself a moment after he stops writing, or with the Next button. */
export type Advance = 'pause' | 'button'
export type Mode = 'path' | 'custom'

export interface Settings {
  /** Along the path, or what a grown-up typed. */
  mode: Mode
  /** Where he is on the path. */
  level: number
  /** What a grown-up typed (a date, a word, a sum): words apart, one character a box. */
  custom: string
  prompt: PromptMode
  advance: Advance
}
export const DEFAULT_SETTINGS: Settings = { mode: 'path', level: 0, custom: '', prompt: 'both', advance: 'pause' }

/** One page: what to write, as items (a number, a word, a sum), and at most how many boxes to a row. */
export interface PageDef {
  stage: string
  items: string[]
  perRow: number
  /** Each item in one box, however many digits (10 is one box on the chalkboard); else one character a box. */
  whole?: boolean
}

const upTo = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i))
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const page = (stage: string, items: string[], perRow = 8, whole = false): PageDef => ({ stage, items, perRow, ...(whole ? { whole } : {}) })
/** The date, as written at the top of the chalkboard: Fri 13 Nov 2026. */
export const dateItems = (d: Date) => [d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3), String(d.getDate()), d.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3), String(d.getFullYear())]

/**
 * The path. One box, then two, three … ten (two rows of five, as on the
 * chalkboard); letters the same way to A–H (two rows of four); then numbers
 * of more than one digit, words, sums, and other things. Every word here has
 * a voice clip (the Words tile's).
 */
export function pathPages(now = new Date()): PageDef[] {
  return [
    ...[1, 2, 3, 4, 5, 6, 8, 10].map((n) => page('Numbers', upTo(n, (i) => String(i + 1)), 5, true)),
    ...[1, 2, 3, 4, 6, 8].map((n) => page('Letters', upTo(n, (i) => ABC[i]), 4)),
    ...[4, 8].map((n) => page('Small letters', upTo(n, (i) => ABC[i].toLowerCase()), 4)),
    page('Bigger numbers', ['10']),
    page('Bigger numbers', ['11', '12']),
    page('Bigger numbers', ['13', '14', '15']),
    page('Bigger numbers', ['20', '30', '40', '50']),
    page('Bigger numbers', ['100']),
    page('Bigger numbers', ['100', '200', '300']),
    page('Bigger numbers', ['1000']),
    page('Words', ['go']),
    page('Words', ['up']),
    page('Words', ['cat']),
    page('Words', ['dog']),
    page('Words', ['cat', 'dog']),
    page('Words', ['red', 'hat']),
    page('Words', ['big', 'pig']),
    page('Words', ['fish']),
    page('Words', ['frog', 'duck']),
    page('Words', ['run', 'hop', 'jump']),
    page('Sums', ['1+1=2']),
    page('Sums', ['2+2=4']),
    page('Sums', ['3+4=7']),
    page('Sums', ['1+2=3', '2+1=3']),
    page('Sums', ['5−2=3']),
    page('Sums', ['10−3=7']),
    page('Sums', ['5+5=10']),
    page('Sums', ['2×3=6']),
    page('Sums', ['3×3=9']),
    page('Sums', ['8÷2=4']),
    page('Sums', ['12÷4=3']),
    page('Other things', dateItems(now)),
    page('Other things', ['I', 'can', 'run']),
    page('Other things', ['I', 'see', 'a', 'cat']),
    page('Other things', ['7:30']),
    page('Other things', ['1,000,000']),
  ]
}
export const PATH_LENGTH = pathPages().length

/** How long after his last stroke a box counts as done (ms), when the turn passes by itself. */
export const DONE_PAUSE_MS = 1600

/** A grown-up's own: words apart, each its own run of boxes; single characters in rows of five, anything longer in rows of eight. */
export const MOST_CUSTOM = 24
export function customPage(text: string): PageDef {
  const items: string[] = []
  let left = MOST_CUSTOM
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const cs = [...w].slice(0, left)
    if (!cs.length) break
    items.push(cs.join(''))
    left -= cs.length
  }
  return page('My own', items, items.every((w) => [...w].length === 1) ? 5 : 8)
}

/** The page for these settings (the path's last page goes on being the last). */
export function pageOf(s: Settings, now = new Date()): PageDef {
  if (s.mode === 'custom') return customPage(s.custom)
  const all = pathPages(now)
  return all[Math.max(0, Math.min(all.length - 1, s.level))]
}

/** Layout, in units of one box side. */
export const GAP = 0.16
/** Between two items of more than one character (a word and the next). */
export const ITEM_GAP = 0.55
/** The band above each box where its example is written. */
export const PROMPT = 0.62
const ROW_GAP = 0.2

/** A box: its character, which item it belongs to (and whether it is that item's first), and its top-left corner. */
export interface Cell {
  ch: string
  item: number
  first: boolean
  x: number
  y: number
}
export interface Layout {
  boxes: Cell[]
  w: number
  h: number
}

/**
 * Where the boxes go: items in rows of at most `perRow` boxes (an item is
 * never split, unless it is longer than a row on its own), each row centred,
 * each box with the band for its example just above it.
 */
export function layoutOf(items: string[], perRow: number, whole = false): Layout {
  const split = (it: string) => (whole ? [it] : [...it])
  const rows: number[][] = []
  let used = 0
  items.forEach((it, i) => {
    const n = split(it).length
    if (!rows.length || (used > 0 && used + n > perRow)) {
      rows.push([])
      used = 0
    }
    rows[rows.length - 1].push(i)
    used += n
  })
  const gapAfter = (a: string, b: string) => (split(a).length === 1 && split(b).length === 1 ? GAP : ITEM_GAP)
  const widthOf = (row: number[]) => row.reduce((w, i, j) => w + split(items[i]).length + (split(items[i]).length - 1) * GAP + (j ? gapAfter(items[row[j - 1]], items[i]) : 0), 0)
  const wide = Math.max(1, ...rows.map(widthOf))
  const boxes: Cell[] = []
  rows.forEach((row, r) => {
    let x = GAP + (wide - widthOf(row)) / 2
    const y = GAP + PROMPT + r * (PROMPT + 1 + ROW_GAP)
    row.forEach((i, j) => {
      if (j) x += gapAfter(items[row[j - 1]], items[i])
      split(items[i]).forEach((ch, k) => {
        boxes.push({ ch, item: i, first: k === 0, x, y })
        x += 1 + GAP
      })
      x -= GAP
    })
  })
  return { boxes, w: wide + 2 * GAP, h: GAP + rows.length * (PROMPT + 1) + (rows.length - 1) * ROW_GAP + GAP }
}

/** The box a stroke that starts at x, y is written in (a little outside its edge still counts), or -1. */
export function boxAt(lay: Layout, x: number, y: number): number {
  const m = GAP / 2
  return lay.boxes.findIndex((b) => x >= b.x - m && x <= b.x + 1 + m && y >= b.y - m && y <= b.y + 1 + m)
}

/** The box whose example is at x, y (the band above it), or -1. */
export const promptAt = (lay: Layout, x: number, y: number) => lay.boxes.findIndex((b) => x >= b.x && x <= b.x + 1 && y >= b.y - PROMPT && y < b.y - GAP / 2)

/** One stroke of his: the box it was begun in, and its points in page units (x, y, x, y …). */
export interface Stroke {
  box: number
  pts: number[]
}

export const filled = (ink: Stroke[], count: number) => Array.from({ length: count }, (_, i) => ink.some((k) => k.box === i))
export const isFull = (ink: Stroke[], count: number) => count > 0 && filled(ink, count).every(Boolean)

/** The next empty box after `from`, going round; -1 when every box is written in. */
export function nextEmpty(ink: Stroke[], count: number, from: number): number {
  const has = filled(ink, count)
  for (let d = 1; d <= count; d++) if (!has[(from + d) % count]) return (from + d) % count
  return -1
}

/** Undo: his last stroke comes off. */
export const undo = (ink: Stroke[]) => ink.slice(0, -1)
/** Clear: the writing in one box comes off. */
export const clearBox = (ink: Stroke[], box: number) => ink.filter((k) => k.box !== box)

/** A stroke as an SVG path: through the middles of its points, so it is round, not cornered. */
export function pathOf(pts: number[]): string {
  const n = pts.length / 2
  const f = (v: number) => v.toFixed(3)
  if (n === 1) return `M${f(pts[0])} ${f(pts[1])}l0.001 0`
  let d = `M${f(pts[0])} ${f(pts[1])}`
  for (let i = 1; i < n - 1; i++) d += `Q${f(pts[2 * i])} ${f(pts[2 * i + 1])} ${f((pts[2 * i] + pts[2 * i + 2]) / 2)} ${f((pts[2 * i + 1] + pts[2 * i + 3]) / 2)}`
  return `${d}L${f(pts[2 * n - 2])} ${f(pts[2 * n - 1])}`
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const SIGNS: Record<string, string> = { '+': 'plus', '−': 'minus', '-': 'minus', '×': 'times', '÷': 'dividedBy', '=': 'equals' }

/** A clip to play: a number word, a letter's name, or a whole word. */
export type Clip = { kind: 'number'; name: string } | { kind: 'letter'; letter: string } | { kind: 'word'; word: string }

/** What is said for one box: a digit (or a whole number in one box), a letter's name, a sign; nothing for anything else (: , /). */
export function charClips(ch: string, numberWords: (n: number) => string[] = (n) => [ONES[n]]): Clip[] {
  if (/^\d$/.test(ch)) return [{ kind: 'number', name: ONES[Number(ch)] }]
  if (/^\d+$/.test(ch)) return numberWords(Number(ch)).map((name) => ({ kind: 'number', name }))
  if (/^[a-z]$/i.test(ch)) return [{ kind: 'letter', letter: ch.toUpperCase() }]
  return SIGNS[ch] ? [{ kind: 'number', name: SIGNS[ch] }] : []
}

/**
 * What is said for a whole item of more than one character, before its first
 * box: the number (one thousand), the word (cat), the sum (two plus two
 * equals four). Null: a single character, or nothing that can be said whole.
 */
export function itemClips(item: string, numberWords: (n: number) => string[]): Clip[] | null {
  if ([...item].length < 2) return null
  const plain = item.replace(/,/g, '')
  if (/^\d+$/.test(plain)) return numberWords(Number(plain)).map((name) => ({ kind: 'number', name }))
  if (/^[a-z]+$/i.test(item)) return [{ kind: 'word', word: item === 'I' ? 'I' : item.toLowerCase() }]
  const parts = item.match(/\d+|[^\d]/g) ?? []
  if (!parts.every((p) => /^\d+$/.test(p) || SIGNS[p])) return null
  return parts.flatMap((p) => (SIGNS[p] ? [{ kind: 'number' as const, name: SIGNS[p] }] : numberWords(Number(p)).map((name) => ({ kind: 'number' as const, name }))))
}

/** A finished page in the gallery. */
export interface Saved {
  id: string
  /** When it was finished (ms). */
  at: number
  items: string[]
  perRow: number
  whole?: boolean
  ink: Stroke[]
}
export const GALLERY_MAX = 60

/** A page saved by v1.104.0 (one character a box, `tokens`), read as items. */
export function savedPage(s: Saved & { tokens?: string[] }): Saved {
  return s.items ? s : { ...s, items: (s.tokens ?? []).map((t) => t || ' '), perRow: s.perRow ?? 5 }
}
