/* eslint-disable react-refresh/only-export-components -- drawings and the places they stand, kept together */
/**
 * What the explainers share: where a line sits over the balance, the small
 * beams on a predict's two answers, and the few drawn props (a book, a
 * barrel, a plate). Props are drawn, never scanned, and carry no faces.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { SUPPLY } from '../engine/turns'
import { GOLD, SERIF, WOOD_DARK } from '../kit/look'
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

/** A closed book, drawn: a few words on its cover and its year. */
export const book = (x: number, y: number, title: string[], year: string): Sprite[] => [
  {
    k: 'book',
    type: 'custom',
    n: { x, y, o: 1 },
    d: {
      id: `book${year}`,
      draw: (p) => (
        <g transform={`translate(${p.x} ${p.y})`}>
          <rect x={-150} y={-205} width={318} height={420} rx={10} fill="#d8cbb0" />
          <rect x={-160} y={-215} width={320} height={420} rx={10} fill="#7b4b2a" />
          <rect x={-160} y={-215} width={34} height={420} rx={8} fill="#5f3819" />
          <rect x={-108} y={-190} width={246} height={370} rx={4} fill="none" stroke="#d9a441" strokeWidth={3} />
          {title.map((w, i) => (
            <text key={w} x={15} y={-48 + (i - (title.length - 1) / 2) * 62} fontFamily={SERIF} fontSize={50} fill="#f3e3bd" textAnchor="middle" dominantBaseline="central">
              {w}
            </text>
          ))}
          <text x={15} y={120} fontFamily={SERIF} fontSize={44} fill="#d9a441" textAnchor="middle" dominantBaseline="central">
            {year}
          </text>
        </g>
      ),
    },
  },
]

/** A barrel standing on (x, y): its rim is 300 above, and its label's middle 150 above. */
export const barrel = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'barrel',
    draw: (p) => (
      <g transform={`translate(${p.x} ${p.y})`}>
        <path d="M -105 -300 Q -150 -150 -105 0 L 105 0 Q 150 -150 105 -300 Z" fill="#a9794c" stroke="#6b4a2b" strokeWidth={4} />
        {[-55, 0, 55].map((sx) => (
          <path key={sx} d={`M ${sx} -300 Q ${sx * 1.35} -150 ${sx} 0`} fill="none" stroke="#8a5f38" strokeWidth={3} />
        ))}
        {[-262, -38].map((hy) => (
          <path key={hy} d={`M -116 ${hy} Q 0 ${hy + 14} 116 ${hy}`} fill="none" stroke="#4d3a2a" strokeWidth={15} strokeLinecap="round" />
        ))}
        <ellipse cx={0} cy={-300} rx={105} ry={15} fill="#8a5f38" stroke="#6b4a2b" strokeWidth={4} />
        {/* A paper label, for the mark. */}
        <rect x={-62} y={-212} width={124} height={124} rx={10} fill="#fbf6ea" stroke="#cbbd9f" strokeWidth={3} />
      </g>
    ),
  },
})

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
