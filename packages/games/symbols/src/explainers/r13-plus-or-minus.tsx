/**
 * Rank 13, ± : plus or minus. The signs on the paper are =, +, −, ≈, the
 * bars, the letter x and ± only. |x| = 3 has two answers, three steps
 * either side of zero, and ± writes both on one line. Where it is used:
 * wherever something is measured, a number and how far off it may be
 * (ten, give or take one).
 *
 * The ties kept are between signs: ± is a plus sitting on a minus, and it
 * says more than ≈ does (not only "about", but how far off). No names or
 * dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { piles } from '../kit/algebra'
import { beadAt, numberLine, onLine, stretch, type Ruler } from '../kit/measures'
import { line, loose, row, type Sprite } from '../kit/sprites'

const BLUE = '#5b9bd5'
/** Minus five to five, zero in the middle. */
const R: Ruler = { x0: 360, x1: 1560, y: 720, from: -5, to: 5 }
/** Five to fifteen, for a measurement of about ten. */
const M: Ruler = { x0: 360, x1: 1560, y: 720, from: 5, to: 15 }
/** A bag of flour: 480 to 520 grams. */
const F: Ruler = { x0: 360, x1: 1560, y: 720, from: 480, to: 520 }

const BIG = { y: 260, size: 210 }
const SMALL = { y: 540, size: 92 }

/** The two numbers v steps from zero: a bead over each, and the stretch of the line out to it. */
const pair = (v: number): Sprite[] => [beadAt('ml', onLine(R, -v), R.y - 58, 62, 'blue'), beadAt('mr', onLine(R, v), R.y - 58, 62)]
const reach = (v: number): Sprite[] => [stretch('lo', R, 0, -v, { colour: BLUE }), stretch('hi', R, 0, v)]
/** The two lines it takes without the sign, one over each bead. */
const two = (v: number, gold = false) => {
  const lit = gold ? ['x', '=', `−${v}`, String(v)] : []
  return { left: line(['x', '=', `−${v}`], { ...SMALL, x: onLine(R, -v), gold: lit }), right: line(['x', '=', String(v)], { ...SMALL, x: onLine(R, v), gold: lit }) }
}
const pm = (v: number, gold: string[] = []) => line(['x', '=', '±', String(v)], { ...BIG, gold })

/** A long list: the first four numbers have letters, the rest have none yet. */
const LIST = [3, 1, 4, 2, 5, 3, 2, 4, 1, 3]
const list = (gold: number[] = []) => piles(LIST, { y: 700, step: 150, label: (i) => [i < 4 ? 'abcd'[i] : '?'], labelSize: 72, gold })

export const r13: Spec = {
  rank: 13,
  id: 'r13',
  title: 'Plus or minus',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { axis: numberLine(R, { size: 60 }), line: line(['|', 'x', '|', '=', '3'], { y: 260, size: 190 }) },
      say: 'The absolute value of x equals three: x is three steps from zero. How many numbers could x be?',
      turn: { kind: 'predict', id: 'howmany', prompt: 'How many numbers could x be?', options: [{ label: 'One' }, { label: 'Two' }] },
    },
    { stage: { gap: reach(3), beads: pair(3) }, say: 'Two. Three is three steps from zero. So is minus three.' },
    { stage: { ...two(3) }, say: 'So x equals three, or x equals minus three. That takes two lines.' },
    { stage: { line: line(['x', '=', '_', '3'], { ...BIG, gold: ['_'] }) }, move: 1.1, say: 'We need one sign that says both: plus, or minus.' },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: pm(3) }, quiet: 1.4, motif: true, say: 'This is the plus or minus sign.' },
    { say: 'We read it: x equals plus or minus three.', poster: true },
    { stage: { line: pm(3, ['±']) }, move: 0.5, say: 'Look at its shape: a plus, sitting on a minus. One sign that says both.' },
    { stage: { line: pm(3), ...two(3, true) }, move: 0.5, say: 'It is short for two lines: x equals three, or x equals minus three.' },
    {
      stage: { line: pm(5), gap: reach(5), beads: pair(5), ...two(5) },
      say: 'x equals plus or minus five: five, or minus five. Always two numbers, just as far from zero as each other.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { axis: numberLine(M, { size: 60 }), beads: [beadAt('m', onLine(M, 10), M.y - 58, 62)], line: line(['10', '±', '1'], { y: 270, size: 220 }) },
      say: 'You will see this sign most where things are measured. This says: ten, give or take one.',
    },
    {
      stage: { gap: [stretch('gap', M, 9, 11)], low: line(['10', '−', '1', '=', '9'], { x: 540, y: 530, size: 96 }), high: line(['10', '+', '1', '=', '11'], { x: 1380, y: 530, size: 96 }) },
      say: 'Ten minus one is nine. Ten plus one is eleven. The true number is somewhere from nine to eleven.',
    },
    {
      clear: true,
      stage: { axis: numberLine(F, { every: 10, size: 60 }), gap: [stretch('gap', F, 490, 510)], line: line(['500', '±', '10'], { y: 270, size: 220 }) },
      say: 'A bag of flour may be marked five hundred grams, plus or minus ten. It holds somewhere from four hundred and ninety to five hundred and ten.',
    },
    {
      clear: true,
      stage: { about: line(['x', '≈', '10'], { y: 360, size: 190, gold: ['≈'] }), exact: line(['x', '=', '10', '±', '1'], { y: 660, size: 190, gold: ['±'] }) },
      say: 'Approximately equal says: about ten. Plus or minus says more: how far off it may be.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one says that x is five, or minus five?',
      turn: { kind: 'choose', id: 'pm5', prompt: 'Which one says x is five, or minus five?', cards: [['x', '=', '±', '5'], ['x', '≈', '5']], right: 0 },
    },
    {
      clear: true,
      stage: { axis: numberLine({ ...M, y: 570 }, { size: 60 }), gap: [stretch('gap', { ...M, y: 570 }, 8, 12)] },
      say: 'The true number is somewhere from eight to twelve. Which sign goes here?',
      turn: { kind: 'place', id: 'give2', prompt: 'Which sign goes here?', toks: ['10', '_', '2'], tiles: ['+', '−', '±'], right: '±', y: 260, size: 200 },
    },
    {
      clear: true,
      say: 'Ten, plus or minus three. Build the smallest number it can be.',
      turn: {
        kind: 'build',
        id: 'small7',
        prompt: 'Build the smallest it can be.',
        target: 7,
        max: 10,
        zone: { x: 360, y: 550, w: 1200, h: 220 },
        state: (n) => ({
          line: line(['10', '±', '3'], { y: 190, size: 150 }),
          found: line(['10', '−', '3', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: 400, size: 130, gold: n === 7 ? ['='] : [], faint: n === 7 ? [] : ['='] }),
          row: loose(row(10, 960, 660, 112), { s: 2.2, ghost: (i) => (i < n ? 0 : 1) }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['x', '=', '±', '2'], { y: 480, size: 230 }) }, move: 0.6, say: 'x equals plus or minus two.', turn: { kind: 'read', id: 'readpm', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { list: list() }, say: 'Here is a list of numbers. We can name them A, B, C, D.' },
    { teaser: true, stage: { list: list([4, 5, 6, 7, 8, 9]) }, move: 0.5, say: 'But a list may have a hundred numbers, and there are only twenty-six letters. How can we name them all?', pad: 1 },
  ],
}
