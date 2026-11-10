/**
 * Rank 35, therefore: the sign for "so". The signs on the paper are those
 * of ranks 1–7, letters (rank 12), plus or minus (rank 13), rank 23's not,
 * rank 24's arrow, the set signs of ranks 26 and 29, and the three dots
 * themselves. ∴ stands before a line that must follow from the lines
 * above it. The arrow says only "if"; therefore says the first part is
 * known, so the second may be written down. Where it is used: each step
 * of solving, and any argument from what is known; and it has to be
 * earned (x² = 4 does not give x = 2).
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { lamp, loop, member, type Loop } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

/** Three lines, one under the other: what is known, and then what follows (a line given as null stays as it was). */
const ROW = { y: [270, 510, 750], size: 170 }
const rows = (lines: (Tok[] | null)[], o: { x?: number; size?: number; gold?: string[]; faint?: number[] } = {}): Patch =>
  Object.fromEntries(lines.flatMap((toks, i) => (toks ? [[`row${i}`, line(toks, { x: o.x, y: ROW.y[i], size: o.size ?? ROW.size, gold: o.gold, fade: o.faint?.includes(i) ? 0.35 : 1 })]] : [])))

const KNOWN: Tok[][] = [
  ['x', '>', '5'],
  ['5', '>', '3'],
]

/** A inside B, with four in A. */
const OUTER: Loop = { x: 520, y: 590, rx: 400, ry: 310 }
const INNER: Loop = { x: 560, y: 640, rx: 200, ry: 150 }
const sets = (): Sprite[] => [...loop('b', OUTER, { name: 'B', pen: 'red' }), ...loop('a', INNER, { name: 'A', nameAt: { x: 330, y: 470 }, pen: 'blue' }), member('four', '4', { x: INNER.x, y: INNER.y }, { size: 110 })]

/** A therefore that was not earned, and the one that was: each with its lamp beside it. */
const LAMP_X = 1500
const claimed = (k: string, toks: Tok[], y: number, on: boolean): Sprite[] => [...line(toks, { y, size: ROW.size, gold: ['∴'] }).map((s) => ({ ...s, k: `${k}/${s.k}` })), lamp(`${k}/lamp`, LAMP_X, y, on, { r: 46 })]

export const r35: Spec = {
  rank: 35,
  id: 'r35',
  title: 'Therefore',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: rows(KNOWN),
      say: 'X is more than five. Five is more than three. Is x more than three?',
      turn: { kind: 'predict', id: 'follows', prompt: 'Is x more than three?', options: [{ label: 'Yes' }, { label: 'Cannot tell' }] },
    },
    { stage: rows([null, null, ['?', 'x', '>', '3']], { gold: ['?'] }), say: 'Yes. It follows from the two lines above. We want a sign that says: so.' },

    // ── 2. What the sign does ──
    {
      act: 2,
      stage: rows([null, null, ['∴', 'x', '>', '3']], { gold: ['∴'] }),
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Three dots in a triangle say: therefore. Therefore, x is more than three.',
      poster: true,
    },
    {
      stage: rows([...KNOWN, ['∴', 'x', '>', '3']], { faint: [2] }),
      move: 0.5,
      say: 'The lines above it are what we know.',
    },
    { stage: rows([...KNOWN, ['∴', 'x', '>', '3']], { faint: [0, 1] }), move: 0.5, say: 'The line after it is what must follow.' },
    {
      clear: true,
      stage: rows([['x', '=', '2', '⇒', 'x', '+', '1', '=', '3']], { size: 150, gold: ['⇒'] }),
      say: 'The arrow from before says only: if. It does not say that x is two.',
    },
    {
      stage: rows([['x', '=', '2', '⇒', 'x', '+', '1', '=', '3'], ['x', '=', '2'], ['∴', 'x', '+', '1', '=', '3']], { size: 150, gold: ['∴'] }),
      say: 'But once we know that x is two, we may write: therefore, x plus one equals three.',
    },
    {
      clear: true,
      stage: rows([['P', '⇒', 'Q'], ['P'], ['∴', 'Q']], { gold: ['∴'] }),
      say: 'Every step of reasoning has this shape. If P then Q. P. Therefore, Q.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: rows([['2', 'x', '+', '1', '=', '7'], ['∴', '2', 'x', '=', '6'], ['∴', 'x', '=', '3']], { gold: ['∴'] }),
      say: 'It is used in solving. Two x plus one equals seven. Therefore, two x equals six. Therefore, x equals three.',
    },
    {
      clear: true,
      stage: { sets: sets(), ...rows([['4', '∈', 'A'], ['A', '⊆', 'B'], ['∴', '4', '∈', 'B']], { x: 1400, size: 140, gold: ['∴'] }) },
      say: 'And in any argument. Four is in A. A is a subset of B. Therefore, four is in B.',
    },
    {
      clear: true,
      stage: { know: line(['x', { sup: '2' }, '=', '4'], { y: ROW.y[0], size: ROW.size }), wrong: claimed('wrong', ['∴', 'x', '=', '2'], ROW.y[1], false) },
      say: 'A therefore has to be earned. X squared equals four; therefore, x equals two? No: x could be minus two.',
    },
    { stage: { right: claimed('right', ['∴', 'x', '=', '±', '2'], ROW.y[2], true) }, say: 'Therefore, x equals plus or minus two.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(['x', '+', '1', '=', '5'], { y: TOP, size: 130 }) },
      say: 'X plus one equals five. Which line follows?',
      turn: { kind: 'choose', id: 'so4', prompt: 'Which line follows?', cards: [['∴', 'x', '=', '4'], ['∴', 'x', '=', '6']], right: 0 },
    },
    {
      clear: true,
      stage: { given: line(['x', '=', '7'], { y: 250, size: 150 }) },
      say: 'X equals seven. So x plus one equals eight. Put in the sign.',
      turn: { kind: 'place', id: 'sosign', prompt: 'Which sign says: so?', toks: ['_', 'x', '+', '1', '=', '8'], tiles: ['∴', '¬'], right: '∴', y: 500, size: 150 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { given: line(['x', '+', '1', '=', '10'], { y: 330, size: 170, fade: 0.35 }), line: line(['∴', 'x', '=', '9'], { y: 600, size: 210 }) },
      move: 0.6,
      say: 'Therefore, x equals nine.',
      turn: { kind: 'read', id: 'readso', prompt: 'You read it.' },
    },
    {
      clear: true,
      teaser: true,
      stage: { was: line(['x', '=', '12'], { x: 560, y: 330, size: 190 }), now: line(['x', '=', '15'], { x: 1360, y: 330, size: 190 }) },
      say: 'X was twelve. Now x is fifteen. It changed by three.',
    },
    {
      teaser: true,
      stage: { ask: line(['?'], { x: 720, y: 740, size: 190, gold: ['?'] }), change: line(['x', '=', '3'], { x: 1040, y: 740, size: 190 }) },
      say: 'How do we write: the change in x?',
      pad: 1,
    },
  ],
}
