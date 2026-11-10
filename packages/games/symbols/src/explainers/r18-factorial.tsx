/**
 * Rank 18, n!: the sign for multiplying all the way down to one. Three
 * beads can stand in a row in 3 × 2 × 1 orders; with more beads the line of
 * numbers gets long, and the factorial sign is the short way to write it.
 * It is written after its number and belongs to that number alone (2 × 3!
 * is 2 × 6); each factorial is the one before, times the next number (the
 * rule n! = n × (n − 1)!). Where it is used: counting orders, which grow
 * very fast.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Tok } from '../kit/glyphs'
import { beadAt } from '../kit/measures'
import { line, loose, type BeadColour, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

/** A line whose sprites are named apart from another line's in the same actor. */
const named = (k: string, list: Sprite[]): Sprite[] => list.map((s) => ({ ...s, k: `${k}/${s.k}` }))
/** A numeral as it is written: 5040 is 5,040. */
const written = (n: number) => n.toLocaleString('en-US')
const factorial = (n: number): number => (n < 2 ? 1 : n * factorial(n - 1))
/** n × … × 2 × 1, as tokens. */
const down = (n: number): Tok[] => Array.from({ length: n }, (_, i) => String(n - i)).flatMap((g, i) => (i ? ['×', g] : [g]))

// ── three beads, and every order they can stand in ───────────────────────

const COLOURS: BeadColour[] = ['red', 'blue', 'green']
const THREE = { y: 480, size: 150, step: 250 }
const three = (): Sprite[] => COLOURS.map((c, i) => beadAt(`o0/${c}`, 960 + (i - 1) * THREE.step, THREE.y, THREE.size, c))

const ORDERS: BeadColour[][] = [
  ['red', 'blue', 'green'],
  ['red', 'green', 'blue'],
  ['blue', 'red', 'green'],
  ['blue', 'green', 'red'],
  ['green', 'red', 'blue'],
  ['green', 'blue', 'red'],
]
const ROWS = { y: 330, down: 170, across: 500, size: 96, step: 112 }
/** The six orders, two to a column: a column for each bead that can stand first. */
const orders = (): Sprite[] =>
  ORDERS.flatMap((order, r) => order.map((c, i) => beadAt(`o${r}/${c}`, 960 + (Math.floor(r / 2) - 1) * ROWS.across + (i - 1) * ROWS.step, ROWS.y + (r % 2) * ROWS.down, ROWS.size, c)))

const FOUR = { y: 250, size: 110, step: 150 }
const four = (): Sprite[] => ([...COLOURS, 'gold'] as BeadColour[]).map((c, i) => beadAt(`four ${c}`, 960 + (i - 1.5) * FOUR.step, FOUR.y, FOUR.size, c))

// ── how fast it grows ────────────────────────────────────────────────────

const LADDER = { y: 190, down: 160, size: 100, left: 430, right: 1090 }
/** 1! to 10! in two columns, the equals signs under one another. */
const ladder = (gold: number[] = []): Sprite[] =>
  Array.from({ length: 10 }, (_, i) => i + 1).flatMap((n) => {
    const row = line([String(n), '!', '=', written(factorial(n))], { y: LADDER.y + ((n - 1) % 5) * LADDER.down, size: LADDER.size, gold: gold.includes(n) ? ['!'] : [] })
    const eq = row.find((s) => s.k.startsWith('='))
    const dx = (n > 5 ? LADDER.right : LADDER.left) - (eq?.n.x ?? 960)
    return named(`f${n}`, row).map((s) => ({ ...s, n: { ...s.n, x: s.n.x + dx } }))
  })

/** 52!, written out: sixty-eight digits, in three rows. */
const PACK = ['80,658,175,170,943,878,571,660,', '636,856,403,766,975,289,505,440,', '883,277,824,000,000,000,000']
const pack = (): Sprite[] => PACK.flatMap((g, i) => named(`row${i}`, line([g], { y: 520 + i * 130, size: 92 })))

// ── making 4! out of 3! ──────────────────────────────────────────────────

const SIX = { y: 380, size: 76, step: 86 }
/** n rows of six beads: each row is 3!, and four of them make 4!. */
const sixes = (n: number): Patch => ({
  rows: loose(
    Array.from({ length: 6 * n }, (_, i) => ({ x: 960 + ((i % 6) - 2.5) * SIX.step, y: SIX.y + Math.floor(i / 6) * SIX.step })),
    { s: SIX.size / 40, k: 'r', from: { x: SUPPLY.x, y: SUPPLY.y } },
  ),
  line: line(['4', '!', '=', { g: n === 0 ? '?' : String(6 * n), k: 'made' }], { y: TOP, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
})

// ── a long sum (the question for rank 19) ────────────────────────────────

const terms = (n: number): Tok[] => Array.from({ length: n }, (_, i) => i + 1).flatMap((i): Tok[] => ['x', { sub: String(i) }, '+'])
/** The line starts at the paper's left margin and runs off its right edge. */
const LONG = { x: 1440 }

export const r18: Spec = {
  rank: 18,
  id: 'r18',
  title: 'Factorial',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { beads: three() },
      say: 'Three beads: red, blue and green. In how many orders can they stand in a row?',
      turn: { kind: 'predict', id: 'orders', prompt: 'How many orders?', options: [{ label: 'Three' }, { label: 'Six' }] },
    },
    { stage: { beads: orders() }, move: 1.2, say: 'Six. Here is every order.' },
    { stage: { line: line(['3', '×', '2', '×', '1', '=', '6'], { y: 800, size: 170 }) }, say: 'Three beads can stand first. Then two are left to stand next, and one to stand last. Three times two times one.' },
    { clear: true, stage: { beads: four(), line: line([...down(4), '=', '24'], { y: 520, size: 170 }) }, say: 'With four beads, it is four times three times two times one: twenty-four orders.' },
    { stage: { ten: line(down(10), { y: 800, size: 96 }) }, say: 'With ten beads, the line gets long. We need a short way to write: multiply all the way down to one.' },

    // ── 2. What the sign does ──
    {
      act: 2,
      clear: true,
      stage: { line: line([...down(4), '=', '24'], { y: 300, size: 150 }), fact: line(['4', '!', '=', '24'], { y: 660, size: 260, gold: ['!'] }) },
      quiet: 1.4,
      motif: true,
      say: 'This is the factorial sign. It is written after its number.',
    },
    { stage: { fact: line(['4', '!', '=', '24'], { y: 660, size: 260 }) }, move: 0.5, say: 'We read it: four factorial equals twenty-four.', poster: true },
    { stage: { line: null, fact: line(['4', '!', '=', ...down(4)], { y: 480, size: 190, gold: ['!'] }) }, say: 'Factorial means: multiply the number by every whole number below it, down to one.' },
    {
      clear: true,
      stage: { long: line(['5', '!', '=', '5', '×', ...down(4)], { y: 250, size: 150, gold: ['4', '×#1', '3', '×#2', '2', '×#3', '1'] }), short: line(['5', '!', '=', '5', '×', '4', '!'], { y: 540, size: 180, gold: ['4', '!#1'] }) },
      say: 'Each factorial is built from the one before. Five factorial is five times four factorial.',
    },
    { stage: { value: line(['5', '×', '24', '=', '120'], { y: 820, size: 170 }) }, say: 'Five times twenty-four: one hundred and twenty.' },
    {
      clear: true,
      stage: { line: line(['n', '!', '=', 'n', '×', '(', 'n', '−', '1', ')', '!'], { y: 480, size: 200 }) },
      say: 'With a letter, we can write that rule for every number: N factorial equals N times the factorial of the number before.',
    },
    { clear: true, stage: { line: line(['2', '×', '3', '!', '=', '12'], { y: 330, size: 200, gold: ['3', '!'] }) }, say: 'The sign belongs to the number just before it. Two times three factorial is two times six: twelve.' },
    { stage: { line: line(['2', '×', '3', '!', '=', '12'], { y: 330, size: 200 }), all: line(['(', '2', '×', '3', ')', '!', '=', '720'], { y: 700, size: 200, gold: ['(', ')'] }) }, say: 'With brackets, the inside comes first: six factorial, seven hundred and twenty.' },

    // ── 3. Where it is used ──
    { act: 3, clear: true, stage: { ladder: ladder() }, say: 'Factorial is used for counting orders, and the count grows very fast.' },
    { stage: { ladder: ladder([10]) }, move: 0.5, say: 'Ten books can stand on a shelf in more than three million orders.' },
    {
      clear: true,
      stage: { line: line(['52', '!', '='], { y: 250, size: 220 }), pack: pack() },
      say: 'A pack of fifty-two cards can be shuffled in fifty-two factorial ways: a number sixty-eight digits long.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Your turn. Which one is true?',
      turn: { kind: 'choose', id: 'three', prompt: 'Which one is true?', cards: [['3', '!', '=', '6'], ['3', '!', '=', '3']], right: 0 },
    },
    {
      clear: true,
      say: 'Make four factorial. Put on sixes: each six is three factorial.',
      turn: { kind: 'build', id: 'four', prompt: 'Make four factorial.', target: 4, max: 5, unit: 6, zone: { x: 560, y: 300, w: 800, h: 560 }, state: sixes },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['5', '!', '=', '120'], { y: 480, size: 240 }) }, move: 0.6, say: 'Five factorial equals one hundred and twenty.', turn: { kind: 'read', id: 'read120', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { line: line(terms(8), { x: LONG.x, y: 460, size: 150 }) }, say: 'x one plus x two plus x three, and on, all the way to x one hundred.' },
    { teaser: true, stage: { line: line(terms(8), { x: LONG.x, y: 460, size: 150, gold: ['+'] }) }, move: 0.5, say: 'Is there a shorter way to write a long sum?', pad: 1 },
  ],
}
