/* eslint-disable react-refresh/only-export-components -- explainer scripts: data, not components */
/** The Shapes island's explainers. */
import { p, smooth } from '@renderblocks/scene'
import { palette, useStage } from './kit'
import { explainer } from './define'
import { BLUE, RED, YELLOW, Q, shape } from './cells'
import type { Cell } from '../types'
import type { Geo } from './board'

/** Rings on each of these cells in turn across a line. */
const each = (cells: number[], from: number, to: number, until?: number) =>
  cells.map((c, i) => ({ cells: [c], from: from + (i * (to - from)) / cells.length, to: until }))

export const figureClassify = explainer(
  'figureClassify',
  'Figure Classification',
  ['Look at these three shapes.', 'They are all different shapes.', 'But they are all blue.', 'Which one is blue too?', 'The blue star!', 'Find what is the same about all three.', { say: 'Now you try.', pause: 0.6 }, 'Which one goes with these?'],
  (L) => ({
    puzzle: { layout: 'classify', stimulus: [shape('circle', BLUE, 1, 'outline', 0.8), shape('triangle', BLUE, 2), shape('square', BLUE, 3, 'light')], blankIndex: -1, choices: [shape('triangle', RED, 2), shape('star', BLUE), shape('square', YELLOW)], answer: 1 },
    appear: L[0].time + 0.2,
    step: 0.45,
    marks: [...each([0, 1, 2], L[1].time, L[1].end, L[2].time), { cells: [0, 1, 2], from: L[2].time + 0.3, colour: BLUE }],
    note: { text: 'all blue', from: L[2].time + 0.3, colour: BLUE },
    choices: L[3].time,
    answer: [L[4].time + 0.1, L[4].time + 1.1],
  }),
)

export const figureSeries = explainer(
  'figureSeries',
  'Figure Series',
  ['Look at these shapes in a row.', 'Red, blue, red.', 'The colors take turns.', 'So what comes next?', 'Blue comes next!', { say: 'Now you try.', pause: 0.6 }, 'What comes next?'],
  (L) => ({
    puzzle: { layout: 'row', stimulus: [shape('square', RED), shape('square', BLUE), shape('square', RED), Q], blankIndex: 3, choices: [shape('square', RED, 2), shape('square', BLUE), shape('square', YELLOW)], answer: 1 },
    appear: L[0].time + 0.2,
    marks: each([0, 1, 2], L[1].time, L[1].end, L[3].time),
    note: { text: 'red, blue, red, blue…', from: L[2].time + 0.2 },
    choices: L[3].time,
    answer: [L[4].time + 0.1, L[4].time + 1.1],
  }),
)

// As the real puzzles are made: down each column the shape stays the same, across each row the color does.
export const figureMatrix = explainer(
  'figureMatrix',
  'Figure Matrices',
  [
    'Look at the box above the empty one.',
    'Up and down, the shape stays the same. A triangle.',
    'Now look across the bottom row.',
    'Across, the color stays the same. Red.',
    'So the empty box needs a red triangle.',
    'Which one is a red triangle?',
    'This one!',
    { say: 'Now you try.', pause: 0.6 },
    'Fill the empty box.',
  ],
  (L) => ({
    puzzle: { layout: 'matrix2', stimulus: [shape('circle', BLUE), shape('triangle', BLUE), shape('circle', RED), Q], blankIndex: 3, choices: [shape('circle', RED), shape('triangle', RED), shape('triangle', BLUE)], answer: 1 },
    appear: 0.2,
    step: 0.3,
    marks: [
      { cells: [1, 3], from: L[0].time, to: L[2].time },
      { cells: [2, 3], from: L[2].time, to: L[4].time },
      { cells: [1, 3], from: L[4].time, to: L[6].end },
      { cells: [2, 3], from: L[4].time, to: L[6].end },
    ],
    note: { text: 'red triangle', from: L[4].time + 0.3 },
    choices: L[5].time,
    answer: [L[6].time + 0.1, L[6].time + 1.1],
  }),
)

// A striped pattern: red and blue columns, with a hole three wide.
const stripes = (cols: number, start = 0) => Array.from({ length: 3 }, () => Array.from({ length: cols }, (_, c) => (c + start) % 2))
const FIELD: Cell = { kind: 'field', grid: Array.from({ length: 8 }, () => Array.from({ length: 8 }, (_, c) => c % 2)), hole: { r: 3, c: 2, n: 3 } }

export const patternCompletion = explainer(
  'patternCompletion',
  'Pattern Completion',
  ['Here is a pattern with a hole in it.', 'The stripes go up and down.', 'Which piece fits the hole?', 'This one has the stripes in the wrong places.', 'This one breaks the stripes.', 'This one keeps the stripes going!', { say: 'Now you try.', pause: 0.6 }, 'Which piece fits the hole?'],
  (L) => ({
    puzzle: {
      layout: 'field',
      stimulus: [FIELD],
      blankIndex: -1,
      choices: [
        { kind: 'field', grid: stripes(3, 1) },
        { kind: 'field', grid: stripes(3, 0) },
        { kind: 'field', grid: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
      ],
      answer: 1,
    },
    appear: L[0].time + 0.2,
    marks: [{ cells: [0], from: L[1].time, to: L[2].time }],
    choices: L[2].time,
    ruleOut: [
      { choice: 0, at: L[3].time + 0.3 },
      { choice: 2, at: L[4].time + 0.3 },
    ],
    answer: [L[5].time + 0.2, L[5].time + 1.2],
  }),
)

/** The folded sheet opening: its other half swings down from the fold, showing the hole there too. */
function Unfold({ g, t, open, close }: { g: Geo; t: number; open: number; close: number }) {
  const { dark } = useStage()
  const c = palette(dark)
  const k = smooth(p(t, open, open + 1.2)) * (1 - smooth(p(t, close, close + 0.5)))
  if (k <= 0) return null
  const b = g.cells[0]
  const S = b.s - 16
  const x = b.x + 8
  const y = b.y + 8 + S / 2
  const cellS = S / 4
  return (
    <g>
      <rect x={x + S * 0.01} y={y} width={S * 0.98} height={Math.max(0, (S / 2) * k - S * 0.01)} rx={S * 0.04} fill={dark ? '#1e293b' : '#f8fafc'} stroke={c.ink} strokeWidth={S * 0.025} />
      {k > 0.8 && <circle cx={x + 1.5 * cellS} cy={b.y + 8 + 2.5 * cellS} r={cellS * 0.26} fill={dark ? '#0f172a' : '#ffffff'} stroke={c.ink} strokeWidth={S * 0.02} opacity={(k - 0.8) * 5} />}
    </g>
  )
}

const sheet = (holes: [number, number][]): Cell => ({ kind: 'sheet', size: 4, holes })
export const paperFolding = explainer(
  'paperFolding',
  'Paper Folding',
  ['This paper is folded in half.', 'A hole is punched through both layers.', 'Now open it up.', 'There is a hole on each side of the fold.', 'Which one shows that?', 'This one, with two holes!', { say: 'Now you try.', pause: 0.6 }, 'Which one is it when it opens up?'],
  (L) => ({
    puzzle: { layout: 'fold', stimulus: [{ kind: 'fold', axis: 'h', size: 4, punches: [[1, 1]] }], blankIndex: -1, choices: [sheet([[1, 1]]), sheet([[1, 1], [2, 1]]), sheet([[1, 1], [1, 2]])], answer: 1 },
    appear: L[0].time + 0.2,
    marks: [{ cells: [0], from: L[1].time, to: L[2].time }],
    note: { text: 'two holes', from: L[3].time + 0.3 },
    choices: L[4].time,
    answer: [L[5].time + 0.1, L[5].time + 1.1],
    over: (g, t) => <Unfold g={g} t={t} open={L[2].time + 0.3} close={L[4].time} />,
  }),
)
