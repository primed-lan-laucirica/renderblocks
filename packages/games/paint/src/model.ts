/**
 * A drawing is a list of things he painted, bottom first: brush strokes and
 * shapes, each kept as itself (as in Excalidraw) so it can be moved, resized,
 * recoloured, filled or rubbed out later. World units are screen pixels at
 * zoom 1. Every random-looking texture comes from the thing's own seed, so it
 * looks the same each time it's drawn.
 */

export const TOOLS = ['pencil', 'marker', 'brush', 'crayon', 'water', 'spray', 'highlighter'] as const
export type Tool = (typeof TOOLS)[number]
export const SHAPES = ['rect', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'line', 'arrow'] as const
export type ShapeKind = (typeof SHAPES)[number]
export const FILLS = ['scribble', 'solid', 'wash'] as const
export type Fill = (typeof FILLS)[number]

/** Each supply's three widths (small, medium, big). */
export const WIDTHS: Record<Tool | 'shape', [number, number, number]> = {
  pencil: [2.5, 5, 9],
  marker: [6, 12, 24],
  brush: [10, 22, 44],
  crayon: [8, 16, 30],
  water: [18, 36, 70],
  spray: [24, 48, 96],
  highlighter: [16, 30, 56],
  shape: [3, 6, 12],
}

export interface Paint {
  id: string
  colour: string
  /** Line width, in world units. */
  size: number
  seed: number
  /** Painted inside (closed things only). */
  fill?: { style: Fill; colour: string }
}

export interface Stroke extends Paint {
  type: 'stroke'
  tool: Tool
  /** x, y, pressure (0–1, or 0.5 with no pen), ms since the stroke began: four numbers a point. */
  pts: number[]
}

export interface Shape extends Paint {
  type: 'shape'
  kind: ShapeKind
  /** Where his finger went down and where it is now. */
  x1: number
  y1: number
  x2: number
  y2: number
}

export type Thing = Stroke | Shape

export interface Drawing {
  id: string
  created: number
  updated: number
  /** The paper's colour (the bucket on empty paper paints it). */
  paper: string
  things: Thing[]
  /** A small picture for the gallery (a data URL). */
  thumb?: string
  /** Where he left the view: the world point at the top left, and the zoom. */
  view?: View
}

export interface View {
  x: number
  y: number
  z: number
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const PAPER = '#FFFDF7'

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
export const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export function newDrawing(): Drawing {
  const now = Date.now()
  return { id: newId(), created: now, updated: now, paper: PAPER, things: [] }
}

/** A small, fast, seeded random number generator (mulberry32): 0 ≤ r() < 1. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stroke's points as [x, y] pairs. */
export function xy(s: Stroke): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < s.pts.length; i += 4) out.push([s.pts[i], s.pts[i + 1]])
  return out
}

/** Spray paint spreads wider than the nozzle's size. */
const reach = (t: Thing) => (t.type === 'stroke' && t.tool === 'spray' ? t.size * 0.6 : t.size / 2)

export function bounds(t: Thing): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const pts: [number, number][] = t.type === 'stroke' ? xy(t) : (outline(t) ?? [[t.x1, t.y1], [t.x2, t.y2], ...(t.kind === 'arrow' ? arrowHead(t).flat() : [])])
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  const r = reach(t) + 2
  return { x: x0 - r, y: y0 - r, w: x1 - x0 + 2 * r, h: y1 - y0 + 2 * r }
}

export function union(boxes: Box[]): Box | null {
  if (!boxes.length) return null
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  const x1 = Math.max(...boxes.map((b) => b.x + b.w))
  const y1 = Math.max(...boxes.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Corners and where the first one sits (degrees, 0 = right, -90 = top): a pentagon point up, a hexagon and an octagon flat on top. */
const POLYGONS: Partial<Record<ShapeKind, [number, number]>> = { pentagon: [5, -90], hexagon: [6, 0], octagon: [8, 22.5] }

/** A regular polygon stretched to fill the box x0, y0 – x1, y1 (corner to corner, as he drags it). */
export function regular(n: number, start: number, x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const unit = Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 * i) / n) * Math.PI) / 180
    return [Math.cos(a), Math.sin(a)]
  })
  const ux0 = Math.min(...unit.map((p) => p[0]))
  const ux1 = Math.max(...unit.map((p) => p[0]))
  const uy0 = Math.min(...unit.map((p) => p[1]))
  const uy1 = Math.max(...unit.map((p) => p[1]))
  return unit.map(([x, y]) => [x0 + ((x - ux0) / (ux1 - ux0)) * (x1 - x0), y0 + ((y - uy0) / (uy1 - uy0)) * (y1 - y0)])
}

/** A shape's corners or curve, as a closed polygon (null for lines and arrows). */
export function shapeOutline(s: Shape): [number, number][] | null {
  const x0 = Math.min(s.x1, s.x2)
  const x1 = Math.max(s.x1, s.x2)
  const y0 = Math.min(s.y1, s.y2)
  const y1 = Math.max(s.y1, s.y2)
  if (s.kind === 'rect') return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  if (s.kind === 'triangle') return [[(x0 + x1) / 2, y0], [x1, y1], [x0, y1]]
  const poly = POLYGONS[s.kind]
  if (poly) return regular(poly[0], poly[1], x0, y0, x1, y1)
  if (s.kind === 'ellipse') {
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    return Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2
      return [cx + ((x1 - x0) / 2) * Math.cos(a), cy + ((y1 - y0) / 2) * Math.sin(a)] as [number, number]
    })
  }
  return null
}

const length = (pts: [number, number][]) => {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return l
}

/**
 * A closed thing's outline: a shape's, or a stroke whose ends meet (a circle
 * he drew round, ends within a fifth of its length or a few widths), so the
 * bucket can fill it. Spray and highlighter never count.
 */
export function outline(t: Thing): [number, number][] | null {
  if (t.type === 'shape') return shapeOutline(t)
  if (t.tool === 'spray' || t.tool === 'highlighter') return null
  const pts = xy(t)
  if (pts.length < 6) return null
  const l = length(pts)
  if (l < 60) return null
  const [a, b] = [pts[0], pts[pts.length - 1]]
  const gap = Math.hypot(a[0] - b[0], a[1] - b[1])
  return gap <= Math.max(0.2 * l, 3 * t.size) && gap <= 0.35 * l ? pts : null
}

export function inside(poly: [number, number][], x: number, y: number) {
  let yes = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) yes = !yes
  }
  return yes
}

export function area(poly: [number, number][]) {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
  return Math.abs(a / 2)
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l = dx * dx + dy * dy
  const u = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0
  return Math.hypot(px - ax - u * dx, py - ay - u * dy)
}

/** The lines a thing is drawn along (a shape's outline, a line, an arrow with its head). */
function lines(t: Thing): [number, number][][] {
  if (t.type === 'stroke') return [xy(t)]
  const o = shapeOutline(t)
  if (o) return [[...o, o[0]]]
  const main: [number, number][] = [[t.x1, t.y1], [t.x2, t.y2]]
  return t.kind === 'arrow' ? [main, ...arrowHead(t)] : [main]
}

/** An arrow's two barbs at its far end. */
export function arrowHead(s: Shape): [number, number][][] {
  const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
  const l = Math.min(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * 0.35, 30 + s.size * 3)
  return [-1, 1].map((side) => [
    [s.x2 - l * Math.cos(a + side * 0.5), s.y2 - l * Math.sin(a + side * 0.5)],
    [s.x2, s.y2],
  ])
}

/** Whether a touch at x, y (with slack `tol`) is on this thing: on its paint, or inside its fill. */
export function hits(t: Thing, x: number, y: number, tol: number) {
  const b = bounds(t)
  if (x < b.x - tol || x > b.x + b.w + tol || y < b.y - tol || y > b.y + b.h + tol) return false
  if (t.fill) {
    const o = outline(t)
    if (o && inside(o, x, y)) return true
  }
  const r = reach(t) + tol
  for (const l of lines(t)) {
    if (l.length === 1 && Math.hypot(x - l[0][0], y - l[0][1]) <= r) return true
    for (let i = 1; i < l.length; i++) if (segDist(x, y, l[i - 1][0], l[i - 1][1], l[i][0], l[i][1]) <= r) return true
  }
  return false
}

/** The topmost thing under x, y. */
export function topAt(things: Thing[], x: number, y: number, tol: number): Thing | null {
  for (let i = things.length - 1; i >= 0; i--) if (hits(things[i], x, y, tol)) return things[i]
  return null
}

/** What the bucket fills at x, y: the smallest closed thing round it (a circle inside a square fills the circle). */
export function fillTarget(things: Thing[], x: number, y: number): Thing | null {
  let best: Thing | null = null
  let bestArea = Infinity
  for (const t of things) {
    const o = outline(t)
    if (!o || !inside(o, x, y)) continue
    const a = area(o)
    if (a < bestArea) {
      best = t
      bestArea = a
    }
  }
  return best
}

/** Moved by dx, dy. */
export function moved<T extends Thing>(t: T, dx: number, dy: number): T {
  if (t.type === 'shape') return { ...t, x1: t.x1 + dx, y1: t.y1 + dy, x2: t.x2 + dx, y2: t.y2 + dy }
  const pts = t.pts.slice()
  for (let i = 0; i < pts.length; i += 4) {
    pts[i] += dx
    pts[i + 1] += dy
  }
  return { ...t, pts }
}

/** Grown by k about the point ax, ay (the paint's width grows with it). */
export function scaled<T extends Thing>(t: T, k: number, ax: number, ay: number): T {
  const size = Math.max(0.5, t.size * k)
  if (t.type === 'shape')
    return { ...t, size, x1: ax + (t.x1 - ax) * k, y1: ay + (t.y1 - ay) * k, x2: ax + (t.x2 - ax) * k, y2: ay + (t.y2 - ay) * k }
  const pts = t.pts.slice()
  for (let i = 0; i < pts.length; i += 4) {
    pts[i] = ax + (pts[i] - ax) * k
    pts[i + 1] = ay + (pts[i + 1] - ay) * k
  }
  return { ...t, size, pts }
}

/** What undo goes back through: the paper and the things on it. */
export interface Page {
  paper: string
  things: Thing[]
}

/**
 * Undo and redo: every change is a new page (the things themselves are
 * shared between pages, so this is cheap), the last 200 kept.
 */
export class History<T = Page> {
  private past: T[] = []
  private future: T[] = []
  now: T
  constructor(now: T) {
    this.now = now
  }

  push(next: T) {
    this.past.push(this.now)
    if (this.past.length > 200) this.past.shift()
    this.future = []
    this.now = next
  }
  undo() {
    const prev = this.past.pop()
    if (!prev) return false
    this.future.push(this.now)
    this.now = prev
    return true
  }
  redo() {
    const next = this.future.pop()
    if (!next) return false
    this.past.push(this.now)
    this.now = next
    return true
  }
  get canUndo() {
    return this.past.length > 0
  }
  get canRedo() {
    return this.future.length > 0
  }
}
