/**
 * Scribble (Lan, Nov 13 2026; "Handwriting Boxes MVP spec" in Drive
 * RenderBlocks/Scribble/): the chalkboard on a screen. A grid of empty boxes,
 * one thing to write in each; what to write is shown or spoken outside the
 * boxes, never in them; he writes freehand. No tracing, no guides, no
 * recognition, nothing marked wrong: a box is filled when he has written in
 * it. A full page earns a star and is kept in the gallery.
 *
 * Pure rules: what the boxes are, where they sit, whose turn it is.
 */

export type SetId = 'numbers' | 'letters' | 'custom'
export type PromptMode = 'shown' | 'spoken' | 'both'
/** How the turn passes to the next box: by itself a moment after he stops writing, or with the Next button. */
export type Advance = 'pause' | 'button'

export interface Settings {
  set: SetId
  /** What a grown-up typed (a date, a word): one character a box. */
  custom: string
  /** How many boxes; null: as many as the set has (1–10, A–H, each character typed). */
  count: number | null
  prompt: PromptMode
  advance: Advance
}
export const DEFAULT_SETTINGS: Settings = { set: 'numbers', custom: '', count: null, prompt: 'both', advance: 'pause' }

/** The chalkboard's own: 1–10 in two rows of five, A–H in two rows of four. */
export const OWN_COUNT: Record<Exclude<SetId, 'custom'>, number> = { numbers: 10, letters: 8 }
export const MOST_BOXES = 20
export const MOST_CUSTOM = 20
/** How long after his last stroke a box counts as done (ms), when the turn passes by itself. */
export const DONE_PAUSE_MS = 1600

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** What a typed set asks for: its characters, the spaces dropped. */
export const typedTokens = (text: string) => [...text].filter((c) => c.trim()).slice(0, MOST_CUSTOM)

/**
 * What goes in each box, in order ('' is a box with nothing asked: his to
 * fill as he likes). More boxes than the set has go on with it (11, 12 …;
 * I, J …); a typed set gets free boxes.
 */
export function tokensOf(s: Settings): string[] {
  const own = s.set === 'custom' ? typedTokens(s.custom) : null
  const n = Math.max(1, Math.min(MOST_BOXES, s.count ?? (own ? own.length || 10 : OWN_COUNT[s.set as 'numbers' | 'letters'])))
  return Array.from({ length: n }, (_, i) => (own ? (own[i] ?? '') : s.set === 'numbers' ? String(i + 1) : (ALPHABET[i] ?? '')))
}

/** Boxes to a row: five, as the numbers are on the chalkboard; letters in fours. */
export const perRowOf = (s: Settings) => (s.set === 'letters' ? 4 : 5)

/** The page, in units of one box side: each box's top-left corner, and the whole page's size. */
export const GAP = 0.16
export interface Layout {
  boxes: { x: number; y: number }[]
  w: number
  h: number
}
export function layoutOf(count: number, perRow: number): Layout {
  const cols = Math.min(count, perRow)
  const rows = Math.ceil(count / perRow)
  return {
    boxes: Array.from({ length: count }, (_, i) => ({ x: GAP + (i % perRow) * (1 + GAP), y: GAP + Math.floor(i / perRow) * (1 + GAP) })),
    w: GAP + cols * (1 + GAP),
    h: GAP + rows * (1 + GAP),
  }
}

/** The box a stroke that starts at x, y is written in (a little outside its edge still counts), or -1. */
export function boxAt(lay: Layout, x: number, y: number): number {
  const m = GAP / 2
  return lay.boxes.findIndex((b) => x >= b.x - m && x <= b.x + 1 + m && y >= b.y - m && y <= b.y + 1 + m)
}

/** One stroke of his: the box it was begun in, and its points in page units (x, y, x, y …). */
export interface Stroke {
  box: number
  pts: number[]
}

export const filled = (ink: Stroke[], count: number) => Array.from({ length: count }, (_, i) => ink.some((k) => k.box === i))
export const isFull = (ink: Stroke[], count: number) => filled(ink, count).every(Boolean)

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

/** What is said for a box: a number's words, a letter's name; nothing for anything else. */
export function spokenOf(token: string): { kind: 'number'; n: number } | { kind: 'letter'; letter: string } | null {
  if (/^\d+$/.test(token)) return { kind: 'number', n: Number(token) }
  if (/^[a-z]$/i.test(token)) return { kind: 'letter', letter: token.toUpperCase() }
  return null
}

/** A finished page in the gallery. */
export interface Saved {
  id: string
  /** When it was finished (ms). */
  at: number
  tokens: string[]
  perRow: number
  ink: Stroke[]
}
export const GALLERY_MAX = 60
