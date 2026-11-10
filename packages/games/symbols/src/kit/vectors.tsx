/**
 * Stage 5's things: a squared sheet (a plane), arrows on it (vectors: each
 * has a tail, and a step across and a step up that take it to its tip), the
 * two steps of an arrow drawn as the legs of a triangle, the slanted
 * four-sided shape two arrows span, a little square in a corner, and a
 * field of arrows (one at every crossing of the sheet). All are sprites
 * drawn from their numbers, so an arrow can grow, turn and slide, and a
 * shape can follow it; every numeral and letter on them is a token, so the
 * path's rule about which signs an explainer may show holds for them too.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { items, type Tok } from './glyphs'
import { PEN, type Pen } from './logic'
import { INK } from './look'
import type { Sprite } from './sprites'

/** A short line of tokens set at a point (a name beside an arrow, a number beside a step). */
export { label } from './calculus'

// ── the sheet ────────────────────────────────────────────────────────────

/** A plane: where its zero is on the paper, a unit's length, and how far it runs each way (in units; `left` and `down` default to none). */
export interface Plane {
  x: number
  y: number
  u: number
  w: number
  h: number
  left?: number
  down?: number
}

/** A pair of numbers: a point of the plane, or an arrow's step across and step up. */
export type Vec = [number, number]

/** Where the point (x, y) of the plane is on the paper. */
export const at = (pl: Plane, x: number, y: number): Pt => ({ x: pl.x + x * pl.u, y: pl.y - y * pl.u })

const written = (v: number) => String(v).replace('-', '−')

/**
 * The squared sheet: a faint line at every whole unit, and (with `axes`)
 * the two lines through zero drawn dark, a numeral at each of `xs` and
 * `ys`, and a letter at the end of each (`names`).
 */
export function sheet(pl: Plane, o: { k?: string; axes?: boolean; xs?: number[]; ys?: number[]; names?: [Tok | null, Tok | null]; size?: number; fade?: number } = {}): Sprite[] {
  const k = o.k ?? 'sheet'
  const fade = o.fade ?? 1
  const size = o.size ?? 46
  const [left, down] = [pl.left ?? 0, pl.down ?? 0]
  const out: Sprite[] = [
    {
      k,
      type: 'custom',
      n: { x: pl.x, y: pl.y, o: fade },
      d: {
        id: `sheet ${pl.u} ${pl.w} ${pl.h} ${left} ${down} ${o.axes ? 'axes' : ''}`,
        draw: (p) => (
          <g strokeLinecap="round" fill="none">
            <g stroke={INK} strokeWidth={2.5} opacity={0.2}>
              {Array.from({ length: left + pl.w + 1 }, (_, i) => (
                <line key={`v${i}`} x1={p.x + (i - left) * pl.u} y1={p.y + down * pl.u} x2={p.x + (i - left) * pl.u} y2={p.y - pl.h * pl.u} />
              ))}
              {Array.from({ length: down + pl.h + 1 }, (_, i) => (
                <line key={`h${i}`} x1={p.x - left * pl.u} y1={p.y - (i - down) * pl.u} x2={p.x + pl.w * pl.u} y2={p.y - (i - down) * pl.u} />
              ))}
            </g>
            {o.axes && (
              <g stroke={INK} strokeWidth={5}>
                <line x1={p.x - left * pl.u - (left ? 20 : 0)} y1={p.y} x2={p.x + pl.w * pl.u + 20} y2={p.y} />
                <line x1={p.x} y1={p.y + down * pl.u + (down ? 20 : 0)} x2={p.x} y2={p.y - pl.h * pl.u - 20} />
              </g>
            )}
          </g>
        ),
      },
    },
  ]
  const tok = (name: string, t: Tok, x: number, y: number, s = size): Sprite => ({ k: `${k}/${name}`, type: 'tok', n: { x, y, size: s, o: fade, gold: 0 }, d: { it: items([t])[0] } })
  for (const v of o.xs ?? []) out.push(tok(`x${written(v)}`, written(v), pl.x + v * pl.u, pl.y + 44))
  for (const v of o.ys ?? []) out.push(tok(`y${written(v)}`, written(v), pl.x - 24 - (written(v).length * size * 0.62) / 2, pl.y - v * pl.u))
  if (o.names?.[0]) out.push(tok('nx', o.names[0], pl.x + pl.w * pl.u + 70, pl.y, size * 1.5))
  if (o.names?.[1]) out.push(tok('ny', o.names[1], pl.x, pl.y - pl.h * pl.u - 70, size * 1.5))
  return out
}

// ── arrows ───────────────────────────────────────────────────────────────

/**
 * A vector as an arrow: from its tail `from`, `v[0]` across and `v[1]` up.
 * Tail and steps can all move, so the arrow can slide (tail), grow or turn
 * (steps); it comes on growing out of its tail.
 */
export function arrowOn(k: string, pl: Plane, from: Vec, v: Vec, o: { pen?: Pen; w?: number; fade?: number; still?: boolean } = {}): Sprite {
  const colour = PEN[o.pen ?? 'red']
  return {
    k,
    type: 'custom',
    n: { ax: from[0], ay: from[1], vx: v[0], vy: v[1], w: o.w ?? 12, o: o.fade ?? 1 },
    ...(o.still ? {} : { enter: { vx: 0, vy: 0 } }),
    d: {
      id: `vector ${colour} ${pl.x} ${pl.y} ${pl.u}`,
      draw: (p) => {
        const A = at(pl, p.ax, p.ay)
        const B = at(pl, p.ax + p.vx, p.ay + p.vy)
        const len = Math.hypot(B.x - A.x, B.y - A.y)
        if (len < 2) return null
        const [ux, uy] = [(B.x - A.x) / len, (B.y - A.y) / len]
        // The head is a filled point; the shaft stops inside it, so the tip stays sharp.
        const head = Math.min(p.w * 3.6, len * 0.6)
        const neck = { x: B.x - ux * head, y: B.y - uy * head }
        const wing = head * 0.5
        return (
          <g>
            <line x1={A.x} y1={A.y} x2={neck.x + ux * 2} y2={neck.y + uy * 2} stroke={colour} strokeWidth={p.w} strokeLinecap="round" />
            <polygon points={`${B.x},${B.y} ${neck.x - uy * wing},${neck.y + ux * wing} ${neck.x + uy * wing},${neck.y - ux * wing}`} fill={colour} stroke={colour} strokeWidth={p.w * 0.3} strokeLinejoin="round" />
          </g>
        )
      },
    },
  }
}

/** The middle of an arrow (for its name), pushed `off` pixels to its left-hand side (to its right for a negative one). */
export function beside(pl: Plane, from: Vec, v: Vec, off = 60): Pt {
  const A = at(pl, from[0], from[1])
  const B = at(pl, from[0] + v[0], from[1] + v[1])
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1
  return { x: (A.x + B.x) / 2 + ((B.y - A.y) / len) * off, y: (A.y + B.y) / 2 - ((B.x - A.x) / len) * off }
}

/**
 * An arrow's two steps as dashed legs: across first, then up. They follow
 * the arrow's numbers, so they can move with it.
 */
export function legs(k: string, pl: Plane, from: Vec, v: Vec, o: { pens?: [Pen, Pen]; w?: number; fade?: number } = {}): Sprite {
  const [across, up] = (o.pens ?? ['green', 'gold']).map((pen) => PEN[pen])
  return {
    k,
    type: 'custom',
    n: { ax: from[0], ay: from[1], vx: v[0], vy: v[1], w: o.w ?? 7, o: o.fade ?? 1 },
    d: {
      id: `legs ${across} ${up} ${pl.x} ${pl.y} ${pl.u}`,
      draw: (p) => {
        const A = at(pl, p.ax, p.ay)
        const C = at(pl, p.ax + p.vx, p.ay)
        const B = at(pl, p.ax + p.vx, p.ay + p.vy)
        return (
          <g strokeWidth={p.w} strokeLinecap="round" strokeDasharray={`${p.w * 0.4} ${p.w * 2.2}`} fill="none">
            <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke={across} />
            <line x1={C.x} y1={C.y} x2={B.x} y2={B.y} stroke={up} />
          </g>
        )
      },
    },
  }
}

/** The middles of an arrow's two steps (for their labels): across, under the step (over it for an arrow going down); up, beside it. */
export function legsAt(pl: Plane, from: Vec, v: Vec, off = 56): { across: Pt; up: Pt } {
  const A = at(pl, from[0], from[1])
  const B = at(pl, from[0] + v[0], from[1] + v[1])
  return { across: { x: (A.x + B.x) / 2, y: A.y + (v[1] >= 0 ? off : -off) }, up: { x: B.x + (v[0] >= 0 ? off : -off), y: (A.y + B.y) / 2 } }
}

// ── shapes ───────────────────────────────────────────────────────────────

/** The slanted four-sided shape two arrows span from one corner, filled; both arrows can move. */
export function spanned(k: string, pl: Plane, from: Vec, u: Vec, v: Vec, o: { pen?: Pen; shade?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  return {
    k,
    type: 'custom',
    n: { ax: from[0], ay: from[1], ux: u[0], uy: u[1], vx: v[0], vy: v[1], shade: o.shade ?? 0.28, o: o.fade ?? 1 },
    d: {
      id: `spanned ${colour} ${pl.x} ${pl.y} ${pl.u}`,
      draw: (p) => {
        const pts = [at(pl, p.ax, p.ay), at(pl, p.ax + p.ux, p.ay + p.uy), at(pl, p.ax + p.ux + p.vx, p.ay + p.uy + p.vy), at(pl, p.ax + p.vx, p.ay + p.vy)]
        return <polygon points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill={colour} fillOpacity={p.shade} stroke={colour} strokeWidth={4} strokeLinejoin="round" strokeDasharray="4 12" strokeLinecap="round" />
      },
    },
  }
}

/** The little square that marks a square corner between two arrows from one tail. */
export function corner(k: string, pl: Plane, from: Vec, u: Vec, v: Vec, o: { size?: number; fade?: number } = {}): Sprite {
  const A = at(pl, from[0], from[1])
  const unit = (w: Vec) => {
    const len = Math.hypot(w[0], w[1]) || 1
    return [w[0] / len, -w[1] / len]
  }
  const [a, b] = [unit(u), unit(v)]
  const s = o.size ?? 34
  return {
    k,
    type: 'custom',
    n: { o: o.fade ?? 1 },
    d: {
      id: `corner ${A.x} ${A.y} ${a.join(' ')} ${b.join(' ')} ${s}`,
      draw: () => <polyline points={`${A.x + a[0] * s},${A.y + a[1] * s} ${A.x + (a[0] + b[0]) * s},${A.y + (a[1] + b[1]) * s} ${A.x + b[0] * s},${A.y + b[1] * s}`} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />,
    },
  }
}

// ── a field ──────────────────────────────────────────────────────────────

/** A rule that gives an arrow at every point, with a name (two fields with the same name are drawn alike). */
export interface Field {
  id: string
  f: (x: number, y: number) => Vec
}

/**
 * A field: the rule's arrow at every crossing of the sheet (every `every`
 * units), each `scale` times its true length so neighbours do not run
 * into each other. `grow` can move from 0 to 1, so the arrows come on
 * growing.
 */
export function field(k: string, pl: Plane, rule: Field, o: { every?: number; scale?: number; pen?: Pen; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  const every = o.every ?? 1
  const scale = o.scale ?? 0.4
  const [left, down] = [pl.left ?? 0, pl.down ?? 0]
  const spots: Vec[] = []
  for (let x = -left; x <= pl.w + 1e-9; x += every) for (let y = -down; y <= pl.h + 1e-9; y += every) spots.push([x, y])
  return {
    k,
    type: 'custom',
    n: { grow: 1, w: o.w ?? 6, o: o.fade ?? 1 },
    enter: { grow: 0 },
    d: {
      id: `field ${rule.id} ${every} ${scale} ${colour} ${pl.x} ${pl.y} ${pl.u} ${pl.w} ${pl.h} ${left} ${down}`,
      draw: (p) => (
        <g stroke={colour} fill={colour} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round">
          {spots.map(([x, y], i) => {
            const [vx, vy] = rule.f(x, y)
            // Each arrow is centred on its crossing.
            const A = at(pl, x - (vx * scale * p.grow) / 2, y - (vy * scale * p.grow) / 2)
            const B = at(pl, x + (vx * scale * p.grow) / 2, y + (vy * scale * p.grow) / 2)
            const len = Math.hypot(B.x - A.x, B.y - A.y)
            if (len < 3) return <circle key={i} cx={A.x} cy={A.y} r={p.w * 0.7} stroke="none" />
            const [ux, uy] = [(B.x - A.x) / len, (B.y - A.y) / len]
            const head = Math.min(p.w * 3.4, len * 0.55)
            const neck = { x: B.x - ux * head, y: B.y - uy * head }
            const wing = head * 0.5
            return (
              <g key={i}>
                <line x1={A.x} y1={A.y} x2={neck.x} y2={neck.y} />
                <polygon points={`${B.x},${B.y} ${neck.x - uy * wing},${neck.y + ux * wing} ${neck.x + uy * wing},${neck.y - ux * wing}`} strokeWidth={p.w * 0.3} />
              </g>
            )
          })}
        </g>
      ),
    },
  }
}
