/**
 * The sneeze rules (SneezeBlocks research report §3.2). A square of side a
 * sneezes out a smaller square of side b from its middle and keeps a ring:
 * a² − b². The hole has to sit exactly in the middle, so a − b is even.
 *
 * - Ring: the official rule (Numberblocks, "Square on the Moon"): b = a − 2,
 *   leaving a ring one block thick. 100 → 36 + 64 … the odd chain ends at
 *   9 → 8 + 1, the even chain at 4.
 * - Big sneeze: half the side comes out, so a quarter of the square flies and
 *   three quarters stay, at every size (64 → 48 + 16, 10,000 → 7,500 + 2,500;
 *   Lan, Oct 14: the big ones have to be the same shape of sneeze as the small
 *   ones). Where half isn't possible with the hole in the middle, the nearest
 *   square to half that is (36 → 20 + 16, 9 → 8 + 1). RATOT's rounds are the
 *   starting squares; his table sneezed some of them out by less than half.
 *
 * Decimals: a square too small to sneeze in whole blocks (4 and 1) splits its
 * blocks into tenths and sneezes by the same rule, then into hundredths:
 * 4 → 3 + 1, 1 → 0.64 + 0.36, 0.36 → 0.20 + 0.16 (36 → 20 + 16, a hundred
 * times smaller) … down to 0.0001. A side is counted in units of 10^-k
 * blocks, so its square is in units of 100^-k ("cells").
 */

export type Rule = 'ring' | 'big'
/** What to sneeze: by a rule, or one particular square out (its side b, in 10^-k blocks: the slider). */
export type Choice = Rule | { b: bigint; k: number }

/** RATOT's ladder of sides: round r's square is LADDER[r] squared (round 1 = 16 = 4², round 18 = 10,000,000,000). */
export const LADDER = [2n, 4n, 8n, 16n, 32n, 64n, 100n, 200n, 400n, 600n, 800n, 1000n, 2000n, 4000n, 8000n, 16000n, 32000n, 64000n, 100000n]

export const ROUNDS = LADDER.slice(1).map((side, i) => ({ round: i + 1, side, n: side * side }))

/** Numbers go down to hundredths of hundredths, 0.0001 (sides to hundredths of a block). */
export const MAX_K = 2

/** The side of the square that a square of side a sneezes out, or null if it can't sneeze. */
export function innerSide(a: bigint, rule: Rule): bigint | null {
  if (rule === 'ring') return a >= 3n ? a - 2n : null
  // Half, or the nearest to it with the same parity as a (a tie goes to the bigger: 36 → 20 + 16).
  const lo = a / 2n - ((a - a / 2n) % 2n)
  const hi = lo + 2n
  const b = hi < a && 2n * hi - a <= a - 2n * lo ? hi : lo
  return b >= 1n && b < a ? b : null
}

export interface Sneeze {
  /** The whole square, the one sneezed out, and the ring left. */
  whole: bigint
  out: bigint
  ring: bigint
  side: bigint
  outSide: bigint
  /** Sides in 10^-k blocks, numbers in 100^-k. */
  k: number
}

/**
 * A square of side a (in 10^-k blocks) sneezes; in tenths (then hundredths)
 * if it can't in what it's counted in. Every number it makes has at most four
 * decimal places (0.0004 → 0.0003 + 0.0001 is the last: its ring is a
 * thousandth of a block thick, but 0.0003 all the same).
 */
export function sneeze(a: bigint, rule: Choice, k = 0): Sneeze | null {
  if (typeof rule === 'object') {
    // One particular square: in its units, the hole in the middle.
    if (rule.k < k) return null
    const A = a * 10n ** BigInt(rule.k - k)
    const b = rule.b
    if (b < 1n || b > A - 2n || (A - b) % 2n !== 0n) return null
    const s = { whole: A * A, out: b * b, ring: A * A - b * b, side: A, outSide: b, k: rule.k }
    const finest = 100n ** BigInt(Math.max(0, rule.k - MAX_K))
    return s.out % finest === 0n && s.ring % finest === 0n ? s : null
  }
  let b = innerSide(a, rule)
  while (b === null && k <= MAX_K) {
    a *= 10n
    k++
    b = innerSide(a, rule)
  }
  if (b === null) return null
  const s = { whole: a * a, out: b * b, ring: a * a - b * b, side: a, outSide: b, k }
  const finest = 100n ** BigInt(Math.max(0, k - MAX_K))
  return s.out % finest === 0n && s.ring % finest === 0n ? s : null
}

/** A side in the fewest decimal places: 10 tenths is 1. */
export function norm(side: bigint, k: number): { side: bigint; k: number } {
  while (k > 0 && side % 10n === 0n) {
    side /= 10n
    k--
  }
  return { side, k }
}

/** The whole sneeze chain from a square of side a: each sneezed-out square sneezes in turn. */
export function chain(a: bigint, rule: Rule, limit = 10000): Sneeze[] {
  const out: Sneeze[] = []
  let s = sneeze(a, rule)
  while (s && out.length < limit) {
    out.push(s)
    const next = norm(s.outSide, s.k)
    s = sneeze(next.side, rule, next.k)
  }
  return out
}

/** A number of cells (100^-k blocks) as written: 0.36, 0.0020, 0.04, 3 (in its own hundredths, not ".00"s of finer ones). */
export function show(cells: bigint, k: number): string {
  while (k > 0 && cells % 100n === 0n) {
    cells /= 100n
    k--
  }
  if (k === 0) return fmt(cells)
  const places = 2 * k
  const d = 10n ** BigInt(places)
  return `${fmt(cells / d)}.${(cells % d).toString().padStart(places, '0')}`
}

/** A number of cells as a plain number (decimals are all under 4, so exact enough). */
export const value = (cells: bigint, k: number) => (k === 0 ? cells : Number(cells) / 100 ** k)

/**
 * The number whose colours and look a piece wears: 0.36 is a small 36, and a
 * ring of 3 counted in hundredths is 3 (each of its blocks 100 cells: `per`).
 */
export function wears(cells: bigint, k: number): { n: bigint; per: number } {
  let n = cells
  let per = 1
  for (let i = 0; i < k && n % 100n === 0n; i++) {
    n /= 100n
    per *= 100
  }
  return { n, per }
}

/** The whole number's square root, if it's a perfect square. */
export function sqrt(n: bigint): bigint | null {
  if (n < 1n) return null
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  // Float sqrt is only approximate for huge numbers: correct it.
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x * x === n ? x : null
}

/** The square just below and just above n (for a number that isn't one). */
export function squaresAround(n: bigint): [bigint, bigint] {
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return [x, x + 1n]
}

/**
 * Guess first (when it's on): three answers to "What comes out?" — the right
 * one, what the other rule sneezes out (the argument in the comments: "it's
 * not meant to be 48 it's 28", turned round: 16 or 36), and a near miss.
 * The sum reads whole − ring = out (Lan, Oct 30: it lands on the square that
 * came out, the one he follows next; that's the bigger number in a ring
 * sneeze and the smaller in a big one). Shuffled by a seed so it's the same
 * each time. In the sneeze's cells (its k).
 */
export function choices(a: bigint, rule: Choice, seed: number, k = 0): bigint[] {
  const s = sneeze(a, rule, k)
  if (!s) return []
  const set = new Set<bigint>([s.out])
  // The other rule's (for one picked on the slider: the ring's, or the big sneeze's if that's the one).
  const ringOut = sneeze(a, 'ring', k)?.out
  const other = sneeze(a, rule === 'ring' || (typeof rule === 'object' && ringOut === s.out) ? 'big' : 'ring', k)
  if (other && other.k <= s.k) {
    const out = other.out * 100n ** BigInt(s.k - other.k)
    if (out !== s.out) set.add(out)
  }
  // Near misses: a neighbouring square, then the right one ± 4.
  for (const d of [2n, -2n, 4n, -4n]) {
    if (set.size >= 3) break
    const b = s.outSide + d
    if (b >= 1n && b < a) set.add(b * b)
  }
  for (const d of [4n, -4n, 8n]) {
    if (set.size >= 3) break
    if (s.out + d > 0n) set.add(s.out + d)
  }
  const out = [...set].slice(0, 3)
  // A seeded shuffle.
  let x = seed * 9301 + 49297
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280
    const j = Math.floor((x / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const fmt = (n: bigint) => n.toLocaleString('en-US')

/**
 * Every square a square of side a (in 10^-k blocks) can sneeze out, for the
 * slider: sides min, min + step … max (max is the ring sneeze), in 10^-K
 * blocks (tenths or hundredths if it can't in what it's counted in, as
 * sneeze does). Null if it can't sneeze at all.
 */
export function sizesOf(a: bigint, k = 0): { K: number; min: bigint; max: bigint; step: bigint; count: bigint; ring: bigint | null; big: bigint | null } | null {
  let A = a
  let K = k
  while (A < 3n && K <= MAX_K) {
    A *= 10n
    K++
  }
  if (A < 3n) return null
  // Past hundredths, only what's a whole number of hundredths of hundredths.
  const u = K > MAX_K ? 10n ** BigInt(K - MAX_K) : 1n
  const step = 2n * u
  const max = A - step
  let min = A % step
  if (min === 0n) min = step
  if (min > max) return null
  const at = (r: Rule) => {
    const s = sneeze(a, r, k)
    return s && s.k === K ? s.outSide : null
  }
  return { K, min, max, step, count: (max - min) / step + 1n, ring: at('ring'), big: at('big') }
}

/**
 * Where the slider's thumb can come to rest (ascending sides), at most n of
 * them: all of them if they fit, else the ring, the big sneeze, the smallest,
 * and round sides, the roundest first (he picks by what he wants out: 100,
 * 400, 2,500 …), spread evenly where a level has too many to fit.
 */
export function stopsOf(z: NonNullable<ReturnType<typeof sizesOf>>, n: number): bigint[] {
  const { min, max, step } = z
  if (z.count <= BigInt(n)) return Array.from({ length: Number(z.count) }, (_, i) => min + BigInt(i) * step)
  const ok = (b: bigint) => b >= min && b <= max && (b - min) % step === 0n
  const set = new Set<bigint>([min, max, ...(z.big !== null && ok(z.big) ? [z.big] : [])])
  // Round sides, a level at a time: m × 10^j, nudged by one to the right evenness.
  const digits = max.toString().length
  for (let j = digits - 1; j >= 0 && set.size < n; j--) {
    const level: bigint[] = []
    for (let m = 1n; m <= 9n; m++) {
      const t = m * 10n ** BigInt(j)
      for (const b of [t, t - 1n, t + 1n, t - step / 2n, t + step / 2n]) {
        if (ok(b) && !set.has(b) && !level.includes(b)) {
          level.push(b)
          break
        }
      }
    }
    const room = n - set.size
    if (level.length <= room) level.forEach((b) => set.add(b))
    else for (let i = 0; i < room; i++) set.add(level[Math.floor(((i + 0.5) * level.length) / room)])
  }
  return [...set].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
}
