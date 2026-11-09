/**
 * Rank 2, + and − : beads pushed onto a pan, beads taken off it. The signs on
 * the paper are =, + and − only. Plus joins and works either way round; minus
 * takes away, compares, and undoes plus.
 *
 * No history is narrated. (Checked, should a line be wanted: Johann Widman,
 * Leipzig, 1489, the first printed + and −, for a surplus and a shortfall.)
 */
import type { Spec } from '../engine/spec'
import { balance, beadsOn, cardOn, line, loose, PAN_X, PIVOT, props, type Pile } from '../kit/sprites'
import { beam, FROM_TRAY, OVER_LEFT, PAN_ZONE, TOP } from './shared'

const THREE: Pile = { n: 3, colour: 'blue' }
const TWO: Pile = { n: 2, colour: 'red' }

/** A sum over each pan, with equals over the pivot (3 + 2 = 2 + 3). */
const OVER_BOTH = [PAN_X.left - 130, PAN_X.left, PAN_X.left + 130, PIVOT.x, PAN_X.right - 130, PAN_X.right, PAN_X.right + 130]

const APART = { x: 728, y: 500, step: 116 }
/** Five over three, lined up at the left: the two that stick out are how far apart the amounts are. */
const apart = () => {
  const at = (i: number, r: number) => ({ x: APART.x + i * APART.step, y: APART.y + r * 150 })
  return [
    ...loose([0, 1, 2].map((i) => at(i, 0)), { s: 2.4, k: 'f', colour: 'blue' }),
    ...loose([3, 4].map((i) => at(i, 0)), { s: 2.4, k: 'x' }),
    ...loose([0, 1, 2].map((i) => at(i, 1)), { s: 2.4, k: 't', colour: 'red' }),
  ]
}

const PILES = ['3', '+', '3', '+', '3', '+', '3', '+', '3', '=', '15']

export const r02: Spec = {
  rank: 2,
  id: 'r02',
  title: 'Plus and minus',
  layers: ['scale', 'minus'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ left: beadsOn(THREE), right: beadsOn(5), held: true }) },
      say: 'Three here, five there. If we push two more on, will it be level?',
      turn: { kind: 'predict', id: 'level', prompt: 'Two more: will it be level?', options: [{ label: 'Level', icon: beam(0) }, { label: 'Not level', icon: beam(14) }] },
    },
    { stage: { scale: balance({ left: { ...beadsOn(THREE, TWO), from: { x: -520, y: -260 } }, right: beadsOn(5), held: true }) }, move: 1.3, cue: 'bead', say: 'Two more, pushed together with the three.' },
    { stage: { props: null }, cue: 'slide', say: 'Level! Three and two together are the same as five.' },
    { stage: { line: line(['3', '_', '2', '=', '5'], { y: TOP, at: OVER_LEFT, gold: ['_'] }) }, say: 'We can write equals. But we have no sign for "together".' },

    // ── 2. What the signs do ──
    { act: 2, stage: { line: line(['3', '+', '2', '=', '5'], { y: TOP, at: OVER_LEFT, gold: ['+'] }) }, quiet: 1.4, motif: true, say: 'This is plus.' },
    { stage: { line: line(['3', '+', '2', '=', '5'], { y: TOP, at: OVER_LEFT }) }, move: 0.5, say: 'Three plus two equals five.', poster: true },
    { stage: { line: line(['3', '+', '2', '=', '5'], { y: TOP, at: OVER_LEFT, gold: ['+'] }) }, move: 0.5, say: 'Plus joins two amounts into one.' },
    { clear: true, stage: { minus: balance({ left: beadsOn(5), right: beadsOn(3) }) }, say: 'Five here, three there. This side is too heavy.' },
    { stage: { minus: balance({ left: beadsOn({ n: 5, ghost: 2 }), right: beadsOn(3) }) }, cue: 'slide', say: 'Take two away, and it is level.' },
    { stage: { line: line(['−'], { y: TOP, size: 200, at: [PAN_X.left] }) }, quiet: 1.6, motif: true, say: 'This is minus.' },
    { stage: { line: line(['5', '−', '2', '=', '3'], { y: TOP, at: OVER_LEFT }) }, say: 'Five minus two equals three.' },
    { stage: { line: line(['5', '−', '2', '=', '3'], { y: TOP, at: OVER_LEFT, gold: ['−'] }) }, move: 0.5, say: 'Minus takes one amount away from another.' },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { scale: balance({ left: beadsOn(THREE, TWO), right: beadsOn(TWO, THREE) }), line: line(['3', '+', '2', '=', '2', '+', '3'], { y: TOP, at: OVER_BOTH }) },
      say: 'Plus works either way round. Three plus two is the same as two plus three.',
    },
    { clear: true, stage: { rows: apart(), line: line(['5', '−', '3', '=', '2'], { y: TOP }) }, say: 'Minus can also compare. Five is two more than three, so five minus three equals two.' },
    {
      clear: true,
      stage: { sum: line(['3', '+', '2', '=', '5'], { y: 300, under: true, gold: ['+'] }), less: line(['5', '−', '2', '=', '3'], { y: 660, under: true, gold: ['−'] }) },
      say: 'Minus undoes plus. Put two on, take two off, and you are back at three.',
    },
    { clear: true, stage: { line: line(['1,000', '+', '1', '=', '1,001'], { y: 480 }) }, quiet: 1.5, say: 'A thousand plus one equals a thousand and one.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which sign makes this true?',
      turn: { kind: 'place', id: 'sign7', prompt: 'Which sign makes it true?', toks: ['4', '_', '3', '=', '7'], tiles: ['+', '−'], right: '+', under: true },
    },
    {
      clear: true,
      say: 'Five plus how many equals eight? Put them on.',
      turn: {
        kind: 'build',
        id: 'add3',
        prompt: 'Five plus how many equals eight?',
        target: 3,
        max: 7,
        zone: PAN_ZONE.left,
        state: (n) => ({
          scale: balance({ left: { ...beadsOn({ n: 5, cols: 2, colour: 'blue' }, { n, cols: 2, colour: 'red' }), from: FROM_TRAY.left }, right: cardOn('8') }),
          line: line(['5', '+', { g: n === 0 ? '?' : String(n), k: 'made' }, '=', '8'], { y: TOP, at: OVER_LEFT, gold: n === 3 ? ['='] : [], faint: n === 3 ? [] : ['='] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['9', '−', '4', '=', '5'], { y: 480, size: 190 }) }, move: 0.6, say: 'Nine minus four equals five.', turn: { kind: 'read', id: 'read9', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { line: line(PILES, { y: 440, size: 140, under: true }) }, say: 'Five piles of three. Three plus three plus three plus three plus three equals fifteen.' },
    { teaser: true, stage: { line: line(PILES, { y: 440, size: 140, under: true, gold: ['+'] }) }, move: 0.5, say: 'Do we have to write plus again and again?', pad: 1 },
  ],
}
