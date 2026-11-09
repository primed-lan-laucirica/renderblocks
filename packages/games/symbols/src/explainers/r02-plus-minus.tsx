/**
 * Rank 2, + and − : beads pushed onto a pan, beads taken off it. The signs on
 * the paper are =, + and − only.
 *
 * History (checked): Johann Widman, Leipzig, 1489, the first printed + and −.
 * He used them for a surplus and a shortfall (his examples weigh barrels of
 * figs), not yet for adding and taking away. Not narrated: where the marks
 * came from before him.
 */
import type { Spec } from '../engine/spec'
import { balance, beadsOn, cardOn, line, loose, PAN_X, props, row, type Pile } from '../kit/sprites'
import { barrel, beam, book, crossed, FROM_TRAY, OVER_LEFT, OVER_RIGHT, PAN_ZONE, TOP } from './shared'

const THREE: Pile = { n: 3, colour: 'blue' }
const TWO: Pile = { n: 2, colour: 'red' }

const BARREL = { more: 640, less: 1280, y: 800 }
/** Two barrels of figs, each with its mark; `more` and `less` show what the marks said. */
const barrels = (more: boolean, less: boolean) => ({
  barrels: [barrel('more', BARREL.more, BARREL.y), barrel('less', BARREL.less, BARREL.y)],
  marks: line(['+', '−'], { y: BARREL.y - 150, size: 130, at: [BARREL.more, BARREL.less], gold: [...(more ? ['+'] : []), ...(less ? ['−'] : [])] }),
  extra: more ? loose(row(2, BARREL.more, BARREL.y - 350, 70), { s: 1.4, k: 'm', from: { x: BARREL.more, y: BARREL.y - 520 } }) : null,
  short: less ? loose(row(2, BARREL.less, BARREL.y - 350, 70), { s: 1.4, k: 's', ghost: () => 1 }) : null,
})

const PILES = ['3', '+', '3', '+', '3', '+', '3', '+', '3', '=', '15']

export const r02: Spec = {
  rank: 2,
  id: 'r02',
  title: 'Plus and minus',
  layers: ['barrels', 'scale', 'minus'],
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

    // ── 2. Where it came from ──
    { act: 2, clear: true, stage: { book: book(520, 520, ['Johann', 'Widman'], '1489'), signs: line(['+', '−'], { x: 1260, y: 450, size: 280 }) }, say: 'In 1489, Johann Widman printed two little signs in a German book.' },
    { clear: true, stage: barrels(false, false), say: 'He used them for barrels of figs.' },
    { stage: barrels(true, false), cue: 'bead', say: 'This one meant a little more.' },
    { stage: barrels(true, true), cue: 'slide', say: 'And this one meant a little less.' },

    // ── 3. The signs at work ──
    { act: 3, clear: true, stage: { line: line(['+'], { y: 460, size: 340 }) }, quiet: 1.6, motif: true, say: 'This is plus.' },
    { stage: { scale: balance({ left: beadsOn(THREE, TWO), right: beadsOn(5) }), line: line(['3', '+', '2', '=', '5'], { y: TOP, at: OVER_LEFT }) }, move: 1.1, say: 'Three plus two equals five.', poster: true },
    {
      stage: { scale: crossed(balance({ left: beadsOn(5), right: beadsOn(THREE, TWO) })), line: line(['5', '=', '3', '+', '2'], { y: TOP, at: OVER_RIGHT }) },
      move: 1.4,
      cue: 'slide',
      say: 'And the other way round: five equals three plus two.',
    },
    { clear: true, stage: { minus: balance({ left: beadsOn(5), right: beadsOn(3) }) }, say: 'Five here, three there. This side is too heavy.' },
    { stage: { minus: balance({ left: beadsOn({ n: 5, ghost: 2 }), right: beadsOn(3) }) }, cue: 'slide', say: 'Take two away, and it is level.' },
    { stage: { line: line(['−'], { y: TOP, size: 200, at: [PAN_X.left] }) }, quiet: 1.6, motif: true, say: 'This is minus.' },
    { stage: { line: line(['5', '−', '2', '=', '3'], { y: TOP, at: OVER_LEFT }) }, say: 'Five minus two equals three.' },
    {
      clear: true,
      stage: { sum: line(['3', '+', '2', '=', '5'], { y: 300, under: true, gold: ['+'] }), less: line(['5', '−', '2', '=', '3'], { y: 660, under: true, gold: ['−'] }) },
      say: 'Plus puts more on. Minus takes some off.',
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
