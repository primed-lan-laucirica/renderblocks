/**
 * Rank 37, limits: where something is heading. The signs on the paper are
 * the numerals, letters, fractions, the arrow (rank 24, read here "goes
 * to" or "approaches"), infinity (rank 21), sigma (rank 19), delta (rank
 * 36) and "lim" itself. One over n gets as close to zero as you like and
 * never lands on it; the number it is heading to is its limit, and under
 * "lim" is written what moves and where to. A limit is about getting
 * close, not arriving. Where it is used: a sum that never ends (the halves
 * of rank 21's square have the limit one), and the slope of a curve at one
 * point, where zero cannot simply be put in for delta x.
 *
 * The one tie between sign and meaning: lim is the word limit, cut short.
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { axes, chord, curve, label, SQUARE, type Graph } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import { GOLD, GOLD_EDGE, INK } from '../kit/look'
import { beadAt, numberLine, onLine, type Ruler } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'

const lim = (what: string, to: string): Tok => ({ big: 'lim', from: [...(what === 'Δx' ? ['Δ', 'x'] : [what]), '→', to] })
const over = (top: string, bottom: string): Tok => ({ frac: [top, bottom] })
const SLOPE: Tok = { frac: [['Δ', 'y'], ['Δ', 'x']] }

/** The line from zero to one that one over n walks down. */
const R: Ruler = { x0: 300, x1: 1620, y: 720, from: 0, to: 1 }
const BEAD = 50
/** One over n as a bead for n = 1 … `shown` (its fraction under it from a half on), then a dot for each of the next `more`: they crowd towards zero. */
const shares = (shown: number, more = 0): Sprite[] => [
  ...Array.from({ length: shown }, (_, i) => beadAt(`s${i + 1}`, onLine(R, 1 / (i + 1)), R.y - 52, BEAD)),
  ...Array.from({ length: shown }, (_, i) => i + 1)
    .filter((n) => n > 1)
    .flatMap((n) => label(`f${n}`, [over('1', String(n))], { x: onLine(R, 1 / n), y: R.y + 104 }, { size: 62 })),
  {
    k: 'rest',
    type: 'custom',
    n: { more, o: 1 },
    d: {
      id: 'rest',
      draw: (p) => (
        <g fill={GOLD} stroke={GOLD_EDGE} strokeWidth={3}>
          {Array.from({ length: Math.ceil(p.more) }, (_, j) => (
            <circle key={j} cx={onLine(R, 1 / (j + 5))} cy={R.y - 38} r={11} opacity={Math.min(1, p.more - j)} />
          ))}
        </g>
      ),
    },
  },
]
const ruler = () => numberLine(R, { size: 64 })

/** x closing in on two from both sides. */
const NEAR: Ruler = { x0: 360, x1: 1560, y: 720, from: 1, to: 3 }
const closing = (): Sprite[] => [1.5, 1.8, 1.95, 2.05, 2.2, 2.5].map((v, i) => beadAt(`c${i}`, onLine(NEAR, v), NEAR.y - 50, 46, 'blue'))

/** What goes in and what comes out, side by side: `cols` of the three columns are in. */
const TABLE = { xs: [470, 860, 1200, 1560], top: 360, bottom: 540, size: 104 }
const IN = ['1.9', '1.99', '1.999']
const OUT = ['3.8', '3.98', '3.998']
const table = (cols: number): Sprite[] => [
  {
    k: 'rules',
    type: 'custom',
    n: { o: 1 },
    d: {
      id: 'rules',
      draw: () => (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.5}>
          <line x1={280} y1={(TABLE.top + TABLE.bottom) / 2} x2={1760} y2={(TABLE.top + TABLE.bottom) / 2} />
          <line x1={660} y1={TABLE.top - 80} x2={660} y2={TABLE.bottom + 80} />
        </g>
      ),
    },
  },
  ...label('hx', ['x'], { x: TABLE.xs[0], y: TABLE.top }, { size: TABLE.size * 1.15 }),
  ...label('hf', [{ fn: 'f' }, '(', 'x', ')'], { x: TABLE.xs[0], y: TABLE.bottom }, { size: TABLE.size }),
  ...IN.slice(0, cols).flatMap((v, i) => label(`in${i}`, [v], { x: TABLE.xs[i + 1], y: TABLE.top }, { size: TABLE.size })),
  ...OUT.slice(0, cols).flatMap((v, i) => label(`out${i}`, [v], { x: TABLE.xs[i + 1], y: TABLE.bottom }, { size: TABLE.size })),
]

/** Rank 21's square filled by halves: half of it, then half of what is left, and so on. `k` is how many pieces are in. */
const SQ = { x: 480, y: 560, side: 520 }
const PIECES = (() => {
  let r = { x: -SQ.side / 2, y: -SQ.side / 2, w: SQ.side, h: SQ.side }
  return Array.from({ length: 10 }, (_, j) => {
    const piece = j % 2 === 0 ? { ...r, w: r.w / 2 } : { ...r, h: r.h / 2 }
    r = j % 2 === 0 ? { ...r, x: r.x + r.w / 2, w: r.w / 2 } : { ...r, y: r.y + r.h / 2, h: r.h / 2 }
    return piece
  })
})()
const halves = (k: number): Sprite[] => [
  {
    k: 'square',
    type: 'custom',
    n: { x: SQ.x, y: SQ.y, k, o: 1 },
    d: {
      id: 'halves',
      draw: (p) => (
        <g transform={`translate(${p.x} ${p.y})`}>
          <rect x={-SQ.side / 2} y={-SQ.side / 2} width={SQ.side} height={SQ.side} fill="#fbf6ea" />
          {PIECES.map((r, j) => (
            <rect key={j} {...{ x: r.x, y: r.y, width: r.w, height: r.h }} fill={j % 2 ? '#edc971' : GOLD} stroke={GOLD_EDGE} strokeWidth={3} opacity={Math.max(0, Math.min(1, p.k - j))} />
          ))}
          <rect x={-SQ.side / 2} y={-SQ.side / 2} width={SQ.side} height={SQ.side} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        </g>
      ),
    },
  },
]
const SUM = { x: 1340 }

/** A curve, and the line through two of its points: the one at x = 1, and the one `h` further on. */
const C: Graph = { x: 200, y: 930, ux: 280, uy: 150, w: 2.4, h: 5 }
const bent = (h: number): Sprite[] => [...axes(C, { xs: [1], names: ['x', 'y'] }), curve('curve', C, SQUARE, { to: 2.3 }), chord('step', C, SQUARE, 1, h, { reach: 0.5, legs: true })]
/** The slopes found as the points close up: delta x, and delta y over delta x under it. */
const FOUND = { xs: [1110, 1340, 1540, 1760], top: 250, bottom: 430, size: 88 }
const found = (cols: number): Sprite[] => [
  ...label('hdx', ['Δ', 'x'], { x: FOUND.xs[0], y: FOUND.top }, { size: FOUND.size }),
  ...label('hs', [SLOPE], { x: FOUND.xs[0], y: FOUND.bottom }, { size: FOUND.size }),
  ...['1', '0.5', '0.1'].slice(0, cols).flatMap((v, i) => label(`dx${i}`, [v], { x: FOUND.xs[i + 1], y: FOUND.top }, { size: FOUND.size })),
  ...['3', '2.5', '2.1'].slice(0, cols).flatMap((v, i) => label(`s${i}`, [v], { x: FOUND.xs[i + 1], y: FOUND.bottom }, { size: FOUND.size })),
]

const TOP_Y = 250

export const r37: Spec = {
  rank: 37,
  id: 'r37',
  title: 'Limits',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { axis: ruler(), marks: shares(4), line: line(['1', ',', over('1', '2'), ',', over('1', '3'), ',', over('1', '4'), ',', '…'], { y: TOP_Y, size: 120 }) },
      say: 'One. A half. A third. A quarter. This is one over n, and n keeps growing. Does one over n ever reach zero?',
      turn: { kind: 'predict', id: 'reachzero', prompt: 'Does one over n ever reach zero?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { stage: { marks: shares(4, 56), line: line([over('1', 'n'), '>', '0'], { y: TOP_Y, size: 190 }) }, move: 4, say: 'No. One over n is always more than zero. But it gets as close to zero as you like.' },
    {
      stage: { ask: line([{ g: '?', k: 'ask' }], { x: onLine(R, 0), y: R.y - 170, size: 150, gold: ['ask'] }) },
      say: 'It heads for zero, and never lands on it. We need a sign for the number it is heading to.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: ['axis', 'marks'], stage: { line: line(['lim'], { y: 330, size: 380, gold: ['lim'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This sign says: limit. It is the word limit, cut short.' },
    {
      stage: { line: line([lim('n', '∞'), over('1', 'n'), '=', '0'], { y: 300, size: 220 }) },
      say: 'Under it, we write what is moving, and where to. We read it: the limit, as n goes to infinity, of one over n, equals zero.',
      poster: true,
    },
    {
      clear: true,
      stage: { line: line(['x', '→', '2'], { y: 300, size: 260, gold: ['→'] }), axis: numberLine(NEAR, { size: 64 }), marks: closing() },
      say: 'The arrow says: goes to, or approaches. X approaches two: x gets as close to two as you like.',
    },
    {
      clear: true,
      stage: { rule: line([{ fn: 'f' }, '(', 'x', ')', '=', '2', 'x'], { y: 150, size: 120 }), table: table(0) },
      also: [1, 2, 3].map((n, i) => ({ at: 3 + 1.1 * i, move: 0.5, stage: { table: table(n) } })),
      say: 'Here is a function: f of x equals two x. Put in numbers closer and closer to two. Out come numbers closer and closer to four.',
    },
    { stage: { line: line([lim('x', '2'), { fn: 'f' }, '(', 'x', ')', '=', '4'], { y: 800, size: 200 }) }, say: 'So we write: the limit, as x approaches two, of f of x, equals four.' },
    {
      stage: { line: line([lim('x', '2'), { fn: 'f' }, '(', 'x', ')', '=', '4'], { y: 800, size: 200, gold: ['lim'] }) },
      move: 0.5,
      say: 'A limit is about getting close, not arriving.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { square: halves(10), limit: line([lim('n', '∞'), { big: 'Σ', from: ['i', '=', '1'], to: 'n' }, '(', over('1', '2'), ')', { sup: 'i' }, '=', '1'], { x: SUM.x + 10, y: 540, size: 150 }) },
      move: 6,
      say: 'Limits are used for sums that never end. Half a square, then half of what is left, and so on: the total gets closer and closer to one whole square. The limit of the sum is one.',
    },
    {
      clear: true,
      stage: { graph: bent(1), found: found(1) },
      also: [
        { at: 3.4, move: 4, stage: { graph: bent(0.1) } },
        { at: 5.6, move: 0.5, stage: { found: found(2) } },
        { at: 7, move: 0.5, stage: { found: found(3) } },
      ],
      say: 'Limits also give the slope of a curve at one point. Bring two points together, so that delta x goes to zero. The slope goes: three, two and a half, two point one.',
    },
    {
      stage: { graph: bent(0), limit: line([lim('Δx', '0'), SLOPE, '=', '2'], { x: 1450, y: 760, size: 170 }) },
      say: 'We cannot put zero itself in: zero over zero says nothing. But the limit says where the slope is heading: two.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'X approaches two. Which sign goes here?',
      turn: { kind: 'place', id: 'towards2', prompt: 'x approaches two. Which sign goes here?', toks: ['x', '_', '2'], tiles: ['=', '→', '>'], right: '→', size: 220 },
    },
    {
      clear: true,
      stage: { given: line([{ fn: 'f' }, '(', 'x', ')', '=', '2', 'x'], { y: 190, size: 130 }) },
      say: 'F of x equals two x, and x approaches three. Which one is true?',
      turn: {
        kind: 'choose',
        id: 'near3',
        prompt: 'x approaches three. Which one is true?',
        cards: [
          [lim('x', '3'), { fn: 'f' }, '(', 'x', ')', '=', '5'],
          [lim('x', '3'), { fn: 'f' }, '(', 'x', ')', '=', '6'],
        ],
        right: 1,
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line([lim('x', '5'), { fn: 'f' }, '(', 'x', ')', '=', '10'], { y: 460, size: 220 }) },
      move: 0.6,
      say: 'The limit, as x approaches five, of f of x, equals ten.',
      turn: { kind: 'read', id: 'readlim', prompt: 'You read it.' },
    },
    {
      clear: true,
      teaser: true,
      stage: { graph: bent(0), limit: line([lim('Δx', '0'), SLOPE], { x: 1370, y: 480, size: 220 }) },
      say: 'The slope at one point is the limit, as delta x goes to zero, of delta y over delta x. That is a lot to write. Is there a shorter way?',
      pad: 1,
    },
  ],
}
