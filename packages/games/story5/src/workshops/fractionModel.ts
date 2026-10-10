/**
 * The Fraction Table's rules, as pure functions. A piece is 1/d of a circle
 * (d one of SIZES), lying either in a frame or loose on the table. Angles
 * are counted in 24ths of a turn (24 is the smallest number every size
 * divides), from the top, clockwise; `a` is where a piece starts.
 *
 * The child does every change: cutting a piece into 2 or 3, joining pieces
 * of one size back into a bigger piece (four quarters into a whole), moving
 * pieces into frames or laying one over another. Nothing here happens on
 * its own.
 */
export const TURN = 24
export const SIZES = [1, 2, 3, 4, 6, 8, 12]

export interface Piece {
  id: number
  d: number
  /** Start, in 24ths of a turn. */
  a: number
  /** The frame it's in, or null (loose, its circle's centre at x, y). */
  frame: number | null
  x: number
  y: number
}

export const span = (d: number) => TURN / d
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b)

/** The 24ths a piece covers. */
export const covers = (p: { d: number; a: number }) => Array.from({ length: span(p.d) }, (_, i) => (p.a + i) % TURN)

/** How much, in 24ths. */
export const total = (ps: { d: number }[]) => ps.reduce((s, p) => s + span(p.d), 0)

/** n/d in lowest terms ("3/4"; "1" for a whole; "0"). */
export function simplest(n: number, d: number): string {
  if (n === 0) return '0'
  const g = gcd(n, d)
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`
}

/** An amount in 24ths, written plainly: "3/4", "1", "5/4 = 1 1/4". */
export function amount(n24: number): string {
  const s = simplest(n24, TURN)
  if (n24 <= TURN || n24 % TURN === 0) return s
  const whole = Math.floor(n24 / TURN)
  return `${s} = ${whole} ${simplest(n24 - whole * TURN, TURN)}`
}

/** A piece's own name: "1/4", or "1" for a whole. */
export const unitName = (d: number) => (d === 1 ? '1' : `1/${d}`)

/** Is there room in a frame for a piece of size d starting at a? */
export function fits(inFrame: Piece[], d: number, a: number): boolean {
  const used = new Set(inFrame.flatMap(covers))
  return covers({ d, a }).every((u) => !used.has(u))
}

/** Where a piece goes in a frame: where it already starts if that's free, else the first free start. Null if no room. */
export function placeIn(inFrame: Piece[], d: number, a: number): number | null {
  if (fits(inFrame, d, a)) return a
  for (let s = 0; s < TURN; s++) if (fits(inFrame, d, s)) return s
  return null
}

/**
 * Laid on a loose group: the piece takes the first start (from the group's
 * first) where it doesn't overlap pieces of its own size, so quarters laid
 * on a half go side by side and cover it.
 */
export function layOn(group: Piece[], d: number, own: number): number {
  const same = group.filter((p) => p.d === d)
  const from = group.length ? Math.min(...group.map((p) => p.a)) : own
  for (let i = 0; i < TURN; i += span(d)) {
    const s = (from + i) % TURN
    if (fits(same, d, s)) return s
  }
  return own
}

/** Cut a piece into n equal pieces (n = 2 or 3), or null if that size isn't in the box. */
export function cut(p: Piece, n: number, nextId: number): Piece[] | null {
  const d = p.d * n
  if (!SIZES.includes(d)) return null
  return Array.from({ length: n }, (_, j) => ({ ...p, id: nextId + j, d, a: (p.a + j * span(d)) % TURN }))
}

/** Pieces at the same place: the same frame, or loose with the same centre. */
export const together = (p: Piece, q: Piece) => (p.frame !== null ? p.frame === q.frame : q.frame === null && Math.hypot(p.x - q.x, p.y - q.y) < 1)

/**
 * Join pieces into one bigger piece: they must be the same size, at the
 * same place, side by side, and make a size in the box (two quarters a
 * half, four quarters a whole). Null otherwise.
 */
export function join(ps: Piece[], nextId: number): Piece | null {
  if (ps.length < 2) return null
  const [first] = ps
  if (!ps.every((p) => p.d === first.d && together(first, p))) return null
  if (first.d % ps.length) return null
  const d = first.d / ps.length
  if (!SIZES.includes(d)) return null
  const u = span(first.d)
  const starts = new Set(ps.map((p) => p.a))
  if (starts.size !== ps.length) return null
  if (d === 1) return { ...first, id: nextId, d: 1, a: 0 }
  // Side by side: exactly one piece has no neighbour before it, and from it each next start follows.
  const heads = ps.filter((p) => !starts.has((p.a - u + TURN) % TURN))
  if (heads.length !== 1) return null
  const a = heads[0].a
  for (let i = 0; i < ps.length; i++) if (!starts.has((a + i * u) % TURN)) return null
  return { ...first, id: nextId, d, a }
}

/** Sizes as a sorted list (to tell one way of making an amount from another). */
export const makeup = (ps: Piece[]) => ps.map((p) => p.d).sort((x, y) => x - y).join(',')

/** A sum of pieces in standard notation, in the order they lie: "1/4 + 1/4 + 1/2 = 1"; one piece is just its name. */
export function sumOf(ps: Piece[]): string {
  if (!ps.length) return ''
  const sorted = [...ps].sort((p, q) => p.a - q.a)
  if (sorted.length === 1) return unitName(sorted[0].d)
  return `${sorted.map((p) => unitName(p.d)).join(' + ')} = ${amount(total(sorted))}`
}

/** One layer of pieces, named: "2/4" if they're one size, else their sum's terms. */
const layerName = (ps: Piece[]) => (ps.every((p) => p.d === ps[0].d) ? (ps.length === 1 ? unitName(ps[0].d) : `${ps.length}/${ps[0].d}`) : ps.map((p) => unitName(p.d)).join(' + '))

/**
 * A loose group's notation. Laid over each other so two layers cover exactly
 * the same part of the circle: "1/2 = 2/4". Otherwise, their sum.
 */
export function groupNotation(ps: Piece[]): string {
  const bottom: Piece[] = []
  const top: Piece[] = []
  for (const p of ps) (fits(bottom, p.d, p.a) ? bottom : top).push(p)
  if (top.length) {
    const same = (x: Piece[]) => new Set(x.flatMap(covers))
    const b = same(bottom)
    const t = same(top)
    if (b.size === t.size && [...b].every((u) => t.has(u)) && fitsLayer(top)) return `${layerName(bottom)} = ${layerName(top)}`
    return sumOf(ps)
  }
  return sumOf(ps)
}

/** No two pieces in a layer overlap. */
function fitsLayer(ps: Piece[]): boolean {
  const seen = new Set<number>()
  for (const p of ps)
    for (const u of covers(p)) {
      if (seen.has(u)) return false
      seen.add(u)
    }
  return true
}

/** Loose pieces grouped by where they lie (same centre), in the order they were put down. */
export function looseGroups(ps: Piece[]): Piece[][] {
  const groups: Piece[][] = []
  for (const p of ps.filter((q) => q.frame === null)) {
    const g = groups.find((x) => together(x[0], p))
    if (g) g.push(p)
    else groups.push([p])
  }
  return groups
}

// ——— the track ———

/** The strips laid end to end on the track, written: "1/4 + 1/4 + 1/4 = 3/4", or "5/4 = 1 1/4" once they're all one size. */
export function trackNotation(ds: number[]): string {
  if (!ds.length) return '0'
  const n24 = ds.reduce((s, d) => s + span(d), 0)
  if (ds.every((d) => d === ds[0])) {
    if (ds.length === 1) return unitName(ds[0])
    const own = `${ds.length}/${ds[0]}`
    const plain = amount(n24)
    return own === plain || plain.startsWith(`${own} = `) ? plain : `${own} = ${plain}`
  }
  return `${ds.map(unitName).join(' + ')} = ${amount(n24)}`
}
