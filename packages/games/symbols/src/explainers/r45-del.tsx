/**
 * Rank 45, del: gradient, divergence, curl. The signs on the paper are
 * those of ranks 1–5, letters (rank 12), functions (rank 15), powers
 * (rank 7), the pair's brackets and comma, delta (rank 36), the rounded d
 * (rank 40), a vector's arrow (rank 41), the dot and the cross between
 * vectors (rank 43) and del itself. Del before a function, ∇f, keeps its
 * partial slopes together as one vector: at every place an arrow pointing
 * straight uphill, longer where it is steeper (the gradient). With a dot
 * after it, ∇ · F asks a field of arrows how much they spread out from a
 * place: a number (the divergence). With a cross, ∇ × F asks how much they
 * turn round it: a vector (the curl). Where they are used: heat flowing
 * from hot to cold, water from a spring or down a drain, a storm turning
 * on a weather map.
 *
 * The ties between signs: del is a delta turned upside down; and, as
 * between two vectors, the dot gives a number and the cross a vector. No
 * names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { dot, PEN } from '../kit/logic'
import { INK } from '../kit/look'
import { line, type Sprite } from '../kit/sprites'
import { arrowOn, at, field, label, sheet, type Field, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

/** ∂f/∂x, for any two letters. */
const part = (top: string, bottom: string): Tok => ({ frac: [[{ d: top, round: true }], [{ d: bottom, round: true }]] })
const pair = (a: Tok | Tok[], b: Tok | Tok[]): Tok[] => ['(', ...(Array.isArray(a) ? a : [a]), ',', ...(Array.isArray(b) ? b : [b]), ')']
const F: Tok = { vec: 'F' }
const DIV: Tok[] = ['∇', '·', F]
const CURL: Tok[] = ['∇', '×', F]
const SIDE = { x: 1400, size: 150 }

/** A map of a hill, seen from above: from where he stands, a step east climbs two and a step north climbs one. */
const P: Plane = { x: 200, y: 840, u: 150, w: 5, h: 4 }
const HERE: Vec = [2, 1]
const UPHILL: Vec = [2, 1]
const standing = (): Sprite => dot('stand', at(P, HERE[0], HERE[1]), { r: 18 })
const hill = (): Sprite[] => [
  arrowOn('east', P, HERE, [2, 0], { pen: 'red' }),
  arrowOn('north', P, HERE, [0, 1], { pen: 'blue' }),
  ...label('east/name', [part('h', 'x'), '=', '2'], { x: at(P, 3, 1).x, y: at(P, 3, 1).y + 92 }, { size: 62 }),
  ...label('north/name', [part('h', 'y'), '=', '1'], { x: at(P, 2, 1.5).x - 165, y: at(P, 2, 1.5).y }, { size: 62 }),
  standing(),
]

/** A sheet with zero in its middle, for the fields. */
const C: Plane = { x: 500, y: 550, u: 130, w: 2, h: 2, left: 2, down: 2 }
const BOWL: Field = { id: 'bowl', f: (x, y) => [2 * x, 2 * y] }
const SPREAD: Field = { id: 'spread', f: (x, y) => [x, y] }
const DRAIN: Field = { id: 'drain', f: (x, y) => [-x, -y] }
const TURN: Field = { id: 'turn', f: (x, y) => [-y, x] }

/** Rings of equal height round the bottom of a bowl. */
const rings = (k: string, pl: Plane, radii: number[]): Sprite => ({
  k,
  type: 'custom',
  n: { o: 1 },
  d: {
    id: `rings ${pl.x} ${pl.y} ${pl.u} ${radii.join(' ')}`,
    draw: () => (
      <g fill="none" stroke={INK} strokeWidth={5} opacity={0.3}>
        {radii.map((r) => (
          <circle key={r} cx={pl.x} cy={pl.y} r={r * pl.u} />
        ))}
      </g>
    ),
  },
})

/** The tip of an arrow coming straight out of the paper: a ring with a dot in it. */
const outward = (k: string, pt: Pt, r = 38): Sprite => ({
  k,
  type: 'custom',
  n: { x: pt.x, y: pt.y, r, o: 1 },
  enter: { r: 0 },
  d: {
    id: 'outward',
    draw: (p) => (
      <g>
        <circle cx={p.x} cy={p.y} r={p.r} fill="#fbf6ea" stroke={PEN.red} strokeWidth={p.r * 0.24} />
        <circle cx={p.x} cy={p.y} r={p.r * 0.34} fill={PEN.red} />
      </g>
    ),
  },
})

/** Heat: hot beads on the left, cold on the right, and the flow between them. */
const H: Plane = { x: 260, y: 780, u: 150, w: 4, h: 3 }
const FLOW: Field = { id: 'flow', f: () => [1, 0] }
const heat = (): Sprite[] => [
  ...Array.from({ length: 4 }, (_, j) => dot(`hot${j}`, at(H, 0, j), { r: 30, pen: 'red' })),
  ...Array.from({ length: 4 }, (_, j) => dot(`cold${j}`, at(H, 4, j), { r: 30, pen: 'blue' })),
  field('flow', { ...H, x: H.x + H.u, w: 2 }, FLOW, { scale: 0.62, pen: 'gold', w: 9 }),
]

/** His turn: a small spreading field over the line with the gap. */
const Q: Plane = { x: 960, y: 290, u: 120, w: 1, h: 1, left: 1, down: 1 }

export const r45: Spec = {
  rank: 45,
  id: 'r45',
  title: 'Gradient, divergence, curl',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { sheet: sheet(P), hill: hill() },
      say: 'A map of a hill. From the dot, a step east climbs two, and a step north climbs one. Which way is the steepest?',
      turn: { kind: 'predict', id: 'steepest', prompt: 'Which way is the steepest?', options: [{ label: 'East' }, { label: 'Between the two' }] },
    },
    {
      stage: { up: [arrowOn('up', P, HERE, UPHILL, { pen: 'green', w: 14 })], line: line(pair('2', '1'), { x: SIDE.x, y: 430, size: 170 }) },
      say: 'Between the two. The steepest way goes two across for every one up.',
    },
    {
      stage: { line: line([{ g: '?', k: 'ask' }, '=', ...pair(part('h', 'x'), part('h', 'y'))], { x: SIDE.x, y: 430, size: 120, gold: ['ask'] }) },
      say: 'Two partial slopes, one direction. We need a sign that keeps them together.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(['∇'], { y: 430, size: 340, gold: ['∇'] }) }, move: 1.1, quiet: 1.2, motif: true, say: 'This sign is read: del.' },
    {
      stage: { old: line(['Δ'], { x: 620, y: 430, size: 300 }), line: line(['∇'], { x: 1300, y: 430, size: 300, gold: ['∇'] }) },
      say: 'It is a delta, turned upside down.',
    },
    {
      clear: true,
      stage: { line: line(['∇', { fn: 'f' }, '=', ...pair(part('f', 'x'), part('f', 'y'))], { y: 460, size: 200, gold: ['∇'] }) },
      say: 'Del f is the gradient of f: a vector. Its parts are the two partial slopes.',
      poster: true,
    },
    {
      clear: true,
      stage: { sheet: sheet(P), hill: hill(), up: [arrowOn('up', P, HERE, UPHILL, { pen: 'green', w: 14 })], line: line(['∇', { fn: 'h' }, '=', ...pair('2', '1')], { x: SIDE.x, y: 430, size: SIDE.size }) },
      say: 'On our hill, del h is two, one. It points straight uphill, and it is longer where the hill is steeper.',
    },
    {
      clear: true,
      stage: {
        sheet: sheet(C, { axes: true }),
        rings: [rings('rings', C, [1, 2])],
        field: [field('bowl', C, BOWL, { scale: 0.2, pen: 'green', w: 10 })],
        rule: line([{ fn: 'f' }, '=', 'x', { sup: '2' }, '+', 'y', { sup: '2' }], { x: SIDE.x, y: 330, size: 130 }),
        line: line(['∇', { fn: 'f' }, '=', ...pair(['2', 'x'], ['2', 'y'])], { x: SIDE.x, y: 600, size: 130 }),
      },
      say: 'Del f gives an arrow at every place. In this bowl, each one points away from the bottom.',
    },
    {
      clear: true,
      stage: { sheet: sheet(C, { axes: true }), field: [field('spread', C, SPREAD, { scale: 0.4, w: 10 })], rule: line([F, '=', ...pair('x', 'y')], { x: SIDE.x, y: 280, size: 120 }), line: line(DIV, { x: SIDE.x, y: 560, size: 190, gold: ['·'] }) },
      also: [{ at: 7.6, stage: { line: line([...DIV, '=', '2'], { x: SIDE.x, y: 560, size: 170 }) } }],
      say: 'Put a dot after del. Del dot F asks a field of arrows: how much do you spread out from here? That is the divergence. Here it is two: the arrows spread.',
    },
    {
      clear: true,
      stage: { sheet: sheet(C, { axes: true }), field: [field('turn', C, TURN, { scale: 0.4, pen: 'red', w: 10 })], rule: line([F, '=', ...pair(['−', 'y'], 'x')], { x: SIDE.x, y: 280, size: 120 }), line: line(CURL, { x: SIDE.x, y: 560, size: 190, gold: ['×'] }) },
      say: 'Put a cross after del. Del cross F asks: how much do you turn round this place? That is the curl.',
    },
    {
      stage: { out: [outward('out', at(C, 0, 0))], rule: null, dots: line(DIV, { x: SIDE.x, y: 300, size: 170 }), line: line(CURL, { x: SIDE.x, y: 560, size: 170 }) },
      say: 'As between two vectors, the dot gives a number and the cross gives a vector. This curl points straight out of the paper.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { heat: heat(), line: line(['−', '∇', { fn: 'T' }], { x: SIDE.x + 60, y: 430, size: 220 }) },
      say: 'Heat flows from hot to cold: straight down the gradient of the temperature, T.',
    },
    {
      clear: true,
      stage: { sheet: sheet(C), field: [field('spread', C, SPREAD, { scale: 0.4, w: 10 })], line: line([...DIV, '>', '0'], { x: SIDE.x, y: 430, size: SIDE.size }) },
      also: [{ at: 3.8, stage: { field: [field('drain', C, DRAIN, { scale: 0.4, w: 10 })], line: line([...DIV, '<', '0'], { x: SIDE.x, y: 430, size: SIDE.size }) } }],
      say: 'Water from a spring spreads out: its divergence is more than zero. Down a drain, it is less than zero.',
    },
    {
      clear: true,
      stage: { sheet: sheet(C), field: [field('turn', C, TURN, { scale: 0.4, pen: 'red', w: 10 })], line: line(CURL, { x: SIDE.x, y: 430, size: 190 }) },
      say: 'On a weather map, the curl of the wind shows where a storm is turning.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { first: line([part('f', 'x'), '=', '3'], { x: 620, y: TOP + 10, size: 110 }), second: line([part('f', 'y'), '=', '4'], { x: 1300, y: TOP + 10, size: 110 }) },
      say: 'Partial f, partial x, is three. Partial f, partial y, is four. Which one is true?',
      turn: { kind: 'choose', id: 'grad34', prompt: 'Which one is true?', cards: [['∇', { fn: 'f' }, '=', '7'], ['∇', { fn: 'f' }, '=', ...pair('3', '4')]], right: 1 },
    },
    {
      clear: true,
      stage: { field: [field('spread', Q, SPREAD, { scale: 0.7, w: 10 })] },
      say: 'These arrows spread, and the answer is a number. Which sign goes after del?',
      turn: { kind: 'place', id: 'dotdel', prompt: 'The arrows spread: a number. Which sign goes here?', toks: ['∇', '_', F, '=', '2'], tiles: ['×', '·', '+'], right: '·', y: 640, size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...DIV, '=', '3'], { y: 480, size: 260 }) }, move: 0.6, say: 'Del dot F equals three.', turn: { kind: 'read', id: 'readdel', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { sheet: sheet(P), u: [arrowOn('u', P, [1, 1], [3, 1], { pen: 'red' })], v: [arrowOn('v', P, [1, 1], [2, 2], { pen: 'blue' })], line: line([{ vec: 'u' }, '·', { vec: 'v' }], { x: SIDE.x, y: 330, size: 190 }) },
      say: 'The dot between two vectors says how much they point the same way.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: SIDE.x, y: 650, size: 240, gold: ['ask'] }) }, say: 'Can things that are not arrows be compared like that?', pad: 1 },
  ],
}
