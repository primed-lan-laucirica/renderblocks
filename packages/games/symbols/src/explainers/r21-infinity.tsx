/**
 * Rank 21, ∞ : going on without end. The signs on the paper are the
 * numerals, the letter n, + and −, the signs of order (rank 6), fractions,
 * sigma and ∞. There is no biggest number, since n + 1 is always bigger;
 * the sign for "it never ends" is infinity, and it is not a number. Where
 * it is used: the two ends of the number line, and a sum that never stops
 * (the halves of a square, which never pass one whole square).
 *
 * The one tie between sign and meaning: the sign is a loop with no end. No
 * names or dates are narrated.
 */
import type { Tok } from '../kit/glyphs'
import type { Spec } from '../engine/spec'
import { GOLD, GOLD_EDGE, INK, WOOD_DARK } from '../kit/look'
import { numberLine, type Ruler } from '../kit/measures'
import { line, loose, row, type Sprite } from '../kit/sprites'

const COUNT: Ruler = { x0: 200, x1: 2360, y: 620, from: 1, to: 13 }
const BOTH: Ruler = { x0: 400, x1: 1520, y: 560, from: -4, to: 4 }

/** The sign alone, and a gold stroke that runs round it: `k` is how many times round it has been. */
const ALONE = { y: 470, size: 520 }
const loop = (S: number) =>
  `M 0 0 C ${0.13 * S} ${-0.25 * S} ${0.4 * S} ${-0.25 * S} ${0.4 * S} 0 C ${0.4 * S} ${0.25 * S} ${0.13 * S} ${0.25 * S} 0 0 C ${-0.13 * S} ${-0.25 * S} ${-0.4 * S} ${-0.25 * S} ${-0.4 * S} 0 C ${-0.4 * S} ${0.25 * S} ${-0.13 * S} ${0.25 * S} 0 0 Z`
const runner = (k: number): Sprite[] => [
  {
    k: 'runner',
    type: 'custom',
    n: { x: 960, y: ALONE.y, k, o: 1 },
    d: {
      id: 'runner',
      draw: (p) => <path transform={`translate(${p.x} ${p.y})`} d={loop(ALONE.size)} pathLength={1} strokeDasharray="0.1 0.9" strokeDashoffset={-p.k} stroke={GOLD} strokeWidth={ALONE.size * 0.08} strokeLinecap="round" fill="none" />,
    },
    enter: { k: 0, o: 1 },
  },
]

/** A square filled by halves: half of it, then half of what is left, and so on. `k` is how many pieces are in. */
const SQ = { x: 520, y: 560, side: 520 }
const PIECES = (() => {
  let r = { x: -SQ.side / 2, y: -SQ.side / 2, w: SQ.side, h: SQ.side }
  return Array.from({ length: 10 }, (_, j) => {
    const piece = j % 2 === 0 ? { ...r, w: r.w / 2 } : { ...r, h: r.h / 2 }
    r = j % 2 === 0 ? { ...r, x: r.x + r.w / 2, w: r.w / 2 } : { ...r, y: r.y + r.h / 2, h: r.h / 2 }
    return piece
  })
})()
const halves = (k: number, named = 0): Sprite[] => [
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
  ...PIECES.slice(0, named).flatMap((r, j) => line([{ frac: ['1', String(2 ** (j + 1))] }], { x: SQ.x + r.x + r.w / 2, y: SQ.y + r.y + r.h / 2, size: [120, 100, 64][j] }).map((s) => ({ ...s, k: `piece${j}` }))),
]
const half = (n: number): Tok => ({ frac: ['1', String(n)] })
const SUM = { x: 1340, y: 520 }

/** The price of apples, in coins: a row of apples, and the coins they cost. */
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
const price = (k: string, apples: number, coins: number, y: number): Sprite[] => [...row(apples, 560, y, 110).map((pt, i) => apple(`${k}a${i}`, pt.x, pt.y)), ...loose(row(coins, 1280, y, 84), { s: 1.7, k: `${k}c` })]

export const r21: Spec = {
  rank: 21,
  id: 'r21',
  title: 'Infinity',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { line: line(['100', '<', '1,000', '<', '1,000,000'], { y: 420, size: 130 }) },
      say: 'Count as far as you like: a hundred, a thousand, a million. Is there a biggest number?',
      turn: { kind: 'predict', id: 'biggest', prompt: 'Is there a biggest number?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { clear: true, stage: { line: line(['n', '+', '1', '>', 'n'], { y: 330, size: 210 }) }, say: 'No. Take any number at all, and call it n. Then n plus one is bigger.' },
    { stage: { try: line(['1,000,001', '>', '1,000,000'], { y: 680, size: 130 }) }, say: 'Try a million. A million and one is bigger.' },
    { clear: true, stage: { axis: numberLine(COUNT, { size: 80 }) }, say: 'So the numbers go on without end. We need a sign for that.' },

    // ── 2. What infinity means ──
    { act: 2, clear: true, stage: { sign: line(['∞'], ALONE) }, quiet: 1.4, motif: true, say: 'This sign is infinity.' },
    { stage: { runner: runner(2) }, move: 5.5, say: 'Look at its shape: a loop. Follow it round, and you never reach an end.' },
    { stage: { runner: runner(5) }, move: 6.4, say: 'Infinity is not a number. You cannot count up to it. It means: going on for ever.' },
    { clear: true, stage: { line: line(['n', '<', '∞'], { y: 470, size: 260, gold: ['∞'] }) }, say: 'Whatever number n is, it is less than infinity. We read it: n is less than infinity.', poster: true },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { axis: numberLine(BOTH, { size: 64 }), left: line(['−', '∞'], { x: 190, y: BOTH.y, size: 130 }), right: line(['∞'], { x: 1740, y: BOTH.y, size: 130 }) },
      say: 'On a number line, the numbers go on for ever both ways: towards infinity, and towards minus infinity.',
    },
    { clear: true, stage: { square: halves(0) }, say: 'Infinity is used for a sum that never stops.' },
    {
      stage: { square: halves(4, 3), sum: line([half(2), '+', half(4), '+', half(8), '+', half(16)], { ...SUM, size: 120 }) },
      move: 5,
      say: 'Fill half a square. Then half of what is left. Then half again, and again.',
    },
    {
      stage: { square: halves(10, 3), sum: line([{ big: 'Σ', from: ['i', '=', '1'], to: '∞' }, '(', half(2), ')', { sup: 'i' }, '=', '1'], { ...SUM, size: 170 }) },
      move: 4,
      say: 'The pieces never stop, yet together they never pass one whole square. With sigma, we write: the sum, as I goes from one to infinity, equals one.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which sign goes here?',
      turn: { kind: 'place', id: 'million', prompt: 'Which sign goes here?', toks: ['1,000,000', '_', '∞'], tiles: ['<', '>', '='], right: '<' },
    },
    {
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'next', prompt: 'Which one is true?', cards: [['n', '+', '1', '<', 'n'], ['n', '+', '1', '>', 'n']], right: 1 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['−', '∞', '<', '0'], { y: 480, size: 230 }) }, move: 0.6, say: 'Minus infinity is less than zero.', turn: { kind: 'read', id: 'readminus', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { two: price('two', 2, 4, 380), four: price('four', 4, 8, 640) }, say: 'Two apples cost four coins. Four apples cost eight coins.' },
    { teaser: true, say: 'Double the apples, double the coins. How do we write that two amounts move in step?', pad: 1 },
  ],
}
