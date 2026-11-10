/**
 * Rank 52, direct sum and tensor product: a plus and a times, each with a
 * ring round it. The signs on the paper are those of ranks 1–6, letters
 * (rank 12), the list's brackets and comma (ranks 5 and 27), ℝ (rank 31),
 * the vector's arrow (rank 41), the matrix (rank 44) and the rank's own
 * two. The ring says the sign is not for single numbers but for whole
 * lists, tables and spaces. A direct sum joins two lists end to end, so
 * their lengths add; for matrices it sets them corner to corner with zeros
 * elsewhere; for spaces the dimensions add. A tensor product multiplies
 * every pairing, which makes a times table, so the lengths (and the
 * dimensions) multiply. Where they are used: a direct sum splits a thing
 * into parts that do not mix (a place on the map and a height); a tensor
 * product joins two things when every pairing matters (two coins, the
 * parts of a quantum computer).
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Part, Tok } from '../kit/glyphs'
import { arrow, dot, PEN } from '../kit/logic'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'
import { at, field, label, sheet, type Field, type Plane } from '../kit/vectors'
import { TOP } from './shared'

const U: Tok = { vec: 'u' }
const V: Tok = { vec: 'v' }
const SUM: Tok[] = [U, '⊕', V]
const TENSOR: Tok[] = [U, '⊗', V]
/** A list of numbers in round brackets. */
const list = (...parts: Tok[]): Tok[] => ['(', ...parts.flatMap((p, i) => (i ? [',', p] : [p])), ')']
const mat = (rows: Part[][], lit?: number[]): Tok => ({ mat: rows, ...(lit ? { lit } : {}) })
const sup = (n: string): Tok[] => ['ℝ', { sup: n }]

/** The two lists, written small along the top, while a line below puts them together. */
const NAMED = { y: 230, size: 110 }
const named = (u: string[], v: string[], o: { y?: number; size?: number } = {}) => ({
  u: line([U, '=', ...list(...u)], { x: 520, y: o.y ?? NAMED.y, size: o.size ?? NAMED.size }),
  v: line([V, '=', ...list(...v)], { x: 1360, y: o.y ?? NAMED.y, size: o.size ?? NAMED.size }),
})
/** Every number of (1, 2) times every number of (3, 4, 5). */
const table = (lit?: number[]) => mat([['3', '4', '5'], ['6', '8', '10']], lit) // prettier-ignore

/** Two matrices set corner to corner. */
const matA = () => mat([['1', '2'], ['3', '4']]) // prettier-ignore
const matB = () => mat([['5', '6'], ['7', '8']]) // prettier-ignore
const corners = () => mat([['1', '2', '0', '0'], ['3', '4', '0', '0'], ['0', '0', '5', '6'], ['0', '0', '7', '8']], [0, 1, 4, 5, 10, 11, 14, 15]) // prettier-ignore

/** A place on the map, and a height beside it. */
const M: Plane = { x: 400, y: 880, u: 130, w: 4, h: 3 }
const HEIGHT = { x: 1300 }

const coin = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'coin',
    draw: (p) => (
      <g stroke="#a7771a" strokeWidth={6}>
        <circle cx={p.x} cy={p.y} r={78} fill="#e0a82e" />
        <circle cx={p.x} cy={p.y} r={58} fill="none" strokeWidth={4} />
      </g>
    ),
  },
})

/** His turn: each bead puts one more number in v, so the times table gets one more column. */
const PILE = { x: 1540, y: 640, size: 72 }
const ZONE = { x: PILE.x - 300, y: PILE.y - 150, w: 600, h: 300 }
function lengthened(n: number): Patch {
  const vs = Array.from({ length: 1 + n }, (_, j) => 3 + j)
  return {
    u: line([U, '=', ...list('1', '2')], { x: 330, y: 210, size: 100 }),
    v: line([V, '=', ...list(...vs.map(String))], { x: 1040, y: 210, size: 100 }),
    line: line([...TENSOR, '=', mat([vs.map(String), vs.map((x) => String(2 * x))])], { x: 620, y: 520, size: 120 }),
    count: line(['2', '×', String(1 + n), '=', { g: String(2 * (1 + n)), k: 'cells' }], { x: 620, y: 810, size: 130, gold: n === 3 ? ['cells'] : [] }),
    beads: row(n, PILE.x, PILE.y, PILE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PILE.size, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  }
}

/** The closing question: a steady wind, and a path that comes back to where it began. */
const W: Plane = { x: 330, y: 830, u: 150, w: 5, h: 3 }
const WIND: Field = { id: 'steady', f: () => [1, 0] }
const round = (k: string): Sprite => {
  const a = at(W, 1.5, 0.5)
  const s = 2 * W.u
  const head = (x: number, y: number, turn: number) => <path key={turn} d="M -16 -20 L 16 0 L -16 20" transform={`translate(${x} ${y}) rotate(${turn})`} />
  return {
    k,
    type: 'custom',
    n: { go: 1, o: 1 },
    enter: { go: 0 },
    d: {
      id: 'round',
      draw: (p) => (
        <g fill="none" stroke={PEN.red} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${a.x} ${a.y} h ${s} v ${-s} h ${-s} Z`} strokeDasharray={4 * s} strokeDashoffset={4 * s * (1 - p.go)} />
          <g opacity={p.go}>{[head(a.x + s / 2, a.y, 0), head(a.x + s, a.y - s / 2, -90), head(a.x + s / 2, a.y - s, 180), head(a.x, a.y - s / 2, 90)]}</g>
          <circle cx={a.x} cy={a.y} r={20} fill={PEN.red} stroke="none" />
        </g>
      ),
    },
  }
}

export const r52: Spec = {
  rank: 52,
  id: 'r52',
  title: 'Direct sum, tensor product',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: named(['1', '2'], ['3', '4', '5'], { y: 470, size: 150 }),
      say: 'Vector u is one, two. Vector v is three, four, five. Multiply every number of one by every number of the other. How many answers?',
      turn: { kind: 'predict', id: 'howmany', prompt: 'How many answers?', options: [{ label: 'Five' }, { label: 'Six' }] },
    },
    {
      stage: { ...named(['1', '2'], ['3', '4', '5'], { y: 280, size: 130 }), times: line(['2', '×', '3', '=', '6'], { x: 520, y: 590, size: 150 }) },
      say: 'Six. Each of the two meets each of the three.',
    },
    {
      stage: { plus: line(['2', '+', '3', '=', '5'], { x: 1360, y: 590, size: 150 }), ask: line([U, { g: '?', k: 'ask' }, V], { y: 880, size: 150, gold: ['ask'] }) },
      say: 'Joined end to end, they make a list of five. Two ways to put lists together. Each needs a sign.',
    },

    // ── 2. What the signs do ──
    {
      act: 2,
      clear: true,
      stage: { plus: line(['⊕'], { x: 620, y: 440, size: 440, gold: ['⊕'] }), times: line(['⊗'], { x: 1300, y: 440, size: 440, gold: ['⊗'] }) },
      move: 1.1,
      quiet: 1.4,
      motif: true,
      say: 'A plus and a times, each with a ring round it: direct sum, and tensor. The ring says: not for single numbers, but for whole lists.',
    },
    {
      clear: true,
      stage: { ...named(['1', '2'], ['3', '4', '5']), line: line([...SUM, '=', ...list('1', '2', '3', '4', '5')], { y: 540, size: 150, gold: ['⊕'] }), count: line(['2', '+', '3', '=', '5'], { y: 850, size: 130 }) },
      say: 'We read: u direct sum v. The lists are joined end to end. Their lengths add: two plus three.',
      poster: true,
    },
    {
      clear: ['u', 'v'],
      stage: { line: line([...TENSOR, '=', table()], { y: 560, size: 180, gold: ['⊗'] }) },
      also: [
        { at: 3.8, stage: { line: line([...TENSOR, '=', table([0, 1, 2])], { y: 560, size: 180, gold: ['⊗'] }) } },
        { at: 6.4, stage: { line: line([...TENSOR, '=', table([3, 4, 5])], { y: 560, size: 180, gold: ['⊗'] }) } },
      ],
      say: 'And u tensor v: every pairing, multiplied. One times three, four, five. Two times three, four, five.',
    },
    {
      stage: { line: line([...TENSOR, '=', table()], { y: 560, size: 180, gold: ['mat'] }), count: line(['2', '×', '3', '=', '6'], { y: 880, size: 130 }) },
      say: 'A times table: a matrix with two rows and three columns. The lengths multiply: two times three.',
    },
    {
      clear: true,
      stage: { a: line(['A', '=', matA()], { x: 560, y: 240, size: 110 }), b: line(['B', '=', matB()], { x: 1360, y: 240, size: 110 }), line: line(['A', '⊕', 'B', '=', corners()], { y: 660, size: 130, gold: ['⊕'] }) },
      say: 'For two matrices, direct sum sets them corner to corner, with zeros everywhere else.',
    },
    {
      clear: true,
      stage: { name: line(['V', '⊕', 'W'], { y: 270, size: 190, gold: ['⊕'] }), line: line([...sup('2'), '⊕', 'ℝ', '=', ...sup('3')], { y: 560, size: 170 }), count: line(['2', '+', '1', '=', '3'], { y: 840, size: 130 }) },
      say: 'Spaces have capital letters for names: V direct sum W. A plane and a line make a space of three dimensions. Dimensions add. With tensor, they multiply.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: {
        line: line([...list('3', '1'), '⊕', ...list('2'), '=', ...list('3', '1', '2')], { y: 260, size: 130, gold: ['⊕'] }),
        map: [...sheet(M), dot('place', at(M, 3, 1), { r: 20, pen: 'blue' }), ...label('place/n', list('3', '1'), { x: at(M, 3, 1).x, y: at(M, 3, 1).y - 68 }, { size: 76 })],
        height: [arrow('up', { x: HEIGHT.x, y: M.y }, { x: HEIGHT.x, y: M.y - 2 * M.u }, { gap: 0, pen: 'red', w: 10 }), ...label('up/n', ['2'], { x: HEIGHT.x + 90, y: M.y - M.u }, { size: 110 })],
      },
      say: 'Direct sum splits a thing into parts that do not mix: a kite\'s place on the map, and its height.',
    },
    {
      clear: true,
      stage: {
        coins: [coin('coin0', 820, 250), coin('coin1', 1100, 250)],
        line: line([...list('H', 'T'), '⊗', ...list('H', 'T'), '=', mat([[['H', 'H'], ['H', 'T']], [['T', 'H'], ['T', 'T']]])], { y: 560, size: 120, gold: ['⊗'] }), // prettier-ignore
        count: line(['2', '×', '2', '=', '4'], { y: 860, size: 130 }),
      },
      say: 'Tensor is for when every pairing matters. Two coins, each heads or tails: four outcomes.',
    },
    {
      clear: true,
      stage: { line: line([...sup('2'), '⊗', ...sup('2'), '=', ...sup('4')], { y: 380, size: 170, gold: ['⊗'] }), count: line(['2', '×', '2', '=', '4'], { y: 720, size: 150 }) },
      also: [{ at: 4.2, stage: { line: line([...sup('2'), '⊗', ...sup('2'), '⊗', ...sup('2'), '=', ...sup('8')], { y: 380, size: 170, gold: ['⊗'] }), count: line(['2', '×', '2', '×', '2', '=', '8'], { y: 720, size: 150 }) } }],
      say: 'A quantum computer joins its parts with tensor. Each added part doubles the list.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { u: line([U, '=', ...list('1', '2', '3')], { x: 500, y: TOP + 10, size: 96 }), v: line([V, '=', ...list('4', '5', '6', '7')], { x: 1380, y: TOP + 10, size: 96 }) },
      say: 'A list of three numbers and a list of four. Which one has twelve numbers?',
      turn: { kind: 'choose', id: 'twelve', prompt: 'Which one has twelve numbers?', cards: [SUM, TENSOR], right: 1 },
    },
    {
      clear: true,
      say: 'Each bead adds a number to vector v. Make the times table hold eight numbers.',
      turn: { kind: 'build', id: 'eightcells', prompt: 'Add beads until the times table holds eight numbers.', target: 3, max: 5, zone: ZONE, state: lengthened },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['V', '⊗', 'W'], { y: 480, size: 260 }) }, move: 0.6, say: 'V tensor W.', turn: { kind: 'read', id: 'readtensor', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { wind: [field('wind', W, WIND, { scale: 0.56, w: 8 })], path: [round('round')] },
      move: 2.2,
      say: 'A steady wind, and a path that comes back to where it began.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: 1560, y: 520, size: 240, gold: ['ask'] }) }, say: 'Add up the push all the way round, back to the start. How do we write that?', pad: 1 },
  ],
}
