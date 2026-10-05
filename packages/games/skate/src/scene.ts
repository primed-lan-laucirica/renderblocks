/**
 * Drawing the skate town, in world units (y up): a skyline far behind, the
 * ground (street, wooden ramps, stone, stairs), concrete pipes, rails, and
 * the parkour blocks — stacks coloured like the Numberblock of their
 * height, each with its numberling.
 */
import type { Course, Seg } from './course'
import { RAINBOW } from './draw'

/** Numberblock colours, 1–9 (7 is a rainbow, 9 greys). */
const COLOURS = ['', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#06B6D4', '#6366F1', '', '#D946EF', '']
const GREYS = ['#F3F4F6', '#E5E7EB', '#D1D5DB', '#BFC4CB', '#9CA3AF', '#868D98', '#6B7280', '#565E6B', '#4B5563']

const FILL: Record<Seg['mat'], string> = { street: '#A8A29E', wood: '#D9C3A0', stone: '#CBD5E1', stairs: '#CBD5E1', pipe: '#A8A29E', blocks: '#A8A29E' }
const EDGE: Record<Seg['mat'], string> = { street: '#475569', wood: '#8B6B43', stone: '#64748B', stairs: '#64748B', pipe: '#6B7280', blocks: '#475569' }

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Tall buildings far off, sliding by slowly. */
export function drawSkyline(g: CanvasRenderingContext2D, x0: number, x1: number, camX: number, base: number) {
  const k = 0.6
  const shift = camX * k
  g.fillStyle = '#C7DDF0'
  for (let i = Math.floor((x0 - shift) / 7) - 1; i <= Math.ceil((x1 - shift) / 7) + 1; i++) {
    const h = 12 + hash(i) * 26
    const w = 4 + hash(i + 0.5) * 4
    g.fillRect(i * 7 + shift, base, w, h)
  }
}

export function drawTown(g: CanvasRenderingContext2D, c: Course, x0: number, x1: number, bottom: number) {
  const segs = c.segs
  const a = c.indexAt(x0 - 2)
  const b = c.indexAt(x1 + 2)
  // The ground under everything.
  g.beginPath()
  g.moveTo(segs[a].x0, bottom)
  for (let i = a; i <= b; i++) {
    g.lineTo(segs[i].x0, segs[i].y0)
    g.lineTo(segs[i].x1, segs[i].y1)
  }
  g.lineTo(segs[b].x1, bottom)
  g.closePath()
  g.fillStyle = '#A8A29E'
  g.fill()
  // What sits on it: ramps, stone, stairs (from their surface down to the street).
  for (let i = a; i <= b; i++) {
    const s = segs[i]
    if (s.mat === 'street' || s.mat === 'blocks' || s.mat === 'pipe' || Math.max(s.y0, s.y1) <= 0) continue
    g.beginPath()
    g.moveTo(s.x0, Math.min(0, s.y0))
    g.lineTo(s.x0, s.y0)
    g.lineTo(s.x1, s.y1)
    g.lineTo(s.x1, Math.min(0, s.y1))
    g.closePath()
    g.fillStyle = FILL[s.mat]
    g.fill()
  }
  // The parkour blocks.
  for (let i = a; i <= b; i++) {
    const s = segs[i]
    if (s.mat !== 'blocks' || !s.n) continue
    const n = s.n
    for (let row = 0; row < n; row++) {
      // Seven's rainbow runs red at the top; Nine's greys darken going up.
      const fill = n === 7 ? RAINBOW[n - 1 - row] : n === 9 ? GREYS[row] : COLOURS[n]
      for (let x = s.x0; x < s.x1 - 0.01; x++) {
        g.fillStyle = fill
        g.fillRect(x, row, 1, 1)
        g.lineWidth = 0.07
        g.strokeStyle = 'rgba(0,0,0,0.25)'
        g.strokeRect(x + 0.04, row + 0.04, 0.92, 0.92)
      }
    }
  }
  // The riding surfaces' edges.
  g.lineJoin = 'round'
  g.lineCap = 'round'
  for (let i = a; i <= b; i++) {
    const s = segs[i]
    if (s.mat === 'blocks') continue
    g.beginPath()
    g.moveTo(s.x0, s.y0)
    g.lineTo(s.x1, s.y1)
    g.lineWidth = s.mat === 'street' ? 0.3 : 0.22
    g.strokeStyle = EDGE[s.mat]
    g.stroke()
  }
  // Concrete pipes: a ring with its dark inside.
  for (const p of c.pipes) {
    if (p.cx + p.r < x0 || p.cx - p.r > x1) continue
    g.beginPath()
    g.arc(p.cx, p.r, p.r, 0, Math.PI * 2)
    g.fillStyle = '#9CA3AF'
    g.fill()
    g.lineWidth = 0.15
    g.strokeStyle = '#6B7280'
    g.stroke()
    g.beginPath()
    g.arc(p.cx, p.r, p.r * 0.72, 0, Math.PI * 2)
    g.fillStyle = '#374151'
    g.fill()
  }
  // Rails, on posts.
  for (const r of c.rails) {
    if (Math.max(r.x0, r.x1) < x0 || Math.min(r.x0, r.x1) > x1) continue
    const posts = Math.max(2, Math.round(Math.abs(r.x1 - r.x0) / 4) + 1)
    g.lineWidth = 0.18
    g.strokeStyle = '#64748B'
    for (let j = 0; j < posts; j++) {
      const f = 0.06 + (0.88 * j) / (posts - 1)
      const x = r.x0 + (r.x1 - r.x0) * f
      g.beginPath()
      g.moveTo(x, r.y0 + (r.y1 - r.y0) * f)
      g.lineTo(x, c.heightAt(x))
      g.stroke()
    }
    g.beginPath()
    g.moveTo(r.x0, r.y0)
    g.lineTo(r.x1, r.y1)
    g.lineWidth = 0.28
    g.strokeStyle = '#334155'
    g.stroke()
  }
}

/** Each parkour block's numberling (its height), plain black, just above it; in screen space. */
export function drawNumberlings(g: CanvasRenderingContext2D, c: Course, x0: number, x1: number, toScreen: (x: number, y: number) => { x: number; y: number }, size: number) {
  g.textAlign = 'center'
  g.fillStyle = '#000'
  g.font = `700 ${Math.round(size)}px Nunito, system-ui, sans-serif`
  for (let i = c.indexAt(x0 - 2); i <= c.indexAt(x1 + 2); i++) {
    const s = c.segs[i]
    if (s.mat !== 'blocks' || !s.n) continue
    const p = toScreen((s.x0 + s.x1) / 2, s.y0)
    g.fillText(String(s.n), p.x, p.y - size * 0.3)
  }
}
