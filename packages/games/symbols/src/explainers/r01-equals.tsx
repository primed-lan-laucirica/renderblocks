/**
 * Rank 1, = : two pans that balance. Only numerals and = are ever on the
 * paper ("not the same" stays in words until rank 6 names it). The sign is
 * a claim that must be true: when a pan gains a bead, it comes off.
 *
 * The shape is told by its reason, with no name and no date: two lines of
 * one length, because no two things can be more equal. (The reason is Robert
 * Recorde's, The Whetstone of Witte, London, 1557: "…a paire of paralleles,
 * or Gemowe lines of one lengthe, thus: =, bicause noe .2. thynges, can be
 * moare equalle.")
 */
import type { Spec } from '../engine/spec'
import { INK } from '../kit/look'
import { balance, beadsOn, cardOn, line, PIVOT, props, type Sprite } from '../kit/sprites'
import { beam, FROM_TRAY, OVER, PAN_ZONE, TOP } from './shared'

/** Recorde's pair of lines, drawn long so they can be seen to be twins: `len` is half their length. */
const twin = (len: number, x: number, y: number, size = 150): Sprite[] => [
  {
    k: 'twin',
    type: 'custom',
    n: { x, y, len, o: 1 },
    d: {
      id: 'twin',
      draw: (p) => (
        <g stroke={INK} strokeWidth={size * 0.09} strokeLinecap="round">
          <line x1={p.x - p.len} y1={p.y - size * 0.115} x2={p.x + p.len} y2={p.y - size * 0.115} />
          <line x1={p.x - p.len} y1={p.y + size * 0.115} x2={p.x + p.len} y2={p.y + size * 0.115} />
        </g>
      ),
    },
    enter: { len: 0, o: 1 },
  },
]

export const r01: Spec = {
  rank: 1,
  id: 'r01',
  title: 'Equals',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ left: beadsOn(5), right: beadsOn(3), held: true }) },
      say: 'Is this side the same as that side?',
      turn: { kind: 'predict', id: 'same', prompt: 'Is this side the same as that side?', options: [{ label: 'The same', icon: beam(0) }, { label: 'Not the same', icon: beam(-14) }] },
    },
    { stage: { props: null, scale: balance({ left: beadsOn(5), right: beadsOn(3) }) }, cue: 'slide', say: 'Not the same. This side is heavier.' },
    { stage: { scale: balance({ left: beadsOn(5), right: { ...beadsOn(5), from: { x: 520, y: -260 } } }) }, move: 1.3, cue: 'bead', say: 'Two more, and now the beam is level. The same amount.' },
    {
      stage: { props: props(), scale: balance({ left: beadsOn(4), right: beadsOn({ n: 4, cols: 2 }), held: true }) },
      say: 'Different shapes. Is it the same amount?',
      turn: { kind: 'predict', id: 'shape', prompt: 'Different shapes. Same amount?', options: [{ label: 'The same', icon: beam(0) }, { label: 'Not the same', icon: beam(-14) }] },
    },
    { stage: { props: null }, cue: 'slide', say: "The same. Shape doesn't matter, only how many." },

    // ── 2. What the sign does ──
    { act: 2, stage: { scale: balance({ left: beadsOn(5), right: beadsOn(5) }), line: line(['='], { y: TOP, at: [PIVOT.x] }) }, move: 1.1, quiet: 1.2, motif: true, say: 'This is the equals sign.' },
    { stage: { line: line(['5', '=', '5'], { y: TOP, at: OVER }) }, quiet: 1.2, say: 'Five equals five.', poster: true },
    { stage: { line: line(['5', '=', '5'], { y: TOP, at: OVER, gold: ['='] }) }, move: 0.5, say: 'It says that this side and that side are the same amount.' },
    {
      stage: { scale: balance({ left: beadsOn(5), right: { ...beadsOn(6), from: { x: 520, y: -260 } } }), line: line(['5', '_', '6'], { y: TOP, at: OVER }) },
      move: 1.2,
      cue: 'bead',
      say: 'One more on that side, and equals is not true any more. The sign has to come off.',
    },
    {
      stage: { scale: balance({ left: { ...beadsOn(6), from: { x: -520, y: -260 } }, right: beadsOn(6) }), line: line(['6', '=', '6'], { y: TOP, at: OVER }) },
      move: 1.2,
      cue: 'bead',
      say: 'One more on this side, and it is true again. Six equals six.',
    },

    // ── 3. Where it is used ──
    { act: 3, clear: true, stage: { twin: twin(330, 960, 480) }, move: 1.6, say: 'Its two lines are twins: the same length, side by side. No two things can be more equal.' },
    {
      clear: true,
      stage: { marks: line([{ tally: 5, k: 'tally' }, { roman: 'V', n: 5, k: 'V' }, { g: '5', k: 'five' }], { y: 400, size: 170, under: true, at: [520, 960, 1400] }) },
      say: 'A tally, a Roman five, and our five. Different marks, the same amount.',
    },
    {
      stage: { marks: line([{ g: '5', k: 'five' }, '=', { roman: 'V', n: 5, k: 'V' }], { y: 400, size: 170, under: true, at: [640, 960, 1280] }) },
      move: 1.1,
      quiet: 1.6,
      say: 'So five equals five.',
    },
    { stage: { marks: line([{ roman: 'V', n: 5, k: 'V' }, '=', { g: '5', k: 'five' }], { y: 400, size: 170, under: true, at: [640, 960, 1280] }) }, move: 1.2, cue: 'slide', say: 'And it works both ways.' },
    { clear: true, stage: { line: line(['1,000,000', '=', '1,000,000'], { y: 480, size: 150 }) }, quiet: 1.5, say: 'However big, equals means the same amount.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Make this side the same.',
      turn: {
        kind: 'build',
        id: 'make7',
        prompt: 'Make this side the same.',
        target: 7,
        max: 10,
        zone: PAN_ZONE.right,
        state: (n) => ({
          scale: balance({ left: cardOn('7'), right: { ...beadsOn({ n, cols: 4 }), from: FROM_TRAY.right } }),
          line: line(['7', '=', { g: n === 0 ? '?' : String(n), k: 'made' }], { y: TOP, at: OVER, gold: n === 7 ? ['='] : [], faint: n === 7 ? [] : ['='] }),
        }),
      },
    },
    {
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true6', prompt: 'Which one is true?', cards: [['6', '=', '9'], ['6', '=', '6']], right: 1, under: true },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['12', '=', '12'], { y: 480, size: 190 }) }, move: 0.6, say: 'Twelve equals twelve.', turn: { kind: 'read', id: 'read12', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: {
        scale: balance({ left: beadsOn({ n: 3, colour: 'blue' }, { n: 2, colour: 'red' }), right: beadsOn(5) }),
        line: line(['3', '_', '2', '=', '5'], { y: TOP }),
      },
      say: 'Three and two, pushed together, are the same as five.',
    },
    { teaser: true, stage: { line: line(['3', '_', '2', '=', '5'], { y: TOP, gold: ['_'] }) }, move: 0.5, say: 'How do we write "together"?', pad: 1 },
  ],
}
