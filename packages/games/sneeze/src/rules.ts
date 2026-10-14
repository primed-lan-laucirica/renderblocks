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
export function sneeze(a: bigint, rule: Rule, k = 0): Sneeze | null {
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
 * Guess first (when it's on): three answers to "What's left?" — the right one,
 * the other rule's ring (the argument in the comments: "it's not meant to be
 * 48 it's 28"), and a near miss. Shuffled by a seed so it's the same each time.
 * In the sneeze's cells (its k).
 */
export function choices(a: bigint, rule: Rule, seed: number, k = 0): bigint[] {
  const s = sneeze(a, rule, k)
  if (!s) return []
  const set = new Set<bigint>([s.ring])
  const other = sneeze(a, rule === 'ring' ? 'big' : 'ring', k)
  if (other && other.k <= s.k) {
    const ring = other.ring * 100n ** BigInt(s.k - other.k)
    if (ring !== s.ring) set.add(ring)
  }
  // Near misses: what's left if a neighbouring square came out instead, then the ring ± 4.
  for (const d of [2n, -2n, 4n, -4n]) {
    if (set.size >= 3) break
    const b = s.outSide + d
    if (b >= 1n && b < a) set.add(a * a - b * b)
  }
  for (const d of [4n, -4n, 8n]) {
    if (set.size >= 3) break
    if (s.ring + d > 0n) set.add(s.ring + d)
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
