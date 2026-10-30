/**
 * Everything a scene needs to move, as pure functions of t (seconds).
 * Scenes may use nothing else to animate: no timers, no clocks, no springs,
 * no unseeded randomness. Ported from scene.html.
 */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
/** 0 before a, 1 after b, linear between. */
export const p = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const smooth = (x: number) => {
  x = clamp(x)
  return x * x * (3 - 2 * x)
}
export const outBack = (x: number) => {
  x = clamp(x)
  const c = 1.6
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
}
export const outCubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x
/** A scene window: fades in over 0.6 s from a, out over 0.6 s to b. */
export const win = (t: number, a: number, b: number) => smooth(p(t, a, a + 0.6)) * (1 - smooth(p(t, b - 0.6, b)))
/** A seeded generator (same seed, same numbers, every time). */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
export interface Pt {
  x: number
  y: number
}
export const mix = (a: Pt, b: Pt, k: number): Pt => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) })
