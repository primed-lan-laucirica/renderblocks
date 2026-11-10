/**
 * Things to measure against: a number line (with hops along it and a
 * stretch of it marked), a bead cut into ten slices, and a square of a
 * hundred. All are sprites, so they move and fade like the beads.
 */
import { items } from './glyphs'
import { B, GOLD, INK } from './look'
import type { BeadColour, Sprite } from './sprites'

/** One bead, its middle at (x, y). */
export const beadAt = (k: string, x: number, y: number, size = B, colour?: BeadColour): Sprite => ({ k, type: 'bead', n: { x, y, s: size / B, o: 1, ghost: 0 }, d: { colour } })

// ── the number line ──────────────────────────────────────────────────────

/** A number line: the numbers `from` to `to` set between x0 and x1 at height y. */
export interface Ruler {
  x0: number
  x1: number
  y: number
  from: number
  to: number
}

/** Where a number sits along it. */
export const onLine = (r: Ruler, v: number) => r.x0 + ((v - r.from) / (r.to - r.from)) * (r.x1 - r.x0)
const written = (v: number) => String(v).replace('-', '−')

/** The line with a tick every `every`, and a numeral under each of `labels` (default: every whole tick). */
export function numberLine(r: Ruler, o: { labels?: number[]; every?: number; size?: number; fade?: number } = {}): Sprite[] {
  const every = o.every ?? 1
  const ticks = Array.from({ length: Math.round((r.to - r.from) / every) + 1 }, (_, i) => Math.round((r.from + i * every) * 1000) / 1000)
  const labels = o.labels ?? ticks.filter((v) => Number.isInteger(v))
  const fade = o.fade ?? 1
  return [
    {
      k: 'axis',
      type: 'custom',
      n: { x: r.x0, y: r.y, len: r.x1 - r.x0, o: fade },
      d: {
        id: `axis ${r.from} ${r.to} ${every}`,
        draw: (p) => (
          <g stroke={INK} strokeWidth={5} strokeLinecap="round">
            <line x1={p.x - 46} y1={p.y} x2={p.x + p.len + 46} y2={p.y} />
            {ticks.map((v, i) => {
              const x = p.x + (i / (ticks.length - 1)) * p.len
              const h = v === 0 ? 30 : Number.isInteger(v) ? 18 : 10
              return <line key={i} x1={x} y1={p.y - h} x2={x} y2={p.y + h} strokeWidth={v === 0 ? 7 : Number.isInteger(v) ? 5 : 3} />
            })}
          </g>
        ),
      },
    },
    ...labels.map((v): Sprite => ({ k: `n${written(v)}`, type: 'tok', n: { x: onLine(r, v), y: r.y + 74, size: o.size ?? 56, o: fade }, d: { it: items([written(v)])[0] } })),
  ]
}

/** One hop over the line from a to b, drawn as it comes on. */
export function hop(k: string, r: Ruler, a: number, b: number, o: { h?: number; colour?: string } = {}): Sprite {
  const colour = o.colour ?? GOLD
  return {
    k,
    type: 'custom',
    n: { x: onLine(r, a), y: r.y - 26, dx: onLine(r, b) - onLine(r, a), h: o.h ?? 64, drawn: 1, o: 1 },
    d: { id: 'hop', colour, draw: (p) => <path d={`M ${p.x} ${p.y} Q ${p.x + p.dx / 2} ${p.y - 2 * p.h} ${p.x + p.dx} ${p.y}`} pathLength={1} strokeDasharray={`${p.drawn} 1`} stroke={colour} strokeWidth={7} strokeLinecap="round" fill="none" /> },
    enter: { drawn: 0 },
  }
}

/** A stretch of the line marked from a to b (drawn along it as it comes on), `up` above the line. */
export function stretch(k: string, r: Ruler, a: number, b: number, o: { colour?: string; up?: number; wide?: number } = {}): Sprite {
  const colour = o.colour ?? GOLD
  const wide = o.wide ?? 16
  return {
    k,
    type: 'custom',
    n: { x: onLine(r, a), y: r.y - (o.up ?? 0), len: onLine(r, b) - onLine(r, a), o: 1 },
    d: { id: 'stretch', colour, draw: (p) => <line x1={p.x} y1={p.y} x2={p.x + p.len} y2={p.y} stroke={colour} strokeWidth={wide} strokeLinecap="round" opacity={0.85} /> },
    enter: { len: 0, o: 1 },
  }
}

// ── tenths and hundredths ────────────────────────────────────────────────

/** A bead of this size cut into ten slices side by side, the first `n` of them solid and the rest only outlines; `apart` opens the cuts. */
export function slices(n: number, o: { x: number; y: number; size: number; apart?: number; k?: string; colour?: BeadColour }): Sprite[] {
  const step = o.size / 10 + (o.apart ?? 0)
  return Array.from({ length: 10 }, (_, i) => ({ k: `${o.k ?? 's'}${i}`, type: 'bead', n: { x: o.x + (i - 4.5) * step, y: o.y, s: o.size / B, w: 0.1, o: 1, ghost: i < n ? 0 : 1 }, d: { colour: o.colour } }))
}

/** A square of a hundred small beads, filled a column at a time from the left: the first `n` solid, the rest only outlines. */
export function hundred(n: number, o: { x: number; y: number; size?: number; k?: string; colour?: BeadColour }): Sprite[] {
  const step = (o.size ?? 520) / 10
  return Array.from({ length: 100 }, (_, i) => ({
    k: `${o.k ?? 'h'}${i}`,
    type: 'bead',
    n: { x: o.x + (Math.floor(i / 10) - 4.5) * step, y: o.y + (4.5 - (i % 10)) * step, s: (step * 0.86) / B, o: 1, ghost: i < n ? 0 : 1 },
    d: { colour: o.colour },
  }))
}
