/**
 * Drawing Fourteen and his board on a 2D canvas, in world units (his
 * blocks, y up). Fourteen: a 2 × 7 stack — ten white red-edged blocks under
 * four lime green — with rainbow eyebrows (he's a double Seven), a striped
 * green helmet, and a rainbow board on red wheels that splits in two. On
 * foot he runs with the board under his arm. Not a copy of any official
 * artwork: drawn from blocks.
 */
import type { Rider } from './rider'

export const RAINBOW = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#6366F1', '#A855F7']

function block(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, edge: string) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, 1, 1)
  ctx.lineWidth = 0.08
  ctx.strokeStyle = edge
  ctx.strokeRect(x + 0.04, y + 0.04, 0.92, 0.92)
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, look: number, size = 1) {
  ctx.beginPath()
  ctx.ellipse(x, y, 0.27 * size, 0.36 * size, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.lineWidth = 0.06
  ctx.strokeStyle = '#111827'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + look * 0.09 * size, y - 0.03, 0.14 * size, 0, Math.PI * 2)
  ctx.fillStyle = '#111827'
  ctx.fill()
}

function rainbowBrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  RAINBOW.forEach((c, i) => {
    ctx.beginPath()
    ctx.moveTo(x - 0.3 + i * 0.086, y + 0.06 * Math.sin((i / 6) * Math.PI))
    ctx.lineTo(x - 0.3 + (i + 1) * 0.086, y + 0.06 * Math.sin(((i + 1) / 6) * Math.PI))
    ctx.lineWidth = 0.13
    ctx.strokeStyle = c
    ctx.stroke()
  })
}

function smile(ctx: CanvasRenderingContext2D, x: number, y: number, r = 0.32) {
  ctx.beginPath()
  ctx.arc(x, y + r * 0.6, r, Math.PI * 1.15, Math.PI * 1.85)
  ctx.lineWidth = 0.09
  ctx.strokeStyle = '#111827'
  ctx.lineCap = 'round'
  ctx.stroke()
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineWidth = 0.3
  ctx.lineCap = 'round'
  ctx.strokeStyle = colour
  ctx.stroke()
}

/** The board, its top at y = 0.75 above the surface; `flip` turns it about its long axis (in flips). */
function board(ctx: CanvasRenderingContext2D, x0: number, x1: number, flip: number) {
  const c = Math.cos(flip * Math.PI * 2)
  ctx.save()
  ctx.translate(0, 0.62)
  ctx.scale(1, c === 0 ? 0.001 : c)
  // Deck: grip on top, rainbow underneath (the side that shows mid-flip).
  const up = c >= 0
  if (up) {
    ctx.fillStyle = '#1F2937'
    ctx.fillRect(x0, -0.06, x1 - x0, 0.18)
  } else {
    RAINBOW.forEach((col, i) => {
      ctx.fillStyle = col
      ctx.fillRect(x0 + ((x1 - x0) * i) / 7, -0.06, (x1 - x0) / 7 + 0.01, 0.18)
    })
  }
  // Rainbow stripe along the edge, red wheels underneath.
  RAINBOW.forEach((col, i) => {
    ctx.fillStyle = col
    ctx.fillRect(x0 + ((x1 - x0) * i) / 7, -0.12, (x1 - x0) / 7 + 0.01, 0.07)
  })
  for (const wx of [x0 + 0.5, x1 - 0.5]) {
    ctx.beginPath()
    ctx.arc(wx, -0.36, 0.24, 0, Math.PI * 2)
    ctx.fillStyle = '#DC2626'
    ctx.fill()
  }
  ctx.restore()
}

/** His blocks, face and helmet (the bottom of his blocks at y = 0.25). */
function blocks(ctx: CanvasRenderingContext2D, look: number) {
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 2; col++) {
      const lime = row >= 5
      block(ctx, col - 1, row + 0.25, lime ? '#A3E635' : '#FFFFFF', lime ? '#4D7C0F' : '#EF4444')
    }
  // Face on the four: eyes, rainbow eyebrows, a grin.
  eye(ctx, -0.45, 6.55, look)
  eye(ctx, 0.45, 6.55, look)
  rainbowBrow(ctx, -0.45, 7.05)
  rainbowBrow(ctx, 0.45, 7.05)
  smile(ctx, 0, 5.75)
  // Helmet: dark green with a neon stripe.
  ctx.beginPath()
  ctx.arc(0, 7.25, 1.08, 0, Math.PI)
  ctx.fillStyle = '#166534'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 7.25, 0.78, 0.15, Math.PI - 0.15)
  ctx.lineWidth = 0.16
  ctx.strokeStyle = '#4ADE80'
  ctx.stroke()
}

/** On foot, his feet at y = 0: running (legs and free arm swinging), leaping (legs tucked) or climbing (hand over hand), the board under his arm. */
export function drawRunner(ctx: CanvasRenderingContext2D, k: Rider) {
  const leg = k.legs[0]
  const ph = k.stride * Math.PI * 2
  const s = Math.sin(ph)
  ctx.save()
  ctx.translate(0, 1.05)
  if (leg?.kind === 'jump') {
    limb(ctx, -0.5, 0.25, -0.95, -0.25, '#65A30D')
    limb(ctx, 0.5, 0.25, 0.95, -0.45, '#65A30D')
  } else {
    limb(ctx, -0.5, 0.25, -0.5 + s * 0.75, -0.8 + Math.max(0, s) * 0.35, '#65A30D')
    limb(ctx, 0.5, 0.25, 0.5 - s * 0.75, -0.8 + Math.max(0, -s) * 0.35, '#65A30D')
  }
  blocks(ctx, 1)
  if (leg?.kind === 'climb') {
    limb(ctx, -1, 5, -1.4, 6.6 + s * 0.8, '#65A30D')
    limb(ctx, 1, 5, 1.4, 6.6 - s * 0.8, '#65A30D')
  } else {
    // The free arm swings; the other holds the board against his side.
    limb(ctx, 1, 4.4, 1.7 + Math.cos(ph) * 0.4, 3.5 + s * 0.5, '#65A30D')
    limb(ctx, -1, 4.4, -1.55, 3.4, '#65A30D')
  }
  ctx.save()
  ctx.translate(-1.35, 3.1)
  ctx.rotate(Math.PI / 2)
  board(ctx, -1.7, 1.7, 0)
  ctx.restore()
  ctx.restore()
}

/** Fourteen on his board, in the board's frame (up is away from the surface). */
export function drawFourteen(ctx: CanvasRenderingContext2D, k: Rider, crouched: boolean, look: number) {
  const flipping = k.mode === 'air' && k.turned < k.flips
  const hop = flipping ? 0.7 : 0
  if (k.split) return drawSevens(ctx, k, look)
  board(ctx, -1.7, 1.7, k.turned)
  const squash = crouched ? 0.85 : 1
  ctx.save()
  ctx.translate(0, 0.85 + hop)
  ctx.scale(1, squash)
  // Legs, then the ten (white, red edges) and the four (lime) on top.
  limb(ctx, -0.5, 0.25, -0.55, -0.1, '#65A30D')
  limb(ctx, 0.5, 0.25, 0.55, -0.1, '#65A30D')
  blocks(ctx, look)
  // Arms out for balance (lower when crouched).
  const arm = crouched ? 3.6 : 4.6
  limb(ctx, -1, arm, -2, arm + 0.9, '#65A30D')
  limb(ctx, 1, arm, 2, arm + 0.9, '#65A30D')
  ctx.restore()
}

/** Double lucky: two Sevens on two board halves, apart mid-air, together for the landing. */
function drawSevens(ctx: CanvasRenderingContext2D, k: Rider, look: number) {
  const t = Math.max(0, Math.min(1, k.vel.y / Math.max(1, Math.abs(k.vel.y) + 4) / 2 + 0.5))
  const apart = Math.sin(t * Math.PI) * 2.2
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * (0.9 + apart), 0)
    board(ctx, -0.85, 0.85, k.turned)
    ctx.translate(0, 0.85)
    limb(ctx, 0, 0.25, 0, -0.1, '#7C3AED')
    RAINBOW.forEach((c, i) => block(ctx, -0.5, 6 - i + 0.25, c, 'rgba(0,0,0,0.25)'))
    eye(ctx, -0.2, 6.85, look, 0.6)
    eye(ctx, 0.2, 6.85, look, 0.6)
    smile(ctx, 0, 6.15, 0.18)
    ctx.restore()
  }
}
