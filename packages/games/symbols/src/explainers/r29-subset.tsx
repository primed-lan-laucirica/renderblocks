/**
 * Rank 29, subset: one set inside another. The signs on the paper are
 * those of ranks 1–7, letters (rank 12), ⇒ (rank 24), ∀ (rank 25), ∈ (rank
 * 26), the set brackets (rank 27), ∅ (rank 28) and the two themselves.
 * ⊆ says every element of the one set is also in the other; it is the
 * less-than-or-equal sign made round, its open end to the bigger one and
 * the line underneath for "or equal", so every set is a subset of itself.
 * Without the line, ⊂ says a proper subset: inside, and not the whole.
 * (Some books write ⊂ for both; the narration says so once.) Where it is
 * used: one kind of number that is a special kind of another.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { loop, member, membersIn, venn, vennAt, type Loop, type Venn } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'

/** The set A (two, four, six) inside the set B (one to six), on the left of the paper. */
const OUTER: Loop = { x: 600, y: 520, rx: 500, ry: 330 }
const INNER: Loop = { x: 490, y: 570, rx: 240, ry: 200 }
const REST: Pt[] = [
  { x: 830, y: 370 },
  { x: 910, y: 540 },
  { x: 830, y: 710 },
]
const sets = (): Sprite[] => [...loop('b', OUTER, { name: 'B', pen: 'red' }), ...loop('a', INNER, { name: 'A', nameAt: { x: 275, y: 350 }, pen: 'blue' })]
/** Their members; `gold` lights the three that are in B only, or the three in A. */
const members = (gold?: 'rest' | 'inner'): Sprite[] => [
  ...membersIn('a', INNER, ['2', '4', '6'], { size: 100, gold: gold === 'inner' ? [0, 1, 2] : [] }),
  ...['1', '3', '5'].map((g, i) => member(`b${i}`, g, REST[i], { size: 100, gold: gold === 'rest' })),
]

/** The lines written beside the picture: the sets' line, and the numbers' line under it. */
const SIDE = { x: 1500, y: [380, 660], size: 190 }
const beside = (i: number, toks: Tok[], gold: string[] = []) => line(toks, { x: SIDE.x, y: SIDE.y[i], size: SIDE.size, gold })

/** The closing question's picture: two sets that overlap. */
const V: Venn = { x: 700, y: 560, r: 320, d: 200 }
const inPart = (part: 'a' | 'both' | 'b', toks: [string, string]): Sprite[] => toks.map((g, i) => member(`${part}${i}`, g, { x: vennAt(V, part).x, y: V.y + (i ? 90 : -90) }, { size: 100 }))

export const r29: Spec = {
  rank: 29,
  id: 'r29',
  title: 'Subsets',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sets: sets(), in: members() },
      say: 'Every element of A is also in B. Is every element of B in A?',
      turn: { kind: 'predict', id: 'allin', prompt: 'Is every element of B in A?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { stage: { in: members('rest') }, move: 0.5, say: 'No. One is in B, but it is not in A. So A sits inside B, and B holds more.' },
    { stage: { in: members(), line: beside(0, ['A', '?', 'B'], ['?']) }, say: 'How do we write that one set sits inside another?' },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { line: beside(0, ['A', '⊆', 'B'], ['⊆']), in: members('inner') },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: is a subset of. A is a subset of B: every element of A is also in B.',
    },
    {
      stage: { line: beside(0, ['A', '⊆', 'B']), tie: beside(1, ['3', '≤', '6']), in: members() },
      say: 'It looks like the less-than-or-equal sign, made round. And its open end faces the bigger one in the same way.',
    },
    {
      stage: { line: beside(0, ['B', '⊆', 'B']), tie: beside(1, ['6', '≤', '6']) },
      say: 'The line underneath means: or equal. Six is less than or equal to six, and every set is a subset of itself.',
    },
    {
      stage: { line: beside(0, ['A', '⊂', 'B'], ['⊂']), tie: beside(1, ['3', '<', '6']), in: members('rest') },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Take the line away, and it says: is a proper subset of. A is inside B, and A is not all of B.',
      poster: true,
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { top: line(['A', '⊆', 'B'], { y: 300, size: 190 }), line: line(['∀', 'x', '(', 'x', '∈', 'A', '⇒', 'x', '∈', 'B', ')'], { y: 660, size: 130 }) },
      say: 'What it says can be written with signs we know. For all x, if x is in A, then x is in B.',
    },
    {
      clear: true,
      stage: { line: line(['{', '4', ',', '8', ',', '12', ',', '…', '}', '⊂', '{', '2', ',', '4', ',', '6', ',', '…', '}'], { y: 480, size: 120, gold: ['⊂'] }) },
      say: 'It is used when one kind of number is a special kind of another. Every multiple of four is even, so the multiples of four are a proper subset of the even numbers.',
    },
    {
      clear: true,
      stage: { line: line(['∅', '⊆', 'A'], { y: 480, size: 230 }) },
      say: 'The empty set is a subset of every set: it has no element that could be left out.',
    },
    {
      clear: true,
      stage: { line: line(['⊂', '⊆'], { y: 480, size: 260, at: [800, 1120], gold: ['⊂'] }) },
      say: 'Take care: in some books, the sign without the line is used for both.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { a: line(['A', '=', '{', '1', ',', '2', '}'], { x: 520, y: 220, size: 120 }), b: line(['B', '=', '{', '1', ',', '2', ',', '3', '}'], { x: 1400, y: 220, size: 120 }) },
      say: 'Here are two sets, A and B. Which one is true?',
      turn: { kind: 'choose', id: 'inside', prompt: 'Which one is true?', cards: [['A', '⊆', 'B'], ['B', '⊆', 'A']], right: 0 },
    },
    {
      clear: true,
      say: 'These two sets are equal. Put in the sign that makes this line true.',
      turn: { kind: 'place', id: 'equal', prompt: 'Which sign makes it true?', toks: ['{', '1', ',', '2', '}', '_', '{', '1', ',', '2', '}'], tiles: ['⊆', '⊂'], right: '⊆', size: 170 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['A', '⊂', 'B'], { y: 480, size: 250 }) }, move: 0.6, say: 'A is a proper subset of B.', turn: { kind: 'read', id: 'readproper', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { sets: venn('v', V, { names: ['A', 'B'] }), in: [...inPart('a', ['1', '2']), ...inPart('both', ['3', '4']), ...inPart('b', ['5', '6'])] },
      say: 'These two sets overlap. Three and four are in both.',
    },
    { teaser: true, stage: { line: line(['A', '?', 'B'], { x: 1560, y: 560, size: 170, gold: ['?'] }) }, say: 'How do we write the part in both? And everything in either?', pad: 1 },
  ],
}
