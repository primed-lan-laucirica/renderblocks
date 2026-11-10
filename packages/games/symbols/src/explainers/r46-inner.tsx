/**
 * Rank 46, the inner product: two things between angle brackets, with a
 * comma. The signs on the paper are those of ranks 1–6, powers (rank 7),
 * letters (rank 12), labels set low (rank 14), functions (rank 15), sigma
 * (rank 19), the comma and the three dots (rank 27), the d of rank 38, the
 * integral (rank 39), the vector's arrow (rank 41), the norm's bars (rank
 * 42) and the angle brackets themselves. The dot product (rank 43) tells
 * how much two arrows go the same way; the inner product asks the same of
 * other things. For arrows it is the dot product; for lists of n numbers
 * sigma adds the products of matching parts; for functions the integral
 * does the adding. Zero still means "square to each other", and a thing's
 * inner product with itself is its norm, squared. Where it is used: how
 * alike two sounds are, picking one note out of a sound, and length and
 * angle for things that are not arrows.
 *
 * The tie between signs: the angle brackets do the dot's job for more than
 * arrows. No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { curve, on, under, type Graph, type Rule } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import type { Pen } from '../kit/logic'
import { INK } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { arrowOn, beside, corner, label, legs, legsAt, sheet, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const U: Tok = { vec: 'u' }
const V: Tok = { vec: 'v' }
const F: Tok = { fn: 'f' }
const G: Tok = { fn: 'g' }
const pair = (a: Tok, b: Tok): Tok[] => ['(', a, ',', b, ')']
/** ⟨a, b⟩ */
const inner = (a: Tok, b: Tok): Tok[] => ['⟨', a, ',', b, '⟩']
const DOT: Tok[] = [U, '·', V]
const INTEGRAL: Tok[] = [{ big: '∫', k: 'int' }, F, '(', 'x', ')', G, '(', 'x', ')', { d: 'x' }]
const SIDE = { x: 1380 }

/** An arrow from zero with its name beside it. */
const named = (k: string, pl: Plane, v: Vec, name: Tok[], pen: Pen, off = 62): Sprite[] => [arrowOn(k, pl, [0, 0], v, { pen }), ...label(`${k}/name`, name, beside(pl, [0, 0], v, off), { size: 84 })]

// ── two waves, and their product ─────────────────────────────────────────

const TURN = Math.PI * 2
/** Two waves over one turn, each with the place its name stands (in the graph's own numbers). */
interface Waves {
  id: string
  f: (x: number) => number
  g: (x: number) => number
  names: [Vec, Vec]
}
/** Rising and falling together. */
const TOGETHER: Waves = { id: 'together', f: (x) => Math.sin(x), g: (x) => 0.6 * Math.sin(x), names: [[1.57, 1.4], [1.57, 0.27]] }
/** One shifted a quarter of a turn. */
const SHIFTED: Waves = { id: 'shifted', f: (x) => Math.sin(x), g: (x) => 0.6 * Math.cos(x), names: [[1.57, 1.4], [0.2, 0.95]] }
/** Two sounds much alike. */
const ALIKE: Waves = { id: 'alike', f: (x) => Math.sin(2 * x), g: (x) => 0.7 * Math.sin(2 * x) + 0.2 * Math.sin(4 * x), names: [[0.78, 1.42], [2.36, -0.36]] }
/** A sound made of two notes, and the higher note alone. */
const NOTE: Waves = { id: 'note', f: (x) => 0.75 * Math.sin(x) + 0.4 * Math.sin(3 * x), g: (x) => 0.4 * Math.sin(3 * x), names: [[1.57, 0.75], [4.71, 0.75]] }

/** The line the waves swing about. */
const midline = (gr: Graph): Sprite => ({ k: 'midline', type: 'custom', n: { x: gr.x, y: gr.y, o: 1 }, d: { id: `midline ${gr.ux}`, draw: (p) => <line x1={p.x} y1={p.y} x2={p.x + TURN * gr.ux + 30} y2={p.y} stroke={INK} strokeWidth={5} strokeLinecap="round" /> } })
/** The two waves, named: f in blue, g in ink. */
function waves(gr: Graph, w: Waves, size = 76): Sprite[] {
  const f: Rule = { id: `${w.id} f`, f: w.f }
  const g: Rule = { id: `${w.id} g`, f: w.g }
  return [midline(gr), curve(`${w.id}/f`, gr, f, { to: TURN, pen: 'blue', w: 10 }), curve(`${w.id}/g`, gr, g, { to: TURN, pen: 'ink', w: 7 }), ...label(`${w.id}/nf`, [F], on(gr, ...w.names[0]), { size }), ...label(`${w.id}/ng`, [G], on(gr, ...w.names[1]), { size })]
}
/** f times g at every x, filled: green where it is above zero, red where it is below. */
function product(gr: Graph, w: Waves): Sprite[] {
  const up: Rule = { id: `${w.id} up`, f: (x) => Math.max(w.f(x) * w.g(x), 0) }
  const down: Rule = { id: `${w.id} down`, f: (x) => Math.min(w.f(x) * w.g(x), 0) }
  return [under(`${w.id}/up`, gr, up, 0, TURN, { pen: 'green', shade: 0.5 }), under(`${w.id}/down`, gr, down, 0, TURN, { pen: 'red', shade: 0.5 })]
}

/** The opening: two arrows on the left, two waves on the right. */
const P0: Plane = { x: 170, y: 700, u: 125, w: 4, h: 3 }
const G0: Graph = { x: 1020, y: 500, ux: 105, uy: 150, w: TURN, h: 1 }
/** Arrows beside the lines about them. */
const P: Plane = { x: 190, y: 760, u: 135, w: 4, h: 3 }
/** Two arrows square to each other: one of them leans back past zero. */
const Q: Plane = { x: 420, y: 800, u: 135, w: 3, h: 3, left: 1 }
/** The arrow three, four. */
const R: Plane = { x: 230, y: 850, u: 112, w: 4, h: 4 }
/** The waves drawn wide, a line over them and a line under them. */
const GW: Graph = { x: 330, y: 560, ux: 200, uy: 190, w: TURN, h: 1 }

/** The closing question: a bag with three red beads and a blue one in it. */
const BAG = { x: 720, y: 560 }
const bag = (): Sprite => ({
  k: 'bag',
  type: 'custom',
  n: { x: BAG.x, y: BAG.y, o: 1 },
  d: {
    id: 'bag',
    draw: (p) => (
      <g stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${p.x - 150} ${p.y - 190} C ${p.x - 120} ${p.y - 110} ${p.x - 280} ${p.y + 40} ${p.x - 230} ${p.y + 170} C ${p.x - 200} ${p.y + 250} ${p.x + 200} ${p.y + 250} ${p.x + 230} ${p.y + 170} C ${p.x + 280} ${p.y + 40} ${p.x + 120} ${p.y - 110} ${p.x + 150} ${p.y - 190}`} fill="#e9dcc0" />
        <path d={`M ${p.x - 140} ${p.y - 110} Q ${p.x} ${p.y - 80} ${p.x + 140} ${p.y - 110}`} fill="none" strokeWidth={5} />
      </g>
    ),
  },
})
const inBag = (): Sprite[] => [beadAt('red0', BAG.x - 80, BAG.y + 130, 84, 'red'), beadAt('red1', BAG.x + 20, BAG.y + 140, 84, 'red'), beadAt('blue', BAG.x + 110, BAG.y + 110, 84, 'blue'), beadAt('red2', BAG.x - 20, BAG.y + 50, 84, 'red')]

export const r46: Spec = {
  rank: 46,
  id: 'r46',
  title: 'Inner product',
  layers: ['fill', 'waves'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: {
        sheet: sheet(P0),
        u: named('u', P0, [3, 1], [U], 'red', -62),
        v: named('v', P0, [1, 2], [V], 'blue'),
        dot: line([...DOT, '=', '5'], { x: 420, y: 820, size: 110 }),
        waves: waves(G0, TOGETHER, 60),
      },
      say: 'U dot v tells how much two arrows go the same way. Could one number tell that for two waves?',
      turn: { kind: 'predict', id: 'wavesdot', prompt: 'Could one number tell that for two waves?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    {
      stage: { ask: line([{ g: '?', k: 'ask' }], { x: 1350, y: 820, size: 170, gold: ['ask'] }) },
      say: 'Yes. But a wave has no step across and no step up. We need a wider sign than the dot.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(inner('u', 'v'), { y: 430, size: 300, gold: ['⟨', '⟩'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'These are angle brackets. Two things go in, and one number comes out. We read it: the inner product of u and v.' },
    {
      clear: true,
      stage: {
        sheet: sheet(P),
        u: named('u', P, [3, 1], [U], 'red', -62),
        v: named('v', P, [1, 2], [V], 'blue'),
        parts: [...line([U, '=', ...pair('3', '1')], { x: 250, y: 890, size: 84 }), ...line([V, '=', ...pair('1', '2')], { x: 680, y: 890, size: 84 }).map((s) => ({ ...s, k: `v/${s.k}` }))],
        line: line([...inner(U, V), '=', ...DOT], { x: SIDE.x, y: 330, size: 150, gold: ['⟨', '⟩'] }),
        sum: line(['3', '·', '1', '+', '1', '·', '2', '=', '5'], { x: SIDE.x, y: 590, size: 120 }),
      },
      say: 'For two arrows, the inner product is the dot product. Three times one, plus one times two: five.',
      poster: true,
    },
    {
      clear: true,
      stage: {
        list: line(['u', '=', '(', 'u', { sub: '1' }, ',', 'u', { sub: '2' }, ',', '…', ',', 'u', { sub: 'n' }, ')'], { y: 220, size: 110 }),
        line: line([...inner('u', 'v'), '=', { big: 'Σ', from: ['i', '=', '1'], to: 'n', k: 'sig' }, 'u', { sub: 'i' }, 'v', { sub: 'i' }], { y: 580, size: 190, gold: ['sig'] }),
      },
      say: 'For two lists of n numbers, it is the same: multiply the matching parts, and sigma adds them all.',
    },
    {
      clear: true,
      stage: { line: line([...inner(F, G), '=', ...INTEGRAL], { y: 430, size: 170, gold: ['int'] }) },
      say: 'A function has a value at every x. So for two functions, the integral does the adding.',
    },
    {
      stage: { line: line([...inner(F, G), '=', ...INTEGRAL], { y: 170, size: 110 }), waves: waves(GW, TOGETHER, 80) },
      also: [{ at: 3.2, move: 1.6, stage: { fill: product(GW, TOGETHER), verdict: line([...inner(F, G), '>', '0'], { y: 940, size: 120 }) } }],
      say: 'These two waves rise and fall together. Multiplied, they are never below zero: all green. The inner product is big.',
    },
    {
      stage: { waves: waves(GW, SHIFTED, 80), fill: null, verdict: null },
      also: [{ at: 2.2, move: 1.6, stage: { fill: product(GW, SHIFTED), verdict: line([...inner(F, G), '=', { g: '0', k: 'zero' }], { y: 940, size: 120, gold: ['zero'] }) } }],
      say: 'Shift one wave. Now there is as much red, below zero, as green. They cancel: the inner product is zero.',
    },
    {
      clear: true,
      stage: {
        sheet: sheet(Q),
        mark: [corner('mark', Q, [0, 0], [2, 1], [-1, 2], { size: 44 })],
        u: named('u', Q, [2, 1], [U], 'red', -62),
        v: named('v', Q, [-1, 2], [V], 'blue', -62),
        line: line([...inner(U, V), '=', '−2', '+', '2', '=', '0'], { x: 1370, y: 330, size: 112 }),
        waves: line([...inner(F, G), '=', '0'], { x: 1370, y: 620, size: 150 }),
      },
      say: 'Zero means square to each other: for arrows, and for waves too.',
    },
    {
      clear: true,
      stage: {
        sheet: sheet(R),
        legs: [legs('v/legs', R, [0, 0], [3, 4]), ...label('v/across', ['3'], legsAt(R, [0, 0], [3, 4]).across, { size: 76 }), ...label('v/up', ['4'], legsAt(R, [0, 0], [3, 4]).up, { size: 76 })],
        v: named('v', R, [3, 4], [V], 'blue'),
        sum: line([...inner(V, V), '=', '9', '+', '16', '=', '25'], { x: 1330, y: 300, size: 104 }),
        line: line([...inner(V, V), '=', '‖', V, '‖', { sup: '2' }], { x: 1330, y: 600, size: 160, gold: ['‖', '‖#1'] }),
      },
      say: "A thing's inner product with itself is its norm, squared. For the arrow three, four: nine plus sixteen, twenty-five. The norm is five.",
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { waves: waves(GW, ALIKE, 80), fill: product(GW, ALIKE), line: line([...inner(F, G), '>', '0'], { y: 170, size: 130 }) },
      say: 'Inner products tell how alike two sounds are. A sound is a wave. The bigger the inner product, the more alike.',
    },
    {
      clear: true,
      stage: { waves: waves(GW, NOTE, 80), line: line(inner(F, G), { y: 170, size: 130 }) },
      also: [{ at: 3.4, move: 1.6, stage: { fill: product(GW, NOTE) } }],
      say: 'They pick one note out of a sound: the inner product with a pure note tells how much of that note is in it.',
    },
    {
      clear: true,
      stage: { line: line(['‖', F, '‖', { sup: '2' }, '=', ...inner(F, F)], { y: 430, size: 210 }) },
      say: 'And they give a length and an angle to things that are not arrows: lists, waves, even pictures.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { first: line([U, '=', ...pair('1', '2')], { x: 620, y: TOP, size: 130 }), second: line([V, '=', ...pair('3', '1')], { x: 1300, y: TOP, size: 130 }) },
      say: 'Vector u is one, two. Vector v is three, one. Which one is true?',
      turn: { kind: 'choose', id: 'inner5', prompt: 'Which one is true?', cards: [[...inner(U, V), '=', '5'], [...inner(U, V), '=', ...pair('4', '3')]], right: 0 },
    },
    {
      clear: true,
      stage: { first: line([U, '=', ...pair('2', '1')], { x: 600, y: TOP, size: 120 }), second: line([V, '=', ...pair('−1', '2')], { x: 1320, y: TOP, size: 120 }) },
      say: 'Now u is two, one, and v is minus one, two. Which sign goes here?',
      turn: { kind: 'place', id: 'innerzero', prompt: 'Which sign goes here?', toks: [...inner(U, V), '_', '0'], tiles: ['<', '=', '>'], right: '=', y: 520 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...inner('u', 'v'), '=', '6'], { y: 480, size: 250 }) }, move: 0.6, say: 'The inner product of u and v equals six.', turn: { kind: 'read', id: 'readinner', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { bag: [bag(), ...inBag()] }, say: 'A bag holds three red beads and one blue. One comes out, without looking.' },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: 1300, y: 600, size: 260, gold: ['ask'] }) }, say: 'How likely is it to be red?', pad: 1 },
  ],
}
