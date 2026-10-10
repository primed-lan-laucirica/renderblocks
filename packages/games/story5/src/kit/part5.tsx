/**
 * Part 5's drawings, built on the kit's fraction circle: a circle cut into
 * equal parts (and drawn apart), the cut lines themselves, a fraction whose
 * numerator or denominator can be picked out, and a fraction strip on the
 * track. Pure: everything is drawn from its props.
 */
import { FractionPiece } from './kit'
import { FRAC_R, INK, SANS } from './sizes'

const CUT = '#7a1f1f'

/**
 * A circle cut into d equal pieces, each moved `sep` px out along its middle
 * (0: a whole-looking circle with its cuts showing). `lit(k)` is each piece's
 * opacity (dimmed pieces are the ones not being counted).
 */
export function CutCircle({ d, cx, cy, r = FRAC_R, sep = 0, o = 1, colour, lit }: { d: number; cx: number; cy: number; r?: number; sep?: number; o?: number; colour?: string; lit?: (k: number) => number }) {
  if (o <= 0) return null
  return (
    <g opacity={o}>
      {Array.from({ length: d }, (_, k) => {
        const mid = -Math.PI / 2 + ((k + 0.5) / d) * Math.PI * 2
        const dx = d > 1 ? Math.cos(mid) * sep : 0
        const dy = d > 1 ? Math.sin(mid) * sep : 0
        return <FractionPiece key={k} d={d} k={k} cx={cx + dx} cy={cy + dy} r={r} colour={colour} o={lit ? lit(k) : 1} />
      })}
    </g>
  )
}

/** Cut lines being drawn from the centre out (`grow` 0 → 1), at each k/d of a turn from `from` to `to` (inclusive). */
export function CutLines({ d, cx, cy, r = FRAC_R, grow = 1, from = 0, to, o = 1, colour = CUT }: { d: number; cx: number; cy: number; r?: number; grow?: number; from?: number; to?: number; o?: number; colour?: string }) {
  if (grow <= 0 || o <= 0) return null
  const last = to ?? d - 1
  return (
    <g opacity={o} stroke={colour} strokeWidth={3} strokeLinecap="round">
      {Array.from({ length: last - from + 1 }, (_, i) => {
        const a = -Math.PI / 2 + ((from + i) / d) * Math.PI * 2
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r * grow} y2={cy + Math.sin(a) * r * grow} />
      })}
    </g>
  )
}

/**
 * A fraction in standard notation ("3/4"), with its numerator or its
 * denominator picked out in colour (the one being talked about).
 */
export function FracText({ n, d, x = 960, y = 900, size = 96, o = 1, hi, colour = INK }: { n: number | string; d: number | string; x?: number; y?: number; size?: number; o?: number; hi?: 'n' | 'd'; colour?: string }) {
  if (o <= 0) return null
  const HI = '#c8643b'
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={800} fontSize={size} fill={colour} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      <tspan fill={hi === 'n' ? HI : colour}>{n}</tspan>
      <tspan>/</tspan>
      <tspan fill={hi === 'd' ? HI : colour}>{d}</tspan>
    </text>
  )
}

/** A fraction strip lying on the track: `len` px long, its left end at (x, y top). */
export function Strip({ x, y, len, h = 40, o = 1, glow = 0, colour = '#d63b3b' }: { x: number; y: number; len: number; h?: number; o?: number; glow?: number; colour?: string }) {
  if (o <= 0) return null
  return (
    <g opacity={o}>
      <rect x={x + 3} y={y + 4} width={len} height={h} rx={4} fill="rgba(60,40,20,0.18)" />
      <rect x={x} y={y} width={len} height={h} rx={4} fill={colour} stroke={CUT} strokeWidth={3} />
      {glow > 0 && <rect x={x - 4} y={y - 4} width={len + 8} height={h + 8} rx={7} fill="none" stroke="#fff6d5" strokeWidth={6} opacity={glow} />}
    </g>
  )
}

/** A bracket over a stretch of the track (x0 → x1, at y), labelled above. */
export function Bracket({ x0, x1, y, label, o = 1 }: { x0: number; x1: number; y: number; label: string; o?: number }) {
  if (o <= 0) return null
  return (
    <g opacity={o}>
      <path d={`M ${x0 + 4} ${y + 14} L ${x0 + 4} ${y} L ${x1 - 4} ${y} L ${x1 - 4} ${y + 14}`} fill="none" stroke={INK} strokeWidth={3} />
      <text x={(x0 + x1) / 2} y={y - 26} fontFamily={SANS} fontWeight={800} fontSize={44} fill={INK} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  )
}

/** A fraction label: plain, smaller notation (on the track, under a circle). */
export function Label({ text, x, y, size = 40, o = 1, colour = INK }: { text: string; x: number; y: number; size?: number; o?: number; colour?: string }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={700} fontSize={size} fill={colour} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}
