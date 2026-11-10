/**
 * Rank 32, pairs: A × B, the set of every pair with its first part from A
 * and its second from B. The rank brings no new sign: a pair is written
 * with rank 5's brackets and rank 27's comma, and the × is rank 3's. A
 * place on a board needs two numbers, across and up, and their order
 * matters (in a set it does not). A × B has as many pairs as the product
 * of the two counts, which is why the times sign is used. Where it is
 * used: a square on a game board (a letter and a number), and ℝ × ℝ, the
 * flat sheet that graphs and maps are drawn on.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { arrow, dot, loop, PEN, type Loop } from '../kit/logic'
import { INK } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, type BeadColour, type Sprite } from '../kit/sprites'

// ── the board ────────────────────────────────────────────────────────────

/** A board of dots: (x, y) is its first dot (one across, one up), `step` from one dot to the next. */
export interface Board {
  x: number
  y: number
  step: number
  cols: number
  rows: number
  /** The size of the numerals along its two edges. */
  label?: number
}
/** The place i across and j up (both counted from one). */
export const boardAt = (b: Board, i: number, j: number): Pt => ({ x: b.x + (i - 1) * b.step, y: b.y - (j - 1) * b.step })

/** The dots, with what each column is called under it and what each row is called on its left. */
export function board(k: string, b: Board, o: { across?: Tok[]; up?: Tok[]; gold?: 'across' | 'up' | 'dots'; fade?: number } = {}): Sprite[] {
  const size = b.label ?? b.step * 0.45
  const out: Sprite[] = []
  for (let i = 1; i <= b.cols; i++) for (let j = 1; j <= b.rows; j++) out.push(dot(`${k}/d${i}_${j}`, boardAt(b, i, j), { r: o.gold === 'dots' ? b.step * 0.13 : b.step * 0.075, pen: o.gold === 'dots' ? 'gold' : 'ink', fade: o.fade }))
  const across = o.across ?? Array.from({ length: b.cols }, (_, i) => String(i + 1))
  const up = o.up ?? Array.from({ length: b.rows }, (_, j) => String(j + 1))
  across.forEach((tok, i) => out.push(...line([tok], { x: b.x + i * b.step, y: b.y + b.step * 0.62, size, fade: o.fade, gold: o.gold === 'across' ? ['1', '2', '3', '4', 'a', 'b', 'c'] : [] }).map((s) => ({ ...s, k: `${k}/c${i}` }))))
  up.forEach((tok, j) => out.push(...line([tok], { x: b.x - b.step * 0.68, y: b.y - j * b.step, size, fade: o.fade, gold: o.gold === 'up' ? ['1', '2', '3'] : [] }).map((s) => ({ ...s, k: `${k}/r${j}` }))))
  return out
}

/** A bead on the place i across and j up, with dotted lines to it from the two edges. */
export function placed(k: string, b: Board, i: number, j: number, colour?: BeadColour): Sprite[] {
  const at = boardAt(b, i, j)
  const pen = colour === 'blue' ? PEN.blue : PEN.gold
  return [
    {
      k: `${k}/ways`,
      type: 'custom',
      n: { x: at.x, y: at.y, x0: b.x - b.step * 0.38, y0: b.y + b.step * 0.3, o: 1 },
      d: {
        id: `ways ${pen}`,
        draw: (p) => <path d={`M ${p.x} ${p.y0} L ${p.x} ${p.y} M ${p.x0} ${p.y} L ${p.x} ${p.y}`} fill="none" stroke={pen} strokeWidth={7} strokeLinecap="round" strokeDasharray="2 18" />,
      },
    },
    beadAt(`${k}/bead`, at.x, at.y, b.step * 0.42, colour),
  ]
}

/** The board of acts 1 and 2: four across, three up. */
const MAIN: Board = { x: 290, y: 720, step: 165, cols: 4, rows: 3 }
/** A small one over the cards of his turn. */
const SMALL: Board = { x: 840, y: 270, step: 82, cols: 4, rows: 3, label: 46 }
/** The game board: letters across, numbers up. */
const GAME: Board = { x: 330, y: 760, step: 190, cols: 3, rows: 3 }

/** The lines written beside the board. */
const SIDE = { x: 1400, y: [300, 500, 700] }
const beside = (i: number, toks: Tok[], o: { size?: number; gold?: string[]; x?: number } = {}) => line(toks, { x: o.x ?? SIDE.x, y: SIDE.y[i], size: o.size ?? 170, gold: o.gold })

const pair = (a: Tok, b: Tok): Tok[] => ['(', a, ',', b, ')']
const listed = (name: string, of: string[]): Tok[] => [name, '=', '{', ...of.flatMap((g, i): Tok[] => (i ? [',', g] : [g])), '}']

// ── the flat sheet ───────────────────────────────────────────────────────

/** Two number lines crossing at (x, y), a point u across and v up, and dotted lines to it. */
const SHEET = { x: 470, y: 760, unit: 150 }
const sheet = (u: number, v: number): Sprite[] => [
  {
    k: 'sheet',
    type: 'custom',
    n: { x: SHEET.x, y: SHEET.y, u, v, o: 1 },
    d: {
      id: 'sheet',
      draw: (p) => {
        const s = SHEET.unit
        const [px, py] = [p.x + p.u * s, p.y - p.v * s]
        return (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <g stroke={INK} strokeWidth={6}>
              <path d={`M ${p.x - s * 1.6} ${p.y} L ${p.x + s * 3.7} ${p.y} M ${p.x + s * 3.7 - 22} ${p.y - 16} L ${p.x + s * 3.7} ${p.y} L ${p.x + s * 3.7 - 22} ${p.y + 16}`} />
              <path d={`M ${p.x} ${p.y + s * 1.2} L ${p.x} ${p.y - s * 3.1} M ${p.x - 16} ${p.y - s * 3.1 + 22} L ${p.x} ${p.y - s * 3.1} L ${p.x + 16} ${p.y - s * 3.1 + 22}`} />
              {[-1, 1, 2, 3].map((i) => (
                <line key={`x${i}`} x1={p.x + i * s} y1={p.y - 14} x2={p.x + i * s} y2={p.y + 14} strokeWidth={4} />
              ))}
              {[-1, 1, 2].map((j) => (
                <line key={`y${j}`} x1={p.x - 14} y1={p.y - j * s} x2={p.x + 14} y2={p.y - j * s} strokeWidth={4} />
              ))}
            </g>
            <path d={`M ${px} ${p.y} L ${px} ${py} M ${p.x} ${py} L ${px} ${py}`} stroke={PEN.gold} strokeWidth={7} strokeDasharray="2 18" />
            <circle cx={px} cy={py} r={20} fill={PEN.gold} />
          </g>
        )
      },
    },
  },
  ...[1, 2, 3].flatMap((i) => line([String(i)], { x: SHEET.x + i * SHEET.unit, y: SHEET.y + 62, size: 52 }).map((s) => ({ ...s, k: `sx${i}` }))),
  ...[1, 2].flatMap((j) => line([String(j)], { x: SHEET.x - 58, y: SHEET.y - j * SHEET.unit, size: 52 }).map((s) => ({ ...s, k: `sy${j}` }))),
]

// ── the closing question: two sets, and arrows from one to the other ──────

const FROM: Loop = { x: 420, y: 600, rx: 170, ry: 300 }
const TO: Loop = { x: 1000, y: 600, rx: 170, ry: 300 }
const column = (l: Loop, i: number): Pt => ({ x: l.x, y: l.y + (i - 1) * 190 })
const arrows = (): Patch => ({
  a: [...loop('a', FROM, { name: 'A', nameAt: { x: FROM.x, y: 210 }, pen: 'blue' }), ...['1', '2', '3'].map((g, i) => line([g], { ...column(FROM, i), size: 96 })[0]).map((s, i) => ({ ...s, k: `a${i}` }))],
  b: [...loop('b', TO, { name: 'B', nameAt: { x: TO.x, y: 210 }, pen: 'red' }), ...['2', '4', '6'].map((g, i) => line([g], { ...column(TO, i), size: 96 })[0]).map((s, i) => ({ ...s, k: `b${i}` }))],
  go: [0, 1, 2].map((i) => arrow(`go${i}`, column(FROM, i), column(TO, i), { gap: 70 })),
})

export const r32: Spec = {
  rank: 32,
  id: 'r32',
  title: 'Pairs',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { board: board('board', MAIN), gold: placed('gold', MAIN, 3, 2) },
      say: 'This bead is three across and two up. Is that the same place as two across and three up?',
      turn: { kind: 'predict', id: 'sameplace', prompt: 'Is two across, three up the same place?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { stage: { blue: placed('blue', MAIN, 2, 3, 'blue') }, say: 'No. Two across and three up is a different place.' },
    { stage: { ask: beside(1, ['?'], { size: 230, gold: ['?'] }) }, move: 0.5, say: 'So a place needs two numbers, and their order matters. How do we write the two as one thing?' },

    // ── 2. What the writing does ──
    {
      act: 2,
      stage: { ask: null, blue: null, first: beside(0, pair('3', '2'), { gold: ['(', ',', ')'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'We write them in brackets, with a comma between: across first, then up. This is called an ordered pair.',
    },
    {
      stage: { first: beside(0, pair('3', '2')), blue: placed('blue', MAIN, 2, 3, 'blue'), second: beside(1, pair('2', '3')) },
      say: 'Two, three is a different pair. In a pair, the order matters.',
    },
    {
      stage: { first: beside(0, [...pair('3', '2'), '≠', ...pair('2', '3')], { size: 116, gold: ['≠'] }), second: beside(1, ['{', '3', ',', '2', '}', '=', '{', '2', ',', '3', '}'], { size: 116, gold: ['='] }) },
      say: 'In a set, it does not. Curly brackets with the same elements are the same set, in either order.',
    },
    {
      stage: { gold: null, blue: null, first: beside(0, listed('A', ['1', '2', '3', '4']), { size: 116 }), second: beside(1, listed('B', ['1', '2', '3']), { size: 116 }) },
      say: 'The numbers across come from one set, A. The numbers up come from another, B.',
    },
    {
      stage: { board: board('board', MAIN, { gold: 'dots' }), first: null, second: null, product: beside(0, ['A', '×', 'B'], { size: 210, gold: ['×'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'The set of every pair, first from A and second from B, is written with the times sign. We read it: A cross B.',
      poster: true,
    },
    {
      stage: { product: beside(0, ['A', '×', 'B'], { size: 210 }), count: beside(1, ['4', '×', '3', '=', '12'], { size: 150 }) },
      say: 'Why the times sign? Count the pairs. Four across, three up: four times three is twelve.',
    },
    {
      stage: { board: board('board', MAIN), gold: placed('gold', MAIN, 3, 2), product: null, count: null, first: beside(0, [...pair('3', '2'), '∈', 'A', '×', 'B'], { size: 116, gold: ['∈'] }) },
      say: 'Each pair is one element of A cross B.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { board: board('board', GAME, { across: ['a', 'b', 'c'] }), gold: placed('gold', GAME, 3, 2), first: beside(1, pair('c', '2'), { size: 190 }) },
      say: 'The two sets can be of different kinds. On a game board, a square is named by a letter and a number.',
    },
    {
      clear: true,
      stage: { sheet: sheet(2.5, 1), first: beside(0, pair('2.5', '1'), { size: 150, x: 1420 }), second: beside(1, [...pair('x', 'y'), '∈', 'ℝ', '×', 'ℝ'], { size: 116, x: 1420 }) },
      say: 'With the real numbers used twice, a pair names every point of a flat sheet. That is how graphs and maps are drawn.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { board: board('board', SMALL), gold: placed('gold', SMALL, 4, 2) },
      say: 'Across first, then up. Which pair names the place of the bead?',
      turn: { kind: 'choose', id: 'whichpair', prompt: 'Which pair names the bead’s place?', cards: [pair('2', '4'), pair('4', '2')], right: 1 },
    },
    {
      clear: true,
      stage: { a: line(listed('A', ['1', '2']), { x: 560, y: 190, size: 110 }), b: line(listed('B', ['1', '2', '3']), { x: 1340, y: 190, size: 110 }) },
      say: 'Here are a new A and a new B. Is this pair in A cross B? Put in the sign that makes the line true.',
      turn: { kind: 'place', id: 'notpair', prompt: 'Which sign makes it true?', toks: [...pair('3', '1'), '_', 'A', '×', 'B'], tiles: ['∈', '∉'], right: '∉', y: 500, size: 150 },
    },
    { say: 'Its first number is three, and three is not in A.', pad: 0.4 },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line([...pair('2', '3'), '∈', 'A', '×', 'B'], { y: 480, size: 170 }) },
      move: 0.6,
      say: 'The pair two, three is an element of A cross B.',
      turn: { kind: 'read', id: 'readpair', prompt: 'You read it.' },
    },
    { clear: true, teaser: true, stage: arrows(), say: 'A function takes each element of A to one element of B.' },
    { teaser: true, stage: { ask: line(['?'], { x: 1500, y: 600, size: 240, gold: ['?'] }) }, move: 0.5, say: 'How do we write where it starts, and where it lands?', pad: 1 },
  ],
}
