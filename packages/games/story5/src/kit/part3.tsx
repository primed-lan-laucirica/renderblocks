/**
 * Part 3's additions to the kit: what sits in a balance's pans, and the
 * dashed outline of a gap (where a rod is missing, where a tile will go).
 * Pan contents are drawn in the pan's own space (0, 0 at the middle of its
 * rim), piling upward in rows of five, as the Balance expects.
 */
import { UnitBead, StampTile } from './kit'
import { BEAD, TILE } from './sizes'

/** Where the j-th thing of `size` px sits in a pan: rows of five, piling up from the rim. */
const inPan = (j: number, size: number, gap = 4) => ({
  x: ((j % 5) - 2) * (size + gap) - size / 2,
  y: -size - 4 - Math.floor(j / 5) * (size + gap),
})

/** n golden beads in a pan (`from`: the first one's index, so a second group piles on after the first). */
export function PanBeads({ n, s = 1.6, from = 0, o = 1, lift = 0 }: { n: number; s?: number; from?: number; o?: number; lift?: number }) {
  const size = BEAD * s
  return (
    <g opacity={o}>
      {Array.from({ length: n }, (_, i) => {
        const at = inPan(from + i, size)
        return <UnitBead key={i} x={at.x} y={at.y - lift} s={s} />
      })}
    </g>
  )
}

/** n stamp tiles (1s or 10s) in a pan, at `s` of their size. */
export function PanTiles({ n, value, s = 0.6, from = 0, o = 1 }: { n: number; value: 1 | 10; s?: number; from?: number; o?: number }) {
  const size = TILE * s
  return (
    <g opacity={o}>
      {Array.from({ length: n }, (_, i) => {
        const at = inPan(from + i, size)
        return <StampTile key={i} value={value} x={at.x} y={at.y} s={s} />
      })}
    </g>
  )
}

/** A dashed outline: a gap, or a place waiting to be filled. */
export function Gap({ x, y, w, h, o = 1 }: { x: number; y: number; w: number; h: number; o?: number }) {
  if (o <= 0) return null
  return <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="10 7" opacity={o} />
}
