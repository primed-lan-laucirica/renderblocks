/** Where everything sits on the Stamp Game's tile mat. */
import type { Pt } from '../engine/ease'
import { TILE } from '../kit/sizes'

/** Tiles by place: [ones, tens, hundreds]. Any count is allowed (13 ones is 13 ones). */
export type Tiles = [number, number, number]
export const NONE: Tiles = [0, 0, 0]
export const tilesValue = (c: Tiles) => c[0] + 10 * c[1] + 100 * c[2]
/** A number as its tidy tiles (each place 0–9). */
export const tilesOf = (n: number): Tiles => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10]
export const TILE_PLACES = ['ones', 'tens', 'hundreds']
export const TILE_VALUE = [1, 10, 100] as const

export const SM_W = 1200
export const SM_H = 760
export const SM_COL = 400
export const smColX = (place: number) => (2 - place) * SM_COL
const STEP = TILE + 8
const PER_ROW = 5
const ROWS = 8

/** Where the i-th tile of a place sits (top-left): rows of five; past forty, a second layer a little offset. */
export function tileAt(place: number, i: number): Pt {
  const k = i % (PER_ROW * ROWS)
  const layer = Math.floor(i / (PER_ROW * ROWS)) * 10
  return { x: smColX(place) + 22 + (k % PER_ROW) * STEP + layer, y: 90 + Math.floor(k / PER_ROW) * STEP + layer }
}

/** A tile's box for finding what a finger is over (generous: a finger is bigger than a tile's gap). */
export function tileBox(place: number, i: number) {
  const p = tileAt(place, i)
  const pad = 6
  return { x: p.x - pad, y: p.y - pad, w: TILE + pad * 2, h: TILE + pad * 2 }
}
