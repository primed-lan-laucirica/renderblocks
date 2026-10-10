/**
 * Where everything sits on the Decimal Board workshop's mat, and how its
 * amounts are written. Four columns run both ways from the point: tens and
 * units to its left, tenths and hundredths to its right. Counts are kept by
 * place, [hundredths, tenths, units, tens], and any count is allowed
 * (13 tenths is 13 tenths until the child exchanges ten of them).
 */
import { BAR, BEAD, GAP } from '../kit/sizes'
import { BILL_H, BILL_W, DIME_R, HUNDREDTH, PENNY_R, TENTH_H, TENTH_W } from '../kit/part6'

export type DecCounts = [number, number, number, number]
export type Look = 'beads' | 'money'

export const ZERO: DecCounts = [0, 0, 0, 0]
export const MAT_W = 1600
export const MAT_H = 780
export const COL = 400
/** Columns left to right: tens, units | tenths, hundredths. */
export const colX = (place: number) => (3 - place) * COL
/** The point sits between the units and the tenths. */
export const POINT_X = 2 * COL

export const PLACE_NAMES: Record<Look, string[]> = {
  beads: ['hundredths', 'tenths', 'units', 'tens'],
  money: ['pennies', 'dimes', 'dollars', 'ten dollars'],
}
/** Mirrored around the units: tens blue, units green, tenths blue, hundredths red. */
export const DEC_PLACE_COLOUR = ['#c53030', '#2b6cb0', '#2f855a', '#2b6cb0']

/** The amount in hundredths (exact: no floating point anywhere). */
export const hundredths = (c: DecCounts) => c[0] + 10 * c[1] + 100 * c[2] + 1000 * c[3]
/** The canonical layout of an amount (every place 0–9). */
export const canonical = (h: number): DecCounts => [h % 10, Math.floor(h / 10) % 10, Math.floor(h / 100) % 10, Math.floor(h / 1000) % 10]

/**
 * Standard notation for an amount in hundredths: 2.35, 0.5, 3, 0.07; with
 * money, always two places ($1.20).
 */
export function fmt(h: number, money = false) {
  const whole = Math.floor(h / 100)
  const cents = h % 100
  const two = String(cents).padStart(2, '0')
  if (money) return `$${whole.toLocaleString('en-US')}.${two}`
  if (cents === 0) return whole.toLocaleString('en-US')
  return `${whole.toLocaleString('en-US')}.${cents % 10 === 0 ? two[0] : two}`
}

/** Pieces drawn on the mat at these scales (the episodes' kit, bigger for fingers). */
export const S = { ten: 1.4, unit: 2, tenth: 2.6, hundredth: 2.6, bill: 1.25, coin: 1.6 }

interface Grid {
  w: number
  h: number
  perRow: number
  dx: number
  dy: number
  /** Coins are drawn from their centre. */
  centred?: boolean
}

function grid(look: Look, place: number): Grid {
  if (look === 'money') {
    if (place >= 2) return { w: BILL_W * S.bill, h: BILL_H * S.bill, perRow: 2, dx: 170, dy: 78 }
    const r = (place === 1 ? DIME_R : PENNY_R) * S.coin
    return { w: 2 * r, h: 2 * r, perRow: 5, dx: 68, dy: 64, centred: true }
  }
  switch (place) {
    case 3:
      return { w: BEAD * S.ten, h: BAR * S.ten, perRow: 9, dx: 40, dy: BAR * S.ten + 18 }
    case 2:
      return { w: BEAD * S.unit, h: BEAD * S.unit, perRow: 7, dx: 50, dy: 50 }
    case 1:
      return { w: TENTH_W * S.tenth, h: TENTH_H * S.tenth, perRow: 10, dx: 30, dy: 68 }
    default:
      return { w: HUNDREDTH * S.hundredth, h: HUNDREDTH * S.hundredth, perRow: 10, dx: 30, dy: 30 }
  }
}

/** The i-th piece of a place: its box (top-left, size); a row of ten fills the column's middle. */
export function box(look: Look, place: number, i: number) {
  const g = grid(look, place)
  const rowW = (g.perRow - 1) * g.dx + g.w
  const x0 = colX(place) + (COL - rowW) / 2
  return { x: x0 + (i % g.perRow) * g.dx, y: 84 + Math.floor(i / g.perRow) * g.dy, w: g.w, h: g.h, centred: !!g.centred }
}

/** A ten bar's beads at the mat's scale, for a fuse of ten units into one. */
export const UNIT_IN_TEN = (BEAD + GAP) * S.ten
