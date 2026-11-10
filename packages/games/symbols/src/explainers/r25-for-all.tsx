/**
 * Rank 25, for all and there exists: how many numbers a statement is true
 * of. The signs on the paper are those of ranks 1–6, letters (rank 12),
 * rank 23's not, and the two themselves. ∀ says a statement holds for
 * every one, ∃ that it holds for at least one; the letter after the sign
 * names what is spoken about and the brackets hold what is said of it. One
 * number that fails breaks a for-all, and one that works makes a
 * there-exists. Where they are used: rules for every number, asking
 * whether an equation can be solved, and the two together (no biggest
 * number).
 *
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { lamp, loop, membersIn, type Loop } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'

/** A statement with its lamp beside it, on the right. */
const stated = (k: string, toks: Tok[], y: number, on: boolean, o: { x?: number; size?: number; gold?: string[]; lampX?: number } = {}): Sprite[] => [
  ...line(toks, { x: o.x ?? 880, y, size: o.size ?? 170, gold: o.gold }).map((s) => ({ ...s, k: `${k}/${s.k}` })),
  lamp(`${k}/lamp`, o.lampX ?? 1560, y, on, { r: 44 }),
]

/** A row of sums tried one by one, each with its lamp under it. */
const TRY = { y: 720, size: 100 }
const tried = (rows: { toks: Tok[]; on: boolean }[], xs: number[]): Sprite[] =>
  rows.flatMap((r, i) => [...line(r.toks, { x: xs[i], y: TRY.y, size: TRY.size }).map((s) => ({ ...s, k: `t${i}/${s.k}` })), lamp(`t${i}/lamp`, xs[i], TRY.y + 150, r.on, { r: 36 })])
const next = (n: string): Tok[] => [n, '+', '1', '>', n]
const plusTwo = (n: string): Tok[] => [n, '+', '2', '=', '5']

const TOP_Y = 330

/** The numbers of the last question, gathered in a loop. */
const SET: Loop = { x: 560, y: 600, rx: 400, ry: 280 }

export const r25: Spec = {
  rank: 25,
  id: 'r25',
  title: 'For all, there exists',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { line: line(next('n'), { y: TOP_Y, size: 220 }) },
      say: 'N plus one is more than n. Is that true for every number n?',
      turn: { kind: 'predict', id: 'every', prompt: 'Is it true for every number?', options: [{ label: 'Every number' }, { label: 'Only some' }] },
    },
    {
      stage: { tried: tried([{ toks: next('1'), on: true }, { toks: next('7'), on: true }, { toks: next('100'), on: true }], [300, 820, 1460]) },
      say: 'Every number. Try one, seven, a hundred: adding one always makes more.',
    },
    { say: 'But the numbers never end. We need a sign that says: for all.', pad: 0.4 },

    // ── 2. What the signs do ──
    {
      act: 2,
      clear: true,
      stage: { line: line(['∀', 'n', '(', ...next('n'), ')'], { y: 460, size: 180, gold: ['∀'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: for all. For all n, n plus one is more than n.',
    },
    {
      stage: { line: line(['∀', 'n', '(', ...next('n'), ')'], { y: 460, size: 180, gold: ['n#0'] }) },
      move: 0.5,
      say: 'It is a capital A, for all, turned upside down. The letter after it is what it speaks about.',
    },
    {
      clear: true,
      stage: { line: line(['x', '+', '2', '=', '5'], { y: TOP_Y, size: 190 }), tried: tried([{ toks: plusTwo('1'), on: false }, { toks: plusTwo('2'), on: false }, { toks: plusTwo('3'), on: true }], [360, 960, 1560]) },
      say: 'X plus two equals five is not true for all x. But it is true for one of them: three.',
    },
    {
      stage: { line: line(['∃', 'x', '(', 'x', '+', '2', '=', '5', ')'], { y: TOP_Y, size: 180, gold: ['∃'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: there exists. There exists an x for which x plus two equals five.',
      poster: true,
    },
    { stage: { line: line(['∃', 'x', '(', 'x', '+', '2', '=', '5', ')'], { y: TOP_Y, size: 180 }) }, move: 0.5, say: 'It is a capital E, for exists, turned back to front.' },
    {
      clear: true,
      stage: { all: stated('all', ['∀', 'x', '(', 'x', '>', '3', ')'], 330, false), one: stated('one', ['2', '>', '3'], 720, false, { size: 130 }) },
      say: 'One number that fails makes a for-all false. For all x, x is more than three? Two is not.',
    },
    {
      stage: { all: stated('all', ['∃', 'x', '(', 'x', '>', '3', ')'], 330, true), one: stated('one', ['4', '>', '3'], 720, true, { size: 130 }) },
      say: 'And one number that works makes a there-exists true. Four is more than three.',
    },
    {
      clear: true,
      stage: { notall: line(['¬', '∀', 'x', '(', 'x', '>', '3', ')'], { y: 330, size: 170, gold: ['¬'] }), some: line(['∃', 'x', '¬', '(', 'x', '>', '3', ')'], { y: 720, size: 170, gold: ['¬'] }) },
      say: 'So, not for all x, says the same as: there exists an x for which it is not.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { line: line(['∀', 'a', '∀', 'b', '(', 'a', '+', 'b', '=', 'b', '+', 'a', ')'], { y: 460, size: 140 }) },
      say: 'A rule for every number is a for-all. For all a, and for all b, a plus b equals b plus a.',
    },
    {
      clear: true,
      stage: { can: stated('can', ['∃', 'x', '(', '2', 'x', '=', '10', ')'], 330, true), cannot: stated('cannot', ['∃', 'x', '(', 'x', '+', '1', '=', 'x', ')'], 720, false) },
      say: 'Can an equation be solved? That asks whether a number exists. Two x equals ten: yes, five. X plus one equals x: no.',
    },
    {
      clear: true,
      stage: { line: line(['∀', 'n', '∃', 'm', '(', 'm', '>', 'n', ')'], { y: 460, size: 180 }) },
      say: 'Together: for all n, there exists an m that is more than n. So there is no biggest number.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'zero', prompt: 'Which one is true?', cards: [['∀', 'n', '(', 'n', '+', '0', '=', 'n', ')'], ['∀', 'n', '(', 'n', '+', '1', '=', 'n', ')']], right: 0 },
    },
    {
      clear: true,
      say: 'X plus x equals six. Is that true for all x, or for just one? Put in the sign.',
      turn: { kind: 'place', id: 'double', prompt: 'For all x, or there exists an x?', toks: ['_', 'x', '(', 'x', '+', 'x', '=', '6', ')'], tiles: ['∀', '∃'], right: '∃', size: 170 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['∃', 'x', '(', 'x', '>', '9', ')'], { y: 480, size: 220 }) }, move: 0.6, say: 'There exists an x that is more than nine.', turn: { kind: 'read', id: 'readex', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { set: loop('set', SET), in: membersIn('m', SET, ['2', '4', '6', '8'], { size: 110, r: 0.6 }) },
      say: 'Often we do not mean every number: only these ones, gathered in a loop.',
    },
    {
      teaser: true,
      stage: { in: membersIn('m', SET, ['2', '4', '6', '8'], { size: 110, r: 0.6, gold: [1] }), line: line(['4', '?'], { x: 1400, y: 600, size: 220, gold: ['?'] }) },
      say: 'Four is one of them. How do we write that a thing belongs to a collection?',
      pad: 1,
    },
  ],
}
