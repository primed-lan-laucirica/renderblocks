/**
 * The kit: every manipulative in the series, drawn once, at one size and one
 * colour, in the 1920 × 1080 scene space. Episodes and workshops use only
 * these, so a ten bar in Episode 5 is the same ten bar in the Bead Bank.
 *
 * Unit beads take the drill games' counting cube (FactReveal): a flat
 * rounded square, 3 px radius at 22 px, with a soft shadow. Here they're
 * gold. The number track takes Calc's number line styling.
 */
import type { ReactNode } from 'react'
import { rng } from '../engine/ease'
import { BAR, BAR_COLOURS, BEAD, BEAD_R, CARD_H, DECIMAL_PLACES, DIGIT_W, FRAC_R, GAP, GOLD, GOLD_EDGE, INK, PAPER, PEBBLE_COLOURS, PLACE_COLOUR, ROD_UNIT, SANS, SOFT, TILE, TILE_COLOUR, WIRE } from './sizes'

interface At {
  x: number
  y: number
  /** Scale about (x, y). */
  s?: number
  o?: number
}

const g = ({ x, y, s = 1, o = 1 }: At, children: ReactNode) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    {children}
  </g>
)

/** A paper background for the scenes. */
export function Paper() {
  return <rect x={0} y={0} width={1920} height={1080} fill={PAPER} />
}

/** A caption: a line of plain text, centred. */
export function Caption({ text, x = 960, y = 150, o = 1, size = 54 }: { text: string; x?: number; y?: number; o?: number; size?: number }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y + (1 - o) * 18} fontFamily={SANS} fontWeight={600} fontSize={size} fill={INK} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}

/** Standard notation: big, plain, centred. */
export function Notation({ text, x = 960, y = 900, o = 1, size = 96, colour = INK }: { text: string; x?: number; y?: number; o?: number; size?: number; colour?: string }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={800} fontSize={size} fill={colour} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}

/** A pebble (seeded shape, so it's the same pebble every frame). */
export function Pebble({ x, y, r = 22, colour, seed = 1, o = 1 }: { x: number; y: number; r?: number; colour?: string; seed?: number; o?: number }) {
  // Its shape comes from its seed: the same pebble every frame.
  const q = rng(seed)
  const sx = 1 + q() * 0.25
  const sy = 0.78 + q() * 0.12
  const rot = (q() - 0.5) * 0.8 * (180 / Math.PI)
  const fill = colour ?? PEBBLE_COLOURS[seed % 5]
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
      <ellipse cx={4} cy={r * 0.55} rx={r * sx} ry={r * sy * 0.5} fill="rgba(60,40,20,0.18)" />
      <ellipse cx={0} cy={0} rx={r * sx} ry={r * sy} fill={fill} />
      <ellipse cx={-r * 0.3} cy={-r * 0.3} rx={r * 0.32} ry={r * 0.2} fill="rgba(255,255,255,0.35)" transform={`rotate(-29 ${-r * 0.3} ${-r * 0.3})`} />
    </g>
  )
}

/** One golden unit bead (top-left at x, y). */
export function UnitBead({ x, y, s = 1, o = 1, glow = 0 }: At & { glow?: number }) {
  return g(
    { x, y, s, o },
    <>
      <rect x={1} y={2} width={BEAD} height={BEAD} rx={3} fill="rgba(60,40,20,0.18)" />
      <rect x={0} y={0} width={BEAD} height={BEAD} rx={3} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      <rect x={4} y={3} width={8} height={4} rx={2} fill="rgba(255,255,255,0.45)" />
      {glow > 0 && <rect x={-3} y={-3} width={BEAD + 6} height={BEAD + 6} rx={5} fill="none" stroke="#fff6d5" strokeWidth={3} opacity={glow} />}
    </>,
  )
}

/** A ten bar: ten beads on a wire, standing (top-left at x, y). */
export function TenBar({ x, y, s = 1, o = 1, flat = false }: At & { flat?: boolean }) {
  const beads = Array.from({ length: 10 }, (_, i) => (flat ? <UnitBead key={i} x={i * (BEAD + GAP)} y={0} /> : <UnitBead key={i} x={0} y={i * (BEAD + GAP)} />))
  return g(
    { x, y, s, o },
    flat ? (
      <>
        <line x1={-5} y1={BEAD / 2} x2={BAR + 5} y2={BEAD / 2} stroke={WIRE} strokeWidth={3} strokeLinecap="round" />
        {beads}
      </>
    ) : (
      <>
        <line x1={BEAD / 2} y1={-5} x2={BEAD / 2} y2={BAR + 5} stroke={WIRE} strokeWidth={3} strokeLinecap="round" />
        {beads}
      </>
    ),
  )
}

/** A hundred square: ten ten bars side by side, wired into a frame. */
export function HundredSquare({ x, y, s = 1, o = 1 }: At) {
  return g(
    { x, y, s, o },
    <>
      <rect x={-5} y={-5} width={BAR + 10} height={BAR + 10} rx={4} fill="none" stroke={WIRE} strokeWidth={3} />
      {Array.from({ length: 10 }, (_, i) => (
        <TenBar key={i} x={i * (BEAD + GAP)} y={0} />
      ))}
    </>,
  )
}

/** A thousand cube: ten hundred squares stacked, drawn in an oblique view (front face at x, y). */
export function ThousandCube({ x, y, s = 1, o = 1 }: At) {
  const d = BAR * 0.5
  const grid = (n: number) => Array.from({ length: n - 1 }, (_, i) => (i + 1) * (BAR / n))
  return g(
    { x, y, s, o },
    <>
      {/* top */}
      <polygon points={`0,0 ${d},${-d} ${BAR + d},${-d} ${BAR},0`} fill="#efc35a" stroke={GOLD_EDGE} strokeWidth={2} />
      {/* side */}
      <polygon points={`${BAR},0 ${BAR + d},${-d} ${BAR + d},${BAR - d} ${BAR},${BAR}`} fill="#c38d1f" stroke={GOLD_EDGE} strokeWidth={2} />
      {/* front */}
      <rect x={0} y={0} width={BAR} height={BAR} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={2} />
      {grid(10).map((v) => (
        <g key={v} stroke="rgba(120,80,20,0.45)" strokeWidth={1}>
          <line x1={v} y1={0} x2={v} y2={BAR} />
          <line x1={0} y1={v} x2={BAR} y2={v} />
          <line x1={v} y1={0} x2={v + d} y2={-d} />
          <line x1={BAR + (v / BAR) * d} y1={-(v / BAR) * d} x2={BAR + (v / BAR) * d} y2={BAR - (v / BAR) * d} />
        </g>
      ))}
    </>,
  )
}

/**
 * A numeral card: its digits in its place's colour, as wide as its digits.
 * Cards for 1000, 300, 40 and 5 laid right-aligned on one spot nest into
 * 1345 (each covers the zeros of the one beneath). Every digit sits centred
 * in a fixed column DIGIT_W wide, counted from the right, and a card's left
 * edge falls just past its own leftmost column; so a card covers exactly the
 * columns of its own digits, whatever the font's widths.
 */
export function NumeralCard({ value, right, y, s = 1, o = 1 }: { value: number; right: number; y: number; s?: number; o?: number }) {
  const digits = String(value)
  const n = digits.length
  const place = n - 1
  const PAD = 8
  const w = n * DIGIT_W + PAD + 2
  return g(
    { x: right, y, s, o },
    <>
      <rect x={-w + 3} y={4} width={w} height={CARD_H} rx={8} fill="rgba(60,40,20,0.15)" />
      <rect x={-w} y={0} width={w} height={CARD_H} rx={8} fill="#fbf6ea" stroke="#d8c8a6" strokeWidth={2} />
      {[...digits].map((d, i) => (
        <text
          key={i}
          x={-PAD - (n - 1 - i + 0.5) * DIGIT_W}
          y={CARD_H / 2 + 4}
          fontFamily={SANS}
          fontWeight={800}
          fontSize={76}
          fill={PLACE_COLOUR[place % 4]}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {d}
        </text>
      ))}
    </>,
  )
}

/** A stamp-game tile: a square stamped with 1, 10, 100 or 1000 in its place's colour. */
export function StampTile({ value, x, y, s = 1, o = 1 }: { value: 1 | 10 | 100 | 1000 } & At) {
  const place = String(value).length - 1
  return g(
    { x, y, s, o },
    <>
      <rect x={2} y={3} width={TILE} height={TILE} rx={8} fill="rgba(60,40,20,0.18)" />
      <rect x={0} y={0} width={TILE} height={TILE} rx={8} fill={TILE_COLOUR[place]} />
      <text x={TILE / 2} y={TILE / 2 + 2} fontFamily={SANS} fontWeight={800} fontSize={value >= 1000 ? 20 : value >= 100 ? 24 : 30} fill="#fff" textAnchor="middle" dominantBaseline="middle">
        {value}
      </text>
    </>,
  )
}

/** A number rod: n segments, red and blue in turn (left end at x, y). */
export function NumberRod({ n, x, y, s = 1, o = 1 }: { n: number } & At) {
  return g(
    { x, y, s, o },
    <>
      <rect x={3} y={4} width={n * ROD_UNIT} height={30} rx={4} fill="rgba(60,40,20,0.18)" />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={i * ROD_UNIT} y={0} width={ROD_UNIT} height={30} fill={i % 2 ? '#2b6cb0' : '#c53030'} />
      ))}
    </>,
  )
}

/** A number track in Calc's number line style: axis, ticks, labels (0 at x, `unit` px per one). */
export function NumberTrack({ x, y, from = 0, to = 10, unit = ROD_UNIT, o = 1, labels = true }: { x: number; y: number; from?: number; to?: number; unit?: number; o?: number; labels?: boolean }) {
  const ticks = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  return (
    <g opacity={o}>
      <line x1={x + from * unit - 20} y1={y} x2={x + to * unit + 20} y2={y} stroke="#475569" strokeWidth={4} strokeLinecap="round" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x + v * unit} y1={y - 12} x2={x + v * unit} y2={y + 12} stroke="#475569" strokeWidth={3} />
          {labels && (
            <text x={x + v * unit} y={y + 44} fontFamily={SANS} fontWeight={600} fontSize={30} fill="#475569" textAnchor="middle">
              {v}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}

/** The hundred board: 1–100 in a 10 × 10 grid; the first `filled` numbers shaded. */
export function HundredBoard({ x, y, cell = 64, filled = 0, o = 1 }: { x: number; y: number; cell?: number; filled?: number; o?: number }) {
  return (
    <g opacity={o}>
      {Array.from({ length: 100 }, (_, i) => (
        <g key={i}>
          <rect x={x + (i % 10) * cell} y={y + Math.floor(i / 10) * cell} width={cell - 4} height={cell - 4} rx={6} fill={i < filled ? '#fde68a' : '#fbf6ea'} stroke="#d8c8a6" strokeWidth={2} />
          <text x={x + (i % 10) * cell + (cell - 4) / 2} y={y + Math.floor(i / 10) * cell + (cell - 4) / 2 + 2} fontFamily={SANS} fontWeight={700} fontSize={cell * 0.38} fill={INK} textAnchor="middle" dominantBaseline="middle">
            {i + 1}
          </text>
        </g>
      ))}
    </g>
  )
}

/** A balance: the beam tilted by `tilt` degrees (positive: the right pan drops), pans' contents drawn by the caller. */
export function Balance({ x, y, tilt = 0, o = 1, left, right }: { x: number; y: number; tilt?: number; o?: number; left?: ReactNode; right?: ReactNode }) {
  const arm = 340
  const rad = (tilt * Math.PI) / 180
  const lx = x - Math.cos(rad) * arm
  const ly = y - Math.sin(rad) * arm
  const rx = x + Math.cos(rad) * arm
  const ry = y + Math.sin(rad) * arm
  const pan = (px: number, py: number, content?: ReactNode) => (
    <g>
      <line x1={px} y1={py} x2={px - 90} y2={py + 120} stroke={SOFT} strokeWidth={3} />
      <line x1={px} y1={py} x2={px + 90} y2={py + 120} stroke={SOFT} strokeWidth={3} />
      <path d={`M ${px - 120} ${py + 120} Q ${px} ${py + 175} ${px + 120} ${py + 120} Z`} fill="#9a6b45" />
      <g transform={`translate(${px} ${py + 118})`}>{content}</g>
    </g>
  )
  return (
    <g opacity={o}>
      <polygon points={`${x},${y} ${x - 70},${y + 330} ${x + 70},${y + 330}`} fill="#8b6a4a" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#6b4f35" strokeWidth={14} strokeLinecap="round" />
      <circle cx={x} cy={y} r={14} fill="#d9a441" />
      {pan(lx, ly, left)}
      {pan(rx, ry, right)}
    </g>
  )
}

/** A coloured bead bar of n round beads on a wire (left end at x, y). */
export function BeadBar({ n, x, y, s = 1, o = 1 }: { n: number } & At) {
  const c = BAR_COLOURS[n - 1]
  return g(
    { x, y, s, o },
    <>
      <line x1={-4} y1={0} x2={(n - 1) * BEAD_R * 2 + 4} y2={0} stroke={WIRE} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <circle cx={i * BEAD_R * 2} cy={1.5} r={BEAD_R} fill="rgba(60,40,20,0.18)" />
          <circle cx={i * BEAD_R * 2} cy={0} r={BEAD_R} fill={c} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
        </g>
      ))}
    </>,
  )
}

/** A bead chain: `bars` bars of n, linked end to end in a row. */
export function BeadChain({ n, bars, x, y, o = 1 }: { n: number; bars: number; x: number; y: number; o?: number }) {
  const len = n * BEAD_R * 2 + 10
  return (
    <g opacity={o}>
      {Array.from({ length: bars }, (_, i) => (
        <g key={i}>
          <BeadBar n={n} x={x + i * len} y={y} />
          {i < bars - 1 && <circle cx={x + i * len + (n - 1) * BEAD_R * 2 + 5 + BEAD_R} cy={y} r={4} fill="none" stroke={WIRE} strokeWidth={2} />}
        </g>
      ))}
    </g>
  )
}

/** The bead board: a 10 × 10 grid of holes, with beads in the first `rows` × `cols`. */
export function BeadBoard({ x, y, rows = 0, cols = 0, cell = 44, o = 1 }: { x: number; y: number; rows?: number; cols?: number; cell?: number; o?: number }) {
  return (
    <g opacity={o}>
      <rect x={x - 20} y={y - 20} width={cell * 10 + 40} height={cell * 10 + 40} rx={10} fill="#c9a77a" />
      {Array.from({ length: 100 }, (_, i) => {
        const r = Math.floor(i / 10)
        const c = i % 10
        const on = r < rows && c < cols
        return <circle key={i} cx={x + c * cell + cell / 2} cy={y + r * cell + cell / 2} r={on ? cell * 0.36 : cell * 0.12} fill={on ? '#d63b3b' : '#8a6a45'} />
      })}
    </g>
  )
}

/** A skittle: the pin the beads are dealt to (base centre at x, y). */
export function Skittle({ x, y, colour = '#2b6cb0', o = 1 }: { x: number; y: number; colour?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={o}>
      <path d="M -28 0 C -40 -40 -14 -70 -16 -96 C -18 -112 -28 -122 -20 -140 C -12 -156 12 -156 20 -140 C 28 -122 18 -112 16 -96 C 14 -70 40 -40 28 0 Z" fill={colour} />
      <ellipse cx={0} cy={-128} rx={9} ry={6} fill="rgba(255,255,255,0.35)" />
    </g>
  )
}

/** One piece of a fraction circle: the k-th of d equal wedges of a circle at (cx, cy). */
export function FractionPiece({ d, k, cx, cy, r = FRAC_R, o = 1, colour = '#d63b3b' }: { d: number; k: number; cx: number; cy: number; r?: number; o?: number; colour?: string }) {
  const a0 = -Math.PI / 2 + (k / d) * Math.PI * 2
  const a1 = -Math.PI / 2 + ((k + 1) / d) * Math.PI * 2
  if (d === 1)
    return (
      <g opacity={o}>
        <circle cx={cx} cy={cy} r={r} fill={colour} stroke="#7a1f1f" strokeWidth={3} />
      </g>
    )
  const path = `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`
  return (
    <g opacity={o}>
      <path d={path} fill={colour} stroke="#7a1f1f" strokeWidth={3} strokeLinejoin="round" />
    </g>
  )
}

/** The frame a fraction circle sits in (an empty round hole in a green square). */
export function FractionFrame({ cx, cy, r = FRAC_R, o = 1 }: { cx: number; cy: number; r?: number; o?: number }) {
  return (
    <g opacity={o}>
      <rect x={cx - r - 30} y={cy - r - 30} width={2 * r + 60} height={2 * r + 60} rx={14} fill="#3f7a4f" />
      <circle cx={cx} cy={cy} r={r + 3} fill="#2c5638" />
    </g>
  )
}

/** The decimal board: columns either side of the point, headed by place. */
export function DecimalBoard({ x, y, col = 200, height = 520, o = 1 }: { x: number; y: number; col?: number; height?: number; o?: number }) {
  const colours = ['#2f855a', '#c53030', '#2b6cb0', '#2f855a', '#2b6cb0', '#c53030', '#2f855a']
  return (
    <g opacity={o}>
      {DECIMAL_PLACES.map((name, i) => (
        <g key={name}>
          <rect x={x + i * col + (i > 3 ? 24 : 0)} y={y} width={col - 8} height={height} rx={10} fill="#fbf6ea" stroke="#d8c8a6" strokeWidth={2} />
          <rect x={x + i * col + (i > 3 ? 24 : 0)} y={y} width={col - 8} height={56} rx={10} fill={colours[i]} />
          <text x={x + i * col + (i > 3 ? 24 : 0) + (col - 8) / 2} y={y + 30} fontFamily={SANS} fontWeight={700} fontSize={24} fill="#fff" textAnchor="middle" dominantBaseline="middle">
            {name}
          </text>
        </g>
      ))}
      <circle cx={x + 4 * col + 8} cy={y + height - 30} r={10} fill={INK} />
    </g>
  )
}
