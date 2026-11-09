/**
 * Rank 4, ÷ / and the fraction bar: beads dealt out onto plates. The signs
 * on the paper are =, ×, −, ÷, / and the bar only.
 *
 * History (checked): Johann Rahn, Teutsche Algebra, Zürich, 1659, the first
 * printed ÷ for dividing. The fraction bar came into use among Arab
 * mathematicians (al-Hassar, 12th century, is the usual first citation) and
 * Fibonacci's Liber Abaci (1202) carried it into Europe. Not narrated: a
 * single inventor of the bar, or who first used the slash.
 */
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { B } from '../kit/look'
import { grid, line, row, type Sprite } from '../kit/sprites'
import { book, onPlate, plate, PLATE_BEAD, TOP } from './shared'

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

    // ── 2. Where it came from ──
    { act: 2, clear: true, stage: { book: book(520, 520, ['Johann', 'Rahn'], '1659'), sign: line(['÷'], { x: 1260, y: 450, size: 320 }) }, say: 'In 1659, Johann Rahn printed this sign in a Swiss maths book.' },
    { say: 'Another sign for sharing is even older.' },
    { clear: true, stage: { old: line([{ frac: ['1', '2'] }], { x: 960, y: 480, size: 360 }) }, say: 'Arab mathematicians began drawing a line inside fractions.' },
    { stage: { old: line([{ frac: ['1', '2'] }], { x: 1260, y: 480, size: 360 }), book: book(520, 520, ['Fibonacci'], '1202') }, say: 'In 1202, Fibonacci used that line in his big book.' },

    // ── 3. The signs at work ──
    { act: 3, clear: true, stage: { line: line(['÷'], { y: 460, size: 340 }) }, quiet: 1.6, motif: true, say: 'This is the divide sign.' },
    { stage: { plates: plates(THREE), beads: share(12, 12, THREE, HEAP12), line: line(['12', '÷', '3', '=', '4'], { y: TOP }) }, move: 1.1, say: 'Twelve divided by three equals four.', poster: true },
    { stage: { back: line(['4', '×', '3', '=', '12'], { y: 430, size: 130 }) }, say: 'Four, three times, makes twelve. Divide undoes times.' },
    { clear: ['line'], stage: { line: line(['12', '÷', '3', '=', '4'], { y: 230, size: 140 }) }, say: 'There are other ways to write divide.' },
    { stage: { slash: line(['12', '/', '3', '=', '4'], { y: 520, size: 140 }) }, quiet: 1.5, motif: true, say: 'This slash means divide, too.' },
    { stage: { bar: line([{ frac: ['12', '3'] }, '=', '4'], { y: 830, size: 190 }) }, quiet: 1.5, motif: true, say: 'And so does the line in a fraction. Twelve over three equals four.' },
    { clear: true, stage: { plates: plates(TWO), halves: halves(false) }, say: 'One bead, to share between two plates.' },
    { stage: { halves: halves(true), line: line(['1', '÷', '2', '=', { frac: ['1', '2'] }], { y: TOP }) }, move: 1.2, cue: 'break', say: 'One divided by two equals one half.' },

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
