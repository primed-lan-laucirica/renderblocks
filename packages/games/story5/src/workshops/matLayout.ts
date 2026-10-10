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

/**
 * Thousand cubes on the mat are drawn at this scale, so each stands apart
 * with its whole 3D shape: ten sit two by five (like a ten frame), and an
 * 11th–15th fill a third column. CUBE is a small cube's footprint (front
 * face plus its oblique depth), CUBE_D its depth.
 */
export const THOUSAND_S = 0.325
export const CUBE = BAR * 1.5 * THOUSAND_S
export const CUBE_D = BAR * 0.5 * THOUSAND_S

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
    default: {
      // 2 × 5 for the first ten, then a third column; past 15, a second layer sits a little up and to the right.
      const k = i % 15
      const c = k < 10 ? k % 2 : 2
      const r = k < 10 ? Math.floor(k / 2) : k - 10
      const layer = Math.floor(i / 15) * 8
      return { x: x0 + c * (CUBE + 10) + layer, y: 84 + CUBE_D + r * (CUBE + 8) - layer }
    }
  }
}

/** A piece's box (for finding what a finger is over). */
export function box(place: number, i: number) {
  const p = layout(place, i)
  // Generous: on a tablet a bead is only ~14 px, and a finger is much bigger.
  const pad = 12
  if (place === 3) return { x: p.x - pad, y: p.y - CUBE_D - pad, w: CUBE + pad * 2, h: CUBE + pad * 2 }
  const size = [
    [BEAD, BEAD],
    [BEAD, BAR],
    [BAR, BAR],
  ][place]
  return { x: p.x - pad, y: p.y - pad, w: size[0] + pad * 2, h: size[1] + pad * 2 }
}

