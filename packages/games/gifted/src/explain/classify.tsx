/**
 * The classification layout both classify explainers share, laid out as the
 * puzzle screen lays it out: three boxes, a "+", the slot; the choices
 * below. A ring round the three when what they share is named (the name
 * where the puzzle prints its explanation); the wrong choices fade as
 * they're ruled out; the right one goes into the slot.
 */
import { outBack, p, smooth } from '@renderblocks/scene'
import type { Cell } from '../types'
import { CellBox, Note, Paper, Slot, bodyRows, cellSize, choiceSize, palette, row, useStage } from './kit'

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

/** "+" is text-2xl with px-1: about 22 px wide. */
const PLUS = 22

export function ClassifyScene({ t, three, choices, answer, label, labelColour, at }: { t: number; three: Cell[]; choices: Cell[]; answer: number; label: string; labelColour?: string; at: ClassifyTimes }) {
  const st = useStage()
  const c = palette(st.dark)
  const s = cellSize(st.vw, 88, 4, 30)
  const cs = choiceSize(st.vw, s)
  const { top, note, low } = bodyRows(st.h, s, cs)
  // box, box, box, "+", slot — 8 px apart.
  const rowW = 4 * s + PLUS + 4 * 8
  const x0 = st.w / 2 - rowW / 2
  const xs = [x0, x0 + s + 8, x0 + 2 * (s + 8)]
  const plusX = x0 + 3 * (s + 8) + PLUS / 2
  const slotX = x0 + 3 * (s + 8) + PLUS + 8
  const cx = row(choices.length, st.w / 2, cs, 12)
  const into = smooth(p(t, ...at.slide))
  const landed = p(t, at.slide[1] - 0.05, at.slide[1])
  const ring = smooth(p(t, at.ring, at.ring + 0.5))
  const wrong = choices.map((_, i) => i).filter((i) => i !== answer)
  const accent = labelColour ?? c.accent
  return (
    <Paper>
      {three.map((cell, i) => {
        const pop = outBack(p(t, at.appear + i * 0.45, at.appear + i * 0.45 + 0.4))
        let bounce = 0
        if (at.look) {
          const span = (at.look[1] - at.look[0]) / 3
          bounce = Math.sin(p(t, at.look[0] + i * span, at.look[0] + (i + 0.6) * span) * Math.PI)
        }
        return <CellBox key={i} cell={cell} x={xs[i]} y={top - bounce * s * 0.25} s={s} o={Math.min(1, pop * 2)} scale={0.6 + 0.4 * pop} />
      })}
      {ring > 0 && <rect x={xs[0] - 7} y={top - 7} width={3 * s + 16 + 14} height={s + 14} rx={s * 0.24} fill="none" stroke={accent} strokeWidth={3.5} opacity={ring} />}
      <Note x={xs[0] + (3 * s + 16) / 2} y={note} text={label} o={ring} fill={accent} />
      <text x={plusX} y={top + s / 2} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={24} fill={c.mark} opacity={smooth(p(t, at.appear + 1.4, at.appear + 1.8))}>
        +
      </text>
      <Slot x={slotX} y={top} s={s} o={smooth(p(t, at.appear + 1.5, at.appear + 1.9))} cell={choices[answer]} done={landed} />
      {choices.map((cell, i) => {
        const rise = smooth(p(t, at.choices + i * 0.2, at.choices + 0.5 + i * 0.2))
        const k = wrong.indexOf(i)
        const out = k >= 0 && at.ruleOut ? smooth(p(t, at.ruleOut[k], at.ruleOut[k] + 0.4)) : 0
        if (i === answer) {
          // On its way to the slot; once it's in, the slot shows it.
          if (landed >= 1) return null
          const x = cx[i] + (slotX - cx[i]) * into
          const y = low + (top - low) * into - Math.sin(into * Math.PI) * s * 0.8
          return <CellBox key={i} cell={cell} x={x} y={y + (1 - rise) * 20} s={cs + (s - cs) * into} o={rise} />
        }
        return <CellBox key={i} cell={cell} x={cx[i]} y={low + (1 - rise) * 20} s={cs} o={rise * (1 - 0.7 * out)} scale={1 - 0.1 * out} />
      })}
    </Paper>
  )
}
