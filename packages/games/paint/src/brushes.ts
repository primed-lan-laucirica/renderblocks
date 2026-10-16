/**
 * How each art supply paints, on a canvas whose transform is world → device
 * pixels (no rotation). Pencil and crayon catch the paper's grain;
 * watercolour is see-through, bleeds a little at the edges and darkens where
 * it overlaps; the paintbrush is loaded with paint at the start of a stroke
 * and dries out along it, its bristles dropping out one by one; spray builds
 * up the longer he holds still.
 */
import { getStroke } from 'perfect-freehand'
import rough from 'roughjs'
import type { Drawable } from 'roughjs/bin/core'
import { arrowHead, bounds, outline, paperBase, rng, shapeOutline, type Box, type Page, type Shape, type Stroke, type Thing } from './model'

// --- Layers: some paint is drawn on its own sheet first, then laid on (see-through, blurred, multiplied).

let scratch: HTMLCanvasElement | null = null
let grainCanvas: HTMLCanvasElement | null = null

function sheet(w: number, h: number) {
  scratch ??= document.createElement('canvas')
  if (scratch.width < w || scratch.height < h) {
    scratch.width = Math.max(scratch.width, Math.ceil(w))
    scratch.height = Math.max(scratch.height, Math.ceil(h))
  }
  const l = scratch.getContext('2d')!
  l.setTransform(1, 0, 0, 1, 0, 0)
  l.globalAlpha = 1
  l.globalCompositeOperation = 'source-over'
  l.clearRect(0, 0, w, h)
  return { canvas: scratch, l }
}

interface Pass {
  alpha: number
  op?: GlobalCompositeOperation
  /** Blur, in world units. */
  blur?: number
}

/** Paint `draw` on its own sheet over `box`, then lay it on in each pass. */
function layer(ctx: CanvasRenderingContext2D, box: Box, draw: (l: CanvasRenderingContext2D) => void, passes: Pass[]) {
  const m = ctx.getTransform()
  const spread = Math.max(...passes.map((p) => p.blur ?? 0)) * 3 * m.a
  const x0 = Math.max(0, Math.floor(box.x * m.a + m.e - spread))
  const y0 = Math.max(0, Math.floor(box.y * m.d + m.f - spread))
  const x1 = Math.min(ctx.canvas.width, Math.ceil((box.x + box.w) * m.a + m.e + spread))
  const y1 = Math.min(ctx.canvas.height, Math.ceil((box.y + box.h) * m.d + m.f + spread))
  if (x1 <= x0 || y1 <= y0) return
  const w = x1 - x0
  const h = y1 - y0
  const { canvas, l } = sheet(w, h)
  l.setTransform(m.a, 0, 0, m.d, m.e - x0, m.f - y0)
  draw(l)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  for (const p of passes) {
    ctx.globalAlpha = p.alpha
    ctx.globalCompositeOperation = p.op ?? 'source-over'
    ctx.filter = p.blur ? `blur(${(p.blur * m.a).toFixed(2)}px)` : 'none'
    ctx.drawImage(canvas, 0, 0, w, h, x0, y0, w, h)
  }
  ctx.restore()
}

/** The paper's tooth: smooth noise, its high points opaque (where crayon skips). */
function grain() {
  if (grainCanvas) return grainCanvas
  const r = rng(7)
  const small = document.createElement('canvas')
  small.width = small.height = 64
  const s = small.getContext('2d')!
  const d = s.createImageData(64, 64)
  for (let i = 0; i < 64 * 64; i++) {
    const v = r() * 255
    d.data.set([v, v, v, 255], i * 4)
  }
  s.putImageData(d, 0, 0)
  const big = document.createElement('canvas')
  big.width = big.height = 256
  const b = big.getContext('2d')!
  b.imageSmoothingEnabled = true
  b.drawImage(small, 0, 0, 256, 256)
  // Fine speckle on top of the smooth hills.
  const img = b.getImageData(0, 0, 256, 256)
  for (let i = 0; i < 256 * 256; i++) {
    const v = img.data[i * 4] / 255 + (r() - 0.5) * 0.35
    img.data.set([0, 0, 0, Math.max(0, Math.min(255, (v - 0.5) * 3 * 255))], i * 4)
  }
  b.putImageData(img, 0, 0)
  grainCanvas = big
  return big
}

/** Rub the paper's grain out of what's on the sheet (`size`: world units a grain pixel; `strength` 0–1). */
function tooth(l: CanvasRenderingContext2D, box: Box, size: number, strength: number) {
  const p = l.createPattern(grain(), 'repeat')
  if (!p) return
  p.setTransform(new DOMMatrix([size, 0, 0, size, 0, 0]))
  l.save()
  l.globalCompositeOperation = 'destination-out'
  l.globalAlpha = strength
  l.fillStyle = p
  l.fillRect(box.x, box.y, box.w, box.h)
  l.restore()
}

/** The faint grain of the paper itself, over the paper colour (in view, world units). */
export function paperGrain(ctx: CanvasRenderingContext2D, box: Box) {
  const p = ctx.createPattern(grain(), 'repeat')
  if (!p) return
  p.setTransform(new DOMMatrix([0.6, 0, 0, 0.6, 0, 0]))
  ctx.save()
  ctx.globalAlpha = 0.035
  ctx.fillStyle = p
  ctx.fillRect(box.x, box.y, box.w, box.h)
  ctx.restore()
}

// --- Outlines.

function polyPath(pts: number[][], closed = true) {
  const p = new Path2D()
  if (!pts.length) return p
  p.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
  if (closed) p.closePath()
  return p
}

/** A smooth closed path through an outline (midpoint curves, as perfect-freehand suggests). */
function smoothPath(pts: number[][]) {
  const p = new Path2D()
  if (pts.length < 3) return polyPath(pts)
  p.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  p.closePath()
  return p
}

const hasPressure = (s: Stroke) => {
  for (let i = 2; i < s.pts.length; i += 4) if (s.pts[i] > 0) return true
  return false
}

/** The input for perfect-freehand: [x, y, pressure] (pressure only from a pen). */
function input(s: Stroke, upto = s.pts.length / 4) {
  const pen = hasPressure(s)
  const out: number[][] = []
  for (let i = 0; i < upto; i++) out.push(pen ? [s.pts[i * 4], s.pts[i * 4 + 1], s.pts[i * 4 + 2]] : [s.pts[i * 4], s.pts[i * 4 + 1]])
  return { out, pen }
}

function freehand(s: Stroke, o: { thinning: number; smoothing?: number; streamline?: number; taper?: number; upto?: number; size?: number }, done = true) {
  const { out, pen } = input(s, o.upto)
  const pts = getStroke(out, {
    size: o.size ?? s.size,
    thinning: o.thinning,
    smoothing: o.smoothing ?? 0.5,
    streamline: o.streamline ?? 0.4,
    simulatePressure: !pen && o.thinning > 0,
    start: { taper: o.taper ?? 0, cap: true },
    end: { taper: o.taper ?? 0, cap: true },
    last: done,
  })
  return smoothPath(pts)
}

// --- Colours.

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** Lighter (k > 0) or darker (k < 0). */
export function shade(hex: string, k: number) {
  const [r, g, b] = rgb(hex)
  const f = (c: number) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

// --- The supplies.

function pencil(ctx: CanvasRenderingContext2D, s: Stroke, done: boolean) {
  const path = freehand(s, { thinning: 0.25, smoothing: 0.4, streamline: 0.3, taper: 0.5 }, done)
  const b = bounds(s)
  layer(
    ctx,
    b,
    (l) => {
      l.fillStyle = shade(s.colour, -0.08)
      l.fill(path)
      tooth(l, b, 0.35, 0.6)
    },
    [{ alpha: 0.88 }],
  )
}

function marker(ctx: CanvasRenderingContext2D, s: Stroke, done: boolean) {
  ctx.fillStyle = s.colour
  ctx.fill(freehand(s, { thinning: 0, smoothing: 0.6, streamline: 0.45 }, done))
}

function crayon(ctx: CanvasRenderingContext2D, s: Stroke, done: boolean) {
  const path = freehand(s, { thinning: 0.1, smoothing: 0.25, streamline: 0.3 }, done)
  const b = bounds(s)
  layer(
    ctx,
    b,
    (l) => {
      l.fillStyle = s.colour
      l.fill(path)
      tooth(l, b, 0.9, 0.85)
    },
    [{ alpha: 0.95 }],
  )
}

function water(ctx: CanvasRenderingContext2D, s: Stroke, done: boolean) {
  const path = freehand(s, { thinning: 0.35, smoothing: 0.8, streamline: 0.5, taper: 0.3 }, done)
  wash(ctx, bounds(s), path, s.colour, s.size)
}

/** Watercolour over a path: a pale halo where it bled, the wash, its darker drying edge, and the paper's grain. */
function wash(ctx: CanvasRenderingContext2D, b: Box, path: Path2D, colour: string, size: number) {
  layer(
    ctx,
    b,
    (l) => {
      l.fillStyle = colour
      l.fill(path)
      l.strokeStyle = shade(colour, -0.35)
      l.lineWidth = Math.max(1, size * 0.06)
      l.globalAlpha = 0.5
      l.stroke(path)
      l.globalAlpha = 1
      tooth(l, b, 0.7, 0.25)
    },
    [
      { alpha: 0.14, op: 'multiply', blur: size * 0.3 },
      { alpha: 0.42, op: 'multiply', blur: Math.min(3, size * 0.05) },
    ],
  )
}

function highlighter(ctx: CanvasRenderingContext2D, s: Stroke) {
  const b = bounds(s)
  layer(
    ctx,
    b,
    (l) => {
      l.strokeStyle = s.colour
      l.lineWidth = s.size
      l.lineCap = 'butt'
      l.lineJoin = 'round'
      const pts: number[][] = []
      for (let i = 0; i < s.pts.length; i += 4) pts.push([s.pts[i], s.pts[i + 1]])
      if (pts.length === 1) pts.push([pts[0][0] + 0.5, pts[0][1]])
      l.stroke(polyPath(pts, false))
    },
    [{ alpha: 0.4, op: 'multiply' }],
  )
}

/** Spray: dots scattered round the nozzle, the same number a second however big (so it fills in at the same speed). */
function spray(ctx: CanvasRenderingContext2D, s: Stroke) {
  const r = rng(s.seed)
  const R = s.size * 0.5
  const dot = Math.max(0.8, s.size * 0.032)
  ctx.fillStyle = s.colour
  ctx.beginPath()
  let count = 0
  const n = s.pts.length / 4
  for (let i = 0; i < n && count < 30000; i++) {
    const x = s.pts[i * 4]
    const y = s.pts[i * 4 + 1]
    const px = i ? s.pts[i * 4 - 4] : x
    const py = i ? s.pts[i * 4 - 3] : y
    const dt = i ? Math.max(0, Math.min(120, s.pts[i * 4 + 3] - s.pts[i * 4 - 1])) : 30
    const dots = Math.round(dt * 1.4)
    for (let d = 0; d < dots; d++) {
      const u = r()
      // Gaussian round the nozzle (Box–Muller), cut off at its edge.
      const g = Math.min(1, Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * 0.42)
      const a = r() * Math.PI * 2
      ctx.rect(px + (x - px) * u + Math.cos(a) * g * R - dot / 2, py + (y - py) * u + Math.sin(a) * g * R - dot / 2, dot, dot)
    }
    count += dots
  }
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1
}

/**
 * The paintbrush. It holds this much paint: a stroke is wet for the first
 * stretch, then dries out, until only a few bristles still leave a mark.
 */
export const LOAD = (size: number) => 450 + size * 32

function brush(ctx: CanvasRenderingContext2D, s: Stroke, done: boolean) {
  const n = s.pts.length / 4
  const pen = hasPressure(s)
  // Along the stroke: how far, how wide (pressure, or slower = wider), and which way across.
  const dist = new Float64Array(n)
  const wide = new Float64Array(n)
  let speed = 0
  for (let i = 0; i < n; i++) {
    const dx = i ? s.pts[i * 4] - s.pts[i * 4 - 4] : 0
    const dy = i ? s.pts[i * 4 + 1] - s.pts[i * 4 - 3] : 0
    const step = Math.hypot(dx, dy)
    dist[i] = i ? dist[i - 1] + step : 0
    const dt = i ? Math.max(1, s.pts[i * 4 + 3] - s.pts[i * 4 - 1]) : 16
    speed = i ? speed * 0.7 + (step / dt) * 0.3 : 0
    wide[i] = pen ? 0.35 + 0.75 * s.pts[i * 4 + 2] : Math.max(0.5, Math.min(1, 1.1 - speed * 0.25))
  }
  const load = (i: number) => Math.max(0.12, 1 - dist[i] / LOAD(s.size))
  // The wet stretch: a solid body of paint, tapering off as the paint runs low.
  let wet = 0
  while (wet < n && load(wet) > 0.4) wet++
  if (wet > 1) {
    ctx.globalAlpha = 0.9
    ctx.fillStyle = s.colour
    ctx.fill(freehand(s, { thinning: 0.55, smoothing: 0.6, streamline: 0.4, taper: 0, upto: wet, size: s.size * 0.95 }, done || wet < n))
    ctx.globalAlpha = 1
  }
  // The bristles, each a streak a little lighter or darker; dry ones drop out first.
  const r = rng(s.seed)
  const N = Math.max(6, Math.min(18, Math.round(s.size / 2.5)))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let j = 0; j < N; j++) {
    const across = (j / (N - 1) - 0.5) * 0.72 + (r() - 0.5) * 0.04
    const dries = 0.12 + r() * 0.5
    ctx.strokeStyle = shade(s.colour, (r() - 0.5) * 0.3)
    ctx.lineWidth = (s.size * 1.3) / N
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    let on = false
    for (let i = 0; i < n; i++) {
      // Which way across the stroke here.
      const a = Math.max(0, i - 2)
      const b = Math.min(n - 1, i + 2)
      let nx = -(s.pts[b * 4 + 1] - s.pts[a * 4 + 1])
      let ny = s.pts[b * 4] - s.pts[a * 4]
      const l = Math.hypot(nx, ny) || 1
      nx /= l
      ny /= l
      const off = across * s.size * wide[i]
      const x = s.pts[i * 4] + nx * off
      const y = s.pts[i * 4 + 1] + ny * off
      if (load(i) < dries) {
        on = false
        continue
      }
      if (on) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      on = true
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// --- Fills and shapes.

const gen = rough.generator()
const shapeCache = new WeakMap<Shape, Drawable[]>()
const fillCache = new WeakMap<Thing, Drawable>()

function roughOpts(t: Thing) {
  return { stroke: t.colour, strokeWidth: t.size, roughness: 1.3, bowing: 1, seed: (t.seed % 2 ** 30) + 1, disableMultiStroke: t.size > 8 }
}

function drawRough(ctx: CanvasRenderingContext2D, d: Drawable) {
  for (const p of gen.toPaths(d)) {
    const path = new Path2D(p.d)
    if (p.fill && p.fill !== 'none') {
      ctx.fillStyle = p.fill
      ctx.fill(path)
    }
    if (p.stroke && p.stroke !== 'none') {
      ctx.strokeStyle = p.stroke
      ctx.lineWidth = p.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(path)
    }
  }
}

/** Paint inside a closed thing: scribbled (hand-hatched), solid, or a watercolour wash. */
function drawFill(ctx: CanvasRenderingContext2D, t: Thing) {
  const o = t.fill && outline(t)
  if (!t.fill || !o) return
  const { style, colour } = t.fill
  if (style === 'solid') {
    ctx.fillStyle = colour
    ctx.fill(smoothPath(o))
  } else if (style === 'wash') {
    wash(ctx, bounds(t), smoothPath(o), colour, Math.max(24, t.size * 2))
  } else {
    let d = fillCache.get(t)
    if (!d) {
      const w = Math.max(2, Math.min(5, t.size * 0.6))
      d = gen.polygon(o, { ...roughOpts(t), stroke: 'none', fill: colour, fillStyle: 'hachure', hachureGap: w * 3.2, fillWeight: w, hachureAngle: -41 })
      fillCache.set(t, d)
    }
    drawRough(ctx, d)
  }
}

function shapeDrawables(s: Shape): Drawable[] {
  let d = shapeCache.get(s)
  if (d) return d
  const o = roughOpts(s)
  const x = Math.min(s.x1, s.x2)
  const y = Math.min(s.y1, s.y2)
  const w = Math.abs(s.x2 - s.x1)
  const h = Math.abs(s.y2 - s.y1)
  if (s.kind === 'rect') d = [gen.rectangle(x, y, w, h, o)]
  else if (s.kind === 'ellipse') d = [gen.ellipse(x + w / 2, y + h / 2, w, h, o)]
  else if (s.kind !== 'line' && s.kind !== 'arrow') d = [gen.polygon(shapeOutline(s)!, o)]
  else
    d = [
      gen.line(s.x1, s.y1, s.x2, s.y2, o),
      ...(s.kind === 'arrow' ? arrowHead(s).map((b) => gen.linearPath(b, o)) : []),
    ]
  shapeCache.set(s, d)
  return d
}

/** One thing, its fill first. `done`: a finished stroke (still being painted, its end isn't capped yet). */
export function drawThing(ctx: CanvasRenderingContext2D, t: Thing, done = true) {
  drawFill(ctx, t)
  if (t.type === 'shape') {
    for (const d of shapeDrawables(t)) drawRough(ctx, d)
    return
  }
  if (!t.pts.length) return
  switch (t.tool) {
    case 'pencil':
      return pencil(ctx, t, done)
    case 'marker':
      return marker(ctx, t, done)
    case 'brush':
      return brush(ctx, t, done)
    case 'crayon':
      return crayon(ctx, t, done)
    case 'water':
      return water(ctx, t, done)
    case 'spray':
      return spray(ctx, t)
    case 'highlighter':
      return highlighter(ctx, t)
  }
}

/** Scribbles across the paper: hand-drawn hatching, every line's wobble from its own number, so it stays put as he pans. */
function scribblePaper(ctx: CanvasRenderingContext2D, colour: string, view: Box) {
  const GAP = 16
  const SEG = 60
  // Lines along (1, -t): x + y·t = k·GAP.
  const t = Math.tan((41 * Math.PI) / 180)
  const len = Math.hypot(1, t)
  const k0 = Math.floor(Math.min(view.x + view.y * t, view.x + (view.y + view.h) * t) / GAP) - 1
  const k1 = Math.ceil((view.x + view.w + (view.y + view.h) * t) / GAP) + 1
  ctx.save()
  ctx.strokeStyle = colour
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  for (let k = k0; k <= k1; k++) {
    // Walk the line down the view from top to bottom, in steps of SEG along y.
    const j0 = Math.floor(view.y / SEG) - 1
    const j1 = Math.ceil((view.y + view.h) / SEG) + 1
    for (let j = j0; j <= j1; j++) {
      const r = rng((k * 73856093) ^ (j * 19349663))
      const y = j * SEG
      const wob = (r() - 0.5) * 3
      const x = k * GAP - y * t + wob * (t / len)
      if (j === j0) ctx.moveTo(x, y + wob / len)
      else ctx.lineTo(x, y + wob / len)
    }
  }
  ctx.stroke()
  ctx.restore()
}

/** A watercolour wash over the whole paper: blotchy, darker in places, the paper's grain showing. */
function washPaper(ctx: CanvasRenderingContext2D, colour: string, view: Box) {
  layer(
    ctx,
    view,
    (l) => {
      l.fillStyle = colour
      l.fillRect(view.x, view.y, view.w, view.h)
      // Blotches: the grain blown up big, rubbed out softly.
      const p = l.createPattern(grain(), 'repeat')
      if (p) {
        p.setTransform(new DOMMatrix([9, 0, 0, 9, 0, 0]))
        l.globalCompositeOperation = 'destination-out'
        l.globalAlpha = 0.35
        l.fillStyle = p
        l.fillRect(view.x, view.y, view.w, view.h)
        l.globalAlpha = 1
        l.globalCompositeOperation = 'source-over'
      }
      tooth(l, view, 0.7, 0.3)
    },
    [{ alpha: 0.45, op: 'multiply' }],
  )
}

/** The paper and everything on it, the part `view` shows (world units). */
export function drawAll(ctx: CanvasRenderingContext2D, page: Page, things: Thing[], view: Box) {
  ctx.fillStyle = paperBase(page)
  ctx.fillRect(view.x, view.y, view.w, view.h)
  if (page.paperFill === 'scribble') scribblePaper(ctx, page.paper, view)
  else if (page.paperFill === 'wash') washPaper(ctx, page.paper, view)
  paperGrain(ctx, view)
  for (const t of things) {
    const b = bounds(t)
    if (b.x > view.x + view.w || b.y > view.y + view.h || b.x + b.w < view.x || b.y + b.h < view.y) continue
    drawThing(ctx, t)
  }
}
