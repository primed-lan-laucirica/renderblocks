/**
 * Rank 26, element of: what belongs to a set. The signs on the paper are
 * those of ranks 1–6, letters (rank 12), the two themselves and, once
 * each, rank 25's ∀ and ∃. A set is drawn as a loop round its members and
 * named with a capital letter (the braces are rank 27's); ∈ says a thing is
 * in it, and the stroke of ∉, like the stroke of ≠, says it is not. Each
 * is a statement, so it is true or false. Where it is used: sorting into
 * sets, and saying which things a line is about (for all x in A).
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { lamp, loop, member, membersIn, type Loop } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'

/** The set A, on the left of the paper: the even numbers up to ten. */
const A: Loop = { x: 560, y: 610, rx: 400, ry: 280 }
const EVENS = ['2', '4', '6', '8']
const evens = (gold: number[] = []) => membersIn('m', A, EVENS, { size: 110, r: 0.6, gold })
/** Ten and seven wait outside; ten goes in (to the middle), seven stays out. */
const WAIT: Pt[] = [
  { x: 1300, y: 420 },
  { x: 1300, y: 800 },
]
const ten = (inside: boolean, gold = false) => member('ten', '10', inside ? { x: A.x, y: A.y } : WAIT[0], { size: inside ? 110 : 130, gold })
const seven = (gold = false) => member('seven', '7', WAIT[1], { size: 130, gold })

/** The lines written beside the loop. */
const SIDE = { x: 1440, y: [300, 540], size: 190 }
const beside = (i: number, toks: Tok[], gold: string[] = [], x = SIDE.x) => line(toks, { x, y: SIDE.y[i], size: SIDE.size, gold })

/** Two sets side by side: A the even numbers, B the odd ones. */
const LEFT: Loop = { x: 520, y: 660, rx: 340, ry: 250 }
const RIGHT: Loop = { x: 1420, y: 660, rx: 340, ry: 250 }

/** A small set over the cards of his turn: one, three and five. */
const SMALL: Loop = { x: 1000, y: 200, rx: 380, ry: 130 }
const small = (): Sprite[] => [...loop('set', SMALL, { name: 'A', nameAt: { x: 540, y: 200 }, nameSize: 110 }), ...['1', '3', '5'].map((g, i) => member(`s${i}`, g, { x: SMALL.x + (i - 1) * 210, y: SMALL.y }, { size: 96 }))]

export const r26: Spec = {
  rank: 26,
  id: 'r26',
  title: 'Element of',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { set: loop('set', A), in: evens(), more: [ten(false), seven()] },
      say: 'These numbers belong together, in a loop. Which one belongs with them: ten, or seven?',
      turn: { kind: 'predict', id: 'belongs', prompt: 'Which one belongs in the loop?', options: [{ label: 'Ten' }, { label: 'Seven' }] },
    },
    { stage: { more: [ten(true), seven()] }, say: 'Ten. Every number in the loop is even.' },
    { stage: { in: evens([0, 1, 2, 3]), more: [ten(true, true), seven()] }, move: 0.5, say: 'A collection like this is called a set. Each thing in it is an element of the set.' },
    { stage: { set: loop('set', A, { name: 'A', gold: true }), in: evens(), more: [ten(true), seven()] }, move: 0.5, say: 'We name a set with a capital letter. This one is A.' },
    { stage: { set: loop('set', A, { name: 'A' }), line: beside(0, ['4', '?', 'A'], ['?']) }, say: 'How do we write that four is in A, and seven is not?' },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { line: beside(0, ['4', '∈', 'A'], ['∈']), in: evens([1]) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: is an element of. Four is an element of A.',
    },
    { stage: { line: beside(0, ['4', '∈', 'A']), in: evens() }, move: 0.5, say: 'It is shaped like the letter E, for element. We can also read it: four is in A.' },
    {
      stage: { not: beside(1, ['7', '∉', 'A'], ['∉']), more: [ten(true), seven(true)] },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Strike it through, and it says: is not an element of. Seven is not in A.',
      poster: true,
    },
    {
      stage: { line: beside(0, ['∈', '∉'], ['∉']), not: beside(1, ['=', '≠'], ['≠']), more: [ten(true), seven()] },
      say: 'The stroke means not, just as it does in the not-equal sign.',
    },
    {
      stage: {
        line: beside(0, ['6', '∈', 'A'], [], 1380),
        not: beside(1, ['5', '∈', 'A'], [], 1380),
        lamps: [lamp('yes', 1760, SIDE.y[0], true, { r: 44 }), lamp('no', 1760, SIDE.y[1], false, { r: 44 })],
        more: [ten(true)],
      },
      say: 'Each of these is a statement, so it is true or false. Six is in A: true. Five is in A: false.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: {
        a: [...loop('a', LEFT, { name: 'A', pen: 'blue' }), ...membersIn('a', LEFT, EVENS, { size: 100, r: 0.55 })],
        b: [...loop('b', RIGHT, { name: 'B', pen: 'red' }), ...membersIn('b', RIGHT, ['1', '3', '5', '7'], { size: 100, r: 0.55, gold: [2] })],
        notin: line(['5', '∉', 'A'], { x: 620, y: 200, size: 150 }),
        isin: line(['5', '∈', 'B'], { x: 1520, y: 200, size: 150 }),
      },
      say: 'It is used wherever things are sorted into sets. Here B is the odd numbers. Five is in B, and five is not in A.',
    },
    {
      clear: true,
      stage: { set: loop('set', A, { name: 'A' }), in: evens([0, 1, 2, 3]), line: line(['x', '∈', 'A'], { x: 1440, y: 420, size: 210 }) },
      say: 'Often we do not say which element. X is an element of A says only that x is one of these.',
    },
    {
      stage: { in: evens(), line: line(['∀', 'x', '∈', 'A', '(', 'x', '>', '1', ')'], { x: 1450, y: 420, size: 112 }) },
      say: 'Then one line can speak for all of them. For all x in A, x is more than one.',
    },
    {
      stage: { in: evens([3]), line: line(['∃', 'x', '∈', 'A', '(', 'x', '>', '7', ')'], { x: 1450, y: 420, size: 112 }) },
      say: 'Or for at least one. There exists an x in A that is more than seven: it is eight.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { set: small() },
      say: 'Here is another set, A. Which one is true?',
      turn: { kind: 'choose', id: 'in135', prompt: 'Which one is true?', cards: [['3', '∈', 'A'], ['4', '∈', 'A']], right: 0 },
    },
    {
      clear: ['set'],
      say: 'Is four in A? Put in the sign that makes this line true.',
      turn: { kind: 'place', id: 'four', prompt: 'Which sign makes it true?', toks: ['4', '_', 'A'], tiles: ['∈', '∉'], right: '∉', y: 580, size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['9', '∉', 'A'], { y: 480, size: 250 }) }, move: 0.6, say: 'Nine is not an element of A.', turn: { kind: 'read', id: 'read9', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { set: loop('set', A, { name: 'A' }), in: membersIn('m', A, ['1', '2', '3'], { size: 120 }) },
      say: 'Drawing a loop takes a while.',
    },
    { teaser: true, stage: { line: line(['A', '=', '?'], { x: 1440, y: 600, size: 210, gold: ['?'] }) }, say: 'How could we write a set on one line?', pad: 1 },
  ],
}
