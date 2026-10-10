/**
 * Part 4's additions to the kit (multiplying and dividing): an array of
 * bead-board beads that can turn, a grid rectangle that can split, and a
 * skittle at any scale. Same beads and colours as the bead board.
 */
import { Skittle } from './kit'
import { INK, SANS } from './sizes'

/** The bead board's bead colour. */
export const ARRAY_BEAD = '#d63b3b'

/**
 * `rows` × `cols` beads centred on (cx, cy), `cell` apart, turned by `rot`
 * degrees about the centre (a quarter turn makes 3 × 4 into 4 × 3). `shown`
 * beads appear, row by row (the rest are left out).
 */
export function BeadArray({ rows, cols, cx, cy, cell = 44, rot = 0, shown, o = 1, colour = ARRAY_BEAD }: { rows: number; cols: number; cx: number; cy: number; cell?: number; rot?: number; shown?: number; o?: number; colour?: string }) {
  const n = shown ?? rows * cols
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`} opacity={o}>
      {Array.from({ length: Math.min(n, rows * cols) }, (_, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const x = (c - (cols - 1) / 2) * cell
        const y = (r - (rows - 1) / 2) * cell
        return (
          <g key={i}>
            <circle cx={x + 1.5} cy={y + 2} r={cell * 0.36} fill="rgba(60,40,20,0.18)" />
            <circle cx={x} cy={y} r={cell * 0.36} fill={colour} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * An area rectangle: `cols` × `rows` unit squares (top-left at x, y),
 * with a heavier line every ten columns so the tens show.
 */
export function GridRect({ x, y, cols, rows, cell = 44, fill = '#f2d38a', o = 1, shownRows }: { x: number; y: number; cols: number; rows: number; cell?: number; fill?: string; o?: number; shownRows?: number }) {
  const r = shownRows ?? rows
  if (r <= 0 || cols <= 0) return null
  return (
    <g opacity={o}>
      <rect x={x + 3} y={y + 4} width={cols * cell} height={r * cell} rx={4} fill="rgba(60,40,20,0.15)" />
      <rect x={x} y={y} width={cols * cell} height={r * cell} rx={4} fill={fill} stroke="#a7771a" strokeWidth={2} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`c${i}`} x1={x + (i + 1) * cell} y1={y} x2={x + (i + 1) * cell} y2={y + r * cell} stroke="#a7771a" strokeWidth={(i + 1) % 10 === 0 ? 4 : 1} opacity={(i + 1) % 10 === 0 ? 0.9 : 0.5} />
      ))}
      {Array.from({ length: r - 1 }, (_, i) => (
        <line key={`r${i}`} x1={x} y1={y + (i + 1) * cell} x2={x + cols * cell} y2={y + (i + 1) * cell} stroke="#a7771a" strokeWidth={1} opacity={0.5} />
      ))}
    </g>
  )
}

/** A skittle at scale `s` (base centre at x, y). */
export function SmallSkittle({ x, y, s = 0.6, colour, o = 1 }: { x: number; y: number; s?: number; colour?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <Skittle x={0} y={0} colour={colour} />
    </g>
  )
}

/** A small label (a count above a group, a total under a lane). */
export function Label({ text, x, y, o = 1, size = 56, colour = INK }: { text: string; x: number; y: number; o?: number; size?: number; colour?: string }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={800} fontSize={size} fill={colour} textAnchor="middle" dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}
