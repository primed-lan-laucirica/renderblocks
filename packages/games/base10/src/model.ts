/**
 * The place-value mat (Base10-MVP-spec.md). Pure — no DOM — so it is unit
 * tested directly.
 *
 * The mat is a list of counts, one per place: counts[0] ones, counts[1]
 * tens, and so on up. A settled mat has 0–9 in every place; a tenth block
 * bundles the ten into one of the next place up (a carry), which can chain.
 */

export type Mat = number[]

export type Shape = 'cube' | 'rod' | 'flat'

/** Places repeat cube, rod, flat in every group of three (spec: block look). */
export const shapeOf = (place: number): Shape => (['cube', 'rod', 'flat'] as const)[place % 3]
export const groupOf = (place: number) => Math.floor(place / 3)

/** Blocks the palette offers: 10⁰ to 10⁶ (1 to 1,000,000). */
export const PALETTE_PLACES = [0, 1, 2, 3, 4, 5, 6]

/**
 * The largest block that still lets nine of a place fit in a column's
 * block area (w × h px): rods stack one per row, cubes and flats sit as
 * many across as fit. Blocks grow into room they have and shrink on a phone.
 */
export function blockSize(shape: Shape, w: number, h: number): number {
  const gap = 6
  if (shape === 'rod') return Math.max(20, Math.min(w - 8, 220, (h / 9 - gap) / 0.16))
  for (let s = Math.min(110, w); s >= 10; s--) {
    const perRow = Math.floor((w + gap) / (s + gap))
    if (perRow >= 1 && Math.ceil(9 / perRow) * (s + gap) <= h) return s
  }
  return 10
}

/** The mat starts with the photo's four columns and grows as needed. */
export const MIN_COLUMNS = 4

const count = (m: Mat, p: number) => m[p] ?? 0

/** One step of adding: the mat as it looks, and the carry just made (for the animation). */
export interface Step {
  mat: Mat
  /** Ten blocks of this place bundled into one of the next place. */
  carry?: number
}

/**
 * Add a block. The first step shows it landed (a column may briefly hold
 * ten); each later step is one carry, lowest place first.
 */
export function addSteps(m: Mat, place: number): Step[] {
  const mat = [...m]
  while (mat.length <= place) mat.push(0)
  mat[place] = count(mat, place) + 1
  const steps: Step[] = [{ mat: [...mat] }]
  for (let p = place; count(mat, p) >= 10; p++) {
    mat[p] -= 10
    mat[p + 1] = count(mat, p + 1) + 1
    steps.push({ mat: [...mat], carry: p })
  }
  return steps
}

/** The settled mat after adding a block. */
export const add = (m: Mat, place: number): Mat => addSteps(m, place).at(-1)!.mat

/** Take a block away (dragged off the mat). */
export function remove(m: Mat, place: number): Mat {
  if (count(m, place) === 0) return m
  const mat = [...m]
  mat[place] -= 1
  return trim(mat)
}

const trim = (m: Mat) => {
  const mat = [...m]
  while (mat.length && mat[mat.length - 1] === 0) mat.pop()
  return mat
}

/** Columns to draw: the photo's four, or as many as the number needs. */
export const columns = (m: Mat) => Math.max(MIN_COLUMNS, trim(m).length)

/** The number, exactly (a BigInt, so it never rounds however large it grows). */
export function value(m: Mat): bigint {
  return m.reduce((sum, c, p) => sum + BigInt(c) * 10n ** BigInt(p), 0n)
}

/** Digits in groups of three, most significant first: 1234567 → ['1', '234', '567']. */
export function groupsOf(n: bigint): string[] {
  const s = n.toString()
  const out: string[] = []
  for (let end = s.length; end > 0; end -= 3) out.unshift(s.slice(Math.max(0, end - 3), end))
  return out
}

/** 1234567 → "1,234,567". */
export const standard = (n: bigint) => groupsOf(n).join(',')

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
/** US short scale (spec). */
export const GROUP_NAMES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion']

function underThousand(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  const rest = r < 20 ? (r ? ONES[r] : '') : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : '')
  return [h ? `${ONES[h]} hundred` : '', rest].filter(Boolean).join(' ')
}

/** 1234567 → "one million, two hundred thirty-four thousand, five hundred sixty-seven". */
export function words(n: bigint): string {
  if (n === 0n) return 'zero'
  const groups = groupsOf(n).map(Number)
  return groups
    .map((g, i) => {
      if (!g) return ''
      const name = GROUP_NAMES[groups.length - 1 - i] ?? `× 10^${3 * (groups.length - 1 - i)}`
      return `${underThousand(g)}${name ? ` ${name}` : ''}`
    })
    .filter(Boolean)
    .join(', ')
}

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export const superscript = (n: number) =>
  String(n)
    .split('')
    .map((d) => SUPER[Number(d)])
    .join('')

/** 10ⁿ as text, e.g. "10⁶". */
export const power = (place: number) => `10${superscript(place)}`

/** One place's value, written out: place 6 → "1,000,000". */
export const placeValue = (place: number) => standard(10n ** BigInt(place))

/** 1,203 → "1,000 + 200 + 3" (zero places left out). */
export function expanded(m: Mat): string {
  const parts = trim(m)
    .map((c, p) => (c ? standard(BigInt(c) * 10n ** BigInt(p)) : ''))
    .reverse()
    .filter(Boolean)
  return parts.length ? parts.join(' + ') : '0'
}

/** 1,203 → "1 × 10³ + 2 × 10² + 3 × 10⁰". */
export function powers(m: Mat): string {
  const parts = trim(m)
    .map((c, p) => (c ? `${c} × ${power(p)}` : ''))
    .reverse()
    .filter(Boolean)
  return parts.length ? parts.join(' + ') : '0'
}

const PLACE_IN_GROUP = ['', 'ten ', 'hundred ']
/** Place names: ones, tens, hundreds, thousands, ten thousands … billions … */
export function placeName(place: number): string {
  if (place === 0) return 'ones'
  if (place === 1) return 'tens'
  if (place === 2) return 'hundreds'
  const group = GROUP_NAMES[groupOf(place)]
  return group ? `${PLACE_IN_GROUP[place % 3]}${group}s` : power(place)
}

/**
 * Colours (spec: colours start from the mat). Ones group: the mat's yellow,
 * green and blue; thousands cube: the mat's red. Each later group varies
 * subtly — cubes deepen through reds, rods drift toward teal, flats toward
 * indigo and violet. `tint` shades that group's digits in the number.
 */
export const GROUP_COLOURS: Array<{ cube: string; rod: string; flat: string; tint: string; ink: string }> = [
  { cube: '#F2B632', rod: '#1E9E57', flat: '#2E8BD8', tint: '#FEF3C7', ink: '#92400E' },
  { cube: '#D63A3A', rod: '#1FA38A', flat: '#3F6FD6', tint: '#FEE2E2', ink: '#991B1B' },
  { cube: '#A92E3F', rod: '#13806F', flat: '#4B4FC9', tint: '#FCE7F3', ink: '#9D174D' },
  { cube: '#7C2244', rod: '#0E6B6B', flat: '#5B3FB8', tint: '#F3E8FF', ink: '#6B21A8' },
  { cube: '#5E1A4F', rod: '#0B5A70', flat: '#6A34A8', tint: '#E0F2FE', ink: '#075985' },
]
export const colours = (group: number) => GROUP_COLOURS[Math.min(group, GROUP_COLOURS.length - 1)]
export const colourOf = (place: number) => colours(groupOf(place))[shapeOf(place)]
