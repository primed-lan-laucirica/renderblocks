/**
 * The fade (Handwriting-MVP-spec.md): one dial per item, from a solid path
 * through thinning dots to flashes on a blank page. Pure, so it is unit
 * tested directly. Every number here is a starting value to tune with
 * Lan's feedback.
 */
import type { Poly, Pt } from './glyphs'

export interface FadeStep {
  phase: 'solid' | 'dots' | 'flash' | 'blank'
  /** An arrow showing which way the current stroke goes. */
  arrows?: boolean
  /** Dot spacing along the path (units); Infinity keeps only the shape-carrying dots. */
  spacing?: number
  /** Only the dot where each stroke starts. */
  startsOnly?: boolean
  /** Ink stays on the path, in stroke order and direction. */
  locked: boolean
  /** Flash: how long the pattern shows, and how often (0 = not on a timer), ms. */
  show?: number
  every?: number
  /** Flash once when the page opens. */
  onOpen?: boolean
  /** Flash when he stops writing for a while. */
  onStall?: boolean
  /** Only the baseline, no midline or headline. */
  baselineOnly?: boolean
}

export const FADE: FadeStep[] = [
  { phase: 'solid', arrows: true, locked: true },
  { phase: 'solid', locked: true },
  { phase: 'dots', spacing: 0.16, locked: true },
  { phase: 'dots', spacing: 0.3, locked: true },
  { phase: 'dots', spacing: 0.55, locked: false, onStall: true, show: 1500 },
  { phase: 'dots', spacing: 0.9, locked: false, onStall: true, show: 1500 },
  { phase: 'dots', spacing: Infinity, locked: false, onStall: true, show: 1500 },
  { phase: 'dots', startsOnly: true, locked: false, onStall: true, show: 1500 },
  { phase: 'flash', show: 2000, every: 4000, onOpen: true, onStall: true, locked: false },
  { phase: 'flash', show: 1500, every: 7000, onOpen: true, onStall: true, locked: false },
  { phase: 'flash', show: 1000, every: 10000, onOpen: true, onStall: true, locked: false },
  { phase: 'flash', show: 700, onOpen: true, onStall: true, locked: false },
  { phase: 'flash', show: 600, onOpen: true, locked: false },
  { phase: 'blank', locked: false },
  { phase: 'blank', baselineOnly: true, locked: false },
]

export const TOP = FADE.length - 1
/** Practice starts where Trace leaves off: the dotted path. The solid track is Trace's, never Practice's. */
export const PRACTICE_START = FADE.findIndex((s) => s.phase === 'dots')
/** Numbers start at start dots: he already writes them freehand. */
export const NUMBER_START = FADE.findIndex((s) => s.startsOnly)
/** Seconds of stillness before a stall flash, and before a page without a path is looked at. */
export const STALL_MS = 3000
export const FINISH_MS = 6000

// --- Dots --------------------------------------------------------------------------------------

/**
 * The dots for a stroke at a given spacing. The dots that carry the shape
 * are kept at every spacing: the start, the end, corners, and the tops,
 * bottoms and sides of curves. Straight runs lose theirs first.
 */
export function dots(p: Poly, spacing: number, startsOnly = false): Pt[] {
  if (p.dot || startsOnly) return [p.pts[0]]
  const keep = new Set<number>([0, p.pts.length - 1, ...landmarks(p)])
  if (Number.isFinite(spacing)) {
    const len = p.at[p.at.length - 1]
    const n = Math.max(1, Math.round(len / spacing))
    for (let k = 1; k < n; k++) keep.add(indexAt(p, (len * k) / n))
  }
  // Two kept dots almost on top of each other read as one blob: drop the later.
  const out: Pt[] = []
  for (const i of [...keep].sort((a, b) => a - b)) {
    const q = p.pts[i]
    if (!out.length || Math.hypot(q.x - out[out.length - 1].x, q.y - out[out.length - 1].y) > Math.min(0.12, spacing * 0.6)) out.push(q)
  }
  return out
}

function indexAt(p: Poly, s: number): number {
  let i = 0
  while (i < p.at.length - 1 && p.at[i] < s) i++
  return i
}

/** Indices where the shape turns: corners, and the extremes of curves. */
export function landmarks(p: Poly): number[] {
  const out: number[] = []
  const pts = p.pts
  const k = 3 // look a few samples either side
  for (let i = k; i < pts.length - k; i++) {
    const a = pts[i - k]
    const b = pts[i]
    const c = pts[i + k]
    const turn = angle(b.x - a.x, b.y - a.y, c.x - b.x, c.y - b.y)
    const corner = turn > 35
    // A curve's top, bottom or side: y (or x) stops rising and starts falling.
    const extremeY = (b.y - a.y) * (c.y - b.y) < 0 && Math.abs(b.y - a.y) + Math.abs(c.y - b.y) > 1e-4
    const extremeX = (b.x - a.x) * (c.x - b.x) < 0 && Math.abs(b.x - a.x) + Math.abs(c.x - b.x) > 1e-4
    if ((corner || extremeY || extremeX) && (!out.length || i - out[out.length - 1] > k * 2)) out.push(i)
  }
  return out
}

function angle(ax: number, ay: number, bx: number, by: number): number {
  const d = Math.hypot(ax, ay) * Math.hypot(bx, by)
  if (!d) return 0
  return (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / d))) * 180) / Math.PI
}

// --- Tracing a locked path -----------------------------------------------------------------

/** How far from the path a finger can be and still count (units; x-height is 1). */
export const TOLERANCE = 0.32
/** How far ahead along the path one move may jump (so a stroke can't be skipped). */
const AHEAD = 0.6
/** How far past where it got to a finger may rejoin a stroke. */
const REJOIN = 0.35
/** A stroke this close to finished counts as finished when the finger lifts. */
const NEARLY = 0.85

export interface Trace {
  stroke: number
  /** Distance along the current stroke reached so far. */
  progress: number
  /** The finger is following the path (inking). */
  engaged: boolean
  /** Where along the stroke the finger is now. */
  at: number
}

export const startTrace = (): Trace => ({ stroke: 0, progress: 0, engaged: false, at: 0 })

/** Nearest point on a stroke within [from, to] along it. */
function nearest(p: Poly, q: Pt, from: number, to: number): { s: number; d: number } {
  let best = { s: 0, d: Infinity }
  for (let i = 0; i < p.pts.length; i++) {
    if (p.at[i] < from || p.at[i] > to) continue
    const d = Math.hypot(p.pts[i].x - q.x, p.pts[i].y - q.y)
    if (d < best.d) best = { s: p.at[i], d }
  }
  return best
}

/**
 * Move the finger to q. Returns the new state and whether this point is ink
 * (on the path, in order). A stroke is joined only where it has got to (its
 * start, at first), and only moving along it in its direction carries it
 * on; a finger that wanders off just stops inking until it comes back to
 * where it left off. `tol` is how far off the path still counts (units).
 */
export function moveTrace(t: Trace, strokes: Poly[], q: Pt, tol = TOLERANCE): { t: Trace; ink: boolean } {
  if (t.stroke >= strokes.length) return { t, ink: false }
  const p = strokes[t.stroke]
  const next = (): Trace => ({ stroke: t.stroke + 1, progress: 0, engaged: false, at: 0 })
  if (p.dot) return Math.hypot(p.pts[0].x - q.x, p.pts[0].y - q.y) < tol * 1.3 ? { t: next(), ink: true } : { t, ink: false }
  const len = p.at[p.at.length - 1]
  if (!t.engaged) {
    // Join where the stroke has got to, or a little past it (a slip off and back).
    // Joining doesn't move it on; only moving forward from there does.
    const near = nearest(p, q, Math.max(0, t.progress - 0.3), t.progress + AHEAD)
    if (near.d > tol * 0.6 || near.s > t.progress + REJOIN) return { t, ink: false }
    return { t: { ...t, engaged: true, at: near.s }, ink: true }
  }
  // Follow the finger along the stroke from where it was.
  const near = nearest(p, q, Math.max(0, t.at - 0.2), t.at + AHEAD)
  if (near.d > tol) return { t: { ...t, engaged: false }, ink: false }
  // Only moving forward along the stroke carries it on.
  const progress = near.s >= t.at && near.s <= t.progress + AHEAD ? Math.max(t.progress, near.s) : t.progress
  if (progress >= len - 0.06) return { t: next(), ink: true }
  return { t: { stroke: t.stroke, progress, engaged: true, at: near.s }, ink: true }
}

/** The finger lifts: a stroke that was nearly done counts as done. */
export function liftTrace(t: Trace, strokes: Poly[]): Trace {
  const p = strokes[t.stroke]
  if (!p || p.dot) return { ...t, engaged: false }
  const len = p.at[p.at.length - 1]
  return t.progress >= len * NEARLY ? { stroke: t.stroke + 1, progress: 0, engaged: false, at: 0 } : { ...t, engaged: false }
}

export const traced = (t: Trace, strokes: Poly[]) => t.stroke >= strokes.length

// --- Writing without a full path -------------------------------------------------------------

/** How well his ink matches the shape: how much of the shape it covers, and how much of it is on the shape. */
export function overlap(strokes: Poly[], ink: Pt[][]): { cover: number; onShape: number } {
  const all = ink.flat()
  if (!all.length) return { cover: 0, onShape: 0 }
  const model: Pt[] = []
  for (const p of strokes) p.pts.forEach((q, i) => (i % 2 === 0 || p.dot) && model.push(q))
  const near = (q: Pt, set: Pt[], r: number) => set.some((m) => Math.abs(m.x - q.x) <= r && Math.abs(m.y - q.y) <= r && Math.hypot(m.x - q.x, m.y - q.y) <= r)
  const cover = model.filter((m) => near(m, all, 0.28)).length / model.length
  const onShape = all.filter((q) => near(q, model, 0.36)).length / all.length
  return { cover, onShape }
}

/** Lenient: most of the shape covered, and most of the ink on it. */
export const goodEnough = (o: { cover: number; onShape: number }) => o.cover >= 0.7 && o.onShape >= 0.65

// --- Moving along the dial ------------------------------------------------------------------

/** After a try: a clean one moves on a step, a struggle moves back a step, otherwise it stays. */
export function nextLevel(level: number, result: 'clean' | 'ok' | 'struggle', floor = 0): number {
  if (result === 'clean') return Math.min(TOP, level + 1)
  if (result === 'struggle') return Math.max(floor, level - 1)
  return level
}
