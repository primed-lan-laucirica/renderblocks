/* eslint-disable react-refresh/only-export-components -- a drawing and the layout it draws from belong together */
/**
 * Part 2's drawing: a number laid out in golden bead material, place by
 * place, biggest on the left (thousand cubes, hundred squares, ten bars,
 * then the units in columns of ten). Everything is laid out at full size;
 * `s` scales the whole group, so every cube keeps its 3D shape.
 */
import type { Pt } from '../engine/ease'
import { HundredSquare, TenBar, ThousandCube, UnitBead } from './kit'
import { BAR, BEAD } from './sizes'

/** Counts by place: [units, tens, hundreds, thousands]. */
export type Counts4 = [number, number, number, number]

export interface Placed {
  place: number
  /** Top-left (a cube's front face), in the group's own full-size coordinates. */
  at: Pt
}

const CUBE_W = BAR * 1.5
/** Loose units sit apart (so five units never read as a short bar), in columns of ten. */
const UNIT_DY = BEAD + 10
const STEP = [BEAD + 14, 36, BAR + 24, CUBE_W + 30]
const GROUP_GAP = 200

/** Where each piece of a number sits, and the group's width (full size). */
export function materialLayout(counts: Counts4): { pieces: Placed[]; width: number } {
  const pieces: Placed[] = []
  let x = 0
  for (const place of [3, 2, 1, 0]) {
    const n = counts[place]
    if (!n) continue
    if (x > 0) x += GROUP_GAP
    for (let i = 0; i < n; i++) {
      if (place === 0) pieces.push({ place, at: { x: x + Math.floor(i / 10) * STEP[0], y: (i % 10) * UNIT_DY } })
      else pieces.push({ place, at: { x: x + i * STEP[place], y: 0 } })
    }
    const last = place === 0 ? Math.floor((n - 1) / 10) * STEP[0] + BEAD : (n - 1) * STEP[place] + [BEAD, BEAD, BAR, CUBE_W][place]
    x += last
  }
  return { pieces, width: x }
}

/** One piece of material at full size. */
export function MaterialPiece({ place, at, o = 1 }: Placed & { o?: number }) {
  if (place === 0) return <UnitBead x={at.x} y={at.y} o={o} />
  if (place === 1) return <TenBar x={at.x} y={at.y} o={o} />
  if (place === 2) return <HundredSquare x={at.x} y={at.y} o={o} />
  return <ThousandCube x={at.x} y={at.y} o={o} />
}

/**
 * A number in bead material, its group centred on `cx` with the front faces' top at `y`, scaled by `s`.
 * `appear(i)` (0 → 1) brings each piece in, in layout order.
 */
export function Material({ counts, cx, y, s = 1, o = 1, appear }: { counts: Counts4; cx: number; y: number; s?: number; o?: number; appear?: (i: number) => number }) {
  if (o <= 0) return null
  const { pieces, width } = materialLayout(counts)
  return (
    <g transform={`translate(${cx - (width * s) / 2} ${y}) scale(${s})`} opacity={o}>
      {pieces.map((pc, i) => {
        const k = appear ? appear(i) : 1
        return k > 0 ? <MaterialPiece key={i} {...pc} o={Math.min(1, k)} /> : null
      })}
    </g>
  )
}

/** Where a piece of `Material` lands on the stage (its top-left), for beats and cards. */
export function onStage(counts: Counts4, cx: number, y: number, s: number, at: Pt): Pt {
  const { width } = materialLayout(counts)
  return { x: cx - (width * s) / 2 + at.x * s, y: y + at.y * s }
}

/** The middle of each place's group on the stage (for the card under it). */
export function placeCentre(counts: Counts4, cx: number, y: number, s: number, place: number): number {
  const { pieces } = materialLayout(counts)
  const mine = pieces.filter((pc) => pc.place === place)
  const w = [BEAD, BEAD, BAR, CUBE_W][place]
  const left = Math.min(...mine.map((pc) => pc.at.x))
  const right = Math.max(...mine.map((pc) => pc.at.x)) + w
  return onStage(counts, cx, y, s, { x: (left + right) / 2, y: 0 }).x
}
