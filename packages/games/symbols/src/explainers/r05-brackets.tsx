/**
 * Rank 5, ( ) : one line that could mean two amounts, until brackets say
 * which part comes first. The signs on the paper are =, +, −, ×, ÷ and the
 * brackets only; "2 + 3 × 4 = 20" is never written.
 *
 * The one line of history (checked): a line drawn over the terms (the
 * vinculum) grouped them before brackets did. It is there because it shows
 * the same job done another way.
 */
import type { Spec } from '../engine/spec'
import { items, place, widthOf, type Tok } from '../kit/glyphs'
import { INK } from '../kit/look'
import { balance, beadsOn, entering, grid, line, loose, props, row, type Sprite } from '../kit/sprites'
import { beam, OVER, TOP } from './shared'

const BARE: Tok[] = ['2', '+', '3', '×', '4']
const FIRST: Tok[] = ['(', '2', '+', '3', ')', '×', '4']
const SECOND: Tok[] = ['2', '+', '(', '3', '×', '4', ')', '=', '14']

const OLD = { y: 500, size: 190 }
/** Each token's middle and width on a centred line. */
const spots = (toks: Tok[], size: number) => {
  const list = items(toks)
  const xs = place(list, size)
  return list.map((it, i) => ({ k: it.k, x: 960 + xs[i], w: widthOf(it) * size }))
}

/** The line people drew over the part that goes together. */
const overline = (): Sprite[] => {
  const at = spots(BARE, OLD.size)
  const x1 = at[0].x - at[0].w / 2
  const x2 = at[2].x + at[2].w / 2
  return [
    {
      k: 'overline',
      type: 'custom',
      n: { x: x1, y: OLD.y - OLD.size * 0.56, len: x2 - x1, o: 1 },
      d: { id: 'overline', draw: (p) => <line x1={p.x} y1={p.y} x2={p.x + p.len} y2={p.y} stroke={INK} strokeWidth={OLD.size * 0.07} strokeLinecap="round" /> },
      enter: { len: 0, o: 1 },
    },
  ]
}

const WORK = { y: 250, size: 150 }
const ROWS = { x: 960, y: 680, step: 72 }
/** Two blue and three red in a row, four times; `plus` leaves only the first two blue beside the twelve red. */
const beads = (plus: boolean) => {
  const blue = grid(8, 2, ROWS.x - 2 * ROWS.step, ROWS.y, ROWS.step)
  const red = grid(12, 3, ROWS.x + 1.1 * ROWS.step, ROWS.y, ROWS.step)
  return [...loose(plus ? blue.slice(0, 2).map((pt) => ({ x: pt.x, y: ROWS.y })) : blue, { s: 1.5, k: 'u', colour: 'blue' }), ...loose(red, { s: 1.5, k: 'r', colour: 'red' })]
}

const HEAVY = { ...beadsOn({ n: 20, cols: 5, colour: 'blue' }), size: 30 }
const LIGHT = { ...beadsOn({ n: 2, cols: 2, colour: 'red' }, { n: 12, cols: 4 }), size: 30 }

export const r05: Spec = {
  rank: 5,
  id: 'r05',
  title: 'Brackets',
  layers: ['scale'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ held: true }), line: line(BARE, { y: TOP }) },
      say: 'Two plus three times four. Plus first, or times first: will they come out the same?',
      turn: { kind: 'predict', id: 'order', prompt: 'Plus first or times first: the same?', options: [{ label: 'The same', icon: beam(0) }, { label: 'Not the same', icon: beam(-14) }] },
    },
    { stage: { scale: balance({ left: { ...HEAVY, from: { x: -520, y: -260 } }, held: true }) }, move: 1.2, cue: 'bead', say: 'Plus first: two plus three is five. Five times four is twenty.' },
    { stage: { scale: balance({ left: HEAVY, right: { ...LIGHT, from: { x: 520, y: -260 } }, held: true }) }, move: 1.2, cue: 'bead', say: 'Times first: three times four is twelve. Two more makes fourteen.' },
    { stage: { props: null, scale: balance({ left: HEAVY, right: LIGHT }) }, cue: 'slide', say: 'Not the same! Twenty is heavier than fourteen.' },
    { say: 'One line must not mean two things.' },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { line: line(BARE, WORK) }, pad: 0.1 },
    {
      stage: { line: entering(line(FIRST, WORK), { '(#0': { x: 300, o: 0 }, ')#0': { x: 1620, o: 0 } }) },
      move: 1.2,
      quiet: 1.8,
      motif: true,
      say: 'These are brackets.',
    },
    { stage: { beads: beads(false), line: line(FIRST, { ...WORK, gold: ['(', ')'] }) }, say: 'Brackets say: do this part first.' },
    { stage: { line: line([...FIRST, '=', '20'], WORK) }, say: 'Two plus three is five. Five times four equals twenty.', poster: true },
    { stage: { beads: beads(true), line: line(SECOND, WORK) }, move: 1.3, cue: 'slide', say: 'Move the brackets, and it changes. Two plus twelve equals fourteen.' },
    { stage: { line: line(SECOND, { ...WORK, gold: ['(', ')'] }) }, move: 0.5, say: 'Brackets always come in a pair: one opens, and one closes.' },

    // ── 3. Where it is used ──
    { act: 3, stage: { line: line([...BARE, '=', '14'], WORK) }, say: 'With no brackets, times and divide go first. So this is still fourteen.' },
    {
      clear: true,
      stage: {
        line: line(['(', '8', '−', '2', ')', '÷', '3', '=', '2'], { y: 330, size: 160 }),
        six: loose([...row(2, 660, 680, 72), ...row(2, 900, 680, 72), ...row(2, 1140, 680, 72), ...row(2, 1380, 680, 72)], { s: 1.5, k: 'e', ghost: (i) => (i >= 6 ? 1 : 0) }),
      },
      say: 'Eight minus two is six. Six divided by three equals two.',
    },
    { clear: true, stage: { line: line(BARE, OLD), over: overline() }, move: 1.3, say: 'Long ago, people drew a line over the part instead. Brackets do the same job.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true9', prompt: 'Which one is true?', cards: [['(', '1', '+', '2', ')', '×', '3', '=', '9'], ['1', '+', '(', '2', '×', '3', ')', '=', '9']], right: 0 },
    },
    {
      clear: true,
      say: 'Which sign makes this true?',
      turn: { kind: 'place', id: 'sign5', prompt: 'Which sign makes it true?', toks: ['10', '−', '(', '2', '_', '3', ')', '=', '5'], tiles: ['+', '×', '−'], right: '+', size: 150 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['(', '6', '−', '2', ')', '×', '5', '=', '20'], { y: 480, size: 170 }) }, move: 0.6, say: 'Six minus two, then times five, equals twenty.', turn: { kind: 'read', id: 'read20', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { scale: balance({ left: beadsOn({ n: 7, cols: 4 }), right: beadsOn(9) }), line: line(['7', '_', '9'], { y: TOP, at: OVER }) }, say: 'Seven and nine are not equal.' },
    { teaser: true, stage: { line: line(['7', '_', '9'], { y: TOP, at: OVER, gold: ['_'] }) }, move: 0.5, say: 'So what are they?', pad: 1 },
  ],
}
