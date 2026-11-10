/**
 * Rank 11, |x| : how far from zero. The signs on the paper are =, −, <, >
 * and the two bars only. A number line shows what order cannot: −3 is less
 * than 3, yet just as far from zero. The bars ask only for that distance,
 * so they are used wherever the size of a gap matters and its direction
 * does not.
 *
 * The one tie kept is between signs: the bars come as a pair round what
 * they act on, as brackets do. No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { beadAt, hop, numberLine, onLine, stretch, type Ruler } from '../kit/measures'
import { line, loose, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const BLUE = '#5b9bd5'
/** Minus five to five, zero in the middle. */
const R: Ruler = { x0: 360, x1: 1560, y: 700, from: -5, to: 5 }
const TEN: Ruler = { x0: 260, x1: 1660, y: 760, from: 0, to: 10 }

const at = (r: Ruler, v: number, colour?: 'blue'): Sprite => beadAt(`at${v}`, onLine(r, v), r.y, 58, colour)
/** `n` hops out from zero, one number each: to the right, or (in blue) to the left. */
const out = (n: number, side: 1 | -1): Sprite[] => Array.from({ length: n }, (_, i) => hop(`${side > 0 ? 'r' : 'l'}${i}`, R, side * i, side * (i + 1), { h: 76, colour: side > 0 ? undefined : BLUE }))
const hops = (right: number, left: number) => [...out(right, 1), ...out(left, -1)]

const ABS = ['|', '−3', '|', '=', '3']

export const r11: Spec = {
  rank: 11,
  id: 'r11',
  title: 'Absolute value',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { axis: numberLine(R), beads: [at(R, 3), at(R, -3, 'blue')] },
      say: 'Here is three. And here, on the other side of zero, is minus three. Which one is further from zero?',
      turn: { kind: 'predict', id: 'far', prompt: 'Which one is further from zero?', options: [{ label: 'Three is further' }, { label: 'Both the same' }] },
    },
    {
      stage: { hops: hops(1, 0) },
      move: 0.4,
      also: [
        [2, 0],
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
      ].map(([r, l], i) => ({ at: [0.45, 0.9, 1.5, 1.95, 2.4][i], move: 0.4, stage: { hops: hops(r, l) } })),
      say: 'Three steps this way. And three steps that way. Both the same.',
    },
    { stage: { line: line(['−3', '<', '3'], { y: TOP }) }, say: 'Minus three is less than three. But it is just as far from zero.' },
    { stage: { line: line(['_', '−3', '_', '=', '3'], { y: TOP, gold: ['_'] }) }, move: 1.1, say: 'We need a sign for how far from zero.' },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: line(ABS, { y: TOP }) }, quiet: 1.4, motif: true, say: 'These two bars mean absolute value.' },
    { say: 'The absolute value of minus three equals three.', poster: true },
    { stage: { line: line(ABS, { y: TOP, gold: ['|'] }) }, move: 0.5, say: 'The bars ask one thing: how far from zero? It does not matter which way.' },
    { stage: { twin: line(['|', '3', '|', '=', '3'], { y: 390, size: 130 }) }, say: 'The absolute value of three is three as well. A distance is never less than zero.' },
    { stage: { twin: line(['|', '3', '|', '=', '3'], { y: 390, size: 130, gold: ['|'] }) }, move: 0.5, say: 'The bars come in a pair, as brackets do: one before, and one after.' },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { axis: numberLine(TEN), gap: [stretch('gap', TEN, 2, 5)], beads: [at(TEN, 2, 'blue'), at(TEN, 5)], line: line(['|', '5', '−', '2', '|', '=', '3'], { y: 220, size: 140 }) },
      also: [{ at: 5.2, stage: { twin: line(['|', '2', '−', '5', '|', '=', '3'], { y: 440, size: 140 }) } }],
      say: 'How far apart are two and five? Take one from the other, inside the bars. Either way round, the answer is three.',
    },
    {
      clear: true,
      stage: {
        axis: numberLine(R),
        gap: [stretch('lo', R, 0, -5, { colour: BLUE }), stretch('hi', R, 0, 3)],
        beads: [at(R, -5, 'blue'), at(R, 3)],
        line: line(['−5', '<', '3'], { y: 220, size: 140 }),
      },
      also: [{ at: 2.3, stage: { twin: line(['|', '−5', '|', '>', '|', '3', '|'], { y: 440, size: 140 }) } }],
      say: 'Minus five is less than three. But its absolute value is greater: it is further from zero.',
    },
    {
      clear: true,
      stage: { axis: numberLine(TEN), gap: [stretch('gap', TEN, 8, 10)], beads: [at(TEN, 8, 'blue'), at(TEN, 10)], line: line(['|', '8', '−', '10', '|', '=', '2'], { y: 330, size: 170 }) },
      say: 'Use it when only the size of a gap matters. A guess of eight, when the answer is ten, is off by two.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true4', prompt: 'Which one is true?', cards: [['|', '−4', '|', '=', '−4'], ['|', '−4', '|', '=', '4']], right: 1 },
    },
    {
      clear: true,
      say: 'Which sign goes here?',
      turn: { kind: 'place', id: 'sign62', prompt: 'Which sign goes here?', toks: ['|', '−6', '|', '_', '|', '2', '|'], tiles: ['<', '=', '>'], right: '>' },
    },
    {
      clear: true,
      say: 'How far is minus four from zero? Count the steps.',
      turn: {
        kind: 'build',
        id: 'steps4',
        prompt: 'How far is minus four from zero?',
        target: 4,
        max: 5,
        zone: { x: 300, y: 380, w: 1320, h: 440 },
        state: (n) => ({
          axis: numberLine(R),
          hops: Array.from({ length: n }, (_, i) => hop(`h${i}`, R, -4 + i, -3 + i, { h: 76 })),
          beads: [at(R, -4, 'blue')],
          steps: loose(Array.from({ length: n }, (_, i) => ({ x: onLine(R, -3.5 + i), y: R.y - 160 })), { k: 'c', s: 1.3, from: { x: SUPPLY.x, y: SUPPLY.y } }),
          line: line(['|', '−4', '|', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: TOP, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line(['|', '3', '−', '8', '|', '=', '5'], { y: 480, size: 200 }) },
      move: 0.6,
      say: 'The absolute value of three minus eight equals five.',
      turn: { kind: 'read', id: 'read5', prompt: 'You read it.' },
    },
    { clear: true, teaser: true, stage: { line: line(['?', '+', '2', '=', '5'], { y: 460, size: 190 }) }, say: 'Some number, plus two, equals five.' },
    { teaser: true, stage: { line: line(['?', '+', '2', '=', '5'], { y: 460, size: 190, gold: ['?'] }) }, move: 0.5, say: 'What shall we call a number we do not know yet?', pad: 1 },
  ],
}
