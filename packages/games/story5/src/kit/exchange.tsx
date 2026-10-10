/**
 * The exchange: the series' signature move. Ten of a kind gather and fuse
 * into one of the next kind, or (in reverse) one breaks into ten. The same
 * function carries in addition, borrows in subtraction, shares in long
 * division, and makes wholes from fractions and decimals.
 *
 *   exchange(kind, from, to, progress)
 *
 * `from` is where each piece starts (or, breaking, where each lands), `to`
 * where the whole is, and `progress` runs 0 → 1. Pure: the same arguments
 * draw the same picture.
 */
import type { ReactNode } from 'react'
import { clamp, mix, smooth, type Pt } from '../engine/ease'
import { FractionPiece, HundredSquare, StampTile, TenBar, ThousandCube, UnitBead } from './kit'
import { BAR, BEAD, FRAC_R, GAP } from './sizes'

export type ExchangeKind = 'units→ten' | 'tens→hundred' | 'hundreds→thousand' | 'ones→ten tile' | 'quarters→whole'

interface Spec {
  /** How many pieces make one whole. */
  count: number
  piece: (at: Pt, glow: number) => ReactNode
  whole: (at: Pt, o: number) => ReactNode
  /** Where piece i sits inside the whole (relative to the whole's position). */
  slot: (i: number) => Pt
}

const SPECS: Record<ExchangeKind, Spec> = {
  'units→ten': {
    count: 10,
    piece: (at, glow) => <UnitBead x={at.x} y={at.y} glow={glow} />,
    whole: (at, o) => <TenBar x={at.x} y={at.y} o={o} />,
    slot: (i) => ({ x: 0, y: i * (BEAD + GAP) }),
  },
  'tens→hundred': {
    count: 10,
    piece: (at) => <TenBar x={at.x} y={at.y} />,
    whole: (at, o) => <HundredSquare x={at.x} y={at.y} o={o} />,
    slot: (i) => ({ x: i * (BEAD + GAP), y: 0 }),
  },
  'hundreds→thousand': {
    count: 10,
    piece: (at) => <HundredSquare x={at.x} y={at.y} />,
    whole: (at, o) => <ThousandCube x={at.x} y={at.y} o={o} />,
    // Stacked back to front, like the layers of the cube.
    slot: (i) => ({ x: (9 - i) * (BAR * 0.05), y: -(9 - i) * (BAR * 0.05) }),
  },
  'ones→ten tile': {
    count: 10,
    piece: (at) => <StampTile value={1} x={at.x} y={at.y} />,
    whole: (at, o) => <StampTile value={10} x={at.x} y={at.y} o={o} />,
    slot: (i) => ({ x: i * 3, y: -i * 3 }),
  },
  'quarters→whole': {
    count: 4,
    // Pieces and wholes are positioned by their circle's centre.
    piece: () => null,
    whole: (at, o) => <FractionPiece d={1} k={0} cx={at.x} cy={at.y} o={o} />,
    slot: () => ({ x: 0, y: 0 }),
  },
}

/**
 * Draw an exchange at `progress`:
 *   0.00–0.60  the pieces glide into place (staggered a little),
 *   0.60–0.75  they glow, all together,
 *   0.75–1.00  the whole fades in over them as they fade out.
 * `reverse` plays a break: the whole fades into its pieces, which then
 * spread out to `from`. `scale` draws the whole smaller than its pieces
 * (the mat's small thousand cubes): the pieces shrink as they glide in.
 */
export function exchange(kind: ExchangeKind, from: Pt[], to: Pt, progress: number, reverse = false, scale = 1): ReactNode {
  const spec = SPECS[kind]
  const k = reverse ? 1 - clamp(progress) : clamp(progress)
  const n = Math.min(spec.count, from.length)
  const glow = smooth(clamp((k - 0.6) / 0.15)) * (1 - smooth(clamp((k - 0.85) / 0.15)))
  const fade = smooth(clamp((k - 0.75) / 0.25))
  const pieces = Array.from({ length: n }, (_, i) => {
    const start = (i / n) * 0.15
    const m = smooth(clamp((k - start) / (0.6 - 0.15)))
    const target = { x: to.x + spec.slot(i).x * scale, y: to.y + spec.slot(i).y * scale }
    const at = mix(from[i], target, m)
    if (kind === 'quarters→whole') return <FractionPiece key={i} d={4} k={i} cx={at.x} cy={at.y} o={1 - fade} />
    const s = 1 + (scale - 1) * m
    return (
      <g key={i} opacity={1 - fade} transform={s === 1 ? undefined : `translate(${at.x} ${at.y}) scale(${s}) translate(${-at.x} ${-at.y})`}>
        {spec.piece(at, glow)}
      </g>
    )
  })
  return (
    <g>
      {pieces}
      {fade > 0 && (scale === 1 ? spec.whole(to, fade) : <g transform={`translate(${to.x} ${to.y}) scale(${scale}) translate(${-to.x} ${-to.y})`}>{spec.whole(to, fade)}</g>)}
      {glow > 0 && kind === 'quarters→whole' && <circle cx={to.x} cy={to.y} r={FRAC_R + 6} fill="none" stroke="#fff6d5" strokeWidth={8} opacity={glow} />}
    </g>
  )
}

