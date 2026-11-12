/**
 * Drawing the road's shapes: the Designer's Numberblock for the number, in
 * the shape it has here (a tower, rows, a rectangle with leftovers on top).
 * In block units, the bottom-left corner of its full rows at 0, 0, y up.
 * No legs: these stand on the floor and on each other.
 */
import { drawBody, drawFeatures } from '@renderblocks/designer/draw'
import { startSlots, type Shape } from '@renderblocks/designer/shapes'
import type { Look } from '@renderblocks/designer/look'
import { count, type Block } from './ops'

export const shapeOf = (b: Block): Shape => ({
  kind: b.left ? 'nearly' : b.cols === 1 ? 'tower' : b.cols === b.rows ? 'square' : 'rectangle',
  cols: BigInt(b.cols),
  rows: BigInt(b.rows),
  left: BigInt(b.left),
})

export function drawBlock(ctx: CanvasRenderingContext2D, b: Block, look: Look, px: number) {
  const n = BigInt(count(b))
  const s = shapeOf(b)
  const leftovers = startSlots(s)
  drawBody(ctx, n, s, leftovers, px)
  if (Math.max(b.cols, b.rows) > 2 || look.arms === 'none') return drawFeatures(ctx, n, s, leftovers, { ...look, legs: 'none' }, 0)
  // A little one's arms: the Designer never makes them shorter than a block, which on One is as long as
  // One is wide. Drawn for the shape twice the size and shrunk to fit, only beside it (as Sneeze² does).
  ctx.save()
  ctx.beginPath()
  ctx.rect(-10, -10, 10, 30)
  ctx.rect(b.cols, -10, 10, 30)
  ctx.clip()
  ctx.scale(0.5, 0.5)
  drawFeatures(ctx, n, { ...s, kind: 'rectangle', cols: s.cols * 2n, rows: s.rows * 2n, left: 0n }, [], { ...look, legs: 'none', hat: 'none' }, 0)
  ctx.restore()
  drawFeatures(ctx, n, s, leftovers, { ...look, arms: 'none', legs: 'none' }, 0)
}
