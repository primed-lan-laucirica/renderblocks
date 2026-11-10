/**
 * Rank 48, the mean and the spread: the Greek letters μ and σ. The signs on
 * the paper are those of ranks 1–6, roots (rank 8), letters (rank 12), ±
 * (rank 13), labels set low (rank 14), Σ (rank 19) and the rank's own two.
 * The mean, μ, is the one number that can stand for a whole group: add them
 * all, and share the total among them. It does not say how spread out they
 * are. For that, take each one's distance from μ and square it; the mean of
 * those squares is the variance, σ², and its root is the standard
 * deviation, σ: a usual distance from the mean. μ is the Greek m, for mean;
 * σ is the small form of Σ, the Greek s. Where they are used: wherever many
 * things are measured (plants, the weather, test scores): μ says what is
 * usual, and μ ± σ is where most of them lie.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Graph } from '../kit/calculus'
import { ground, label, mark, reach, stackAt, stacks } from '../kit/chance'
import type { Tok } from '../kit/glyphs'
import { INK } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const MU: Tok = 'μ'
const SIGMA: Tok = 'σ'
const VARIANCE: Tok[] = [SIGMA, { sup: '2' }]
const over = (a: string, b: string): Tok => ({ frac: [a, b] })

/** Eight plants: a bead stands over each one's height. Their mean is five, and their standard deviation is two. */
const G: Graph = { x: 260, y: 760, ux: 150, uy: 110, w: 10, h: 4 }
const PLANTS: [number, number][] = [
  [2, 1],
  [4, 3],
  [5, 2],
  [7, 1],
  [9, 1],
]
const XS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const floor = () => ground(G, { from: 1, to: 10, xs: XS })
const plants = () => stacks('plant', G, PLANTS, { colour: 'green', size: 96 })
/** The mean's mark, with its letter over it. */
const mean = (h = 3.7): Sprite[] => [mark('mean', G, 5, h), ...label('mean/mu', [MU], { x: G.x + 5 * G.ux, y: G.y - h * G.uy - 60 }, { size: 110 })]
/** A numeral on every bead: how far it is from the mean (or that distance squared). */
const onBeads = (squared: boolean): Sprite[] =>
  PLANTS.flatMap(([v, n]) =>
    Array.from({ length: n }, (_, j) => {
      const d = Math.abs(v - 5)
      return label(`far/${v}/${j}`, [String(squared ? d * d : d)], stackAt(G, v, j), { size: 62 })
    }).flat(),
  )
/** One sigma each way from the mean. */
const spread = (h = 3.3): Sprite[] => [
  reach('lo', G, 5, 3, h),
  reach('hi', G, 5, 7, h),
  ...label('lo/s', [SIGMA], { x: G.x + 4 * G.ux, y: G.y - h * G.uy - 62 }, { size: 96 }),
  ...label('hi/s', [SIGMA], { x: G.x + 6 * G.ux, y: G.y - h * G.uy - 62 }, { size: 96 }),
]

/** Another eight, with the same mean: every one of them is just one away from it. */
const CLOSE: [number, number][] = [
  [4, 4],
  [6, 4],
]

/** Two groups side by side, drawn small: the same mean, a different spread. */
const GA: Graph = { x: 60, y: 760, ux: 80, uy: 64, w: 10, h: 4 }
const GB: Graph = { x: 1000, y: 760, ux: 80, uy: 64, w: 10, h: 4 }
const small = (k: string, g: Graph, counts: [number, number][], sigma: number): Sprite[] => [
  ...ground(g, { k: `${k}/ground`, from: 1, to: 10, xs: [1, 5, 10], size: 50 }),
  ...stacks(`${k}/bead`, g, counts, { colour: 'green', size: 54 }),
  mark(`${k}/mean`, g, 5, 4.6),
  reach(`${k}/lo`, g, 5, 5 - sigma, 4.4, { w: 8 }),
  reach(`${k}/hi`, g, 5, 5 + sigma, 4.4, { w: 8 }),
  ...label(`${k}/s`, [SIGMA, '=', String(sigma)], { x: g.x + 5.5 * g.ux, y: 300 }, { size: 120 }),
]

/** A month of noons: the usual one, and how far from usual is still ordinary. */
const W: Graph = { x: 960 - 20 * 110, y: 660, ux: 110, uy: 110, w: 26, h: 3 }

/** His turn: two beads over the four; each bead he adds stands over the six, and the mean slides towards it. */
const B: Graph = { x: 40, y: 740, ux: 140, uy: 104, w: 8, h: 4 }
const ZONE = { x: B.x + 2 * B.ux - 80, y: B.y - 5 * B.uy, w: 6 * B.ux + 160, h: 5 * B.uy + 110 }
const LINE = { x: 1500, y: 430 }
function added(n: number): Patch {
  const total = 8 + 6 * n
  const m = total / (2 + n)
  return {
    ground: ground(B, { from: 2, to: 8, xs: [2, 3, 4, 5, 6, 7, 8] }),
    fours: stacks('four', B, [[4, 2]], { colour: 'green', size: 92 }),
    sixes: Array.from({ length: n }, (_, j) => ({ ...beadAt(`six${j}`, stackAt(B, 6, j).x, stackAt(B, 6, j).y, 92, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
    mean: [mark('mean', B, m, 4.6)],
    line: line([MU, '=', Number.isInteger(m) ? { g: String(m), k: 'whole' } : ({ frac: [String(total), String(2 + n)], k: 'part' } as Tok)], { x: LINE.x, y: LINE.y, size: 170, gold: n === 2 ? ['whole'] : [] }),
  }
}

/** The closing question: a die that has not been rolled yet. */
const die = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'die',
    draw: (p) => (
      <g>
        <rect x={p.x - 130} y={p.y - 130} width={260} height={260} rx={38} fill="#fbf6ea" stroke={INK} strokeWidth={8} />
        {[-66, 66].flatMap((dx) => [-74, 0, 74].map((dy) => <circle key={`${dx} ${dy}`} cx={p.x + dx} cy={p.y + dy} r={23} fill={INK} />))}
      </g>
    ),
  },
})

export const r48: Spec = {
  rank: 48,
  id: 'r48',
  title: 'Mean and spread',
  // The mean's mark stands behind the beads, so the numerals written on them stay clear.
  layers: ['mean', 'a/mean', 'b/mean'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { ground: floor(), plants: plants() },
      say: 'Eight plants were measured. Each bead stands over the height of one plant. What one number could stand for all eight?',
      turn: { kind: 'predict', id: 'standfor', prompt: 'What one number could stand for all eight?', options: [{ label: 'Four' }, { label: 'Five' }] },
    },
    {
      stage: { sum: line(['2', '+', '4', '+', '4', '+', '4', '+', '5', '+', '5', '+', '7', '+', '9', '=', '40'], { y: 150, size: 84 }), share: line(['40', '÷', '8', '=', '5'], { y: 290, size: 110 }) },
      say: 'Five. Add all eight heights: forty. Share forty among the eight: five each.',
    },
    {
      stage: { sum: null, share: line([{ g: '?', k: 'ask' }, '=', '5'], { y: 220, size: 170, gold: ['ask'] }), mean: [mark('mean', G, 5, 3.7)] },
      say: 'That number is called the mean. We need a sign for it.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line([MU], { y: 430, size: 340, gold: ['μ'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is the Greek letter mu. It is the Greek m, for mean.' },
    {
      clear: true,
      stage: { ground: floor(), plants: plants(), mean: mean(), line: line([MU, '=', '5'], { x: 1480, y: 250, size: 170 }) },
      say: 'Mu equals five: the mean of the eight heights.',
      poster: true,
    },
    {
      clear: true,
      stage: { rule: line([MU, '=', over('1', 'n'), { big: 'Σ', from: ['i', '=', '1'], to: 'n' }, 'x', { sub: 'i' }], { y: 400, size: 190 }), ours: line([MU, '=', over('1', '8'), '×', '40', '=', '5'], { y: 790, size: 120 }) },
      say: 'As a rule: add up all n of the numbers, then divide by n.',
    },
    {
      clear: true,
      stage: { ground: floor(), close: stacks('close', G, CLOSE, { colour: 'green', size: 96 }), mean: mean(4.5), line: line([MU, '=', '5'], { x: 1480, y: 250, size: 170 }) },
      say: 'These eight have mean five as well. But they keep much closer to it. Mu cannot tell the two groups apart.',
    },
    {
      clear: ['ground'],
      stage: { plants: plants(), mean: mean(), far: onBeads(false) },
      say: 'How spread out are ours? Write on each bead how far it is from mu.',
    },
    {
      stage: { far: onBeads(true), sum: line(['9', '+', '1', '+', '1', '+', '1', '+', '0', '+', '0', '+', '4', '+', '16', '=', '32'], { x: 1130, y: 120, size: 78 }) },
      say: 'Square each distance, so the far beads count for more. The squares add up to thirty-two.',
    },
    {
      stage: { sum: null, line: line([...VARIANCE, '=', over('32', '8'), '=', '4'], { x: 1460, y: 190, size: 140, gold: ['σ'] }) },
      say: 'Their mean is thirty-two over eight: four. It is called the variance, and written sigma squared.',
    },
    {
      clear: ['ground', 'plants'],
      stage: { mean: [mark('mean', G, 5, 3.3)], spread: spread(), line: line([SIGMA, '=', { root: ['4'] }, '=', '2'], { x: 1380, y: 170, size: 140, gold: ['σ'] }) },
      say: 'Its square root is sigma, the standard deviation. Sigma equals two: a usual distance from the mean.',
    },
    {
      clear: true,
      stage: { big: line([{ big: 'Σ' }], { x: 720, y: 440, size: 250 }), small: line([SIGMA], { x: 1200, y: 440, size: 340, gold: ['σ'] }) },
      say: 'Sigma is the Greek s. The capital one stood for sum. The small one stands for standard.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { a: small('a', GA, CLOSE, 1), b: small('b', GB, PLANTS, 2) },
      say: 'Mu and sigma are used wherever many things are measured. Two groups, the same mean: sigma tells them apart.',
    },
    {
      clear: true,
      stage: { ground: floor(), plants: plants(), mean: [mark('mean', G, 5, 3.3)], spread: [reach('lo', G, 5, 3, 3.3), reach('hi', G, 5, 7, 3.3)], line: line([MU, '±', SIGMA, '=', '5', '±', '2'], { y: 200, size: 150 }) },
      say: 'Mu plus or minus sigma: from three to seven. Most of the beads lie in there.',
    },
    {
      clear: true,
      stage: { ground: ground(W, { from: 15, to: 25, xs: [17, 20, 23], size: 80 }), mean: [mark('mean', W, 20, 1.6)], spread: [reach('lo', W, 20, 17, 1.2), reach('hi', W, 20, 23, 1.2)], mu: line([MU, '=', '20'], { x: 620, y: 240, size: 150 }), sigma: line([SIGMA, '=', '3'], { x: 1300, y: 240, size: 150 }) },
      say: 'The weather: in summer the mean is twenty degrees, and sigma is three. Seventeen to twenty-three is an ordinary day.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(['1', ',', '2', ',', '6'], { y: TOP + 10, size: 170 }) },
      say: 'Three numbers: one, two and six. Which one is right?',
      turn: { kind: 'choose', id: 'meanthree', prompt: 'Which one is right?', cards: [[MU, '=', '2'], [MU, '=', '3']], right: 1 },
    },
    {
      clear: true,
      say: 'Two beads stand over the four. Add beads over the six until the mean is five.',
      turn: { kind: 'build', id: 'meanfive', prompt: 'Add beads over the six until the mean is five.', target: 2, max: 4, zone: ZONE, state: added },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...VARIANCE, '=', '9'], { y: 480, size: 280 }) }, move: 0.6, say: 'Sigma squared equals nine.', turn: { kind: 'read', id: 'readvariance', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { die: [die('die', 620, 500)], rolls: line(['3', ',', '6', ',', '1', ',', '4', ',', '…'], { x: 1320, y: 500, size: 130 }) },
      say: 'Now take a die. Roll it many times, and write down each number.',
    },
    { teaser: true, stage: { ask: line([MU, '=', { g: '?', k: 'ask' }], { x: 1320, y: 760, size: 190, gold: ['ask'] }) }, say: 'What will the mean of the rolls come close to?', pad: 1 },
  ],
}
