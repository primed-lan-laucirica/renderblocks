/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/** Number Series: 2, 4, 6, ? — each is two more, so eight comes next. Laid out as the puzzle screen lays out a series. */
import { outBack, p, smooth, type SceneDef, type SceneEvent } from '@renderblocks/scene'
import type { Cell } from '../types'
import type { Puzzle } from '../world/Thumb'
import { CellBox, Paper, Slot, bodyRows, cellSize, choiceSize, narrate, palette, row, useStage } from './kit'

const L = narrate([
  'Here are some numbers in a row.',
  'Each one is two more than the one before.',
  { say: 'Two, four, six.', pause: 0.2 },
  'So what comes next?',
  'Two more than six is eight.',
  { say: 'Now you try.', pause: 0.6 },
  'What number comes next?',
])
const NUMS = [2, 4, 6]
const num = (value: number): Cell => ({ kind: 'number', value })
const CHOICES = [7, 8, 10]
const ANSWER = 1
/** When each box appears, and when each number is counted along. */
const appear = (i: number) => L[0].time + 0.3 + i * 0.35
const count = (i: number) => L[2].time + (i * (L[2].end - L[2].time)) / 3
const slide: [number, number] = [L[4].time + 1.0, L[4].time + 2.0]
const DURATION = L[6].end + 1.2

function Scene({ t }: { t: number }) {
  const st = useStage()
  const c = palette(st.dark)
  const s = cellSize(st.vw, 88, 4)
  const cs = choiceSize(st.vw, s)
  const { top, low } = bodyRows(st.h, s, cs)
  const xs = row(4, st.w / 2, s, 8)
  const cx = row(3, st.w / 2, cs, 12)
  const into = smooth(p(t, ...slide))
  const landed = p(t, slide[1] - 0.05, slide[1])
  return (
    <Paper>
      {NUMS.map((n, i) => {
        const pop = outBack(p(t, appear(i), appear(i) + 0.4))
        const lit = t >= count(i) && t < L[3].time
        return <CellBox key={n} cell={num(n)} x={xs[i]} y={top} s={s} o={Math.min(1, pop * 2)} scale={0.6 + 0.4 * pop} ring={lit ? c.accent : undefined} />
      })}
      <Slot x={xs[3]} y={top} s={s} o={smooth(p(t, appear(3), appear(3) + 0.4))} cell={num(CHOICES[ANSWER])} done={landed} />
      {/* The +2 hops, one by one as he hears them; the last as it's worked out. */}
      {[1, 2, 3].map((i) => {
        const from = i < 3 ? count(i) - 0.15 : L[4].time + 0.2
        const k = smooth(p(t, from, from + 0.35))
        if (k <= 0) return null
        const x0 = xs[i - 1] + s / 2
        const x1 = xs[i] + s / 2
        const r = (x1 - x0) / 2
        const len = Math.PI * r
        return (
          <g key={i} opacity={Math.min(1, k * 1.5)}>
            <path d={`M ${x0} ${top - 6} A ${r} ${s * 0.4} 0 0 1 ${x1} ${top - 6}`} fill="none" stroke={c.accent} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
            <text x={(x0 + x1) / 2} y={top - s * 0.4 - 18} textAnchor="middle" fontWeight={900} fontSize={22} fill={c.accent}>
              +2
            </text>
          </g>
        )
      })}
      {/* The choices rise in; eight goes into the slot. */}
      {CHOICES.map((n, i) => {
        const rise = smooth(p(t, L[3].time + i * 0.2, L[3].time + 0.5 + i * 0.2))
        if (i === ANSWER) {
          if (landed >= 1) return null
          const x = cx[i] + (xs[3] - cx[i]) * into
          const y = low + (top - low) * into - Math.sin(into * Math.PI) * s * 0.8
          return <CellBox key={n} cell={num(n)} x={x} y={y + (1 - rise) * 20} s={cs + (s - cs) * into} o={rise} />
        }
        return <CellBox key={n} cell={num(n)} x={cx[i]} y={low + (1 - rise) * 20} s={cs} o={rise * (1 - 0.6 * smooth(p(t, slide[0], slide[1])))} />
      })}
    </Paper>
  )
}

const events: SceneEvent[] = [
  ...[0, 1, 2, 3].map((i) => ({ time: appear(i), kind: 'place' as const, n: i })),
  ...[1, 2].map((i) => ({ time: count(i), kind: 'notch' as const, n: i })),
  { time: L[4].time + 0.3, kind: 'notch', n: 3 },
  { time: slide[0], kind: 'slide', n: 0 },
  { time: slide[1], kind: 'equals', n: 0 },
]

export const numberSeries: SceneDef = { id: 'numberSeries', number: 0, title: 'Number Series', duration: DURATION, events, beats: [], voice: L.map(({ time, say }) => ({ time, say })), render: 'svg', Scene }

/** The worked example, for its window on the islands. */
export const example: Puzzle = { layout: 'row', stimulus: [...NUMS.map(num), { kind: 'text', text: '?' }], blankIndex: 3, choices: CHOICES.map(num), answer: ANSWER }
