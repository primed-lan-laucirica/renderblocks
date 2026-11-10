/**
 * Rank 44, matrices: numbers in rows and columns between tall brackets,
 * named with a capital letter, and three signs that go with them (the
 * raised T of the transpose, the raised −1 of the inverse, and det). The
 * signs on the paper are those of ranks 1–6, letters (rank 12), labels set
 * low (rank 14), the raised −1 (as in rank 33), vectors (rank 41) and the
 * matrix's own three. A matrix times a vector gives a vector (each row
 * dotted with it, the vector standing as a column), so one matrix moves
 * every arrow on the paper: the whole picture stretches or turns. A inverse
 * undoes A. The determinant of A is one number: how many times bigger A
 * makes an area; zero means squashed flat, and then there is no inverse.
 * Every number has its place (b₁₂: row one, column two), and the transpose
 * swaps rows and columns. Where they are used: moving pictures on a screen,
 * and several equations written as one.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Part, Tok } from '../kit/glyphs'
import { PEN, type Pen } from '../kit/logic'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'
import { arrowOn, at, beside, field, label, sheet, spanned, type Field, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const V: Tok = { vec: 'v' }
const mat = (rows: Part[][], lit?: number[]): Tok => ({ mat: rows, ...(lit ? { lit } : {}) })
/** A vector standing up: one column. */
const col = (...parts: Part[]): Tok => ({ mat: parts.map((p) => [p]) })
const INV: Tok[] = ['A', { sup: ['−', '1'] }]

/** The stretch: twice as far across, three times as far up. */
const stretch = (lit?: number[]) => mat([['2', '0'], ['0', '3']], lit)
const HALF: Part = [{ frac: ['1', '2'] }]
const THIRD: Part = [{ frac: ['1', '3'] }]
/** Each row dotted with the column (1, 1), written out. */
const worked = (lit?: number[]) => mat([[['2', '·', '1', '+', '0', '·', '1']], [['0', '·', '1', '+', '3', '·', '1']]], lit)

/** The squared sheet the picture is on, and where the lines beside it stand. */
const P: Plane = { x: 240, y: 810, u: 150, w: 4, h: 4 }
const paper = () => sheet(P, { axes: true, xs: [1, 2, 3, 4], ys: [1, 2, 3, 4] })
const SIDE = { x: 1400, size: 130 }
/** The square of one by one, left faint where it started; and the shape it is stretched to. */
const unit = (): Sprite[] => [spanned('unit', P, [0, 0], [1, 0], [0, 1], { pen: 'ink', shade: 0.14 })]
const shape = (wide: number, tall: number, pen: Pen = 'red'): Sprite[] => [spanned('shape', P, [0, 0], [wide, 0], [0, tall], { pen })]
const outline = (): Sprite[] => [spanned('outline', P, [0, 0], [2, 0], [0, 3], { pen: 'red', shade: 0 })]
/** An arrow from zero with its name beside it. */
const named = (k: string, v: Vec, name: Tok[], pen: Pen, off = 62): Sprite[] => [arrowOn(k, P, [0, 0], v, { pen }), ...label(`${k}/name`, name, beside(P, [0, 0], v, off), { size: 80 })]

/** The two numbered matrices: B, and B with its rows and columns swapped. */
const table = (lit?: number[]) => mat([['1', '2', '3'], ['4', '5', '6']], lit)
const swapped = (lit?: number[]) => mat([['1', '4'], ['2', '5'], ['3', '6']], lit)

/** A picture on a screen: a little house, turned about zero by so many degrees. */
const T: Plane = { x: 640, y: 830, u: 160, w: 3, h: 3, left: 3 }
const HOUSE: Vec[] = [[1, 0], [3, 0], [3, 2], [2, 3], [1, 2]]
const house = (k: string, turn: number, o: { pen?: Pen; shade?: number } = {}): Sprite => {
  const colour = PEN[o.pen ?? 'blue']
  return {
    k,
    type: 'custom',
    n: { turn, shade: o.shade ?? 0.3, o: 1 },
    d: {
      id: `house ${colour}`,
      draw: (p) => {
        const [c, s] = [Math.cos((p.turn * Math.PI) / 180), Math.sin((p.turn * Math.PI) / 180)]
        const pts = HOUSE.map(([x, y]) => at(T, c * x - s * y, s * x + c * y))
        return <polygon points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill={colour} fillOpacity={p.shade} stroke={colour} strokeWidth={7} strokeLinejoin="round" />
      },
    },
  }
}

/** His turn: each bead makes A stretch one more up, and the determinant follows. */
const PILE = { x: 1440, y: 700, size: 64 }
const ZONE = { x: PILE.x - 320, y: PILE.y - 130, w: 640, h: 260 }
function grown(n: number): Patch {
  return {
    sheet: paper(),
    unit: unit(),
    shape: shape(2, n, 'blue'),
    rule: line(['A', '=', mat([['2', '0'], ['0', String(n)]])], { x: PILE.x, y: 200, size: 120 }),
    line: line(['det', 'A', '=', { g: String(2 * n), k: 'area' }], { x: PILE.x, y: 450, size: 150, gold: n === 3 ? ['area'] : [] }),
    beads: row(n, PILE.x, PILE.y, PILE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PILE.size, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  }
}

/** The closing question: a hill, and at every place the arrow that points straight up it. */
const H: Plane = { x: 240, y: 820, u: 140, w: 6, h: 4 }
const UPHILL: Field = { id: 'uphill', f: (x, y) => [3 - x, 2 - y] }

export const r44: Spec = {
  rank: 44,
  id: 'r44',
  title: 'Matrices',
  layers: ['sheet', 'unit', 'outline', 'shape'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sheet: paper(), outline: outline(), shape: shape(1, 1) },
      say: 'A square, one across and one up. Stretch the paper: twice as wide, three times as tall. How many squares does it cover now?',
      turn: { kind: 'predict', id: 'stretched', prompt: 'How many squares does it cover now?', options: [{ label: 'Five' }, { label: 'Six' }] },
    },
    {
      stage: { outline: null, unit: unit(), shape: shape(2, 3), line: line(['2', '×', '3', '=', '6'], { x: SIDE.x, y: 430, size: 170 }) },
      move: 1.4,
      say: 'Six. The stretch moves every point on the paper. To write it down, we need a table of numbers.',
    },

    // ── 2. What the signs do ──
    { act: 2, clear: true, stage: { line: line(['A', '=', stretch()], { y: 430, size: 270, gold: ['mat'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is a matrix. Numbers in rows and columns, inside tall brackets. Its name is a capital letter: the matrix A.' },
    {
      clear: true,
      stage: { sheet: paper(), unit: unit(), shape: shape(1, 1), v: named('v', [1, 1], [V], 'red', -62), line: line(['A', V, '=', stretch(), col('1', '1')], { x: SIDE.x, y: 290, size: SIDE.size }) },
      say: 'A matrix times a vector gives a new vector. Here the vector stands as a column: one, one.',
    },
    {
      stage: { line: line(['A', V, '=', stretch([0, 1]), col('1', '1')], { x: SIDE.x, y: 290, size: SIDE.size }), work: line(['=', { ...(worked([0]) as object), k: 'work' } as Tok], { x: SIDE.x - 60, y: 610, size: SIDE.size }) },
      also: [
        {
          at: 7,
          stage: {
            line: line(['A', V, '=', stretch([2, 3]), col('1', '1')], { x: SIDE.x, y: 290, size: SIDE.size }),
            work: line(['=', { ...(worked([1]) as object), k: 'work' } as Tok, '=', col('2', '3')], { x: SIDE.x, y: 610, size: SIDE.size }),
            Av: named('Av', [2, 3], ['A', V], 'blue', -84),
          },
        },
      ],
      say: 'Each row is dotted with the column. Row one: two times one, plus zero times one, is two. Row two gives three.',
    },
    {
      stage: { shape: shape(2, 3), line: line(['A', V, '=', stretch(), col('1', '1')], { x: SIDE.x, y: 290, size: SIDE.size }), work: line(['=', col('2', '3')], { x: SIDE.x, y: 610, size: SIDE.size }) },
      move: 1.6,
      say: 'So A moves every arrow at once. The whole picture stretches.',
      poster: true,
    },
    {
      clear: ['sheet', 'unit', 'shape', 'v', 'Av'],
      stage: { line: line([...INV, '=', mat([[HALF, '0'], ['0', THIRD]])], { x: SIDE.x, y: 340, size: 150, gold: ['sup'] }) },
      also: [{ at: 2.6, move: 1.6, stage: { shape: shape(1, 1), Av: [arrowOn('Av', P, [0, 0], [1, 1], { pen: 'blue' })], back: line([...INV, 'A', V, '=', V], { x: SIDE.x, y: 700, size: 150 }) } }],
      say: 'A inverse undoes A: half as far across, a third as far up. The raised minus one means undo, as it did for a function.',
    },
    {
      clear: ['sheet', 'unit', 'shape'],
      stage: { shape: shape(2, 3), line: line(['det', 'A', '=', '6'], { x: SIDE.x, y: 330, size: 180, gold: ['det'] }) },
      move: 1.4,
      say: 'The determinant of A is one number: how many times bigger A makes an area. One square became six.',
    },
    {
      stage: { line: line(['det', 'A', '=', '6'], { x: SIDE.x, y: 250, size: 130 }), flat: line(['det', mat([['2', '0'], ['0', '0']]), '=', '0'], { x: SIDE.x, y: 600, size: 160 }) },
      also: [{ at: 1.6, move: 1.6, stage: { shape: shape(2, 0.06) } }],
      say: 'A determinant of zero means the picture is squashed flat. Then nothing can undo it: there is no inverse.',
    },
    {
      clear: true,
      stage: { line: line(['B', '=', table([1])], { y: 330, size: 190 }), place: line(['b', { sub: '12' }, '=', '2'], { y: 720, size: 170, gold: ['sub'] }) },
      say: 'Every number in a matrix has its place. In the matrix B, b one two is in row one, column two.',
    },
    {
      stage: { line: line(['B', '=', table([1])], { x: 520, y: 330, size: 150 }), turned: line(['B', 'ᵀ', '=', swapped([2])], { x: 1380, y: 380, size: 150, gold: ['ᵀ'] }), place: null },
      say: 'B transpose swaps rows and columns. Now the two is in row two, column one.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { sheet: sheet(T, { axes: true }), was: [house('was', 0, { pen: 'ink', shade: 0.1 })], house: [house('house', 0)], line: line([mat([['0', ['−', '1']], ['1', '0']])], { x: 1540, y: 430, size: 220 }) },
      also: [{ at: 2.2, move: 2, stage: { house: [house('house', 90)] } }],
      say: 'Matrices move pictures on a screen. Every turn and every stretch is a matrix.',
    },
    {
      clear: true,
      stage: { first: line(['2', 'x', '+', 'y', '=', '5'], { x: 480, y: 300, size: 130 }), second: line(['x', '+', '3', 'y', '=', '5'], { x: 480, y: 480, size: 130 }), line: line([mat([['2', '1'], ['1', '3']]), col('x', 'y'), '=', col('5', '5')], { x: 1340, y: 390, size: 150 }) },
      also: [{ at: 3, stage: { short: line(['A', { vec: 'x' }, '=', { vec: 'b' }], { y: 800, size: 200 }) } }],
      say: 'And a matrix holds several equations at once: the matrix A, times vector x, equals vector b.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(['A', '=', mat([['1', '2'], ['3', '4']])], { y: TOP, size: 130 }) },
      say: 'Here is a matrix A. Which one is A transpose?',
      turn: { kind: 'choose', id: 'swapped', prompt: 'Which one is A transpose?', cards: [['A', 'ᵀ', '=', mat([['1', '3'], ['2', '4']])], ['A', 'ᵀ', '=', mat([['3', '4'], ['1', '2']])]], right: 0 },
    },
    {
      clear: true,
      say: 'Each bead makes the matrix A stretch one more up. Add beads until the determinant of A is six.',
      turn: { kind: 'build', id: 'det6', prompt: 'Add beads until the determinant of A is six.', target: 3, max: 4, zone: ZONE, state: grown },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['det', ...INV, '=', { frac: ['1', '6'] }], { y: 480, size: 230 }) }, move: 0.6, say: 'The determinant of A inverse equals one sixth.', turn: { kind: 'read', id: 'readdet', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { sheet: sheet(H), hill: [field('hill', H, UPHILL, { scale: 0.24, w: 7, pen: 'green' })] },
      say: 'On a hill, every place has its own arrow, pointing straight uphill.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: 1560, y: 430, size: 260, gold: ['ask'] }) }, say: 'Which sign gives all of those arrows at once?', pad: 1 },
  ],
}
