/* eslint-disable react-refresh/only-export-components -- Part 6's kit module keeps its piece sizes beside the drawings, as one unit */
/**
 * Part 6's kit: the decimal pieces and money. A tenth is a slice of the
 * golden unit bead and a hundredth a crumb of a slice: the same rounded
 * bead, its highlight and its shadow, in the decimal board's place colours,
 * which mirror around the units (tenths blue like tens, hundredths red like
 * hundreds). Money: a dollar is the unit, a dime a tenth, a penny a
 * hundredth (coins at their true relative sizes: a dime is a little
 * smaller than a penny).
 */
import type { ReactNode } from 'react'
import { clamp, mix, smooth, type Pt } from '../engine/ease'
import { BEAD, GOLD, GOLD_EDGE, INK, SANS } from './sizes'

/** Decimal board colours by place exponent: tens blue, units green, tenths blue, hundredths red. */
export const DEC_COLOUR: Record<number, string> = { 3: '#2f855a', 2: '#c53030', 1: '#2b6cb0', 0: '#2f855a', [-1]: '#2b6cb0', [-2]: '#c53030' }
/** The pieces' fills: a slice keeps the bead's warmth, tinted by its place. */
export const TENTH_FILL = '#5b8fd1'
export const TENTH_EDGE = '#2b5a96'
export const HUNDREDTH_FILL = '#d9625a'
export const HUNDREDTH_EDGE = '#9b2c2c'
/** A tenth: a slice as tall as the bead. A hundredth: a crumb, as wide as the slice. */
export const TENTH_W = 8
export const TENTH_H = BEAD
export const HUNDREDTH = 8

interface At {
  x: number
  y: number
  s?: number
  o?: number
  glow?: number
}

const g = ({ x, y, s = 1, o = 1 }: At, children: ReactNode) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    {children}
  </g>
)

/** One tenth (top-left at x, y). */
export function TenthPiece({ x, y, s = 1, o = 1, glow = 0 }: At) {
  return g(
    { x, y, s, o },
    <>
      <rect x={1} y={2} width={TENTH_W} height={TENTH_H} rx={2} fill="rgba(60,40,20,0.18)" />
      <rect x={0} y={0} width={TENTH_W} height={TENTH_H} rx={2} fill={TENTH_FILL} stroke={TENTH_EDGE} strokeWidth={1.2} />
      <rect x={2} y={3} width={3} height={5} rx={1.5} fill="rgba(255,255,255,0.45)" />
      {glow > 0 && <rect x={-3} y={-3} width={TENTH_W + 6} height={TENTH_H + 6} rx={4} fill="none" stroke="#fff6d5" strokeWidth={3} opacity={glow} />}
    </>,
  )
}

/** One hundredth (top-left at x, y). */
export function HundredthPiece({ x, y, s = 1, o = 1, glow = 0 }: At) {
  return g(
    { x, y, s, o },
    <>
      <rect x={1} y={1.5} width={HUNDREDTH} height={HUNDREDTH} rx={2} fill="rgba(60,40,20,0.18)" />
      <rect x={0} y={0} width={HUNDREDTH} height={HUNDREDTH} rx={2} fill={HUNDREDTH_FILL} stroke={HUNDREDTH_EDGE} strokeWidth={1.2} />
      <rect x={2} y={2} width={3} height={2} rx={1} fill="rgba(255,255,255,0.45)" />
      {glow > 0 && <rect x={-3} y={-3} width={HUNDREDTH + 6} height={HUNDREDTH + 6} rx={4} fill="none" stroke="#fff6d5" strokeWidth={3} opacity={glow} />}
    </>,
  )
}

/**
 * The golden unit bead, cut into `n` equal vertical slices that drift apart
 * by `spread` and shift from gold to the tenths' blue by `tint`. Drawn at
 * any size (the episodes zoom in on it): `size` is the bead's side.
 */
export function SlicedBead({
  x,
  y,
  size,
  n = 10,
  spread = 0,
  cuts = 1,
  tint = 0,
  o = 1,
  lift,
  dim,
}: {
  x: number
  y: number
  size: number
  n?: number
  spread?: number
  /** Together (no spread): how clearly the cut lines show, 0–1. */
  cuts?: number
  tint?: number
  o?: number
  /** How far slice i rises (px), and its opacity. */
  lift?: (i: number) => number
  dim?: (i: number) => number
}) {
  const w = size / n
  const r = size * 0.14
  const fill = mixColour(GOLD, TENTH_FILL, tint)
  const edge = mixColour(GOLD_EDGE, TENTH_EDGE, tint)
  const line = Math.max(1, size * 0.012)
  if (spread <= 0)
    // Still one bead: the whole, with the cuts drawn on it.
    return (
      <g opacity={o}>
        <rect x={x + size * 0.04} y={y + size * 0.06} width={size} height={size} rx={r} fill="rgba(60,40,20,0.18)" />
        <rect x={x} y={y} width={size} height={size} rx={r} fill={fill} stroke={edge} strokeWidth={line} />
        <rect x={x + size * 0.18} y={y + size * 0.14} width={size * 0.36} height={size * 0.18} rx={size * 0.09} fill="rgba(255,255,255,0.4)" opacity={1 - cuts} />
        {cuts > 0 && Array.from({ length: n - 1 }, (_, i) => <line key={i} x1={x + (i + 1) * w} y1={y} x2={x + (i + 1) * w} y2={y + size} stroke={edge} strokeWidth={line * 1.5} opacity={cuts} />)}
      </g>
    )
  const rs = Math.min(r, w * 0.3)
  return (
    <g opacity={o}>
      {Array.from({ length: n }, (_, i) => {
        const sx = x + i * (w + spread)
        const sy = y - (lift?.(i) ?? 0)
        return (
          <g key={i} opacity={dim?.(i) ?? 1}>
            <rect x={sx + size * 0.02} y={sy + size * 0.04} width={w} height={size} rx={rs} fill="rgba(60,40,20,0.18)" />
            <rect x={sx} y={sy} width={w} height={size} rx={rs} fill={fill} stroke={edge} strokeWidth={line} />
          </g>
        )
      })}
    </g>
  )
}

/** A colour between a and b (hex), by k. */
export function mixColour(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const kk = clamp(k)
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * kk)).join(',')})`
}

// ——— money ———
export const BILL_W = 120
export const BILL_H = 54
export const DIME_R = 18
export const PENNY_R = 19

/** A bill of $1 or $10 (top-left at x, y). */
export function Bill({ x, y, value = 1, s = 1, o = 1, glow = 0 }: At & { value?: 1 | 10 }) {
  return g(
    { x, y, s, o },
    <>
      <rect x={2} y={3} width={BILL_W} height={BILL_H} rx={5} fill="rgba(60,40,20,0.18)" />
      <rect x={0} y={0} width={BILL_W} height={BILL_H} rx={5} fill={value === 10 ? '#cfe3c4' : '#dcebcf'} stroke="#4b7a45" strokeWidth={2} />
      <rect x={6} y={6} width={BILL_W - 12} height={BILL_H - 12} rx={3} fill="none" stroke="#7aa36f" strokeWidth={1.5} />
      <ellipse cx={BILL_W / 2} cy={BILL_H / 2} rx={15} ry={17} fill="#b9d3aa" stroke="#7aa36f" strokeWidth={1.5} />
      <text x={16} y={BILL_H / 2 + 1} fontFamily={SANS} fontWeight={800} fontSize={20} fill="#2f5a2a" textAnchor="middle" dominantBaseline="middle">
        {value}
      </text>
      <text x={BILL_W - 16} y={BILL_H / 2 + 1} fontFamily={SANS} fontWeight={800} fontSize={20} fill="#2f5a2a" textAnchor="middle" dominantBaseline="middle">
        {value}
      </text>
      {glow > 0 && <rect x={-4} y={-4} width={BILL_W + 8} height={BILL_H + 8} rx={7} fill="none" stroke="#fff6d5" strokeWidth={3} opacity={glow} />}
    </>,
  )
}

/** A dime or a penny (centre at x, y). */
export function Coin({ x, y, kind, s = 1, o = 1, glow = 0 }: At & { kind: 'dime' | 'penny' }) {
  const r = kind === 'dime' ? DIME_R : PENNY_R
  const [fill, edge, ink] = kind === 'dime' ? ['#d5d8dc', '#8f959c', '#4b5158'] : ['#c27a46', '#8a4f26', '#5e3416']
  return g(
    { x, y, s, o },
    <>
      <circle cx={1.5} cy={2} r={r} fill="rgba(60,40,20,0.2)" />
      <circle cx={0} cy={0} r={r} fill={fill} stroke={edge} strokeWidth={2} />
      <circle cx={0} cy={0} r={r - 4} fill="none" stroke={edge} strokeWidth={1} opacity={0.6} />
      <text x={0} y={1} fontFamily={SANS} fontWeight={800} fontSize={kind === 'dime' ? 12 : 13} fill={ink} textAnchor="middle" dominantBaseline="middle">
        {kind === 'dime' ? '10¢' : '1¢'}
      </text>
      {glow > 0 && <circle cx={0} cy={0} r={r + 4} fill="none" stroke="#fff6d5" strokeWidth={3} opacity={glow} />}
    </>,
  )
}

/**
 * The exchange for Part 6's pieces, timed exactly as kit/exchange.tsx:
 *   0.00–0.60 the pieces glide into their slots (staggered a little),
 *   0.60–0.75 they glow, together, 0.75–1.00 the whole fades in over them.
 * `reverse` is a break. `piece` and `whole` draw at a point; `slot(i)` is
 * piece i's place inside the whole, relative to `to`.
 */
export function fuse({
  from,
  to,
  progress,
  reverse = false,
  piece,
  whole,
  slot,
}: {
  from: Pt[]
  to: Pt
  progress: number
  reverse?: boolean
  piece: (at: Pt, glow: number, i: number) => ReactNode
  whole: (at: Pt, o: number) => ReactNode
  slot: (i: number) => Pt
}): ReactNode {
  const k = reverse ? 1 - clamp(progress) : clamp(progress)
  const n = from.length
  const glow = smooth(clamp((k - 0.6) / 0.15)) * (1 - smooth(clamp((k - 0.85) / 0.15)))
  const fade = smooth(clamp((k - 0.75) / 0.25))
  return (
    <g>
      {from.map((f, i) => {
        const start = (i / n) * 0.15
        const m = smooth(clamp((k - start) / (0.6 - 0.15)))
        const s = slot(i)
        return (
          <g key={i} opacity={1 - fade}>
            {piece(mix(f, { x: to.x + s.x, y: to.y + s.y }, m), glow, i)}
          </g>
        )
      })}
      {fade > 0 && whole(to, fade)}
    </g>
  )
}

/** A plain label in the scene's ink (used for the place names under the pieces). */
export function Label({ text, x, y, o = 1, size = 34, colour = INK }: { text: string; x: number; y: number; o?: number; size?: number; colour?: string }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={700} fontSize={size} fill={colour} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}
