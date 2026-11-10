/**
 * Rank 40, the partial derivative. The signs on the paper are those of
 * ranks 1–5, letters (rank 12), functions (rank 15), delta (rank 36), the
 * upright d of rank 38 and the rounded d itself. When f depends on two
 * letters, how fast it changes depends on which one moves: ∂f/∂x says "move
 * x, and hold every other letter still". For a block of beads x wide and
 * y tall, a step in x brings on a column y tall (∂f/∂x = y) and a step in
 * y a row x wide (∂f/∂y = x). Where it is used: the slope of the ground
 * going east and going north, and a temperature that depends on the place
 * and on the time.
 *
 * The one tie between signs: the partial sign is a d made round. No names
 * or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { label } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import { arrow, dot, PEN } from '../kit/logic'
import { INK } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, loose, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

/** ∂f/∂x, for any two letters. */
const part = (top: string, bottom: string, k?: string): Tok => ({ frac: [[{ d: top, round: true }], [{ d: bottom, round: true }]], ...(k ? { k } : {}) })
const DFDX: Tok = { frac: [[{ d: 'f' }], [{ d: 'x' }]] }
const FXY: Tok[] = [{ fn: 'f' }, '(', 'x', ',', 'y', ')', '=', 'x', '·', 'y']

/** A block of beads, x wide and y tall: f(x, y) is how many there are. */
interface Block {
  x: number
  y: number
  step: number
}
const BLOCK: Block = { x: 380, y: 790, step: 90 }
const cell = (b: Block, i: number, j: number): Pt => ({ x: b.x + (i + 0.5) * b.step, y: b.y - (j + 0.5) * b.step })
/** The block with its two sides named; `more` puts on one more column (x) or one more row (y), in blue. */
function block(x: number, y: number, more?: 'x' | 'y', b = BLOCK): Sprite[] {
  const size = b.step * 0.92
  const bead = (k: string, i: number, j: number, added = false): Sprite => ({ ...beadAt(k, cell(b, i, j).x, cell(b, i, j).y, size, added ? 'blue' : undefined), ...(added ? { enter: more === 'x' ? { x: cell(b, i, j).x + 260 } : { y: cell(b, i, j).y - 260 } } : {}) })
  const wide = x + (more === 'x' ? 1 : 0)
  const tall = y + (more === 'y' ? 1 : 0)
  return [
    ...Array.from({ length: x * y }, (_, n) => bead(`b${n % x}.${Math.floor(n / x)}`, n % x, Math.floor(n / x))),
    ...(more === 'x' ? Array.from({ length: y }, (_, j) => bead(`col${j}`, x, j, true)) : []),
    ...(more === 'y' ? Array.from({ length: x }, (_, i) => bead(`row${i}`, i, y, true)) : []),
    ...label('wide', ['x', '=', String(wide)], { x: b.x + (wide * b.step) / 2, y: b.y + 64 }),
    ...label('tall', ['y', '=', String(tall)], { x: b.x - 150, y: b.y - (tall * b.step) / 2 }),
  ]
}
const SIDE = { x: 1400, size: 150 }

/**
 * A slope of ground, drawn as a wedge: east (x) runs to the right and
 * climbs, north (y) runs away from us and stays level. Its near corner is
 * at (x, y) on the paper and one step is `u` long.
 */
export interface Ramp {
  x: number
  y: number
  u: number
}
const WEDGE = { wide: 4, deep: 3, rise: 0.5, north: { x: 0.4, y: -0.6 } }
/** Where the ground x steps east and y steps north is on the paper (at height h, or on the slope). */
export const onRamp = (r: Ramp, x: number, y: number, h = x * WEDGE.rise): Pt => ({ x: r.x + (x + y * WEDGE.north.x) * r.u, y: r.y + (y * WEDGE.north.y - h) * r.u })
export function ramp(k: string, r: Ramp, o: { fade?: number } = {}): Sprite {
  const at = (x: number, y: number, h?: number) => {
    const p = onRamp(r, x, y, h)
    return `${p.x},${p.y}`
  }
  const { wide, deep } = WEDGE
  return {
    k,
    type: 'custom',
    n: { o: o.fade ?? 1 },
    d: {
      id: `ramp ${r.x} ${r.y} ${r.u}`,
      draw: () => (
        <g stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
          <polygon points={`${at(wide, 0, 0)} ${at(wide, deep, 0)} ${at(wide, deep)} ${at(wide, 0)}`} fill={INK} fillOpacity={0.18} />
          <polygon points={`${at(0, 0)} ${at(wide, 0, 0)} ${at(wide, 0)}`} fill={INK} fillOpacity={0.08} />
          <polygon points={`${at(0, 0)} ${at(wide, 0)} ${at(wide, deep)} ${at(0, deep)}`} fill={PEN.green} fillOpacity={0.2} />
          <g strokeWidth={3} opacity={0.35}>
            {Array.from({ length: wide - 1 }, (_, i) => (
              <polyline key={`x${i}`} points={`${at(i + 1, 0)} ${at(i + 1, deep)}`} fill="none" />
            ))}
            {Array.from({ length: deep - 1 }, (_, j) => (
              <polyline key={`y${j}`} points={`${at(0, j + 1)} ${at(wide, j + 1)}`} fill="none" />
            ))}
          </g>
        </g>
      ),
    },
  }
}
/** Someone standing on the slope, and the two ways to walk from there: east (red, x) and north (blue, y). */
const STAND = { x: 1, y: 1 }
export const standing = (r: Ramp): Sprite => dot('stand', onRamp(r, STAND.x, STAND.y), { r: 17 })
export function walk(r: Ramp, way: 'east' | 'north'): Sprite[] {
  const from = onRamp(r, STAND.x, STAND.y)
  const to = way === 'east' ? onRamp(r, STAND.x + 2, STAND.y) : onRamp(r, STAND.x, STAND.y + 1.4)
  return [
    arrow(way, from, to, { gap: 22, pen: way === 'east' ? 'red' : 'blue', w: 10 }),
    ...label(`${way}/name`, [way === 'east' ? 'x' : 'y'], way === 'east' ? { x: to.x + 24, y: to.y - 66 } : { x: to.x + 6, y: to.y - 88 }, { size: 84 }),
  ]
}
const R: Ramp = { x: 170, y: 900, u: 136 }

/** His turn: a block three wide; each row he adds makes the next column one taller. */
const MINE: Block = { x: 640, y: 800, step: 76 }
const ZONE = { x: MINE.x - 80, y: 300, w: 3 * MINE.step + 260, h: 540 }
function rows(n: number): Patch {
  const size = MINE.step * 0.92
  return {
    block: [
      ...Array.from({ length: 3 * n }, (_, m) => ({ ...beadAt(`b${m}`, cell(MINE, m % 3, Math.floor(m / 3)).x, cell(MINE, m % 3, Math.floor(m / 3)).y, size), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
      ...loose(
        Array.from({ length: n }, (_, j) => cell(MINE, 3, j)),
        { s: size / 40, colour: 'blue', ghost: () => 1, k: 'next' },
      ),
      ...label('wide', ['x', '=', '3'], { x: MINE.x + 1.5 * MINE.step, y: MINE.y + 60 }),
    ],
    given: line(FXY, { y: 160, size: 110 }),
    line: line([part('f', 'x'), '=', 'y', '=', { g: String(n), k: 'made' }], { x: 1400, y: 520, size: 135, gold: n === 4 ? ['made'] : [] }),
  }
}

export const r40: Spec = {
  rank: 40,
  id: 'r40',
  title: 'Partial derivative',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { rule: line(FXY, { y: TOP, size: 130 }), block: block(4, 3), count: line(['4', '·', '3', '=', '12'], { x: SIDE.x, y: 560, size: SIDE.size }) },
      say: 'A block of beads, x wide and y tall, holds x times y beads. Make x one bigger. How many beads come on?',
      turn: { kind: 'predict', id: 'onemore', prompt: 'x grows by one. How many beads come on?', options: [{ label: 'Three' }, { label: 'Four' }] },
    },
    { stage: { block: block(4, 3, 'x'), count: line(['Δ', 'f', '=', '3'], { x: SIDE.x, y: 560, size: SIDE.size }) }, say: 'Three. One new column, as tall as y.' },
    { stage: { block: block(4, 3, 'y'), count: line(['Δ', 'f', '=', '4'], { x: SIDE.x, y: 560, size: SIDE.size }) }, say: 'Make y one bigger instead, and four come on: one new row, as wide as x.' },
    {
      clear: true,
      stage: { line: line([DFDX, '=', { g: '?', k: 'ask' }], { y: 480, size: 240, gold: ['ask'] }) },
      say: 'With one letter, the slope was d f, d x. Now it depends on which letter moves. We need a sign that says: move this one, hold the others still.',
    },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: line([part('f', 'x', 'part')], { y: 480, size: 300, gold: ['part'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This is a partial derivative. We read it: partial f, partial x.' },
    {
      stage: { line: line([part('f', 'x', 'part')], { x: 1320, y: 480, size: 260, gold: ['part'] }), old: line([DFDX], { x: 600, y: 480, size: 260 }) },
      say: 'Its sign is a d made round. Partial: one part of the change. X moves; every other letter stays still.',
    },
    {
      clear: true,
      stage: { rule: line(FXY, { y: TOP, size: 130 }), block: block(4, 3, 'x'), dx: line([part('f', 'x', 'px'), '=', 'y'], { x: SIDE.x, y: 470, size: SIDE.size }) },
      say: 'In the block, each step in x brings on one column, y tall. So partial f, partial x, equals y.',
    },
    {
      stage: { block: block(4, 3, 'y'), dy: line([part('f', 'y', 'py'), '=', 'x'], { x: SIDE.x, y: 760, size: SIDE.size }) },
      say: 'Each step in y brings on one row, x wide. So partial f, partial y, equals x.',
    },
    {
      stage: { block: block(4, 3), dx: line([part('f', 'x', 'px'), '=', 'y'], { x: SIDE.x, y: 470, size: SIDE.size, gold: ['px'] }), dy: line([part('f', 'y', 'py'), '=', 'x'], { x: SIDE.x, y: 760, size: SIDE.size, gold: ['py'] }) },
      move: 0.5,
      say: 'One f, two answers. The letter underneath says which one moved.',
      poster: true,
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { ground: [ramp('ramp', R), standing(R)], rule: line([{ fn: 'h' }, '(', 'x', ',', 'y', ')'], { x: 520, y: 230, size: 140 }) },
      say: 'On this slope, the height h depends on two numbers: how far east, x, and how far north, y.',
    },
    {
      stage: { east: walk(R, 'east'), dx: line([part('h', 'x'), '=', { frac: ['1', '2'] }], { x: SIDE.x + 40, y: 400, size: SIDE.size }) },
      say: 'Walk east, and you climb one for every two steps. Partial h, partial x, is one half.',
    },
    { stage: { north: walk(R, 'north'), dy: line([part('h', 'y'), '=', '0'], { x: SIDE.x + 40, y: 720, size: SIDE.size }) }, say: 'Walk north, and you stay level. Partial h, partial y, is zero.' },
    {
      clear: true,
      stage: { rule: line([{ fn: 'T' }, '(', 'x', ',', 't', ')'], { y: 230, size: 170 }), dt: line([part('T', 't', 'pt')], { x: 640, y: 640, size: 240, gold: ['pt'] }) },
      say: 'Temperature, T, depends on the place, x, and the time, t. Partial T, partial t, says how fast one place warms up.',
    },
    { stage: { dt: line([part('T', 't', 'pt')], { x: 640, y: 640, size: 240 }), dx: line([part('T', 'x', 'px')], { x: 1280, y: 640, size: 240, gold: ['px'] }) }, say: 'And partial T, partial x, says how it changes from place to place, at one moment.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(FXY, { y: TOP, size: 130 }) },
      say: 'F is x times y. Which one is true?',
      turn: { kind: 'choose', id: 'whichpart', prompt: 'Which one is true?', cards: [[part('f', 'x'), '=', 'y'], [part('f', 'x'), '=', 'x']], right: 0 },
    },
    {
      clear: true,
      say: 'This block is three wide. Add rows until partial f, partial x, equals four.',
      turn: { kind: 'build', id: 'rows4', prompt: 'Add rows until partial f, partial x, equals four.', target: 4, max: 6, unit: 3, zone: ZONE, state: rows },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([part('f', 'y'), '=', '2'], { y: 480, size: 260 }) }, move: 0.6, say: 'Partial f, partial y, equals two.', turn: { kind: 'read', id: 'readpart', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { ground: [ramp('ramp', { ...R, x: 560 }), standing({ ...R, x: 560 })], east: walk({ ...R, x: 560 }, 'east').slice(0, 1) },
      say: 'On a slope, one way is the steepest of all. To point that way takes more than one number.',
    },
    { teaser: true, stage: { ask: line([{ g: '?', k: 'ask' }], { x: 520, y: 260, size: 220, gold: ['ask'] }) }, say: 'Can one sign carry both a size and a direction?', pad: 1 },
  ],
}
