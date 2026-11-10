/**
 * Rank 47, probability: an upright P with the thing that might happen in
 * brackets after it, and the upright bar read "given". The signs on the
 * paper are those of ranks 1–6, the decimal point and percent (rank 9),
 * letters (rank 12), not (rank 23), set brackets and their bar (rank 27),
 * ∩ (rank 30) and the rank's own P. A probability is a number from zero to
 * one that says how likely something is: the ways it can happen, over
 * everything that can happen. P(A ∣ B) is the probability of A once B is
 * known to have happened: only B's part is left, and it is the part of it
 * that is also in A. The bar is the one from set brackets, where it read
 * "such that": both times it narrows things down. Where it is used:
 * wherever something is not certain (the weather, games), and whenever new
 * information changes how likely something is.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Graph } from '../kit/calculus'
import { bag, BAG_BEAD, ground, inBag, label, stacks } from '../kit/chance'
import type { Tok } from '../kit/glyphs'
import { dot, member, venn, vennAt, type Venn } from '../kit/logic'
import { INK } from '../kit/look'
import { beadAt, numberLine, onLine, type Ruler } from '../kit/measures'
import { line, row, type BeadColour, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const P: Tok = { op: 'P' }
const PA: Tok[] = [P, '(', 'A', ')']
const GIVEN: Tok[] = [P, '(', 'A', '∣', 'B', ')']
const over = (a: string, b: string): Tok => ({ frac: [a, b] })

/** The bag, and where the lines beside it stand. */
const BAG = { x: 500, y: 540 }
const SIDE = { x: 1360, size: 170 }
const BEAD = BAG_BEAD
/** Three red beads and a blue one in the bag (the blue is keyed last, so it stays put when the reds are counted). */
const COLOURS: BeadColour[] = ['red', 'red', 'blue', 'red']
const beads = (pts: { x: number; y: number }[], size = BEAD): Sprite[] => pts.map((pt, i) => beadAt(`bead${i}`, pt.x, pt.y, size, COLOURS[i]))
const inside = () => [bag('bag', BAG.x, BAG.y), ...beads(inBag(BAG.x, BAG.y, 4))]

/** From cannot happen to certain. */
const R: Ruler = { x0: 460, x1: 1460, y: 640, from: 0, to: 1 }

/** A die's six numbers: A is "more than three", B is "even". */
const V: Venn = { x: 560, y: 590, r: 250, d: 150 }
type Fade = { a?: number; out?: number }
const die = (shade: { a?: number; both?: number; b?: number } = {}, fade: Fade = {}, gold = false): Sprite[] => [
  ...venn('v', V, { names: ['A', 'B'], shade }),
  member('n5', '5', vennAt(V, 'a'), { size: 100, fade: fade.a }),
  member('n4', '4', { x: V.x, y: V.y - 90 }, { size: 100, gold }),
  member('n6', '6', { x: V.x, y: V.y + 90 }, { size: 100, gold }),
  member('n2', '2', vennAt(V, 'b'), { size: 100 }),
  member('n1', '1', { x: V.x - 300, y: V.y + 300 }, { size: 100, fade: fade.out }),
  member('n3', '3', { x: V.x + 300, y: V.y + 300 }, { size: 100, fade: fade.out }),
]

/** A rain cloud, a coin and a die's six: where probability is met. */
const cloud = (k: string, x: number, y: number, s = 1, dark = false): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, s, o: 1 },
  d: {
    id: `cloud ${dark}`,
    draw: (p) => (
      <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`} stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -150 40 C -230 40 -230 -60 -140 -60 C -130 -150 0 -170 40 -90 C 110 -130 190 -70 150 -10 C 210 0 200 40 150 40 Z" fill={dark ? '#8d8477' : '#fbf6ea'} />
        {[-100, -20, 60, 140].map((dx) => (
          <line key={dx} x1={dx} y1={90} x2={dx - 24} y2={150} stroke="#2f6394" />
        ))}
      </g>
    ),
  },
})
const coin = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'coin',
    draw: (p) => (
      <g stroke="#a7771a" strokeWidth={7}>
        <circle cx={p.x} cy={p.y} r={110} fill="#e0a82e" />
        <circle cx={p.x} cy={p.y} r={84} fill="none" strokeWidth={4} />
      </g>
    ),
  },
})
const six = (k: string, x: number, y: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: 'six',
    draw: (p) => (
      <g>
        <rect x={p.x - 105} y={p.y - 105} width={210} height={210} rx={30} fill="#fbf6ea" stroke={INK} strokeWidth={7} />
        {[-52, 52].flatMap((dx) => [-60, 0, 60].map((dy) => <circle key={`${dx} ${dy}`} cx={p.x + dx} cy={p.y + dy} r={19} fill={INK} />))}
      </g>
    ),
  },
})

/** His turn: three red beads in a bag; each bead he adds is blue, so red gets less likely. */
const MIX = { x: 520, y: 520 }
const ZONE = { x: MIX.x - 320, y: MIX.y - 260, w: 640, h: 560 }
function mixed(n: number): Patch {
  const places = inBag(MIX.x, MIX.y, 3 + n)
  return {
    bag: [bag('bag', MIX.x, MIX.y)],
    reds: places.slice(0, 3).map((pt, i) => beadAt(`red${i}`, pt.x, pt.y, BEAD, 'red')),
    blues: places.slice(3).map((pt, j) => ({ ...beadAt(`blue${j}`, pt.x, pt.y, BEAD, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
    line: line([...PA, '=', { frac: ['3', String(3 + n)], k: 'odds' } as Tok, ...(n === 3 ? ['=', { frac: ['1', '2'], k: 'half' } as Tok] : [])], { x: SIDE.x, y: 480, size: 150, gold: n === 3 ? ['odds', 'half'] : [] }),
  }
}

/** The closing question: eight plants, a bead standing over each one's height. */
const G: Graph = { x: 260, y: 760, ux: 150, uy: 110, w: 10, h: 4 }
const PLANTS: [number, number][] = [
  [2, 1],
  [4, 3],
  [5, 2],
  [7, 1],
  [9, 1],
]

export const r47: Spec = {
  rank: 47,
  id: 'r47',
  title: 'Probability',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { bag: inside() },
      say: 'A bag holds three red beads and one blue. One comes out, without looking. How likely is it to be red?',
      turn: { kind: 'predict', id: 'howlikely', prompt: 'How likely is it to be red?', options: [{ label: 'One out of two' }, { label: 'Three out of four' }] },
    },
    {
      stage: { bag: [bag('bag', BAG.x, BAG.y), ...beads(row(4, SIDE.x, 330, 130), 104)], line: line([over('3', '4')], { x: SIDE.x, y: 650, size: 230 }) },
      say: 'Three out of four. Four beads could come out, and three of them are red.',
    },
    {
      stage: { line: line([{ g: '?', k: 'ask' }, '=', over('3', '4')], { x: SIDE.x, y: 650, size: 200, gold: ['ask'] }) },
      say: 'Three quarters says how likely. We need a sign that asks: how likely?',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(PA, { y: 430, size: 320, gold: ['prob'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is read: the probability of A. The upright P is short for probability. A is something that might happen.' },
    {
      clear: true,
      stage: { bag: inside(), key: [...label('key/a', ['A'], { x: SIDE.x - 70, y: 300 }, { size: 130 }), beadAt('key/bead', SIDE.x + 60, 300, 96, 'red')], line: line([...PA, '=', over('3', '4')], { x: SIDE.x, y: 600, size: SIDE.size }) },
      say: 'Here, A is: a red bead comes out. The probability of A equals three quarters.',
      poster: true,
    },
    {
      clear: true,
      stage: { rule: line(['0', '≤', ...PA, '≤', '1'], { y: 250, size: 170 }), ruler: numberLine(R, { every: 0.25, labels: [0, 1], size: 80 }), at: [dot('at', { x: onLine(R, 0.75), y: R.y }, { r: 24, pen: 'gold' }), ...label('at/n', [over('3', '4')], { x: onLine(R, 0.75), y: R.y - 150 }, { size: 130 })] },
      say: 'A probability is always from zero to one. Zero: it cannot happen. One: it is certain.',
    },
    {
      clear: true,
      stage: { die: die(), a: line(['A', '=', '{', '4', ',', '5', ',', '6', '}'], { x: SIDE.x + 40, y: 330, size: 120 }), b: line(['B', '=', '{', '2', ',', '4', ',', '6', '}'], { x: SIDE.x + 40, y: 500, size: 120 }) },
      say: 'Roll a die. A is: more than three. B is: an even number.',
    },
    {
      clear: ['die'],
      stage: { die: die({ a: 1, both: 1 }), line: line([...PA, '=', over('3', '6'), '=', over('1', '2')], { x: SIDE.x + 40, y: 430, size: 140 }) },
      say: 'The probability of A is three out of six: one half.',
    },
    {
      stage: { die: die({ both: 1, b: 1 }, { a: 0.25, out: 0.25 }), line: null },
      say: 'Now someone peeks and says: it is even. Only two, four and six are left.',
    },
    {
      stage: { die: die({ both: 1, b: 0.35 }, { a: 0.25, out: 0.25 }, true), line: line([...GIVEN, '=', over('2', '3')], { x: SIDE.x + 40, y: 430, size: 140, gold: ['∣'] }) },
      say: 'Two of those three are in A. With a bar, we read: the probability of A, given B. It equals two thirds.',
    },
    {
      clear: true,
      stage: { set: line(['{', 'x', '∣', 'x', '>', '3', '}'], { y: 330, size: 170, gold: ['∣'] }), line: line(GIVEN, { y: 640, size: 200, gold: ['∣'] }) },
      say: 'The bar comes from set brackets, where it was read: such that. Both times, it narrows things down.',
    },
    {
      clear: true,
      stage: { rule: line([...GIVEN, '=', { frac: [[P, '(', 'A', '∩', 'B', ')'], [P, '(', 'B', ')']] }], { y: 380, size: 150 }), sum: line([over('2', '6'), '÷', over('3', '6'), '=', over('2', '3')], { y: 740, size: 130 }) },
      say: 'As a rule: the probability of both, divided by the probability of B.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { cloud: [cloud('cloud', 400, 500, 1.3)], line: line([...PA, '=', '0', '.', '7', '=', '70', '%'], { x: SIDE.x - 20, y: 500, size: 124 }) },
      say: 'Probability is used wherever something is not certain. The probability of rain is zero point seven: seventy percent.',
    },
    {
      clear: true,
      stage: { coin: [coin('coin', 620, 400), ...label('coin/n', [over('1', '2')], { x: 620, y: 680 }, { size: 150 })], six: [six('six', 1300, 400), ...label('six/n', [over('1', '6')], { x: 1300, y: 680 }, { size: 150 })] },
      say: 'In games: heads has probability one half. A six has probability one sixth.',
    },
    {
      clear: true,
      stage: { cloud: [cloud('cloud', 400, 500, 1.3, true)], line: line([...GIVEN, '>', ...PA], { x: SIDE.x - 20, y: 500, size: 124, gold: ['∣'] }) },
      say: 'Given is for new information. The probability of rain, given dark clouds, is higher.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { beads: row(5, 960, TOP + 10, 130).map((pt, i) => beadAt(`five${i}`, pt.x, pt.y, 100, i < 2 ? 'red' : 'blue')) },
      say: 'Two red beads and three blue. A is: a red bead comes out. Which one is right?',
      turn: { kind: 'choose', id: 'twofifths', prompt: 'Which one is right?', cards: [[...PA, '=', over('2', '3')], [...PA, '=', over('2', '5')]], right: 1 },
    },
    {
      clear: true,
      say: 'Three red beads. Add blue beads until the probability of red is one half.',
      turn: { kind: 'build', id: 'evenodds', prompt: 'Add blue beads until the probability of red is one half.', target: 3, max: 5, zone: ZONE, state: mixed },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...GIVEN, '=', over('1', '4')], { y: 480, size: 230 }) }, move: 0.6, say: 'The probability of A, given B, equals one quarter.', turn: { kind: 'read', id: 'readgiven', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { ground: ground(G, { from: 1, to: 10, xs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }), plants: stacks('plant', G, PLANTS, { colour: 'green', size: 96 }) },
      say: 'Eight plants were measured. Each bead stands over the height of one plant.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: 1500, y: 330, size: 240, gold: ['ask'] }) }, say: 'What one number could stand for all eight?', pad: 1 },
  ],
}
