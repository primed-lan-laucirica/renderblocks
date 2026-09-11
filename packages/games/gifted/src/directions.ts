import { COLORS, SHAPES, gcell, glyph, pick, shuffle, type Cell, type Glyph, type ShapeKind } from './types'

/**
 * Following Directions (spec 1.9) — the one verbal subtest where the spoken
 * sentence IS the item. Sentences are a FIXED bank (each has a pre-generated
 * clip); the display is generated per item to satisfy the sentence exactly.
 *
 * Displays are built target-first: place exactly the glyphs that satisfy the
 * predicate, then fill the rest with glyphs that provably do NOT — so the
 * correct answer set is exact by construction, never by luck.
 */

export const COLOR_NAME: Record<string, string> = {
  '#ef4444': 'red',
  '#3b82f6': 'blue',
  '#22c55e': 'green',
  '#f59e0b': 'orange',
  '#a855f7': 'purple',
  '#14b8a6': 'teal',
}
const NAMED = Object.entries(COLOR_NAME) // [hex, name]
const hexOf = (name: string) => NAMED.find(([, n]) => n === name)![0]

type Pred = (g: Glyph) => boolean

export interface Spec {
  id: string
  text: string
  level: number
  /** Which glyphs are the answer. */
  pred: Pred
  /** Exact number of matching glyphs to place; 'many' = 2..3. */
  count: number | 'many'
  /** Build a glyph that satisfies / violates the predicate. */
  make: (match: boolean) => Glyph
  /** Taps must follow bank order (e.g. "the square, then the circle"). */
  ordered?: boolean
  /** A second target for two-step items. */
  pred2?: Pred
  make2?: (match: boolean) => Glyph
}

const BIG = 1
const SMALL = 0.55

function shapeSpec(shape: ShapeKind, level: number, count: number | 'many'): Spec {
  return {
    id: count === 'many' ? `every-${shape}` : `the-${shape}`,
    text: count === 'many' ? `Touch every ${shape}.` : `Touch the ${shape}.`,
    level,
    count,
    pred: (g) => g.shape === shape,
    make: (m) =>
      glyph({
        shape: m ? shape : pick(SHAPES.filter((s) => s !== shape)),
        color: pick(COLORS),
        size: BIG,
      }),
  }
}

function colorSpec(name: string, level: number): Spec {
  const hex = hexOf(name)
  return {
    id: `the-${name}`,
    text: `Touch the ${name} one.`,
    level,
    count: 1,
    pred: (g) => g.color === hex,
    make: (m) =>
      glyph({
        shape: pick(SHAPES),
        color: m ? hex : pick(COLORS.filter((c) => c !== hex)),
        size: BIG,
      }),
  }
}

function twoAttrSpec(name: string, shape: ShapeKind, level: number): Spec {
  const hex = hexOf(name)
  return {
    id: `${name}-${shape}`,
    text: `Touch the ${name} ${shape}.`,
    level,
    count: 1,
    pred: (g) => g.color === hex && g.shape === shape,
    // Distractors deliberately match ONE attribute, never both.
    make: (m) => {
      if (m) return glyph({ shape, color: hex, size: BIG })
      return Math.random() < 0.5
        ? glyph({ shape, color: pick(COLORS.filter((c) => c !== hex)), size: BIG })
        : glyph({ shape: pick(SHAPES.filter((s) => s !== shape)), color: hex, size: BIG })
    },
  }
}

function sizeSpec(big: boolean, shape: ShapeKind, level: number): Spec {
  return {
    id: `${big ? 'big' : 'small'}-${shape}`,
    text: `Touch the ${big ? 'big' : 'small'} ${shape}.`,
    level,
    count: 1,
    pred: (g) => g.shape === shape && (big ? g.size >= 0.9 : g.size <= 0.6),
    make: (m) => {
      if (m) return glyph({ shape, color: pick(COLORS), size: big ? BIG : SMALL })
      // Same shape at the other size, or a different shape entirely.
      return Math.random() < 0.5
        ? glyph({ shape, color: pick(COLORS), size: big ? SMALL : BIG })
        : glyph({ shape: pick(SHAPES.filter((s) => s !== shape)), color: pick(COLORS), size: pick([BIG, SMALL]) })
    },
  }
}

function notSpec(shape: ShapeKind, level: number): Spec {
  return {
    id: `not-${shape}`,
    text: `Touch the one that is not a ${shape}.`,
    level,
    count: 1,
    pred: (g) => g.shape !== shape,
    make: (m) =>
      glyph({
        shape: m ? pick(SHAPES.filter((s) => s !== shape)) : shape,
        color: pick(COLORS),
        size: BIG,
      }),
  }
}

function exceptSpec(shape: ShapeKind, level: number): Spec {
  const plural = shape === 'cross' ? 'crosses' : `${shape}s`
  return {
    id: `except-${shape}`,
    text: `Touch every shape except the ${plural}.`,
    level,
    count: 'many',
    pred: (g) => g.shape !== shape,
    make: (m) =>
      glyph({
        shape: m ? pick(SHAPES.filter((s) => s !== shape)) : shape,
        color: pick(COLORS),
        size: BIG,
      }),
  }
}

function sequenceSpec(a: ShapeKind, b: ShapeKind, level: number): Spec {
  return {
    id: `then-${a}-${b}`,
    text: `Touch the ${a}, then the ${b}.`,
    level,
    ordered: true,
    count: 1,
    pred: (g) => g.shape === a,
    make: (m) =>
      glyph({
        shape: m ? a : pick(SHAPES.filter((s) => s !== a && s !== b)),
        color: pick(COLORS),
        size: BIG,
      }),
    pred2: (g) => g.shape === b,
    make2: (m) =>
      glyph({
        shape: m ? b : pick(SHAPES.filter((s) => s !== a && s !== b)),
        color: pick(COLORS),
        size: BIG,
      }),
  }
}

/** The fixed sentence bank — every entry has a matching audio clip. */
export const DIRECTIONS: Spec[] = [
  // L1 — one attribute
  shapeSpec('circle', 1, 1),
  shapeSpec('square', 1, 1),
  shapeSpec('triangle', 1, 1),
  shapeSpec('star', 1, 1),
  colorSpec('red', 1),
  colorSpec('blue', 1),
  colorSpec('green', 1),
  // L2 — two attributes
  twoAttrSpec('red', 'circle', 2),
  twoAttrSpec('blue', 'square', 2),
  twoAttrSpec('green', 'triangle', 2),
  twoAttrSpec('purple', 'star', 2),
  sizeSpec(true, 'circle', 2),
  sizeSpec(false, 'square', 2),
  // L3 — quantifier
  shapeSpec('triangle', 3, 'many'),
  shapeSpec('star', 3, 'many'),
  shapeSpec('square', 3, 'many'),
  sizeSpec(true, 'triangle', 3),
  sizeSpec(false, 'star', 3),
  // L4 — negation
  notSpec('circle', 4),
  notSpec('square', 4),
  notSpec('triangle', 4),
  // L5 — exclusion
  exceptSpec('circle', 5),
  exceptSpec('square', 5),
  exceptSpec('star', 5),
  // L6 — two-step order
  sequenceSpec('square', 'circle', 6),
  sequenceSpec('triangle', 'star', 6),
  sequenceSpec('circle', 'triangle', 6),
]

export interface DirectionItem {
  spec: Spec
  grid: Cell[]
  /** Indices that must be tapped; order matters when spec.ordered. */
  targets: number[]
}

/** Build a display that satisfies `spec` exactly. */
export function buildDirection(spec: Spec, gridSize = 6): DirectionItem {
  const glyphs: Array<{ g: Glyph; target: boolean; order?: number }> = []

  if (spec.ordered && spec.pred2 && spec.make2) {
    glyphs.push({ g: spec.make(true), target: true, order: 0 })
    glyphs.push({ g: spec.make2(true), target: true, order: 1 })
    while (glyphs.length < gridSize) glyphs.push({ g: spec.make(false), target: false })
  } else {
    const n = spec.count === 'many' ? 2 + Math.floor(Math.random() * 2) : spec.count
    for (let i = 0; i < n; i++) glyphs.push({ g: spec.make(true), target: true })
    while (glyphs.length < gridSize) glyphs.push({ g: spec.make(false), target: false })
  }

  const shuffled = shuffle(glyphs)
  const targets = shuffled
    .map((x, i) => ({ ...x, i }))
    .filter((x) => x.target)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((x) => x.i)

  return { spec, grid: shuffled.map((x) => gcell(x.g)), targets }
}

export function directionsForLevel(level: number): Spec[] {
  const pool = DIRECTIONS.filter((d) => d.level <= level)
  return pool.length ? pool : DIRECTIONS.filter((d) => d.level === 1)
}
