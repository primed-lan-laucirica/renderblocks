/**
 * Rank 36, delta: the change in. The signs on the paper are those of ranks
 * 1–6, letters (rank 12), labels set low (rank 14) and the delta itself.
 * Δx is how much x has changed: the new number minus the old one, so it is
 * below zero when x has gone down, and it is one thing, not delta times x.
 * Where it is used: wherever something changes (a temperature), the slope
 * of a line (the change up over the change across) and speed (how far over
 * how long).
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { axes, chord, curve, label, legsAt, SQUARE, type Graph, type Rule } from '../kit/calculus'
import type { Tok } from '../kit/glyphs'
import { beadAt, hop, numberLine, onLine, type Ruler } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const DX: Tok[] = ['Δ', 'x']

/** The number line x moves along. */
const R: Ruler = { x0: 240, x1: 1680, y: 760, from: 0, to: 20 }
const BEAD = 60
/** The old number (gold) and the new one (blue) on the line, each with its name under it once it has one. */
const marks = (old: number, now: number, named = false): Sprite[] => [
  beadAt('old', onLine(R, old), R.y - 56, BEAD),
  beadAt('new', onLine(R, now), R.y - 56, BEAD, 'blue'),
  ...(named ? [...label('x1', ['x', { sub: '1' }], { x: onLine(R, old), y: R.y + 170 }, { size: 84 }), ...label('x2', ['x', { sub: '2' }], { x: onLine(R, now), y: R.y + 170 }, { size: 84 })] : []),
]
const ruler = () => numberLine(R, { size: 40 })
const MID = { y: 400, size: 180 }

/** A straight line on a graph: y = 2x, through (1, 2) and (4, 8). */
const G: Graph = { x: 250, y: 920, ux: 120, uy: 84, w: 5, h: 9 }
const STRAIGHT: Rule = { id: '2x', f: (x) => 2 * x }
const slope = (legs: boolean): Sprite[] => [...axes(G, { xs: [1, 4], ys: [2, 8], names: ['x', 'y'] }), curve('line', G, STRAIGHT, { from: 0, to: 4.5 }), chord('step', G, STRAIGHT, 1, 3, { reach: 0, legs })]
const SIDE = { x: 1380, size: 120 }
const steps = (): Sprite[] => {
  const at = legsAt(G, STRAIGHT, 1, 3)
  return [...label('dx', DX, at.across), ...label('dy', ['Δ', 'y'], at.up)]
}

/** The closing question: a curve, and the line through two of its points. */
const C: Graph = { x: 330, y: 930, ux: 300, uy: 150, w: 2.4, h: 5 }
const bent = (h: number): Sprite[] => [...axes(C, { names: ['x', 'y'] }), curve('curve', C, SQUARE, { to: 2.3 }), chord('step', C, SQUARE, 1, h, { reach: 0.5, legs: true })]

/** His turn: x was three (the gold beads); each bead he adds is one more of change. */
const TOWER = { x: 1080, y: 770, size: 56, old: 3 }
const ZONE = { x: TOWER.x - 260, y: 130, w: 520, h: 680 }
function grown(n: number): Patch {
  const beads = (k: string, x: number, count: number): Sprite[] =>
    Array.from({ length: count }, (_, j) => ({ ...beadAt(`${k}${j}`, x, TOWER.y - TOWER.size / 2 - j * TOWER.size * 1.08, TOWER.size, j < TOWER.old ? undefined : 'blue'), ...(j < TOWER.old ? {} : { enter: { x: SUPPLY.x, y: SUPPLY.y } }) }))
  return {
    before: [...beads('a', 700, TOWER.old), ...label('x1', ['x', { sub: '1' }, '=', '3'], { x: 700, y: TOWER.y + 70 }, { size: 80 })],
    after: [...beads('b', TOWER.x, TOWER.old + n), ...label('x2', ['x', { sub: '2' }, '=', String(TOWER.old + n)], { x: TOWER.x, y: TOWER.y + 70 }, { size: 80 })],
    line: line([...DX, '=', { g: String(n), k: 'made' }], { x: 1560, y: 520, size: 150, gold: n === 4 ? ['made'] : [] }),
  }
}

export const r36: Spec = {
  rank: 36,
  id: 'r36',
  title: 'Change in',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { axis: ruler(), marks: marks(12, 15), was: line(['x', '=', '12'], { x: 620, y: TOP, size: 140 }), now: line(['x', '=', '15'], { x: 1300, y: TOP, size: 140 }) },
      say: 'X was twelve. Now x is fifteen. How much did it change?',
      turn: { kind: 'predict', id: 'howmuch', prompt: 'How much did x change?', options: [{ label: 'Three' }, { label: 'Twenty-seven' }] },
    },
    { stage: { hop: [hop('hop', R, 12, 15)], line: line(['15', '−', '12', '=', '3'], MID) }, say: 'Three. Fifteen minus twelve is three.' },
    {
      stage: { line: line([{ g: '?', k: 'ask' }, '=', '3'], { ...MID, gold: ['ask'] }) },
      say: 'How far did it move? How much did it grow? Each one asks for a change. We need a short way to write: the change in x.',
    },

    // ── 2. What the sign does ──
    { act: 2, clear: ['axis', 'marks', 'hop'], stage: { line: line(DX, { y: 400, size: 280, gold: ['Δ'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'This sign is delta. Put before x, it says: the change in x.' },
    { stage: { line: line([...DX, '=', '3'], { y: 400, size: 230 }) }, say: 'We read it: delta x equals three.', poster: true },
    { stage: { line: line([...DX, '=', '15', '−', '12'], { ...MID, gold: ['Δ', '−'] }) }, say: 'Delta is the Greek capital D, for difference. A difference is what subtracting gives.' },
    {
      stage: { marks: marks(12, 15, true), line: line([...DX, '=', 'x', { sub: '2' }, '−', 'x', { sub: '1' }], MID) },
      say: 'Call the old number x one, and the new number x two. Delta x equals x two minus x one. Always the new one minus the old one.',
    },
    { stage: { line: line([...DX, '=', 'x', { sub: '2' }, '−', 'x', { sub: '1' }], { ...MID, gold: ['Δ', 'x#0'] }) }, move: 0.5, say: 'Delta x is one thing: one number. It does not mean delta times x.' },
    {
      stage: { marks: marks(12, 9, true), hop: [hop('hop', R, 12, 9)], line: line([...DX, '=', '9', '−', '12', '=', '−3'], MID) },
      say: 'Now x goes from twelve down to nine. Nine minus twelve is minus three. When x goes down, delta x is below zero.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: ['axis'],
      stage: { marks: marks(8, 18), hop: [hop('hop', R, 8, 18)], line: line(['Δ', 'T', '=', '18', '−', '8', '=', '10'], MID) },
      say: 'Delta is used wherever something changes. In the morning it was eight degrees. At noon it was eighteen. Delta T equals ten.',
    },
    {
      clear: true,
      stage: { graph: slope(true), steps: steps(), across: line([...DX, '=', '4', '−', '1', '=', '3'], { x: SIDE.x, y: 300, size: SIDE.size }) },
      say: 'Two changes can be compared. Along this line, x goes from one to four: delta x is three.',
    },
    { stage: { up: line(['Δ', 'y', '=', '8', '−', '2', '=', '6'], { x: SIDE.x, y: 480, size: SIDE.size }) }, say: 'And y goes from two to eight: delta y is six.' },
    {
      stage: { ratio: line([{ frac: [['Δ', 'y'], DX] }, '=', { frac: ['6', '3'] }, '=', '2'], { x: SIDE.x, y: 760, size: 170 }) },
      say: 'Delta y over delta x is two. For every step across, the line climbs two. That number is the slope.',
    },
    {
      clear: true,
      stage: { line: line([{ frac: [DX, ['Δ', 't']] }, '=', { frac: ['60', '10'] }, '=', '6'], { y: 500, size: 230 }) },
      say: 'Speed is the same idea. Delta x, how far, over delta t, how long. Sixty steps in ten seconds is six steps each second.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { was: line(['x', { sub: '1' }, '=', '4'], { x: 660, y: TOP, size: 130 }), now: line(['x', { sub: '2' }, '=', '10'], { x: 1260, y: TOP, size: 130 }) },
      say: 'X one is four, and x two is ten. Which one is true?',
      turn: { kind: 'choose', id: 'four10', prompt: 'Which one is true?', cards: [[...DX, '=', '6'], [...DX, '=', '14']], right: 0 },
    },
    {
      clear: true,
      say: 'X was three. Add beads until delta x equals four.',
      turn: { kind: 'build', id: 'grow4', prompt: 'Add beads until delta x equals four.', target: 4, max: 7, zone: ZONE, state: grown },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['Δ', 'y', '=', '5'], { y: 480, size: 250 }) }, move: 0.6, say: 'Delta y equals five.', turn: { kind: 'read', id: 'ready5', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { graph: bent(1), ratio: line([{ frac: [['Δ', 'y'], DX] }], { x: 1440, y: 440, size: 260 }) },
      say: 'On a curve, the slope keeps changing. Delta y over delta x gives the slope between two points.',
    },
    { teaser: true, stage: { graph: bent(0.12) }, move: 3, say: 'Bring the points closer, and closer. What does the slope get close to?', pad: 1 },
  ],
}
