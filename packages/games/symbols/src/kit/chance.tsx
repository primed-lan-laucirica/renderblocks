/**
 * Stage 6's things: a bag to draw beads from, a line of numbers with beads
 * stacked over it (each bead is one thing counted, so a stack's height says
 * how often its number came up), bars standing on the line (how likely each
 * number is), an upright mark at a number (the mean), a reach along the
 * line (the spread), and the bell-shaped curve. The stacks, bars, marks and
 * bell all stand on a `Graph` (Stage 4's sheet), so Stage 4's `curve` and
 * `under` draw over them in the same numbers. All are sprites drawn from
 * their numbers, so a mark can slide and a reach can grow; every numeral
 * on them is a token, so the path's rule about which signs an explainer
 * may show holds for them too.
 */
import type { Graph, Rule } from './calculus'
import { on } from './calculus'
import { items } from './glyphs'
import { PEN, type Pen } from './logic'
import { INK } from './look'
import { beadAt } from './measures'
import type { BeadColour, Sprite } from './sprites'

/** A short line of tokens set at a point (a letter over a mark, a number over a bar). */
export { label } from './calculus'

const written = (v: number) => String(v).replace('-', '−')

// ── the bag ──────────────────────────────────────────────────────────────

/** A cloth bag, its middle at (x, y); `s` scales it (1 is about 500 wide and 440 tall). */
export function bag(k: string, x: number, y: number, o: { s?: number; fade?: number } = {}): Sprite {
  return {
    k,
    type: 'custom',
    n: { x, y, s: o.s ?? 1, o: o.fade ?? 1 },
    d: {
      id: 'bag',
      draw: (p) => (
        <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`} stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M -150 -190 C -120 -110 -280 40 -230 170 C -200 250 200 250 230 170 C 280 40 120 -110 150 -190" fill="#e9dcc0" />
          <path d="M -140 -110 Q 0 -80 140 -110" fill="none" strokeWidth={5} />
        </g>
      ),
    },
  }
}

/** The size of a bead in a bag of scale 1. */
export const BAG_BEAD = 96

/** Where up to eight beads (each `BAG_BEAD` times `s`) lie in the bottom of a bag at (x, y) of scale `s`: a row of four, three on top, one above. */
export function inBag(x: number, y: number, n: number, s = 1): { x: number; y: number }[] {
  const places = [
    [-150, 135],
    [-50, 143],
    [50, 143],
    [150, 135],
    [-100, 42],
    [0, 48],
    [100, 42],
    [0, -50],
  ]
  return places.slice(0, n).map(([dx, dy]) => ({ x: x + dx * s, y: y + dy * s }))
}

// ── the line of numbers, and what stands on it ───────────────────────────

/** The graph's x axis alone, from `from` to `to` (default: zero to its width), a tick at every whole number and a numeral under each of `xs`. */
export function ground(g: Graph, o: { k?: string; from?: number; to?: number; xs?: number[]; size?: number; fade?: number } = {}): Sprite[] {
  const k = o.k ?? 'ground'
  const from = o.from ?? 0
  const to = o.to ?? g.w
  const fade = o.fade ?? 1
  const ticks = Array.from({ length: Math.floor(to) - Math.ceil(from) + 1 }, (_, i) => Math.ceil(from) + i)
  return [
    {
      k,
      type: 'custom',
      n: { x: g.x, y: g.y, o: fade },
      d: {
        id: `ground ${from} ${to} ${g.ux}`,
        draw: (p) => (
          <g stroke={INK} strokeWidth={5} strokeLinecap="round">
            <line x1={p.x + from * g.ux - 40} y1={p.y} x2={p.x + to * g.ux + 40} y2={p.y} />
            {ticks.map((v) => (
              <line key={v} x1={p.x + v * g.ux} y1={p.y - 12} x2={p.x + v * g.ux} y2={p.y + 12} strokeWidth={4} />
            ))}
          </g>
        ),
      },
    },
    ...(o.xs ?? []).map((v): Sprite => ({ k: `${k}/x${written(v)}`, type: 'tok', n: { x: g.x + v * g.ux, y: g.y + 58, size: o.size ?? 56, o: fade, gold: 0 }, d: { it: items([written(v)])[0] } })),
  ]
}

/** Where the j-th bead (from 0) of the stack over the number v sits; one bead is one unit tall. */
export const stackAt = (g: Graph, v: number, j: number) => on(g, v, j + 0.5)

/**
 * Beads stacked over the line: `counts` is a list of [number, how many].
 * Each bead is keyed `k/number/j`, so a bead of one picture can travel to
 * its place in the next. `colour` may pick a colour for each bead.
 */
export function stacks(k: string, g: Graph, counts: [number, number][], o: { size?: number; colour?: BeadColour | ((v: number, j: number) => BeadColour | undefined); fade?: number } = {}): Sprite[] {
  const size = o.size ?? Math.min(g.ux, g.uy) * 0.9
  const fade = o.fade ?? 1
  return counts.flatMap(([v, n]) =>
    Array.from({ length: n }, (_, j) => {
      const at = stackAt(g, v, j)
      const b = beadAt(`${k}/${written(v)}/${j}`, at.x, at.y, size, typeof o.colour === 'function' ? o.colour(v, j) : o.colour)
      return { ...b, n: { ...b.n, o: fade } }
    }),
  )
}

/** Bars standing on the line: `heights` is a list of [number, height]. Each bar grows up from the line as it comes on. */
export function bars(k: string, g: Graph, heights: [number, number][], o: { wide?: number; pen?: Pen; shade?: number; gold?: number[]; fade?: number } = {}): Sprite[] {
  const wide = (o.wide ?? 0.7) * g.ux
  return heights.map(([v, h]): Sprite => {
    const colour = PEN[o.gold?.includes(v) ? 'gold' : (o.pen ?? 'blue')]
    return {
      k: `${k}/${written(v)}`,
      type: 'custom',
      n: { x: g.x + v * g.ux, h, shade: o.shade ?? 0.35, o: o.fade ?? 1 },
      enter: { h: 0 },
      d: { id: `bar ${colour} ${wide} ${g.y} ${g.uy}`, draw: (p) => <rect x={p.x - wide / 2} y={g.y - p.h * g.uy} width={wide} height={Math.max(0, p.h * g.uy)} fill={colour} fillOpacity={p.shade} stroke={colour} strokeWidth={5} strokeLinejoin="round" /> },
    }
  })
}

/** An upright dashed mark at the number x, from the line up to the height h (in the graph's units); x can slide. */
export function mark(k: string, g: Graph, x: number, h: number, o: { pen?: Pen; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'red']
  return {
    k,
    type: 'custom',
    n: { gx: x, h, w: o.w ?? 7, o: o.fade ?? 1 },
    d: { id: `mark ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`, draw: (p) => <line x1={g.x + p.gx * g.ux} y1={g.y + 16} x2={g.x + p.gx * g.ux} y2={g.y - p.h * g.uy} stroke={colour} strokeWidth={p.w} strokeDasharray="18 14" strokeLinecap="round" /> },
  }
}

/** A reach along the line from a to b at the height h, with a small stop at each end; it grows out from a as it comes on, and both ends can slide. */
export function reach(k: string, g: Graph, a: number, b: number, h: number, o: { pen?: Pen; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'green']
  return {
    k,
    type: 'custom',
    n: { a, b, h, w: o.w ?? 9, o: o.fade ?? 1 },
    enter: { b: a },
    d: {
      id: `reach ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const y = g.y - p.h * g.uy
        const xa = g.x + p.a * g.ux
        const xb = g.x + p.b * g.ux
        return (
          <g stroke={colour} strokeWidth={p.w} strokeLinecap="round">
            <line x1={xa} y1={y} x2={xb} y2={y} />
            <line x1={xa} y1={y - 22} x2={xa} y2={y + 22} />
            <line x1={xb} y1={y - 22} x2={xb} y2={y + 22} />
          </g>
        )
      },
    },
  }
}

// ── the bell ─────────────────────────────────────────────────────────────

/** The bell-shaped curve with its middle at `mean`, `spread` wide (its standard deviation) and `peak` high in the middle; draw it with Stage 4's `curve` and shade under it with `under`. */
export const bell = (mean: number, spread: number, peak: number): Rule => ({ id: `bell ${mean} ${spread} ${peak}`, f: (x) => peak * Math.exp(-((x - mean) ** 2) / (2 * spread * spread)) })
