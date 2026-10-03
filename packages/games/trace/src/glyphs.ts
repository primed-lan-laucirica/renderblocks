/**
 * Our own upright print (Handwriting-MVP-spec.md: letter shapes), built from
 * straight lines and circles — no publisher's font. Each character is an
 * ordered list of strokes, each drawn from its start in its direction; that
 * one definition draws every step of the fade (solid path, arrows, dots,
 * start marks, flashes) and checks the tracing.
 *
 * Units: headline y = 0, midline y = 1, baseline y = 2, descender y = 3
 * (y grows downward). Angles are in degrees, counter-clockwise on screen.
 */

export interface Pt {
  x: number
  y: number
}

export type Seg =
  | { k: 'L'; a: Pt; b: Pt }
  /** Elliptical arc from angle `from` to `to` (to > from: counter-clockwise; to < from: clockwise). */
  | { k: 'A'; c: Pt; rx: number; ry: number; from: number; to: number }

/** A stroke is a path of joined segments, or a dot (the dot on i, a full stop). */
export type Stroke = { segs: Seg[] } | { dot: Pt }

export interface Glyph {
  /** Advance width. */
  w: number
  strokes: Stroke[]
}

export const HEADLINE = 0
export const MIDLINE = 1
export const BASELINE = 2
export const DESCENDER = 3

// --- A tiny drawing language -------------------------------------------------

const L = (x1: number, y1: number, x2: number, y2: number): Seg => ({ k: 'L', a: { x: x1, y: y1 }, b: { x: x2, y: y2 } })
const A = (cx: number, cy: number, r: number, from: number, to: number): Seg => ({ k: 'A', c: { x: cx, y: cy }, rx: r, ry: r, from, to })
const E = (cx: number, cy: number, rx: number, ry: number, from: number, to: number): Seg => ({ k: 'A', c: { x: cx, y: cy }, rx, ry, from, to })
/** A stroke through several points, joined by straight lines. */
const P = (...xy: number[]): Seg[] => {
  const segs: Seg[] = []
  for (let i = 2; i < xy.length; i += 2) segs.push(L(xy[i - 2], xy[i - 1], xy[i], xy[i + 1]))
  return segs
}
const S = (...segs: (Seg | Seg[])[]): Stroke => ({ segs: segs.flat() })
const D = (x: number, y: number): Stroke => ({ dot: { x, y } })
const G = (w: number, ...strokes: Stroke[]): Glyph => ({ w, strokes })

/** Where an arc is at angle θ (screen y grows down, so sin is subtracted). */
export const arcPoint = (s: Extract<Seg, { k: 'A' }>, deg: number): Pt => ({
  x: s.c.x + s.rx * Math.cos((deg * Math.PI) / 180),
  y: s.c.y - s.ry * Math.sin((deg * Math.PI) / 180),
})

// --- Lowercase: x-height circles of radius 0.5 between midline and baseline -----

const LOWER: Record<string, Glyph> = {
  a: G(1, S(A(0.5, 1.5, 0.5, 45, 405)), S(L(1, 1, 1, 2))),
  b: G(1, S(L(0, 0, 0, 2)), S(A(0.5, 1.5, 0.5, 180, -180))),
  c: G(1, S(A(0.5, 1.5, 0.5, 45, 315))),
  d: G(1, S(A(0.5, 1.5, 0.5, 45, 405)), S(L(1, 0, 1, 2))),
  e: G(1, S(L(0, 1.5, 1, 1.5), A(0.5, 1.5, 0.5, 0, 315))),
  f: G(1.1, S(A(0.75, 0.4, 0.35, 30, 180), L(0.4, 0.4, 0.4, 2)), S(L(0, 1, 0.85, 1))),
  g: G(1, S(A(0.5, 1.5, 0.5, 45, 405)), S(L(1, 1, 1, 2.6), A(0.6, 2.6, 0.4, 0, -160))),
  h: G(1, S(L(0, 0, 0, 2)), S(A(0.5, 1.5, 0.5, 180, 0), L(1, 1.5, 1, 2))),
  i: G(0.3, S(L(0.15, 1, 0.15, 2)), D(0.15, 0.5)),
  j: G(0.9, S(L(0.8, 1, 0.8, 2.6), A(0.4, 2.6, 0.4, 0, -160)), D(0.8, 0.5)),
  k: G(1, S(L(0, 0, 0, 2)), S(L(0.9, 1, 0.05, 1.55)), S(L(0.32, 1.38, 0.95, 2))),
  l: G(0.3, S(L(0.15, 0, 0.15, 2))),
  m: G(1.6, S(L(0, 1, 0, 2)), S(A(0.4, 1.4, 0.4, 180, 0), L(0.8, 1.4, 0.8, 2)), S(A(1.2, 1.4, 0.4, 180, 0), L(1.6, 1.4, 1.6, 2))),
  n: G(1, S(L(0, 1, 0, 2)), S(A(0.5, 1.5, 0.5, 180, 0), L(1, 1.5, 1, 2))),
  o: G(1, S(A(0.5, 1.5, 0.5, 90, 450))),
  p: G(1, S(L(0, 1, 0, 3)), S(A(0.5, 1.5, 0.5, 180, -180))),
  q: G(1, S(A(0.5, 1.5, 0.5, 45, 405)), S(L(1, 1, 1, 3))),
  r: G(0.85, S(L(0, 1, 0, 2)), S(A(0.5, 1.5, 0.5, 180, 45))),
  s: G(0.7, S(E(0.35, 1.25, 0.35, 0.25, 30, 270), E(0.35, 1.75, 0.35, 0.25, 90, -150))),
  t: G(0.8, S(L(0.4, 0.3, 0.4, 2)), S(L(0, 1, 0.8, 1))),
  u: G(1, S(L(0, 1, 0, 1.5), A(0.5, 1.5, 0.5, 180, 360), L(1, 1.5, 1, 1)), S(L(1, 1, 1, 2))),
  v: G(1, S(P(0, 1, 0.5, 2, 1, 1))),
  w: G(1.4, S(P(0, 1, 0.35, 2, 0.7, 1, 1.05, 2, 1.4, 1))),
  x: G(1, S(L(0, 1, 1, 2)), S(L(1, 1, 0, 2))),
  y: G(1, S(L(0, 1, 0.5, 2)), S(L(1, 1, 0, 3))),
  z: G(1, S(P(0, 1, 1, 1, 0, 2, 1, 2))),
}

// --- Capitals: two units tall, headline to baseline --------------------------------

const UPPER: Record<string, Glyph> = {
  A: G(1.6, S(L(0.8, 0, 0, 2)), S(L(0.8, 0, 1.6, 2)), S(L(0.28, 1.3, 1.32, 1.3))),
  B: G(1.2, S(L(0, 0, 0, 2)), S(L(0, 0, 0.6, 0), A(0.6, 0.5, 0.5, 90, -90), L(0.6, 1, 0, 1)), S(L(0, 1, 0.7, 1), A(0.7, 1.5, 0.5, 90, -90), L(0.7, 2, 0, 2))),
  C: G(2, S(A(1, 1, 1, 45, 315))),
  D: G(1.4, S(L(0, 0, 0, 2)), S(L(0, 0, 0.4, 0), A(0.4, 1, 1, 90, -90), L(0.4, 2, 0, 2))),
  E: G(1.2, S(L(0, 0, 0, 2)), S(L(0, 0, 1.2, 0)), S(L(0, 1, 1, 1)), S(L(0, 2, 1.2, 2))),
  F: G(1.2, S(L(0, 0, 0, 2)), S(L(0, 0, 1.2, 0)), S(L(0, 1, 1, 1))),
  G: G(2, S(A(1, 1, 1, 45, 360)), S(L(2, 1, 1.2, 1))),
  H: G(1.4, S(L(0, 0, 0, 2)), S(L(1.4, 0, 1.4, 2)), S(L(0, 1, 1.4, 1))),
  I: G(1, S(L(0.5, 0, 0.5, 2)), S(L(0, 0, 1, 0)), S(L(0, 2, 1, 2))),
  J: G(1.1, S(L(1, 0, 1, 1.5), A(0.5, 1.5, 0.5, 0, -180))),
  K: G(1.4, S(L(0, 0, 0, 2)), S(L(1.3, 0, 0, 1.1)), S(L(0.45, 0.85, 1.4, 2))),
  L: G(1.2, S(P(0, 0, 0, 2, 1.2, 2))),
  M: G(1.8, S(L(0, 0, 0, 2)), S(P(0, 0, 0.9, 1.4, 1.8, 0, 1.8, 2))),
  N: G(1.4, S(L(0, 0, 0, 2)), S(P(0, 0, 1.4, 2, 1.4, 0))),
  O: G(2, S(A(1, 1, 1, 90, 450))),
  P: G(1.2, S(L(0, 0, 0, 2)), S(L(0, 0, 0.6, 0), A(0.6, 0.5, 0.5, 90, -90), L(0.6, 1, 0, 1))),
  Q: G(2, S(A(1, 1, 1, 90, 450)), S(L(1.2, 1.3, 1.95, 2.05))),
  R: G(1.3, S(L(0, 0, 0, 2)), S(L(0, 0, 0.6, 0), A(0.6, 0.5, 0.5, 90, -90), L(0.6, 1, 0, 1)), S(L(0.5, 1, 1.25, 2))),
  S: G(1.2, S(A(0.6, 0.5, 0.5, 30, 270), A(0.6, 1.5, 0.5, 90, -150))),
  T: G(1.4, S(L(0.7, 0, 0.7, 2)), S(L(0, 0, 1.4, 0))),
  U: G(1.4, S(L(0, 0, 0, 1.3), A(0.7, 1.3, 0.7, 180, 360), L(1.4, 1.3, 1.4, 0))),
  V: G(1.6, S(P(0, 0, 0.8, 2, 1.6, 0))),
  W: G(2, S(P(0, 0, 0.5, 2, 1, 0, 1.5, 2, 2, 0))),
  X: G(1.4, S(L(0, 0, 1.4, 2)), S(L(1.4, 0, 0, 2))),
  Y: G(1.4, S(L(0, 0, 0.7, 1)), S(L(1.4, 0, 0.7, 1)), S(L(0.7, 1, 0.7, 2))),
  Z: G(1.4, S(P(0, 0, 1.4, 0, 0, 2, 1.4, 2))),
}

// --- Digits: two units tall ----------------------------------------------------------

const DIGITS: Record<string, Glyph> = {
  '0': G(1.2, S(E(0.6, 1, 0.6, 1, 90, 450))),
  '1': G(0.7, S(P(0.1, 0.35, 0.5, 0, 0.5, 2))),
  '2': G(1.2, S(A(0.6, 0.55, 0.55, 160, -40), L(1.02, 0.9, 0, 2), L(0, 2, 1.2, 2))),
  '3': G(1.1, S(A(0.55, 0.5, 0.5, 150, -90), A(0.55, 1.5, 0.5, 90, -150))),
  '4': G(1.3, S(P(0.9, 0, 0, 1.4, 1.3, 1.4)), S(L(1, 0, 1, 2))),
  '5': G(1.2, S(L(0.15, 0, 0.09, 1.01), A(0.55, 1.4, 0.6, 140, -150)), S(L(0.15, 0, 1.05, 0))),
  '6': G(1.25, S(A(1.45, 1.4, 1.4, 115, 180), A(0.65, 1.4, 0.6, 180, 540))),
  '7': G(1.2, S(P(0, 0, 1.2, 0, 0.4, 2))),
  '8': G(1.1, S(A(0.55, 0.5, 0.5, 30, 270), A(0.55, 1.5, 0.5, 90, -270), A(0.55, 0.5, 0.5, 270, 390))),
  '9': G(1.2, S(A(0.6, 0.6, 0.6, 20, 360), L(1.2, 0.6, 1.2, 2))),
}

// --- Punctuation, enough for short sentences and numbers -------------------------------

const MARKS: Record<string, Glyph> = {
  '.': G(0.3, D(0.15, 1.9)),
  ',': G(0.3, S(L(0.2, 1.85, 0.05, 2.35))),
  '!': G(0.3, S(L(0.15, 0, 0.15, 1.4)), D(0.15, 1.9)),
  '?': G(1, S(A(0.5, 0.5, 0.5, 160, -60), L(0.75, 0.93, 0.5, 1.15), L(0.5, 1.15, 0.5, 1.45)), D(0.5, 1.9)),
  "'": G(0.3, S(L(0.15, 0, 0.12, 0.5))),
  '-': G(0.8, S(L(0, 1.3, 0.8, 1.3))),
}

/** Every character we can draw. */
export const GLYPHS: Record<string, Glyph> = { ...LOWER, ...UPPER, ...DIGITS, ...MARKS }

/** The gap between letters, and a space. */
export const LETTER_GAP = 0.4
export const SPACE = 0.9

// --- Shapes and warm-up strokes, each its own page --------------------------------------

export const SHAPES: Record<string, Glyph> = {
  'line down': G(0.4, S(L(0.2, 0, 0.2, 2))),
  'line across': G(2.4, S(L(0, 1, 2.4, 1))),
  slant: G(1.6, S(L(0, 0, 1.6, 2))),
  zigzag: G(4, S(P(0, 2, 0.5, 0, 1, 2, 1.5, 0, 2, 2, 2.5, 0, 3, 2, 3.5, 0, 4, 2))),
  wave: G(4, S(A(0.5, 1, 0.5, 180, 0), A(1.5, 1, 0.5, 180, 360), A(2.5, 1, 0.5, 180, 0), A(3.5, 1, 0.5, 180, 360))),
  loop: G(3.4, S(A(0.5, 1.2, 0.5, 270, 630), L(0.5, 1.7, 1.7, 1.7), A(1.7, 1.2, 0.5, 270, 630), L(1.7, 1.7, 2.9, 1.7), A(2.9, 1.2, 0.5, 270, 630))),
  circle: G(2, S(A(1, 1, 1, 90, 450))),
  square: G(2, S(P(0, 0, 0, 2, 2, 2, 2, 0, 0, 0))),
  triangle: G(2.2, S(P(1.1, 0, 0, 2, 2.2, 2, 1.1, 0))),
  star: G(2.1, S(P(0.4, 2, 1.05, 0, 1.7, 2, 0, 0.76, 2.1, 0.76, 0.4, 2))),
}

// --- Sampling ------------------------------------------------------------------------------------

/** A stroke as a dense polyline, with the distance along it at each point. */
export interface Poly {
  pts: Pt[]
  /** Arc length at each point; at[last] is the stroke's length. */
  at: number[]
  /** A dot: tap it rather than trace it. */
  dot: boolean
}

const STEP = 0.03

function sampleSeg(s: Seg): Pt[] {
  if (s.k === 'L') {
    const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / STEP))
    return Array.from({ length: n + 1 }, (_, i) => ({ x: s.a.x + ((s.b.x - s.a.x) * i) / n, y: s.a.y + ((s.b.y - s.a.y) * i) / n }))
  }
  const span = Math.abs(s.to - s.from)
  const n = Math.max(2, Math.ceil(((span / 180) * Math.PI * Math.max(s.rx, s.ry)) / STEP))
  return Array.from({ length: n + 1 }, (_, i) => arcPoint(s, s.from + ((s.to - s.from) * i) / n))
}

export function sample(stroke: Stroke, dx = 0, dy = 0): Poly {
  if ('dot' in stroke) return { pts: [{ x: stroke.dot.x + dx, y: stroke.dot.y + dy }], at: [0], dot: true }
  const pts: Pt[] = []
  for (const seg of stroke.segs) {
    const p = sampleSeg(seg)
    for (const q of pts.length ? p.slice(1) : p) pts.push({ x: q.x + dx, y: q.y + dy })
  }
  const at = [0]
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { pts, at, dot: false }
}

// --- Laying out a page ------------------------------------------------------------------------

/** One traced character on the page, positioned. */
export interface Placed {
  ch: string
  x: number
  /** Top of its line (its headline). */
  y: number
  polys: Poly[]
}

export interface Layout {
  chars: Placed[]
  /** All strokes in writing order (character by character). */
  strokes: Poly[]
  width: number
  /** Number of lines; each is LINE_HEIGHT tall. */
  lines: number
  /** Where each line starts (its headline y). */
  lineTops: number[]
  /** Whether any character reaches above the midline (so the headline is drawn). */
  tall: boolean
  /** Whether any character drops below the baseline. */
  deep: boolean
}

export const LINE_HEIGHT = 3.6

/** Characters we can't draw are skipped (the voice still says the whole thing). */
export function layout(text: string, maxWidth = 16, shape?: string): Layout {
  if (shape) {
    const g = SHAPES[shape]
    const polys = g.strokes.map((s) => sample(s))
    return { chars: [{ ch: shape, x: 0, y: 0, polys }], strokes: polys, width: g.w, lines: 1, lineTops: [0], tall: true, deep: false }
  }
  const words = text.split(/\s+/).filter(Boolean)
  const wordWidth = (w: string) => [...w].reduce((sum, ch, i) => sum + (GLYPHS[ch]?.w ?? 0) + (i ? LETTER_GAP : 0), 0)
  // Wrap words into lines no wider than maxWidth.
  const rows: string[][] = [[]]
  let used = 0
  for (const w of words) {
    const ww = wordWidth(w)
    if (rows[rows.length - 1].length && used + SPACE + ww > maxWidth) {
      rows.push([])
      used = 0
    }
    used += (rows[rows.length - 1].length ? SPACE : 0) + ww
    rows[rows.length - 1].push(w)
  }
  const chars: Placed[] = []
  let width = 0
  rows.forEach((row, line) => {
    let x = 0
    const y = line * LINE_HEIGHT
    row.forEach((w, wi) => {
      if (wi) x += SPACE
      ;[...w].forEach((ch, ci) => {
        const g = GLYPHS[ch]
        if (!g) return
        if (ci) x += LETTER_GAP
        chars.push({ ch, x, y, polys: g.strokes.map((s) => sample(s, x, y)) })
        x += g.w
      })
    })
    width = Math.max(width, x)
  })
  const tall = chars.some((c) => c.polys.some((p) => p.pts.some((q) => q.y - c.y < MIDLINE - 0.05)))
  const deep = chars.some((c) => c.polys.some((p) => p.pts.some((q) => q.y - c.y > BASELINE + 0.05)))
  return { chars, strokes: chars.flatMap((c) => c.polys), width, lines: rows.length, lineTops: rows.map((_, i) => i * LINE_HEIGHT), tall, deep }
}
