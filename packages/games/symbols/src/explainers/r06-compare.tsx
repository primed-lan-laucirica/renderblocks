/**
 * Rank 6, < > ≤ ≥ ≠ : a beam that is not level, and what to write then. The
 * signs on the paper are =, + and the five new ones.
 *
 * History (checked): < and > are first printed in Thomas Harriot's Artis
 * Analyticae Praxis (1631), published after his death by his editors, so
 * the narration says "a book by Thomas Harriot showed". The "or equal to"
 * lines came later (Bouguer, 1734, with a double line). Not narrated: the
 * story of the mark on a man's arm, or who first drew ≠.
 */
import type { Spec } from '../engine/spec'
import { balance, beadsOn, cardOn, line, props, type Pile } from '../kit/sprites'
import { beam, book, crossed, FROM_TRAY, OVER, PAN_ZONE, TOP } from './shared'

const SEVEN: Pile = { n: 7, cols: 4 }
const NINE: Pile = { n: 9, cols: 5 }

const LEFT = { x: 520, y: 440, size: 170, under: true }
const RIGHT = { x: 1400, y: 440, size: 170, under: true }

export const r06: Spec = {
  rank: 6,
  id: 'r06',
  title: 'More, less, not equal',
  layers: ['scale'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ left: beadsOn(SEVEN), right: beadsOn(NINE), held: true }) },
      say: 'Seven here, nine there. Which side will go down?',
      turn: { kind: 'predict', id: 'down', prompt: 'Which side will go down?', options: [{ label: 'This side', icon: beam(-14) }, { label: 'That side', icon: beam(14) }] },
    },
    { stage: { props: null, scale: balance({ left: beadsOn(SEVEN), right: beadsOn(NINE) }) }, cue: 'slide', say: 'That side. Nine is more than seven.' },
    { stage: { line: line(['7', '_', '9'], { y: TOP, at: OVER, gold: ['_'] }) }, say: "Equals can't say that. We need new signs." },

    // ── 2. Where it came from ──
    { act: 2, clear: true, stage: { book: book(520, 520, ['Thomas', 'Harriot'], '1631'), signs: line(['<', '>'], { x: 1260, y: 380, size: 280 }) }, say: 'In 1631, a book by Thomas Harriot showed these two signs.' },
    { stage: { more: line(['≤', '≥'], { x: 1260, y: 700, size: 280 }) }, say: 'Later, people added lines to mean "or equal to".' },

    // ── 3. The signs at work ──
    { act: 3, clear: true, stage: { line: line(['<'], { y: 460, size: 340 }) }, quiet: 1.6, motif: true, say: 'This is the less-than sign.' },
    { stage: { scale: balance({ left: beadsOn(SEVEN), right: beadsOn(NINE) }), line: line(['7', '<', '9'], { y: TOP, at: OVER }) }, move: 1.1, say: 'Seven is less than nine.', poster: true },
    { stage: { line: line(['7', '<', '9'], { y: TOP, at: OVER, gold: ['<'] }) }, move: 0.5, say: 'The small end points at the smaller number.' },
    {
      stage: { scale: crossed(balance({ left: beadsOn(NINE), right: beadsOn(SEVEN) })), line: line(['9', '>', '7'], { y: TOP, at: OVER }) },
      move: 1.4,
      cue: 'slide',
      quiet: 2,
      motif: true,
      say: 'Turned round, it is the greater-than sign. Nine is greater than seven.',
    },
    { stage: { line: line(['9', '≠', '7'], { y: TOP, at: OVER }) }, quiet: 1.6, motif: true, say: 'This sign means not equal. Nine is not equal to seven.' },
    {
      stage: { scale: crossed(balance({ left: beadsOn(NINE), right: { ...beadsOn(NINE), from: { x: 520, y: -260 } } })), line: line(['9', '=', { g: '9', k: 'nine' }], { y: TOP, at: OVER }) },
      move: 1.2,
      cue: 'bead',
      say: 'Two more, and now they are equal. Nine equals nine.',
    },
    { clear: true, stage: { line: line(['≤'], { y: 460, size: 340 }) }, quiet: 1.6, motif: true, say: 'This sign means less than, or equal to.' },
    { stage: { line: line(['4', '≤', '5'], LEFT), twin: line(['5', '≤', '5'], RIGHT) }, move: 1.1, say: 'Four is less than or equal to five. And so is five. Both are true.' },
    { clear: true, stage: { line: line(['≥'], { y: 460, size: 340 }) }, quiet: 1.6, motif: true, say: 'And this one means greater than, or equal to.' },
    { stage: { line: line(['6', '≥', '5'], LEFT), twin: line(['5', '≥', '5'], RIGHT) }, move: 1.1, say: 'Six is greater than or equal to five. And so is five.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which sign goes here?',
      turn: { kind: 'place', id: 'sign83', prompt: 'Which sign goes here?', toks: ['8', '_', '3'], tiles: ['<', '=', '>'], right: '>', under: true },
    },
    {
      clear: true,
      say: 'Three plus four. Which sign goes here?',
      turn: { kind: 'place', id: 'sign79', prompt: 'Which sign goes here?', toks: ['3', '+', '4', '_', '9'], tiles: ['<', '=', '>'], right: '<' },
    },
    {
      clear: true,
      say: 'Make this side greater than four.',
      turn: {
        kind: 'build',
        id: 'more4',
        prompt: 'Make this side greater than four.',
        target: 5,
        max: 5,
        zone: PAN_ZONE.left,
        state: (n) => ({
          scale: balance({ left: { ...beadsOn({ n, cols: 3 }), from: FROM_TRAY.left }, right: cardOn('4') }),
          line: line([{ g: n === 0 ? '?' : String(n), k: 'made' }, '>', '4'], { y: TOP, at: OVER, gold: n > 4 ? ['>'] : [], faint: n > 4 ? [] : ['>'] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['10', '≠', '12'], { y: 480, size: 190 }) }, move: 0.6, say: 'Ten is not equal to twelve.', turn: { kind: 'read', id: 'read10', prompt: 'You read it.' } },
    { clear: true, stage: { line: line(['=', '≠', '<', '>', '≤', '≥'], { y: 480, size: 190 }) }, say: 'Six signs for comparing two amounts. Now you know them all.', pad: 1 },
  ],
}
