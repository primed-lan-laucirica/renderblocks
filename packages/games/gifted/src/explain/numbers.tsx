/* eslint-disable react-refresh/only-export-components -- explainer scripts: data, not components */
/** The Numbers island's explainers. */
import { p, smooth } from '@renderblocks/scene'
import { explainer } from './define'
import { palette, useStage } from './kit'
import { Q, num, text } from './cells'
import type { Geo } from './board'

/** The +2 hops over a series, each drawn in as it's counted. */
function Hops({ g, t, at }: { g: Geo; t: number; at: number[] }) {
  const { dark } = useStage()
  const c = palette(dark).accent
  return (
    <>
      {at.map((from, k) => {
        const i = k + 1
        const a = smooth(p(t, from, from + 0.35))
        if (a <= 0 || !g.cells[i]) return null
        const x0 = g.cells[i - 1].x + g.s / 2
        const x1 = g.cells[i].x + g.s / 2
        const top = g.cells[i].y
        const r = (x1 - x0) / 2
        const len = Math.PI * r
        return (
          <g key={k} opacity={Math.min(1, a * 1.5)}>
            <path d={`M ${x0} ${top - 6} A ${r} ${g.s * 0.4} 0 0 1 ${x1} ${top - 6}`} fill="none" stroke={c} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - a)} />
            <text x={(x0 + x1) / 2} y={top - g.s * 0.4 - 18} textAnchor="middle" fontWeight={900} fontSize={22} fill={c}>
              +2
            </text>
          </g>
        )
      })}
    </>
  )
}

export const numberSeries = explainer(
  'numberSeries',
  'Number Series',
  ['Here are some numbers in a row.', 'Each one is two more than the one before.', { say: 'Two, four, six.', pause: 0.2 }, 'So what comes next?', 'Two more than six is eight.', { say: 'Now you try.', pause: 0.6 }, 'What number comes next?'],
  (L) => {
    const count = (i: number) => L[2].time + (i * (L[2].end - L[2].time)) / 3
    return {
      puzzle: { layout: 'row', stimulus: [num(2), num(4), num(6), Q], blankIndex: 3, choices: [num(7), num(8), num(10)], answer: 1 },
      appear: L[0].time + 0.3,
      step: 0.35,
      marks: [0, 1, 2].map((i) => ({ cells: [i], from: count(i), to: L[3].time })),
      choices: L[3].time,
      answer: [L[4].time + 1.0, L[4].time + 2.0],
      over: (g, t) => <Hops g={g} t={t} at={[count(1) - 0.15, count(2) - 0.15, L[4].time + 0.2]} />,
    }
  },
)

/** "+2" over each pair's arrow. */
function PlusTwo({ g, t, from }: { g: Geo; t: number; from: number }) {
  const { dark } = useStage()
  const c = palette(dark).accent
  return (
    <>
      {g.glue.map((gl, k) => {
        const a = smooth(p(t, from + k * 0.35, from + k * 0.35 + 0.35))
        return a > 0 ? (
          <text key={k} x={gl.x} y={gl.y - Math.min(22, g.s * 0.32)} textAnchor="middle" fontWeight={900} fontSize={Math.min(18, g.s * 0.36)} fill={c} opacity={a}>
            +2
          </text>
        ) : null
      })}
    </>
  )
}

export const numberAnalogy = explainer(
  'numberAnalogy',
  'Number Analogies',
  ['One goes to three.', 'Four goes to six.', 'Each time, it goes up by two.', 'So what does five go to?', 'Two more than five is seven!', { say: 'Now you try.', pause: 0.6 }, 'Finish the pair.'],
  (L) => ({
    puzzle: { layout: 'pairs', stimulus: [num(1), num(3), num(4), num(6), num(5), Q], blankIndex: 5, choices: [num(6), num(7), num(8)], answer: 1 },
    appear: 0.2,
    step: 0.25,
    marks: [
      { cells: [0, 1], from: L[0].time, to: L[1].time },
      { cells: [2, 3], from: L[1].time, to: L[2].time },
      { cells: [4, 5], from: L[3].time },
    ],
    note: { text: 'up two each time', from: L[2].time + 0.3 },
    choices: L[3].time,
    answer: [L[4].time + 0.3, L[4].time + 1.3],
    over: (g, t) => <PlusTwo g={g} t={t} from={L[2].time + 0.3} />,
  }),
)

export const numberPuzzle = explainer(
  'numberPuzzle',
  'Number Puzzles',
  ['Here is a number sentence.', 'Five is the same as three and some more.', 'What do you add to three to make five?', 'Three and two make five!', { say: 'Now you try.', pause: 0.6 }, 'What is missing?'],
  (L) => ({
    puzzle: { layout: 'equation', stimulus: [num(5), text('='), num(3), text('+'), Q], blankIndex: -1, choices: [num(1), num(2), num(4)], answer: 1 },
    appear: L[0].time + 0.2,
    marks: [
      { cells: [0], from: L[1].time, to: L[3].end },
      { cells: [2], from: (L[1].time + L[1].end) / 2, to: L[3].end },
    ],
    choices: L[2].time,
    answer: [L[3].time + 0.2, L[3].time + 1.2],
  }),
)
