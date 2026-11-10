/**
 * Rank 22, ∝ : two amounts that move in step. The signs on the paper are
 * the numerals, the letters x and y, =, +, the fraction bar, π, ∞ (to tell
 * it from) and ∝. Double one amount and the other doubles; halve it and
 * the other halves. The test is a division: y over x is always the same
 * number. Where it is used: prices, distance at a steady speed, the
 * distance round a circle; and where it is not: y = x + 2.
 *
 * The one tie between signs: ∝ is not ∞, which is closed. No names or
 * dates are narrated.
 */
import type { Tok } from '../kit/glyphs'
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { piles } from '../kit/algebra'
import { GOLD, INK, WOOD_DARK } from '../kit/look'
import { hop, numberLine, onLine, type Ruler } from '../kit/measures'
import { line, loose, words, type Sprite } from '../kit/sprites'

/** A price: a number of apples, the apples, the number of coins they cost, the coins. */
const COL = { x: 200, apples: 340, y: 860, coins: 1010 }
const ROWS = [330, 500, 670]
const apple = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'apple',
    draw: (p) => (
      <g>
        <path d={`M ${p.x} ${p.y - 34} q 4 -24 22 -30`} stroke={WOOD_DARK} strokeWidth={7} strokeLinecap="round" fill="none" />
        <circle cx={p.x} cy={p.y} r={42} fill="#c8473a" stroke="#8f2d24" strokeWidth={5} />
      </g>
    ),
  },
})
const price = (apples: number, coins: number, y: number, o: { ask?: boolean; gold?: boolean; from?: boolean } = {}): Sprite[] => {
  const cost = o.ask ? '?' : String(coins)
  return [
    ...line([String(apples)], { x: COL.x, y, size: 110, gold: o.gold ? [String(apples)] : [] }).map((s) => ({ ...s, k: 'x' })),
    ...Array.from({ length: apples }, (_, i) => apple(`a${i}`, COL.apples + i * 110, y)),
    ...line([cost], { x: COL.y, y, size: 110, gold: o.gold ? [cost] : [] }).map((s) => ({ ...s, k: 'y' })),
    ...loose(
      Array.from({ length: o.ask ? 0 : coins }, (_, i) => ({ x: COL.coins + i * 74, y })),
      { s: 1.6, k: 'c', from: o.from ? { x: SUPPLY.x, y: SUPPLY.y } : undefined },
    ),
  ]
}
const prices = (o: { ask?: boolean; gold?: boolean } = {}) => ({ one: price(1, 2, ROWS[0], { gold: o.gold }), two: price(2, 4, ROWS[1], { gold: o.gold }), four: price(4, 8, ROWS[2], o) })
/** The columns' names: x over the apples, y over the coins. */
const heads = (y: number, gold = false): Sprite[] => [...line(['x'], { x: COL.x, y, size: 120, gold: gold ? ['x'] : [] }).map((s) => ({ ...s, k: 'hx' })), ...line(['y'], { x: COL.y, y, size: 120, gold: gold ? ['y'] : [] }).map((s) => ({ ...s, k: 'hy' }))]

const PROP: Tok[] = ['y', '∝', 'x']

/** The same prices as numbers only: a row for x and a row for y. */
const AT = [330, 560, 760, 960]
const table = () => ({ xs: line(['x', '1', '2', '4'], { y: 240, size: 130, at: AT }), ys: line(['y', '2', '4', '8'], { y: 420, size: 130, at: AT }) })
const over = (a: string, b: string): Tok => ({ frac: [a, b] })

/** Two amounts side by side, as piles with what each is under it. */
const pair = (k: string, x: number, xv: number, yv: number) => piles([xv, yv], { k, x, y: 740, step: 280, colour: (i) => (i === 0 ? 'blue' : undefined), label: (i) => [i === 0 ? 'x' : 'y', '=', String(i === 0 ? xv : yv)], labelSize: 76 })

const ROAD: Ruler = { x0: 360, x1: 1560, y: 560, from: 0, to: 6 }

/** A circle with the distance across it drawn and named. */
const ring = (k: string, x: number, y: number, r: number, label: Tok[]): Sprite[] => [
  {
    k,
    type: 'custom',
    n: { x, y, o: 1 },
    d: {
      id: `ring ${r}`,
      draw: (p) => (
        <g>
          <circle cx={p.x} cy={p.y} r={r} fill="#fbf6ea" stroke={INK} strokeWidth={8} />
          <line x1={p.x - r} y1={p.y} x2={p.x + r} y2={p.y} stroke={GOLD} strokeWidth={9} strokeLinecap="round" />
        </g>
      ),
    },
  },
  ...line(label, { x, y: y - 54, size: 76 }).map((s) => ({ ...s, k: `${k}/${s.k}` })),
]
const rings = () => [...ring('small', 290, 600, 95, ['d']), ...ring('big', 700, 600, 190, ['2', 'd'])]

export const r22: Spec = {
  rank: 22,
  id: 'r22',
  title: 'Proportional',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: prices({ ask: true }),
      say: 'One apple costs two coins. Two apples cost four coins. How many coins for four apples?',
      turn: { kind: 'predict', id: 'four', prompt: 'How many coins for four apples?', options: [{ label: 'Six' }, { label: 'Eight' }] },
    },
    { stage: prices(), say: 'Eight. Double the apples, and the coins double too.' },
    { say: 'Halve the apples, and the coins halve. The two amounts move in step.' },
    { stage: prices({ gold: true }), move: 0.5, say: 'We need a way to write that.' },

    // ── 2. What the sign says ──
    { act: 2, stage: { ...prices(), heads: heads(170, true) }, say: 'Call the number of apples x, and the number of coins y.' },
    { clear: true, stage: { sign: line(PROP, { y: 470, size: 300 }) }, quiet: 1.4, motif: true, say: 'This sign means: is proportional to.' },
    { stage: { sign: line(PROP, { y: 470, size: 300, gold: ['∝'] }) }, move: 0.5, say: 'We read it: Y is proportional to X.', poster: true },
    {
      clear: true,
      stage: { sign: line(['∝'], { x: 560, y: 470, size: 420, gold: ['∝'] }), loop: line(['∞'], { x: 1360, y: 470, size: 420 }) },
      say: 'Do not mix it up with infinity. Infinity is a closed loop. This sign is open at one end.',
    },
    { clear: true, stage: { ...table(), sign: line(PROP, { x: 1460, y: 330, size: 190 }) }, say: 'It says: when x doubles, y doubles. When x halves, y halves.' },
    {
      stage: { test: line([over('y', 'x'), '=', over('2', '1'), '=', over('4', '2'), '=', over('8', '4'), '=', '2'], { y: 730, size: 130 }) },
      say: 'Here is the test. Divide y by x. If the answer is always the same number, y is proportional to x.',
    },
    {
      clear: true,
      stage: { rule: line(['y', '=', '2', 'x'], { x: 540, y: 470, size: 230 }), sign: line(PROP, { x: 1380, y: 470, size: 230 }) },
      say: 'Here, y is always two times x. The equals sign says exactly how much. The proportional sign says only that they move in step.',
    },

    // ── 3. Where it is used, and where it is not ──
    { act: 3, clear: true, stage: { rule: line(['y', '=', 'x', '+', '2'], { y: 200, size: 170 }), a: pair('a', 560, 1, 3) }, say: 'Not everything moves in step. Here, y is x plus two.' },
    { stage: { b: pair('b', 1360, 2, 4) }, say: 'Double x, from one to two. But Y goes only from three to four. So Y is not proportional to X.' },
    {
      clear: true,
      stage: {
        axis: numberLine(ROAD, { size: 64 }),
        hops: [hop('h1', ROAD, 0, 2, { h: 70 }), hop('h2', ROAD, 2, 4, { h: 70 })],
        times: [...words('1 hour', { x: onLine(ROAD, 2), y: ROAD.y + 200, size: 70, k: 'w1' }), ...words('2 hours', { x: onLine(ROAD, 4), y: ROAD.y + 200, size: 70, k: 'w2' })],
      },
      move: 1.6,
      say: 'At a steady speed, distance is proportional to time: twice as long, twice as far.',
    },
    { clear: true, stage: { rings: rings(), sign: line(['C', '∝', 'd'], { x: 1420, y: 440, size: 210 }) }, say: 'For a circle, double the distance across, and the distance round doubles.' },
    { stage: { rule: line(['C', '=', 'π', 'd'], { x: 1420, y: 740, size: 170, gold: ['π'] }) }, say: 'The distance round is proportional to the distance across. The number that links them is pi.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'In which one is Y proportional to X?',
      turn: { kind: 'choose', id: 'which', prompt: 'In which one is y proportional to x?', cards: [['y', '=', '3', 'x'], ['y', '=', 'x', '+', '3']], right: 0 },
    },
    {
      clear: true,
      say: 'Here, Y is proportional to X. When x is two, y is four. Now x is four. Put on the coins for y.',
      turn: {
        kind: 'build',
        id: 'coins8',
        prompt: 'Put on the coins for four apples.',
        target: 4,
        max: 6,
        unit: 2,
        zone: { x: 940, y: 500, w: 960, h: 300 },
        state: (n) => ({
          heads: heads(210),
          two: price(2, 4, 400),
          four: [...price(4, 2 * n, 640, { from: true, ask: n === 0 }).filter((s) => s.k !== 'y'), ...line([{ g: n === 0 ? '?' : String(2 * n), k: 'made' }], { x: COL.y, y: 640, size: 110 })],
          sign: line(PROP, { x: 1480, y: 200, size: 170, gold: n === 4 ? ['∝'] : [], faint: n === 4 ? [] : ['∝'] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['C', '∝', 'd'], { y: 480, size: 260 }) }, move: 0.6, say: 'C is proportional to D.', turn: { kind: 'read', id: 'readcd', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: {
        yes: line(['3', '<', '5'], { x: 560, y: 400, size: 230 }),
        no: line(['5', '<', '3'], { x: 1360, y: 400, size: 230 }),
        said: [...words('true', { x: 560, y: 640, size: 120, colour: '#2f7d3b', k: 'true' }), ...words('false', { x: 1360, y: 640, size: 120, colour: '#b53a2e', k: 'false' })],
      },
      say: 'Three is less than five: true. Five is less than three: false.',
    },
    { teaser: true, stage: { ask: line(['?'], { y: 840, size: 200, gold: ['?'] }) }, say: 'Can we do sums with true and false?', pad: 1 },
  ],
}
