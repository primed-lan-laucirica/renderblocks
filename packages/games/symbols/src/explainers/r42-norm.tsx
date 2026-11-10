/**
 * Rank 42, the norm: doubled bars round a vector. The signs on the paper
 * are those of ranks 1–6, powers and the root (ranks 7 and 8), the decimal
 * point (rank 9), the absolute-value bars (rank 11), labels set low (rank
 * 14), the pair's brackets and comma, the vector's arrow (rank 41) and the
 * norm's own bars. The norm of a vector is the length of its arrow, from
 * tail to tip: not the walk along its two steps, which is longer. It comes
 * from the parts: square each, add, take the square root. The one tie kept
 * is between signs: one pair of bars asks how far a number is from zero,
 * doubled bars how far a tip is from its tail. Where it is used: how far
 * apart two places are, a speed, and a vector of norm one, which keeps
 * only a direction.
 *
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { dot, PEN, type Pen } from '../kit/logic'
import { beadAt } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { arrowOn, at, beside, corner, label, legs, legsAt, sheet, spanned, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const V: Tok = { vec: 'v' }
const U: Tok = { vec: 'u' }
const D: Tok = { vec: 'd' }
const pair = (a: Tok, b: Tok): Tok[] => ['(', a, ',', b, ')']
const norm = (v: Tok): Tok[] => ['‖', v, '‖']
const RULE: Tok[] = [...norm(V), '=', { root: ['v', { sub: '1' }, { sup: '2' }, '+', 'v', { sub: '2' }, { sup: '2' }] }]

/** The squared sheet the arrows are drawn on, and where the lines beside it stand. */
const P: Plane = { x: 180, y: 860, u: 110, w: 7, h: 5 }
const SIDE = { x: 1440, size: 150 }
const START: Vec = [1, 1]
const bead = (k: string, pl: Plane, [x, y]: Vec, colour?: 'blue'): Sprite => beadAt(k, at(pl, x, y).x, at(pl, x, y).y, 52, colour)

/** A vector as an arrow from `from`, with its step across and its step up dashed and numbered. */
const stepped = (k: string, pl: Plane, from: Vec, v: Vec, names: [Tok[], Tok[]], pen?: Pen, size = 76): Sprite[] => {
  const mid = legsAt(pl, from, v)
  return [legs(`${k}/legs`, pl, from, v), arrowOn(k, pl, from, v, { pen }), ...label(`${k}/across`, names[0], mid.across, { size }), ...label(`${k}/up`, names[1], mid.up, { size })]
}
/** An arrow with its name beside it. */
const named = (k: string, pl: Plane, from: Vec, v: Vec, name: Tok[], pen: Pen, off = 62): Sprite[] => [arrowOn(k, pl, from, v, { pen }), ...label(`${k}/name`, name, beside(pl, from, v, off), { size: 84 })]

/** An arrow of a fixed length that swings about its tail: `a` is how far it is turned up from lying flat, in degrees. */
const swung = (k: string, pl: Plane, from: Vec, len: number, a: number, pen: Pen = 'blue'): Sprite => ({
  k,
  type: 'custom',
  n: { a, w: 12, o: 1 },
  enter: { o: 0 },
  d: {
    id: `swung ${pen} ${pl.x} ${pl.y} ${pl.u} ${from.join(' ')} ${len}`,
    draw: (p) => {
      const A = at(pl, from[0], from[1])
      const [ux, uy] = [Math.cos((p.a * Math.PI) / 180), -Math.sin((p.a * Math.PI) / 180)]
      const B = { x: A.x + ux * len * pl.u, y: A.y + uy * len * pl.u }
      const head = p.w * 3.6
      const neck = { x: B.x - ux * head, y: B.y - uy * head }
      const wing = head * 0.5
      return (
        <g>
          <line x1={A.x} y1={A.y} x2={neck.x + ux * 2} y2={neck.y + uy * 2} stroke={PEN[pen]} strokeWidth={p.w} strokeLinecap="round" />
          <polygon points={`${B.x},${B.y} ${neck.x - uy * wing},${neck.y + ux * wing} ${neck.x + uy * wing},${neck.y - ux * wing}`} fill={PEN[pen]} stroke={PEN[pen]} strokeWidth={p.w * 0.3} strokeLinejoin="round" />
        </g>
      )
    },
  },
})
const SLANT = (Math.atan2(4, 3) * 180) / Math.PI

/** A smaller sheet with room all round the triangle, for a square on each of its sides. */
const Q: Plane = { x: 430, y: 640, u: 66, w: 7, h: 7, left: 4, down: 3 }
const triangle = (): Sprite[] => [legs('v/legs', Q, [0, 0], [3, 4]), corner('square', Q, [3, 0], [-1, 0], [0, 1], { size: 26 }), arrowOn('v', Q, [0, 0], [3, 4], { w: 10 })]

/** How far apart two places are: a wider sheet. */
const M: Plane = { x: 150, y: 850, u: 84, w: 10, h: 7 }

export const r42: Spec = {
  rank: 42,
  id: 'r42',
  title: 'Norm',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sheet: sheet(P), move: stepped('v', P, START, [3, 4], [['3'], ['4']]), line: line([V, '=', ...pair('3', '4')], { x: SIDE.x, y: 430, size: SIDE.size }) },
      say: 'Vector v goes three across and four up. How long is the arrow itself?',
      turn: { kind: 'predict', id: 'howlong', prompt: 'How long is the arrow itself?', options: [{ label: 'Seven' }, { label: 'Five' }] },
    },
    {
      stage: { flat: [swung('flat', P, START, 5, SLANT)] },
      also: [{ at: 4.4, move: 1.6, stage: { flat: [swung('flat', P, START, 5, 0)], count: label('count', ['5'], { x: at(P, 5.3, 1).x, y: at(P, 5.3, 1).y + 56 }, { size: 76, gold: ['5'] }) } }],
      say: 'Five. Seven is the walk along both steps. The arrow cuts the corner: laid flat, it is five squares long.',
    },
    {
      stage: { line: line(['_', V, '_', '=', '5'], { x: SIDE.x, y: 430, size: SIDE.size, gold: ['_'] }) },
      say: 'Every vector has a length. We need a sign for it.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(norm(V), { y: 430, size: 320, gold: ['‖'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is the norm. Two upright bars on each side of the vector. We read it: the norm of v.' },
    {
      clear: true,
      stage: { sheet: sheet(P), move: stepped('v', P, START, [3, 4], [['3'], ['4']]), first: line([V, '=', ...pair('3', '4')], { x: SIDE.x, y: 300, size: 130 }), line: line([...norm(V), '=', '5'], { x: SIDE.x, y: 560, size: 190 }) },
      say: 'The norm of v equals five. The norm is the length of the arrow, from tail to tip.',
      poster: true,
    },
    {
      clear: true,
      stage: { one: line(['|', '−5', '|', '=', '5'], { y: 300, size: 190 }), line: line([...norm(V), '=', '5'], { y: 620, size: 190 }) },
      also: [{ at: 4.2, move: 0.5, stage: { line: line([...norm(V), '=', '5'], { y: 620, size: 190, gold: ['‖'] }) } }],
      say: 'One pair of bars asks how far a number is from zero. Doubled bars ask how far the tip of a vector is from its tail. Neither is ever below zero.',
    },
    {
      clear: true,
      stage: { sheet: sheet(Q), tri: triangle(), first: line([V, '=', ...pair('3', '4')], { x: SIDE.x, y: 230, size: 120 }) },
      also: [
        { at: 3.2, stage: { nine: [spanned('nine', Q, [0, 0], [3, 0], [0, -3], { pen: 'green' }), ...label('nine/n', ['9'], at(Q, 1.5, -1.5), { size: 84 })] } },
        { at: 5.0, stage: { sixteen: [spanned('sixteen', Q, [3, 0], [4, 0], [0, 4], { pen: 'gold', shade: 0.34 }), ...label('sixteen/n', ['16'], at(Q, 5, 2), { size: 84 })] } },
      ],
      say: 'The norm comes from the two parts. Put a square on each step: nine small squares, and sixteen.',
    },
    {
      stage: { big: [spanned('big', Q, [0, 0], [-4, 3], [3, 4], { pen: 'red', shade: 0.2 }), ...label('big/n', ['25'], at(Q, -0.5, 3.5), { size: 84 })], sum: line(['3', { sup: '2' }, '+', '4', { sup: '2' }, '=', '25'], { x: SIDE.x, y: 430, size: 130 }) },
      also: [{ at: 4.6, stage: { line: line([{ root: '25' }, '=', '5'], { x: SIDE.x, y: 660, size: 150 }) } }],
      say: 'Together, twenty-five: just what the square on the arrow holds. And the square root of twenty-five is five.',
    },
    {
      clear: true,
      stage: { line: line(RULE, { y: 430, size: 210 }) },
      say: 'So: square each part, add them, and take the square root. That is the norm of v.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { sheet: sheet(M), move: stepped('d', M, [1, 1], [8, 6], [['8'], ['6']], 'blue', 68), here: [dot('here', at(M, 1, 1), { r: 18, pen: 'ink' })], there: [dot('there', at(M, 9, 7), { r: 18, pen: 'ink' })], first: line([D, '=', ...pair('8', '6')], { x: 1480, y: 250, size: 120 }) },
      also: [{ at: 4.4, stage: { sum: line(['8', { sup: '2' }, '+', '6', { sup: '2' }, '=', '100'], { x: 1480, y: 470, size: 110 }), line: line([...norm(D), '=', { root: '100' }, '=', '10'], { x: 1470, y: 700, size: 100 }) } }],
      say: 'The norm tells how far apart two places are. Eight across and six up: sixty-four plus thirty-six is one hundred, so the norm is ten.',
    },
    {
      clear: true,
      stage: { sheet: sheet(P), v: [arrowOn('v', P, START, [4, 3], { pen: 'blue' })], bead: [bead('bead', P, START)], first: line([V, '=', ...pair('4', '3')], { x: SIDE.x, y: 300, size: 130 }) },
      also: [
        { at: 1.6, move: 2.4, stage: { bead: [bead('bead', P, [5, 4])] } },
        { at: 5.2, stage: { line: line([...norm(V), '=', '5'], { x: SIDE.x, y: 560, size: 170 }) } },
      ],
      say: 'And how fast something goes. A boat sails four east and three north every hour. Its speed is the norm: five every hour.',
    },
    {
      stage: { bead: null, v: [arrowOn('v', P, START, [4, 3], { pen: 'blue', fade: 0.25 })], u: [arrowOn('u', P, START, [0.8, 0.6], { pen: 'red' })], first: line([U, '=', ...pair('0.8', '0.6')], { x: SIDE.x, y: 300, size: 120 }), line: line([...norm(U), '=', '1'], { x: SIDE.x, y: 560, size: 170 }) },
      say: 'Shrink a vector until its norm is one, and only its direction is left.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { first: line([...norm(V), '=', '5'], { y: TOP, size: 150 }) },
      say: 'The norm of v is five. Which one can v be?',
      turn: { kind: 'choose', id: 'normfive', prompt: 'Which one can v be?', cards: [[V, '=', ...pair('4', '3')], [V, '=', ...pair('2', '3')]], right: 0 },
    },
    {
      clear: true,
      say: 'A length is never below zero. Which sign makes it true?',
      turn: { kind: 'place', id: 'notbelow', prompt: 'Which sign makes it true?', toks: [...norm(V), '_', '0'], tiles: ['≥', '<'], right: '≥', size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...norm(V), '=', '10'], { y: 480, size: 250 }) }, move: 0.6, say: 'The norm of v equals ten.', turn: { kind: 'read', id: 'readnorm', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { sheet: sheet(P), u: named('u', P, START, [4, 1], [U], 'red', -62), v: named('v', P, START, [1, 3], [V], 'blue', 62), first: line([U, '+', V], { x: SIDE.x, y: 300, size: SIDE.size }) },
      say: 'Two vectors can be added. A number can stretch one.',
    },
    { teaser: true, stage: { ask: line([U, { g: '?', k: 'ask' }, V], { x: SIDE.x, y: 600, size: 200, gold: ['ask'] }) }, say: 'Can two vectors be multiplied?', pad: 1 },
  ],
}
