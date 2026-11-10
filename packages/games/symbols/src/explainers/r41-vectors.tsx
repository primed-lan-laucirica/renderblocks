/**
 * Rank 41, vectors: a letter with an arrow on top (or printed bold). The
 * signs on the paper are those of ranks 1–6, letters (rank 12), labels set
 * low (rank 14), the pair's brackets and comma (ranks 5 and 27), ∈ and ℝ
 * (ranks 26 and 31) and the vector's own two. A vector is a move: so far
 * across and so far up, two numbers kept in order, drawn as an arrow. It is
 * the same vector wherever it starts. Its numbers are its parts, v₁ and v₂.
 * Vectors add tip to tail (the parts add), and a number times a vector
 * stretches it. Where they are used: wherever something has a size and a
 * direction (the wind, a push, the way something travels).
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Tok } from '../kit/glyphs'
import { dot, type Pen } from '../kit/logic'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'
import { arrowOn, at, beside, field, label, legs, legsAt, sheet, type Field, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const V: Tok = { vec: 'v' }
const U: Tok = { vec: 'u' }
const pair = (a: Tok, b: Tok): Tok[] => ['(', a, ',', b, ')']
const PARTS: Tok[] = [V, '=', '(', 'v', { sub: '1' }, ',', 'v', { sub: '2' }, ')']

/** The squared sheet the moves are drawn on, and where the lines beside it stand. */
const P: Plane = { x: 180, y: 860, u: 110, w: 7, h: 5 }
const SIDE = { x: 1440, size: 150 }
const START: Vec = [1, 1]
const bead = (k: string, pl: Plane, [x, y]: Vec, colour?: 'blue'): Sprite => beadAt(k, at(pl, x, y).x, at(pl, x, y).y, 52, colour)

/** A move as an arrow from `from`, with its step across and its step up dashed and named. */
const stepped = (k: string, pl: Plane, from: Vec, v: Vec, names: [Tok[], Tok[]], size = 76, pen?: Pen): Sprite[] => {
  const mid = legsAt(pl, from, v)
  return [legs(`${k}/legs`, pl, from, v), arrowOn(k, pl, from, v, { pen }), ...label(`${k}/across`, names[0], mid.across, { size }), ...label(`${k}/up`, names[1], mid.up, { size })]
}
/** An arrow with its name beside it. */
const named = (k: string, pl: Plane, from: Vec, v: Vec, name: Tok[], pen: Pen, off = 62): Sprite[] => [arrowOn(k, pl, from, v, { pen }), ...label(`${k}/name`, name, beside(pl, from, v, off), { size: 84 })]

/** The wind: the same arrow at every place. */
const W: Plane = { x: 250, y: 800, u: 150, w: 5, h: 3 }
const WIND: Field = { id: 'wind', f: () => [2, 1] }

/** His turn: each bead lays one more v, tip to tail, towards the gold dot. */
const B: Plane = { x: 140, y: 840, u: 96, w: 8, h: 4 }
const PILE = { x: 1440, y: 660, size: 64 }
const ZONE = { x: PILE.x - 320, y: PILE.y - 130, w: 640, h: 260 }
function laid(n: number): Patch {
  return {
    sheet: sheet(B),
    goal: [dot('goal', at(B, 6, 3), { r: 20, pen: 'gold' })],
    arrows: Array.from({ length: n }, (_, j) => arrowOn(`v${j}`, B, [2 * j, j], [2, 1], { pen: 'blue' })),
    rule: line([V, '=', ...pair('2', '1')], { x: PILE.x, y: 200, size: 120 }),
    line: line([String(n), V, '=', '(', { g: String(2 * n), k: 'across' }, ',', { g: String(n), k: 'up' }, ')'], { x: PILE.x, y: 420, size: 150, gold: n === 3 ? ['across', 'up'] : [] }),
    beads: row(n, PILE.x, PILE.y, PILE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PILE.size, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  }
}

export const r41: Spec = {
  rank: 41,
  id: 'r41',
  title: 'Vectors',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sheet: sheet(P), move: [legs('v/legs', P, START, [3, 2]), ...label('v/across', ['3'], legsAt(P, START, [3, 2]).across, { size: 76 }), ...label('v/up', ['2'], legsAt(P, START, [3, 2]).up, { size: 76 })], bead: [bead('bead', P, START)] },
      say: 'A bead moves three across and two up. Is two across and three up the same move?',
      turn: { kind: 'predict', id: 'samemove', prompt: 'Is two across, three up the same move?', options: [{ label: 'The same' }, { label: 'Different' }] },
    },
    {
      stage: { move: stepped('v', P, START, [3, 2], [['3'], ['2']]), other: [arrowOn('other', P, START, [2, 3], { pen: 'blue' })], line: line([...pair('3', '2'), '≠', ...pair('2', '3')], { x: SIDE.x, y: 430, size: 130 }) },
      say: 'Different. The two moves end in different places.',
    },
    {
      stage: { other: null, line: line([{ g: '?', k: 'ask' }, '=', ...pair('3', '2')], { x: SIDE.x, y: 430, size: SIDE.size, gold: ['ask'] }) },
      say: 'A move has a size and a direction. It takes two numbers, kept in order. We need one name for the whole move.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line([V], { y: 430, size: 320, gold: ['vec'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is a vector. Its name is a letter with a small arrow on top. We read it: vector v.' },
    {
      clear: true,
      stage: { sheet: sheet(P), move: stepped('v', P, START, [3, 2], [['3'], ['2']]), line: line([V, '=', ...pair('3', '2')], { x: SIDE.x, y: 430, size: 170 }) },
      say: 'Vector v equals three, two: three across, two up. The arrow on top says it is a move, not one number.',
      poster: true,
    },
    {
      stage: { move: stepped('v', P, [4, 3], [3, 2], [['3'], ['2']]) },
      also: [{ at: 2.6, stage: { move: stepped('v', P, [0, 2], [3, 2], [['3'], ['2']]) } }],
      say: 'Start it anywhere. Same size, same direction: it is the same vector.',
    },
    {
      stage: { move: stepped('v', P, START, [3, 2], [['v', { sub: '1' }], ['v', { sub: '2' }]], 104), line: line(PARTS, { x: SIDE.x, y: 430, size: SIDE.size, gold: ['sub'] }) },
      say: 'Its two numbers are its parts. They are called v one and v two.',
    },
    {
      stage: { line: line(PARTS, { x: SIDE.x, y: 360, size: SIDE.size }), set: line([V, '∈', 'ℝ', { sup: '2' }], { x: SIDE.x, y: 640, size: 170 }) },
      say: 'The parts are real numbers. So vector v is an element of R two: every pair of real numbers.',
    },
    { clear: true, stage: { line: line([V, '=', { bold: 'v' }], { y: 430, size: 300, gold: ['bold'] }) }, say: 'Many books print the letter in bold instead of putting an arrow on it. It is the same vector.' },
    {
      clear: true,
      stage: { sheet: sheet(P), u: named('u', P, START, [3, 1], [U], 'red', -62), v: named('v', P, [4, 2], [1, 2], [V], 'blue', -62), first: line([U, '=', ...pair('3', '1')], { x: SIDE.x, y: 250, size: 120 }), second: line([V, '=', ...pair('1', '2')], { x: SIDE.x, y: 410, size: 120 }) },
      say: 'Vectors add. Do one move, then the other: tip to tail.',
    },
    {
      stage: { sum: [arrowOn('sum', P, START, [4, 3], { pen: 'green' })], line: line([U, '+', V, '=', ...pair('4', '3')], { x: SIDE.x, y: 680, size: 140 }) },
      say: 'Together: four across, three up. The parts add: three plus one, and one plus two.',
    },
    {
      clear: ['sheet'],
      stage: { v: [arrowOn('v', P, [1, 0], [1, 2], { pen: 'blue' })], first: line([V, '=', ...pair('1', '2')], { x: SIDE.x, y: 300, size: 140 }) },
      also: [{ at: 2.8, move: 1.2, stage: { v: [arrowOn('v', P, [1, 0], [2, 4], { pen: 'blue' })], line: line(['2', V, '=', ...pair('2', '4')], { x: SIDE.x, y: 560, size: 150 }) } }],
      say: 'A number times a vector stretches it. Two v is twice as long, and points the same way.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { wind: [field('wind', W, WIND, { scale: 0.34, w: 8 })], line: line([{ vec: 'w' }, '=', ...pair('2', '1')], { x: SIDE.x + 40, y: 430, size: 160 }) },
      say: 'Vectors are used wherever something has a size and a direction. The wind: how strong, and which way.',
    },
    {
      clear: true,
      stage: { one: named('one', P, [1, 1], [4, 0], [{ vec: 'F' }, { sub: '1' }], 'red', -70), bead: [bead('bead', P, [1, 1])] },
      also: [{ at: 3.4, stage: { two: named('two', P, [5, 1], [0, 3], [{ vec: 'F' }, { sub: '2' }], 'blue', -90), sum: [arrowOn('sum', P, [1, 1], [4, 3], { pen: 'green' })], line: line([{ vec: 'F' }, { sub: '1' }, '+', { vec: 'F' }, { sub: '2' }], { x: SIDE.x, y: 430, size: 170 }) } }],
      say: 'A push is a vector: how hard, and which way. Two pushes at once add, tip to tail.',
    },
    {
      clear: true,
      stage: { sheet: sheet(P), v: [arrowOn('v', P, START, [4, 3], { pen: 'blue' })], bead: [bead('bead', P, START)], line: line([V, '=', ...pair('4', '3')], { x: SIDE.x, y: 430, size: 170 }) },
      also: [{ at: 2.4, move: 2.4, stage: { bead: [bead('bead', P, [5, 4])] } }],
      say: 'And the way something travels: how fast, and which way. Four east and three north, every hour.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { first: line([U, '=', ...pair('3', '1')], { x: 620, y: TOP, size: 130 }), second: line([V, '=', ...pair('1', '2')], { x: 1300, y: TOP, size: 130 }) },
      say: 'Vector u is three, one. Vector v is one, two. Which one is true?',
      turn: { kind: 'choose', id: 'sum43', prompt: 'Which one is true?', cards: [[U, '+', V, '=', ...pair('4', '3')], [U, '+', V, '=', ...pair('3', '2')]], right: 0 },
    },
    {
      clear: true,
      say: 'Each bead lays down one more v. Add beads until the arrows reach the gold dot.',
      turn: { kind: 'build', id: 'reach63', prompt: 'Add beads until the arrows reach the gold dot.', target: 3, max: 4, zone: ZONE, state: laid },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([V, '=', ...pair('2', '5')], { y: 480, size: 250 }) }, move: 0.6, say: 'Vector v equals two, five.', turn: { kind: 'read', id: 'readvec', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { sheet: sheet(P), move: stepped('v', P, [1, 0], [3, 4], [['3'], ['4']]), line: line([V, '=', ...pair('3', '4')], { x: SIDE.x, y: 300, size: SIDE.size }) },
      say: 'This vector goes three across and four up.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: SIDE.x, y: 620, size: 240, gold: ['ask'] }) }, say: 'How long is the arrow itself?', pad: 1 },
  ],
}
