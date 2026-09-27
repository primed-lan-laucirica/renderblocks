import { getNumberBlockColor } from '@renderblocks/blocks/cubeLayout'
import type { Colour, Cube } from './world'

/**
 * Drawing (spec: the view). Looking down from in front and to the right,
 * about 60° above the table: each cube shows a top face (DEPTH deep on
 * screen), and strips of its front and right faces. A cube z layers up is
 * drawn LAYER × z higher and SHEAR × z to the left, which is what makes a
 * stack read as standing up. DEPTH : LAYER sets the camera's angle —
 * lower camera, shorter tops, taller fronts.
 * "World-screen" units: screen units at zoom 1, the projection applied.
 */
export const DEPTH = 0.85
export const LAYER = 0.5
export const SHEAR = 0.2

export interface View {
  /** World-screen point at the centre of the canvas. */
  cx: number
  cy: number
  /** Pixels per cube. */
  zoom: number
  /** Canvas size, CSS pixels. */
  w: number
  h: number
}

export const toScreen = (v: View, x: number, ys: number) => ({ x: (x - v.cx) * v.zoom + v.w / 2, y: (ys - v.cy) * v.zoom + v.h / 2 })
export const fromScreen = (v: View, sx: number, sy: number) => ({ x: (sx - v.w / 2) / v.zoom + v.cx, y: (sy - v.h / 2) / v.zoom + v.cy })

/** World-screen corner (back left) of a cube's top face. */
export const topX = (x: number, z: number) => x - (z + 1) * SHEAR
export const topY = (y: number, z: number) => y * DEPTH - (z + 1) * LAYER

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - amount))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

interface Paint {
  top: string
  front: string
  side: string
  edge: string
}

/** The basic Numberblocks palette: 1 red … 9 grey, 10 white with a red outline. */
export const PAINT: Record<Colour, Paint> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => {
    const c = i + 1
    const hex = getNumberBlockColor(c)
    return [
      c,
      c === 10
        ? { top: '#FFFFFF', front: '#D6D6D6', side: '#BDBDBD', edge: '#E00000' }
        : { top: hex, front: shade(hex, 0.28), side: shade(hex, 0.42), edge: shade(hex, 0.55) },
    ]
  }),
)

/** One cube, by its top face's back-left corner (world-screen): top, front and right faces. */
export function drawCube(ctx: CanvasRenderingContext2D, v: View, tx: number, ty: number, c: Colour, alpha = 1): void {
  const p = PAINT[c] ?? PAINT[1]
  const s = toScreen(v, tx, ty)
  const z = v.zoom
  const d = DEPTH * z // the top face's depth on screen
  const fx = SHEAR * z // the faces below the top lean right by this…
  const fy = LAYER * z // …and drop by this
  const edge = Math.max(1, z * 0.035)
  const quad = (pts: number[], fill: string) => {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.stroke()
  }
  ctx.globalAlpha = alpha
  ctx.lineWidth = edge
  ctx.lineJoin = 'round'
  ctx.strokeStyle = p.edge
  quad([s.x + z, s.y, s.x + z + fx, s.y + fy, s.x + z + fx, s.y + d + fy, s.x + z, s.y + d], p.side)
  quad([s.x, s.y + d, s.x + z, s.y + d, s.x + z + fx, s.y + d + fy, s.x + fx, s.y + d + fy], p.front)
  quad([s.x, s.y, s.x + z, s.y, s.x + z, s.y + d, s.x, s.y + d], p.top)
  // A soft highlight along the top face's back edge, like light on plastic.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillRect(s.x + edge, s.y + edge, z - 2 * edge, d * 0.1)
  ctx.globalAlpha = 1
}

/** Whether a world-screen point falls on the cube drawn with its top face at (tx, ty). */
export function onCube(px: number, py: number, tx: number, ty: number): boolean {
  // The outline is a convex hexagon: top face plus the front and right strips.
  const D = DEPTH
  const hex = [tx, ty, tx + 1, ty, tx + 1 + SHEAR, ty + LAYER, tx + 1 + SHEAR, ty + D + LAYER, tx + SHEAR, ty + D + LAYER, tx, ty + D]
  for (let i = 0; i < hex.length; i += 2) {
    const ax = hex[i]
    const ay = hex[i + 1]
    const bx = hex[(i + 2) % hex.length]
    const by = hex[(i + 3) % hex.length]
    if ((bx - ax) * (py - ay) - (by - ay) * (px - ax) < 0) return false
  }
  return true
}

/** Back to front: rows away from the viewer first, then upward. */
export const drawOrder = (a: Cube, b: Cube) => a.y - b.y || a.z - b.z || a.x - b.x

/** The table: warm wood planks, in world space so they move with the build. */
export function drawTable(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.fillStyle = '#7A4A26'
  ctx.fillRect(0, 0, v.w, v.h)
  const PLANK = 3
  const top = fromScreen(v, 0, 0).y
  const bottom = fromScreen(v, 0, v.h).y
  for (let k = Math.floor(top / PLANK); k * PLANK < bottom; k++) {
    const y0 = toScreen(v, 0, k * PLANK).y
    const y1 = toScreen(v, 0, (k + 1) * PLANK).y
    ctx.fillStyle = k % 3 === 0 ? '#80502A' : k % 3 === 1 ? '#744521' : '#7C4B25'
    ctx.fillRect(0, y0, v.w, y1 - y0)
    ctx.fillStyle = 'rgba(40, 20, 8, 0.45)'
    ctx.fillRect(0, y0, v.w, Math.max(1, v.zoom * 0.03))
  }
}
