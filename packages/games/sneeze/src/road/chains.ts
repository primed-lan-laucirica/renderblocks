/**
 * The sneeze chains (Lan, Nov 12 2026). Sneeze² works because of four things
 * together: what pops out is the same kind of thing, so it sneezes again, all
 * the way down; what stays behind is a shape that shows the difference;
 * putting it back undoes it exactly; and the slider picks among the smaller
 * ones that could pop out. Each chain here keeps all four:
 *
 *   corner   a square pops a smaller square from its corner; an L stays (25 − 9 = 16)
 *   steps    a staircase pops a smaller staircase; its tallest columns stay (15 − 5 = 10)
 *   factors  a rectangle splits into equal copies and one pops out (60 ÷ 2 = 30); a prime can't
 *   powers   the same, with the number's own base (64 ÷ 2, 100 ÷ 10), down to 1
 *   rect     a rectangle keeps its biggest square and pops the rest (8 − 5 = 3), down to a square
 *
 * Pure rules: what a shape becomes, the sentence, and what "Guess first" asks.
 * Sneeze² itself (rules.ts, sim.ts) is the first window on the path, unchanged.
 */

/** A shape of blocks standing on the floor: the height of each column, left to right. */
export type Shape = number[]

export const count = (s: Shape) => s.reduce((a, b) => a + b, 0)
export const high = (s: Shape) => Math.max(...s)
/** `rows` rows of `cols`. */
export const rect = (rows: number, cols: number): Shape => Array.from({ length: cols }, () => rows)
/** A staircase down from `n`: its tallest column at the left. */
export const stairs = (n: number): Shape => Array.from({ length: n }, (_, i) => n - i)
export const isRect = (s: Shape) => s.every((h) => h === s[0])
export const same = (a: Shape, b: Shape) => a.length === b.length && a.every((h, i) => h === b[i])
const isStairs = (s: Shape) => s.every((h, i) => h === s.length - i)
const triangle = (k: number) => (k * (k + 1)) / 2

export const CHAINS = ['corner', 'steps', 'factors', 'powers', 'rect'] as const
export type ChainId = (typeof CHAINS)[number]

/** A piece of a sneeze: where its bottom-left corner is, in blocks from the sneezer's, and whether it flies. */
export interface Part {
  shape: Shape
  x: number
  y: number
  fly: boolean
}

/** A number sentence, token by token: numbers and the signs + − × ÷ =. */
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
  /** The shape it stands in to do this (its copies side by side or stacked), if not as it stands now. */
  as?: Shape
  /** The ones that stay, then the one that flies: that one sneezes next. */
  parts: Part[]
  /** Putting the one that flew back: the opposite sentence. */
  back: Outcome
  /** Factors and powers: what it was divided by. */
  factor?: number
}

const ADD = '2.OA.B.2'
const TIMES = '3.OA.C.7'
/** Only the sums the drills ask count as facts for the progress log. */
const minus = (whole: number, off: number): Fact | undefined => (whole <= 20 ? { concept: ADD, item: `${whole}−${off}` } : undefined)
const plus = (a: number, b: number): Fact | undefined => (a + b <= 20 ? { concept: ADD, item: `${a}+${b}` } : undefined)
const table = (a: number, b: number, item: string): Fact | undefined => (a <= 10 && b <= 10 ? { concept: TIMES, item } : undefined)

const taking = (whole: number, stays: number, out: number): Pick<Sneezed, 'says' | 'ask' | 'answer' | 'fact' | 'back'> => ({
  says: [whole, '−', stays, '=', out],
  ask: [whole, '−', stays, '=', '?'],
  answer: out,
  fact: minus(whole, stays),
  back: { says: [out, '+', stays, '=', whole], ask: [out, '+', stays, '=', '?'], answer: whole, fact: plus(out, stays) },
})

export const divisors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0)

/** What a number can be divided by here. Factors: anything between 1 and itself (a prime: nothing). Powers: its bases (64: 2, 4, 8). */
export function factorsOf(chain: ChainId, n: number): number[] {
  if (chain === 'factors') return divisors(n).filter((d) => d > 1 && d < n)
  if (chain !== 'powers') return []
  const bases = divisors(n).filter((b) => {
    if (b < 2) return false
    let x = n
    while (x % b === 0) x /= b
    return x === 1
  })
  return bases.length > 1 ? bases.filter((b) => b < n) : bases
}

/**
 * How n stands to be divided by f: f copies of one piece (`r` rows of `c`),
 * `a` of them up and `b` across. The squarest whole there is, a little wider
 * rather than taller, and plain stacks or rows of copies before grids.
 */
export function arrange(n: number, f: number): { r: number; c: number; a: number; b: number } {
  const m = n / f
  let best = { r: 1, c: m, a: f, b: 1 }
  let least = Infinity
  for (const r of divisors(m))
    for (const a of divisors(f)) {
      const [c, b] = [m / r, f / a]
      const [h, w] = [a * r, b * c]
      const score = Math.abs(Math.log(h / w)) + (h > w ? 0.2 : 0) + (a > 1 && b > 1 ? 0.3 : 0) + 0.05 * Math.abs(Math.log(r / c))
      if (score < least - 1e-9) [best, least] = [{ r, c, a, b }, score]
    }
  return best
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)))

/** The most squares a rectangle can keep and still pop something out. */
const mostSquares = (short: number, long: number) => (long % short ? Math.floor(long / short) : long / short - 1)

/**
 * What this shape sneezes on this chain (null: it can't). `pick` is what he
 * chose on the slider: the side of the square or staircase that pops out, the
 * number to divide by, or how many squares the rectangle keeps. Without it,
 * the first thing on the slider: the biggest one out, the smallest factor.
 */
export function sneezeOf(chain: ChainId, s: Shape, pick?: number): Sneezed | null {
  const n = count(s)
  switch (chain) {
    case 'corner': {
      const side = s.length
      if (!isRect(s) || s[0] !== side || side < 2) return null
      const k = clamp(pick ?? side - 1, 1, side - 1)
      // The L that stays: full columns, then the ones under the square that left.
      const stays = [...rect(side, side - k), ...rect(side - k, k)]
      return {
        parts: [
          { shape: stays, x: 0, y: 0, fly: false },
          { shape: rect(k, k), x: side - k, y: side - k, fly: true },
        ],
        ...taking(n, n - k * k, k * k),
      }
    }
    case 'steps': {
      const top = s.length
      if (!isStairs(s) || top < 2) return null
      const k = clamp(pick ?? top - 1, 1, top - 1)
      return {
        parts: [
          { shape: s.slice(0, top - k), x: 0, y: 0, fly: false },
          { shape: stairs(k), x: top - k, y: 0, fly: true },
        ],
        ...taking(n, n - triangle(k), triangle(k)),
      }
    }
    case 'factors':
    case 'powers': {
      if (!isRect(s)) return null
      const fs = factorsOf(chain, n)
      if (!fs.length) return null
      const f = pick !== undefined && fs.includes(pick) ? pick : fs[0]
      const m = n / f
      const { r, c, a, b } = arrange(n, f)
      const as = rect(a * r, b * c)
      const parts: Part[] = []
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) parts.push({ shape: rect(r, c), x: j * c, y: i * r, fly: i === a - 1 && j === b - 1 })
      return {
        as: same(as, s) ? undefined : as,
        parts,
        factor: f,
        says: [n, '÷', f, '=', m],
        ask: [n, '÷', f, '=', '?'],
        answer: m,
        fact: table(f, m, `${n}÷${f}`),
        back: { says: [f, '×', m, '=', n], ask: [f, '×', m, '=', '?'], answer: n, fact: table(f, m, `${f}×${m}`) },
      }
    }
    case 'rect': {
      const [rows, cols] = [s[0], s.length]
      if (!isRect(s) || rows === cols) return null
      const [short, long] = [Math.min(rows, cols), Math.max(rows, cols)]
      const k = clamp(pick ?? 1, 1, mostSquares(short, long))
      const wide = cols > rows
      const off = k * short
      return {
        parts: [
          ...Array.from({ length: k }, (_, i) => ({ shape: rect(short, short), x: wide ? i * short : 0, y: wide ? 0 : i * short, fly: false })),
          { shape: wide ? rect(rows, cols - off) : rect(rows - off, cols), x: wide ? off : 0, y: wide ? 0 : off, fly: true },
        ],
        // The long side loses the short side: 8 − 5 = 3.
        says: [long, '−', off, '=', long - off],
        ask: [long, '−', off, '=', '?'],
        answer: long - off,
        fact: minus(long, off),
        back: { says: [long - off, '+', off, '=', long], ask: [long - off, '+', off, '=', '?'], answer: long, fact: plus(long - off, off) },
      }
    }
  }
}

/**
 * The slider, as in Sneeze² (Lan, Nov 12: it is how he chooses what the
 * sneeze will be): everything this shape could pop out, the biggest at the
 * left. `at` is where the thumb rests: what a tap would do now. Null: there
 * is nothing to choose.
 */
export interface Slider {
  values: number[]
  at: number
  labels: string[]
}

export function sliderOf(chain: ChainId, s: Shape): Slider | null {
  if (!sneezeOf(chain, s)) return null
  const n = count(s)
  const down = (from: number) => Array.from({ length: from }, (_, i) => from - i)
  const make = (values: number[], label: (v: number) => string): Slider | null => (values.length < 2 ? null : { values, at: values[0], labels: values.map(label) })
  switch (chain) {
    case 'corner':
      return make(down(s.length - 1), (k) => String(k * k))
    case 'steps':
      return make(down(s.length - 1), (k) => String(triangle(k)))
    case 'factors':
    case 'powers':
      return make(factorsOf(chain, n), (f) => `÷ ${f}`)
    case 'rect': {
      const [short, long] = [Math.min(s[0], s.length), Math.max(s[0], s.length)]
      return make(Array.from({ length: mostSquares(short, long) }, (_, i) => i + 1), (k) => `− ${k * short}`)
    }
  }
}

/** What is written over a shape: how many blocks; a rectangle on the rectangle chain by its sides (5 × 8). */
export function labelOf(chain: ChainId, s: Shape): Says {
  return chain === 'rect' && isRect(s) ? [s[0], '×', s.length] : [count(s)]
}

/** Something to start from: `key` is how it is remembered, `title` and `sub` what its card says. */
export interface Start {
  key: number
  shape: Shape
  title: string
  sub: string
}

const RECTS: [number, number][] = [[2, 3], [3, 5], [5, 8], [8, 13], [13, 21], [4, 6], [6, 9], [6, 10], [8, 12], [3, 7], [4, 10], [5, 12]]
const standing = (chain: ChainId, n: number): Shape => sneezeOf(chain, [n])?.as ?? [n]
const dividing = (chain: ChainId, ns: number[]): Start[] =>
  ns.map((n) => {
    const shape = standing(chain, n)
    return { key: n, shape, title: String(n), sub: `${shape[0]} × ${shape.length}` }
  })

const STARTS: Record<ChainId, Start[]> = {
  corner: Array.from({ length: 9 }, (_, i) => i + 2).map((k) => ({ key: k * k, shape: rect(k, k), title: String(k * k), sub: `${k} × ${k}` })),
  steps: Array.from({ length: 9 }, (_, i) => i + 2).map((k) => ({ key: triangle(k), shape: stairs(k), title: String(triangle(k)), sub: k <= 4 ? stairs(k).reverse().join(' + ') : `1 + 2 + … + ${k}` })),
  factors: dividing('factors', [12, 16, 18, 20, 24, 30, 36, 48, 60, 72, 100]),
  powers: dividing('powers', [4, 8, 16, 32, 64, 9, 27, 81, 25, 125, 100]),
  rect: RECTS.map(([r, c]) => ({ key: r * 100 + c, shape: rect(r, c), title: `${r} × ${c}`, sub: String(r * c) })),
}
/** The one each chain opens on the first time. */
const FIRST: Record<ChainId, number> = { corner: 25, steps: 15, factors: 24, powers: 16, rect: 508 }

export const startsOf = (chain: ChainId) => STARTS[chain]
export const startOf = (chain: ChainId, key: number): Start => STARTS[chain].find((s) => s.key === key) ?? STARTS[chain].find((s) => s.key === FIRST[chain])!

/** The most blocks across or up that a shape can reach on this chain (the stage is scaled to it). */
export function spanOf(chain: ChainId, s: Shape): number {
  const n = count(s)
  const forms = factorsOf(chain, n).map((f) => arrange(n, f))
  return Math.max(s.length, high(s), ...forms.map((q) => Math.max(q.a * q.r, q.b * q.c)))
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

/** What is on the stage, as one sentence: 25 = 9 + 7 + 5 + 3 + 1, or 16 = 8 × 2 when there are many alike. Null for one piece. */
export function sumOf(pieces: Shape[]): Says | null {
  if (pieces.length < 2) return null
  const ns = pieces.map(count).sort((a, b) => b - a)
  const total = ns.reduce((a, b) => a + b, 0)
  if (ns.length > 3 && ns.every((x) => x === ns[0])) return [total, '=', ns.length, '×', ns[0]]
  if (ns.length > 8) return null
  return [total, '=', ...ns.flatMap((x, i) => (i ? ['+', x] : [x]))]
}

/** A piece on a dividing chain, as what it has been divided by on the way: 60 = 2 × 2 × 15. Null before the first sneeze. */
export function trailOf(path: number[], n: number): Says | null {
  if (!path.length) return null
  const whole = path.reduce((a, b) => a * b, n)
  // Down at one, the ones it was divided by are all of it: 32 = 2 × 2 × 2 × 2 × 2.
  return n === 1 ? [whole, '=', ...path.flatMap((f, i) => (i ? ['×', f] : [f]))] : [whole, '=', ...path.flatMap((f) => [f, '×']), n]
}

export const written = (s: Says) => s.join(' ')

/**
 * Stars: a chain's star is earned by guessing right first time, on more than
 * one day (as the Progress tile counts a fact secure). `days` are the days
 * (YYYY-MM-DD) of each right-first-time guess.
 */
export const STAR_RIGHT = 3
export const hasStar = (days: string[]) => days.length >= STAR_RIGHT && new Set(days).size >= 2

/** An answer quicker than this (ms) is a mash, not a guess: it counts for nothing, either way (Render is two and a half). */
export const MASH_MS = 600
