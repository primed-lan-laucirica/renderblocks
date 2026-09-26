/**
 * Number sets and the choice of which numbers get a block (spec 5.1 + 14.4).
 * Pure functions — no DOM, no physics — so they are unit tested directly.
 */

export type SetId =
  | 'integers'
  | 'odds'
  | 'evens'
  | 'primes'
  | 'squares'
  | 'triangular'
  | 'cubes'
  | 'pow10'
  | 'pow2'
  /** Multiples of N, 1–12 ("mult7" = 7, 14, 21 …) — skip counting. */
  | `mult${number}`

export const MULTIPLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export const multiplesSet = (n: number): SetId => `mult${n}`

/** One set button per multiple, labelled by its numbers — he picks by what he reads, not from a menu. */
export const MULTIPLE_SETS: Array<{ id: SetId; name: string; sample: string }> = MULTIPLES.map((n) => ({
  id: multiplesSet(n),
  name: `${n} times tables`,
  sample: `${n} ${2 * n} ${3 * n}`,
}))

/** N for a multiples set, else null. */
export function multipleOf(set: SetId): number | null {
  const m = /^mult(\d+)$/.exec(set)
  return m ? Number(m[1]) : null
}

/** Set buttons carry sample numbers, because he reads numbers far better than words. */
export const SETS: Array<{ id: SetId; name: string; sample: string }> = [
  { id: 'integers', name: 'Integers', sample: '1 2 3 4 5' },
  { id: 'odds', name: 'Odds', sample: '1 3 5 7 9' },
  { id: 'evens', name: 'Evens', sample: '2 4 6 8 10' },
  { id: 'primes', name: 'Primes', sample: '2 3 5 7 11' },
  { id: 'squares', name: 'Square Club', sample: '1 4 9 16 25' },
  { id: 'triangular', name: 'Step Squad', sample: '1 3 6 10 15' },
  { id: 'cubes', name: 'Cube Club', sample: '1 8 27 64' },
  { id: 'pow10', name: 'Powers of 10', sample: '1 10 100' },
  { id: 'pow2', name: 'Powers of 2', sample: '1 2 4 8 16' },
]

export interface NumberRange {
  from: number
  to: number
}

export const PRESETS: NumberRange[] = [
  { from: 1, to: 10 },
  { from: 1, to: 25 },
  { from: 1, to: 100 },
  { from: 1, to: 1_000 },
  { from: -3, to: 1_000_000 },
  { from: -3, to: 1_000_000_000 },
  { from: 1, to: 1_000_000_000_000 },
]

export const LIMIT = 1_000_000_000_000
/** Ranges with this many members or fewer spawn every one of them. */
const SPAWN_ALL = 30
/** Every member with |n| at or below this is "small" and kept where possible. */
const DENSE = 25
const PER_BAND = 10

// ---------------------------------------------------------------- primes

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  base %= mod
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod
    base = (base * base) % mod
    exp >>= 1n
  }
  return result
}

/**
 * Exact for every n the app can reach (|n| ≤ 10^12). Miller–Rabin runs in
 * BigInt: squaring a number near 10^12 overflows a double's 53-bit mantissa.
 */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false
  for (const p of SMALL_PRIMES) {
    if (n === p) return true
    if (n % p === 0) return false
  }
  if (n < 47 * 47) return true
  if (n < 10_000_000) {
    for (let d = 53; d * d <= n; d += 2) if (n % d === 0) return false
    return true
  }
  // These bases make Miller–Rabin deterministic below 3.4 × 10^14.
  const N = BigInt(n)
  let d = N - 1n
  let s = 0
  while ((d & 1n) === 0n) {
    d >>= 1n
    s++
  }
  outer: for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n]) {
    let x = modPow(a, d, N)
    if (x === 1n || x === N - 1n) continue
    for (let i = 1; i < s; i++) {
      x = (x * x) % N
      if (x === N - 1n) continue outer
    }
    return false
  }
  return true
}

function nextPrime(n: number): number {
  for (let x = Math.max(2, Math.ceil(n)); ; x++) if (isPrime(x)) return x
}

function prevPrime(n: number): number | null {
  for (let x = Math.floor(n); x >= 2; x--) if (isPrime(x)) return x
  return null
}

// ------------------------------------------------------- set arithmetic

function isqrt(n: number): number {
  let r = Math.floor(Math.sqrt(n))
  while (r * r > n) r--
  while ((r + 1) * (r + 1) <= n) r++
  return r
}

const tri = (m: number) => (m * (m + 1)) / 2

/** Integer cube root: largest m with m³ ≤ n. */
export function icbrt(n: number): number {
  let r = Math.round(Math.cbrt(n))
  while (r > 0 && r ** 3 > n) r--
  while ((r + 1) ** 3 <= n) r++
  return r
}

/** Largest m with tri(m) ≤ x. */
function triIndex(x: number): number {
  let m = Math.floor((Math.sqrt(8 * x + 1) - 1) / 2)
  while (tri(m) > x) m--
  while (tri(m + 1) <= x) m++
  return m
}

const isOdd = (n: number) => Math.abs(n % 2) === 1

/** Base of each powers set. */
const POWER_BASE: Partial<Record<SetId, number>> = { pow10: 10, pow2: 2 }

/** Largest power of `base` ≤ x (x ≥ 1) — built by multiplying, so exact (no float logs). */
function powAtMost(base: number, x: number): number {
  let v = 1
  while (v * base <= x) v *= base
  return v
}

/** Exponent of an exact power: powIndex(2, 1024) = 10. */
function powIndex(base: number, v: number): number {
  let m = 0
  for (let p = 1; p < v; p *= base) m++
  return m
}

export function isMember(set: SetId, n: number): boolean {
  if (!Number.isInteger(n)) return false
  const k = multipleOf(set)
  if (k) return n % k === 0
  switch (set) {
    case 'integers':
      return true
    case 'odds':
      return isOdd(n)
    case 'evens':
      return !isOdd(n)
    case 'primes':
      return isPrime(n)
    case 'squares':
      return n >= 1 && isqrt(n) ** 2 === n
    case 'triangular':
      return n >= 1 && tri(triIndex(n)) === n
    case 'cubes':
      return n >= 1 && icbrt(n) ** 3 === n
    case 'pow10':
    case 'pow2':
      return n >= 1 && powAtMost(POWER_BASE[set]!, n) === n
    default:
      return false
  }
}

/** Sets that have negative members (primes, the figurate sets and powers are positive only). */
const isSymmetric = (set: SetId) => set === 'integers' || set === 'odds' || set === 'evens' || multipleOf(set) !== null

/** Smallest member ≥ x. */
function firstAtOrAbove(set: SetId, x: number): number {
  x = Math.ceil(x)
  const k = multipleOf(set)
  if (k) return Math.ceil(x / k) * k || 0 // never -0
  switch (set) {
    case 'integers':
      return x
    case 'odds':
      return isOdd(x) ? x : x + 1
    case 'evens':
      return isOdd(x) ? x + 1 : x
    case 'primes':
      return nextPrime(x)
    case 'squares':
      return (isqrt(Math.max(x, 1) - 1) + 1) ** 2
    case 'triangular':
      return tri(triIndex(Math.max(x, 1) - 1) + 1)
    case 'cubes':
      return (icbrt(Math.max(x, 1) - 1) + 1) ** 3
    case 'pow10':
    case 'pow2': {
      if (x <= 1) return 1
      const p = powAtMost(POWER_BASE[set]!, x)
      return p === x ? p : p * POWER_BASE[set]!
    }
    default:
      return x
  }
}

/** Largest member ≤ x, or null if there is none. */
function lastAtOrBelow(set: SetId, x: number): number | null {
  x = Math.floor(x)
  const k = multipleOf(set)
  if (k) return Math.floor(x / k) * k || 0
  switch (set) {
    case 'integers':
      return x
    case 'odds':
      return isOdd(x) ? x : x - 1
    case 'evens':
      return isOdd(x) ? x - 1 : x
    case 'primes':
      return prevPrime(x)
    case 'squares':
      return x < 1 ? null : isqrt(x) ** 2
    case 'triangular':
      return x < 1 ? null : tri(triIndex(x))
    case 'cubes':
      return x < 1 ? null : icbrt(x) ** 3
    case 'pow10':
    case 'pow2':
      return x < 1 ? null : powAtMost(POWER_BASE[set]!, x)
    default:
      return x
  }
}

/** A block's symbolic form, drawn in its centre: a base with a raised or lowered index. */
export interface Notation {
  base: string
  sup?: string
  sub?: string
}

/**
 * The notation a set's block wears (the educational point of those sets):
 * Square Club 49 → 7², Step Squad 10 → T₄, Powers of 10 1000 → 10³,
 * Powers of 2 32 → 2⁵. Other sets, and non-members, have none.
 */
export function notation(set: SetId, n: number): Notation | null {
  if (!isMember(set, n)) return null
  switch (set) {
    case 'squares':
      return { base: isqrt(n).toLocaleString('en-US'), sup: '2' }
    case 'triangular':
      return { base: 'T', sub: triIndex(n).toLocaleString('en-US') }
    case 'cubes':
      return { base: icbrt(n).toLocaleString('en-US'), sup: '3' }
    case 'pow10':
    case 'pow2':
      return { base: String(POWER_BASE[set]), sup: String(powIndex(POWER_BASE[set]!, n)) }
    default:
      return null
  }
}

/** Every member in [lo, hi], or null once there are more than `max`. */
export function enumerate(set: SetId, lo: number, hi: number, max: number): number[] | null {
  if (set === 'integers' && hi - lo + 1 > max) return null
  const out: number[] = []
  for (let v = firstAtOrAbove(set, lo); v <= hi; v = firstAtOrAbove(set, v + 1)) {
    out.push(v)
    if (out.length > max) return null
  }
  return out
}

// ------------------------------------------------------------ spawning

/**
 * Up to PER_BAND members of |n| ∈ [a, b] inside band [10^k, 10^(k+1)),
 * ascending, plus the band's anchor — the one block it keeps no matter what.
 */
function bandPicks(set: SetId, a: number, b: number, k: number): { anchor: number; picks: number[] } | null {
  const base = 10 ** k
  const picks: number[] = []
  let anchor: number | null = null

  if (isSymmetric(set)) {
    // Round values: 1000, 2000 ... 9000, or the next member up (odds 1001,
    // multiples of 7 1001, 2002 ...), then the band's top.
    for (let d = 1; d <= 9; d++) {
      const v = firstAtOrAbove(set, d * base)
      if (v >= a && v <= b) {
        picks.push(v)
        anchor ??= v
      }
    }
    const top = lastAtOrBelow(set, b)
    if (top !== null && top >= a) picks.push(top)
    // A band the range cuts short (e.g. up to 1,500) has few round values —
    // fill it evenly instead.
    if (b < 10 * base - 1) {
      for (let i = 0; i < PER_BAND; i++) {
        const v = firstAtOrAbove(set, a + Math.round((i * (b - a)) / (PER_BAND - 1)))
        if (v <= b) picks.push(v)
      }
    }
  } else if (set === 'primes') {
    for (let i = 0; i < PER_BAND; i++) {
      const v = nextPrime(a + ((b - a) * i) / (PER_BAND - 1))
      if (v <= b) picks.push(v)
    }
    const top = prevPrime(b)
    if (top !== null && top >= a) picks.push(top)
  } else {
    // Squares, cubes, triangular numbers and powers: evenly spaced by index.
    const base = POWER_BASE[set]
    const index = base
      ? (v: number) => powIndex(base, v)
      : set === 'squares'
        ? isqrt
        : set === 'cubes'
          ? icbrt
          : triIndex
    const value = base
      ? (m: number) => base ** m
      : set === 'squares'
        ? (m: number) => m * m
        : set === 'cubes'
          ? (m: number) => m ** 3
          : tri
    const lo = firstAtOrAbove(set, a)
    const hi = lastAtOrBelow(set, b)
    if (hi === null || lo > hi) return null
    const mA = index(lo)
    const mB = index(hi)
    for (let i = 0; i < PER_BAND; i++) picks.push(value(mA + Math.round(((mB - mA) * i) / (PER_BAND - 1))))
  }

  const unique = [...new Set(picks)].sort((x, y) => x - y)
  if (unique.length === 0) return null
  const kept = spreadOrder(unique).slice(0, PER_BAND).sort((x, y) => x - y)
  return { anchor: anchor ?? kept[0], picks: kept }
}

/**
 * The order to take items in so any prefix is spread evenly: first, then
 * repeated midpoints, and the last item last (it sits right beside the next
 * band's anchor, so it is the least informative).
 */
function spreadOrder<T>(list: T[]): T[] {
  if (list.length <= 2) return list
  const out = [list[0]]
  const queue: Array<[number, number]> = [[0, list.length - 1]]
  while (queue.length) {
    const [a, b] = queue.shift()!
    if (b - a < 2) continue
    const m = (a + b) >> 1
    out.push(list[m])
    queue.push([a, m], [m, b])
  }
  out.push(list[list.length - 1])
  return out
}

/**
 * The numbers that get a block, ascending. Priority when over the cap:
 * the extremes, one anchor per power-of-ten band, the small numbers (nearest
 * zero first), then band fills round-robin.
 */
export function spawnNumbers(set: SetId, range: NumberRange, cap = 60): number[] {
  const lo = Math.max(-LIMIT, Math.min(range.from, range.to))
  const hi = Math.min(LIMIT, Math.max(range.from, range.to))
  const all = enumerate(set, lo, hi, SPAWN_ALL)
  if (all) return all

  const chosen = new Set<number>()
  const add = (v: number | null) => {
    if (v !== null && v >= lo && v <= hi && chosen.size < cap) chosen.add(v)
  }

  add(firstAtOrAbove(set, lo))
  add(lastAtOrBelow(set, hi))

  const bands: number[][] = []
  const anchors: number[] = []
  for (let k = 1; k <= 12; k++) {
    for (const sign of isSymmetric(set) ? [1, -1] : [1]) {
      const aAbs = Math.max(10 ** k, DENSE + 1)
      const bAbs = 10 ** (k + 1) - 1
      const a = sign > 0 ? Math.max(aAbs, lo) : Math.max(aAbs, -hi)
      const b = sign > 0 ? Math.min(bAbs, hi) : Math.min(bAbs, -lo)
      if (a > b) continue
      const band = bandPicks(set, a, b, k)
      if (!band) continue
      anchors.push(sign * band.anchor)
      bands.push(spreadOrder(band.picks).map((v) => sign * v))
    }
  }
  anchors.forEach(add)

  const dense = enumerate(set, Math.max(lo, -DENSE), Math.min(hi, DENSE), 1000) ?? []
  dense.sort((x, y) => Math.abs(x) - Math.abs(y) || x - y).forEach(add)

  const next = bands.map(() => 0)
  for (let progress = true; progress && chosen.size < cap; ) {
    progress = false
    bands.forEach((order, i) => {
      while (next[i] < order.length && chosen.has(order[next[i]])) next[i]++
      if (next[i] < order.length && chosen.size < cap) {
        add(order[next[i]++])
        progress = true
      }
    })
  }

  return [...chosen].sort((x, y) => x - y)
}
