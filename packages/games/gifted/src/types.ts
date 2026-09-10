export type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'pentagon'
  | 'cross'
  | 'arrow'

export type Fill = 'outline' | 'light' | 'solid'

export interface Glyph {
  shape: ShapeKind
  color: string
  size: number
  rotation: number
  fill: Fill
}

/** Grid of color indices; -1 is empty. Used by pattern-completion fields. */
export type ColorGrid = number[][]

export type Cell =
  | { kind: 'glyphs'; glyphs: Glyph[] }
  | { kind: 'number'; value: number }
  | { kind: 'text'; text: string }
  /** A patterned field, optionally with a square hole punched out of it. */
  | { kind: 'field'; grid: ColorGrid; hole?: { r: number; c: number; n: number } }
  /** A folded sheet: half (or quarter) shown, with punch positions. */
  | { kind: 'fold'; axis: 'v' | 'h'; size: number; punches: Array<[number, number]> }
  /** An unfolded sheet showing every hole. */
  | { kind: 'sheet'; size: number; holes: Array<[number, number]> }

export type SubtestId =
  | 'figureMatrix'
  | 'figureClassify'
  | 'figureSeries'
  | 'patternCompletion'
  | 'paperFolding'
  | 'numberSeries'
  | 'numberAnalogy'
  | 'numberPuzzle'

/** Ordered easiest -> hardest; also the unlock order. */
export const SUBTESTS: SubtestId[] = [
  'figureClassify',
  'numberSeries',
  'figureSeries',
  'figureMatrix',
  'numberAnalogy',
  'patternCompletion',
  'numberPuzzle',
  'paperFolding',
]

/** Subtest names as they appear on the real batteries. */
export const SUBTEST_NAME: Record<SubtestId, string> = {
  figureClassify: 'Figure Classification',
  numberSeries: 'Number Series',
  figureSeries: 'Figure Series',
  figureMatrix: 'Figure Matrices',
  numberAnalogy: 'Number Analogies',
  patternCompletion: 'Pattern Completion',
  numberPuzzle: 'Number Puzzles',
  paperFolding: 'Paper Folding',
}

/** Kid-facing instruction — short, sight-word level. */
export const SUBTEST_HINT: Record<SubtestId, string> = {
  figureClassify: 'Which one goes with these?',
  numberSeries: 'What number comes next?',
  figureSeries: 'What comes next?',
  figureMatrix: 'Fill the empty box',
  numberAnalogy: 'Finish the pair',
  patternCompletion: 'Which piece fits the hole?',
  numberPuzzle: 'What is missing?',
  paperFolding: 'Which one when it opens up?',
}

export type Layout =
  | 'classify'
  | 'row'
  | 'matrix2'
  | 'matrix3'
  | 'pairs'
  | 'field'
  | 'fold'
  | 'equation'

export interface Item {
  sub: SubtestId
  level: number
  layout: Layout
  stimulus: Cell[]
  /** Index of the missing cell in stimulus, or -1. */
  blankIndex: number
  choices: Cell[]
  answer: number
  /** Why the answer is the answer — shown after responding. */
  explain: string
}

export const SHAPES: ShapeKind[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'star',
  'hexagon',
  'pentagon',
  'cross',
  'arrow',
]

export const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6']
export const FILLS: Fill[] = ['outline', 'light', 'solid']

/**
 * Shapes where a quarter turn is actually visible. A rotated circle or square
 * is pixel-identical to the original, so using rotation on them produces an
 * item with two indistinguishable choices.
 */
export const ROTATABLE: ShapeKind[] = ['triangle', 'arrow', 'pentagon', 'star', 'diamond', 'hexagon']

/** Size steps far enough apart to judge by eye (not 0.6 vs 0.8). */
export const SIZE_STEPS = [0.45, 0.72, 1] as const

/* ---------- helpers ---------- */

export function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]
}

export function pickNot<T>(xs: readonly T[], not: T | T[]): T {
  const banned = Array.isArray(not) ? not : [not]
  const pool = xs.filter((x) => !banned.includes(x))
  return pool.length ? pick(pool) : pick(xs)
}

export function shuffle<T>(xs: T[]): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const glyph = (g: Partial<Glyph> = {}): Glyph => ({
  shape: g.shape ?? pick(SHAPES),
  color: g.color ?? pick(COLORS),
  size: g.size ?? 1,
  rotation: g.rotation ?? 0,
  fill: g.fill ?? 'solid',
})

export const gcell = (...glyphs: Glyph[]): Cell => ({ kind: 'glyphs', glyphs })
export const ncell = (value: number): Cell => ({ kind: 'number', value })
export const tcell = (text: string): Cell => ({ kind: 'text', text })

export function cloneCell(c: Cell): Cell {
  if (c.kind === 'glyphs') return { kind: 'glyphs', glyphs: c.glyphs.map((g) => ({ ...g })) }
  return JSON.parse(JSON.stringify(c)) as Cell
}

const norm = (r: number) => ((r % 360) + 360) % 360

export function sameCell(a: Cell, b: Cell): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'number' && b.kind === 'number') return a.value === b.value
  if (a.kind === 'text' && b.kind === 'text') return a.text === b.text
  if (a.kind === 'glyphs' && b.kind === 'glyphs') {
    if (a.glyphs.length !== b.glyphs.length) return false
    return a.glyphs.every((g, i) => {
      const h = b.glyphs[i]
      return (
        g.shape === h.shape &&
        g.color === h.color &&
        g.fill === h.fill &&
        Math.abs(g.size - h.size) < 0.01 &&
        norm(g.rotation) === norm(h.rotation)
      )
    })
  }
  if (a.kind === 'field' && b.kind === 'field')
    return JSON.stringify(a.grid) === JSON.stringify(b.grid)
  if (a.kind === 'sheet' && b.kind === 'sheet') {
    const key = (h: Array<[number, number]>) =>
      h
        .map(([r, c]) => `${r},${c}`)
        .sort()
        .join('|')
    return a.size === b.size && key(a.holes) === key(b.holes)
  }
  if (a.kind === 'fold' && b.kind === 'fold') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

export type Axis = 'shape' | 'color' | 'size' | 'rotation' | 'fill' | 'count'

export function varyCell(c: Cell, axis: Axis): Cell {
  if (c.kind !== 'glyphs') return cloneCell(c)
  const out = cloneCell(c) as Extract<Cell, { kind: 'glyphs' }>
  const g = out.glyphs[0]
  switch (axis) {
    case 'shape':
      out.glyphs.forEach((x) => (x.shape = pickNot(SHAPES, g.shape)))
      break
    case 'color':
      out.glyphs.forEach((x) => (x.color = pickNot(COLORS, g.color)))
      break
    case 'size':
      // Jump to the far end of the scale so the difference is unmistakable.
      out.glyphs.forEach((x) => (x.size = x.size >= 0.7 ? SIZE_STEPS[0] : SIZE_STEPS[2]))
      break
    case 'rotation':
      out.glyphs.forEach((x) => (x.rotation = (x.rotation + pick([90, 270])) % 360))
      break
    case 'fill':
      out.glyphs.forEach((x) => (x.fill = pickNot(FILLS, g.fill)))
      break
    case 'count':
      if (out.glyphs.length > 1 && Math.random() < 0.5) out.glyphs.pop()
      else out.glyphs.push({ ...g })
      break
  }
  return out
}

export const COARSE_AXES: Axis[] = ['shape', 'color', 'count']
export const FINE_AXES: Axis[] = ['size', 'fill', 'rotation']

/**
 * Axes whose change would actually be *visible* on this cell. Varying an
 * imperceptible axis yields two choices that look identical — indefensible
 * whichever the child picks.
 */
export function perceptibleAxes(c: Cell, pool: Axis[]): Axis[] {
  if (c.kind !== 'glyphs' || c.glyphs.length === 0) return pool
  const shape = c.glyphs[0].shape
  return pool.filter((a) => (a === 'rotation' ? ROTATABLE.includes(shape) : true))
}
