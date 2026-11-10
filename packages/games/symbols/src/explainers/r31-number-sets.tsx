/**
 * Rank 31, the number systems: ℕ ℤ ℚ ℝ ℂ. The signs on the paper are
 * those of earlier ranks and the five themselves. Each is a set of
 * numbers that is used so often it has a sign of its own, a capital
 * letter with one stroke doubled (the doubled stroke says: a whole set of
 * numbers, not one number). They are drawn as loops, each inside the
 * next: taking away needs ℤ, dividing needs ℚ, the number line needs ℝ,
 * and ℂ (which comes much later) reaches off the line. Where they are
 * used: to say what kind of number a thing is (−2 ∈ ℤ), what a letter may
 * be (n ∈ ℕ), and which numbers a rule is about (∀ x ∈ ℝ).
 *
 * ℕ here is the counting numbers from one; zero comes in with ℤ.
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { loop, member, type Loop } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'
import { board, placed, type Board } from './r32-pairs'

/** The five sets, smallest first: each loop lies inside the next, its sign and a few of its numbers in the part that is new. */
const Y = 650
const SETS: { g: string; l: Loop; sign: Pt; in: { tok: Tok; at: Pt; size?: number }[] }[] = [
  {
    g: 'ℕ',
    l: { x: 480, y: Y, rx: 240, ry: 150 },
    sign: { x: 480, y: Y - 62 },
    in: [
      { tok: '1', at: { x: 366, y: Y + 58 } },
      { tok: '2', at: { x: 446, y: Y + 58 } },
      { tok: '3', at: { x: 526, y: Y + 58 } },
      { tok: '…', at: { x: 612, y: Y + 58 } },
    ],
  },
  {
    g: 'ℤ',
    l: { x: 597.5, y: Y, rx: 402.5, ry: 205 },
    sign: { x: 850, y: Y - 80 },
    in: [
      { tok: '0', at: { x: 800, y: Y + 14 } },
      { tok: '−1', at: { x: 900, y: Y + 34 } },
      { tok: '−2', at: { x: 836, y: Y + 108 } },
    ],
  },
  {
    g: 'ℚ',
    l: { x: 715, y: Y, rx: 565, ry: 260 },
    sign: { x: 1130, y: Y - 100 },
    in: [
      { tok: { frac: ['1', '2'] }, at: { x: 1066, y: Y }, size: 84 },
      { tok: '2.5', at: { x: 1152, y: Y + 88 } },
    ],
  },
  {
    g: 'ℝ',
    l: { x: 832.5, y: Y, rx: 727.5, ry: 315 },
    sign: { x: 1400, y: Y - 110 },
    in: [
      { tok: { root: '2' }, at: { x: 1396, y: Y + 10 } },
      { tok: 'π', at: { x: 1430, y: Y + 112 } },
    ],
  },
  { g: 'ℂ', l: { x: 960, y: Y, rx: 900, ry: 370 }, sign: { x: 1712, y: Y - 96 }, in: [] },
]

/**
 * The loops as far as set `upTo` (0 is ℕ alone), each its own actor so
 * that `LAYERS` can keep the biggest underneath.
 * `named` leaves the signs off (before they are met); `gold` picks out one
 * set's sign, `find` one of its numbers ([set, which]); `half` shows one
 * half waiting where the fractions will be.
 */
function nested(upTo: number, o: { named?: boolean; gold?: number; find?: [number, number]; half?: boolean | 'gold' } = {}): Patch {
  const shown = SETS.slice(0, upTo + 1)
  const numbers: Sprite[] = shown.flatMap((s, i) => s.in.map((m, j) => member(`m${i}_${j}`, m.tok, m.at, { size: m.size ?? 68, gold: o.find?.[0] === i && o.find[1] === j })))
  if (o.half && upTo < 2) numbers.push(member('m2_0', SETS[2].in[0].tok, SETS[2].in[0].at, { size: 84, gold: o.half === 'gold' }))
  return {
    ...Object.fromEntries(shown.map((s, i) => [`set${i}`, loop('loop', s.l)])),
    signs: o.named === false ? [] : shown.map((s, i) => member(`sign${i}`, s.g, s.sign, { size: 100, gold: o.gold === i })),
    numbers,
  }
}

/** The line over the loops. */
const over = (toks: Tok[], o: { gold?: string[]; size?: number; x?: number } = {}) => line(toks, { x: o.x ?? 960, y: 150, size: o.size ?? 150, gold: o.gold })
const LAYERS = ['set4', 'set3', 'set2', 'set1', 'set0']
const CHAIN: Tok[] = ['ℕ', '⊂', 'ℤ', '⊂', 'ℚ', '⊂', 'ℝ', '⊂', 'ℂ']

/** The board of the closing question. */
const GRID: Board = { x: 330, y: 760, step: 170, cols: 4, rows: 3 }

export const r31: Spec = {
  rank: 31,
  id: 'r31',
  title: 'The number systems',
  layers: LAYERS,
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: nested(0, { named: false, half: true }),
      say: 'Here is the set of counting numbers: one, two, three, and on without end. Is one half in this set?',
      turn: { kind: 'predict', id: 'half', prompt: 'Is one half in this set?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { stage: nested(0, { named: false, half: 'gold' }), move: 0.5, say: 'No. One half is a number, but it is not a counting number.' },
    { stage: nested(0, { named: false, half: true }), move: 0.5, say: 'There are bigger sets of numbers, and each one has a sign of its own.' },

    // ── 2. What the signs are ──
    {
      act: 2,
      stage: { ...nested(0, { gold: 0, half: true }), line: over(['ℕ'], { gold: ['ℕ'], size: 190 }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'The counting numbers are called the natural numbers. Their sign is a capital N with one stroke doubled.',
    },
    {
      stage: { ...nested(0, { find: [0, 2], half: true }), line: over(['3', '∈', 'ℕ']) },
      say: 'The doubled stroke says: a set of numbers, not one number.',
    },
    {
      stage: { ...nested(1, { gold: 1, half: true }), line: over(['ℤ'], { gold: ['ℤ'], size: 190 }) },
      quiet: 0.7,
      motif: true,
      say: 'Taking away needs zero and the numbers below it. These are the integers: Z, from a German word for number.',
    },
    {
      stage: { ...nested(2, { gold: 2 }), line: over(['ℚ'], { gold: ['ℚ'], size: 190 }) },
      quiet: 0.7,
      motif: true,
      say: 'Dividing needs fractions. These are the rational numbers: Q, for quotient.',
    },
    {
      stage: { ...nested(3, { gold: 3 }), line: over(['ℝ'], { gold: ['ℝ'], size: 190 }) },
      quiet: 0.7,
      motif: true,
      say: 'The root of two is no fraction, yet it has a place on the number line. Every place on the line is a real number: R.',
    },
    {
      stage: { ...nested(4, { gold: 4 }), line: over(['ℂ'], { gold: ['ℂ'], size: 190 }) },
      quiet: 0.7,
      motif: true,
      say: 'Some numbers lie off the line altogether: the complex numbers, C. They come much later.',
    },
    { stage: { ...nested(4), line: over(CHAIN, { size: 130, gold: ['⊂'] }) }, say: 'Each set is a subset of the next.', poster: true },

    // ── 3. Where they are used ──
    {
      act: 3,
      stage: { ...nested(4, { find: [1, 2] }), line: over(['−2', '∈', 'ℤ'], { x: 560, size: 130 }), not: over(['−2', '∉', 'ℕ'], { x: 1360, size: 130 }) },
      say: 'The signs say what kind of number we have. Minus two is an integer, but not a natural number.',
    },
    {
      stage: { ...nested(4, { find: [3, 0] }), line: over([{ root: '2' }, '∈', 'ℝ'], { x: 560, size: 130 }), not: over([{ root: '2' }, '∉', 'ℚ'], { x: 1360, size: 130 }) },
      say: 'The root of two is real, but not rational.',
    },
    {
      clear: true,
      stage: { line: line(['n', '∈', 'ℕ'], { y: 380, size: 230 }), list: line(['n', '=', '1', ',', '2', ',', '3', ',', '…'], { y: 720, size: 150 }) },
      say: 'They also say what a letter may be. Here, n is a natural number: one, or two, or three, and so on.',
    },
    {
      clear: true,
      stage: { line: line(['∀', 'x', '∈', 'ℝ', '(', 'x', { sup: '2' }, '≥', '0', ')'], { y: 480, size: 170 }) },
      say: 'And one line can speak about a whole set. For every real number x, x squared is at least zero.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { chain: line(CHAIN, { y: TOP, size: 110 }) },
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'minus5', prompt: 'Which one is true?', cards: [['−5', '∈', 'ℕ'], ['−5', '∈', 'ℤ']], right: 1 },
    },
    {
      clear: ['chain'],
      say: 'One half is an element of which set? Put in the sign that makes the line true.',
      turn: { kind: 'place', id: 'halfset', prompt: 'Which set is one half in?', toks: [{ frac: ['1', '2'] }, '∈', '_'], tiles: ['ℤ', 'ℚ'], right: 'ℚ', y: 520, size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['7', '∈', 'ℕ'], { y: 480, size: 250 }) }, move: 0.6, say: 'Seven is an element of N: a natural number.', turn: { kind: 'read', id: 'read7', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { board: board('board', GRID), gold: placed('gold', GRID, 3, 2) }, say: 'A place on a grid needs two numbers: three across, and two up.' },
    { teaser: true, stage: { ask: line(['(', '3', ',', '2', ')', '∈', '?'], { x: 1420, y: 520, size: 150, gold: ['?'] }) }, move: 0.5, say: 'What is the set of all such pairs?', pad: 1 },
  ],
}
