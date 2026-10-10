/** Placing groups of things: seeded scatters, rows, shifts. Pure. */
import { lerp, type Pt } from './ease'
import { BEAD } from '../kit/sizes'

/** Ten loose spots in a scatter around (cx, cy) — seeded, so it's the same scatter every frame. */
export function scatter(cx: number, cy: number, n: number, seed: number, spread = 160): Pt[] {
  let s = seed >>> 0
  const q = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out: Pt[] = []
  while (out.length < n) {
    const p = { x: cx + (q() - 0.5) * spread * 2, y: cy + (q() - 0.5) * spread }
    if (out.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > BEAD * 1.8)) out.push(p)
  }
  return out
}

/** A row of n spots, `step` apart, starting at (x, y). */
export const row = (x: number, y: number, n: number, step: number): Pt[] => Array.from({ length: n }, (_, i) => ({ x: x + i * step, y }))

/** Lerp helper for scenes that move a group. */
export const shift = (pts: Pt[], dx: number, dy: number, k: number): Pt[] => pts.map((p) => ({ x: p.x + lerp(0, dx, k), y: p.y + lerp(0, dy, k) }))

