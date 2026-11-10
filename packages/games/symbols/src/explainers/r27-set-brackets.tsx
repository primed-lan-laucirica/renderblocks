/**
 * Rank 27, set brackets: a set written on one line. The signs on the paper
 * are those of ranks 1–7, letters (rank 12), ∧ (rank 23), ∀ (rank 25),
 * ∈ and ∉ (rank 26) and the five themselves. Curly brackets hold a set,
 * a comma keeps each element apart from the next, three dots say "and so
 * on", and the upright bar says "such that" (it is one bar on its own, not
 * the pair of bars of rank 11). Where they are used: sets too long to
 * list, sets given by a rule, a statement about a whole set, and the
 * answers to a question.
 *
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { loop, membersIn, type Loop } from '../kit/logic'
import { beadAt, numberLine, onLine, stretch, type Ruler } from '../kit/measures'
import { line } from '../kit/sprites'

/** Two loops with the same three numbers, set in a different order. */
const LEFT: Loop = { x: 500, y: 520, rx: 340, ry: 250 }
const RIGHT: Loop = { x: 1420, y: 520, rx: 340, ry: 250 }
const three = (k: string, l: Loop, toks: string[], gold = false) => membersIn(k, l, toks, { size: 120, gold: gold ? [0, 1, 2] : [] })

/** The line beside the loop A. */
const SIDE = { x: 1400, size: 150 }

/** The numbers more than three, marked along a number line. */
const R: Ruler = { x0: 360, x1: 1560, y: 560, from: 0, to: 7 }

export const r27: Spec = {
  rank: 27,
  id: 'r27',
  title: 'Set brackets',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { a: [...loop('a', LEFT), ...three('a', LEFT, ['1', '2', '3'])], b: [...loop('b', RIGHT), ...three('b', RIGHT, ['3', '1', '2'])] },
      say: 'Two loops, each holding one, two and three. Are they the same set, or different sets?',
      turn: { kind: 'predict', id: 'sameset', prompt: 'The same set, or different sets?', options: [{ label: 'The same' }, { label: 'Different' }] },
    },
    {
      stage: { a: [...loop('a', LEFT), ...three('a', LEFT, ['1', '2', '3'], true)], b: [...loop('b', RIGHT), ...three('b', RIGHT, ['3', '1', '2'], true)] },
      move: 0.5,
      say: 'The same. A set is only what is in it, not where each thing sits.',
    },
    {
      stage: { a: [...loop('a', LEFT, { name: 'A' }), ...three('a', LEFT, ['1', '2', '3'])], b: null, line: line(['A', '=', '?'], { x: SIDE.x, y: 520, size: 190, gold: ['?'] }) },
      say: 'Drawing a loop every time takes a while. We want to write the set A on one line.',
    },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { line: line(['A', '=', '{', '1', ',', '2', ',', '3', '}'], { x: SIDE.x, y: 520, size: SIDE.size, gold: ['{', '}'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Curly brackets hold a set, and its elements are listed between them. A is the set of one, two and three.',
      poster: true,
    },
    {
      stage: {
        line: line(['A', '=', '{', '1', ',', '2', ',', '3', '}'], { x: SIDE.x, y: 400, size: SIDE.size, gold: [','] }),
        joined: line(['{', '123', '}'], { x: SIDE.x + 96, y: 680, size: SIDE.size }),
      },
      say: 'A comma keeps each element apart from the next. Without the commas, this set would hold one number: one hundred and twenty-three.',
    },
    {
      clear: true,
      stage: { line: line(['{', '1', ',', '2', ',', '3', '}', '=', '{', '3', ',', '1', ',', '2', '}'], { y: 480, size: 150 }) },
      say: 'Written in another order, it is still the same set.',
    },
    {
      clear: true,
      stage: { line: line(['{', '2', ',', '4', ',', '6', ',', '…', '}'], { y: 480, size: 210, gold: ['…'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Three dots mean: and so on. This is every even number: a set that never ends, on one line.',
    },
    {
      stage: { line: line(['{', '1', ',', '2', ',', '3', ',', '…', ',', '100', '}'], { y: 480, size: 170 }) },
      say: 'Dots in the middle skip ahead: every whole number from one to one hundred.',
    },
    {
      clear: true,
      stage: { line: line(['{', 'x', '∣', 'x', '>', '3', '}'], { y: 280, size: 210, gold: ['∣'] }), axis: numberLine(R, { size: 60 }), more: [stretch('more', R, 3, 7.3)] },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Some sets cannot be listed at all, so we give a rule. The upright bar says: such that. This is the set of all x such that x is more than three.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      stage: {
        line: line(['B', '=', '{', 'x', '∣', 'x', '>', '3', '}'], { y: 280, size: 170 }),
        marks: [beadAt('five', onLine(R, 5), R.y - 52, 60), beadAt('two', onLine(R, 2), R.y - 52, 60, 'blue')],
        isin: line(['5', '∈', 'B'], { x: 1360, y: 860, size: 150 }),
        notin: line(['2', '∉', 'B'], { x: 560, y: 860, size: 150 }),
      },
      say: 'To see what is in such a set, check the rule. Five is more than three, so five is in B. Two is not.',
    },
    {
      clear: true,
      stage: { set: line(['A', '=', '{', '1', ',', '2', ',', '3', '}'], { y: 330, size: 170 }), line: line(['∀', 'x', '∈', 'A', '(', 'x', '<', '4', ')'], { y: 680, size: 170 }) },
      say: 'A statement about a whole set fits on a line too. For all x in A, x is less than four.',
    },
    {
      clear: true,
      stage: { ask: line(['x', { sup: '2' }, '=', '9'], { y: 330, size: 190 }), line: line(['x', '∈', '{', '−', '3', ',', '3', '}'], { y: 680, size: 190 }) },
      say: 'And the answers to a question can be a set. X squared equals nine has two answers: minus three, and three.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which of these sets has five in it?',
      turn: { kind: 'choose', id: 'five', prompt: 'Which set has five in it?', cards: [['{', 'x', '∣', 'x', '<', '3', '}'], ['{', 'x', '∣', 'x', '>', '3', '}']], right: 1 },
    },
    {
      clear: true,
      say: 'This should be every even number. Which sign goes in the gap?',
      turn: { kind: 'place', id: 'evens', prompt: 'Make it every even number.', toks: ['{', '2', ',', '4', ',', '6', ',', '_', '}'], tiles: ['∣', '…'], right: '…', size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line(['{', 'x', '∣', 'x', '>', '2', '}'], { y: 480, size: 230 }) },
      move: 0.6,
      say: 'The set of all x such that x is more than two.',
      turn: { kind: 'read', id: 'readrule', prompt: 'You read it.' },
    },
    {
      clear: true,
      teaser: true,
      stage: { line: line(['{', 'x', '∣', 'x', '>', '5', '∧', 'x', '<', '3', '}'], { y: 380, size: 150 }) },
      say: 'The set of all x such that x is more than five, and less than three. No number is in it.',
    },
    { teaser: true, stage: { ask: line(['?'], { y: 700, size: 230, gold: ['?'] }) }, say: 'How do we write a set with nothing in it?', pad: 1 },
  ],
}
