/**
 * Rank 39, the integral. The signs on the paper are those of ranks 1–5,
 * letters (rank 12), functions (rank 15), sigma (rank 19), delta (rank 36),
 * the limit (rank 37), the d of rank 38 and the integral sign itself. The
 * room under a curve is measured with strips, each f(x) tall and Δx wide;
 * the limit of their sum, as the strips get thinner, is the area, and ∫
 * stands for that whole limit of a sum. Its ends say where to start (at the
 * foot) and where to stop (at the top). Where it is used: areas, how far
 * you went from your speed, and undoing the derivative (with no ends, it
 * names a function).
 *
 * The ties between signs: ∫ is a stretched S as Σ is the Greek S, and dx is
 * Δx shrunk to almost nothing. No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { axes, curve, guides, label, on, strips, under, type Graph, type Rule } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import { beadAt } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { ramp, standing, walk, type Ramp } from './r40-partial'

const FX: Tok[] = [{ fn: 'f' }, '(', 'x', ')']
const SUM: Tok[] = [{ big: 'Σ', k: 'sig' }, ...FX, 'Δ', 'x']
/** ∫ f(x) dx, with its two ends when it has them. */
const integral = (what: Tok[], by = 'x', ends?: [string, string]): Tok[] => [{ big: '∫', ...(ends ? { from: ends[0], to: ends[1] } : {}), k: 'int' }, ...what, { d: by, k: 'by' }]

/** A curve that keeps climbing, so strips as tall as their left edge always fit under it. */
const G: Graph = { x: 170, y: 820, ux: 190, uy: 160, w: 4.4, h: 3.8 }
const RISE: Rule = { id: 'rise', f: (x) => 0.5 + 0.18 * x * x }
const sheet = (): Sprite[] => [...axes(G, { names: ['x', 'y'] }), curve('curve', G, RISE, { from: 0, to: 4.3 })]
const SIDE = { x: 1500, size: 150 }
/** One strip of eight picked out, with its height and its width named. */
const PICK = 5
const named = (): Sprite[] => [...label('tall', FX, { x: on(G, 2.45, 0).x, y: on(G, 0, RISE.f(3)).y - 90 }), ...label('wide', ['Δ', 'x'], { x: on(G, 2.75, 0).x, y: G.y + 64 })]
/** The start and the end, a and b, on the x axis. */
const ENDS = { a: 1, b: 3.5 }
const ends = (): Sprite[] => [guides('ga', G, ENDS.a, RISE.f(ENDS.a), { across: false }), guides('gb', G, ENDS.b, RISE.f(ENDS.b), { across: false }), ...label('a', ['a'], { x: on(G, ENDS.a, 0).x, y: G.y + 64 }, { size: 90 }), ...label('b', ['b'], { x: on(G, ENDS.b, 0).x, y: G.y + 64 }, { size: 90 })]

/** Under the line y = x from zero to two: half of a two by two square. */
const G2: Graph = { x: 260, y: 850, ux: 250, uy: 250, w: 2.4, h: 2.4 }
const LINEAR: Rule = { id: 'x', f: (x) => x }
const slope = (): Sprite[] => [...axes(G2, { xs: [1, 2], ys: [1, 2], names: ['x', 'y'] }), guides('box', G2, 2, 2), curve('curve', G2, LINEAR, { from: 0, to: 2.3 })]
const total = (sum: string): Sprite[] => line([{ big: 'Σ', k: 'sig' }, 'x', 'Δ', 'x', '=', { g: sum, k: 'sum' }], { x: 1440, y: 760, size: 108 })

/** A steady speed: two steps each second. */
const G3: Graph = { x: 260, y: 850, ux: 250, uy: 190, w: 3.6, h: 2.8 }
const FLAT: Rule = { id: '2', f: () => 2 }

/** His turn: the line at two; each move stands one strip under it, one wide and two beads tall. */
const G4: Graph = { x: 610, y: 810, ux: 100, uy: 100, w: 6.6, h: 2.6 }
const ZONE = { x: G4.x - 60, y: G4.y - 3.4 * G4.uy, w: 6.6 * G4.ux + 120, h: 3.4 * G4.uy + 20 }
function stood(n: number): Patch {
  return {
    graph: [...axes(G4, { xs: [1, 2, 3, 4, 5, 6], ys: [1, 2], names: ['x', null] }), curve('curve', G4, FLAT, { from: 0, to: 6.5 })],
    beads: Array.from({ length: 2 * n }, (_, m) => ({ ...beadAt(`b${m}`, on(G4, Math.floor(m / 2) + 0.5, 0).x, on(G4, 0, (m % 2) + 0.5).y, G4.ux * 0.9, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
    line: line([...integral(['2'], 'x', ['0', String(n)]), '=', { g: String(2 * n), k: 'made' }], { y: 270, size: 150, gold: n === 4 ? ['made'] : [] }),
  }
}

/** The closing question: a slope of ground (rank 40's picture). */
const R: Ramp = { x: 560, y: 900, u: 136 }

export const r39: Spec = {
  rank: 39,
  id: 'r39',
  title: 'Integrals',
  layers: ['area', 'graph'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { area: [strips('strips', G, RISE, 0, 4, 4)], graph: sheet() },
      say: 'How much room is under this curve? Strips can measure it. Will thinner strips fit better, or worse?',
      turn: { kind: 'predict', id: 'fit', prompt: 'Will thinner strips fit better, or worse?', options: [{ label: 'Better' }, { label: 'Worse' }] },
    },
    { stage: { area: [strips('strips', G, RISE, 0, 4, 8)] }, say: 'Better. Thinner strips leave less out.' },
    {
      stage: { area: [strips('strips', G, RISE, 0, 4, 8, { gold: [PICK] })], names: named(), sum: line(SUM, { x: SIDE.x, y: 480, size: SIDE.size }) },
      say: 'Each strip is f of x tall, and delta x wide. Sigma adds them all.',
    },
    {
      clear: ['area', 'graph'],
      stage: { area: [strips('strips', G, RISE, 0, 4, 16)], sum: line([{ big: 'lim', from: ['Δ', 'x', '→', '0'] }, ...SUM], { x: SIDE.x, y: 480, size: 112 }) },
      also: [
        { at: 1.6, stage: { area: [strips('strips', G, RISE, 0, 4, 32)] } },
        { at: 3.6, stage: { area: [under('fill', G, RISE, 0, 4)] }, move: 1.4 },
      ],
      say: 'Thinner and thinner: the limit of that sum is the area, exactly. But it is a lot to write.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(integral(FX), { y: 480, size: 260, gold: ['int'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This sign is the integral. It stands for that whole limit of a sum.' },
    {
      stage: { old: line(SUM, { y: 280, size: 170, gold: ['sig'] }), line: line(integral(FX), { y: 700, size: 170, gold: ['int'] }) },
      say: 'Sigma is the Greek S, for sum. The integral sign is an S too, stretched tall.',
    },
    {
      stage: { old: line(SUM, { y: 280, size: 170, gold: ['Δ', 'x#1'] }), line: line(integral(FX), { y: 700, size: 170, gold: ['by'] }) },
      move: 0.5,
      say: "And d x is the strip's width: delta x, shrunk to almost nothing.",
    },
    {
      clear: true,
      stage: { area: [under('fill', G, RISE, ENDS.a, ENDS.b)], graph: [...sheet(), ...ends()], line: line(integral(FX, 'x', ['a', 'b']), { x: SIDE.x, y: 480, size: 170 }) },
      say: 'The start, a, sits at its foot. The end, b, at its top.',
    },
    { stage: { line: line(integral(FX, 'x', ['a', 'b']), { x: SIDE.x, y: 480, size: 170, gold: ['int'] }) }, move: 0.5, say: 'We read it: the integral from a to b of f of x, d x.', poster: true },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { area: [under('fill', G2, LINEAR, 0, 2)], graph: slope(), line: line([...integral(['x'], 'x', ['0', '2']), '=', '2'], { x: 1440, y: 400, size: 140 }) },
      say: 'Under the line y equals x, from zero to two, is half a two by two square. So the integral from zero to two of x, d x, equals two.',
    },
    {
      stage: { area: [strips('strips', G2, LINEAR, 0, 2, 4)], total: total('1.5') },
      also: [
        { at: 3.0, stage: { area: [strips('strips', G2, LINEAR, 0, 2, 8)], total: total('1.75') } },
        { at: 5.6, stage: { area: [strips('strips', G2, LINEAR, 0, 2, 16)], total: total('1.875') } },
      ],
      say: 'Strips agree: four make one and a half, eight make one and three quarters. The limit is two.',
    },
    {
      clear: true,
      stage: {
        area: [under('fill', G3, FLAT, 0, 3)],
        graph: [...axes(G3, { xs: [1, 2, 3], ys: [1, 2], names: ['t', 'v'] }), guides('end', G3, 3, 2, { across: false }), curve('curve', G3, FLAT, { from: 0, to: 3.4 })],
        line: line([...integral(['2'], 't', ['0', '3']), '=', '6'], { x: 1550, y: 480, size: 125 }),
      },
      say: 'When the line shows speed, the area under it is how far you went. Two a second, for three seconds: six steps.',
    },
    {
      clear: true,
      stage: { rule: line(['y', '=', 'x', { sup: '2' }], { x: 560, y: 300, size: 160 }), slope: line([{ frac: [[{ d: 'y' }], [{ d: 'x' }]] }, '=', '2', 'x'], { x: 1320, y: 300, size: 160 }) },
      say: 'The integral also undoes the derivative. The slope of x squared is two x.',
    },
    {
      stage: { line: line([...integral(['2', 'x']), '=', 'x', { sup: '2' }], { y: 720, size: 200, gold: ['int'] }) },
      say: 'So the integral of two x, d x, is x squared. No ends: the answer is a function.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Start at one. Stop at four. Which one says that?',
      turn: { kind: 'choose', id: 'ends14', prompt: 'Start at one. Stop at four.', cards: [integral(FX, 'x', ['1', '4']), integral(FX, 'x', ['4', '1'])], right: 0 },
    },
    {
      clear: true,
      say: 'Each strip is one wide and two tall. Add strips until the integral equals eight.',
      turn: { kind: 'build', id: 'strips8', prompt: 'Add strips until the integral equals eight.', target: 4, max: 6, unit: 2, zone: ZONE, state: stood },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line([...integral(FX, 'x', ['1', '4']), '=', '9'], { y: 480, size: 220 }) },
      move: 0.6,
      say: 'The integral from one to four of f of x, d x, equals nine.',
      turn: { kind: 'read', id: 'readint', prompt: 'You read it.' },
    },
    {
      clear: true,
      teaser: true,
      stage: { ground: [ramp('ramp', R), standing(R)], rule: line([{ fn: 'h' }, '(', 'x', ',', 'y', ')'], { y: 230, size: 150 }) },
      say: 'On this slope, the height depends on two numbers: how far east, and how far north.',
    },
    { teaser: true, stage: { east: walk(R, 'east'), north: walk(R, 'north') }, say: 'How steep is it? That depends on which way you walk. How do we write that?', pad: 1 },
  ],
}
