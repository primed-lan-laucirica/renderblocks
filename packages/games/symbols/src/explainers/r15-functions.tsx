/**
 * Rank 15, f(x): a function, a rule with a name. The signs on the paper are
 * =, +, the dot, brackets, ≠, the root, letters and the function's name
 * only. A machine doubles whatever goes in; to write its rule down it needs
 * a name (f) and a place for what goes in (the brackets): f(x) = 2x. Where
 * it is used: every machine gets its own letter, and a function is written
 * whenever one number depends on another (a price on how many).
 *
 * The one tie kept is between signs: the root sign was a function all
 * along, and these brackets do not mean times. No names or dates are
 * narrated.
 */
import type { Spec } from '../engine/spec'
import { machine, machineOut, machineRule, through, type Machine } from '../kit/algebra'
import type { Tok } from '../kit/glyphs'
import { GOLD, INK, SOFT } from '../kit/look'
import { beadAt, numberLine, type Ruler } from '../kit/measures'
import { grid, line, loose, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const M: Machine = { x: 960, y: 640 }
const BIG = { y: 220, size: 200 }
const of = (name: string, input: string): Tok[] => [{ fn: name }, '(', input, ')']

/** The machine's name, on a tag over it. */
const tag = (m: Machine, name: string, gold = false): Sprite[] => line([{ fn: name }], { x: m.x, y: m.y - 228, size: 100, gold: gold ? ['fn'] : [] })
/** A numeral or a letter waiting to go in, and what has come out. */
const goesIn = (tok: string, gold = 0) => [through('in', M, tok, 'in', { gold })]
const comesOut = (tok: string, gold = 0) => [through('out', M, tok, 'out', { gold })]

/** Apples at two coins each: n green beads, 2n gold ones, and p(n) under them. */
const PRICE = { y: 760, step: 480, size: 56 }
const price = (gold: number[] = []): Sprite[] =>
  [1, 2, 3].flatMap((n, i) => {
    const x = 960 + (i - 1) * PRICE.step
    const up = (j: number) => PRICE.y - PRICE.size / 2 - j * PRICE.size * 1.1
    return [
      ...Array.from({ length: n }, (_, j) => beadAt(`a${n}/${j}`, x - 44, up(j), PRICE.size, 'green')),
      ...Array.from({ length: 2 * n }, (_, j) => beadAt(`c${n}/${j}`, x + 44, up(j), PRICE.size)),
      ...line([...of('p', String(n)), '=', String(2 * n)], { x, y: PRICE.y + 62, size: 76, gold: gold.includes(n) ? ['fn', '(', ')', '=', String(n), String(2 * n)] : [] }).map((s) => ({ ...s, k: `p${n}/${s.k}` })),
    ]
  })

/** His machine: g doubles, and what comes out is built on the right. */
const MB: Machine = { x: 640, y: 620 }
const OUT = { x: 1340, y: 660 }

/** A wheel one across, standing at zero on a line. */
const ROAD: Ruler = { x0: 250, x1: 1690, y: 760, from: 0, to: 4 }
const WHEEL_R = (ROAD.x1 - ROAD.x0) / 8
const wheel = (): Sprite[] => [
  {
    k: 'wheel',
    type: 'custom',
    n: { x: ROAD.x0, y: ROAD.y - WHEEL_R - 8, r: WHEEL_R, o: 1 },
    d: {
      id: 'wheel',
      draw: (p) => (
        <g fill="none" strokeLinecap="round">
          <circle cx={p.x} cy={p.y} r={p.r} fill="#fbf6ea" stroke={INK} strokeWidth={5} />
          <circle cx={p.x} cy={p.y} r={p.r} stroke={GOLD} strokeWidth={14} />
          <line x1={p.x - p.r} y1={p.y} x2={p.x + p.r} y2={p.y} stroke={SOFT} strokeWidth={6} strokeDasharray="4 16" />
          <circle cx={p.x} cy={p.y + p.r} r={11} fill={INK} />
        </g>
      ),
    },
  },
  ...line(['1'], { x: ROAD.x0, y: ROAD.y - WHEEL_R - 8 - WHEEL_R * 0.34, size: WHEEL_R * 0.5 }).map((s) => ({ ...s, k: 'across' })),
]

export const r15: Spec = {
  rank: 15,
  id: 'r15',
  title: 'Functions',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { machine: machine(M), in: goesIn('4') },
      say: 'This machine doubles every number that goes in. Four goes in. What comes out?',
      turn: { kind: 'predict', id: 'out4', prompt: 'Four goes in. What comes out?', options: [{ label: 'Six' }, { label: 'Eight' }] },
    },
    { stage: { out: comesOut('8', 1) }, say: 'Eight. Double four is eight.' },
    { stage: { in: goesIn('3'), out: comesOut('6') }, say: 'Three goes in, and six comes out.' },
    { stage: { rule: machineRule(M, ['?'], { gold: ['?'] }) }, move: 0.5, say: 'We need a way to write the machine’s rule: a name for the machine, and what it does to any number.' },

    // ── 2. What the sign does ──
    {
      act: 2,
      stage: { line: line(of('f', 'x'), { ...BIG, gold: ['fn'] }), name: tag(M, 'f', true), rule: null, in: null, out: null },
      quiet: 1.4,
      motif: true,
      say: 'So we give the machine a name: F. A machine like this is called a function.',
    },
    {
      stage: { line: line(of('f', 'x'), { ...BIG, gold: ['(', ')'] }), name: tag(M, 'f'), in: goesIn('x') },
      say: 'What goes in is written in brackets, after the name. Here it is x: any number at all. We read it: F of x.',
    },
    {
      stage: { line: line([...of('f', 'x'), '=', '2', 'x'], BIG), rule: machineRule(M, ['2', 'x']), out: line(['2', 'x'], { x: machineOut(M).x + 44, y: M.y, size: 130 }) },
      say: 'F of x equals two x. Whatever goes in, two times that comes out.',
      poster: true,
    },
    {
      stage: { line: line([...of('f', '3'), '=', '2', '·', '3', '=', '6'], { y: BIG.y, size: 160 }), in: goesIn('3'), out: comesOut('6') },
      say: 'Put three where x was. F of three equals two times three, which is six.',
    },
    {
      stage: { line: line([...of('f', '3'), '≠', { fn: 'f', k: 'f2' }, '·', { g: '3', k: 'three2' }], { y: BIG.y, size: 180, gold: ['≠'] }) },
      say: 'Take care. These brackets do not mean times: F of three is not F times three.',
    },
    { stage: { line: line([...of('f', '3'), '=', '6'], BIG), in: goesIn('3', 1), out: comesOut('6', 1) }, say: 'And a function is dependable. The same number in always gives the same number out.' },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { machine: machine(M), name: tag(M, 'g'), rule: machineRule(M, ['x', '+', '1']), line: line([...of('g', 'x'), '=', 'x', '+', '1'], { y: BIG.y, size: 180 }) },
      say: 'Another machine gets another letter. G of x equals x plus one: it adds one to whatever goes in.',
    },
    { stage: { line: line([...of('g', '4'), '=', '5'], BIG), in: goesIn('4'), out: comesOut('5') }, say: 'G of four equals five.' },
    {
      clear: ['machine'],
      stage: { rule: machineRule(M, [{ root: 'x' }]), line: line([{ root: '9' }, '=', '3'], BIG), in: goesIn('9'), out: comesOut('3') },
      say: 'You have met a function before: the root sign. Nine goes in, and three comes out.',
    },
    {
      clear: true,
      stage: { line: line([...of('p', 'n'), '=', '2', 'n'], { y: 210, size: 180 }), price: price() },
      say: 'Functions are used whenever one number depends on another. Apples cost two coins each, so the price depends on how many: P of N equals two N.',
    },
    { stage: { price: price([3]) }, move: 0.5, say: 'P of three equals six: three apples cost six coins.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line([...of('f', 'x'), '=', 'x', '+', '3'], { y: TOP, size: 130 }) },
      say: 'Here, F of x equals x plus three. Which one is true?',
      turn: { kind: 'choose', id: 'f2', prompt: 'Which one is true?', cards: [[...of('f', '2'), '=', '6'], [...of('f', '2'), '=', '5']], right: 1 },
    },
    {
      clear: true,
      say: 'G of x equals two x. Three goes in. Build what comes out.',
      turn: {
        kind: 'build',
        id: 'g3',
        prompt: 'Three goes in. Build what comes out.',
        target: 6,
        max: 8,
        zone: { x: 1100, y: 500, w: 480, h: 300 },
        state: (n) => ({
          machine: machine(MB),
          name: tag(MB, 'g'),
          rule: machineRule(MB, ['2', 'x']),
          in: [through('in', MB, '3', 'in')],
          line: line([...of('g', 'x'), '=', '2', 'x'], { y: TOP, size: 130 }),
          found: line([...of('g', '3'), '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { x: OUT.x, y: 400, size: 120, gold: n === 6 ? ['='] : [], faint: n === 6 ? [] : ['='] }),
          beads: loose(grid(8, 4, OUT.x, OUT.y, 100), { s: 2.1, ghost: (i) => (i < n ? 0 : 1) }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...of('f', '5'), '=', '10'], { y: 480, size: 230 }) }, move: 0.6, say: 'F of five equals ten.', turn: { kind: 'read', id: 'readf5', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { axis: numberLine(ROAD, { size: 64 }), wheel: wheel() }, say: 'Here is a wheel, one step across. Roll it once round, along the line.' },
    { teaser: true, stage: { ask: line(['?'], { x: 1150, y: 420, size: 220, gold: ['?'] }) }, move: 0.5, say: 'How far will it go?', pad: 1 },
  ],
}
