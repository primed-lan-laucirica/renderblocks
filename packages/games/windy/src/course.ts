/**
 * The town, generated a chunk at a time as the characters travel right, the
 * same every time (seeded). Buildings with gaps down to the street, ramps,
 * bouncy awnings and seesaws; and windy stretches where the wind blows
 * hard. World units are blocks; the street is y = 0.
 */

export type Piece =
  | { kind: 'building'; x: number; w: number; h: number }
  | { kind: 'ramp'; x: number; w: number; h: number }
  | { kind: 'pad'; x: number; w: number; y: number }
  | { kind: 'seesaw'; x: number; len: number; y: number }

/** A windy stretch: extra wind (blocks/s) between x0 and x1. */
export interface Zone {
  x0: number
  x1: number
  strength: number
}

export const CHUNK = 80
/** The first rooftop, where the lineup stands. */
export const START = { x: -14, w: 34, h: 6 }

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Chunk i covers x from i·CHUNK to (i+1)·CHUNK (chunk 0 starts with the lineup's rooftop). */
export function chunk(i: number, seed = 14): { pieces: Piece[]; zones: Zone[] } {
  const r = rng(seed * 1009 + i * 7919)
  const pieces: Piece[] = []
  const zones: Zone[] = []
  const end = (i + 1) * CHUNK
  let x = i * CHUNK
  if (i === 0) {
    pieces.push({ kind: 'building', x: START.x, w: START.w, h: START.h })
    x = START.x + START.w
  }
  while (x < end - 4) {
    const roll = r()
    if (roll < 0.5) {
      // A gap down to the street, then a building.
      x += 3 + r() * 6
      const w = 6 + r() * 12
      const h = 3 + r() * 10
      if (x + w > end) break
      pieces.push({ kind: 'building', x, w, h })
      if (r() < 0.25) pieces.push({ kind: 'pad', x: x + w * 0.3, w: Math.min(4, w * 0.4), y: h })
      x += w
    } else if (roll < 0.68) {
      const w = 6 + r() * 6
      const h = 2 + r() * 3
      if (x + w > end) break
      pieces.push({ kind: 'ramp', x, w, h })
      x += w + 2
    } else if (roll < 0.84) {
      const len = 9 + r() * 4
      if (x + len + 2 > end) break
      pieces.push({ kind: 'seesaw', x: x + len / 2 + 1, len, y: 1.4 })
      x += len + 3
    } else {
      const w = 3 + r() * 3
      if (x + w + 2 > end) break
      pieces.push({ kind: 'pad', x: x + 1, w, y: 0 })
      x += w + 3
    }
  }
  // One or two windy stretches per chunk; the first always starts at the lineup's rooftop, to get everyone going.
  if (i === 0) zones.push({ x0: START.x - 4, x1: START.x + START.w + 14, strength: 7 })
  const n = 1 + Math.floor(r() * 2)
  for (let k = 0; k < n; k++) {
    const x0 = i * CHUNK + r() * (CHUNK - 25)
    zones.push({ x0, x1: x0 + 15 + r() * 25, strength: 6 + r() * 10 })
  }
  return { pieces, zones }
}

/** Where the start rooftop is, for lining up. */
export const startRoof = () => ({ x0: START.x + 2, x1: START.x + START.w - 2, y: START.h })
