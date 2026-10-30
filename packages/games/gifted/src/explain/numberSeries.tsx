/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/** Number Series: 2, 4, 6, 8, ? — each is two more, so ten comes next. */
import { outBack, p, smooth, type SceneDef, type SceneEvent } from '@renderblocks/scene'
import type { Cell } from '../types'
import { BOX, CellBox, FONT, Paper, Slot, VIOLET, narrate, row } from './kit'

const L = narrate([
  'Here are some numbers in a row.',
  'Each one is two more than the one before.',
  { say: 'Two, four, six, eight.', pause: 0.2 },
  'So what comes next?',
  'Two more than eight is ten.',
  { say: 'Now you try.', pause: 0.6 },
  'What number comes next?',
])
const NUMS = [2, 4, 6, 8]
const num = (value: number): Cell => ({ kind: 'number', value })
const TOP = 250
const XS = row(5)
const CHOICES = [9, 10, 12]
const CX = row(3, 960, BOX, 70)
const LOW = 680
/** When each number appears, and when each is counted along. */
const appear = (i: number) => L[0].time + 0.3 + i * 0.35
const count = (i: number) => L[2].time + (i * (L[2].end - L[2].time)) / 4
const slide: [number, number] = [L[4].time + 1.0, L[4].time + 2.0]
const DURATION = L[6].end + 1.2

function Scene({ t }: { t: number }) {
  const into = smooth(p(t, ...slide))
  return (
    <Paper>
      {NUMS.map((n, i) => {
        const pop = outBack(p(t, appear(i), appear(i) + 0.4))
        const lit = t >= count(i) && t < L[3].time
        return <CellBox key={n} cell={num(n)} x={XS[i]} y={TOP} o={Math.min(1, pop * 2)} scale={0.6 + 0.4 * pop} ring={lit ? VIOLET : undefined} />
      })}
      <Slot x={XS[4]} y={TOP} o={smooth(p(t, appear(4), appear(4) + 0.4))} done={smooth(p(t, slide[1], slide[1] + 0.4))} />
      {/* The +2 hops, one by one as he hears them. */}
      {[1, 2, 3, 4].map((i) => {
        const k = smooth(p(t, i < 4 ? count(i) - 0.15 : L[4].time + 0.2, (i < 4 ? count(i) : L[4].time + 0.4) + 0.2))
        if (k <= 0) return null
        const x0 = XS[i - 1] + BOX / 2
        const x1 = XS[i] + BOX / 2
        const len = Math.PI * ((x1 - x0) / 2)
        return (
          <g key={i} opacity={Math.min(1, k * 1.5)}>
            <path d={`M ${x0} ${TOP - 18} A ${(x1 - x0) / 2} 90 0 0 1 ${x1} ${TOP - 18}`} fill="none" stroke={VIOLET} strokeWidth={8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
            <text x={(x0 + x1) / 2} y={TOP - 120} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={60} fill={VIOLET}>
              +2
            </text>
          </g>
        )
      })}
      {/* The choices rise in; ten goes into the slot. */}
      {CHOICES.map((n, i) => {
        const rise = smooth(p(t, L[3].time + i * 0.2, L[3].time + 0.5 + i * 0.2))
        const moving = n === 10
        const x = moving ? CX[i] + (XS[4] - CX[i]) * into : CX[i]
        const y = moving ? LOW + (TOP - LOW) * into - Math.sin(into * Math.PI) * 120 : LOW
        return <CellBox key={n} cell={num(n)} x={x} y={y + (1 - rise) * 60} o={rise * (moving ? 1 : 1 - 0.6 * smooth(p(t, slide[0], slide[1])))} ring={moving && into >= 1 ? '#34d399' : undefined} />
      })}
    </Paper>
  )
}

const events: SceneEvent[] = [
  ...[0, 1, 2, 3, 4].map((i) => ({ time: appear(i), kind: 'place' as const, n: i })),
  ...[1, 2, 3].map((i) => ({ time: count(i), kind: 'notch' as const, n: i })),
  { time: L[4].time + 0.3, kind: 'notch', n: 4 },
  { time: slide[0], kind: 'slide', n: 0 },
  { time: slide[1], kind: 'equals', n: 0 },
]

export const numberSeries: SceneDef = { id: 'numberSeries', number: 0, title: 'Number Series', duration: DURATION, events, beats: [], voice: L.map(({ time, say }) => ({ time, say })), render: 'svg', Scene }
