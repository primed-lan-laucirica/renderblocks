/**
 * Rank 8, √ : from a square back to its side. The signs on the paper are
 * =, +, <, the power and the root only. The root asks which number,
 * squared, makes this one, so it undoes squaring; its line on top says how
 * far it reaches.
 *
 * The one tie kept is between signs: the root's line groups what is under
 * it, the job brackets do (rank 5 showed the same line drawn over a part).
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Pt } from '@renderblocks/scene/ease'
import { beadAt } from '../kit/measures'
import { grid, line, loose, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const AT = { x: 960, y: 670, step: 88 }
/** Sixteen beads at these points; `side` colours the top row, the side of the square. */
const sixteen = (pts: Pt[], side = false): Sprite[] => pts.map((pt, i) => beadAt(`q${i}`, pt.x, pt.y, 74, side && i < 4 ? 'blue' : undefined))
const ROWS = grid(16, 8, AT.x, AT.y, AT.step)
const SQUARE = grid(16, 4, AT.x, AT.y, AT.step)

/** Three squares side by side, each with its root over it. */
const SQUARES = [
  { n: 9, cols: 3, x: 420, step: 70, s: 1.5 },
  { n: 25, cols: 5, x: 960, step: 56, s: 1.2 },
  { n: 100, cols: 10, x: 1500, step: 36, s: 0.78 },
]
const squareOf = (i: number) => {
  const q = SQUARES[i]
  return {
    [`sq${i}`]: loose(grid(q.n, q.cols, q.x, 700, q.step), { s: q.s, k: 'q' }),
    [`root${i}`]: line([{ root: String(q.n) }, '=', String(q.cols)], { x: q.x, y: 300, size: 100 }),
  }
}

/** Ten beads: a square of nine and one over. */
const ten = (): Sprite[] => [...loose(grid(9, 3, 900, 700, 92), { s: 2, k: 'q' }), beadAt('over', 1130, 792, 80, 'red')]

const NINE = { x: 960, y: 500, step: 92 }
/** The beads of his side, set under the square from its left edge. */
const side = (n: number) => loose(Array.from({ length: n }, (_, i) => ({ x: NINE.x + (i - 1) * NINE.step, y: NINE.y + 2 * NINE.step + 30 })), { s: 2, k: 'side', colour: 'blue', from: { x: SUPPLY.x, y: SUPPLY.y } })

export const r08: Spec = {
  rank: 8,
  id: 'r08',
  title: 'Square root',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { beads: sixteen(ROWS) },
      say: 'Sixteen beads, in two rows. Can they make a square?',
      turn: { kind: 'predict', id: 'square', prompt: 'Can sixteen beads make a square?', options: [{ label: 'A square' }, { label: 'Not a square' }] },
    },
    { stage: { beads: sixteen(SQUARE) }, move: 1.3, cue: 'slide', say: 'Yes. Four rows of four.' },
    { stage: { line: line(['4', { sup: '2' }, '=', '16'], { y: TOP }) }, say: 'Four squared equals sixteen.' },
    { stage: { line: line(['_', '16', '=', '4'], { y: TOP, gold: ['_'] }) }, move: 1.1, say: 'Now go the other way: from sixteen, back to the side of its square. We need a sign for that.' },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: line([{ root: '16' }, '=', '4'], { y: TOP }) }, quiet: 1.4, motif: true, say: 'This is the square root sign.' },
    { say: 'The square root of sixteen equals four.', poster: true },
    { stage: { line: line([{ root: '16' }, '=', '4'], { y: TOP, gold: ['√'] }), beads: sixteen(SQUARE, true) }, move: 0.5, say: 'It asks: which number, squared, makes sixteen? Four. That is the side of the square.' },
    { stage: { back: line(['4', { sup: '2' }, '=', '16'], { x: 1530, y: AT.y, size: 110 }) }, say: 'Squaring takes four to sixteen. The square root brings sixteen back to four.' },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: squareOf(0),
      also: [1, 2].map((i) => ({ at: [1.9, 3.6][i - 1], stage: squareOf(i) })),
      say: 'The square root of nine is three. Of twenty-five, five. Of one hundred, ten.',
    },
    {
      clear: true,
      stage: { line: line([{ root: ['9', '+', '16'] }, '=', '5'], { y: 320, size: 170 }) },
      say: 'The line on top shows how far the root reaches. Here it covers nine plus sixteen. That is twenty-five, and its root is five.',
    },
    {
      stage: { twin: line([{ root: '9' }, '+', { root: '16' }, '=', '7'], { y: 720, size: 170 }) },
      say: 'Here each root has a short line of its own. Three plus four is seven. The line groups what is under it, as brackets do.',
    },
    {
      clear: true,
      stage: { beads: ten(), line: line(['3', '<', { root: '10' }, '<', '4'], { y: 250, size: 160 }) },
      say: 'Ten beads cannot make a square: three rows of three leave one over. So the square root of ten is more than three, and less than four.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true6', prompt: 'Which one is true?', cards: [[{ root: '36' }, '=', '18'], [{ root: '36' }, '=', '6']], right: 1 },
    },
    {
      clear: true,
      say: 'Nine beads make this square. Build one side of it.',
      turn: {
        kind: 'build',
        id: 'side3',
        prompt: 'Build one side of the square.',
        target: 3,
        max: 5,
        zone: { x: 460, y: 320, w: 1000, h: 560 },
        state: (n) => ({
          square: loose(grid(9, 3, NINE.x, NINE.y, NINE.step), { s: 2, k: 'q' }),
          side: side(n),
          line: line([{ root: '9' }, '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: TOP, gold: n === 3 ? ['='] : [], faint: n === 3 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([{ root: '100' }, '=', '10'], { y: 480, size: 210 }) }, move: 0.6, say: 'The square root of one hundred equals ten.', turn: { kind: 'read', id: 'read10', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { line: line(['3', '<', { root: '10' }, '<', '4'], { y: 460, size: 180 }) }, say: 'The square root of ten is between three and four.' },
    { teaser: true, stage: { line: line(['3', '<', { root: '10' }, '<', '4'], { y: 460, size: 180, gold: ['√'] }) }, move: 0.5, say: 'How do we write a number that is between three and four?', pad: 1 },
  ],
}
