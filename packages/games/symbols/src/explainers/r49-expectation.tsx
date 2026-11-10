/**
 * Rank 49, expectation: an upright E with square brackets after it, and
 * Var with round ones. The signs on the paper are those of ranks 1–6, the
 * decimal point (rank 9), letters (rank 12), f(x) (rank 15), Σ (rank 19),
 * ∈ and set brackets (ranks 26 and 27), ∫ (rank 39), P (rank 47), μ and σ
 * (rank 48) and the rank's own four. X, a capital, is a number chance has
 * not picked yet (the number a die will show). E[X] is its expected value:
 * each value times its probability, added; it is where the bars of
 * probability balance. The brackets are square because what is inside is
 * not one number but a number still to be picked. μ and σ² of rank 48 were
 * for numbers already measured; E and Var are for numbers still to come:
 * μ = E[X], Var(X) = E[(X − μ)²] = σ². When X can be any number on a line,
 * the sum becomes an integral. Where it is used: what a game is worth, the
 * long run of many tries, the price of insurance.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Graph } from '../kit/calculus'
import { bars, ground, label, mark, stacks } from '../kit/chance'
import type { Tok } from '../kit/glyphs'
import { INK } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const P: Tok = { op: 'P' }
const E: Tok = { op: 'E' }
const EX: Tok[] = [E, '[', 'X', ']']
const VAR: Tok[] = ['Var', '(', 'X', ')']
const over = (a: string, b: string): Tok => ({ frac: [a, b] })
const HALF: Tok[] = ['3', '.', '5']
/** Each value times its probability, added. */
const SUM: Tok[] = [...EX, '=', { big: 'Σ', from: 'x' }, 'x', P, '(', 'X', '=', 'x', ')']
const ASK: Tok = { g: '?', k: 'ask' }

/** A die's face showing n (none for a die not yet rolled), its middle at (x, y). */
const PIPS: Record<number, [number, number][]> = {
  0: [],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
}
const face = (k: string, x: number, y: number, n: 0 | 3 | 5 | 6, s = 1): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, s, o: 1 },
  d: {
    id: `face ${n}`,
    draw: (p) => (
      <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
        <rect x={-105} y={-105} width={210} height={210} rx={30} fill="#fbf6ea" stroke={INK} strokeWidth={7} />
        {PIPS[n].map(([dx, dy]) => (
          <circle key={`${dx} ${dy}`} cx={dx * 56} cy={dy * 56} r={19} fill={INK} />
        ))}
      </g>
    ),
  },
})
const coin = (k: string, x: number, y: number, s = 1): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, s, o: 1 },
  d: {
    id: 'coin',
    draw: (p) => (
      <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`} stroke="#a7771a" strokeWidth={7}>
        <circle r={110} fill="#e0a82e" />
        <circle r={84} fill="none" strokeWidth={4} />
      </g>
    ),
  },
})

/** Where the lines beside a picture stand. */
const SIDE = { x: 1500 }
const SIX = [1, 2, 3, 4, 5, 6]

/** Twenty-four rolls, a bead for each: they add up to eighty-four, so their mean is three and a half. */
const GS: Graph = { x: 150, y: 820, ux: 150, uy: 100, w: 7, h: 6 }
const ROLLS: [number, number][] = [
  [1, 4],
  [2, 5],
  [3, 3],
  [4, 4],
  [5, 3],
  [6, 5],
]

/** How likely each number is: six bars of one sixth. */
const GB: Graph = { x: 150, y: 860, ux: 150, uy: 1800, w: 7, h: 0.25 }
const SIXTHS: [number, number][] = SIX.map((v) => [v, 1 / 6])
const likely = (gold: number[] = []): Patch => ({ ground: ground(GB, { from: 1, to: 6, xs: SIX }), bars: bars('bar', GB, SIXTHS, { gold }) })

/** His turn: heads wins every bead in the prize, so each bead he adds makes the game worth half a bead more. */
const PRIZE = { x: 480, y: 700, size: 84 }
const ZONE = { x: PRIZE.x - 360, y: PRIZE.y - 150, w: 720, h: 300 }
const halves = (n: number): string[] => (n % 2 ? [String((n - 1) / 2), '.', '5'] : [String(n / 2)])
function staked(n: number): Patch {
  return {
    coin: [coin('coin', PRIZE.x, 360)],
    prize: row(n, PRIZE.x, PRIZE.y, PRIZE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PRIZE.size), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
    line: line([...EX, '=', String(n), '×', over('1', '2'), '=', ...halves(n).map((g, i): Tok => ({ g, k: `worth${i}` }))], { x: SIDE.x - 150, y: 430, size: 104, gold: n === 4 ? ['worth0'] : [] }),
  }
}

/** The closing question: ten dice added up, again and again; a bead over each total. */
const GT: Graph = { x: 960 - 35 * 120, y: 840, ux: 120, uy: 100, w: 41, h: 6 }
const TOTALS: [number, number][] = [1, 1, 2, 3, 5, 6, 5, 3, 2, 1, 1].map((n, i) => [30 + i, n])

export const r49: Spec = {
  rank: 49,
  id: 'r49',
  title: 'Expectation',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { die: [face('die', 960, 480, 6, 1.7)] },
      say: 'Roll a die many times. What will the mean of the rolls come close to?',
      turn: { kind: 'predict', id: 'diemean', prompt: 'What will the mean of the rolls come close to?', options: [{ label: 'Three' }, { label: 'Three and a half' }] },
    },
    {
      clear: true,
      stage: { ground: ground(GS, { from: 1, to: 6, xs: SIX }), rolls: stacks('roll', GS, ROLLS, { size: 88 }), mean: [mark('mean', GS, 3.5, 5.7)], line: line(HALF, { x: SIDE.x, y: 430, size: 230 }) },
      say: 'Three and a half. Here are twenty-four rolls: their mean is three point five.',
    },
    {
      stage: { line: line([ASK, '=', ...HALF], { x: SIDE.x, y: 430, size: 180, gold: ['ask'] }) },
      say: 'But what of rolls still to come? Their mean needs a sign.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(EX, { y: 430, size: 320, gold: ['expect'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is read: the expected value of X. For short: E of X.' },
    {
      clear: true,
      stage: { die: [face('die', 380, 500, 0, 1.5), ...label('die/ask', [ASK], { x: 380, y: 500 }, { size: 210, gold: ['ask'] })], line: line(['X', '∈', '{', '1', ',', '2', ',', '3', ',', '4', ',', '5', ',', '6', '}'], { x: 1260, y: 500, size: 104 }) },
      say: 'X is a capital: the number the die will show. Chance has not picked it yet.',
    },
    {
      clear: true,
      stage: { ...likely([3]), top: line([P, '(', 'X', '=', '3', ')', '=', over('1', '6')], { y: 240, size: 140 }) },
      say: 'Each value has a probability: here, one sixth each.',
    },
    {
      stage: { ...likely(), top: line(SUM, { y: 240, size: 130, gold: ['expect'] }) },
      say: 'Take each value times its probability, and add them up.',
    },
    {
      stage: { top: line(SUM, { y: 240, size: 130 }), mean: [mark('mean', GB, 3.5, 0.2)], side: line([...EX, '=', over('21', '6'), '=', ...HALF], { x: SIDE.x + 20, y: 620, size: 96 }) },
      say: 'One sixth of one, plus one sixth of two, up to six: three and a half, where the bars balance.',
      poster: true,
    },
    {
      clear: true,
      stage: { line: line(EX, { y: 430, size: 320, gold: ['[', ']'] }) },
      say: 'The brackets are square: what is inside is not one number, but a number still to be picked.',
    },
    {
      clear: true,
      stage: { mean: line(['μ', '=', ...EX], { y: 330, size: 190 }) },
      say: 'Mu was the mean of numbers already measured. For numbers still to come, it is the expected value.',
    },
    {
      stage: { spread: line([...VAR, '=', E, '[', '(', 'X', '−', 'μ', ')', { sup: '2' }, ']', '=', 'σ', { sup: '2' }], { y: 680, size: 130, gold: ['Var'] }) },
      say: 'And the variance of X is the expected squared distance from mu: sigma squared.',
    },
    {
      clear: true,
      stage: { sum: line(SUM, { y: 330, size: 130 }), int: line([...EX, '=', { big: '∫', k: 'int' }, 'x', { fn: 'f' }, '(', 'x', ')', { d: 'x' }], { y: 700, size: 130, gold: ['int'] }) },
      say: 'When X can be any number on a line, the sum becomes an integral.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { die: [face('die', 480, 360, 6)], prize: row(6, 480, 620, 96).map((pt, j) => beadAt(`p${j}`, pt.x, pt.y, 84)) },
      also: [{ at: 5.4, stage: { line: line([...EX, '=', '6', '×', over('1', '6'), '=', '1'], { x: SIDE.x - 100, y: 480, size: 110 }) } }],
      say: 'What is a game worth? A six wins six beads; anything else, nothing. The expected value is one bead: a fair price.',
    },
    {
      clear: true,
      stage: { die: [face('die', 960, 300, 3, 0.9)], line: line(['100', '×', ...EX, '=', '350'], { y: 640, size: 190 }) },
      say: 'The long run: a hundred rolls should add up to about three hundred and fifty.',
    },
    {
      clear: true,
      stage: { line: line([...EX, '=', '1000', '×', over('1', '100'), '=', '10'], { y: 470, size: 150 }) },
      say: 'Insurance: a small chance of a big loss. Its expected value sets the price.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { tails: line([P, '(', 'X', '=', '0', ')', '=', over('1', '2')], { x: 520, y: TOP, size: 104 }), heads: line([P, '(', 'X', '=', '1', ')', '=', over('1', '2')], { x: 1400, y: TOP, size: 104 }) },
      say: 'A coin: tails counts zero, heads counts one. Which is the expected value?',
      turn: { kind: 'choose', id: 'coinhalf', prompt: 'Which is the expected value?', cards: [[...EX, '=', '1'], [...EX, '=', over('1', '2')]], right: 1 },
    },
    {
      clear: true,
      say: 'A coin game: heads wins the whole prize. Make the game worth two beads a go.',
      turn: { kind: 'build', id: 'worthtwo', prompt: 'Add beads until the game is worth two beads a go.', target: 4, max: 6, zone: ZONE, state: staked },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...EX, '=', 'μ'], { y: 480, size: 260 }) }, move: 0.6, say: 'The expected value of X equals mu.', turn: { kind: 'read', id: 'readexpect', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { ground: ground(GT, { from: 29, to: 41, xs: [30, 35, 40] }), totals: stacks('total', GT, TOTALS, { size: 90 }) },
      say: 'Add up ten dice, again and again. The totals pile up like this.',
    },
    { teaser: true, stage: { ask: line([ASK], { x: 1620, y: 300, size: 240, gold: ['ask'] }) }, say: 'Does this shape have a name?', pad: 1 },
  ],
}
