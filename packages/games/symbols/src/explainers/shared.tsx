/* eslint-disable react-refresh/only-export-components -- drawings and the places they stand, kept together */
/**
 * What the explainers share: where a line sits over the balance, the small
 * beams on a predict's two answers, and the drawn props (a plate). Props
 * are drawn, never scanned, and carry no faces.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { SUPPLY } from '../engine/turns'
import { GOLD, WOOD_DARK } from '../kit/look'
import { PAN_X, PAN_Y, PIVOT, type Sprite } from '../kit/sprites'

/** The line over the balance. */
export const TOP = 190
/** A numeral over each pan and the sign over the pivot (5 = 5). */
export const OVER = [PAN_X.left, PIVOT.x, PAN_X.right]
/** Three tokens over the left pan, the sign over the pivot, one over the right (3 + 2 = 5)… */
export const OVER_LEFT = [PAN_X.left - 130, PAN_X.left, PAN_X.left + 130, PIVOT.x, PAN_X.right]
/** …and the other way round (5 = 3 + 2). */
export const OVER_RIGHT = [PAN_X.left, PIVOT.x, PAN_X.right - 130, PAN_X.right, PAN_X.right + 130]

/** A pan's new beads come up from the tray (measured from the pan's floor). */
export const FROM_TRAY = {
  left: { x: SUPPLY.x - PAN_X.left, y: SUPPLY.y - PAN_Y },
  right: { x: SUPPLY.x - PAN_X.right, y: SUPPLY.y - PAN_Y },
}
/** Where he drops beads for a pan. */
export const PAN_ZONE = {
  left: { x: PAN_X.left - 240, y: 280, w: 480, h: 440 },
  right: { x: PAN_X.right - 240, y: 280, w: 480, h: 440 },
}

/** A small beam, level or tipped, for a predict's answers (a positive tilt drops the right end). */
export const beam = (tilt: number) => () => (
  <g transform={`rotate(${tilt})`} stroke={WOOD_DARK} strokeWidth={7} strokeLinecap="round" fill="none">
    <line x1={-48} y1={0} x2={48} y2={0} />
    <circle cx={0} cy={0} r={6} fill={GOLD} stroke="none" />
  </g>
)

/** A balance's loads with their names crossed, so that from the uncrossed state each bead glides over to the other pan. */
export const crossed = (list: Sprite[]): Sprite[] => list.map((s) => (s.k === 'beam' ? s : { ...s, k: (s.k[0] === 'L' ? 'R' : 'L') + s.k.slice(1) }))

/** A plate: beads stand on y. */
export const plate = (k: string, x: number, y: number, w = 250): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, w, o: 1 },
  d: {
    id: 'plate',
    draw: (p) => (
      <g>
        <ellipse cx={p.x} cy={p.y + 12} rx={p.w / 2} ry={24} fill="#cbbd9f" />
        <ellipse cx={p.x} cy={p.y + 6} rx={p.w / 2 - 6} ry={19} fill="#fbf6ea" stroke="#cbbd9f" strokeWidth={3} />
        <ellipse cx={p.x} cy={p.y + 8} rx={p.w / 2 - 44} ry={10} fill="none" stroke="#e3d8c0" strokeWidth={3} />
      </g>
    ),
  },
})

/** A plate's bead size, and where its j-th bead stands (two to a row). */
export const PLATE_BEAD = 60
export const onPlate = (x: number, y: number, j: number, cols = 2): Pt => ({
  x: x + ((j % cols) - (cols - 1) / 2) * (PLATE_BEAD + 6),
  y: y - PLATE_BEAD / 2 - Math.floor(j / cols) * (PLATE_BEAD + 6),
})
