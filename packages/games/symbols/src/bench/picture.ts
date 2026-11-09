/**
 * The quantities under the line: each side of the statement as beads on its
 * pan of the kit's balance. A sum is piles side by side in different
 * colours, a difference a pile with the taken beads left as outlines, a
 * product rows, a quotient one share (the other shares outlined), an amount
 * that is not whole ends in part of a bead, and an amount too big for beads
 * is a numeral card. The beam leans by the two amounts.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { items } from '../kit/glyphs'
import { balance, card, lean, panFloor, piled, PIVOT, props, type BeadColour, type Pile, type Sprite } from '../kit/sprites'
import { isInt, num, type Node } from './parse'

/** What one pan shows, and what it weighs. */
export interface PanPic {
  piles: Pile[]
  card?: string
  weight: number
}

const EMPTY: PanPic = { piles: [], weight: 0 }
/** More beads than this on a pan (outlines counted) and it is a numeral card. */
const MOST = 36
const SUM_COLOURS: BeadColour[] = ['blue', 'red', 'green', 'gold']

const bare = (n: Node): Node => (n.kind === 'group' ? bare(n.inner) : n)
/** A whole amount that beads can show. */
const whole = (n: Node) => isInt(n.v) && n.v.p >= 0

/** The terms of a sum, left to right. */
function terms(n: Node): Node[] {
  const b = bare(n)
  return b.kind === 'op' && b.op === '+' ? [...terms(b.a), ...terms(b.b)] : [b]
}

/** A pile's columns: fives up to fifteen, then tens (so a big pile stays low). */
const cols = (n: number) => (n <= 15 ? Math.min(Math.max(n, 1), 5) : 10)
/** In a sum the piles stand side by side, so each is narrower (threes up to nine). */
const narrow = (n: number) => (n <= 3 ? Math.max(n, 1) : n === 4 ? 2 : n <= 9 ? 3 : n <= 20 ? 5 : 10)
type Cols = (n: number) => number
/** A share's columns: whichever lets b shares of q, side by side, be made of the largest beads. */
function shareCols(q: number, b: number) {
  const size = (c: number) => Math.min(TALL / (Math.ceil(q / c) * STEP), ROOM / (b * c * STEP + (b - 1) * GAP))
  let best = 1
  for (let c = 2; c <= q; c++) if (size(c) > size(best) + 1e-9) best = c
  return best
}

/** An amount with no structure to show: whole beads and, if it is not whole, part of one. */
function plain(v: number, colour: BeadColour | undefined, wide: Cols): Pile[] {
  if (v <= 0) return []
  const n = Math.floor(v + 1e-9)
  const part = v - n
  return [{ n, cols: wide(n + (part > 1e-9 ? 1 : 0)), colour, ...(part > 1e-9 ? { part } : {}) }]
}

function pilesOf(node: Node, colour?: BeadColour, wide: Cols = cols): Pile[] {
  const n = bare(node)
  if (n.kind === 'op' && whole(n.a) && whole(n.b)) {
    const [a, b] = [n.a.v.p, n.b.v.p]
    // a − b: a beads, the last b only outlines.
    if (n.op === '−' && b <= a) return [{ n: a, ghost: b, cols: wide(a), colour }]
    // a × b: a rows of b.
    if (n.op === '×' && a > 0 && b > 0) return [{ n: a * b, cols: b, colour }]
    // a ÷ b: b equal shares, one of them solid (that share is the amount).
    if (n.op === '÷' && isInt(n.v) && n.v.p > 0 && b >= 2 && b <= 6) {
      const q = n.v.p
      const c = shareCols(q, b)
      return Array.from({ length: b }, (_, i) => ({ n: q, ghost: i === 0 ? 0 : q, cols: c, colour }))
    }
  }
  return plain(num(n.v), colour, wide)
}

/** One side of the statement as a pan. */
export function panOf(side: Node | null): PanPic {
  if (!side) return EMPTY
  const weight = num(side.v)
  const ts = terms(side)
  const piles = ts.length > 1 && ts.every((t) => t.v.p >= 0) ? ts.flatMap((t, i) => pilesOf(t, SUM_COLOURS[i % SUM_COLOURS.length], narrow)) : pilesOf(side)
  const beads = piles.reduce((s, p) => s + p.n + (p.part ? 1 : 0), 0)
  if (beads > MOST || weight > MOST) return isInt(side.v) && weight >= 0 ? { piles: [], card: String(side.v.p), weight } : { piles: [], weight }
  return { piles, weight }
}

/**
 * How a side looks, as a word: the same picture has the same word, however
 * it was written. 3 + 2 and 2 + 3 look alike, so do 3 × 4 and 4 · 3; 5 does
 * not look like 3 + 2, nor 6 − 2 like 4.
 */
export function look(node: Node): string {
  const ts = terms(node)
  if (ts.length > 1) return ts.map(look).sort().join('+')
  const n = bare(node)
  const v = (x: Node) => `${x.v.p}${x.v.q === 1 ? '' : `:${x.v.q}`}`
  if (n.kind === 'op' && n.op === '−') return `${v(n.a)}−${v(n.b)}`
  if (n.kind === 'op' && n.op === '×') return [v(n.a), v(n.b)].sort().join('×')
  if (n.kind === 'op' && n.op === '÷') return `${v(n.a)}÷${v(n.b)}`
  return v(n)
}

const BEAD = 50
/** Beads on a pan stand no higher than this (under the beam's end, where the strings meet), in no more room than this. */
const TALL = 140
const ROOM = 330
/** The kit's bead step, and its gap between piles, in beads. */
const STEP = 1.11
const GAP = 0.5

/** The largest bead these piles can be made of and still fit their pan. */
function fit(piles: Pile[]) {
  if (!piles.length) return BEAD
  const cs = piles.map((p) => p.cols ?? 5)
  const rows = Math.max(...piles.map((p, i) => Math.ceil((p.n + (p.part ? 1 : 0)) / cs[i])))
  const wide = cs.reduce((w, c) => w + c * STEP, 0) + (cs.length - 1) * GAP
  return Math.min(BEAD, TALL / (rows * STEP), ROOM / wide)
}

/** A numeral card standing on a pan, as wide as its numeral (the kit's card is cut for two digits). */
function numeral(name: string, floor: Pt, text: string): Sprite[] {
  const wide = text.length * 0.62
  const size = Math.min(96, 300 / wide)
  return [card(`${name}card`, floor.x, floor.y - 62, Math.max(150, wide * size + 48), 120), { k: `${name}num`, type: 'tok', n: { x: floor.x, y: floor.y - 60, size, o: 1 }, d: { it: items([text])[0] } }]
}

export interface BenchOpts {
  y?: number
  /** Blocks under the pans hold the beam level (one side is not known yet). */
  propped?: boolean
}

/** The balance with both sides on it, as sprites (named so two states blend). Both pans' beads are one size, so more beads is more. */
export function benchSprites(left: PanPic, right: PanPic, o: BenchOpts = {}): Sprite[] {
  const y = o.y ?? PIVOT.y
  const tilt = o.propped ? 0 : lean(right.weight - left.weight)
  const size = Math.min(fit(left.piles), fit(right.piles))
  const out = balance({ y, tilt })
  for (const side of [-1, 1] as const) {
    const pan = side < 0 ? left : right
    const name = side < 0 ? 'L' : 'R'
    const floor = panFloor(PIVOT.x, y, tilt, side)
    if (pan.card) out.push(...numeral(name, floor, pan.card))
    if (pan.piles.length) out.push(...piled(name, floor, pan.piles, { size, room: ROOM + 1 }))
  }
  return o.propped ? [...props(PIVOT.x, y), ...out] : out
}
