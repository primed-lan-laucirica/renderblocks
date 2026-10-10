/** Where everything sits on the Bead Bank mat. */
import type { Pt } from '../engine/ease'
import { BAR, BEAD } from '../kit/sizes'

/** Counts by place: [units, tens, hundreds, thousands]. Any count is allowed (13 units is 13 units). */
export type Counts = [number, number, number, number]
export const value = (c: Counts) => c[0] + 10 * c[1] + 100 * c[2] + 1000 * c[3]
export const PLACE_NAMES = ['units', 'tens', 'hundreds', 'thousands']

export const MAT_W = 1600
export const MAT_H = 780
export const COL = 400
export const colX = (place: number) => (3 - place) * COL

/** Where the i-th piece of a place sits (its top-left; a thousand cube's front face). */
export function layout(place: number, i: number): Pt {
  const x0 = colX(place) + 26
  switch (place) {
    case 0:
      return { x: x0 + (i % 13) * 27, y: 90 + Math.floor(i / 13) * 27 }
    case 1:
      return { x: x0 + (i % 13) * 27, y: 90 + Math.floor(i / 13) * 255 }
    case 2:
      return { x: x0 + Math.min(i, 24) * 12, y: 90 + Math.min(i, 24) * 12 }
    default:
      return { x: x0 + Math.min(i, 20) * 10, y: 220 + Math.min(i, 20) * 10 }
  }
}

/** A piece's box (for finding what a finger is over). */
export function box(place: number, i: number) {
  const p = layout(place, i)
  const size = [
    [BEAD, BEAD],
    [BEAD, BAR],
    [BAR, BAR],
    [BAR, BAR],
  ][place]
  // Generous: on a tablet a bead is only ~14 px, and a finger is much bigger.
  const pad = 12
  return { x: p.x - pad, y: p.y - pad, w: size[0] + pad * 2, h: size[1] + pad * 2 }
}

