/**
 * Stage 3's things: a lamp (lit, a statement is true; dark, it is false),
 * a loop round the members of a set, two loops that overlap with a part
 * shaded, and dots with arrows between them (a map from one set to
 * another). All are sprites, so they move and fade like the beads; a set's
 * name and its members are tokens, so the path's rule about which signs an
 * explainer may show holds for them too.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { items, type Tok } from './glyphs'
import { GOLD, GOLD_EDGE, INK, WOOD, WOOD_DARK } from './look'
import { tint, type Sprite } from './sprites'

/** The colours of loops and arrows: ink, or one of the bead colours' dark edges. */
export const PEN = { ink: INK, blue: '#2f6394', red: '#9c3c2b', green: '#3c7a41', gold: GOLD_EDGE }
export type Pen = keyof typeof PEN

// ── the lamp ─────────────────────────────────────────────────────────────

/**
 * A lamp on its foot, its glass's middle at (x, y). `on` true, it is lit
 * (true); false, dark (false); null, not yet known (only its outline).
 */
export function lamp(k: string, x: number, y: number, on: boolean | null, o: { r?: number; fade?: number } = {}): Sprite {
  return {
    k,
    type: 'custom',
    n: { x, y, r: o.r ?? 46, on: on ? 1 : 0, known: on === null ? 0 : 1, o: o.fade ?? 1 },
    d: {
      id: 'lamp',
      draw: (p) => {
        const r = p.r
        return (
          <g transform={`translate(${p.x} ${p.y})`}>
            <circle r={r * 1.55} fill="#ffd54a" opacity={0.3 * p.on} />
            <g stroke="#e9b524" strokeWidth={r * 0.12} strokeLinecap="round" opacity={p.on}>
              {Array.from({ length: 7 }, (_, i) => {
                const a = Math.PI * (1 + i / 6)
                return <line key={i} x1={Math.cos(a) * r * 1.3} y1={Math.sin(a) * r * 1.3} x2={Math.cos(a) * r * 1.62} y2={Math.sin(a) * r * 1.62} />
              })}
            </g>
            <rect x={-r * 0.5} y={r * 0.8} width={r} height={r * 0.52} rx={r * 0.1} fill={WOOD} stroke={WOOD_DARK} strokeWidth={r * 0.08} />
            <circle r={r} fill={tint('#efe6d4', tint('#857a6c', '#ffd54a', p.on), p.known)} stroke={tint(INK, GOLD_EDGE, p.on)} strokeWidth={r * 0.12} strokeDasharray={p.known < 0.5 ? `${r * 0.3} ${r * 0.22}` : undefined} />
            <path d={`M ${-r * 0.58} ${-r * 0.2} A ${r * 0.62} ${r * 0.62} 0 0 1 ${-r * 0.2} ${-r * 0.58}`} fill="none" stroke="#fff" strokeWidth={r * 0.1} strokeLinecap="round" opacity={0.25 + 0.45 * p.on} />
          </g>
        )
      },
    },
  }
}

// ── a set: a loop and its members ────────────────────────────────────────

export interface Loop {
  x: number
  y: number
  rx: number
  ry: number
}

/**
 * A loop round a set. Its `name` (a capital letter) stands just outside it,
 * up on the left unless `nameAt` says where; `shade` fills it (0 to 1).
 */
export function loop(k: string, l: Loop, o: { name?: string; nameAt?: Pt; nameSize?: number; pen?: Pen; shade?: number; gold?: boolean; fade?: number } = {}): Sprite[] {
  const colour = PEN[o.pen ?? 'ink']
  const size = o.nameSize ?? 96
  const out: Sprite[] = [
    {
      k,
      type: 'custom',
      n: { x: l.x, y: l.y, rx: l.rx, ry: l.ry, shade: o.shade ?? 0, o: o.fade ?? 1 },
      d: {
        id: `loop ${colour}`,
        draw: (p) => (
          <g>
            <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#fbf6ea" opacity={0.6} />
            <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={GOLD} opacity={0.4 * p.shade} />
            <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="none" stroke={colour} strokeWidth={8} />
          </g>
        ),
      },
    },
  ]
  if (o.name) {
    const at = o.nameAt ?? { x: l.x - l.rx * 0.74 - size * 0.42, y: l.y - l.ry * 0.74 - size * 0.36 }
    out.push({ k: `${k}/name`, type: 'tok', n: { x: at.x, y: at.y, size, o: o.fade ?? 1, gold: o.gold ? 1 : 0 }, d: { it: items([o.name])[0] } })
  }
  return out
}

/** One member (or a thing left outside): a token at its own place. Keep its name on the next step, and it slides there. */
export const member = (k: string, tok: Tok, at: Pt, o: { size?: number; gold?: boolean; fade?: number } = {}): Sprite => ({ k, type: 'tok', n: { x: at.x, y: at.y, size: o.size ?? 100, o: o.fade ?? 1, gold: o.gold ? 1 : 0 }, d: { it: items([tok])[0] } })

/** Places for n members inside a loop: one in the middle, or n round a ring (the first up on the left). `r` is the ring's size as a part of the loop's. */
export function around(l: Loop, n: number, r = 0.5): Pt[] {
  if (n === 1) return [{ x: l.x, y: l.y }]
  return Array.from({ length: n }, (_, i) => {
    const a = Math.PI * (n === 2 ? 1 : 1.25) + (i * 2 * Math.PI) / n
    return { x: l.x + Math.cos(a) * l.rx * r, y: l.y + Math.sin(a) * l.ry * r }
  })
}

/** Members set in a loop, named `${k}${i}`. */
export const membersIn = (k: string, l: Loop, toks: Tok[], o: { size?: number; r?: number; gold?: number[]; fade?: number } = {}): Sprite[] => {
  const pts = around(l, toks.length, o.r)
  return toks.map((tok, i) => member(`${k}${i}`, tok, pts[i], { size: o.size, gold: o.gold?.includes(i), fade: o.fade }))
}

// ── two sets that overlap ────────────────────────────────────────────────

/** Two round loops of radius r, their middles at x ∓ d. */
export interface Venn {
  x: number
  y: number
  r: number
  d: number
}

/** The middle of each part: only in the left set, in both, only in the right. */
export const vennAt = (v: Venn, part: 'a' | 'both' | 'b'): Pt => ({ x: part === 'both' ? v.x : v.x + (part === 'a' ? -1 : 1) * (v.d + v.r) * 0.5, y: v.y })

/** The two loops, with any of their three parts shaded (0 to 1 each), and their names over them. */
export function venn(k: string, v: Venn, o: { shade?: { a?: number; both?: number; b?: number }; names?: [string, string]; nameSize?: number; pens?: [Pen, Pen]; fade?: number } = {}): Sprite[] {
  const [left, right] = (o.pens ?? ['blue', 'red']).map((pen) => PEN[pen])
  const size = o.nameSize ?? 96
  const out: Sprite[] = [
    {
      k,
      type: 'custom',
      n: { x: v.x, y: v.y, r: v.r, d: v.d, a: o.shade?.a ?? 0, both: o.shade?.both ?? 0, b: o.shade?.b ?? 0, o: o.fade ?? 1 },
      d: {
        id: `venn ${left} ${right}`,
        draw: (p) => {
          const h = Math.sqrt(Math.max(0, p.r * p.r - p.d * p.d))
          const top = `${p.x} ${p.y - h}`
          const bot = `${p.x} ${p.y + h}`
          const arc = (big: number, sweep: number, to: string) => `A ${p.r} ${p.r} 0 ${big} ${sweep} ${to}`
          return (
            <g>
              <circle cx={p.x - p.d} cy={p.y} r={p.r} fill="#fbf6ea" opacity={0.6} />
              <circle cx={p.x + p.d} cy={p.y} r={p.r} fill="#fbf6ea" opacity={0.6} />
              <path d={`M ${top} ${arc(1, 0, bot)} ${arc(0, 1, top)} Z`} fill={GOLD} opacity={0.5 * p.a} />
              <path d={`M ${top} ${arc(0, 1, bot)} ${arc(0, 1, top)} Z`} fill={GOLD} opacity={0.5 * p.both} />
              <path d={`M ${top} ${arc(1, 1, bot)} ${arc(0, 0, top)} Z`} fill={GOLD} opacity={0.5 * p.b} />
              <circle cx={p.x - p.d} cy={p.y} r={p.r} fill="none" stroke={left} strokeWidth={8} />
              <circle cx={p.x + p.d} cy={p.y} r={p.r} fill="none" stroke={right} strokeWidth={8} />
            </g>
          )
        },
      },
    },
  ]
  o.names?.forEach((name, i) => out.push({ k: `${k}/name${i}`, type: 'tok', n: { x: v.x + (i ? 1 : -1) * (v.d + v.r * 0.82), y: v.y - v.r * 0.82 - size * 0.3, size, o: o.fade ?? 1, gold: 0 }, d: { it: items([name])[0] } }))
  return out
}

// ── dots and arrows ──────────────────────────────────────────────────────

/** A plain dot: a point, or a thing with no number on it. */
export const dot = (k: string, at: Pt, o: { r?: number; pen?: Pen; fade?: number } = {}): Sprite => {
  const colour = PEN[o.pen ?? 'ink']
  return { k, type: 'custom', n: { x: at.x, y: at.y, r: o.r ?? 14, o: o.fade ?? 1 }, d: { id: `dot ${colour}`, draw: (p) => <circle cx={p.x} cy={p.y} r={p.r} fill={colour} /> } }
}

/**
 * An arrow from one place to another, stopping `gap` short of each so it
 * does not touch what stands there. `bend` bows it (to its left for a
 * positive one, in pixels).
 */
export function arrow(k: string, from: Pt, to: Pt, o: { bend?: number; gap?: number; pen?: Pen; w?: number; fade?: number } = {}): Sprite {
  const colour = PEN[o.pen ?? 'ink']
  return {
    k,
    type: 'custom',
    n: { x1: from.x, y1: from.y, x2: to.x, y2: to.y, bend: o.bend ?? 0, gap: o.gap ?? 60, w: o.w ?? 8, o: o.fade ?? 1 },
    d: {
      id: `arrow ${colour}`,
      draw: (p) => {
        const dx = p.x2 - p.x1
        const dy = p.y2 - p.y1
        const len = Math.hypot(dx, dy) || 1
        const [ux, uy] = [dx / len, dy / len]
        // The bow's control point, off the middle; the ends are pulled in along the lines to it.
        const cx = (p.x1 + p.x2) / 2 + uy * p.bend * 2
        const cy = (p.y1 + p.y2) / 2 - ux * p.bend * 2
        const pull = (x: number, y: number) => {
          const d = Math.hypot(cx - x, cy - y) || 1
          return [x + ((cx - x) / d) * p.gap, y + ((cy - y) / d) * p.gap]
        }
        const [ax, ay] = pull(p.x1, p.y1)
        const [bx, by] = pull(p.x2, p.y2)
        const a = Math.atan2(by - cy, bx - cx)
        const head = p.w * 3.2
        const wing = (turn: number) => `${bx - Math.cos(a + turn) * head} ${by - Math.sin(a + turn) * head}`
        return (
          <g fill="none" stroke={colour} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round">
            <path d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`} />
            <path d={`M ${wing(0.5)} L ${bx} ${by} L ${wing(-0.5)}`} />
          </g>
        )
      },
    },
  }
}
