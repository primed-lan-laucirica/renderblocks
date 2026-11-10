/**
 * Rank 28, the empty set: the set with nothing in it. The signs on the
 * paper are those of ranks 1–6, letters (rank 12), ∧ (rank 23), ∀ (rank
 * 25), ∈ and ∉ (rank 26), the set brackets (rank 27) and ∅ itself. A rule
 * that no number meets still names a set; its loop is empty, its brackets
 * hold nothing, and it has a sign of its own. It looks like a zero with a
 * stroke through it, but it is not zero: zero is a number, and even the
 * set that holds only zero has one element. Where it is used: a question
 * with no answers, and two sets that share nothing.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import { PEN, loop, member, membersIn, type Loop } from '../kit/logic'
import { numberLine, stretch, type Ruler } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'

/** The rule no number meets, over a number line: more than five (gold), less than three (blue). */
const RULE = ['{', 'x', '∣', 'x', '>', '5', '∧', 'x', '<', '3', '}']
const R: Ruler = { x0: 360, x1: 1560, y: 620, from: 0, to: 8 }

/** The empty loop: in the middle at first, then on the left with what is written beside it. */
const MID: Loop = { x: 960, y: 680, rx: 330, ry: 230 }
const LEFT: Loop = { x: 520, y: 560, rx: 340, ry: 250 }
const SIDE: Pt = { x: 1400, y: 540 }
/** Two brackets with nothing between them, set a little apart so the nothing can be seen. */
const bare = (x: number, y: number, size: number): Sprite[] => line(['{', '}'], { x, y, size, at: [x - size * 0.3, x + size * 0.3] })

/** Two loops side by side, with what each is called written over it. */
const PAIR: [Loop, Loop] = [
  { x: 520, y: 660, rx: 320, ry: 230 },
  { x: 1400, y: 660, rx: 320, ry: 230 },
]

/** The closing question's picture: the set A inside the set B. */
const OUTER: Loop = { x: 600, y: 560, rx: 500, ry: 360 }
const INNER: Loop = { x: 470, y: 600, rx: 250, ry: 230 }
const REST: Pt[] = [
  { x: 820, y: 400 },
  { x: 900, y: 580 },
  { x: 820, y: 760 },
]

export const r28: Spec = {
  rank: 28,
  id: 'r28',
  title: 'The empty set',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { line: line(RULE, { y: 260, size: 150 }), axis: numberLine(R, { size: 60 }), marks: [stretch('low', R, -0.3, 3, { colour: PEN.blue }), stretch('high', R, 5, 8.3)] },
      say: 'The set of all x such that x is more than five, and less than three. How many elements does it have?',
      turn: { kind: 'predict', id: 'none', prompt: 'How many elements does it have?', options: [{ label: 'None' }, { label: 'One' }] },
    },
    { say: 'None. No number is more than five and also less than three.' },
    { stage: { axis: null, marks: null, set: loop('set', MID) }, say: 'So its loop is empty. A set with nothing in it is still a set.' },
    {
      stage: { line: null, set: loop('set', LEFT), bare: bare(SIDE.x, SIDE.y, 260) },
      say: 'In curly brackets, it is two brackets with nothing between them. That is easy to miss.',
    },

    // ── 2. What the sign does ──
    {
      act: 2,
      stage: { bare: null, sign: line(['∅'], { x: SIDE.x, y: SIDE.y, size: 340, gold: ['∅'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'So it has a sign of its own. This is the empty set: the set with no elements.',
      poster: true,
    },
    {
      clear: true,
      stage: { line: line(['∅', '≠', '0'], { y: 480, size: 260 }) },
      say: 'It looks like a zero with a stroke through it, but it is not zero. Zero is a number. The empty set is a set.',
    },
    {
      clear: true,
      stage: {
        zero: [...loop('zero', PAIR[0]), member('zero/0', '0', PAIR[0], { size: 130 }), ...line(['{', '0', '}'], { x: PAIR[0].x, y: 260, size: 170 }).map((s) => ({ ...s, k: `zero/${s.k}` }))],
        none: [...loop('none', PAIR[1]), ...line(['∅'], { x: PAIR[1].x, y: 260, size: 190 })],
      },
      say: 'Even the set that holds only zero is not empty: it has one element. The empty set has none.',
    },
    {
      clear: true,
      stage: { line: line(['∀', 'x', '(', 'x', '∉', '∅', ')'], { y: 480, size: 210 }) },
      say: 'Whatever x is, it is not in there. For all x, x is not an element of the empty set.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { ask: line(['x', '+', '1', '=', 'x'], { y: 330, size: 190 }), line: line(['{', 'x', '∣', 'x', '+', '1', '=', 'x', '}', '=', '∅'], { y: 680, size: 150 }) },
      say: 'Which x makes this line true? None does. So the set of its answers is the empty set.',
    },
    {
      clear: true,
      stage: {
        a: [...loop('a', PAIR[0], { name: 'A', pen: 'blue' }), ...membersIn('a', PAIR[0], ['2', '4', '6', '8'], { size: 100, r: 0.55 })],
        b: [...loop('b', PAIR[1], { name: 'B', pen: 'red' }), ...membersIn('b', PAIR[1], ['1', '3', '5', '7'], { size: 100, r: 0.55 })],
        line: line(['{', 'x', '∣', 'x', '∈', 'A', '∧', 'x', '∈', 'B', '}', '=', '∅'], { y: 200, size: 120 }),
      },
      say: 'And which numbers are in both of these sets? No number is both even and odd, so that set is empty too.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is the empty set?',
      turn: { kind: 'choose', id: 'empty', prompt: 'Which one is the empty set?', cards: [['{', '0', '}'], ['{', '}']], right: 1 },
    },
    {
      clear: true,
      say: 'Is three in the empty set? Put in the sign that makes this line true.',
      turn: { kind: 'place', id: 'three', prompt: 'Which sign makes it true?', toks: ['3', '_', '∅'], tiles: ['∈', '∉'], right: '∉', size: 230 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['0', '∉', '∅'], { y: 480, size: 250 }) }, move: 0.6, say: 'Zero is not an element of the empty set.', turn: { kind: 'read', id: 'read0', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: {
        sets: [...loop('b', OUTER, { name: 'B', pen: 'red' }), ...loop('a', INNER, { name: 'A', nameAt: { x: 262, y: 372 }, pen: 'blue' })],
        in: [...membersIn('a', INNER, ['2', '4', '6'], { size: 100 }), ...['1', '3', '5'].map((g, i) => member(`b${i}`, g, REST[i], { size: 100 }))],
      },
      say: 'Every element of A is also in B.',
    },
    { teaser: true, stage: { line: line(['A', '?', 'B'], { x: 1500, y: 540, size: 190, gold: ['?'] }) }, say: 'How do we write that one set sits inside another?', pad: 1 },
  ],
}
