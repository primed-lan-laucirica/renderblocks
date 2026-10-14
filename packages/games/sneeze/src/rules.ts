/**
 * The sneeze rules (SneezeBlocks research report §3.2). A square of side a
 * sneezes out a smaller square of side b from its middle and keeps a ring:
 * a² − b². The hole has to sit exactly in the middle, so a − b is even.
 *
 * - Ring: the official rule (Numberblocks, "Square on the Moon"): b = a − 2,
 *   leaving a ring one block thick. 100 → 36 + 64 … the odd chain ends at
 *   9 → 8 + 1, the even chain at 4.
 * - Big sneeze: RATOT's rule ("Numberblocks Sneeze ROUNDS 1-12"): each square
 *   on his ladder sneezes out the one before it (64 → 48 + 16, 10,000 →
 *   5,904 + 4,096). Any other square sneezes out the one nearest half its side.
 */

export type Rule = 'ring' | 'big'

/** RATOT's ladder of sides: round r's square is LADDER[r] squared (round 1 = 16 = 4², round 18 = 10,000,000,000). */
export const LADDER = [2n, 4n, 8n, 16n, 32n, 64n, 100n, 200n, 400n, 600n, 800n, 1000n, 2000n, 4000n, 8000n, 16000n, 32000n, 64000n, 100000n]

export const ROUNDS = LADDER.slice(1).map((side, i) => ({ round: i + 1, side, n: side * side }))

/** The side of the square that a square of side a sneezes out, or null if it can't sneeze. */
export function innerSide(a: bigint, rule: Rule): bigint | null {
  if (rule === 'ring') return a >= 3n ? a - 2n : null
  const i = LADDER.indexOf(a)
  if (i > 0) return LADDER[i - 1]
  // The same parity as a, nearest half of it (a tie goes to the bigger: 36 → 20 + 16).
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
}

export function sneeze(a: bigint, rule: Rule): Sneeze | null {
  const b = innerSide(a, rule)
  if (b === null) return null
  return { whole: a * a, out: b * b, ring: a * a - b * b, side: a, outSide: b }
}

/** The whole sneeze chain from a square of side a: each sneezed-out square sneezes in turn. */
export function chain(a: bigint, rule: Rule, limit = 10000): Sneeze[] {
  const out: Sneeze[] = []
  let s = sneeze(a, rule)
  while (s && out.length < limit) {
    out.push(s)
    s = sneeze(s.outSide, rule)
  }
  return out
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
 */
export function choices(a: bigint, rule: Rule, seed: number): bigint[] {
  const s = sneeze(a, rule)
  if (!s) return []
  const set = new Set<bigint>([s.ring])
  const other = sneeze(a, rule === 'ring' ? 'big' : 'ring')
  if (other && other.ring !== s.ring) set.add(other.ring)
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
