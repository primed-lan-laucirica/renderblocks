/**
 * Rank 23, not, and, or: sums with true and false. The signs on the paper
 * are those of ranks 1–6, letters (rank 12) and the three themselves. A
 * line that is true or false is a statement, and a lamp shows which: lit
 * for true, dark for false. ¬ turns a statement over, ∧ is true only when
 * both are, ∨ when at least one is. Where they are used: x between two
 * numbers (and) or outside them (or), the stroke of ≠ as a not, and
 * sorting things by two questions at once.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { lamp } from '../kit/logic'
import { B } from '../kit/look'
import { numberLine, stretch, type Ruler } from '../kit/measures'
import { line, type BeadColour, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

/** A statement with its lamp under it. */
const LAMP_Y = 690
const stated = (k: string, toks: Tok[], x: number, on: boolean | null, o: { size?: number; gold?: string[]; y?: number } = {}): Sprite[] => [
  ...line(toks, { x, y: o.y ?? 430, size: o.size ?? 220, gold: o.gold }).map((s) => ({ ...s, k: `${k}/${s.k}` })),
  lamp(`${k}/lamp`, x, LAMP_Y, on),
]

/** P and Q with their lamps, and what one sign makes of them. */
const joined = (sign: '∧' | '∨', p: boolean, q: boolean, gold = false): Patch => ({
  p: stated('p', ['P'], 380, p),
  q: stated('q', ['Q'], 760, q),
  out: stated('out', ['P', sign, 'Q'], 1390, sign === '∧' ? p && q : p || q, { gold: gold ? [sign] : [] }),
})

const R: Ruler = { x0: 360, x1: 1560, y: 700, from: 0, to: 7 }

/** Six beads, red or blue, big or small, and a lamp under each one that the statement picks out. */
const BEADS: { red: boolean; big: boolean }[] = [
  { red: true, big: true },
  { red: false, big: true },
  { red: true, big: false },
  { red: false, big: false },
  { red: true, big: true },
  { red: false, big: false },
]
const sorted = (lit: (b: { red: boolean; big: boolean }) => boolean): Sprite[] =>
  BEADS.flatMap((b, i) => {
    const x = 960 + (i - 2.5) * 230
    const side = b.big ? 120 : 64
    const colour: BeadColour = b.red ? 'red' : 'blue'
    return [{ k: `bead${i}`, type: 'bead', n: { x, y: 640 - side / 2, s: side / B, o: 1, ghost: 0 }, d: { colour } } as Sprite, lamp(`lamp${i}`, x, 770, lit(b), { r: 34 })]
  })

export const r23: Spec = {
  rank: 23,
  id: 'r23',
  title: 'Not, and, or',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { p: stated('p', ['3', '<', '5'], 960, null) },
      say: 'Three is less than five. Is that true, or false?',
      turn: { kind: 'predict', id: 'true35', prompt: 'True, or false?', options: [{ label: 'True' }, { label: 'False' }] },
    },
    { stage: { p: stated('p', ['3', '<', '5'], 960, true) }, say: 'True. We light a lamp for true.' },
    { stage: { p: stated('p', ['3', '<', '5'], 520, true), q: stated('q', ['5', '<', '3'], 1400, false) }, say: 'Five is less than three is false. Its lamp stays dark.' },
    {
      stage: { names: [...line(['P'], { x: 520, y: 200, size: 170, gold: ['P'] }), ...line(['Q'], { x: 1400, y: 200, size: 170, gold: ['Q'] })] },
      say: 'A line that is either true or false is called a statement. We can name a statement with a letter: P, and Q.',
    },
    { say: 'Now we want to join statements: both of these, or one of these, or not this one.', pad: 0.4 },

    // ── 2. What the signs do ──
    {
      act: 2,
      clear: true,
      stage: { p: stated('p', ['P'], 520, true), out: stated('out', ['¬', 'P'], 1400, false, { gold: ['¬'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign means not. It turns a statement over. P is true, so not P is false.',
    },
    { stage: { p: stated('p', ['Q'], 520, false), out: stated('out', ['¬', 'Q'], 1400, true) }, say: 'Q is false, so not Q is true.' },
    { clear: true, stage: joined('∧', true, true, true), move: 1.1, quiet: 1.2, motif: true, say: 'This sign means and. P and Q is true only when both of them are true.' },
    { stage: joined('∧', true, false), move: 0.6, say: 'Put one lamp out, and P and Q is false.' },
    { stage: joined('∨', true, false, true), move: 1.1, quiet: 1.2, motif: true, say: 'This sign means or. P or Q is true when at least one of them is true.' },
    { stage: joined('∨', true, true), move: 0.6, say: 'Both true counts as well.' },
    { stage: joined('∨', false, false), move: 0.6, say: 'Only when both are false is P or Q false.' },
    {
      clear: true,
      stage: { not: line(['¬', 'P'], { x: 300, y: 480, size: 170 }), and: line(['P', '∧', 'Q'], { x: 870, y: 480, size: 170 }), or: line(['P', '∨', 'Q'], { x: 1520, y: 480, size: 170 }) },
      say: 'Not turns over. And needs both. Or needs at least one: its sign is the sign for and, upside down.',
      poster: true,
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { axis: numberLine(R, { size: 60 }), mid: [stretch('mid', R, 2, 5)], line: line(['2', '<', 'x', '∧', 'x', '<', '5'], { y: 300, size: 170 }) },
      say: 'Here x is more than two, and x is less than five. So x lies between two and five.',
    },
    {
      stage: { mid: null, low: [stretch('low', R, 0, 2)], high: [stretch('high', R, 5, 7)], line: line(['x', '<', '2', '∨', 'x', '>', '5'], { y: 300, size: 170 }) },
      say: 'With or, either will do: x is less than two, or x is more than five.',
    },
    {
      clear: true,
      stage: { long: line(['¬', '(', 'x', '=', '3', ')'], { y: 360, size: 210, gold: ['¬'] }), short: line(['x', '≠', '3'], { y: 720, size: 210, gold: ['≠'] }) },
      say: 'Not, x equals three, says the same as: x is not equal to three. The stroke is a not.',
    },
    {
      clear: true,
      stage: { line: line(['P', '∧', 'Q'], { y: 250, size: 190 }), beads: sorted((b) => b.red && b.big) },
      say: 'They sort things, too. P says: this bead is red. Q says: this bead is big. P and Q picks only the big red beads.',
    },
    { stage: { line: line(['P', '∨', 'Q'], { y: 250, size: 190 }), beads: sorted((b) => b.red || b.big) }, say: 'P or Q picks every bead that is red, or big, or both. A search on a computer works this way.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: [...line(['P'], { x: 640, y: TOP, size: 150 }), lamp('lp', 800, TOP, true, { r: 44 }), ...line(['Q'], { x: 1120, y: TOP, size: 150 }), lamp('lq', 1280, TOP, false, { r: 44 })] },
      say: 'P is true, and Q is false. Which one is true?',
      turn: { kind: 'choose', id: 'pq', prompt: 'P is true and Q is false. Which one is true?', cards: [['P', '∧', 'Q'], ['P', '∨', 'Q']], right: 1 },
    },
    {
      clear: true,
      say: 'Which sign makes this line true?',
      turn: { kind: 'place', id: 'join', prompt: 'Which sign makes it true?', toks: ['3', '<', '5', '_', '5', '<', '3'], tiles: ['∧', '∨'], right: '∨', size: 150 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['P', '∧', '¬', 'Q'], { y: 480, size: 230 }) }, move: 0.6, say: 'P and not Q.', turn: { kind: 'read', id: 'readpnq', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { if: line(['x', '=', '2'], { x: 400, y: 460, size: 170 }), then: line(['x', '+', '1', '=', '3'], { x: 1400, y: 460, size: 170 }) },
      say: 'If x equals two, then x plus one equals three.',
    },
    { teaser: true, stage: { ask: line(['?'], { x: 835, y: 460, size: 170, gold: ['?'] }) }, say: 'Which sign says: if this, then that?', pad: 1 },
  ],
}
