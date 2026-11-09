/**
 * Rank 4, ÷ / and the fraction bar: beads dealt out onto plates. The signs
 * on the paper are =, ×, −, ÷, / and the bar only. Divide shares into equal
 * parts, counts how many of one amount are in another, and undoes times;
 * the slash and the bar are the same sign in other places.
 *
 * The three are tied to each other by how they look (÷ as a little fraction,
 * a dot where each number goes); that is a likeness, not a claim about where
 * ÷ came from. No names or dates are narrated. (Checked, should one be
 * wanted: Johann Rahn, Zürich, 1659, the first printed ÷; the bar is in use
 * by the 12th century and in Fibonacci's Liber Abaci, 1202.)
 */
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { B } from '../kit/look'
import { grid, line, row, type Sprite } from '../kit/sprites'
import { onPlate, plate, PLATE_BEAD, TOP } from './shared'

const PLATE_Y = 790
const THREE = [560, 960, 1360]
const TWO = [700, 1220]
const plates = (xs: number[]) => xs.map((x, i) => plate(`p${i}`, x, PLATE_Y))

const bead = (k: string, x: number, y: number, size = PLATE_BEAD, half = 0): Sprite => ({ k, type: 'bead', n: { x, y, s: size / B, o: 1, ghost: 0, half }, d: {} })

/** `total` beads, the first `dealt` of them out on the plates (one to each in turn), the rest still at `heap`. */
const share = (total: number, dealt: number, xs: number[], heap: { x: number; y: number }[]) =>
  Array.from({ length: total }, (_, i) => {
    const at = i < dealt ? onPlate(xs[i % xs.length], PLATE_Y, Math.floor(i / xs.length)) : heap[i]
    return bead(`d${i}`, at.x, at.y)
  })

const HEAP12 = grid(12, 6, 960, 420, 70)
/** The same twelve as four threes in a row. */
const threes = () => Array.from({ length: 12 }, (_, i) => bead(`d${i}`, 960 + (Math.floor(i / 3) - 1.5) * 300 + ((i % 3) - 1) * 68, 600))
const TRAY8 = row(8, SUPPLY.x, SUPPLY.y, 48)

/** One bead cut in two: together, or one half on each plate. */
const halves = (apart: boolean): Sprite[] =>
  [-1, 1].map((side, i) => {
    const size = 120
    const at = apart ? { x: TWO[i], y: PLATE_Y - size / 2 } : { x: 960 + side * (size / 4), y: 430 }
    return bead(`half${i}`, at.x, at.y, size, side)
  })

export const r04: Spec = {
  rank: 4,
  id: 'r04',
  title: 'Divide',
  layers: ['plates'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { plates: plates(THREE), beads: share(12, 0, THREE, HEAP12) },
      say: 'Twelve beads, to share between three plates. Will any be left over?',
      turn: { kind: 'predict', id: 'left', prompt: 'Will any be left over?', options: [{ label: 'None left' }, { label: 'Some left' }] },
    },
    {
      also: Array.from({ length: 12 }, (_, i) => ({ at: 0.1 + i * 0.4, move: 0.45, cue: 'bead' as const, stage: { beads: share(12, i + 1, THREE, HEAP12) } })),
      say: 'One for you, one for you, one for you. Round and round, until they are all gone.',
    },
    { say: 'Four on each plate. None left over.' },
    { stage: { line: line(['12', '_', '3', '=', '4'], { y: TOP, gold: ['_'] }) }, say: 'Twelve, shared between three, is four each. We need a sign for "shared".' },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: line(['12', '÷', '3', '=', '4'], { y: TOP, gold: ['÷'] }) }, quiet: 1.4, motif: true, say: 'This is the divide sign.' },
    { stage: { line: line(['12', '÷', '3', '=', '4'], { y: TOP }) }, move: 0.5, say: 'Twelve divided by three equals four.', poster: true },
    { stage: { line: line(['12', '÷', '3', '=', '4'], { y: TOP, gold: ['÷'] }) }, move: 0.5, say: 'Divide shares an amount into equal parts.' },
    { stage: { plates: null, beads: threes() }, move: 1.3, cue: 'slide', say: 'Divide can also ask: how many threes are in twelve? Four.' },
    { stage: { back: line(['4', '×', '3', '=', '12'], { y: 840, size: 130 }) }, say: 'Four, three times, makes twelve. Divide undoes times.' },

    // ── 3. Where it is used ──
    { act: 3, clear: true, stage: { line: line(['12', '÷', '3', '=', '4'], { y: 230, size: 140 }) }, say: 'There are other ways to write divide.' },
    { stage: { slash: line(['12', '/', '3', '=', '4'], { y: 520, size: 140 }) }, quiet: 1.5, motif: true, say: 'This slash also means divide. You will see it on keyboards and screens.' },
    { stage: { bar: line([{ frac: ['12', '3'] }, '=', '4'], { y: 830, size: 190 }) }, quiet: 1.5, motif: true, say: 'And so does the line in a fraction. Twelve over three equals four.' },
    {
      stage: { line: line(['12', '÷', '3', '=', '4'], { y: 230, size: 140, gold: ['÷'] }), bar: line([{ frac: ['12', '3'] }, '=', '4'], { y: 830, size: 190, gold: ['frac'] }) },
      move: 0.5,
      say: 'The divide sign looks like a little fraction: a line, with a dot where each number goes.',
    },
    { clear: true, stage: { plates: plates(TWO), halves: halves(false) }, say: 'One bead, to share between two plates.' },
    { stage: { halves: halves(true), line: line(['1', '÷', '2', '=', { frac: ['1', '2'] }], { y: TOP }) }, move: 1.2, cue: 'break', say: 'One divided by two equals one half.' },
    { stage: { line: line(['1', '÷', '2', '=', { frac: ['1', '2'] }], { y: TOP, gold: ['frac'] }) }, move: 0.5, say: 'The top number is shared out. The bottom number says how many shares.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Share eight between two plates. How many on each?',
      turn: {
        kind: 'build',
        id: 'share8',
        prompt: 'Share eight between two plates.',
        target: 4,
        max: 4,
        unit: 2,
        supply: 'empty',
        zone: { x: 480, y: 470, w: 960, h: 390 },
        state: (n) => ({
          plates: plates(TWO),
          beads: share(8, 2 * n, TWO, TRAY8).map((s, i) => (i < 2 * n ? s : { ...s, n: { ...s.n, s: 1 } })),
          line: line(['8', '÷', '2', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: TOP, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
        }),
      },
    },
    {
      clear: true,
      say: 'Which sign makes this true?',
      turn: { kind: 'place', id: 'sign3', prompt: 'Which sign makes it true?', toks: ['6', '_', '2', '=', '3'], tiles: ['−', '×', '÷'], right: '÷', under: true },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([{ frac: ['10', '5'] }, '=', '2'], { y: 480, size: 230 }) }, move: 0.6, say: 'Ten over five equals two.', turn: { kind: 'read', id: 'read10', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { line: line(['2', '+', '3', '×', '4', '=', '?'], { y: 460, size: 170 }) }, say: 'Two plus three times four.' },
    { teaser: true, stage: { line: line(['2', '+', '3', '×', '4', '=', '?'], { y: 460, size: 170, gold: ['+', '×'] }) }, move: 0.5, say: 'Which do we do first?', pad: 1 },
  ],
}
