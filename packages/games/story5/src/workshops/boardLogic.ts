/**
 * The Bead Board workshop's rules, kept pure: arrays on a board, beads
 * dealt to skittles, stamp tiles shared into lanes (where the child breaks
 * a tile to share it), the notation each shows, and Mastery's challenges.
 */

/** The workshop's board: 12 × 12 holes (so 1 × 12 fits). */
export const GRID = 12

// ——— Arrays ———
export interface ArrayState {
  rows: number
  cols: number
  /** A split between columns `split - 1` and `split` (1 … cols − 1), or null. */
  split: number | null
}
export const NO_ARRAY: ArrayState = { rows: 0, cols: 0, split: null }

export function arrayNotation({ rows, cols, split }: ArrayState): string {
  if (!rows || !cols) return ''
  const n = rows * cols
  if (split && split > 0 && split < cols) return `${rows} × ${cols} = ${rows} × ${split} + ${rows} × ${cols - split} = ${rows * split} + ${rows * (cols - split)} = ${n}`
  return `${rows} × ${cols} = ${n}`
}

/** Every array for n that fits the board, as [short side, long side]. */
export function factorPairs(n: number): [number, number][] {
  const out: [number, number][] = []
  for (let a = 1; a * a <= n; a++) if (n % a === 0 && n / a <= GRID) out.push([a, n / a])
  return out
}

// ——— Sharing beads among skittles ———
export interface ShareState {
  /** Beads not yet dealt. */
  pile: number
  /** Beads under each skittle. */
  shares: number[]
}
export const share0 = (n: number, k: number): ShareState => ({ pile: n, shares: Array.from({ length: k }, () => 0) })
export const shareTotal = (s: ShareState) => s.pile + s.shares.reduce((a, b) => a + b, 0)
/** Dealt fairly and as far as it goes: every skittle the same, and too few left for another round. */
export const shareDone = (s: ShareState) => s.shares.every((v) => v === s.shares[0]) && s.pile < s.shares.length

export function shareNotation(s: ShareState): string {
  const n = shareTotal(s)
  const k = s.shares.length
  if (!n) return ''
  if (!shareDone(s)) return `${n} ÷ ${k} = ?`
  return `${n} ÷ ${k} = ${s.shares[0]}${s.pile ? ` r ${s.pile}` : ''}`
}

// ——— Sharing stamp tiles into lanes ———
/** Tiles by place: [ones, tens, hundreds]. */
export type Places = [number, number, number]
export const placesValue = (p: Places) => p[0] + 10 * p[1] + 100 * p[2]
export const toPlaces = (n: number): Places => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10]
export interface TileState {
  supply: Places
  lanes: Places[]
}
export const tiles0 = (n: number, k: number): TileState => ({ supply: toPlaces(n), lanes: Array.from({ length: k }, () => [0, 0, 0] as Places) })
export const tilesTotal = (s: TileState) => placesValue(s.supply) + s.lanes.reduce((a, l) => a + placesValue(l), 0)

/** Deal one tile of `place` from the supply to lane `l`. */
export function deal(s: TileState, place: number, l: number): TileState {
  if (s.supply[place] <= 0) return s
  const supply = [...s.supply] as Places
  supply[place] -= 1
  const lanes = s.lanes.map((x, j) => (j === l ? (x.map((v, q) => (q === place ? v + 1 : v)) as Places) : x))
  return { supply, lanes }
}
/** Take one tile of `place` back from lane `l` to the supply. */
export function undeal(s: TileState, place: number, l: number): TileState {
  if (s.lanes[l][place] <= 0) return s
  const supply = [...s.supply] as Places
  supply[place] += 1
  const lanes = s.lanes.map((x, j) => (j === l ? (x.map((v, q) => (q === place ? v - 1 : v)) as Places) : x))
  return { supply, lanes }
}
/** The child breaks one supply tile of `place` (tens or hundreds) into ten of the place below. */
export function breakTile(s: TileState, place: number): TileState {
  if (place < 1 || s.supply[place] <= 0) return s
  const supply = [...s.supply] as Places
  supply[place] -= 1
  supply[place - 1] += 10
  return { ...s, supply }
}
export const tilesDone = (s: TileState) => s.supply.every((v) => v === 0) && s.lanes.every((l) => placesValue(l) === placesValue(s.lanes[0]))

export function tilesNotation(s: TileState): string {
  const n = tilesTotal(s)
  const k = s.lanes.length
  if (!n) return ''
  const lane = placesValue(s.lanes[0])
  const fair = s.lanes.every((l) => placesValue(l) === lane)
  const r = placesValue(s.supply)
  if (fair && s.supply[1] === 0 && s.supply[2] === 0 && r < k) return `${n} ÷ ${k} = ${lane}${r ? ` r ${r}` : ''}`
  return `${n} ÷ ${k} = ?`
}

// ——— Mastery ———
export type Challenge =
  | { id: string; kind: 'array'; rows: number; cols: number }
  | { id: string; kind: 'every'; n: number }
  | { id: string; kind: 'share'; n: number; k: number }
  | { id: string; kind: 'divide'; n: number; k: number }

const randInt = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1))

/** A three-digit number that k shares exactly, where the hundreds don't share evenly (so a hundred must be broken). */
export function divisionFor(r: () => number, k: number): number {
  for (;;) {
    const q = randInt(r, Math.ceil(100 / k), Math.floor(999 / k))
    const n = q * k
    if (Math.floor(n / 100) % k !== 0) return n
  }
}

/** A run: 4 × 6; every array for 12; 17 among 5; 465 ÷ 3; then a fresh one of each. */
export function newRun(r: () => number = Math.random): Challenge[] {
  let a = randInt(r, 2, 9)
  let b = randInt(r, 2, 9)
  if (a === 4 && b === 6) a = 7
  if (a === b) b = a === 9 ? 8 : a + 1
  // A share of at most 9 beads.
  const k = randInt(r, 3, 6)
  // A remainder that isn't 0 (and not the first run's 17 among 5 again).
  let n = randInt(r, 2 * k + 1, Math.min(29, 9 * k + k - 1))
  while (n % k === 0 || (n === 17 && k === 5)) n = randInt(r, 2 * k + 1, Math.min(29, 9 * k + k - 1))
  const d = randInt(r, 2, 4)
  const every = [6, 8, 9, 10][randInt(r, 0, 3)]
  let dn = divisionFor(r, d)
  while (dn === 465 && d === 3) dn = divisionFor(r, d)
  return [
    { id: 'array 4x6', kind: 'array', rows: 4, cols: 6 },
    { id: 'every 12', kind: 'every', n: 12 },
    { id: 'share 17/5', kind: 'share', n: 17, k: 5 },
    { id: 'divide 465/3', kind: 'divide', n: 465, k: 3 },
    { id: `array ${a}x${b}`, kind: 'array', rows: a, cols: b },
    { id: `share ${n}/${k}`, kind: 'share', n, k },
    { id: `every ${every}`, kind: 'every', n: every },
    { id: `divide ${dn}/${d}`, kind: 'divide', n: dn, k: d },
  ]
}

/** What the workshop says aloud (the numbers are left for him to read). */
export const BOARD_LINES = {
  array: 'Show this on the bead board.',
  every: 'Find every array for this number.',
  share: 'Deal the beads fairly. Then fill in the numbers.',
  divide: 'Share the tiles fairly. Break a tile when you need to.',
} as const
