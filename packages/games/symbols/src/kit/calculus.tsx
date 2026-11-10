/**
 * Stage 4's things: a sheet with two axes (a graph), a curve on it, the
 * line through two points of a curve with its step across and its step up
 * (as the points close up it becomes the line that just touches), strips
 * standing under a curve, and the area under it. All are sprites drawn
 * from their numbers, so a point can slide along its curve and an area can
 * sweep; every numeral and letter on them is a token, so the path's rule
 * about which signs an explainer may show holds for them too.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { items, type Tok } from './glyphs'
import { PEN, type Pen } from './logic'
import { INK } from './look'
import { line, type Sprite } from './sprites'

// ── the sheet ────────────────────────────────────────────────────────────

/** A graph: where its zero is on the paper, a unit's length each way, and how far its axes run (in units). */
export interface Graph {
  x: number
  y: number
  ux: number
  uy: number
  w: number
  h: number
}

/** Where the point (x, y) of the graph is on the paper. */
export const on = (g: Graph, x: number, y: number): Pt => ({ x: g.x + x * g.ux, y: g.y - y * g.uy })

/** A rule for a curve, with a name (two curves with the same name are drawn alike). */
export interface Rule {
  id: string
  f: (x: number) => number
}
export const SQUARE: Rule = { id: 'x²', f: (x) => x * x }

const written = (v: number) => String(v).replace('-', '−')

/**
 * The two axes, a tick at every whole unit, a numeral at each of `xs` and
 * `ys`, and a letter at the end of each axis (`names`).
 */
export function axes(g: Graph, o: { k?: string; xs?: number[]; ys?: number[]; names?: [Tok | null, Tok | null]; size?: number; fade?: number } = {}): Sprite[] {
  const k = o.k ?? 'axes'
  const fade = o.fade ?? 1
  const size = o.size ?? 52
  const out: Sprite[] = [
    {
      k,
      type: 'custom',
      n: { x: g.x, y: g.y, o: fade },
      d: {
        id: `axes ${g.ux} ${g.uy} ${g.w} ${g.h}`,
        draw: (p) => (
          <g stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d={`M ${p.x} ${p.y - g.h * g.uy - 30} L ${p.x} ${p.y} L ${p.x + g.w * g.ux + 30} ${p.y}`} />
            {Array.from({ length: Math.floor(g.w) }, (_, i) => (
              <line key={`x${i}`} x1={p.x + (i + 1) * g.ux} y1={p.y - 12} x2={p.x + (i + 1) * g.ux} y2={p.y + 12} strokeWidth={4} />
            ))}
            {Array.from({ length: Math.floor(g.h) }, (_, i) => (
              <line key={`y${i}`} x1={p.x - 12} y1={p.y - (i + 1) * g.uy} x2={p.x + 12} y2={p.y - (i + 1) * g.uy} strokeWidth={4} />
            ))}
          </g>
        ),
      },
    },
  ]
  const tok = (name: string, t: Tok, x: number, y: number, s = size): Sprite => ({ k: `${k}/${name}`, type: 'tok', n: { x, y, size: s, o: fade, gold: 0 }, d: { it: items([t])[0] } })
  for (const v of o.xs ?? []) out.push(tok(`x${written(v)}`, written(v), g.x + v * g.ux, g.y + 50))
  for (const v of o.ys ?? []) out.push(tok(`y${written(v)}`, written(v), g.x - 30 - (written(v).length * size * 0.62) / 2, g.y - v * g.uy))
  if (o.names?.[0]) out.push(tok('nx', o.names[0], g.x + g.w * g.ux + 80, g.y, size * 1.5))
  if (o.names?.[1]) out.push(tok('ny', o.names[1], g.x, g.y - g.h * g.uy - 80, size * 1.5))
  return out
}

// ── curves and points ────────────────────────────────────────────────────

/** The curve of a rule from `from` to `to`; `to` can move, so the curve can be drawn as it comes on. */
export function curve(k: string, g: Graph, rule: Rule, o: { from?: number; to?: number; pen?: Pen; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  const from = o.from ?? 0
  return {
    k,
    type: 'custom',
    n: { to: o.to ?? g.w, w: o.w ?? 9, o: o.fade ?? 1 },
    enter: { to: from },
    d: {
      id: `curve ${rule.id} ${from} ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const pts = Array.from({ length: 49 }, (_, i) => {
          const x = from + ((p.to - from) * i) / 48
          const at = on(g, x, rule.f(x))
          return `${at.x},${at.y}`
        })
        return <polyline points={pts.join(' ')} fill="none" stroke={colour} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
      },
    },
  }
}

/** A point of the graph, as a dot. */
export function point(k: string, g: Graph, x: number, y: number, o: { r?: number; pen?: Pen; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'ink']
  const at = on(g, x, y)
  return { k, type: 'custom', n: { x: at.x, y: at.y, r: o.r ?? 15, o: o.fade ?? 1 }, d: { id: `dot ${colour}`, draw: (p) => <circle cx={p.x} cy={p.y} r={p.r} fill={colour} /> } }
}

/** Dashed guides from a point of the graph down to the x axis and across to the y axis. */
export function guides(k: string, g: Graph, x: number, y: number, o: { fade?: number; across?: boolean } = {}): Sprite {
  const across = o.across ?? true
  return {
    k,
    type: 'custom',
    n: { gx: x, gy: y, o: o.fade ?? 1 },
    d: {
      id: `guides ${across} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const at = on(g, p.gx, p.gy)
        return (
          <g stroke={INK} strokeWidth={4} strokeDasharray="6 14" strokeLinecap="round" opacity={0.55} fill="none">
            <line x1={at.x} y1={at.y} x2={at.x} y2={g.y} />
            {across && <line x1={at.x} y1={at.y} x2={g.x} y2={at.y} />}
          </g>
        )
      },
    },
  }
}

/**
 * The straight line through two points of a curve: the one at `a` and the
 * one `h` further on, running `reach` units past each. With `legs`, the
 * step across (Δx) and the step up (Δy) are drawn too. Both `a` and `h`
 * can move: as h shrinks, the line turns into the one that just touches
 * the curve at a (h = 0 draws exactly that).
 */
export function chord(k: string, g: Graph, rule: Rule, a: number, h: number, o: { reach?: number; legs?: boolean; pen?: Pen; legPens?: [Pen, Pen]; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'red']
  const [across, up] = (o.legPens ?? ['green', 'gold']).map((pen) => PEN[pen])
  return {
    k,
    type: 'custom',
    n: { a, h, reach: o.reach ?? 0.8, legs: o.legs ? 1 : 0, w: o.w ?? 8, o: o.fade ?? 1 },
    d: {
      id: `chord ${rule.id} ${colour} ${across} ${up} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        // Closer than this, the two points are one, and the slope is the curve's own there.
        const tiny = Math.abs(p.h) < 0.004
        const slope = tiny ? (rule.f(p.a + 0.0005) - rule.f(p.a - 0.0005)) / 0.001 : (rule.f(p.a + p.h) - rule.f(p.a)) / p.h
        const y0 = rule.f(p.a)
        const P = on(g, p.a, y0)
        const Q = on(g, p.a + p.h, y0 + slope * p.h)
        // The line runs the same length past each point, whatever its slope.
        const len = Math.hypot(g.ux, slope * g.uy)
        const run = (p.reach * g.ux) / len
        const A = on(g, p.a - run, y0 - slope * run)
        const B = on(g, p.a + p.h + run, y0 + slope * (p.h + run))
        return (
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {p.legs > 0 && !tiny && (
              <g opacity={p.legs} strokeWidth={p.w}>
                <line x1={P.x} y1={P.y} x2={Q.x} y2={P.y} stroke={across} />
                <line x1={Q.x} y1={P.y} x2={Q.x} y2={Q.y} stroke={up} />
              </g>
            )}
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={colour} strokeWidth={p.w} />
            <circle cx={P.x} cy={P.y} r={p.w * 1.7} fill={INK} />
            {!tiny && <circle cx={Q.x} cy={Q.y} r={p.w * 1.7} fill={INK} />}
          </g>
        )
      },
    },
  }
}

/** The middles of a chord's two steps (for their labels): across, under the step; up, to the right of it. */
export const legsAt = (g: Graph, rule: Rule, a: number, h: number): { across: Pt; up: Pt } => {
  const P = on(g, a, rule.f(a))
  const Q = on(g, a + h, rule.f(a + h))
  return { across: { x: (P.x + Q.x) / 2, y: P.y + 60 }, up: { x: Q.x + 96, y: (P.y + Q.y) / 2 } }
}

// ── what is under a curve ────────────────────────────────────────────────

/** n strips standing side by side under a curve from a to b, each as tall as the curve at its left edge (or its `right`, or its `mid`). */
export function strips(k: string, g: Graph, rule: Rule, a: number, b: number, n: number, o: { edge?: 'left' | 'right' | 'mid'; pen?: Pen; gold?: number[]; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  const edge = o.edge ?? 'left'
  const w = (b - a) / n
  return {
    k,
    type: 'custom',
    n: { o: o.fade ?? 1 },
    d: {
      id: `strips ${rule.id} ${a} ${b} ${n} ${edge} ${colour} ${(o.gold ?? []).join(',')} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: () => (
        <g stroke={colour} strokeWidth={n > 16 ? 2 : 4} strokeLinejoin="round">
          {Array.from({ length: n }, (_, i) => {
            const x = a + i * w
            const tall = rule.f(edge === 'left' ? x : edge === 'right' ? x + w : x + w / 2)
            const at = on(g, x, tall)
            return <rect key={i} x={at.x} y={at.y} width={w * g.ux} height={tall * g.uy} fill={o.gold?.includes(i) ? PEN.gold : colour} fillOpacity={o.gold?.includes(i) ? 0.55 : 0.28} />
          })}
        </g>
      ),
    },
  }
}

/** The area under a curve from a to b, filled; `b` can move, so the area can sweep along. */
export function under(k: string, g: Graph, rule: Rule, a: number, b: number, o: { pen?: Pen; shade?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  return {
    k,
    type: 'custom',
    n: { b, shade: o.shade ?? 0.3, o: o.fade ?? 1 },
    enter: { b: a },
    d: {
      id: `under ${rule.id} ${a} ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const top = Array.from({ length: 41 }, (_, i) => {
          const x = a + ((p.b - a) * i) / 40
          const at = on(g, x, rule.f(x))
          return `L ${at.x} ${at.y}`
        })
        return <path d={`M ${on(g, a, 0).x} ${g.y} ${top.join(' ')} L ${on(g, p.b, 0).x} ${g.y} Z`} fill={colour} fillOpacity={p.shade} stroke="none" />
      },
    },
  }
}

/** A line of tokens set at a point of the graph (a label by a point, a letter under a step). */
export const label = (k: string, toks: Tok[], at: Pt, o: { size?: number; gold?: string[]; fade?: number } = {}): Sprite[] => line(toks, { x: at.x, y: at.y, size: o.size ?? 72, gold: o.gold, fade: o.fade }).map((s) => ({ ...s, k: `${k}/${s.k}` }))
