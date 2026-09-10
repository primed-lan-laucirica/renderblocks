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

/** Shading axis: outline -> light -> solid also serves as a progression. */
export type Fill = 'outline' | 'light' | 'solid'

export interface Glyph {
  shape: ShapeKind
  color: string
  /** Relative size, 1 = full cell. */
  size: number
  /** Degrees. */
  rotation: number
  fill: Fill
}

/** A cell holds 1..6 glyphs; count is itself a variation axis. */
export interface Cell {
  glyphs: Glyph[]
}

export type Layout = 'sample' | 'none' | 'row' | 'matrix2' | 'matrix3' | 'analogy'

export interface Item {
  gen: GenId
  level: number
  layout: Layout
  /** Cells forming the question; the blank is rendered as "?". */
  stimulus: Cell[]
  /** Index within stimulus that is the missing cell (-1 when not applicable). */
  blankIndex: number
  choices: Cell[]
  answer: number
  /** Very short label; the visual convention carries the task, not the text. */
  label: string
}

export const GENERATORS = ['sample', 'odd', 'sequence', 'analogy', 'matrix'] as const
export type GenId = (typeof GENERATORS)[number]

export const GEN_LABEL: Record<GenId, string> = {
  sample: 'Find the same one',
  odd: 'Which is different?',
  sequence: 'What comes next?',
  analogy: 'Finish the pair',
  matrix: 'Fill the empty box',
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

export const COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
]

export const FILLS: Fill[] = ['outline', 'light', 'solid']

/* ---------- small random helpers ---------- */

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

export const cell = (...glyphs: Glyph[]): Cell => ({ glyphs })

export const cloneCell = (c: Cell): Cell => ({ glyphs: c.glyphs.map((g) => ({ ...g })) })

export function sameCell(a: Cell, b: Cell): boolean {
  if (a.glyphs.length !== b.glyphs.length) return false
  return a.glyphs.every((g, i) => {
    const h = b.glyphs[i]
    return (
      g.shape === h.shape &&
      g.color === h.color &&
      g.fill === h.fill &&
      Math.abs(g.size - h.size) < 0.01 &&
      ((g.rotation % 360) + 360) % 360 === ((h.rotation % 360) + 360) % 360
    )
  })
}

/** Variation axes used to build both correct answers and near-miss distractors. */
export type Axis = 'shape' | 'color' | 'size' | 'rotation' | 'fill' | 'count'

export function varyCell(c: Cell, axis: Axis): Cell {
  const out = cloneCell(c)
  const g = out.glyphs[0]
  switch (axis) {
    case 'shape':
      out.glyphs.forEach((x) => (x.shape = pickNot(SHAPES, g.shape)))
      break
    case 'color':
      out.glyphs.forEach((x) => (x.color = pickNot(COLORS, g.color)))
      break
    case 'size':
      out.glyphs.forEach((x) => (x.size = x.size >= 0.85 ? 0.55 : 1))
      break
    case 'rotation':
      out.glyphs.forEach((x) => (x.rotation = (x.rotation + pick([45, 90, 180])) % 360))
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

/** Axes whose visual change is obvious vs subtle — used to scale difficulty. */
export const COARSE_AXES: Axis[] = ['shape', 'color', 'count']
export const FINE_AXES: Axis[] = ['size', 'fill', 'rotation']
