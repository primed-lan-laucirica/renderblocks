/**
 * Drawing the chains' shapes: the Designer's Numberblock for the number, in
 * the shape it has here (a rectangle, a staircase, an L). In block units,
 * the bottom-left corner at 0, 0, y up. No legs: these stand on the floor
 * and on each other.
 */
import { drawBlocksAt, drawBody, drawFeatures } from '@renderblocks/designer/draw'
import { colourOf, type Shape as Body } from '@renderblocks/designer/shapes'
import type { Look } from '@renderblocks/designer/look'
import { count, DEPTH, high, isRect, type Shape } from './chains'

const bodyOf = (rows: number, cols: number): Body => ({ kind: cols === 1 ? 'tower' : cols === rows ? 'square' : 'rectangle', cols: BigInt(cols), rows: BigInt(rows), left: 0n })

/** Face and arms for a rectangle of the character (the whole of it, or its tallest part). */
function features(ctx: CanvasRenderingContext2D, n: bigint, rows: number, cols: number, look: Look) {
  const s = bodyOf(rows, cols)
  if (Math.max(cols, rows) > 2 || look.arms === 'none') return drawFeatures(ctx, n, s, [], { ...look, legs: 'none' }, 0)
  // A little one's arms: the Designer never makes them shorter than a block, which on One is as long as
  // One is wide. Drawn for the shape twice the size and shrunk to fit, only beside it (as Sneeze² does).
  ctx.save()
  ctx.beginPath()
  ctx.rect(-10, -10, 10, 30)
  ctx.rect(cols, -10, 10, 30)
  ctx.clip()
  ctx.scale(0.5, 0.5)
  drawFeatures(ctx, n, { ...s, kind: 'rectangle', cols: s.cols * 2n, rows: s.rows * 2n }, [], { ...look, legs: 'none', hat: 'none' }, 0)
  ctx.restore()
  drawFeatures(ctx, n, s, [], { ...look, arms: 'none', legs: 'none' }, 0)
}

type Pt = [number, number]
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/**
 * A deep shape (the cubes chain), seen a little from above and from the
 * right: a cube, or a cube with a smaller one gone from its top right front
 * corner, so the floor and two walls that stay show. Drawn face by face, back
 * to front, in the colour of its number, each face ruled into its blocks.
 */
function drawDeep(ctx: CanvasRenderingContext2D, s: Shape, look: Look, px: number) {
  const n = s.length
  const t = s[n - 1]
  const out = n - t
  const N = BigInt(count(s))
  const { fill, edge } = colourOf(N, 0n)
  const grid = Math.min(0.35, (px - 3) / 20)
  /** A face p0 p1 p2 p3, `cu` blocks along p0→p1 and `cv` along p0→p3; `shade`: lighter above 0, darker below. */
  const face = (p: Pt[], cu: number, cv: number, shade: number) => {
    ctx.beginPath()
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    if (shade) {
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`
      ctx.fill()
    }
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2 / px
    ctx.strokeStyle = edge ?? 'rgba(0,0,0,0.5)'
    ctx.stroke()
    if (grid <= 0 || cu + cv > 2 * MOST_LINES) return
    ctx.beginPath()
    for (let i = 1; i < cu; i++) {
      ctx.moveTo(...lerp(p[0], p[1], i / cu))
      ctx.lineTo(...lerp(p[3], p[2], i / cu))
    }
    for (let j = 1; j < cv; j++) {
      ctx.moveTo(...lerp(p[0], p[3], j / cv))
      ctx.lineTo(...lerp(p[1], p[2], j / cv))
    }
    ctx.lineWidth = 1.2 / px
    // In its own edge colour (a ten's red), and dark as well, so the blocks show on a strong colour too.
    if (edge) {
      ctx.strokeStyle = edge
      ctx.globalAlpha = Math.min(1, grid * 2.5)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.strokeStyle = `rgba(0,0,0,${edge ? grid * 0.6 : grid})`
    ctx.stroke()
  }
  /** A box from x, y, z (z back from the front), w wide, h high and dz deep: its front, top and right faces. */
  const box = (x: number, y: number, z: number, w: number, h: number, dz: number) => {
    const [a, b] = [z * DEPTH, (z + dz) * DEPTH]
    face([[x + a, y + h + a], [x + w + a, y + h + a], [x + w + b, y + h + b], [x + b, y + h + b]], w, dz, 0.3)
    face([[x + w + a, y + a], [x + w + b, y + b], [x + w + b, y + h + b], [x + w + a, y + h + a]], dz, h, -0.2)
    face([[x + a, y + a], [x + w + a, y + a], [x + w + a, y + h + a], [x + a, y + h + a]], w, h, 0)
  }
  if (!out) box(0, 0, 0, n, n, n)
  else {
    // The back wall, then the left wall and the floor in front of it.
    box(0, 0, out, n, n, t)
    box(0, 0, 0, t, n, out)
    box(t, 0, 0, out, t, out)
  }
  // Its face on the front, at the top of what stands full height.
  const cols = out ? t : n
  const rows = Math.max(1, Math.min(n, cols))
  ctx.save()
  ctx.translate(0, n - rows)
  features(ctx, N, rows, cols, look)
  ctx.restore()
}

/** More blocks than this are not drawn one by one. */
const BLOCK_BY_BLOCK = 600
/** No more ruled lines than this across a shape (a big one seen close is mostly off the screen). */
const MOST_LINES = 400

function drawBig(ctx: CanvasRenderingContext2D, s: Shape, n: bigint, px: number) {
  const { fill, edge } = colourOf(n, 0n)
  outline(ctx, s, 0, 0, px)
  ctx.fillStyle = fill
  ctx.fill()
  const top = high(s)
  if (px >= 4 && s.length <= MOST_LINES && top <= MOST_LINES) {
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    for (let x = 1; x < s.length; x++) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, top)
    }
    for (let y = 1; y < top; y++) {
      ctx.moveTo(0, y)
      ctx.lineTo(s.length, y)
    }
    ctx.lineWidth = 1.2 / px
    ctx.strokeStyle = `rgba(0,0,0,${Math.min(0.25, (px - 4) / 40)})`
    ctx.stroke()
    ctx.restore()
    outline(ctx, s, 0, 0, px)
  }
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.5 / px
  ctx.strokeStyle = edge ?? 'rgba(0,0,0,0.35)'
  ctx.stroke()
}

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape, look: Look, px: number) {
  if (s.deep) return drawDeep(ctx, s, look, px)
  const n = BigInt(count(s))
  if (isRect(s)) {
    drawBody(ctx, n, bodyOf(s[0], s.length), [], px)
    // Too small for its blocks' own outlines: one round the whole, so a pale one (a thousand is white) still shows.
    if (px < 5) {
      ctx.lineWidth = 1.5 / px
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.strokeRect(0, 0, s.length, s[0])
    }
    return features(ctx, n, s[0], s.length, look)
  }
  // A big one (Lan, Nov 13: much higher numbers): its outline filled in its colour, ruled into blocks while they are big enough to see.
  if (count(s) > BLOCK_BY_BLOCK) drawBig(ctx, s, n, px)
  // Block by block, column by column from the left, in the number's colours.
  else drawBlocksAt(ctx, n, s.flatMap((h, x) => Array.from({ length: h }, (_, y) => ({ x, y }))), px)
  // The face goes at the top of its tallest columns.
  const top = high(s)
  const from = s.indexOf(top)
  let to = from
  while (s[to + 1] === top) to++
  const cols = to - from + 1
  const rows = Math.max(1, Math.min(top, cols))
  ctx.save()
  ctx.translate(from, top - rows)
  features(ctx, n, rows, cols, look)
  ctx.restore()
}

/**
 * A shape's outline as a path (for the dashed "this part will fly"), its
 * bottom-left corner at x, y. `px`: how big a block is drawn; steps smaller
 * than a pixel are taken several at a time (a staircase of ten thousand).
 */
export function outline(ctx: CanvasRenderingContext2D, s: Shape, x: number, y: number, px = 1) {
  const step = Math.max(1, Math.floor(1 / px))
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i < s.length; ) {
    let j = i + 1
    while (j < s.length && (s[j] === s[i] || j - i < step)) j++
    ctx.lineTo(x + i, y + s[i])
    ctx.lineTo(x + j, y + s[i])
    i = j
  }
  ctx.lineTo(x + s.length, y)
  ctx.closePath()
}
