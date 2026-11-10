/**
 * Rank 34, defined as and identical to: the jobs the equals sign was doing
 * all at once. The signs on the paper are those of ranks 1–7, letters
 * (rank 12), function names (rank 15), pi (rank 16), rank 24's two-headed
 * arrow, rank 25's for-all, and the two themselves with the word mod. :=
 * gives a name (it is a choice, not a claim); ≡ says two sides are equal
 * whatever the letters are; plain = is left for what is true of some
 * numbers only. Where they are used: bringing in a new name, rules that
 * hold for every number, and, with mod, numbers that land on the same
 * place of a clock.
 *
 * No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { items, place, widthOf, type Tok } from '../kit/glyphs'
import { member } from '../kit/logic'
import { INK, WOOD_DARK } from '../kit/look'
import { line, type Sprite } from '../kit/sprites'

const fx: Tok[] = [{ fn: 'f' }, '(', 'x', ')']

/** The three lines of the opening, one under the other. */
const ROW = { y: [270, 500, 730], size: 150 }
const SOLVED: Tok[] = ['x', '+', '2', '=', '5']
const ALWAYS: Tok[] = ['x', '+', 'x', '=', '2', 'x']
const NAMED: Tok[] = [...fx, '=', '2', 'x']
const row = (toks: Tok[], i: number, gold: string[] = []) => line(toks, { y: ROW.y[i], size: ROW.size, gold })

/** A clock face: twelve numerals round a ring, and one hand, `h` hours on from twelve (`gold`, the numeral it lands on shows in gold). */
const CLOCK = { x: 460, y: 590, r: 290 }
const clock = (h: number, o: { from?: number; gold?: boolean; x?: number; y?: number; r?: number } = {}): Sprite[] => {
  const { x, y, r } = { ...CLOCK, ...o }
  return [
    {
      k: 'clock/face',
      type: 'custom',
      n: { x, y, r, h, o: 1 },
      enter: o.from === undefined ? undefined : { h: o.from },
      d: {
        id: 'clock',
        draw: (p) => {
          const a = (p.h / 12) * 2 * Math.PI
          return (
            <g transform={`translate(${p.x} ${p.y})`}>
              <circle r={p.r} fill="#fbf6ea" stroke={WOOD_DARK} strokeWidth={p.r * 0.034} />
              <line x1={0} y1={0} x2={Math.sin(a) * p.r * 0.56} y2={-Math.cos(a) * p.r * 0.56} stroke={INK} strokeWidth={p.r * 0.048} strokeLinecap="round" />
              <circle r={p.r * 0.05} fill={INK} />
            </g>
          )
        },
      },
    },
    ...Array.from({ length: 12 }, (_, i) => {
      const a = ((i + 1) / 12) * 2 * Math.PI
      return member(`clock/n${i + 1}`, String(i + 1), { x: x + Math.sin(a) * r * 0.8, y: y - Math.cos(a) * r * 0.8 }, { size: r * 0.22, gold: !!o.gold && (i + 1) % 12 === h % 12 })
    }),
  ]
}

/**
 * A line that ends in a bracket of its own, as (mod 12) does. The bracket
 * stands off the number before it, so that it is not read as times.
 */
const ASIDE = 0.24
const aside = (toks: Tok[], o: { x?: number; y: number; size: number; gold?: string[] }): Sprite[] => {
  const list = items(toks)
  const from = list.findIndex((it) => it.g === '(')
  return line(toks, { ...o, at: place(list, o.size).map((dx, i) => (o.x ?? 960) + dx + ((i < from ? -1 : 1) * ASIDE * o.size) / 2) })
}

/** The line of his turn: the gap stands in the middle of the paper, a small clock on its left and the bracket on its right. */
const TURN = { y: 430, size: 140 }
const MOD: Tok[] = ['(', 'mod', '12', ')']
const span = (toks: Tok[], size: number) => {
  const list = items(toks)
  const xs = place(list, size)
  return xs[xs.length - 1] - xs[0] + ((widthOf(list[0]) + widthOf(list[list.length - 1])) / 2) * size
}
const modAt = 960 + span(['15', '≡', '3'], TURN.size) / 2 + ASIDE * TURN.size + span(MOD, TURN.size) / 2

export const r34: Spec = {
  rank: 34,
  id: 'r34',
  title: 'Defined as, identical to',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { solved: row(SOLVED, 0) },
      say: 'X plus two equals five. Is that true for every x, or for just one?',
      turn: { kind: 'predict', id: 'onex', prompt: 'True for every x, or for just one?', options: [{ label: 'Every x' }, { label: 'Just one' }] },
    },
    { stage: { always: row(ALWAYS, 1) }, say: 'Just one. X must be three. But x plus x equals two x is true whatever x is.' },
    { stage: { named: row(NAMED, 2) }, say: 'And f of x equals two x claims nothing at all. It only gives a name.' },
    { stage: { solved: row(SOLVED, 0, ['=']), always: row(ALWAYS, 1, ['=']), named: row(NAMED, 2, ['=']) }, move: 0.5, say: 'One sign is doing three jobs.' },

    // ── 2. What the signs do ──
    {
      act: 2,
      clear: true,
      stage: { line: line([...fx, ':=', '2', 'x'], { y: 460, size: 200, gold: [':='] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: is defined as. F of x is defined as two x.',
    },
    { stage: { line: line([...fx, ':=', '2', 'x'], { y: 460, size: 200, gold: ['fn'] }) }, move: 0.5, say: 'It is an equals sign with two dots, on the side of the new name. A name is a choice, so it cannot be false.' },
    {
      clear: true,
      stage: { line: line(['x', '+', 'x', '≡', '2', 'x'], { y: 330, size: 200, gold: ['≡'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: is identical to. X plus x is identical to two x.',
    },
    {
      stage: { all: line(['∀', 'x', '(', 'x', '+', 'x', '=', '2', 'x', ')'], { y: 720, size: 150 }) },
      say: 'It is an equals sign with one bar more. It says the two sides are equal for all x.',
    },
    {
      clear: true,
      stage: {
        named: line([...fx, ':=', '2', 'x'], { y: ROW.y[0], size: ROW.size, gold: [':='] }),
        always: line(['x', '+', 'x', '≡', '2', 'x'], { y: ROW.y[1], size: ROW.size, gold: ['≡'] }),
        solved: line(['x', '+', '2', '=', '5', '⇔', 'x', '=', '3'], { y: ROW.y[2], size: ROW.size }),
      },
      say: 'Now each job has its own sign. A name. Always equal. And the plain equals sign, for what is true only when x is three.',
      poster: true,
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { def: line(['d', ':=', '2', 'r'], { y: 330, size: 190, gold: [':='] }), use: line(['C', '=', 'π', 'd'], { y: 720, size: 190 }) },
      say: 'The first is used wherever a new name comes in. D is defined as two r. Every line after it can use d.',
    },
    {
      clear: true,
      stage: { line: line(['a', '+', 'b', '≡', 'b', '+', 'a'], { y: 460, size: 200, gold: ['≡'] }) },
      say: 'The three bars mark a rule that holds for every number. A plus b is identical to b plus a.',
    },
    { clear: true, stage: { clock: clock(14, { from: 0 }) }, move: 2.4, say: 'The three bars have a second job. On a clock, count fourteen hours on from twelve. You land on two.' },
    {
      stage: { clock: clock(14, { gold: true }), line: aside(['14', '≡', '2', ...MOD], { x: 1330, y: 590, size: 120, gold: ['≡'] }) },
      say: 'We write: fourteen is congruent to two, mod twelve. Counting round in twelves, they are the same place.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Which one is true for every x?',
      turn: { kind: 'choose', id: 'ident', prompt: 'Which one is true for every x?', cards: [['x', '+', 'x', '+', 'x', '≡', '3', 'x'], ['x', '+', '3', '≡', '3', 'x']], right: 0 },
    },
    {
      clear: true,
      stage: { clock: clock(15, { x: 330, y: TURN.y, r: 200, gold: true }), mod: line(MOD, { x: modAt, y: TURN.y, size: TURN.size }) },
      say: 'Fifteen and three are not equal. But on a clock they are the same place. Put in the sign.',
      turn: { kind: 'place', id: 'clock15', prompt: 'Which sign belongs here?', toks: ['15', '_', '3'], tiles: ['=', '≡'], right: '≡', ...TURN },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...fx, ':=', 'x', '+', '1'], { y: 480, size: 200 }) }, move: 0.6, say: 'F of x is defined as x plus one.', turn: { kind: 'read', id: 'readdef', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { know: line(['x', '>', '5'], { y: 270, size: 170 }), also: line(['5', '>', '3'], { y: 500, size: 170 }) },
      say: 'X is more than five. Five is more than three.',
    },
    {
      teaser: true,
      stage: { ask: line(['?'], { x: 620, y: 760, size: 170, gold: ['?'] }), so: line(['x', '>', '3'], { x: 1000, y: 760, size: 170 }) },
      say: 'So x is more than three. Which sign says: so?',
      pad: 1,
    },
  ],
}
