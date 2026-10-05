/**
 * Drawing the town on a 2D canvas, in world units (blocks, y up): sky, a
 * far-off skyline, buildings with windows, the street, ramps, awnings and
 * seesaws, and the leaves and streaks that show where the wind blows.
 */
import { CHUNK, type Piece } from './course'
import type { Town } from './sim'

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const BUILDING_COLOURS = ['#94A3B8', '#A8A29E', '#CBD5E1', '#B6C3D6', '#D6C7B0', '#9CA9BC']

/** The far-off skyline, drifting by at 40% of the town's speed (parallax). */
export function drawSkyline(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const p = 0.4
  const shift = x0 * (1 - p) // so a far building moves only p as fast as the camera
  ctx.fillStyle = '#C7D7EA'
  for (let i = Math.floor((x0 - shift) / 6) - 1; i <= Math.ceil((x1 - shift) / 6) + 1; i++) ctx.fillRect(i * 6 + shift, 0, 5.4, 6 + hash(i) * 14)
}

function building(ctx: CanvasRenderingContext2D, p: Extract<Piece, { kind: 'building' }>, px: number) {
  const k = Math.floor(hash(p.x) * BUILDING_COLOURS.length)
  ctx.fillStyle = BUILDING_COLOURS[k]
  ctx.fillRect(p.x, 0, p.w, p.h)
  // Roof edge.
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(p.x - 0.2, p.h - 0.25, p.w + 0.4, 0.25)
  // Windows, when they'd be visible.
  if (px < 4) return
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let y = 1; y < p.h - 1; y += 1.6)
    for (let x = p.x + 0.8; x < p.x + p.w - 0.8; x += 1.6) if (hash(x * 3.1 + y * 7.7) > 0.25) ctx.fillRect(x, y, 0.7, 0.8)
}

/** Everything fixed in the town (and the seesaw planks, where physics has them). */
export function drawTown(ctx: CanvasRenderingContext2D, town: Town, x0: number, x1: number, px: number) {
  // Street.
  ctx.fillStyle = '#475569'
  ctx.fillRect(x0 - 5, -3, x1 - x0 + 10, 3)
  ctx.fillStyle = '#FDE68A'
  for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) ctx.fillRect(x, -1.6, 2, 0.2)
  for (const [i, b] of town.built) {
    if ((i + 1) * CHUNK + town.offset < x0 - 20 || i * CHUNK + town.offset > x1 + 20) continue
    for (const p of b.pieces) {
      if (p.kind === 'building') building(ctx, p, px)
      else if (p.kind === 'ramp') {
        ctx.beginPath()
        ctx.moveTo(p.x, 0)
        ctx.lineTo(p.x + p.w, 0)
        ctx.lineTo(p.x + p.w, p.h)
        ctx.closePath()
        ctx.fillStyle = '#D9A066'
        ctx.fill()
      } else if (p.kind === 'pad') {
        // A striped awning: bouncy.
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = k % 2 ? '#FFFFFF' : '#EF4444'
          ctx.fillRect(p.x + (p.w * k) / 6, p.y, p.w / 6 + 0.01, 0.3)
        }
      } else if (p.kind === 'seesaw') {
        ctx.beginPath()
        ctx.moveTo(p.x - 0.9, 0)
        ctx.lineTo(p.x + 0.9, 0)
        ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = '#64748B'
        ctx.fill()
      }
    }
    for (const s of b.seesaws) {
      const t = s.plank.translation()
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(s.plank.rotation())
      ctx.fillStyle = '#B45309'
      ctx.fillRect(-s.piece.len / 2, -0.2, s.piece.len, 0.4)
      ctx.restore()
    }
  }
}

export interface Leaf {
  x: number
  y: number
  vy: number
  spin: number
  a: number
  colour: string
  streak: boolean
}

const LEAF_COLOURS = ['#22C55E', '#84CC16', '#F59E0B', '#EF4444', '#FFFFFF']

/** Keep leaves and streaks blowing across the view, more where the wind is stronger. */
export function blowLeaves(leaves: Leaf[], town: Town, x0: number, x1: number, y1: number, dt: number) {
  for (const l of leaves) {
    l.x += town.windAt(l.x) * dt
    // With the wind off, nothing holds them up: they flutter down to the street.
    if (!town.windOn) {
      l.vy = Math.max(-4, l.vy - 6 * dt)
      l.streak = false
    }
    l.y += l.vy * dt
    l.a += l.spin * dt
  }
  for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].x > x1 + 5 || leaves[i].y < -1) leaves.splice(i, 1)
  // No wind, no new leaves.
  const want = town.windOn ? 70 : 0
  while (leaves.length < want) {
    const y = Math.random() * y1
    const x = x0 - 4 - Math.random() * 6
    const strong = town.windAt(x + 10) > 12
    leaves.push({ x, y, vy: (Math.random() - 0.6) * 1.5, spin: (Math.random() - 0.5) * 8, a: 0, colour: LEAF_COLOURS[Math.floor(Math.random() * 5)], streak: strong ? Math.random() < 0.7 : Math.random() < 0.3 })
  }
}

export function drawLeaves(ctx: CanvasRenderingContext2D, leaves: Leaf[], town: Town) {
  for (const l of leaves) {
    if (l.streak) {
      const len = Math.min(4, town.windAt(l.x) * 0.12)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 0.08
      ctx.beginPath()
      ctx.moveTo(l.x - len, l.y)
      ctx.lineTo(l.x, l.y)
      ctx.stroke()
    } else {
      ctx.save()
      ctx.translate(l.x, l.y)
      ctx.rotate(l.a)
      ctx.fillStyle = l.colour
      ctx.beginPath()
      ctx.ellipse(0, 0, 0.22, 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}
