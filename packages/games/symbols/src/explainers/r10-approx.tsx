/**
 * Rank 10, ≈ : nearly equal, and saying so. The signs on the paper are =,
 * ≠, +, ×, ÷, the fraction bar, the point, the root and ≈ only. Not-equal
 * is true of 9.9 and 10 but says nothing of how close they are; ≈ does. It
 * is met in rounding, estimating, decimals that never end, and every
 * measurement.
 *
 * The sign is tied to equals by its shape: the same two lines, drawn wavy.
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { beadAt, hundred, numberLine, onLine, stretch, type Ruler } from '../kit/measures'
import { balance, beadsOn, cardOn, line, PAN_X, props, type Pile } from '../kit/sprites'
import { beam, FROM_TRAY, OVER, PAN_ZONE, TOP } from './shared'

const NEARLY: Pile = { n: 9, part: 0.9, cols: 5 }
const TEN: Pile = { n: 10, cols: 5 }
const BLUE = '#5b9bd5'

const SQUARE = { x: 540, y: 590, size: 500 }
const RULER: Ruler = { x0: 260, x1: 1660, y: 740, from: 0, to: 10 }
const TWENTY: Ruler = { x0: 260, x1: 1660, y: 700, from: 0, to: 20 }

const third = (digits: number) => line(['1', '÷', '3', '≈', { g: `0.${'3'.repeat(digits)}`, k: 'dec' }], { y: 480, size: 170 })

export const r10: Spec = {
  rank: 10,
  id: 'r10',
  title: 'Nearly equal',
  layers: ['scale'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ left: beadsOn(NEARLY), right: beadsOn(TEN), held: true }), line: line(['9.9', '10'], { y: TOP, at: [PAN_X.left, PAN_X.right] }) },
      say: 'Nine point nine on this side. Ten on that side. Will the beam stay level?',
      turn: { kind: 'predict', id: 'level', prompt: 'Will the beam stay level?', options: [{ label: 'Level', icon: beam(0) }, { label: 'Not level', icon: beam(8) }] },
    },
    { stage: { props: null, scale: balance({ left: beadsOn(NEARLY), right: beadsOn(TEN), tilt: 3 }) }, cue: 'slide', say: 'Not quite. That side is a tiny bit heavier.' },
    { stage: { line: line(['9.9', '≠', '10'], { y: TOP, at: OVER }) }, say: 'Nine point nine is not equal to ten. True. But that does not say how close they are.' },
    { stage: { line: line(['9.9', '_', '10'], { y: TOP, at: OVER, gold: ['_'] }) }, say: 'We need a sign for nearly equal.' },

    // ── 2. What the sign does ──
    { act: 2, stage: { line: line(['9.9', '≈', '10'], { y: TOP, at: OVER }) }, quiet: 1.4, motif: true, say: 'This sign means approximately equal.' },
    { say: 'Nine point nine is approximately equal to ten.', poster: true },
    { stage: { line: line(['9.9', '≈', '10'], { y: TOP, at: OVER, gold: ['≈'] }) }, move: 0.5, say: 'It is the equals sign, drawn with wavy lines. Nearly the same, but not exactly.' },
    {
      stage: { scale: balance({ left: beadsOn(TEN), right: beadsOn(TEN) }), line: line(['9.9', '+', '0.1', '=', '10'], { y: TOP }) },
      move: 1.2,
      cue: 'bead',
      say: 'Add the missing tenth, and now it is exact. Only then do we write equals.',
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { square: hundred(98, SQUARE), line: line(['98', '≈', '100'], { x: 1370, y: 560, size: 170 }) },
      say: 'Rounding uses this sign. Ninety-eight is approximately one hundred, and one hundred is easier to work with.',
    },
    { clear: true, stage: { line: line(['19', '×', '5', '=', '?'], { y: 320, size: 170 }) }, say: 'Estimating uses it as well. Nineteen times five is hard to do in your head.' },
    { stage: { twin: line(['20', '×', '5', '=', '100'], { y: 700, size: 170 }) }, say: 'But twenty times five is easy: one hundred.' },
    { stage: { line: line(['19', '×', '5', '≈', '100'], { y: 320, size: 170, gold: ['≈'] }) }, say: 'So nineteen times five is approximately one hundred.' },
    {
      clear: true,
      stage: { line: third(1) },
      also: [2, 3, 4].map((d, i) => ({ at: [2.1, 2.6, 3.3][i], move: 0.5, stage: { line: third(d) } })),
      say: 'One divided by three is zero point three three three, and the threes never end. So we stop somewhere, and write approximately.',
    },
    {
      clear: true,
      stage: { axis: numberLine(RULER, { every: 0.5 }), rod: [stretch('rod', RULER, 0, 7.46, { up: 74, wide: 48, colour: BLUE })], line: line(['≈', '7.5'], { x: onLine(RULER, 3.73), y: 470, size: 170 }) },
      move: 1.3,
      say: 'And measuring is always approximate. This rod is about seven and a half long.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which sign goes here?',
      turn: { kind: 'place', id: 'sign33', prompt: 'Which sign goes here?', toks: ['0.33', '_', { frac: ['1', '3'] }], tiles: ['=', '≈', '>'], right: '≈' },
    },
    {
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'true99', prompt: 'Which one is true?', cards: [['50', '≈', '100'], ['99', '≈', '100']], right: 1 },
    },
    {
      clear: true,
      say: 'Twenty-eight is approximately how many? Put on tens.',
      turn: {
        kind: 'build',
        id: 'tens28',
        prompt: 'Twenty-eight is approximately how many?',
        target: 3,
        max: 4,
        unit: 10,
        zone: PAN_ZONE.right,
        state: (n) => ({
          scale: balance({
            left: cardOn('28'),
            right: { ...beadsOn(...Array.from({ length: n }, (): Pile => ({ n: 10, cols: 2 }))), from: FROM_TRAY.right, size: 28 },
            tilt: n === 3 ? 2 : n < 3 ? -10 : 10,
          }),
          line: line(['28', '≈', { g: n === 0 ? '?' : String(10 * n), k: 'made' }], { y: TOP, at: OVER, gold: n === 3 ? ['≈'] : [], faint: n === 3 ? [] : ['≈'] }),
        }),
      },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    {
      stage: { line: line([{ root: '10' }, '≈', '3.16'], { y: 480, size: 200 }) },
      move: 0.6,
      say: 'The square root of ten is approximately three point one six.',
      turn: { kind: 'read', id: 'read316', prompt: 'You read it.' },
    },
    {
      clear: true,
      teaser: true,
      stage: {
        axis: numberLine(TWENTY, { labels: [0, 7, 10, 13, 20], size: 70 }),
        gaps: [stretch('lo', TWENTY, 7, 10, { colour: BLUE }), stretch('hi', TWENTY, 13, 10)],
        marks: [beadAt('m7', onLine(TWENTY, 7), TWENTY.y, 60, 'blue'), beadAt('m13', onLine(TWENTY, 13), TWENTY.y, 60)],
      },
      say: 'Seven is three away from ten. So is thirteen.',
    },
    { teaser: true, stage: { line: line(['_', '=', '3'], { y: 330, size: 190, gold: ['_'] }) }, say: 'How do we write how far apart two numbers are?', pad: 1 },
  ],
}
