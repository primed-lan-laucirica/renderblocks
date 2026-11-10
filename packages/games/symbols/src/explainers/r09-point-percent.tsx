/**
 * Rank 9, the decimal point and % : parts of a whole, written in a row.
 * The signs on the paper are =, +, the fraction bar, the point and % only.
 * The point marks where the whole ones end (tenths and hundredths follow
 * it); percent counts out of a hundred. Both are met wherever something is
 * measured: a ruler, a battery.
 *
 * % is tied to the signs it resembles, a slash as in divide and two small
 * zeros as in 100. That is a likeness to remember it by, not a claim about
 * where the sign came from. No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { INK } from '../kit/look'
import { beadAt, hundred, numberLine, onLine, slices, type Ruler } from '../kit/measures'
import { balance, beadsOn, line, type Sprite } from '../kit/sprites'
import { OVER, TOP } from './shared'

const SIZE = 320
const Y = 690
const CUT = { x: 1320, y: Y, size: SIZE, apart: 6 }
const wholes = (): Sprite[] => [580, 930].map((x, i) => beadAt(`w${i}`, x, Y, SIZE))
/** Hundredths: the fourth slice cut into ten, and `n` of its pieces. */
const hundredths = (n: number): Sprite[] => {
  const step = SIZE / 10
  const x = CUT.x - 1.5 * (step + CUT.apart)
  return Array.from({ length: n }, (_, j) => beadAt(`c${j}`, x, Y + SIZE / 2 - step / 2 - j * step, step * 0.9, 'blue'))
}
const DOT = { y: 250, size: 230 }

const SQUARE = { x: 540, y: 590, size: 500 }
const BESIDE = { x: 1370, y: 560 }

/** A battery, `full` of it charged. */
const battery = (full: number): Sprite[] => [
  {
    k: 'battery',
    type: 'custom',
    n: { x: SQUARE.x, y: 600, full, o: 1 },
    d: {
      id: 'battery',
      draw: (p) => (
        <g>
          <rect x={p.x - 250} y={p.y - 120} width={500} height={240} rx={34} fill="#fbf6ea" stroke={INK} strokeWidth={10} />
          <rect x={p.x + 256} y={p.y - 46} width={34} height={92} rx={12} fill={INK} />
          <rect x={p.x - 226} y={p.y - 96} width={452 * p.full} height={192} rx={16} fill="#6bb36f" />
        </g>
      ),
    },
    enter: { full: 0 },
  },
]

const RULER: Ruler = { x0: 360, x1: 1560, y: 720, from: 2, to: 3 }

export const r09: Spec = {
  rank: 9,
  id: 'r09',
  title: 'Point and percent',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { wholes: wholes(), cut: slices(3, CUT) },
      say: 'Two whole beads, and three slices of a bead cut into ten. Is that nearer to two, or nearer to three?',
      turn: { kind: 'predict', id: 'near', prompt: 'Nearer to two, or nearer to three?', options: [{ label: 'Nearer to two' }, { label: 'Nearer to three' }] },
    },
    { say: 'Nearer to two. Three slices are less than half a bead.' },
    { stage: { line: line(['2', '+', { frac: ['3', '10'] }], { y: DOT.y, size: 170 }) }, say: 'Two, and three tenths.' },
    { stage: { line: line(['2', '_', '3'], { ...DOT, gold: ['_'] }) }, move: 1.1, say: 'We need a short way to write whole ones and parts in one number.' },

    // ── 2. What the point does ──
    { act: 2, stage: { line: line(['2', '.', '3'], DOT) }, quiet: 1.4, motif: true, say: 'This dot is the decimal point.' },
    { say: 'We read it: two point three.', poster: true },
    { stage: { line: line(['2', '.', '3'], { ...DOT, gold: ['.'] }) }, move: 0.5, say: 'The point shows where the whole ones end. Next to it, on the right, come the tenths.' },
    {
      stage: { line: line(['2', '.', '35'], DOT), small: hundredths(5) },
      say: 'Cut one slice into ten, and you have hundredths. They come next: two point three five.',
    },
    {
      clear: true,
      stage: { cut: slices(5, { x: 960, y: 700, size: 300 }), line: line(['0.5', '=', { frac: ['5', '10'] }, '=', { frac: ['1', '2'] }], { y: 300, size: 170 }) },
      say: 'Five tenths is a half. So zero point five equals one half.',
    },

    // ── 3. Percent, and where both are used ──
    { act: 3, clear: true, stage: { square: hundred(25, SQUARE), line: line(['25', '%'], { ...BESIDE, size: 230 }) }, quiet: 1.4, motif: true, say: 'This is the percent sign.' },
    {
      stage: { line: line(['25', '%', '=', { frac: ['25', '100'] }], { ...BESIDE, size: 150 }) },
      say: 'Percent means out of a hundred. Twenty-five percent is twenty-five out of a hundred.',
    },
    {
      stage: { line: line(['25', '%', '=', { frac: ['25', '100'] }], { ...BESIDE, size: 150, gold: ['%'] }) },
      move: 0.5,
      say: 'Look at its shape: a slash, as in divide, and two small zeros, as in one hundred.',
    },
    {
      stage: { square: hundred(50, SQUARE), line: line(['50', '%', '=', { frac: ['1', '2'] }, '=', '0.5'], { ...BESIDE, size: 130 }) },
      say: 'Fifty percent is a half, and that is zero point five. Three ways to write the same amount.',
    },
    { stage: { square: hundred(100, SQUARE), line: line(['100', '%', '=', '1'], { ...BESIDE, size: 150 }) }, say: 'One hundred percent is all of it: one whole.' },
    {
      clear: true,
      stage: { battery: battery(0.75), line: line(['75', '%', '=', '0.75'], { ...BESIDE, y: 600, size: 140 }) },
      move: 1.3,
      say: 'You will see percent on a battery: seventy-five percent full. As a decimal, that is zero point seven five.',
    },
    {
      clear: true,
      stage: {
        axis: numberLine(RULER, { every: 0.1, labels: [2, 3], size: 90 }),
        mark: [beadAt('m', onLine(RULER, 2.3), RULER.y - 62, 70)],
        line: line(['2', '.', '3'], { x: onLine(RULER, 2.3), y: 440, size: 150 }),
      },
      say: 'And the point is used whenever we measure. Between two and three there are ten steps. This is two point three.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'half', prompt: 'Which one is true?', cards: [['0.5', '=', { frac: ['1', '2'] }], ['0.5', '=', { frac: ['1', '5'] }]], right: 0 },
    },
    {
      clear: true,
      say: 'Fill thirty percent of the square. Put on tens.',
      turn: {
        kind: 'build',
        id: 'fill30',
        prompt: 'Fill thirty percent of the square.',
        target: 3,
        max: 5,
        unit: 10,
        zone: { x: 700, y: 330, w: 520, h: 520 },
        state: (n) => ({
          square: hundred(10 * n, { x: 960, y: 590, size: 440 }),
          line: line([{ g: n === 0 ? '?' : String(10 * n), k: 'made' }, { g: '%', k: 'pc' }, '=', '30', '%'], { y: TOP, gold: n === 3 ? ['='] : [], faint: n === 3 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['10', '%', '=', '0.1'], { y: 480, size: 210 }) }, move: 0.6, say: 'Ten percent equals zero point one.', turn: { kind: 'read', id: 'read10', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { scale: balance({ left: beadsOn({ n: 9, part: 0.9, cols: 5 }), right: beadsOn({ n: 10, cols: 5 }), tilt: 3 }), line: line(['9.9', '_', '10'], { y: TOP, at: OVER }) },
      say: 'Nine point nine is not ten. But it is very close.',
    },
    { teaser: true, stage: { line: line(['9.9', '_', '10'], { y: TOP, at: OVER, gold: ['_'] }) }, move: 0.5, say: 'How do we write "nearly equal"?', pad: 1 },
  ],
}
