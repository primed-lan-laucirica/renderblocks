import { getNumberBlockColor } from '@renderblocks/blocks/cubeLayout'
import { apply, cross, project, ray, type Camera, type Mat3, type Vec3 } from './camera'
import type { Colour, Cube } from './world'

/**
 * Drawing (spec: the view). Cubes are drawn face by face through the camera:
 * only faces turned toward the viewer, and never one pressed against a
 * neighbour. Faces are lit from above, a little from the front, so the
 * same cube reads the same way from any side.
 */

interface Face {
  n: Vec3
  u: Vec3
  v: Vec3
  /** Brightness under the fixed light. */
  light: number
}

export const FACES: Face[] = [
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], light: 1 },
  { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], light: 0.45 },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], light: 0.72 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], light: 0.55 },
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], light: 0.58 },
  { n: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], light: 0.64 },
]

function shade(hex: string, light: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.round(((n >> s) & 255) * light)
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

interface Paint {
  /** Fill per face, in FACES order. */
  faces: string[]
  edge: string
}

/** The basic Numberblocks palette: 1 red … 9 grey, 10 white with a red outline. */
export const PAINT: Record<Colour, Paint> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => {
    const c = i + 1
    const hex = c === 10 ? '#FFFFFF' : getNumberBlockColor(c)
    // White keeps its faces pale: its red outline carries it.
    const faces = FACES.map((f) => shade(hex, c === 10 ? 0.62 + 0.38 * f.light : f.light))
    return [c, { faces, edge: c === 10 ? '#E00000' : shade(hex, 0.45) }]
  }),
)

/**
 * A unit cube as seen through a camera: the faces turned to the viewer, as
 * corner offsets in pixels from the cube's centre. The same for every cube
 * in a frame, so it is worked out once.
 */
export interface CubeSprite {
  faces: Array<{ index: number; n: Vec3; pts: number[] }>
  zoom: number
}

export function cubeSprite(R: Mat3, zoom: number): CubeSprite {
  const faces: CubeSprite['faces'] = []
  FACES.forEach((f, index) => {
    if (apply(R, f.n)[2] <= 1e-6) return
    const pts: number[] = []
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = [0, 1, 2].map((i) => 0.5 * (f.n[i] + a * f.u[i] + b * f.v[i])) as Vec3
      const v = apply(R, corner)
      pts.push(v[0] * zoom, v[1] * zoom)
    }
    faces.push({ index, n: f.n, pts })
  })
  return { faces, zoom }
}

/** Draw one cube centred at screen (sx, sy); `hidden` says which faces touch a neighbour. */
export function drawCube(
  ctx: CanvasRenderingContext2D,
  sprite: CubeSprite,
  sx: number,
  sy: number,
  c: Colour,
  hidden?: (n: Vec3) => boolean,
  alpha = 1,
): void {
  const p = PAINT[c] ?? PAINT[1]
  ctx.globalAlpha = alpha
  ctx.lineWidth = Math.max(1, sprite.zoom * 0.035)
  ctx.lineJoin = 'round'
  ctx.strokeStyle = p.edge
  for (const f of sprite.faces) {
    if (hidden?.(f.n)) continue
    const q = f.pts
    ctx.beginPath()
    ctx.moveTo(sx + q[0], sy + q[1])
    ctx.lineTo(sx + q[2], sy + q[3])
    ctx.lineTo(sx + q[4], sy + q[5])
    ctx.lineTo(sx + q[6], sy + q[7])
    ctx.closePath()
    ctx.fillStyle = p.faces[f.index]
    ctx.fill()
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** Depth of a cube's centre: larger is nearer the viewer, so draw in increasing order. */
export const depthOf = (R: Mat3, c: Cube) => apply(R, [c.x + 0.5, c.y + 0.5, c.z + 0.5])[2]

/**
 * The table: warm wood planks in the plane z = 0, turning with the view.
 * Seen from underneath or edge-on it fades away and the build floats, so
 * its bottom can be seen.
 */
export function drawTable(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h)
  g.addColorStop(0, '#1e293b')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cam.w, cam.h)
  const above = apply(cam.R, [0, 0, 1])[2] // how squarely the table faces the viewer
  const alpha = Math.max(0, Math.min(1, (above - 0.12) / 0.3))
  if (alpha <= 0) return
  // Where the screen corners meet the table, to know which planks show.
  const onTable = (sx: number, sy: number) => {
    const r = ray(cam, sx, sy)
    const t = -r.o[2] / r.d[2]
    return [r.o[0] + r.d[0] * t, r.o[1] + r.d[1] * t]
  }
  const corners = [onTable(0, 0), onTable(cam.w, 0), onTable(0, cam.h), onTable(cam.w, cam.h)]
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  const x0 = Math.min(...xs) - 3
  const x1 = Math.max(...xs) + 3
  const PLANK = 3
  const k0 = Math.floor(Math.min(...ys) / PLANK)
  const k1 = Math.min(k0 + 400, Math.ceil(Math.max(...ys) / PLANK))
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#7A4A26'
  ctx.fillRect(0, 0, cam.w, cam.h)
  const seam = Math.max(1, cam.zoom * 0.03)
  for (let k = k0; k < k1; k++) {
    const quad = [
      [x0, k * PLANK],
      [x1, k * PLANK],
      [x1, (k + 1) * PLANK],
      [x0, (k + 1) * PLANK],
    ].map(([x, y]) => project(cam, [x, y, 0]))
    ctx.beginPath()
    quad.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    const m = ((k % 3) + 3) % 3
    ctx.fillStyle = m === 0 ? '#80502A' : m === 1 ? '#744521' : '#7C4B25'
    ctx.fill()
    ctx.strokeStyle = 'rgba(40, 20, 8, 0.45)'
    ctx.lineWidth = seam
    ctx.beginPath()
    ctx.moveTo(quad[0].x, quad[0].y)
    ctx.lineTo(quad[1].x, quad[1].y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** The orb's rings: one per axis, in the axis's colour. */
export const RINGS: Array<{ axis: Vec3; colour: string }> = [
  { axis: [1, 0, 0], colour: '#ef4444' },
  { axis: [0, 1, 0], colour: '#22c55e' },
  { axis: [0, 0, 1], colour: '#3b82f6' },
]

/** A point on ring `i` (a great circle round its axis), unit length. */
export function ringPoint(i: number, t: number): Vec3 {
  const a = RINGS[i].axis
  const u: Vec3 = a[2] ? [1, 0, 0] : [0, 0, 1]
  const v = cross(a, u)
  return [0, 1, 2].map((k) => Math.cos(t) * u[k] + Math.sin(t) * v[k]) as Vec3
}

/**
 * The view orb: a glass ball with the three axis rings, and a small cube in
 * the middle, all turned exactly as the table is — spin the ball, the
 * world spins with it.
 */
export function drawOrb(ctx: CanvasRenderingContext2D, R: Mat3, size: number, active: number | null): void {
  const r = size * 0.42
  const c = size / 2
  ctx.clearRect(0, 0, size, size)
  const glass = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r)
  glass.addColorStop(0, 'rgba(255,255,255,0.55)')
  glass.addColorStop(0.6, 'rgba(148,163,184,0.35)')
  glass.addColorStop(1, 'rgba(30,41,59,0.55)')
  const ring = (i: number, front: boolean) => {
    ctx.strokeStyle = RINGS[i].colour
    ctx.globalAlpha = front ? 1 : 0.3
    ctx.lineWidth = (active === i ? 0.16 : 0.09) * r * (front ? 1 : 0.6)
    ctx.lineCap = 'round'
    ctx.beginPath()
    let on = false
    for (let s = 0; s <= 96; s++) {
      const p = apply(R, ringPoint(i, (s / 96) * 2 * Math.PI))
      const x = c + p[0] * r
      const y = c + p[1] * r
      if (p[2] >= 0 === front) {
        if (on) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
        on = true
      } else on = false
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.fillStyle = glass
  ctx.fill()
  for (let i = 0; i < 3; i++) ring(i, false)
  drawCube(ctx, cubeSprite(R, r * 0.62), c, c, 3)
  for (let i = 0; i < 3; i++) ring(i, true)
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.stroke()
}
