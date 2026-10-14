/**
 * Drawing squares and rings in cell units (one block is 1 × 1, y up, the
 * bottom-left corner at 0, 0), in the Designer's Numberblock colours: the
 * biggest place at the bottom, tens pale, hundreds bright, sevens rainbows.
 * Small ones block by block; big ones as bands of colour with a grid that
 * fades as the blocks get too small to see. Faces, arms, legs and hats are
 * the Designer's, so a square wears his design for its number.
 */
import { drawBody, drawFeatures, PER_BLOCK } from '@renderblocks/designer/draw'
import { bandColour, bands, colourOf, type Band, type Shape } from '@renderblocks/designer/shapes'
import type { Look } from '@renderblocks/designer/look'

export const squareShape = (side: bigint): Shape => ({ kind: 'square', cols: side, rows: side, left: 0n })

/** A band's index ranges, split into its rainbow parts for a 7 (as the Designer draws them). */
function bandParts(b: Band): { start: number; count: number; fill: string; edge: string | null }[] {
  if (b.digit !== 7 || b.place === 0) return [{ start: Number(b.start), count: Number(b.count), ...bandColour(b, 0) }]
  const unit = 10 ** b.place
  return Array.from({ length: 7 }, (_, u) => ({ start: Number(b.start) + u * unit, count: unit, ...bandColour(b, u) }))
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A run of cells [start, start + count) laid row by row `cols` wide: up to three rectangles. */
function runRects(start: number, count: number, cols: number): Rect[] {
  const out: Rect[] = []
  let s = start
  let left = count
  if (s % cols !== 0 && left > 0) {
    const take = Math.min(left, cols - (s % cols))
    out.push({ x: s % cols, y: Math.floor(s / cols), w: take, h: 1 })
    s += take
    left -= take
  }
  const rows = Math.floor(left / cols)
  if (rows > 0) {
    out.push({ x: 0, y: s / cols, w: cols, h: rows })
    s += rows * cols
    left -= rows * cols
  }
  if (left > 0) out.push({ x: 0, y: s / cols, w: left, h: 1 })
  return out
}

/**
 * A ring's cells in order, row by row from the bottom, skipping the hole:
 * the rows under the hole, the rows beside it (each split in two), the rows
 * above. Returns the rectangles covering cells [start, end).
 */
export function ringRects(side: number, hole: number, start: number, end: number): Rect[] {
  const t = (side - hole) / 2
  const zones = [
    { from: 0, rows: t, cols: side, y: 0, split: false },
    { from: t * side, rows: hole, cols: 2 * t, y: t, split: true },
    { from: t * side + 2 * t * hole, rows: t, cols: side, y: t + hole, split: false },
  ]
  const out: Rect[] = []
  for (const z of zones) {
    const zEnd = z.from + z.rows * z.cols
    const s = Math.max(start, z.from)
    const e = Math.min(end, zEnd)
    if (e <= s) continue
    for (const r of runRects(s - z.from, e - s, z.cols)) {
      const y = r.y + z.y
      if (!z.split) out.push({ ...r, y })
      else {
        // Left of the hole as it is; right of it moved across the hole.
        if (r.x < t) out.push({ x: r.x, y, w: Math.min(r.w, t - r.x), h: r.h })
        if (r.x + r.w > t) {
          const x0 = Math.max(r.x, t)
          out.push({ x: x0 + hole, y, w: r.x + r.w - x0, h: r.h })
        }
      }
    }
  }
  return out
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, edge: string | null, px: number) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, 1, 1)
  if (px < 3) return
  ctx.lineWidth = Math.min(0.12, 2 / px)
  ctx.strokeStyle = edge ?? 'rgba(0,0,0,0.25)'
  ctx.strokeRect(x + 0.05, y + 0.05, 0.9, 0.9)
}

/** The outline of a ring (outer square, hole cut out), as a path for filling or clipping. */
function ringPath(ctx: CanvasRenderingContext2D, side: number, hole: number) {
  const t = (side - hole) / 2
  ctx.beginPath()
  ctx.rect(0, 0, side, side)
  ctx.rect(t, t, hole, hole)
}

/** A ring: its cells in the number's colours. `px` is pixels per block. */
export function drawRingBody(ctx: CanvasRenderingContext2D, n: bigint, side: number, hole: number, px: number) {
  const bs = bands(n)
  if (n <= BigInt(PER_BLOCK)) {
    for (const b of bs)
      for (const part of bandParts(b)) {
        // Block by block, each with its outline.
        for (const r of ringRects(side, hole, part.start, part.start + part.count))
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) block(ctx, x, y, part.fill, part.edge, px)
      }
    return
  }
  for (const b of bs)
    for (const part of bandParts(b)) {
      ctx.fillStyle = part.fill
      for (const r of ringRects(side, hole, part.start, part.start + part.count)) ctx.fillRect(r.x, r.y, r.w, r.h)
    }
  if (px >= 4) {
    ctx.save()
    ringPath(ctx, side, hole)
    ctx.clip('evenodd')
    ctx.lineWidth = 1.2 / px
    ctx.strokeStyle = `rgba(0,0,0,${Math.min(0.25, (px - 4) / 40)})`
    ctx.beginPath()
    for (let x = 1; x < side; x++) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, side)
    }
    for (let y = 1; y < side; y++) {
      ctx.moveTo(0, y)
      ctx.lineTo(side, y)
    }
    ctx.stroke()
    ctx.restore()
  }
}

/** Arms and legs are this share of a square's side at every size (the Designer's share from 5 blocks across). */
export const LIMB = 0.22

/**
 * Arms and legs in proportion: the Designer never makes them smaller than a
 * block, so on One they were as long as One is wide (Lan, Oct 14). Drawn for
 * a square at least 5 across, shrunk to fit, so they're LIMB of the side at
 * any size. Only beside and below the square (not over it, or over the face).
 */
function drawLimbs(ctx: CanvasRenderingContext2D, n: bigint, a: number, look: Look, wave: number) {
  const m = a >= 5 ? 1 : Math.ceil(5 / a)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-10 * a, -10 * a, 10 * a, 21 * a)
  ctx.rect(a, -10 * a, 10 * a, 21 * a)
  ctx.rect(0, -10 * a, a, 10 * a)
  ctx.clip()
  ctx.scale(1 / m, 1 / m)
  drawFeatures(ctx, n, squareShape(BigInt(a * m)), [], { ...look, hat: 'none' }, wave)
  ctx.restore()
}

/** A square's face, arms, legs and hat. */
function drawSquareFeatures(ctx: CanvasRenderingContext2D, n: bigint, side: bigint, look: Look, wave: number) {
  if (side >= 5n) return drawFeatures(ctx, n, squareShape(side), [], look, wave)
  drawLimbs(ctx, n, Number(side), look, wave)
  drawFeatures(ctx, n, squareShape(side), [], { ...look, arms: 'none', legs: 'none' }, wave)
}

/**
 * A ring's face, arms, legs and hat. The Designer puts a face as big as the
 * character on its top rows, which on a ring would sit over the hole; so the
 * face is drawn for the ring's top band alone, and the arms, legs and hat for
 * the whole square, outside it.
 */
function drawRingFeatures(ctx: CanvasRenderingContext2D, n: bigint, side: bigint, hole: bigint, look: Look, wave: number) {
  const a = Number(side)
  const t = Number(side - hole) / 2
  drawLimbs(ctx, n, a, look, wave)
  // The face (and hat) at the top: sized for the top band, but never smaller than about a sixth of the
  // ring, so a thin ring's face still shows (peeking over into the hole).
  const rows = Math.max(1, Math.round(Math.max(t, 0.55 * a)))
  ctx.save()
  ctx.translate(0, a - rows)
  drawFeatures(ctx, n, { kind: 'rectangle', cols: side, rows: BigInt(rows), left: 0n }, [], { ...look, arms: 'none', legs: 'none' }, wave)
  ctx.restore()
}

/**
 * A decimal piece (counted in tenths or hundredths, `k`), in its cells: it
 * wears the colours of `n` (0.36 is a small 36; a ring of 3 in hundredths is
 * 3, each of its blocks `per` cells), with a fine grid for the tenths and a
 * firmer line every ten of them, so a whole block or a tenth still shows.
 */
function drawDecimal(ctx: CanvasRenderingContext2D, n: bigint, per: number, side: number, hole: number, look: Look, px: number, wave: number) {
  const bs = bands(n)
  for (let v = 0; v < Number(n); v++) {
    const { fill } = colourOf(n, BigInt(v), bs)
    ctx.fillStyle = fill
    const rects = hole ? ringRects(side, hole, v * per, (v + 1) * per) : runRects(v * per, per, side)
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h)
  }
  ctx.save()
  if (hole) {
    ringPath(ctx, side, hole)
    ctx.clip('evenodd')
  }
  const lines = (every: number, alpha: number, width: number) => {
    if (alpha <= 0) return
    ctx.lineWidth = width / px
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`
    ctx.beginPath()
    for (let x = every; x < side; x += every) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, side)
    }
    for (let y = every; y < side; y += every) {
      ctx.moveTo(0, y)
      ctx.lineTo(side, y)
    }
    ctx.stroke()
  }
  lines(1, Math.min(0.2, (px - 3) / 30), 1)
  lines(10, 0.45, 2.5)
  ctx.restore()
  if (hole) ringPath(ctx, side, hole)
  else {
    ctx.beginPath()
    ctx.rect(0, 0, side, side)
  }
  ctx.lineWidth = 2 / px
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.stroke()
  if (hole) drawRingFeatures(ctx, n, BigInt(side), BigInt(hole), look, wave)
  else drawSquareFeatures(ctx, n, BigInt(side), look, wave)
}

/**
 * A whole piece in its cell units: a square or a ring, with its face. `k`:
 * counted in tenths or hundredths; `wears` is the number it looks like then.
 */
export function drawPiece(ctx: CanvasRenderingContext2D, n: bigint, side: bigint, hole: bigint, look: Look, px: number, wave = 0, k = 0, wears?: { n: bigint; per: number }) {
  if (k > 0 && wears) return drawDecimal(ctx, wears.n, wears.per, Number(side), Number(hole), look, px, wave)
  const a = Number(side)
  if (hole === 0n) drawBody(ctx, n, squareShape(side), [], px)
  else drawRingBody(ctx, n, a, Number(hole), px)
  // Big ones are bands of flat colour: an outline, so a pale one (a thousand is white) shows on any background.
  if (n > BigInt(PER_BLOCK)) {
    if (hole === 0n) {
      ctx.beginPath()
      ctx.rect(0, 0, a, a)
    } else ringPath(ctx, a, Number(hole))
    ctx.lineWidth = 1.5 / px
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.stroke()
  }
  if (hole === 0n) drawSquareFeatures(ctx, n, side, look, wave)
  else drawRingFeatures(ctx, n, side, hole, look, wave)
}
