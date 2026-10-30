/**
 * The classification layout both classify explainers share: three in a row,
 * a "+", the slot; a ring round the three when what they share is named; the
 * choices below, the wrong ones fading as they're ruled out, the right one
 * going into the slot.
 */
import { outBack, p, smooth } from '@renderblocks/scene'
import type { Cell } from '../types'
import { BOX, CellBox, FONT, GREEN, Paper, SOFT, Slot, VIOLET, Words, row } from './kit'

export interface ClassifyTimes {
  /** Each of the three appears. */
  appear: number
  /** Each of the three is looked at in turn (a gentle bounce), from…to. */
  look?: [number, number]
  /** The ring round the three, and the label under it. */
  ring: number
  /** The choices rise in. */
  choices: number
  /** The wrong ones fade, one then the other. */
  ruleOut?: [number, number]
  /** The right one goes into the slot. */
  slide: [number, number]
}

const TOP = 230
const XS = row(5, 960, BOX, 34)
const LOW = 680
const CX = row(3, 960, BOX, 70)

export function ClassifyScene({ t, three, choices, answer, label, labelColour = VIOLET, at }: { t: number; three: Cell[]; choices: Cell[]; answer: number; label: string; labelColour?: string; at: ClassifyTimes }) {
  const into = smooth(p(t, ...at.slide))
  const ring = smooth(p(t, at.ring, at.ring + 0.5))
  const wrong = choices.map((_, i) => i).filter((i) => i !== answer)
  return (
    <Paper>
      {three.map((c, i) => {
        const pop = outBack(p(t, at.appear + i * 0.45, at.appear + i * 0.45 + 0.4))
        let bounce = 0
        if (at.look) {
          const span = (at.look[1] - at.look[0]) / 3
          bounce = Math.sin(p(t, at.look[0] + i * span, at.look[0] + (i + 0.6) * span) * Math.PI)
        }
        return <CellBox key={i} cell={c} x={XS[i]} y={TOP - bounce * 30} o={Math.min(1, pop * 2)} scale={0.6 + 0.4 * pop} />
      })}
      {/* The ring: what the three share, named. */}
      {ring > 0 && (
        <g opacity={ring}>
          <rect x={XS[0] - 26} y={TOP - 26} width={XS[2] + BOX - XS[0] + 52} height={BOX + 52} rx={56} fill="none" stroke={labelColour} strokeWidth={10} />
          <Words x={(XS[0] + XS[2] + BOX) / 2} y={TOP + BOX + 100} text={label} fill={labelColour} size={70} />
        </g>
      )}
      <text x={XS[3] + BOX / 2} y={TOP + BOX / 2 + 24} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={80} fill="#cbd5e1" opacity={smooth(p(t, at.appear + 1.4, at.appear + 1.8))}>
        +
      </text>
      <Slot x={XS[4]} y={TOP} o={smooth(p(t, at.appear + 1.5, at.appear + 1.9))} done={smooth(p(t, at.slide[1], at.slide[1] + 0.4))} />
      {choices.map((c, i) => {
        const rise = smooth(p(t, at.choices + i * 0.2, at.choices + 0.5 + i * 0.2))
        const k = wrong.indexOf(i)
        const out = k >= 0 && at.ruleOut ? smooth(p(t, at.ruleOut[k], at.ruleOut[k] + 0.4)) : 0
        const moving = i === answer
        const x = moving ? CX[i] + (XS[4] - CX[i]) * into : CX[i]
        const y = moving ? LOW + (TOP - LOW) * into - Math.sin(into * Math.PI) * 120 : LOW
        return (
          <g key={i}>
            <CellBox cell={c} x={x} y={y + (1 - rise) * 60} o={rise * (1 - 0.65 * out)} scale={1 - 0.1 * out} ring={moving && into >= 1 ? GREEN : undefined} />
            {out > 0 && (
              <path d={`M ${CX[i] + 50} ${LOW + 50} L ${CX[i] + BOX - 50} ${LOW + BOX - 50}`} stroke={SOFT} strokeWidth={10} strokeLinecap="round" opacity={out * 0.8} />
            )}
          </g>
        )
      })}
    </Paper>
  )
}
