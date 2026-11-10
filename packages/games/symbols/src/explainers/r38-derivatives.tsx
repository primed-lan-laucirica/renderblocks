/**
 * Rank 38, derivatives: the slope at one point. The signs on the paper are
 * the numerals, letters, powers, fractions, f(x), the arrow, delta, "lim"
 * (rank 37) and the three ways of writing a derivative: dy/dx, the prime
 * of f′ and the dot of ẋ. Along a curve the slope changes; the slope at
 * one point is the limit of Δy/Δx, and dy/dx is the short way to write
 * that limit. It looks like a fraction but is one sign. f′(x) says the
 * same when the function has a name, and ẋ when the change is over time.
 * Where it is used: speed from distance, the top of a hill (where the
 * derivative is zero), and how fast anything grows.
 *
 * The one tie between signs: delta, the capital D for a difference, has
 * shrunk into a small d. No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { axes, chord, curve, label, on, point, SQUARE, under, type Graph, type Rule } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import { PEN } from '../kit/logic'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'

const DYDX: Tok = { frac: [[{ d: 'y' }], [{ d: 'x' }]], k: 'dydx' }
const LIMIT: Tok[] = [{ big: 'lim', from: ['Δ', 'x', '→', '0'] }, { frac: [['Δ', 'y'], ['Δ', 'x']] }]
const PRIME: Tok[] = [{ fn: 'f' }, { g: '′', k: 'prime' }, '(', 'x', ')']
const XDOT: Tok = { dot: 'x', k: 'xdot' }

/** The curve y = x², and the line that just touches it at `a`. */
const C: Graph = { x: 200, y: 820, ux: 280, uy: 130, w: 2.4, h: 5 }
const sheet = (): Sprite[] => [...axes(C, { xs: [1, 2], names: ['x', 'y'] }), curve('curve', C, SQUARE, { to: 2.3 })]
const touch = (k: string, a: number, reach = 0.5): Sprite => chord(k, C, SQUARE, a, 0, { reach })
/** Two places on it, each with its letter. */
const A = 0.6
const B = 2
const places = (): Sprite[] => [
  point('pa', C, A, A * A),
  point('pb', C, B, B * B),
  ...label('la', ['A'], { x: on(C, A, 0).x - 20, y: on(C, 0, A * A).y - 90 }, { size: 84 }),
  ...label('lb', ['B'], { x: on(C, B, 0).x - 90, y: on(C, 0, B * B).y - 40 }, { size: 84 }),
]
const SIDE = { x: 1400 }

/** A hill, and the line that just touches it at `a`: flat at the top. */
const H: Graph = { x: 240, y: 900, ux: 200, uy: 150, w: 4.2, h: 4.6 }
const HILL: Rule = { id: '4x−x²', f: (x) => 4 * x - x * x }
const hill = (a: number): Sprite[] => [...axes(H, { names: ['x', 'y'] }), curve('curve', H, HILL, { to: 4 }), chord('touch', H, HILL, a, 0, { reach: 0.9 })]

/** His turn: a line through the point (2, 4) of the curve, one steeper for every bead he adds. */
const T: Graph = { x: 200, y: 850, ux: 250, uy: 130, w: 2.5, h: 5.6 }
const PILE = { x: 1440, y: 660, size: 64 }
const ZONE = { x: PILE.x - 320, y: PILE.y - 130, w: 640, h: 260 }
const turning = (slope: number): Sprite => ({
  k: 'turning',
  type: 'custom',
  n: { slope, o: 1 },
  d: {
    id: 'turning',
    draw: (p) => {
      const at = on(T, 2, 4)
      const len = Math.hypot(T.ux, p.slope * T.uy)
      const dx = (300 * T.ux) / len
      const dy = (300 * p.slope * T.uy) / len
      return (
        <g>
          <line x1={at.x - dx} y1={at.y + dy} x2={at.x + dx} y2={at.y - dy} stroke={PEN.red} strokeWidth={8} strokeLinecap="round" />
          <circle cx={at.x} cy={at.y} r={14} fill={PEN.ink} />
        </g>
      )
    },
  },
})
function steeper(n: number): Patch {
  return {
    graph: [...axes(T, { xs: [1, 2], names: ['x', 'y'] }), curve('curve', T, SQUARE, { to: 2.4 }), turning(n)],
    rule: line(['y', '=', 'x', { sup: '2' }], { x: PILE.x, y: 190, size: 120 }),
    // The line's own slope is a delta over a delta; only where it touches the curve is that the derivative.
    line: line([n === 4 ? DYDX : { frac: [['Δ', 'y'], ['Δ', 'x']], k: 'rise' }, '=', { g: String(n), k: 'made' }], { x: PILE.x, y: 420, size: 170, gold: n === 4 ? ['made'] : [] }),
    beads: row(n, PILE.x, PILE.y, PILE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PILE.size, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  }
}

/** The closing question: the speed at every moment, and the ground covered so far. */
const V: Graph = { x: 420, y: 880, ux: 250, uy: 150, w: 4.2, h: 3.6 }
const SPEED: Rule = { id: 'speed', f: (t) => 1.6 + 0.5 * t - 0.7 * Math.sin(1.5 * t) }
const speed = (swept: number): Sprite[] => [...(swept > 0 ? [under('gone', V, SPEED, 0, swept)] : []), ...axes(V, { names: ['t', null] }), curve('curve', V, SPEED, { to: 4 })]

export const r38: Spec = {
  rank: 38,
  id: 'r38',
  title: 'Derivatives',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { graph: sheet(), places: places() },
      say: 'On a curve, the slope keeps changing. Where is this curve steeper: at A, or at B?',
      turn: { kind: 'predict', id: 'steeper', prompt: 'Where is the curve steeper?', options: [{ label: 'At A' }, { label: 'At B' }] },
    },
    { stage: { touches: [touch('ta', A), touch('tb', B, 0.35)] }, say: 'At B. The line that just touches the curve there is steeper.' },
    {
      stage: { limit: line(LIMIT, { x: SIDE.x, y: 460, size: 230 }) },
      say: 'The slope at one point is a limit: the limit, as delta x goes to zero, of delta y over delta x. It needs a shorter sign.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line([DYDX], { y: 460, size: 420, gold: ['dydx'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is the shorter sign. We read it: d y, d x.' },
    {
      stage: { line: line([...LIMIT, '=', DYDX], { y: 460, size: 230 }) },
      say: 'It means that same limit. Delta, the capital D, has shrunk to a small d: a difference of almost nothing.',
      poster: true,
    },
    { stage: { line: line([DYDX], { y: 460, size: 380 }) }, say: 'It looks like a fraction, but it is one sign: the slope at one point. Its name is the derivative.' },
    {
      clear: true,
      stage: { graph: sheet(), touches: [touch('t', 1)], rule: line(['y', '=', 'x', { sup: '2' }], { x: SIDE.x, y: 200, size: 140 }), line: line([DYDX, '=', '2', 'x'], { x: SIDE.x, y: 440, size: 190 }) },
      say: 'For y equals x squared, the slope is always two x. So d y, d x equals two x.',
    },
    {
      stage: { at: line(['x', '=', '1'], { x: SIDE.x - 200, y: 700, size: 130 }), slope: line([DYDX, '=', '2'], { x: SIDE.x + 240, y: 700, size: 130 }) },
      also: [{ at: 2.9, move: 1.2, stage: { touches: [touch('t', 2)], at: line(['x', '=', '2'], { x: SIDE.x - 200, y: 700, size: 130 }), slope: line([DYDX, '=', '4'], { x: SIDE.x + 240, y: 700, size: 130 }) } }],
      say: 'At x equals one, the slope is two. At x equals two, the slope is four.',
    },
    {
      clear: true,
      stage: { named: line([{ fn: 'f' }, '(', 'x', ')', '=', 'x', { sup: '2' }], { y: 300, size: 170 }), line: line([...PRIME, '=', '2', 'x'], { y: 620, size: 230, gold: ['prime'] }) },
      say: 'When the function has a name, we can write: f prime of x. The small stroke is read: prime.',
    },
    {
      clear: true,
      stage: { line: line([XDOT, '=', { frac: [[{ d: 'x' }], [{ d: 't' }]] }], { y: 460, size: 300, gold: ['xdot'] }) },
      say: 'When something changes with time, a dot goes over the letter. X dot means d x, d t.',
    },
    {
      clear: true,
      stage: { one: line([DYDX], { x: 480, y: 460, size: 250 }), two: line(PRIME, { x: 960, y: 460, size: 220 }), three: line([XDOT], { x: 1440, y: 460, size: 250 }) },
      say: 'Three ways of writing, one meaning: how fast one thing changes, as another changes.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { rule: line(['x', '=', 't', { sup: '2' }], { x: 600, y: 300, size: 180 }) },
      also: [{ at: 4.8, stage: { line: line([XDOT, '=', '2', 't'], { x: 1320, y: 300, size: 180 }) } }, { at: 7.4, stage: { at: line(['t', '=', '3'], { x: 600, y: 700, size: 170 }), speed: line([XDOT, '=', '6'], { x: 1320, y: 700, size: 170 }) } }],
      say: 'The derivative gives speed. A cart has rolled t squared metres after t seconds. Its speed is x dot: two t. After three seconds, six metres each second.',
    },
    {
      clear: true,
      stage: { graph: hill(0.7), line: line([DYDX, '=', '0'], { x: 1480, y: 300, size: 190, fade: 0 }) },
      also: [{ at: 1.4, move: 3, stage: { graph: hill(2) } }, { at: 4.8, stage: { line: line([DYDX, '=', '0'], { x: 1480, y: 300, size: 190 }) } }],
      say: 'It finds the top of a hill. At the very top, the curve is flat: d y, d x equals zero.',
    },
    {
      clear: true,
      stage: { line: line([{ frac: [[{ d: 'h' }], [{ d: 't' }]] }], { y: 460, size: 340 }) },
      say: 'And it measures growth. D h, d t is how fast the height of a plant changes.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { rule: line([DYDX, '=', '2', 'x'], { x: 640, y: 200, size: 130 }), at: line(['x', '=', '3'], { x: 1300, y: 200, size: 130 }) },
      say: 'D y, d x equals two x. At x equals three, which one is true?',
      turn: { kind: 'choose', id: 'slope3', prompt: 'x is three. Which one is true?', cards: [[DYDX, '=', '6'], [DYDX, '=', '9']], right: 0 },
    },
    {
      clear: true,
      say: 'Add beads until the line just touches the curve.',
      turn: { kind: 'build', id: 'touch4', prompt: 'Add beads until the line just touches the curve.', target: 4, max: 7, zone: ZONE, state: steeper },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([{ fn: 'f' }, '′', '(', '2', ')', '=', '4'], { y: 480, size: 250 }) }, move: 0.6, say: 'F prime of two equals four.', turn: { kind: 'read', id: 'readprime', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { graph: speed(0) }, say: 'Now turn it round. This curve is our speed at every moment.' },
    { teaser: true, stage: { graph: speed(4) }, move: 2.2, say: 'How far did we go?', pad: 0.6 },
  ],
}
