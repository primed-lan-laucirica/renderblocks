import { HORIZON, type Camera } from './camera'
import type { BlockShape } from './shapes'
import type { Block, Pose, Sim } from './sim'

/** Paths per block shape, built once: one fill per colour, so a 999 is ~10 fills, not 999. */
interface Paths {
  fills: Array<[string, Path2D]>
  outlines: Array<[string, Path2D]>
  silhouette: Path2D
  /** Cube Club: each face's fill, and the grid of cubes on all three faces. */
  faces: Array<[string, Path2D]>
  faceGrid: Path2D | null
}

function polygon(pts: Array<{ x: number; y: number }>): Path2D {
  const p = new Path2D()
  pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)))
  p.closePath()
  return p
}

const pathCache = new WeakMap<BlockShape, Paths>()

function paths(shape: BlockShape): Paths {
  let p = pathCache.get(shape)
  if (p) return p
  const fills = new Map<string, Path2D>()
  const outlines = new Map<string, Path2D>()
  const inset = shape.cubeSize * 0.04
  for (const c of shape.cubes) {
    const x = c.cx - c.w / 2 + inset
    const y = c.cy - c.h / 2 + inset
    const w = c.w - 2 * inset
    const h = c.h - 2 * inset
    if (!fills.has(c.fill)) fills.set(c.fill, new Path2D())
    fills.get(c.fill)!.rect(x, y, w, h)
    if (c.outline) {
      if (!outlines.has(c.outline)) outlines.set(c.outline, new Path2D())
      outlines.get(c.outline)!.rect(x, y, w, h)
    }
  }
  let silhouette = new Path2D()
  if (shape.hull) silhouette = polygon(shape.hull)
  else for (const r of shape.rects) silhouette.rect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h)

  const faces: Array<[string, Path2D]> = []
  let faceGrid: Path2D | null = null
  if (shape.faces) {
    faceGrid = new Path2D()
    for (const f of shape.faces) {
      const { origin: o, u, v, cells } = f
      faces.push([f.fill, polygon([o, { x: o.x + u.x, y: o.y + u.y }, { x: o.x + u.x + v.x, y: o.y + u.y + v.y }, { x: o.x + v.x, y: o.y + v.y }])])
      for (let i = 0; i <= cells; i++) {
        const t = i / cells
        faceGrid.moveTo(o.x + u.x * t, o.y + u.y * t)
        faceGrid.lineTo(o.x + u.x * t + v.x, o.y + u.y * t + v.y)
        faceGrid.moveTo(o.x + v.x * t, o.y + v.y * t)
        faceGrid.lineTo(o.x + v.x * t + u.x, o.y + v.y * t + u.y)
      }
    }
  }
  p = { fills: [...fills], outlines: [...outlines], silhouette, faces, faceGrid }
  pathCache.set(shape, p)
  return p
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Index (² ₄ …) size relative to the base. */
const INDEX_SCALE = 0.6
/** Below this the notation is unreadable, so it is not drawn. */
const MARK_MIN_PX = 10
const MARK_MAX_PX = 110
/** Text widths per px of font size: base, and index (at INDEX_SCALE). */
const markWidths = new WeakMap<Block, { base: number; index: number }>()

/**
 * The block's notation (7², T₄, 10³, 2⁵) in its centre, turning with it:
 * as large as fits the block's mark box, white with a dark outline so it
 * reads over any cube colour, hidden when too small to read.
 */
function drawNotation(ctx: CanvasRenderingContext2D, b: Block, zoom: number): void {
  const n = b.notation!
  const index = n.sup ?? n.sub ?? ''
  let m = markWidths.get(b)
  if (!m) {
    ctx.font = '800 100px system-ui, sans-serif'
    const base = ctx.measureText(n.base).width / 100
    ctx.font = `800 ${100 * INDEX_SCALE}px system-ui, sans-serif`
    m = { base, index: ctx.measureText(index).width / 100 }
    markWidths.set(b, m)
  }
  const gap = 0.04
  const { mark } = b.shape
  const px = Math.min((mark.w * zoom) / (m.base + gap + m.index + 0.16), (mark.h * zoom) / 1.3, MARK_MAX_PX)
  if (px < MARK_MIN_PX) return

  ctx.save()
  ctx.translate(mark.x, mark.y)
  ctx.scale(1 / zoom, -1 / zoom) // to screen pixels, y down
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.fillStyle = '#fff'
  const x0 = (-(m.base + gap + m.index) * px) / 2
  ctx.font = `800 ${px}px system-ui, sans-serif`
  ctx.lineWidth = px * 0.16
  ctx.strokeText(n.base, x0, 0)
  ctx.fillText(n.base, x0, 0)
  const ipx = px * INDEX_SCALE
  const ix = x0 + (m.base + gap) * px
  const iy = n.sup ? -px * 0.36 : px * 0.3
  ctx.font = `800 ${ipx}px system-ui, sans-serif`
  ctx.lineWidth = ipx * 0.16
  ctx.strokeText(index, ix, iy)
  ctx.fillText(index, ix, iy)
  ctx.restore()
}

function pose(b: Block, alpha: number): Pose {
  // Blend the angle along the short way round.
  let da = b.cur.a - b.prev.a
  if (da > Math.PI) da -= 2 * Math.PI
  if (da < -Math.PI) da += 2 * Math.PI
  return { x: lerp(b.prev.x, b.cur.x, alpha), y: lerp(b.prev.y, b.cur.y, alpha), a: b.prev.a + da * alpha }
}

function drawBlock(ctx: CanvasRenderingContext2D, b: Block, p: Pose, zoom: number, now: number): void {
  const s = b.shape
  const pa = paths(s)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.a)

  if (s.kind === 'zero') {
    ctx.lineWidth = 0.12
    ctx.strokeStyle = s.body
    ctx.strokeRect(-0.44, -0.44, 0.88, 0.88)
  } else if (s.faces) {
    // Cube Club: top, side and front faces; the cubes' grid once it is big enough to see.
    for (const [color, path] of pa.faces) {
      ctx.fillStyle = color
      ctx.fill(path)
    }
    if (pa.faceGrid && s.cubeSize * zoom >= 4) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)'
      ctx.lineWidth = s.cubeSize * 0.06
      ctx.stroke(pa.faceGrid)
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)'
    ctx.lineWidth = Math.max(s.cubeSize * 0.08, 1.5 / zoom)
    ctx.stroke(pa.silhouette)
  } else if (s.cubeSize * zoom >= 4) {
    for (const [color, path] of pa.fills) {
      ctx.fillStyle = color
      ctx.fill(path)
    }
    ctx.lineWidth = s.cubeSize * 0.09
    for (const [color, path] of pa.outlines) {
      ctx.strokeStyle = color
      ctx.stroke(path)
    }
  } else {
    // Cubes smaller than 4 px: one solid shape (spec 5.2).
    ctx.fillStyle = s.body
    ctx.fill(pa.silhouette)
  }

  // Eyes near the top, like the Blocks game (1 has one).
  const eye = 0.16 * Math.max(1, s.cubeSize * (s.kind === 'grid' ? 2.5 : 1))
  if (eye * zoom >= 2 && s.kind !== 'zero') {
    const ey = s.eyeTop - eye * 1.7
    const xs = Math.abs(b.value) === 1 ? [s.eyeX] : [s.eyeX - eye * 1.25, s.eyeX + eye * 1.25]
    for (const ex of xs) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(ex, ey, eye * 0.8, eye, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(ex, ey - eye * 0.1, eye * 0.42, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (b.notation) drawNotation(ctx, b, zoom)

  // Into the lava: darken toward red over 0.6 s (spec 6).
  if (b.outAt !== null) {
    ctx.fillStyle = `rgba(90, 8, 0, ${Math.min(1, (now - b.outAt) / 0.6) * 0.85})`
    ctx.fill(pa.silhouette)
  }
  ctx.restore()
}

export interface DrawState {
  alpha: number
  now: number
  debug: boolean
  fps: number
  dpr: number
}

export function draw(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, st: DrawState): void {
  const { vw, vh, zoom } = cam
  const { dpr } = st

  // Sky.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const sky = ctx.createLinearGradient(0, 0, 0, vh * HORIZON)
  sky.addColorStop(0, '#1e1b4b')
  sky.addColorStop(1, '#7c2d12')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, vw, vh)

  // World: y up, platform top at HORIZON.
  ctx.setTransform(dpr * zoom, 0, 0, -dpr * zoom, dpr * (vw / 2 - cam.x * zoom), dpr * (vh * HORIZON + cam.y * zoom))
  const [left] = cam.toWorld(0, 0)
  const [right] = cam.toWorld(vw, 0)
  const bottom = cam.toWorld(0, vh)[1] - 1
  const visible = (p: Pose, b: Block) => p.x + b.shape.L * 1.5 > left && p.x - b.shape.L * 1.5 < right

  // Sinking blocks sit under the lava surface.
  for (const b of sim.blocks) {
    if (b.removed || b.outAt === null) continue
    const p = pose(b, st.alpha)
    if (visible(p, b)) drawBlock(ctx, b, p, zoom, st.now)
  }

  // Platform: slabs hanging in the air above the lava, with the cracks
  // between them showing where it will crumble.
  const { x0, x1, depth } = sim.platform
  ctx.fillStyle = '#57534e'
  ctx.fillRect(x0, -depth, x1 - x0, depth)
  ctx.fillStyle = '#292524'
  ctx.fillRect(x0, -depth, x1 - x0, Math.min(depth * 0.35, 4 / zoom))
  if (zoom * depth > 6) {
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.55)'
    ctx.lineWidth = 1.5 / zoom
    ctx.beginPath()
    for (const c of sim.cuts) {
      if (c <= x0 || c >= x1 || c < left || c > right) continue
      ctx.moveTo(c, 0)
      ctx.lineTo(c, -depth)
    }
    ctx.stroke()
  }

  // Broken-off slabs tumbling down.
  ctx.fillStyle = '#57534e'
  for (const r of sim.rubble) {
    if (r.x + r.w < left || r.x > right) continue
    ctx.save()
    ctx.translate(r.x + r.w / 2, r.y - depth / 2)
    ctx.rotate(r.a)
    ctx.fillRect(-r.w / 2, -depth / 2, r.w, depth)
    ctx.restore()
  }
  ctx.fillStyle = '#a8a29e'
  ctx.fillRect(x0, -Math.min(0.4, 6 / zoom), x1 - x0, Math.min(0.4, 6 / zoom))

  // Lava, with a slow shimmer on the surface.
  const lavaTop = sim.lavaY
  // Heat glow rising off the lava into the air gap.
  const glow = ctx.createLinearGradient(0, lavaTop, 0, lavaTop + (0 - lavaTop) * 0.6)
  glow.addColorStop(0, 'rgba(251, 146, 60, 0.45)')
  glow.addColorStop(1, 'rgba(251, 146, 60, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(left - 1, lavaTop, right - left + 2, (0 - lavaTop) * 0.6)
  ctx.fillStyle = 'rgba(234, 88, 12, 0.92)'
  ctx.fillRect(left - 1, bottom, right - left + 2, lavaTop - bottom)
  ctx.fillStyle = 'rgba(253, 186, 116, 0.9)'
  const band = Math.max(0.15, 4 / zoom)
  const wave = Math.sin(st.now * 2) * band * 0.3
  ctx.fillRect(left - 1, lavaTop - band + wave, right - left + 2, band)

  // Blocks in play.
  for (const b of sim.blocks) {
    if (b.removed || b.outAt !== null) continue
    const p = pose(b, st.alpha)
    if (visible(p, b)) drawBlock(ctx, b, p, zoom, st.now)
    if (st.debug) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.a)
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2 / zoom
      if (b.shape.hull) ctx.stroke(paths(b.shape).silhouette)
      else for (const r of b.shape.rects) ctx.strokeRect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h)
      ctx.restore()
    }
  }

  drawLabels(ctx, sim, cam, st)

  if (st.debug) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.fillText(`${Math.round(st.fps)} fps · zoom ${zoom.toFixed(1)} · ${cam.mode}`, 12, vh - 12)
  }
}

/** Largest label size; smaller when the block is narrower. */
const LABEL_MAX_PX = 26
/** Below this the number is unreadable, so it is not drawn. */
const LABEL_MIN_PX = 9
/** Text width per px of font size, per value. */
const labelWidth = new Map<number, number>()

/**
 * Each block's number sits just above it and is never wider than the block:
 * the font shrinks to the block's on-screen width, and below a readable
 * size the label is simply not drawn (zoomed right out, that is most of them).
 * Overlaps — rare, e.g. a block lying across another — go to the bigger block.
 */
function drawLabels(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, st: DrawState): void {
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.lineJoin = 'round'

  const items: Array<{ text: string; x: number; y: number; w: number; px: number; priority: number }> = []
  for (const b of sim.blocks) {
    if (b.removed || b.outAt !== null) continue
    const p = pose(b, st.alpha)
    const ext = 0.5 * (Math.abs(b.shape.w * Math.sin(p.a)) + Math.abs(b.shape.h * Math.cos(p.a)))
    const [x, y] = cam.toScreen(p.x, p.y + ext)
    if (x < -200 || x > cam.vw + 200) continue
    const text = b.value.toLocaleString('en-US')
    let perPx = labelWidth.get(b.value)
    if (perPx === undefined) {
      ctx.font = `800 100px system-ui, sans-serif`
      perPx = ctx.measureText(text).width / 100
      labelWidth.set(b.value, perPx)
    }
    // The outline stroke (0.2 × font size) counts toward the width too.
    const px = Math.min(LABEL_MAX_PX, (b.shape.w * cam.zoom) / (perPx + 0.2))
    if (px < LABEL_MIN_PX) continue
    const priority = b.shape.L / (1 + Math.abs(x - cam.vw / 2) / cam.vw)
    items.push({ text, x, y: y - 4, w: perPx * px, px, priority })
  }
  items.sort((a, b) => b.priority - a.priority)

  // Keep clear of the back button and the "N left" counter.
  const placed: Array<[number, number, number, number]> = [
    [0, 0, 130, 64],
    [cam.vw / 2 - 90, 0, cam.vw / 2 + 90, 64],
  ]
  for (const it of items) {
    const box: [number, number, number, number] = [it.x - it.w / 2, it.y - it.px, it.x + it.w / 2, it.y]
    if (placed.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue
    placed.push(box)
    ctx.font = `800 ${it.px}px system-ui, sans-serif`
    ctx.lineWidth = Math.max(2, it.px * 0.2)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.strokeText(it.text, it.x, it.y)
    ctx.fillStyle = '#fff'
    ctx.fillText(it.text, it.x, it.y)
  }
}
