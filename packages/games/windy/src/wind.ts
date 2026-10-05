/**
 * The wind: always a breeze to the right, much stronger in windy
 * stretches, gusting up and down over time, plus a big gust when the 🌬️
 * button is pressed. It pushes on whatever a character shows to it — a tall
 * tower catches far more than a flat slab — like real air drag.
 */
import type { Zone } from './course'

/** The everyday breeze (blocks/s). */
export const BREEZE = 6
/** Drag: force per unit of exposed height per (speed difference)². */
export const DRAG = 0.5
/** How strong a button gust is, and how quickly it dies away (s). */
export const GUST = 20
export const GUST_FADE = 1.6

/** Gusting: the wind rises and falls in overlapping waves (1 = average). */
export const gusting = (t: number) => 1 + 0.45 * Math.sin(0.8 * t) + 0.25 * Math.sin(2.1 * t + 1.3)

/** Wind speed at x and time t (blocks/s, to the right). `boost` is a button gust's strength now. */
export function windAt(x: number, t: number, zones: Zone[], boost = 0): number {
  let w = BREEZE
  for (const z of zones) {
    if (x < z.x0 || x > z.x1) continue
    // Ramps up and down at the ends of a windy stretch.
    const edge = Math.min(1, (x - z.x0) / 4, (z.x1 - x) / 4)
    w += z.strength * edge
  }
  return w * gusting(t) + boost
}

/** A button gust's strength `s` seconds after the press. */
export const gustNow = (s: number) => (s >= 0 && s < GUST_FADE * 3 ? GUST * Math.exp(-s / GUST_FADE) : 0)

/** The push on a body moving at vx, showing `height` to the wind: only when the wind is faster than it. */
export function push(wind: number, vx: number, height: number): number {
  const rel = wind - vx
  return rel > 0 ? DRAG * rel * rel * height : 0
}
