/**
 * Rank 50, "is distributed as": a single wave between a capital letter and
 * an upright N with two numbers in brackets. The signs on the paper are
 * those of ranks 1–6, the decimal point and percent (rank 9), ≈ (rank 10),
 * letters (rank 12), a raised 2 (rank 7), μ and σ (rank 48), E[ ] and Var
 * (rank 49) and the rank's own wave and N. Totals of many dice pile up in
 * a bell; the bell has a name, the normal distribution, and X ~ N(μ, σ²)
 * says that X's values come from it: μ is where the bell's middle is, σ
 * how wide it is, and what stands in the brackets is σ², the variance.
 * About two thirds of the values lie within one σ of μ, nearly all within
 * three. The wave is not ≈: two waves compare two numbers, one wave says
 * where a number still to be picked comes from. Where it is used: heights
 * of people, errors of measurement, test scores.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { curve, on, type Graph } from '../kit/calculus'
import { bell, ground, label, mark, reach, stacks } from '../kit/chance'
import type { Tok } from '../kit/glyphs'
import { arrow, member, PEN, type Pen } from '../kit/logic'
import { INK } from '../kit/look'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const N: Tok = { op: 'N' }
const SQUARED: Tok = { sup: '2' }
/** X is distributed as N with these two things in its brackets. */
const dist = (...inside: Tok[]): Tok[] => ['X', '~', N, '(', ...inside, ')']
const XN: Tok[] = dist('μ', ',', 'σ', SQUARED)

// ── bells that slide and widen ───────────────────────────────────────────

/**
 * A bell whose middle, spread and area are numbers, so it glides from one
 * bell to the next (a wider one of the same area is lower). It is drawn
 * from `from` to `to` in the graph's numbers, from the left as it comes on.
 */
const tall = (p: Record<string, number>, x: number) => (p.area / p.spread) * Math.exp(-((x - p.mean) ** 2) / (2 * p.spread * p.spread))
function hill(k: string, g: Graph, mean: number, spread: number, area: number, o: { from?: number; to?: number; pen?: Pen } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  const from = o.from ?? 0
  return {
    k,
    type: 'custom',
    n: { mean, spread, area, to: o.to ?? g.w, o: 1 },
    enter: { to: from },
    d: {
      id: `hill ${from} ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const pts = Array.from({ length: 73 }, (_, i) => {
          const x = from + ((p.to - from) * i) / 72
          const at = on(g, x, tall(p, x))
          return `${at.x},${at.y}`
        })
        return <polyline points={pts.join(' ')} fill="none" stroke={colour} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      },
    },
  }
}

/** The part under such a bell that lies within `r` spreads of its middle; it opens out from the middle as it comes on, and r can grow. */
function within(k: string, g: Graph, mean: number, spread: number, area: number, r: number, o: { pen?: Pen } = {}): Sprite {
  const colour = PEN[o.pen ?? 'blue']
  return {
    k,
    type: 'custom',
    n: { mean, spread, area, r, o: 1 },
    enter: { r: 0 },
    d: {
      id: `within ${colour} ${g.x} ${g.y} ${g.ux} ${g.uy}`,
      draw: (p) => {
        const a = p.mean - p.r * p.spread
        const b = p.mean + p.r * p.spread
        const top = Array.from({ length: 41 }, (_, i) => {
          const x = a + ((b - a) * i) / 40
          const at = on(g, x, tall(p, x))
          return `L ${at.x} ${at.y}`
        })
        return <path d={`M ${on(g, a, 0).x} ${g.y} ${top.join(' ')} L ${on(g, b, 0).x} ${g.y} Z`} fill={colour} fillOpacity={0.3} stroke="none" />
      },
    },
  }
}

/** A line of numbers with a tick and a numeral at each of `xs` only (for numbers too far apart to tick one by one). */
function scale(k: string, g: Graph, xs: number[], size = 56): Sprite[] {
  const [from, to] = [xs[0], xs[xs.length - 1]]
  return [
    {
      k,
      type: 'custom',
      n: { x: g.x, y: g.y, o: 1 },
      d: {
        id: `scale ${xs.join(' ')} ${g.ux}`,
        draw: (p) => (
          <g stroke={INK} strokeWidth={5} strokeLinecap="round">
            <line x1={p.x + from * g.ux - 60} y1={p.y} x2={p.x + to * g.ux + 60} y2={p.y} />
            {xs.map((v) => (
              <line key={v} x1={p.x + v * g.ux} y1={p.y - 12} x2={p.x + v * g.ux} y2={p.y + 12} strokeWidth={4} />
            ))}
          </g>
        ),
      },
    },
    ...xs.flatMap((v) => label(`${k}/n${v}`, [String(v)], { x: g.x + v * g.ux, y: g.y + 58 }, { size })),
  ]
}

// ── the pile of totals, and the bell over it ─────────────────────────────

/** Ten dice added up, thirty times over: a bead over each total (rank 49's closing picture). */
const G: Graph = { x: 960 - 35 * 120, y: 800, ux: 120, uy: 100, w: 41, h: 6 }
const TOTALS: [number, number][] = [1, 1, 2, 3, 5, 6, 5, 3, 2, 1, 1].map((n, i) => [30 + i, n])
const pile = (fade = 1): Patch => ({ ground: ground(G, { from: 29, to: 41, xs: [30, 35, 40] }), totals: stacks('total', G, TOTALS, { size: 90, fade }) })
/** The bell that fits the pile: its middle at thirty-five, a little over two wide. */
const FIT = bell(35, 2.2, 6.1)

/** Act 2's bell stands on the same line, with every number written; its area stays the same, so a wider bell is lower. */
const EVERY = Array.from({ length: 13 }, (_, i) => 29 + i)
const AREA = 7.2
const ENDS = { from: 27.7, to: 42.3 }
const peak = (spread: number) => AREA / spread
/** The bell, the dashed mark at its middle with mu written over it, and (if `wide`) a reach of one sigma from the middle with sigma written beside it. */
function normal(mean: number, spread: number, o: { wide?: boolean } = {}): Patch {
  const up = on(G, mean, peak(spread))
  const half = peak(spread) * Math.exp(-0.5)
  const side = on(G, mean + spread + 1.6, half + 0.6)
  return {
    ground: ground(G, { from: 28, to: 42, xs: EVERY, size: 50 }),
    bell: [hill('bell', G, mean, spread, AREA, ENDS)],
    mark: [mark('mark', G, mean, peak(spread))],
    mu: label('mu', ['μ', '=', String(mean)], { x: up.x, y: up.y - 78 }, { size: 88 }),
    reach: o.wide ? [reach('reach', G, mean, mean + spread, half)] : [],
    sigma: o.wide ? label('sigma', ['σ', '=', String(spread)], side, { size: 84 }) : [],
  }
}
/** The share of the values within `r` sigmas of mu, shaded, with the stretch marked along the line. */
const share = (r: number, toks: Tok[]): Patch => ({
  mark: null,
  mu: null,
  sigma: null,
  within: [within('within', G, 35, 2, AREA, r)],
  reach: [reach('reach', G, 35 - 2 * r, 35 + 2 * r, 0)],
  share: label('share', toks, on(G, 35, 1.35), { size: 110 }),
})
const top = (toks: Tok[], gold: string[] = []) => line(toks, { y: 180, size: 140, gold })

// ── where it is used ─────────────────────────────────────────────────────

/** Heights in centimetres, the errors of a measurement, and the scores of a test. */
const HEIGHTS: Graph = { x: 960 - 170 * 30, y: 820, ux: 30, uy: 100, w: 190, h: 5 }
const ERRORS: Graph = { x: 960, y: 820, ux: 200, uy: 100, w: 3, h: 5 }
const SCORES: Graph = { x: 960 - 100 * 12, y: 820, ux: 12, uy: 100, w: 145, h: 5 }
const HIGH = 3.9
const used = (toks: Tok[]) => line(toks, { y: 220, size: 140 })

// ── the closing question: two rows of numbers, paired ────────────────────

const XS = [250, 460, 670, 880, 1090]
const UP_Y = 360
const DOWN_Y = 720
const UP = ['1', '2', '4', '8', '16']
const DOWN = ['0', '1', '2', '3', '4']
const rows = (gold: number[] = []): Patch => ({
  up: UP.map((g, i) => member(`up${i}`, g, { x: XS[i], y: UP_Y }, { size: 110, gold: gold.includes(i) })),
  down: DOWN.map((g, i) => member(`down${i}`, g, { x: XS[i], y: DOWN_Y }, { size: 110, gold: gold.includes(i) })),
  go: XS.map((x, i) => arrow(`go${i}`, { x, y: UP_Y }, { x, y: DOWN_Y }, { gap: 92, pen: gold.includes(i) ? 'gold' : 'ink' })),
})

export const r50: Spec = {
  rank: 50,
  id: 'r50',
  title: 'Is distributed as',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: pile(),
      say: 'Add up ten dice, again and again. The totals pile up like this. Where will most of the next totals fall?',
      turn: { kind: 'predict', id: 'wherenext', prompt: 'Where will most of the next totals fall?', options: [{ label: 'In the middle' }, { label: 'At the ends' }] },
    },
    {
      stage: { curve: [curve('curve', G, FIT, { from: 28.6, to: 41.4 })] },
      say: 'In the middle. The pile is shaped like a bell. The shape has a name: the normal distribution.',
    },
    {
      stage: { ...pile(0.3), ask: line(['X', '=', { g: '?', k: 'ask' }], { x: 1620, y: 300, size: 130, gold: ['ask'] }) },
      say: 'Call the next total X. We need a sign that says: its values pile up in this shape.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(XN, { y: 430, size: 230, gold: ['~'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is read: X is distributed as N, mu, sigma squared. The wave is read: is distributed as.' },
    {
      clear: true,
      stage: { line: top(XN, ['normal']), ground: ground(G, { from: 28, to: 42, xs: EVERY, size: 50 }), bell: [hill('bell', G, 35, 2, AREA, ENDS)] },
      say: 'The upright N is short for normal: the bell. Two numbers in brackets say which bell.',
      poster: true,
    },
    {
      stage: { line: top(XN, ['μ']), ...normal(35, 2) },
      also: [
        { at: 4.4, stage: normal(37, 2) },
        { at: 6.8, stage: normal(35, 2) },
      ],
      say: 'Mu is the middle of the bell: here, thirty-five. Change mu, and the whole bell slides.',
      pad: 1.4,
    },
    {
      stage: { line: top(XN, ['σ']), ...normal(35, 2, { wide: true }) },
      say: 'Sigma, the standard deviation, says how wide the bell is. Here, sigma is two.',
    },
    {
      stage: { line: top(XN), ...share(1, ['68', '%']) },
      say: 'Within one sigma of mu lie sixty-eight percent of the values: about two thirds.',
    },
    {
      stage: share(3, ['99', '.', '7', '%']),
      say: 'Within three sigmas lie nearly all of them.',
    },
    {
      stage: { within: null, share: null, ...normal(35, 3, { wide: true }) },
      say: 'Grow sigma to three: the bell widens, and it sinks.',
    },
    {
      stage: { line: top(dist('35', ',', '9')) },
      say: 'With numbers: N, thirty-five, nine. The nine is sigma squared, the variance.',
    },
    {
      clear: ['line'],
      stage: { mean: line([{ op: 'E' }, '[', 'X', ']', '=', 'μ', '=', '35'], { y: 480, size: 150 }), spread: line(['Var', '(', 'X', ')', '=', 'σ', SQUARED, '=', '9'], { y: 760, size: 150 }) },
      say: 'So the expected value of X is mu. The variance of X is sigma squared.',
    },
    {
      clear: true,
      stage: { near: line(['9', '.', '9', '≈', '10'], { y: 330, size: 190, gold: ['≈'] }), line: line(dist('35', ',', '9'), { y: 700, size: 190, gold: ['~'] }) },
      say: 'Two waves compare two numbers. One wave says where the values of X come from.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { line: used(dist('170', ',', '7', SQUARED)), scale: scale('scale', HEIGHTS, [150, 160, 170, 180, 190]), bell: [hill('bell', HEIGHTS, 170, 7, HIGH * 7, { from: 148, to: 192 })] },
      say: 'The heights of grown people are close to normal: most near the middle, a few far out.',
    },
    {
      clear: true,
      stage: { line: used(dist('0', ',', '1')), ground: ground(ERRORS, { from: -3, to: 3, xs: [-3, -2, -1, 0, 1, 2, 3] }), bell: [hill('bell', ERRORS, 0, 1, HIGH, { from: -3.2, to: 3.2 })] },
      say: 'Measure one thing many times. The small errors are normal too, with their middle at zero.',
    },
    {
      clear: true,
      stage: {
        line: used(dist('100', ',', '15', SQUARED)),
        scale: scale('scale', SCORES, [55, 70, 85, 100, 115, 130, 145]),
        within: [within('within', SCORES, 100, 15, HIGH * 15, 1)],
        bell: [hill('bell', SCORES, 100, 15, HIGH * 15, { from: 52, to: 148 })],
      },
      say: 'Some tests are scored to be normal: mu is one hundred, and sigma is fifteen.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { mu: line(['μ', '=', '3'], { x: 700, y: TOP + 10, size: 140 }), sigma: line(['σ', '=', '2'], { x: 1220, y: TOP + 10, size: 140 }) },
      say: 'Mu is three, and sigma is two. Which one is right?',
      turn: { kind: 'choose', id: 'variance', prompt: 'Which one is right?', cards: [dist('3', ',', '2'), dist('3', ',', '4')], right: 1 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(dist('10', ',', '4'), { y: 480, size: 230 }) }, move: 0.6, say: 'X is distributed as N, ten, four.', turn: { kind: 'read', id: 'readnormal', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: rows(), say: 'Two rows of numbers, paired by arrows.' },
    {
      teaser: true,
      stage: { ...rows([1, 2, 3]), times: line(['2', '×', '4', '=', '8'], { x: 1520, y: UP_Y, size: 120 }), plus: line(['1', '+', '2', '=', '3'], { x: 1520, y: DOWN_Y, size: 120 }) },
      say: 'Up here, two times four is eight. Underneath: one plus two is three. Is that an accident?',
      pad: 1,
    },
  ],
}
