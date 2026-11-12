/**
 * The Sneeze road (Lan, Nov 12 2026; plan in Drive SneezeBlocks/Sneeze-road-plan.md):
 * a path of stops, each one kind of sneeze, each sneeze one operation carried
 * out. The shape decides what can come out: a tower sneezes blocks off its
 * top, a rectangle sneezes rows, and putting pieces back together is the
 * opposite operation. Pure rules here: what a shape becomes, the number
 * sentence it makes, and what "Guess first" asks.
 *
 * Stop 1 is Sneeze² itself, unchanged (rules.ts, sim.ts); these are stops 2–11.
 */

/** A shape of blocks: `rows` full rows `cols` wide, and `left` leftover blocks on top (fewer than a row). */
export interface Block {
  cols: number
  rows: number
  left: number
}

export const count = (b: Block) => b.cols * b.rows + b.left
export const tower = (n: number): Block => ({ cols: 1, rows: n, left: 0 })
/** `rows` rows of `cols`: 3 × 4 is three rows of four. */
export const rect = (rows: number, cols: number, left = 0): Block => ({ cols, rows, left })

export const STOPS = ['one', 'split', 'twins', 'join', 'rows', 'burst', 'build', 'over', 'shapes', 'chain'] as const
export type StopId = (typeof STOPS)[number]

/** A piece of a sneeze: where its bottom-left corner is, in blocks from the sneezer's, and whether it flies or stays. */
export interface Part {
  block: Block
  x: number
  y: number
  fly: boolean
}

/** A number sentence, token by token: numbers, and the signs + − × ÷ = r (remainder). */
export type Says = (number | string)[]

/** One fact for the progress log, written as the drills write theirs (7+3, 10−3, 3×4, 12÷4). */
export interface Fact {
  concept: string
  item: string
}

export interface Outcome {
  says: Says
  /** Guess first: the sentence with a ? in it, and the number that goes there. */
  ask: Says
  answer: number
  fact?: Fact
}

export interface Sneezed extends Outcome {
  parts: Part[]
  /** Chain sneeze: every piece that lands sneezes again. */
  again?: boolean
  /** Same number, new shape: nothing flies, it re-forms. */
  reform?: boolean
}

export interface Joined extends Outcome {
  whole: Block
}

const ADD = '2.OA.B.2'
const TIMES = '3.OA.C.7'

/** The whole-number ways to stand n blocks in equal rows: its row counts, smallest first. */
export const divisors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0)

/**
 * What this shape sneezes at this stop (null: it can't). `pick` is what he
 * chose on the slider (Split: how many blocks fly; Rows: how many rows), and
 * comes first. Without it, `row` is the row he tapped, counted from the
 * bottom (Split: that block and all above it fly); with neither (a tap
 * beside it), `seed` picks.
 */
export function sneezeOf(stop: StopId, b: Block, row?: number, seed = 0, pick?: number): Sneezed | null {
  const n = count(b)
  const isTower = b.cols === 1 && b.left === 0
  switch (stop) {
    case 'one': {
      if (!isTower || n < 2) return null
      return {
        parts: [
          { block: tower(n - 1), x: 0, y: 0, fly: false },
          { block: tower(1), x: 0, y: n - 1, fly: true },
        ],
        says: [n, '−', 1, '=', n - 1],
        ask: [n, '−', 1, '=', '?'],
        answer: n - 1,
        fact: { concept: ADD, item: `${n}−1` },
      }
    }
    case 'split':
    case 'join': {
      if (!isTower || n < 2) return null
      const out = Math.min(n - 1, Math.max(1, pick ?? (row === undefined ? 1 + (Math.abs(seed) % (n - 1)) : n - Math.floor(row))))
      return {
        parts: [
          { block: tower(n - out), x: 0, y: 0, fly: false },
          { block: tower(out), x: 0, y: n - out, fly: true },
        ],
        says: [n, '−', out, '=', n - out],
        ask: [n, '−', out, '=', '?'],
        answer: n - out,
        fact: { concept: ADD, item: `${n}−${out}` },
      }
    }
    case 'twins': {
      if (!isTower || n < 2) return null
      const h = Math.floor(n / 2)
      const odd = n % 2 === 1
      return {
        parts: [
          { block: tower(h), x: 0, y: 0, fly: false },
          { block: tower(h), x: 0, y: h, fly: true },
          ...(odd ? [{ block: tower(1), x: 0, y: 2 * h, fly: true }] : []),
        ],
        says: [n, '=', h, '+', h, ...(odd ? ['+', 1] : [])],
        ask: [n, '=', '?', '+', '?', ...(odd ? ['+', 1] : [])],
        answer: h,
        fact: odd ? undefined : { concept: ADD, item: `${h}+${h}` },
      }
    }
    case 'rows':
    case 'build': {
      if (b.left || b.rows < 2) return null
      // One row, or as many as he picked (never all of them).
      const k = Math.min(b.rows - 1, Math.max(1, pick ?? 1))
      const out = k * b.cols
      return {
        parts: [
          { block: rect(b.rows - k, b.cols), x: 0, y: 0, fly: false },
          { block: rect(k, b.cols), x: 0, y: b.rows - k, fly: true },
        ],
        says: [n, '−', out, '=', n - out],
        ask: [n, '−', out, '=', '?'],
        answer: n - out,
        fact: { concept: ADD, item: `${n}−${out}` },
      }
    }
    case 'burst':
    case 'over': {
      if (b.rows < 1 || (b.rows < 2 && !b.left)) return null
      return {
        parts: [
          { block: rect(1, b.cols), x: 0, y: 0, fly: false },
          ...Array.from({ length: b.rows - 1 }, (_, i) => ({ block: rect(1, b.cols), x: 0, y: i + 1, fly: true })),
          ...(b.left ? [{ block: rect(1, b.left), x: 0, y: b.rows, fly: true }] : []),
        ],
        says: [n, '÷', b.cols, '=', b.rows, ...(b.left ? ['r', b.left] : [])],
        ask: [n, '÷', b.cols, '=', '?', ...(b.left ? ['r', b.left] : [])],
        answer: b.rows,
        fact: b.left ? undefined : { concept: TIMES, item: `${n}÷${b.cols}` },
      }
    }
    case 'shapes': {
      if (b.left || n < 2) return null
      const ds = divisors(n)
      const rows = ds[(ds.indexOf(b.rows) + 1) % ds.length]
      return {
        parts: [{ block: rect(rows, n / rows), x: 0, y: 0, fly: false }],
        reform: true,
        says: [n, '=', rows, '×', n / rows],
        ask: [n, '=', rows, '×', '?'],
        answer: n / rows,
        fact: { concept: TIMES, item: `${rows}×${n / rows}` },
      }
    }
    case 'chain': {
      if (b.left || n < 2 || (b.rows % 2 && b.cols % 2)) return null
      // Halved across if it can be (the top half flies), else down the middle (the right half does).
      const half = b.rows % 2 === 0 ? rect(b.rows / 2, b.cols) : rect(b.rows, b.cols / 2)
      const at = b.rows % 2 === 0 ? { x: 0, y: b.rows / 2 } : { x: b.cols / 2, y: 0 }
      return {
        parts: [
          { block: half, x: 0, y: 0, fly: false },
          { block: half, ...at, fly: true },
        ],
        again: true,
        says: [n, '=', 2, '×', n / 2],
        ask: [n, '=', 2, '×', '?'],
        answer: n / 2,
        fact: { concept: TIMES, item: `2×${n / 2}` },
      }
    }
  }
}

/** No shape on the road is wider than this (a slider never offers more). */
export const MAX_COLS = 12

/**
 * The slider (Lan, Nov 12: as in Sneeze², it is how he chooses what the
 * sneeze will be). Two kinds. `pick`: how much flies off at the next sneeze,
 * for that one sneeze (Split: so many blocks; Rows: so many rows, labelled by
 * their blocks), the most at the left as in Sneeze². `form`: the shape itself
 * changes as he slides (All at once and One left over: rows of so many, so
 * 12 can be shared by 2, 3, 4 or 6, and 13 by anything; Same number, new
 * shape: each of its rectangles). `at` is where the thumb rests: what a tap
 * would do now (-1: on none of them). Null: nothing to choose.
 */
export interface Slider {
  kind: 'pick' | 'form'
  values: number[]
  at: number
  labels: string[]
}

export function sliderOf(stop: StopId, b: Block, seed = 0): Slider | null {
  const n = count(b)
  const make = (kind: Slider['kind'], values: number[], at: number, label: (v: number) => string): Slider | null => (values.length < 2 && values[0] === at ? null : values.length ? { kind, values, at, labels: values.map(label) } : null)
  const down = (from: number, to: number) => Array.from({ length: Math.max(0, from - to + 1) }, (_, i) => from - i)
  switch (stop) {
    case 'split':
    case 'join': {
      const now = sneezeOf(stop, b, undefined, seed)
      return now ? make('pick', down(n - 1, 1), count(now.parts[1].block), String) : null
    }
    case 'rows':
    case 'build':
      return b.left || b.rows < 2 ? null : make('pick', down(b.rows - 1, 1), 1, (k) => String(k * b.cols))
    case 'burst':
      return b.left ? null : make('form', divisors(n).filter((d) => d > 1 && d < n && d <= MAX_COLS).reverse(), b.cols, (d) => `÷ ${d}`)
    case 'over':
      return make('form', down(Math.min(n - 1, MAX_COLS), 2), b.cols, (d) => `÷ ${d}`)
    case 'shapes':
      return b.left ? null : make('form', divisors(n).filter((r) => n / r <= MAX_COLS * 2), b.rows, (r) => `${r} × ${n / r}`)
    default:
      return null
  }
}

/** The shape he slid to (a `form` slider), and the sentence it shows: 12 = 4 × 3, 13 = 2 × 5 + 3. */
export function formOf(stop: StopId, b: Block, v: number): { block: Block; says: Says } {
  const n = count(b)
  const block = stop === 'shapes' ? rect(v, n / v) : rect(Math.floor(n / v), v, n % v)
  return { block, says: [n, '=', block.rows, '×', block.cols, ...(block.left ? ['+', block.left] : [])] }
}

/**
 * Putting `b` back on top of `a`: the opposite operation. Two towers add;
 * rows of the same width stack into a rectangle (so many rows of so many);
 * a few blocks on a wider shape are its leftovers. Null: they don't go together.
 */
export function joinOf(stop: StopId, a: Block, b: Block): Joined | null {
  if (stop === 'shapes') return null
  const [na, nb] = [count(a), count(b)]
  const n = na + nb
  if (!a.left && !b.left && a.cols === b.cols) {
    const whole = rect(a.rows + b.rows, a.cols)
    if (a.cols === 1) return { whole, says: [na, '+', nb, '=', n], ask: [na, '+', nb, '=', '?'], answer: n, fact: { concept: ADD, item: `${na}+${nb}` } }
    return { whole, says: [whole.rows, '×', whole.cols, '=', n], ask: [whole.rows, '×', whole.cols, '=', '?'], answer: n, fact: { concept: TIMES, item: `${whole.rows}×${whole.cols}` } }
  }
  if (stop === 'over' && !b.left && b.rows === 1 && b.cols < a.cols && a.left + b.cols < a.cols) {
    const whole = rect(a.rows, a.cols, a.left + b.cols)
    return { whole, says: [a.rows, '×', a.cols, '+', whole.left, '=', n], ask: [a.rows, '×', a.cols, '+', whole.left, '=', '?'], answer: n }
  }
  return null
}

/** Rectangles to start from, by number: [rows, cols, left]. */
const RECTS: Record<number, [number, number]> = { 6: [2, 3], 8: [2, 4], 10: [2, 5], 12: [3, 4], 15: [3, 5], 16: [4, 4], 20: [4, 5], 24: [4, 6] }
const OVERS: Record<number, [number, number, number]> = { 7: [2, 3, 1], 9: [2, 4, 1], 11: [2, 5, 1], 13: [3, 4, 1], 14: [3, 4, 2], 17: [3, 5, 2], 19: [4, 4, 3], 23: [4, 5, 3] }
const CHAINS: Record<number, [number, number]> = { 2: [2, 1], 4: [2, 2], 8: [4, 2], 16: [4, 4], 32: [8, 4], 64: [8, 8] }
const keys = (o: object) => Object.keys(o).map(Number)

/** The numbers each stop can start from, and the one it opens on. */
export const STARTS: Record<StopId, { all: number[]; first: number }> = {
  one: { all: [2, 3, 4, 5, 6, 7, 8, 9, 10], first: 5 },
  split: { all: [3, 4, 5, 6, 7, 8, 9, 10, 12, 20], first: 10 },
  twins: { all: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20], first: 8 },
  join: { all: [3, 4, 5, 6, 7, 8, 9, 10, 12, 20], first: 10 },
  rows: { all: keys(RECTS), first: 12 },
  burst: { all: keys(RECTS), first: 12 },
  build: { all: keys(RECTS), first: 12 },
  over: { all: keys(OVERS), first: 13 },
  shapes: { all: [4, 6, 7, 8, 9, 12, 13, 16, 18, 20, 24], first: 12 },
  chain: { all: keys(CHAINS), first: 16 },
}

/** The shapes a stop starts with, for a number: one whole to sneeze, or pieces to put together. */
export function startOf(stop: StopId, n: number): Block[] {
  switch (stop) {
    case 'join': {
      // Three towers that make n (two for a small one): 10 is 5, 3 and 2.
      const a = Math.ceil(n / 2)
      const b = Math.ceil((n - a) / 2)
      return [a, b, n - a - b].filter((x) => x > 0).map(tower)
    }
    case 'rows':
    case 'burst':
      return [rect(...RECTS[n])]
    case 'build':
      return Array.from({ length: RECTS[n][0] }, () => rect(1, RECTS[n][1]))
    case 'over':
      return [rect(...OVERS[n])]
    case 'chain':
      return [rect(...CHAINS[n])]
    default:
      return [tower(n)]
  }
}

/** The most blocks across or up that a stop's shapes can reach from this start (the stage is scaled to it). */
export function spanOf(stop: StopId, n: number): number {
  if (stop === 'shapes') return n
  if (stop === 'join') return n
  // The slider can stand these in rows of two (half as tall as the number) or of up to MAX_COLS.
  if (stop === 'burst' || stop === 'over') return Math.max(Math.ceil(n / 2) + 1, Math.min(n - 1, MAX_COLS))
  return Math.max(...startOf(stop, n).map((b) => Math.max(b.cols, b.rows + (b.left ? 1 : 0))), stop === 'build' ? RECTS[n][0] : 0)
}

/** Guess first: the answer and two near misses, shuffled by a seed so it's the same each time. */
export function optionsFor(answer: number, seed: number): number[] {
  const near = [...new Set([answer + 1, answer - 1, answer + 2, answer - 2, answer * 2, answer + 10])].filter((x) => x >= 1 && x !== answer)
  const k = Math.abs(seed) % 3
  const out = [answer, near[k % near.length], near[(k + 1) % near.length]]
  let x = Math.abs(seed) * 9301 + 49297
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280
    const j = Math.floor((x / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** What is on the stage, as one sentence: 12 = 4 + 4 + 4, or 16 = 8 × 2 when there are many alike. Null for one piece. */
export function sumOf(pieces: Block[]): Says | null {
  if (pieces.length < 2) return null
  const ns = pieces.map(count).sort((a, b) => b - a)
  const total = ns.reduce((a, b) => a + b, 0)
  if (ns.length > 3 && ns.every((x) => x === ns[0])) return [total, '=', ns.length, '×', ns[0]]
  if (ns.length > 8) return null
  return [total, '=', ...ns.flatMap((x, i) => (i ? ['+', x] : [x]))]
}

export const written = (s: Says) => s.join(' ')

/**
 * Stars: a stop's star is earned by guessing right first time, on more than
 * one day (as the Progress tile counts a fact secure). `days` are the days
 * (YYYY-MM-DD) of each right-first-time guess.
 */
export const STAR_RIGHT = 3
export const hasStar = (days: string[]) => days.length >= STAR_RIGHT && new Set(days).size >= 2

/** An answer quicker than this (ms) is a mash, not a guess: it counts for nothing, either way (Render is two and a half). */
export const MASH_MS = 600

/**
 * A sentence as it is said aloud. There is no spoken "remainder" yet, so
 * 13 ÷ 4 = 3 r 1 is said the other way round: 13 = 3 × 4 + 1.
 */
export function spoken(s: Says): Says {
  const r = s.indexOf('r')
  if (r < 0) return s.filter((t) => t !== '?')
  const [n, , cols, , rows] = s
  return [n, '=', rows, '×', cols, '+', s[r + 1]]
}
