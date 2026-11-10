/**
 * Rank 14, xᵢ : a subscript, a number's place in a list. The signs on the
 * paper are =, +, the dot, a power, letters and the subscript only. A list
 * has more numbers than the alphabet has letters, so the whole list gets
 * one letter and each number a small one set low: x₁ is the first, xᵢ any
 * one of them. Where it is used: any list of measurements (a height each
 * day), a start called x₀, and sums over a list.
 *
 * The one tie kept is between signs: a small number set high (a power)
 * means multiply, a small number set low is only a name. No names or dates
 * are narrated.
 */
import type { Spec } from '../engine/spec'
import { machine, machineRule, piles, through, type Machine, type PilesOpts } from '../kit/algebra'
import type { Tok } from '../kit/glyphs'
import { line } from '../kit/sprites'
import { TOP } from './shared'

/** A long list: the first four numbers have letters, the rest have none. */
const LONG = [3, 1, 4, 2, 5, 3, 2, 4, 1, 3]
const long = (label: (i: number) => Tok[], gold: number[] = []) => piles(LONG, { y: 700, step: 150, label, labelSize: 72, gold })
const lettered = (i: number): Tok[] => [i < 4 ? 'abcd'[i] : '?']

/** The list x₁ … x₅. */
const LIST = [3, 1, 4, 2, 5]
const xs = (i: number): Tok[] => ['x', { sub: String(i + 1) }]
const ROW = { y: 760, step: 220, size: 60, labelSize: 84 }
const list = (o: Partial<PilesOpts> = {}) => piles(LIST, { ...ROW, label: xs, ...o })
const others = (i: number) => [0, 1, 2, 3, 4].filter((j) => j !== i)
const BIG = { y: 240, size: 230 }

/** A plant's height each day: h₁ … h₄, and then h₀ before them. */
const days = (start: boolean) => piles([start ? 1 : 0, 2, 3, 5, 6], { ...ROW, k: 'd', colour: 'green', label: (i) => (i === 0 && !start ? null : ['h', { sub: String(i) }]), gold: start ? [0] : [] })

const M: Machine = { x: 960, y: 600 }

export const r14: Spec = {
  rank: 14,
  id: 'r14',
  title: 'Subscripts',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { list: long(lettered) },
      say: 'Here is a list of numbers. Four of them are named with letters. Are there enough letters to name a hundred numbers?',
      turn: { kind: 'predict', id: 'enough', prompt: 'Enough letters for a hundred numbers?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    { stage: { list: long(lettered, [4, 5, 6, 7, 8, 9]) }, move: 0.5, say: 'No. There are only twenty-six letters.' },
    { stage: { list: long(lettered, [8]) }, move: 0.5, say: 'And a letter does not show the order. Which number is the ninth? It is hard to tell.' },
    { stage: { list: long(() => ['?'], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) }, say: 'A list needs names that never run out, and that show each number’s place.' },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { list: list() }, say: 'So the whole list gets one letter, x. And each number gets a small number, set low, for its place in the list.' },
    { stage: { line: line(['x', { sub: '1' }], { ...BIG, gold: ['sub'] }), list: list({ gold: [0], faint: others(0) }) }, quiet: 1.4, motif: true, say: 'This small, low number is called a subscript.' },
    { stage: { line: line(['x', { sub: '1' }, '=', '3'], BIG) }, say: 'We read it: x one. It is the first number in the list. Here, x one equals three.', poster: true },
    { stage: { line: line(['x', { sub: '4' }, '=', '2'], BIG), list: list({ gold: [3], faint: others(3) }) }, say: 'x four is the fourth number. Here, x four equals two.' },
    { stage: { line: line(['x', { sub: '4' }, '=', '2'], { ...BIG, gold: ['sub'] }), list: list() }, move: 0.5, say: 'The subscript is a label, like a house number. It is part of the name, and never part of a sum.' },
    {
      clear: true,
      stage: { high: line(['x', { sup: '2' }, '=', 'x', '·', 'x'], { x: 560, y: 480, size: 190, gold: ['pow'] }), low: line(['x', { sub: '2' }], { x: 1430, y: 480, size: 230, fade: 0.3 }) },
      say: 'Do not mix it up with a power. A small number set high means multiply: x squared is x times x.',
    },
    {
      stage: { high: line(['x', { sup: '2' }, '=', 'x', '·', 'x'], { x: 560, y: 480, size: 190, fade: 0.3 }), low: line(['x', { sub: '2' }], { x: 1430, y: 480, size: 230, gold: ['sub'] }) },
      move: 0.5,
      say: 'A small number set low is only a name: x two is the second number in a list.',
    },
    { clear: true, stage: { list: list(), line: line(['x', { sub: 'i' }], BIG) }, say: 'When we mean any one of them, the subscript can be a letter too. We read it: x I.' },
    {
      stage: { line: line(['x', { sub: 'i' }], { ...BIG, x: 700 }), which: line(['i', '=', '2'], { x: 1260, y: BIG.y, size: 150 }), list: list({ gold: [1], faint: others(1) }) },
      say: 'If I is two, x I is x two: the second number.',
    },
    { stage: { which: line(['i', '=', '5'], { x: 1260, y: BIG.y, size: 150 }), list: list({ gold: [4], faint: others(4) }) }, say: 'If I is five, it is x five: the fifth.' },

    // ── 3. Where it is used ──
    { act: 3, clear: true, stage: { days: days(false) }, say: 'Subscripts name any list. A plant’s height, measured every day, is H one, H two, H three, H four.' },
    { stage: { days: days(true) }, say: 'Many lists start at zero. H zero is the height at the start, before the first day.' },
    {
      clear: true,
      stage: { list: list({ faint: [3, 4] }), line: line(['x', { sub: '1' }, '+', 'x', { sub: '2' }, '+', 'x', { sub: '3' }, '=', '8'], { y: 240, size: 150 }) },
      say: 'And they go in sums like any letters. x one plus x two plus x three: three plus one plus four equals eight.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is the third number in a list?',
      turn: { kind: 'choose', id: 'third', prompt: 'Which one is the third number in a list?', cards: [['x', { sub: '3' }], ['x', { sup: '3' }]], right: 0 },
    },
    {
      clear: true,
      say: 'Make x two equal five. Put beads on the second pile.',
      turn: {
        kind: 'build',
        id: 'x2five',
        prompt: 'Make x two equal five.',
        target: 5,
        max: 7,
        zone: { x: 460, y: 280, w: 1000, h: 520 },
        state: (n) => ({
          list: piles([3, n, 4, 2], { ...ROW, y: 780, label: xs, gold: [1] }),
          line: line(['x', { sub: '2' }, '=', '5'], { y: TOP, gold: n === 5 ? ['='] : [], faint: n === 5 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['x', { sub: '1' }, '+', 'x', { sub: '2' }, '=', '7'], { y: 480, size: 200 }) }, move: 0.6, say: 'x one plus x two equals seven.', turn: { kind: 'read', id: 'readx12', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { machine: machine(M), in: [through('in', M, '3', 'in')], out: [through('out', M, '6', 'out')] },
      say: 'Here is a machine. It doubles whatever goes in: three goes in, and six comes out.',
    },
    { teaser: true, stage: { rule: machineRule(M, ['?'], { gold: ['?'] }) }, move: 0.5, say: 'How can we write a machine’s rule?', pad: 1 },
  ],
}
