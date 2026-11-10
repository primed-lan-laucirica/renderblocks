/**
 * Rank 12, letters: a name for a number. The signs on the paper are those
 * of ranks 1–5 and the letters themselves. A letter stands for a number not
 * known yet (the box on the balance), the same letter is the same number
 * all along a line, and a letter that may be any number is a variable.
 * Where it is used: next to a letter the times sign is left out (it looks
 * like x), a letter goes wherever a number can, and rules and formulas are
 * written with letters so that they hold for every number.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { box } from '../kit/algebra'
import { INK } from '../kit/look'
import { beadAt, numberLine, onLine, type Ruler } from '../kit/measures'
import { balance, beadsOn, lean, line, loose, panFloor, PAN_X, PIVOT, type Sprite } from '../kit/sprites'
import { PAN_ZONE, TOP } from './shared'

const PAN_BEAD = 50
const BOX_STEP = 148

/** Boxes, then `plus` loose beads, on the left pan, against `right` beads: each box holds a number, seen once it is open. */
function weighing(boxes: { letter?: string; n: number; open?: boolean; from?: Pt; gold?: number }[], plus: number, right: number): Patch {
  const tilt = lean(right - plus - boxes.reduce((w, b) => w + b.n, 0))
  const floor = panFloor(PIVOT.x, PIVOT.y, tilt, -1)
  const wide = boxes.length * BOX_STEP + plus * 56
  const left = floor.x - wide / 2
  return {
    scale: balance({ left: {}, right: beadsOn(right > 5 ? { n: right, cols: Math.ceil(right / 2) } : right), tilt }),
    boxes: boxes.flatMap((b, i) => box(`box${i}`, { x: left + BOX_STEP / 2 + i * BOX_STEP, y: floor.y }, b)),
    plus: loose(
      Array.from({ length: plus }, (_, j) => ({ x: left + boxes.length * BOX_STEP + 28 + j * 56, y: floor.y - PAN_BEAD / 2 })),
      { s: PAN_BEAD / 40, colour: 'blue' },
    ),
  }
}
/** The line over it: three tokens over the left pan, the sign over the pivot, one over the right. */
const OVER3 = [PAN_X.left - 150, PAN_X.left, PAN_X.left + 150, PIVOT.x, PAN_X.right]

/** n + 1 for n = 1, 2, 3: n gold beads and one blue one more. */
const NEXT = { y: 800, step: 380, size: 64 }
const nextNumbers = (): Sprite[] =>
  [1, 2, 3].flatMap((n, i) => {
    const x = 960 + (i - 1) * NEXT.step
    return [
      ...Array.from({ length: n + 1 }, (_, j) => beadAt(`n${n}b${j}`, x + 110, NEXT.y - NEXT.size / 2 - j * NEXT.size * 1.1, NEXT.size, j === n ? 'blue' : undefined)),
      ...line(['n', '=', String(n)], { x: x - 70, y: NEXT.y - 40, size: 80 }).map((s) => ({ ...s, k: `n${n}/${s.k}` })),
    ]
  })

/** A square with its side named s. */
const SQ = { x: 600, y: 610, side: 340 }
const square = (): Sprite[] => [
  {
    k: 'square',
    type: 'custom',
    n: { x: SQ.x, y: SQ.y, o: 1 },
    d: { id: 'square', draw: (p) => <rect x={p.x - SQ.side / 2} y={p.y - SQ.side / 2} width={SQ.side} height={SQ.side} fill="#fbf6ea" stroke={INK} strokeWidth={9} strokeLinejoin="round" /> },
  },
  ...[
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ].flatMap(([dx, dy], i) => line(['s'], { x: SQ.x + dx * (SQ.side / 2 + 56), y: SQ.y + dy * (SQ.side / 2 + 60), size: 84 }).map((s) => ({ ...s, k: `side${i}` }))),
]

const R: Ruler = { x0: 360, x1: 1560, y: 700, from: -4, to: 4 }

export const r12: Spec = {
  rank: 12,
  id: 'r12',
  title: 'Letters',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { ...weighing([{ n: 3 }], 2, 5), line: line(['?', '+', '2', '=', '5'], { y: TOP, at: OVER3 }) },
      say: 'A closed box and two beads are level with five beads. How many beads are in the box?',
      turn: { kind: 'predict', id: 'inbox', prompt: 'How many beads are in the box?', options: [{ label: 'Three' }, { label: 'Five' }] },
    },
    { stage: { ...weighing([{ n: 3, open: true }], 2, 5) }, say: 'Three. Three plus two equals five.' },
    { clear: true, stage: { line: line(['?', '+', '?', '=', '7'], { y: 460, size: 210 }) }, say: 'Now there are two numbers we do not know. Are they the same number, or different ones? A question mark cannot say.' },
    { stage: { line: line(['?', '+', '?', '=', '7'], { y: 460, size: 210, gold: ['?#0', '?#1'] }) }, move: 0.5, say: 'Each unknown number needs a name of its own.' },

    // ── 2. What a letter does ──
    {
      act: 2,
      clear: true,
      stage: { ...weighing([{ n: 3, letter: 'x' }], 2, 5), line: line(['x', '+', '2', '=', '5'], { y: TOP, at: OVER3, gold: ['x'] }) },
      move: 1.1,
      quiet: 1.4,
      motif: true,
      say: 'So we name the number with a letter. This one is x.',
    },
    { stage: { line: line(['x', '+', '2', '=', '5'], { y: TOP, at: OVER3 }) }, move: 0.5, say: 'We read it: x plus two equals five.', poster: true },
    { stage: { ...weighing([{ n: 3, letter: 'x', gold: 1 }], 2, 5) }, move: 0.5, say: 'The letter stands for the number in the box: a number we do not know yet.' },
    { stage: { ...weighing([{ n: 3, letter: 'x', open: true }], 2, 5), found: line(['x', '=', '3'], { x: PAN_X.right, y: 820, size: 130 }) }, say: 'Open the box: three. So x equals three.' },
    {
      clear: true,
      stage: { ...weighing([{ n: 3, letter: 'x' }, { n: 3, letter: 'x' }], 0, 6), line: line(['x', '+', 'x', '=', '6'], { y: TOP, at: OVER3 }) },
      say: 'Along one line, the same letter is always the same number.',
    },
    { stage: { ...weighing([{ n: 3, letter: 'x', open: true }, { n: 3, letter: 'x', open: true }], 0, 6) }, say: 'x plus x equals six. Both boxes hold three.' },
    {
      clear: true,
      stage: { ...weighing([{ n: 3, letter: 'x' }, { n: 4, letter: 'y' }], 0, 7), line: line(['x', '+', 'y', '=', '7'], { y: TOP, at: OVER3 }) },
      say: 'A different letter is a different box.',
    },
    { stage: { ...weighing([{ n: 3, letter: 'x', open: true }, { n: 4, letter: 'y', open: true }], 0, 7) }, say: 'It may hold a different number. Here x is three, and y is four.' },
    { clear: true, stage: { line: line(['n', '+', '1'], { y: 250, size: 210 }), next: nextNumbers() }, say: 'A letter can also stand for any number at all. Whatever number n is, n plus one is the next number.' },
    { stage: { line: line(['n', '+', '1'], { y: 250, size: 210, gold: ['n'] }) }, move: 0.5, say: 'A letter like this is called a variable, because its number can vary.' },

    // ── 3. Where letters are used ──
    { act: 3, clear: true, stage: { line: line(['2', '×', 'x'], { y: 470, size: 260 }) }, say: 'Here is two times x. But look: the times sign and the letter x are easy to mix up.' },
    { stage: { line: line(['2', '·', 'x'], { y: 470, size: 260, gold: ['·'] }) }, say: 'So next to a letter we use the dot.' },
    { stage: { line: line(['2', 'x'], { y: 470, size: 260 }) }, say: 'Or we write no sign at all. Two x means two times x.' },
    {
      clear: true,
      stage: { half: line([{ frac: ['x', '2'] }], { x: 560, y: 480, size: 230 }), twice: line(['2', '(', 'x', '+', '1', ')'], { x: 1260, y: 480, size: 190 }) },
      say: 'A letter can go wherever a number can go: over a fraction bar, or inside brackets.',
    },
    {
      clear: true,
      stage: {
        scale: balance({ left: beadsOn({ n: 2 }, { n: 3, colour: 'blue' }), right: beadsOn({ n: 3, colour: 'blue' }, { n: 2 }) }),
        line: line(['a', '+', 'b', '=', 'b', '+', 'a'], { y: TOP, at: [PAN_X.left - 150, PAN_X.left, PAN_X.left + 150, PIVOT.x, PAN_X.right - 150, PAN_X.right, PAN_X.right + 150] }),
      },
      say: 'With letters we can write a rule for every number at once. A plus B equals B plus A, whatever the two numbers are.',
    },
    {
      clear: true,
      stage: { square: square(), line: line(['P', '=', '4', 's'], { x: 1330, y: 600, size: 220 }) },
      say: 'Formulas are written with letters too. The distance round a square is four times its side: P equals four S.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(['x', '=', '4'], { y: TOP, size: 130 }) },
      say: 'Here, x is four. Which one is true?',
      turn: { kind: 'choose', id: 'x4', prompt: 'x is four. Which one is true?', cards: [['x', '+', '1', '=', '4'], ['x', '+', '1', '=', '5']], right: 1 },
    },
    {
      clear: true,
      say: 'x plus two equals six. Put beads in the box until the beam is level.',
      turn: {
        kind: 'build',
        id: 'fillbox',
        prompt: 'Fill the box until the beam is level.',
        target: 4,
        max: 6,
        zone: PAN_ZONE.left,
        state: (n) => ({
          ...weighing([{ n, letter: 'x', open: true, from: { x: SUPPLY.x, y: SUPPLY.y } }], 2, 6),
          line: line(['x', '+', '2', '=', '6'], { y: TOP, at: OVER3, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
          found: line(['x', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { x: PAN_X.right, y: 820, size: 130 }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['2', 'x', '=', '10'], { y: 480, size: 230 }) }, move: 0.6, say: 'Two x equals ten.', turn: { kind: 'read', id: 'read2x', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { axis: numberLine(R, { size: 64 }), line: line(['|', 'x', '|', '=', '3'], { y: 300, size: 200 }) },
      say: 'The absolute value of x equals three. So x is three steps from zero.',
    },
    {
      teaser: true,
      stage: { marks: [beadAt('m0', onLine(R, -3), R.y - 58, 64), beadAt('m1', onLine(R, 3), R.y - 58, 64)], line: line(['|', 'x', '|', '=', '3'], { y: 300, size: 200, gold: ['x'] }) },
      say: 'But on which side of zero? Can one line give both answers?',
      pad: 1,
    },
  ],
}
