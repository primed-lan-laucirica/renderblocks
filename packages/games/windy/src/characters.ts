/**
 * The characters that get blown through the town: any number at all as a
 * Numberblock usually stands, plus every character he made in Designer (read
 * from shared storage). Each becomes a physics body shaped exactly like its
 * design — a tall tower catches the wind, a wide square holds its ground —
 * and heavier the bigger its number.
 */
import { draggable, shapesFor, slots, startSlots, type Shape } from '@renderblocks/designer/shapes'
import { DEFAULT_LOOK, fromDesign, type Design, type Look } from '@renderblocks/designer/look'

export interface Character {
  key: string
  n: bigint
  shape: Shape
  leftovers: number[]
  look: Look
  /** From Designer (his own) or a standard one. */
  mine: boolean
}

/** Characters bigger than this (in blocks, either way) are shrunk to fit the town. */
export const MAX_SIZE = 9

const sh = (kind: Shape['kind'], cols: number, rows: number, left = 0): Shape => ({ kind, cols: BigInt(cols), rows: BigInt(rows), left: BigInt(left) })

/**
 * Any number as a Numberblock usually stands: 1–10 as in the show (towers,
 * Four and Nine squares, Six, Eight and Ten in two columns), 11–20 in two
 * columns with the odd one on top, bigger ones as square as they get.
 */
export function standard(n: bigint): Character {
  const v = Number(n)
  let shape: Shape
  if (n <= 10n) shape = v === 4 ? sh('square', 2, 2) : v === 9 ? sh('square', 3, 3) : v === 6 || v === 8 || v === 10 ? sh('rectangle', 2, v / 2) : sh('tower', 1, v)
  else if (n <= 20n) shape = sh('pairs', 2, Math.floor(v / 2), v % 2)
  else shape = shapesFor(n)[0]
  return { key: `n-${n}`, n, shape, leftovers: startSlots(shape), look: DEFAULT_LOOK, mine: false }
}

/** The cards shown: Numberblocks 1–20. */
export const STANDARD = Array.from({ length: 20 }, (_, i) => standard(BigInt(i + 1)))

/** A character from its lineup key: "n-<number>" (any number at all) or "mine-<number>" (his design). */
export function fromKey(key: string, mine: Character[]): Character | null {
  const m = /^(n|mine)-(\d+)$/.exec(key)
  if (!m) return null
  if (m[1] === 'mine') return mine.find((c) => c.key === key) ?? null
  return BigInt(m[2]) >= 1n ? standard(BigInt(m[2])) : null
}

/** His Designer characters (newest numbers first), from the shared "designs" record. */
export function fromShared(raw: string | null): Character[] {
  try {
    const designs = JSON.parse(raw ?? '{}') as Record<string, Design>
    return Object.values(designs)
      .map((d) => fromDesign(d))
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => ({ key: `mine-${d.n}`, n: d.n, shape: d.shape, leftovers: d.leftovers, look: d.look, mine: true }))
  } catch {
    return []
  }
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The body in cell units (one block = 1, origin at the bottom-left of the
 * full rows): rectangles that together cover every block, its bounds, and
 * the scale it's drawn and simulated at (1, or smaller for giants).
 */
export function body(c: Character): { rects: Rect[]; x0: number; x1: number; y0: number; y1: number; scale: number } {
  const s = c.shape
  const cols = Number(s.cols)
  const rows = Number(s.rows)
  const rects: Rect[] = []
  if (s.kind === 'steps') for (let k = 0; k < cols; k++) rects.push({ x: k, y: 0, w: 1, h: k + 1 })
  else if (rows > 0) rects.push({ x: 0, y: 0, w: cols, h: rows })
  if (draggable(s) && c.leftovers.length) {
    const cells = slots(s)
    for (const i of c.leftovers) if (cells[i]) rects.push({ x: cells[i].col, y: cells[i].row, w: 1, h: 1 })
  } else if (s.left > 0n && s.kind !== 'steps') rects.push({ x: 0, y: rows, w: Number(s.left), h: 1 })
  const x0 = Math.min(...rects.map((r) => r.x))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y0 = Math.min(...rects.map((r) => r.y))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  const scale = Math.min(1, MAX_SIZE / Math.max(x1 - x0, y1 - y0))
  return { rects, x0, x1, y0, y1, scale }
}

/**
 * Its mass: the number of blocks, so Ten is ten times One — growing more
 * slowly past a thousand, so a giant is heavy but the physics stays steady.
 */
export function mass(n: bigint): number {
  const v = Number(n)
  return v <= 1000 ? v : 1000 * (1 + Math.log10(v / 1000))
}
