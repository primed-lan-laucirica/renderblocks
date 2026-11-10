/**
 * Rank 20, Π : multiply a whole list. The signs on the paper are those of
 * the sum (rank 19) with × and · , and Π with where it starts below and
 * where it stops above. Capital pi works as sigma does, but multiplies.
 * Where it is used: every number from one up to n (the factorial), a list
 * of numbers x₁ · x₂ · x₃, and the same number each time (a power).
 *
 * The ties between signs: capital pi is the Greek P, for product; it works
 * like sigma; it is not the small pi that names a number. No names or dates
 * are narrated.
 */
import type { Tok } from '../kit/glyphs'
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { piles } from '../kit/algebra'
import { numberLine, type Ruler } from '../kit/measures'
import { grid, line, loose, type Sprite } from '../kit/sprites'

const from: Tok[] = ['i', '=', '1']
const pi = (to: string): Tok => ({ big: 'Π', from, to, k: 'pi' })
const sigma = (to: string): Tok => ({ big: 'Σ', from, to, k: 'sig' })

const ADD = { y: 220, size: 130 }
const TIMES = { y: 560, size: 130 }
const MID = { y: 440, size: 200 }

const LIST = [3, 2, 2]
const list = () => piles(LIST, { y: 800, label: (i) => ['x', { sub: String(i + 1) }] })

/** Eight beads as a cube: a square of four, and another behind it. */
const cube = (x: number, y: number): Sprite[] => [...loose(grid(4, 2, x + 46, y - 46, 104), { s: 2.3, k: 'back', fade: 0.6 }), ...loose(grid(4, 2, x, y, 104), { s: 2.3, k: 'front' })]

/** His beads: two squares of four side by side (any more stand to the right). */
const SLOTS = Array.from({ length: 10 }, (_, k) => ({ x: 760 + Math.floor(k / 4) * 250 + (k % 2) * 92, y: 700 - (Math.floor(k / 2) % 2) * 92 }))
const twos = (n: number) => loose(SLOTS.slice(0, n), { s: 2, k: 'f', from: { x: SUPPLY.x, y: SUPPLY.y } })

const COUNT: Ruler = { x0: 200, x1: 2360, y: 620, from: 1, to: 13 }

export const r20: Spec = {
  rank: 20,
  id: 'r20',
  title: 'Product',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sum: line(['1', '+', '2', '+', '3', '+', '4', '=', '10'], { ...ADD, under: true }), line: line(['1', '×', '2', '×', '3', '×', '4', '=', '?'], { ...TIMES, under: true }) },
      say: 'One plus two plus three plus four is ten. Now multiply them instead. Will that make more than ten, or less than ten?',
      turn: { kind: 'predict', id: 'more', prompt: 'More than ten, or less than ten?', options: [{ label: 'More than ten' }, { label: 'Less than ten' }] },
    },
    { stage: { line: line(['1', '×', '2', '×', '3', '×', '4', '=', '24'], { ...TIMES, under: true }) }, say: 'More: twenty-four. Multiplying grows much faster than adding.' },
    { stage: { sum: line([sigma('4'), 'i', '=', '10'], { y: 240, size: 150 }) }, say: 'Sigma is the short way to write the sum.' },
    { stage: { line: line(['1', '×', '2', '×', '3', '×', '4', '=', '24'], { ...TIMES, under: true, gold: ['×'] }) }, move: 0.5, say: 'We need a sign like it, that multiplies a whole list.' },

    // ── 2. What capital pi does ──
    { act: 2, clear: true, stage: { prod: line([pi('4'), 'i'], MID) }, quiet: 1.4, motif: true, say: 'This sign is capital pi.' },
    { stage: { prod: line([pi('4'), 'i'], { ...MID, gold: ['pi'] }) }, move: 0.5, say: 'Capital pi is the Greek letter P. P is for product: the answer when we multiply.' },
    {
      stage: { sum: line([sigma('4'), 'i', '=', '10'], { x: 520, y: 440, size: 150 }), prod: line([pi('4'), 'i', '=', '24'], { x: 1400, y: 440, size: 150 }) },
      say: 'It works just as sigma does. Under it, where I starts. On top, where I stops. Beside it, what to multiply.',
    },
    {
      stage: { sum: null, prod: line([pi('4'), 'i', '=', '1', '×', '2', '×', '3', '×', '4', '=', '24'], { y: 440, size: 130 }) },
      say: 'We read it: the product of I, as I goes from one to four, equals twenty-four.',
      poster: true,
    },
    {
      stage: { small: line(['π', '≈', '3.14'], { x: 520, y: 440, size: 170, gold: ['π'] }), prod: line([pi('4'), 'i'], { x: 1400, y: 440, size: 170, gold: ['pi'] }) },
      say: 'Do not mix it up with small pi. Small pi is the name of one number. Capital pi is an instruction: multiply.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { prod: line([pi('n'), 'i', '=', 'n', '!'], { y: 330, size: 200 }), four: line([{ big: 'Π', from, to: '4' }, 'i', '=', '4', '!', '=', '24'], { y: 780, size: 130 }) },
      say: 'You have met one product already. Multiply every number from one up to n, and that is n factorial.',
    },
    {
      clear: true,
      stage: { piles: list(), prod: line([pi('3'), 'x', { sub: 'i' }, '=', 'x', { sub: '1' }, '·', 'x', { sub: '2' }, '·', 'x', { sub: '3' }], { y: 240, size: 140 }) },
      say: 'What is multiplied can be a list of numbers: x one times x two times x three.',
    },
    { stage: { prod: line([pi('3'), 'x', { sub: 'i' }, '=', '3', '·', '2', '·', '2', '=', '12'], { y: 240, size: 140 }) }, say: 'Here that is three times two times two: twelve.' },
    {
      clear: true,
      stage: { shape: cube(940, 720), prod: line([pi('3'), '2', '=', '2', '×', '2', '×', '2', '=', '2', { sup: '3' }], { y: 240, size: 140 }) },
      say: 'And when the same number is multiplied each time, the product is a power. Two times two times two is two cubed.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: {
        kind: 'choose',
        id: 'which24',
        prompt: 'Which one is true?',
        cards: [
          [{ big: 'Σ', from, to: '4' }, 'i', '=', '24'],
          [{ big: 'Π', from, to: '4' }, 'i', '=', '24'],
        ],
        right: 1,
      },
    },
    {
      clear: true,
      say: 'The product of two, as I goes from one to three, is two times two times two. Put on that many beads.',
      turn: {
        kind: 'build',
        id: 'twos8',
        prompt: 'Make two times two times two.',
        target: 8,
        max: 10,
        zone: { x: 620, y: 480, w: 820, h: 360 },
        state: (n) => ({
          shape: twos(n),
          prod: line([pi('3'), '2', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: 220, size: 150, gold: n === 8 ? ['='] : [], faint: n === 8 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { prod: line([pi('3'), 'i', '=', '6'], { y: 480, size: 210 }) }, move: 0.6, say: 'The product of I, as I goes from one to three, equals six.', turn: { kind: 'read', id: 'read6', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { axis: numberLine(COUNT, { size: 80 }) }, say: 'Count: one, two, three, four, and on, and on.' },
    { teaser: true, stage: { ask: line(['?'], { x: 1700, y: 380, size: 230, gold: ['?'] }) }, say: 'Is there a last number?', pad: 1 },
  ],
}
