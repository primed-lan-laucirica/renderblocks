/** Where things sit on the Counting Table (Part 1's workshop). Pure. */
import { rng, type Pt } from '../engine/ease'

/** The pebble table, in its own units (a pebble is the kit's r = 22). */
export const TABLE_W = 800
export const TABLE_H = 560
/** Pebbles never closer than this (so each one can be touched). */
const APART = 74

export interface Region {
  x0: number
  y0: number
  x1: number
  y1: number
}
export const WHOLE: Region = { x0: 50, y0: 50, x1: TABLE_W - 50, y1: TABLE_H - 50 }
/** The match challenge: the sheep on the left, the child's pebbles on the right. */
export const LEFT: Region = { x0: 70, y0: 80, x1: 360, y1: TABLE_H - 60 }
export const RIGHT: Region = { x0: 460, y0: 60, x1: TABLE_W - 50, y1: TABLE_H - 50 }

/** A free spot for a new pebble in `r`: the first seeded candidate clear of every other. */
export function freeSpot(taken: Pt[], r: Region, seed = 7): Pt {
  const q = rng(seed)
  let best: Pt = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }
  let bestD = -1
  for (let k = 0; k < 400; k++) {
    const pt = { x: r.x0 + q() * (r.x1 - r.x0), y: r.y0 + q() * (r.y1 - r.y0) }
    const d = Math.min(Infinity, ...taken.map((o) => Math.hypot(o.x - pt.x, o.y - pt.y)))
    if (d > APART) return pt
    if (d > bestD) {
      best = pt
      bestD = d
    }
  }
  return best
}

/** A flock of n sheep in `r`, never touching (seeded). */
export function flock(n: number, seed: number, r: Region = LEFT): Pt[] {
  const q = rng(seed)
  const out: Pt[] = []
  for (let k = 0; out.length < n && k < 5000; k++) {
    const pt = { x: r.x0 + q() * (r.x1 - r.x0), y: r.y0 + q() * (r.y1 - r.y0) }
    if (out.every((o) => Math.abs(o.x - pt.x) > 120 || Math.abs(o.y - pt.y) > 80)) out.push(pt)
  }
  return out
}

/** The track: 0–10, `UNIT` apart, in a strip of its own. */
export const TRACK_W = 1100
export const TRACK_H = 300
export const TRACK_X0 = 70
export const TRACK_Y = 200
export const TRACK_UNIT = 96

/** The nearest whole number on the track to an x, kept to 0–10. */
export const nearest = (x: number) => Math.max(0, Math.min(10, Math.round((x - TRACK_X0) / TRACK_UNIT)))

/** "3 + 4 = 7" for rods laid end to end; one rod is just its number. */
export function rodSum(rods: number[]): string {
  const total = rods.reduce((s, n) => s + n, 0)
  if (rods.length === 0) return '0'
  if (rods.length === 1) return String(total)
  return `${rods.join(' + ')} = ${total}`
}

/** Six numerals for naming a pattern, in a fresh order. */
export function shuffled<T>(xs: T[], q: () => number = Math.random): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(q() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
