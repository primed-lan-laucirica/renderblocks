import { HORIZON, type Camera } from './camera'
import type { BlockShape } from './shapes'
import type { Block, Pose, Sim } from './sim'

/** Paths per block shape, built once: one fill per colour, so a 999 is ~10 fills, not 999. */
interface Paths {
  fills: Array<[string, Path2D]>
  outlines: Array<[string, Path2D]>
  silhouette: Path2D
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
  const silhouette = new Path2D()
  for (const r of shape.rects) silhouette.rect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h)
  p = { fills: [...fills], outlines: [...outlines], silhouette }
  pathCache.set(shape, p)
  return p
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

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
    const ey = s.h / 2 - eye * 1.7
    const xs = Math.abs(b.value) === 1 ? [0] : [-eye * 1.25, eye * 1.25]
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

  // Platform: a slab hanging in the air above the lava.
  const { x0, x1, depth } = sim.platform
  ctx.fillStyle = '#57534e'
  ctx.fillRect(x0, -depth, x1 - x0, depth)
  ctx.fillStyle = '#292524'
  ctx.fillRect(x0, -depth, x1 - x0, Math.min(depth * 0.35, 4 / zoom))
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
      for (const r of b.shape.rects) ctx.strokeRect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h)
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
