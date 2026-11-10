/**
 * Rank 43, the dot and cross products: no new sign, two old ones (the dot
 * and the cross of rank 3) with a new job between vectors. The signs on the
 * paper are those of ranks 1–6, letters (rank 12), labels set low (rank
 * 14), sigma (rank 19), the pair's brackets and comma (ranks 5 and 27), the
 * vector's arrow (rank 41) and the norm's doubled bars (rank 42). u dot v:
 * multiply the matching parts and add; the answer is a number, which says
 * how much the two arrows go the same way, and is zero when they are square
 * to each other. u cross v: a new vector, square to both (for two arrows on
 * the paper it points straight out of it), as long as the area of the shape
 * the two span. The dot gives a number, the cross gives a vector. Where
 * they are used: the work a push does, a test for a square corner, the area
 * of a slanted shape.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { PEN, type Pen } from '../kit/logic'
import { PAPER } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { arrowOn, at, beside, corner, label, sheet, spanned, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const U: Tok = { vec: 'u' }
const V: Tok = { vec: 'v' }
const pair = (a: Tok[] | Tok, b: Tok): Tok[] => ['(', ...(Array.isArray(a) ? a : [a]), ',', b, ')']
const DOT: Tok[] = [U, '·', V]
const CROSS: Tok[] = [U, '×', V]

/** The squared sheet the arrows are drawn on, the tail they share, and where the lines beside the sheet stand. */
const P: Plane = { x: 180, y: 860, u: 110, w: 7, h: 5 }
const TAIL: Vec = [1, 1]
const SIDE = { x: 1440 }
const UV: Vec = [3, 1]
const VV: Vec = [2, 3]
/** v turned until it is square to u. */
const TURNED: Vec = [-1, 3]

/** An arrow with its name beside it. */
const named = (k: string, pl: Plane, from: Vec, v: Vec, name: Tok[], pen: Pen, off = 62): Sprite[] => [arrowOn(k, pl, from, v, { pen }), ...label(`${k}/name`, name, beside(pl, from, v, off), { size: 84 })]
/** The two arrows from their shared tail, and what each one's numbers are. */
const both = (v: Vec = VV, off = 62) => ({ u: named('u', P, TAIL, UV, [U], 'red', -62), v: named('v', P, TAIL, v, [V], 'blue', off) })
const given = (v: Tok[] = pair('2', '3')) => ({ first: line([U, '=', ...pair('3', '1')], { x: SIDE.x, y: 220, size: 110 }), second: line([V, '=', ...v], { x: SIDE.x, y: 360, size: 110 }) })

/** A sum worked out beside the sheet, and its answer on a line of its own (gold when it is the point). */
const worked = (toks: Tok[], answer: string, o: { size?: number; gold?: boolean } = {}) => ({ line: line(toks, { x: SIDE.x, y: 590, size: o.size ?? 90 }), answer: line(['=', { g: answer, k: 'ans' }], { x: SIDE.x, y: 750, size: 150, gold: o.gold ? ['ans'] : [] }) })

/** An arrow seen head on, coming straight out of the paper: its tip, a point in a ring. */
const out = (k: string, pt: Pt): Sprite => ({
  k,
  type: 'custom',
  n: { x: pt.x, y: pt.y, r: 34, o: 1 },
  enter: { r: 0 },
  d: {
    id: 'out of the paper',
    draw: (p) => (
      <g>
        <circle cx={p.x} cy={p.y} r={p.r} fill={PAPER} stroke={PEN.green} strokeWidth={8} />
        <circle cx={p.x} cy={p.y} r={p.r * 0.32} fill={PEN.green} />
      </g>
    ),
  },
})

const bead = (k: string, pl: Plane, [x, y]: Vec): Sprite => beadAt(k, at(pl, x, y).x, at(pl, x, y).y, 52)

export const r43: Spec = {
  rank: 43,
  id: 'r43',
  title: 'Dot and cross products',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sheet: sheet(P), ...both(), ...given() },
      say: 'Vectors add, and a number stretches a vector. Can two vectors be multiplied together?',
      turn: { kind: 'predict', id: 'multiply', prompt: 'Can two vectors be multiplied together?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    {
      stage: { dot: line(DOT, { x: SIDE.x - 220, y: 640, size: 150, gold: ['·'] }), cross: line(CROSS, { x: SIDE.x + 220, y: 640, size: 150, gold: ['×'] }) },
      say: 'Yes, and in two ways. Each uses an old sign for times, with a new job: the dot, and the cross.',
    },

    // ── 2. What the signs do ──
    { act: 2, clear: true, stage: { line: line(DOT, { y: 430, size: 320, gold: ['·'] }) }, move: 1.1, quiet: 1.2, motif: true, say: 'This is the dot product. We read it: u dot v.' },
    {
      clear: true,
      stage: { sheet: sheet(P), ...both(), ...given(), ...worked([...DOT, '=', '3', '·', '2', '+', '1', '·', '3'], '9') },
      say: 'Multiply the matching parts, then add. Three times two, plus one times three: nine.',
      poster: true,
    },
    {
      stage: worked([...DOT, '=', '3', '·', '2', '+', '1', '·', '3'], '9', { gold: true }),
      say: 'The answer is a number, not a vector. It says how much the two arrows go the same way.',
    },
    {
      stage: { line: null, answer: null, parts: line([...DOT, '=', 'u', { sub: '1' }, 'v', { sub: '1' }, '+', 'u', { sub: '2' }, 'v', { sub: '2' }], { x: SIDE.x, y: 560, size: 96 }) },
      also: [{ at: 3.6, stage: { short: line([...DOT, '=', { big: 'Σ', from: ['i', '=', '1'], to: '2', k: 'sig' }, 'u', { sub: 'i' }, 'v', { sub: 'i' }], { x: SIDE.x, y: 790, size: 96, gold: ['sig'] }) } }],
      say: 'With letters: u one v one, plus u two v two. When there are more parts, sigma keeps it short.',
    },
    {
      stage: { parts: null, short: null, ...both(TURNED, -62), ...given(pair(['−', '1'], '3')), mark: [corner('mark', P, TAIL, UV, TURNED)], ...worked([...DOT, '=', '3', '·', '(', '−', '1', ')', '+', '1', '·', '3'], '0', { size: 80, gold: true }) },
      move: 1.3,
      say: 'Turn v until the arrows make a square corner. Now the dot product is zero. Zero always means a square corner.',
    },
    { clear: true, stage: { line: line(CROSS, { y: 430, size: 320, gold: ['×'] }) }, move: 1.1, quiet: 1.2, say: 'This is the cross product. We read it: u cross v.' },
    {
      clear: true,
      stage: { sheet: sheet(P), ...both(), ...given(), out: [out('out', at(P, TAIL[0], TAIL[1])), ...label('out/name', CROSS, { x: at(P, TAIL[0], TAIL[1]).x + 30, y: at(P, TAIL[0], TAIL[1]).y + 78 }, { size: 70 })] },
      say: 'It gives a new vector, square to both. For two arrows on the paper, it points straight out of the paper.',
    },
    {
      stage: { shape: [spanned('shape', P, TAIL, UV, VV, { pen: 'green' })], line: line(['‖', ...CROSS, '‖', '=', '3', '·', '3', '−', '1', '·', '2'], { x: SIDE.x, y: 590, size: 84 }) },
      also: [{ at: 5.2, stage: { answer: line(['=', { g: '7', k: 'ans' }], { x: SIDE.x, y: 750, size: 150, gold: ['ans'] }) } }],
      say: 'Its length is the area of the shape the two arrows span. Multiply the parts crosswise and subtract: three times three, minus one times two. Seven.',
    },
    {
      clear: true,
      stage: { dot: line([...DOT, '=', { g: '9', k: 'ans' }], { y: 320, size: 210, gold: ['ans'] }), cross: line([...CROSS, '=', { vec: 'w', k: 'new' }], { y: 640, size: 210, gold: ['new'] }) },
      say: 'The dot gives a number. The cross gives a vector.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: {
        sheet: sheet(P),
        push: named('push', P, [1, 1], [3, 2], [{ vec: 'F' }], 'red', 62),
        way: named('way', P, [1, 1], [4, 0], [{ vec: 's' }], 'blue', -62),
        bead: [bead('bead', P, [1, 1])],
        line: line([{ vec: 'F' }, '·', { vec: 's' }, '=', '3', '·', '4', '+', '2', '·', '0'], { x: SIDE.x, y: 400, size: 90 }),
        answer: line(['=', { g: '12', k: 'ans' }], { x: SIDE.x, y: 570, size: 150, gold: ['ans'] }),
      },
      also: [{ at: 4.6, move: 2, stage: { bead: [bead('bead', P, [5, 1])] } }],
      say: 'Where are they used? A push is a vector, and so is a move. Push dot move is the work done: only the push along the way counts.',
    },
    {
      clear: true,
      stage: {
        sheet: sheet(P),
        a: [arrowOn('a', P, [3, 1], [2, 2], { pen: 'red' })],
        b: [arrowOn('b', P, [3, 1], [-2, 2], { pen: 'blue' })],
        mark: [corner('mark', P, [3, 1], [2, 2], [-2, 2])],
        first: line([...pair('2', '2'), '·', ...pair(['−', '2'], '2')], { x: SIDE.x, y: 340, size: 110 }),
        line: line(['=', '−', '4', '+', '4', '=', { g: '0', k: 'ans' }], { x: SIDE.x, y: 540, size: 130, gold: ['ans'] }),
      },
      say: 'To test for a square corner, take the dot product and look for zero.',
    },
    {
      clear: true,
      stage: {
        sheet: sheet(P),
        shape: [spanned('shape', P, [1, 1], [4, 0], [1, 3], { pen: 'green' })],
        u: named('u', P, [1, 1], [4, 0], [U], 'red', -62),
        v: named('v', P, [1, 1], [1, 3], [V], 'blue', 62),
        line: line(['‖', ...CROSS, '‖', '=', '4', '·', '3', '−', '0', '·', '1'], { x: SIDE.x, y: 400, size: 84 }),
        answer: line(['=', { g: '12', k: 'ans' }], { x: SIDE.x, y: 570, size: 150, gold: ['ans'] }),
      },
      say: 'And the cross product measures slanted shapes. Four across and three high: an area of twelve.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { first: line([U, '=', ...pair('2', '3')], { x: 620, y: TOP, size: 130 }), second: line([V, '=', ...pair('4', '1')], { x: 1300, y: TOP, size: 130 }) },
      say: 'Vector u is two, three. Vector v is four, one. Which one is true?',
      turn: { kind: 'choose', id: 'dot11', prompt: 'Which one is true?', cards: [[...DOT, '=', ...pair('8', '3')], [...DOT, '=', '11']], right: 1 },
    },
    {
      clear: ['first', 'second'],
      say: 'One of these two signs gives a number. Which one?',
      turn: { kind: 'place', id: 'whichsign', prompt: 'Which sign gives a number?', toks: [U, '_', V, '=', '11'], tiles: ['·', '×'], right: '·', y: 520, size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...DOT, '=', '0'], { y: 480, size: 250 }) }, move: 0.6, say: 'U dot v equals zero.', turn: { kind: 'read', id: 'readdot', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { table: line([{ mat: [['2', '1'], ['1', '3']] }], { y: 400, size: 230 }) },
      say: 'Here are four numbers, in two rows and two columns.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { y: 760, size: 220, gold: ['ask'] }) }, say: 'Can a whole table of numbers be one thing, with one name?', pad: 1 },
  ],
}
