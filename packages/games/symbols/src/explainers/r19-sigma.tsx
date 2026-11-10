/**
 * Rank 19, Σ : add a whole list. The signs on the paper are +, =, ÷, the
 * letters with their labels set low (rank 14) and Σ with where it starts
 * below and where it stops above. A long sum does not fit on the paper;
 * sigma says "add them all": under it where i starts, on top where it
 * stops, beside it what to add. Where it is used: a sum of the counting
 * numbers (the steps), a total, and the average made from a total.
 *
 * The one tie between signs: sigma is the Greek S, for sum. No names or
 * dates are narrated.
 */
import type { Tok } from '../kit/glyphs'
import type { Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { piles, pileX } from '../kit/algebra'
import { beadAt } from '../kit/measures'
import { line, loose, type Sprite } from '../kit/sprites'

const LIST = [3, 1, 4, 2, 5]
const FLOOR = 780
const named = (i: number): Tok[] => ['x', { sub: String(i + 1) }]
const list = (o: { gold?: number[] } = {}) => piles(LIST, { y: FLOOR, label: named, gold: o.gold })
/** x₁ + x₂ + … for the first n of a list. */
const terms = (n: number): Tok[] => Array.from({ length: n }, (_, i) => [...(i > 0 ? ['+'] : []), ...named(i)]).flat()

/** Σ with where i starts and where it stops. */
const sigma = (to?: string): Tok => (to ? { big: 'Σ', from: ['i', '=', '1'], to, k: 'sig' } : { big: 'Σ', k: 'sig' })
const SUM = { y: 240, size: 180 }

/** The steps: piles of one, two, three … with the number under each. */
const STEP = { y: 800, step: 180, size: 64 }
const steps = (n: number) => piles(Array.from({ length: n }, (_, i) => i + 1), { ...STEP, x: 960 + ((n - 4) * STEP.step) / 2, label: (i) => [String(i + 1)], labelSize: 70 })

/** The list's fifteen beads, each with a name of its own, so they can move: as the piles are, or shared evenly (three to a pile). */
const shared = (even: boolean): Sprite[] => {
  const size = 56
  const at = (pile: number, level: number, k: number) => beadAt(`b${k}`, pileX(pile, LIST.length, {}), FLOOR - size / 2 - level * size * 1.1, size)
  const holes = LIST.flatMap((v, pile) => Array.from({ length: Math.max(0, 3 - v) }, (_, j) => ({ pile, level: v + j })))
  let k = 0
  return [
    ...LIST.flatMap((v, pile) => Array.from({ length: v }, (_, level) => (even && level >= 3 ? at(holes[0].pile, holes.shift()!.level, k++) : at(pile, level, k++)))),
    ...LIST.flatMap((_, i) => line(named(i), { x: pileX(i, LIST.length, {}), y: FLOOR + 60, size: 80 }).map((s) => ({ ...s, k: `n${i}/${s.k}` }))),
  ]
}

/** His steps: ten places drawn as outlines, the first n of them filled (any more stand to the right). */
const SLOTS = Array.from({ length: 12 }, (_, k) => {
  const pile = k < 1 ? 0 : k < 3 ? 1 : k < 6 ? 2 : k < 10 ? 3 : 4
  const level = k - [0, 1, 3, 6, 10][pile]
  return { x: pileX(pile, 4, STEP), y: STEP.y - STEP.size / 2 - level * STEP.size * 1.1 }
})
const filled = (n: number): Sprite[] => [...loose(SLOTS.slice(0, 10), { s: STEP.size / 40, ghost: () => 1, k: 'g' }), ...loose(SLOTS.slice(0, n), { s: STEP.size / 40, k: 'f', from: { x: SUPPLY.x, y: SUPPLY.y } })]

export const r19: Spec = {
  rank: 19,
  id: 'r19',
  title: 'Sum',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { piles: list(), line: line(terms(5), { y: 200, size: 110 }) },
      say: 'Five piles, named x one to x five. How many beads are there in all?',
      turn: { kind: 'predict', id: 'inall', prompt: 'How many beads in all?', options: [{ label: 'Twelve' }, { label: 'Fifteen' }] },
    },
    { stage: { line: line([...terms(5), '=', '15'], { y: 200, size: 110 }) }, say: 'Fifteen. Three plus one plus four plus two plus five.' },
    { stage: { line: line(terms(12), { x: 1500, y: 200, size: 110 }) }, say: 'Five piles already make a long line. With a hundred piles, the line would never fit on the paper.' },
    { stage: { line: line(terms(12), { x: 1500, y: 200, size: 110, gold: ['+'] }) }, move: 0.5, say: 'We need a short way to write: add them all.' },

    // ── 2. What sigma does ──
    { act: 2, stage: { line: null, sum: line([sigma(), 'x', { sub: 'i' }], SUM) }, quiet: 1.4, motif: true, say: 'This sign is sigma.' },
    { stage: { sum: line([sigma(), 'x', { sub: 'i' }], { ...SUM, gold: ['sig'] }) }, move: 0.5, say: 'Sigma is the Greek letter S. S is for sum.' },
    { stage: { sum: line([sigma('5'), 'x', { sub: 'i' }], { ...SUM, gold: ['sig'] }) }, say: 'Under it is where the counting starts: I equals one. On top is where it stops: five.' },
    {
      stage: { sum: line([sigma('5'), 'x', { sub: 'i' }], { ...SUM, gold: ['x', 'sub'] }), piles: list({ gold: [0, 1, 2, 3, 4] }) },
      move: 0.5,
      say: 'Beside it is what to add: x I. So we add x one, x two, x three, x four and x five.',
    },
    { stage: { sum: line([sigma('5'), 'x', { sub: 'i' }, '=', '15'], SUM), piles: list() }, say: 'We read it: the sum of x I, as I goes from one to five, equals fifteen.', poster: true },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { steps: steps(4), sum: line([sigma('4'), 'i', '=', '1', '+', '2', '+', '3', '+', '4'], { y: 240, size: 150 }) },
      say: 'What we add can be I itself. As I goes from one to four, that is one plus two plus three plus four.',
    },
    { stage: { sum: line([sigma('4'), 'i', '=', '10'], SUM) }, say: 'The sum is ten.' },
    { stage: { steps: steps(5), sum: line([sigma('5'), 'i', '=', '15'], SUM) }, say: 'Change the number on top, and the sum goes further. Up to five, it is fifteen.' },
    {
      clear: true,
      stage: { piles: shared(false), sum: line([sigma('5'), 'x', { sub: 'i' }, '=', '15'], { x: 620, y: 240, size: 150 }) },
      say: 'Sigma is used wherever many numbers are added into one total.',
    },
    {
      stage: { piles: shared(true), mean: line(['15', '÷', '5', '=', '3'], { x: 1400, y: 240, size: 130 }) },
      move: 1.3,
      say: 'Share that total evenly between the five piles, and each has three. That is the average.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: {
        kind: 'choose',
        id: 'steps3',
        prompt: 'Which one is true?',
        cards: [
          [{ big: 'Σ', from: ['i', '=', '1'], to: '3' }, 'i', '=', '1', '+', '2', '+', '3'],
          [{ big: 'Σ', from: ['i', '=', '1'], to: '3' }, 'i', '=', '3', '+', '3', '+', '3'],
        ],
        right: 0,
      },
    },
    {
      clear: true,
      say: 'Make the sum of I, as I goes from one to four. Fill the steps.',
      turn: {
        kind: 'build',
        id: 'steps10',
        prompt: 'Fill the steps.',
        target: 10,
        max: 12,
        zone: { x: 540, y: 440, w: 1020, h: 420 },
        state: (n) => ({
          steps: filled(n),
          sum: line([sigma('4'), 'i', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: 220, size: 150, gold: n === 10 ? ['='] : [], faint: n === 10 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { sum: line([sigma('3'), 'i', '=', '6'], { y: 480, size: 210 }) }, move: 0.6, say: 'The sum of I, as I goes from one to three, equals six.', turn: { kind: 'read', id: 'read6', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { steps: steps(4), line: line(['1', '+', '2', '+', '3', '+', '4', '=', '10'], { y: 240, size: 150 }) },
      say: 'One plus two plus three plus four: sigma writes that sum.',
    },
    {
      teaser: true,
      stage: { line: line(['1', '×', '2', '×', '3', '×', '4', '=', '?'], { y: 240, size: 150, gold: ['×'] }) },
      say: 'But what if we multiply them instead? Is there a sign for that too?',
      pad: 1,
    },
  ],
}
