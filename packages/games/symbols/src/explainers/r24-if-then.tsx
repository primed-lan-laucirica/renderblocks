/**
 * Rank 24, if-then: the arrows between statements. The signs on the paper
 * are those of ranks 1–7, plus or minus (rank 13), letters (rank 12),
 * rank 23's and, and the four arrows themselves. ⇒ says that if the first
 * statement is true then the second is too, and it points one way; ⇔ has
 * two heads and holds both ways. Drawn with one line, → and ↔ join two
 * named statements into a new one, as ∧ and ∨ do. Where they are used:
 * one fact that follows from another, and the steps of solving for x,
 * each of which can be undone.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { lamp } from '../kit/logic'
import { beadAt, numberLine, onLine, stretch, type Ruler } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

/** A statement with its lamp under it. */
const stated = (k: string, toks: Tok[], x: number, on: boolean | null, o: { size?: number; gold?: string[]; y?: number; lampY?: number; r?: number } = {}): Sprite[] => [
  ...line(toks, { x, y: o.y ?? 430, size: o.size ?? 200, gold: o.gold }).map((s) => ({ ...s, k: `${k}/${s.k}` })),
  lamp(`${k}/lamp`, x, o.lampY ?? (o.y ?? 430) + 240, on, { r: o.r }),
]

/** The two lines of the opening, side by side, with room for a sign between them. */
const IF_X = 400
const THEN_X = 1400
const SIDE = 170

/** P and Q with their lamps, and what the one-line arrow makes of them. */
const promised = (p: boolean, q: boolean, gold = false): Patch => ({
  p: stated('p', ['P'], 360, p),
  q: stated('q', ['Q'], 740, q),
  out: stated('out', ['P', '→', 'Q'], 1390, !p || q, { gold: gold ? ['→'] : [] }),
})

const R: Ruler = { x0: 360, x1: 1560, y: 760, from: 0, to: 8 }

/** The steps of solving, one under the other, each tied to the one before by a two-headed arrow. */
const SOLVE = { x: 960, y: [300, 520, 740], size: 150 }
const solving = (): Patch => {
  const rows: Tok[][] = [
    ['2', 'x', '+', '1', '=', '7'],
    ['⇔', '2', 'x', '=', '6'],
    ['⇔', 'x', '=', '3'],
  ]
  return Object.fromEntries(rows.map((toks, i) => [`row${i}`, line(toks, { x: SOLVE.x, y: SOLVE.y[i], size: SOLVE.size, gold: ['⇔'] })]))
}

/** n + 1 > n for one, two and three, each with its lamp lit. */
const tried = (): Sprite[] =>
  ['1', '2', '3'].flatMap((n, i) => {
    const x = 400 + i * 560
    return [...line([n, '+', '1', '>', n], { x, y: 300, size: 110 }).map((s) => ({ ...s, k: `t${i}/${s.k}` })), lamp(`t${i}/lamp`, x, 470, true, { r: 38 })]
  })

export const r24: Spec = {
  rank: 24,
  id: 'r24',
  title: 'If, then',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { if: line(['x', '=', '2'], { x: IF_X, y: 460, size: SIDE }), then: line(['x', '+', '1', '=', '?'], { x: THEN_X, y: 460, size: SIDE, gold: ['?'] }) },
      say: 'X equals two. So what is x plus one?',
      turn: { kind: 'predict', id: 'xplus1', prompt: 'x is two. What is x plus one?', options: [{ label: 'Three' }, { label: 'Four' }] },
    },
    { stage: { then: line(['x', '+', '1', '=', '3'], { x: THEN_X, y: 460, size: SIDE }) }, say: 'Three. If x equals two, then x plus one equals three.' },
    { stage: { ask: line(['?'], { x: 835, y: 460, size: SIDE, gold: ['?'] }) }, say: 'We want a sign that says: if this, then that.' },

    // ── 2. What the arrows do ──
    {
      act: 2,
      clear: true,
      stage: { line: line(['x', '=', '2', '⇒', 'x', '+', '1', '=', '3'], { y: 460, size: 150, gold: ['⇒'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This arrow says it. If x equals two, then x plus one equals three. We also read the arrow as: implies.',
    },
    {
      clear: true,
      stage: { fwd: stated('fwd', ['x', '=', '2', '⇒', 'x', { sup: '2' }, '=', '4'], 960, true, { size: 150, y: 330, lampY: 520 }) },
      say: 'An arrow points one way. X equals two implies x squared equals four: true.',
    },
    {
      stage: {
        fwd: null,
        back: stated('back', ['x', { sup: '2' }, '=', '4', '⇒', 'x', '=', '2'], 960, false, { size: 150, y: 330, lampY: 520 }),
        but: line(['(', '−2', ')', { sup: '2' }, '=', '4'], { y: 800, size: 130, gold: ['−2'] }),
      },
      say: 'Turn it round, and it is false. When x squared equals four, x could be minus two.',
    },
    {
      clear: true,
      stage: { line: line(['x', '+', '1', '=', '3', '⇔', 'x', '=', '2'], { y: 460, size: 150, gold: ['⇔'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This arrow has two heads, so it holds both ways. We read it: if and only if.',
    },
    {
      clear: true,
      stage: { one: line(['P', '→', 'Q'], { x: 520, y: 460, size: 200, gold: ['→'] }), two: line(['P', '↔', 'Q'], { x: 1400, y: 460, size: 200, gold: ['↔'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'Between statements named by letters, the same arrows are often drawn with one line.',
    },
    { clear: true, stage: promised(true, false, true), say: 'If P then Q is a statement too. It is false in just one case: P is true, but Q is false.' },
    {
      clear: true,
      stage: { short: line(['P', '↔', 'Q'], { y: 330, size: 200, gold: ['↔'] }), long: line(['(', 'P', '→', 'Q', ')', '∧', '(', 'Q', '→', 'P', ')'], { y: 700, size: 150, gold: ['→#0', '→#1'] }) },
      say: 'The two-headed arrow is two arrows in one: if P then Q, and if Q then P.',
      poster: true,
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: {
        axis: numberLine(R, { size: 60 }),
        five: [stretch('five', R, 5, 8, { up: 40 })],
        three: [stretch('three', R, 3, 8, { up: 90, colour: '#7cc4e8' })],
        line: line(['x', '>', '5', '⇒', 'x', '>', '3'], { y: 300, size: 170 }),
      },
      say: 'They are used wherever one fact follows from another. If x is more than five, then x is more than three.',
    },
    { stage: { four: [beadAt('four', onLine(R, 4), R.y - 150, 56)] }, say: 'But not the other way round. Four is more than three, and it is not more than five.' },
    { clear: true, stage: solving(), say: 'They are used in solving, too. Each step can be undone, so every line says the same as the one before it.' },
    {
      clear: true,
      stage: { line: line(['x', { sup: '2' }, '=', '4', '⇔', 'x', '=', '±', '2'], { y: 460, size: 160, gold: ['±'] }) },
      say: 'And now we can say it exactly. X squared equals four, if and only if x equals plus or minus two.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'more42', prompt: 'Which one is true?', cards: [['x', '>', '2', '⇒', 'x', '>', '4'], ['x', '>', '4', '⇒', 'x', '>', '2']], right: 1 },
    },
    {
      clear: true,
      stage: { hint: line(['(', '−3', ')', { sup: '2' }, '=', '9'], { y: TOP, size: 110 }) },
      say: 'Which arrow belongs here? Take care: minus three squared is nine as well.',
      turn: { kind: 'place', id: 'arrow9', prompt: 'Which arrow makes it true?', toks: ['x', '=', '3', '_', 'x', { sup: '2' }, '=', '9'], tiles: ['⇒', '⇔'], right: '⇒', y: 500, size: 150 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['x', '=', '4', '⇒', 'x', '>', '3'], { y: 480, size: 190 }) }, move: 0.6, say: 'If x equals four, then x is more than three.', turn: { kind: 'read', id: 'readif', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { tried: tried() }, say: 'N plus one is more than n, when n is one, or two, or three.' },
    {
      teaser: true,
      stage: { ask: line(['?'], { x: 500, y: 760, size: 190, gold: ['?'] }), all: line(['n', '+', '1', '>', 'n'], { x: 1040, y: 760, size: 190 }) },
      say: 'How do we say that it is true for every number?',
      pad: 1,
    },
  ],
}
