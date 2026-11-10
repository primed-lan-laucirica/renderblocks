/**
 * Rank 7, the raised number: times again and again, written short. The
 * signs on the paper are =, ×, ≠ and the power only. A power is told by
 * what it does (it counts how many of the number are multiplied together),
 * by what it is not (2⁵ is not 2 × 5), and by where it is met: squares and
 * cubes, the powers of ten, and its place before times in a longer line.
 *
 * "Squared" and "cubed" are tied to the shapes the beads make. No names or
 * dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Tok } from '../kit/glyphs'
import { beadAt } from '../kit/measures'
import { grid, line, loose, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const STEP = 60
const ROW = { x: 960 - 7.5 * STEP, y: 760 }
/** Two beads, doubled `times` times: columns of two, each doubling set beside the last, its beads coming out of the ones they copy. */
const doubled = (times: number): Sprite[] => {
  const n = 2 ** (times + 1)
  return Array.from({ length: n }, (_, i) => {
    const at = (j: number) => ({ x: ROW.x + Math.floor(j / 2) * STEP, y: ROW.y + ((j % 2) - 0.5) * STEP })
    return { ...beadAt(`b${i}`, at(i).x, at(i).y, 50), enter: i >= 2 ? { ...at(i - 2 ** Math.floor(Math.log2(i))), o: 1 } : undefined }
  })
}

/** 2 × 2 × … with `n` twos. */
const twos = (n: number): Tok[] => Array.from({ length: n }, (_, i): Tok[] => (i ? ['×', '2'] : ['2'])).flat()
const LONG = { y: TOP, size: 120 }
const SHORT = { y: 440, size: 230 }

/** Eight beads as a cube: a square of four, and another behind it. */
const cube = (x: number, y: number): Sprite[] => {
  const step = 104
  return [
    ...loose(grid(4, 2, x + 46, y - 46, step), { s: 2.3, k: 'back', fade: 0.6 }),
    ...loose(grid(4, 2, x, y, step), { s: 2.3, k: 'front' }),
  ]
}

const TENS: Tok[][] = [
  ['10', { sup: '2' }, '=', '100'],
  ['10', { sup: '3' }, '=', '1,000'],
  ['10', { sup: '6' }, '=', '1,000,000'],
]

/** His rows of three, the first row at the top. */
const rows = (n: number) => loose(Array.from({ length: 3 * n }, (_, i) => ({ x: 960 + ((i % 3) - 1) * 96, y: 420 + Math.floor(i / 3) * 96 })), { s: 2.1, k: 'r', from: { x: SUPPLY.x, y: SUPPLY.y } })

export const r07: Spec = {
  rank: 7,
  id: 'r07',
  title: 'Powers',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { beads: doubled(0), long: line(twos(1), LONG) },
      say: 'Two beads. Times two, times two, times two, times two. Will there be more than twenty?',
      turn: { kind: 'predict', id: 'twenty', prompt: 'Will there be more than twenty?', options: [{ label: 'More than twenty' }, { label: 'Fewer than twenty' }] },
    },
    {
      stage: { beads: doubled(1), long: line(twos(2), LONG) },
      move: 0.6,
      cue: 'bead',
      also: [2, 3, 4].map((k, i) => ({ at: [1.4, 2.9, 4.8][i], move: 0.6, cue: 'bead' as const, stage: { beads: doubled(k), long: line(twos(k + 1), LONG) } })),
      say: 'Times two is four. Times two is eight. Times two is sixteen. Times two is thirty-two.',
    },
    { stage: { long: line([...twos(5), '=', '32'], LONG) }, say: 'More than twenty! Five twos, multiplied together, make thirty-two.' },
    { say: 'That is a lot to write. We need a shorter way.' },

    // ── 2. What the sign does ──
    { act: 2, stage: { short: line(['2', { sup: '5' }, '=', '32'], SHORT) }, quiet: 1.4, motif: true, say: 'This small raised number is called an exponent, or a power.' },
    { say: 'We read it: two to the power of five. It equals thirty-two.', poster: true },
    {
      stage: { short: line(['2', { sup: '5' }, '=', '32'], { ...SHORT, gold: ['pow'] }), long: line([...twos(5), '=', '32'], { ...LONG, gold: ['2'] }) },
      move: 0.5,
      say: 'The power says how many twos to multiply together.',
    },
    { stage: { long: null, short: line(['2', { sup: '5' }, '≠', '2', '×', '5'], { ...SHORT, size: 200 }) }, say: 'It does not mean two times five. That is only ten.' },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { shape: loose(grid(9, 3, 960, 680, 104), { s: 2.3, k: 'q' }), line: line(['3', { sup: '2' }, '=', '3', '×', '3', '=', '9'], { y: 230, size: 150 }) },
      say: 'Three to the power of two is three times three. Nine beads make a square, so we say: three squared.',
    },
    {
      clear: true,
      stage: { shape: cube(940, 700), line: line(['2', { sup: '3' }, '=', '2', '×', '2', '×', '2', '=', '8'], { y: 230, size: 150 }) },
      say: 'Two to the power of three is two times two times two. Eight beads make a cube, so we say: two cubed.',
    },
    {
      clear: true,
      stage: { ten0: line(TENS[0], { y: 260, size: 130 }) },
      also: [1, 2].map((i) => ({ at: [1.2, 2.6][i - 1], stage: { [`ten${i}`]: line(TENS[i], { y: 260 + i * 270, size: 130 }) } })),
      say: 'Powers of ten make big numbers short. Ten to the power of six is one million. The power counts the zeros.',
    },
    {
      clear: true,
      stage: { line: line(['2', '×', '3', { sup: '2' }, '=', '2', '×', '9', '=', '18'], { y: 480, size: 150, gold: ['pow'] }) },
      say: 'In a longer line, powers are done first, before times. Three squared is nine, and two times nine is eighteen.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true8', prompt: 'Which one is true?', cards: [['2', { sup: '3' }, '=', '8'], ['2', { sup: '3' }, '=', '6']], right: 0 },
    },
    {
      clear: true,
      say: 'Make three squared. Put on threes.',
      turn: {
        kind: 'build',
        id: 'square3',
        prompt: 'Make three squared.',
        target: 3,
        max: 5,
        unit: 3,
        zone: { x: 560, y: 330, w: 800, h: 540 },
        state: (n) => ({
          shape: rows(n),
          line: line(['3', { sup: '2' }, '=', { g: n === 0 ? '?' : String(3 * n), k: 'made' }], { y: TOP, gold: n === 3 ? ['='] : [], faint: n === 3 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['10', { sup: '2' }, '=', '100'], { y: 480, size: 210 }) }, move: 0.6, say: 'Ten squared equals one hundred.', turn: { kind: 'read', id: 'read100', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { shape: loose(grid(16, 4, 960, 690, 92), { s: 2, k: 'q' }), line: line(['?', { sup: '2' }, '=', '16'], { y: 230, size: 170 }) }, say: 'Sixteen beads make a square.' },
    { teaser: true, stage: { line: line(['?', { sup: '2' }, '=', '16'], { y: 230, size: 170, gold: ['?'] }) }, move: 0.5, say: 'Which number, squared, makes sixteen?', pad: 1 },
  ],
}
