/**
 * Drawing the chains' shapes: the Designer's Numberblock for the number, in
 * the shape it has here (a rectangle, a staircase, an L). In block units,
 * the bottom-left corner at 0, 0, y up. No legs: these stand on the floor
 * and on each other.
 */
import { drawBlocksAt, drawBody, drawFeatures } from '@renderblocks/designer/draw'
import type { Shape as Body } from '@renderblocks/designer/shapes'
import type { Look } from '@renderblocks/designer/look'
import { count, high, isRect, type Shape } from './chains'

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

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape, look: Look, px: number) {
  const n = BigInt(count(s))
  if (isRect(s)) {
    drawBody(ctx, n, bodyOf(s[0], s.length), [], px)
    return features(ctx, n, s[0], s.length, look)
  }
  // Block by block, column by column from the left, in the number's colours.
  drawBlocksAt(ctx, n, s.flatMap((h, x) => Array.from({ length: h }, (_, y) => ({ x, y }))), px)
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

/** A shape's outline as a path (for the dashed "this part will fly"), its bottom-left corner at x, y. */
export function outline(ctx: CanvasRenderingContext2D, s: Shape, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  s.forEach((h, i) => {
    ctx.lineTo(x + i, y + h)
    ctx.lineTo(x + i + 1, y + h)
  })
  ctx.lineTo(x + s.length, y)
  ctx.closePath()
}
