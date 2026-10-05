/**
 * The Numberblock designer's maths (Character-Designer-research.md): for any
 * whole number — boundless, exact (BigInt), no upper limit — the shapes it
 * can make (tower, rectangles, square, steps, an almost-rectangle with
 * leftover blocks), where the leftovers can go, a readout like
 * "13 = 3 × 4 + 1", and the Numberblock colours for every block, extended to
 * any number of places. Designs made here are meant to dress LavaBlocks'
 * blocks too. Pure, so it is unit tested directly.
 */
import { getDigitColor, getNumberBlockColor, PALE_COLORS } from '@renderblocks/blocks/cubeLayout'

/** Step shapes are drawn column by column, so only up to this many steps. */
export const MAX_STEPS = 2000n
/** Shapes longer than this many times their width are too thin to see, so they aren't offered. */
export const MAX_ASPECT = 60n
/** Leftover blocks can each be dragged while there are at most this many. */
export const MAX_DRAGGABLE = 50n
/** Searching for every rectangle is quick below this; above it, only the shapes that are quick to find. */
const SEARCH_LIMIT = 10n ** 15n

export type ShapeKind = 'tower' | 'square' | 'rectangle' | 'nearly' | 'steps' | 'pairs' | 'tens'

/**
 * A shape: `cols` columns of `rows` full rows, plus `left` leftover blocks
 * (fewer than a row) — or, for steps, columns 1, 2, 3 … `cols` tall.
 */
export interface Shape {
  kind: ShapeKind
  cols: bigint
  rows: bigint
  left: bigint
}

/** ⌊√n⌋, exactly. */
export function isqrt(n: bigint): bigint {
  if (n < 2n) return n
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x = (x + n / x) / 2n
  while ((x + 1n) * (x + 1n) <= n) x++
  while (x * x > n) x--
  return x
}

/** The largest divisor of n no bigger than √n (1 for a prime); null when n is too big to search. */
export function bestDivisor(n: bigint): bigint | null {
  if (n > SEARCH_LIMIT) return null
  const m = Number(n)
  for (let d = Math.floor(Math.sqrt(m)); d > 1; d--) if (m % d === 0) return BigInt(d)
  return 1n
}

/** Is n a step-squad (triangular) number? Its number of steps, or 0. */
export function steps(n: bigint): bigint {
  const k = (isqrt(8n * n + 1n) - 1n) / 2n
  return (k * (k + 1n)) / 2n === n ? k : 0n
}

const shapeOf = (n: bigint, cols: bigint, kind?: ShapeKind): Shape => {
  const rows = n / cols
  const left = n - rows * cols
  return { kind: kind ?? (left ? 'nearly' : rows === cols ? 'square' : 'rectangle'), cols, rows, left }
}

/** The shape cards for n: at most six, all different, the almost-square first. */
export function shapesFor(n: bigint): Shape[] {
  if (n < 1n) return []
  const out: Shape[] = []
  const add = (s: Shape) => {
    if (!out.some((o) => o.cols === s.cols && o.rows === s.rows && o.left === s.left && (o.kind === 'steps') === (s.kind === 'steps'))) out.push(s)
  }
  const r = isqrt(n)
  add(shapeOf(n, r))
  // One column wider: a different way for the leftovers to fall.
  if (r + 1n < n) add(shapeOf(n, r + 1n))
  const d = bestDivisor(n)
  if (d && d > 1n) {
    add({ kind: 'rectangle', cols: d, rows: n / d, left: 0n })
    if (n / d !== d) add({ kind: 'rectangle', cols: n / d, rows: d, left: 0n })
  }
  const k = steps(n)
  if (k > 1n && k <= MAX_STEPS) add({ kind: 'steps', cols: k, rows: k, left: 0n })
  if (n >= 4n) add(shapeOf(n, 2n, 'pairs'))
  if (n >= 20n) add(shapeOf(n, 10n, 'tens'))
  add({ kind: 'tower', cols: 1n, rows: n, left: 0n })
  // Too thin to see (a hairline on screen): not offered. The almost-squares always are.
  const visible = out.filter((x) => x.kind === 'steps' || (x.rows <= x.cols * MAX_ASPECT && x.cols <= (x.rows || 1n) * MAX_ASPECT))
  return (visible.length ? visible : out.slice(0, 1)).slice(0, 6)
}

export const fmt = (n: bigint) => n.toLocaleString('en-US')

/** "13 = 3 × 4 + 1", "10 = 1 + 2 + 3 + 4", "16 = 4 × 4". */
export function readout(n: bigint, s: Shape): string {
  if (s.kind === 'steps') {
    const parts = s.cols <= 6n ? Array.from({ length: Number(s.cols) }, (_, i) => String(i + 1)).join(' + ') : `1 + 2 + … + ${fmt(s.cols)}`
    return `${fmt(n)} = ${parts}`
  }
  return `${fmt(n)} = ${fmt(s.cols)} × ${fmt(s.rows)}${s.left ? ` + ${fmt(s.left)}` : ''}`
}

/** A cell on the grid: column from the left, row from the bottom (plain numbers: only small shapes are drawn block by block). */
export interface Cell {
  col: number
  row: number
}

/** Where block i (counting from the bottom row up, left to right) sits, with no leftovers moved. */
export function cellOf(s: Shape, i: number): Cell {
  if (s.kind === 'steps') {
    const c = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2)
    return { col: c, row: i - (c * (c + 1)) / 2 }
  }
  const cols = Number(s.cols)
  return { col: i % cols, row: Math.floor(i / cols) }
}

/** Can the leftovers be dragged one by one (few enough, on a shape small enough to show them)? */
export const draggable = (s: Shape) => s.left > 0n && s.left <= MAX_DRAGGABLE && s.rows <= 5000n

/**
 * Where leftover blocks may sit: on top of the full rows, or beside them
 * (the column just left or right, any row). The first `left` top spots are
 * where they start.
 */
export function slots(s: Shape): Cell[] {
  if (!draggable(s)) return []
  const cols = Number(s.cols)
  const rows = Number(s.rows)
  const top = Array.from({ length: cols }, (_, c) => ({ col: c, row: rows }))
  const sides: Cell[] = []
  for (let row = 0; row < rows; row++) sides.push({ col: -1, row }, { col: cols, row })
  return [...top, ...sides]
}

export const startSlots = (s: Shape) => (draggable(s) ? Array.from({ length: Number(s.left) }, (_, i) => i) : [])

/** The free slot nearest a point (in cells), for a leftover dropped there. */
export function nearestSlot(s: Shape, taken: number[], x: number, y: number, mine: number): number {
  let best = mine
  let bestD = Infinity
  slots(s).forEach((c, i) => {
    if (i !== mine && taken.includes(i)) return
    const d = Math.hypot(c.col + 0.5 - x, c.row + 0.5 - y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

// --- Colours ------------------------------------------------------------------------------------------

/**
 * Numberblock colours for any size, as the Blocks app colours up to its
 * thousands: the biggest place at the bottom; units bright, tens pale
 * (outlined in their colour), hundreds bright, thousands pale, and so on,
 * alternating up forever. Sevens are rainbows; a units Nine shades grey.
 */
export interface Band {
  /** First block index and how many. */
  start: bigint
  count: bigint
  place: number
  digit: number
}

export function bands(n: bigint): Band[] {
  const digits = n.toString().split('').map(Number)
  const out: Band[] = []
  let start = 0n
  digits.forEach((d, i) => {
    const place = digits.length - 1 - i
    if (!d) return
    const count = BigInt(d) * 10n ** BigInt(place)
    out.push({ start, count, place, digit: d })
    start += count
  })
  return out
}

/** Fill and outline for one block of a place's band, `unit` saying which of the digit's tens/hundreds/… it's in (sevens are rainbows). */
export function bandColour(b: Band, unit: number, j = 0): { fill: string; edge: string | null } {
  if (b.place === 0) return { fill: getDigitColor(b.digit, j, false), edge: null }
  const hue = b.digit === 7 ? unit + 1 : b.digit
  const pale = b.place % 2 === 1
  return { fill: pale ? PALE_COLORS[hue] || '#FFFFFF' : getNumberBlockColor(hue), edge: getNumberBlockColor(hue) }
}

/** Fill and outline for block i of n. */
export function colourOf(n: bigint, i: bigint, bs = bands(n)): { fill: string; edge: string | null } {
  const b = bs.find((x) => i < x.start + x.count) ?? bs[bs.length - 1]
  const j = i - b.start
  return bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j))
}
