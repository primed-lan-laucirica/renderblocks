/**
 * Rank 51, isomorphism and equivalence: an equals sign with a wave on top,
 * and a single bar with a wave on top. The signs on the paper are those of
 * ranks 1–6, ≈ (rank 10), letters (rank 12), labels set low (rank 14),
 * f( ) (rank 15), log (rank 17), the pair's comma (rank 27), the map's
 * colon and arrows (ranks 24 and 33) and the rank's own two. Two rows of
 * numbers, 1 2 4 8 16 and 0 1 2 3 4, are paired by a map that keeps the
 * pattern: times in the top row is plus in the bottom row. Two things
 * with the same pattern under such a pairing are isomorphic: the members
 * differ, the shape is the same. The single bar is looser ("is equivalent
 * to"): alike in the way that matters, and no more. The signs are a
 * family: bars say "the same", waves say "alike". Where it is used: doing
 * a sum in the easier of two isomorphic worlds (a log turns times into
 * plus), and seeing one pattern in two places (a clock's hours and the
 * turns of its hand).
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { arrow, member, type Pen } from '../kit/logic'
import { INK } from '../kit/look'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const over = (a: string, b: string): Tok => ({ frac: [a, b] })
const of = (f: string, ...x: Tok[]): Tok[] => [{ fn: f }, '(', ...x, ')']
const FAB: Tok[] = [{ fn: 'f' }, ':', 'A', '→', 'B']
/** A short line of tokens with its own keys (a name beside a row, a label by an arrow). */
const label = (k: string, toks: Tok[], at: Pt, size = 110, gold?: string[]): Sprite[] => line(toks, { x: at.x, y: at.y, size, gold }).map((s) => ({ ...s, k: `${k}/${s.k}` }))

// ── two rows of numbers, paired ──────────────────────────────────────────

/** The top row doubles at each step; the bottom row adds one. An arrow runs from each number to the one under it. */
const XS = [250, 460, 670, 880, 1090]
const UP_Y = 360
const DOWN_Y = 720
const UP = ['1', '2', '4', '8', '16']
const DOWN = ['0', '1', '2', '3', '4']
const SIDE = { x: 1520, size: 120 }
/** `gold` picks the pairs to light (counted from 0); `names` writes A and B before the rows. */
const rows = (o: { gold?: number[]; names?: boolean } = {}): Patch => ({
  up: UP.map((g, i) => member(`up${i}`, g, { x: XS[i], y: UP_Y }, { size: 110, gold: o.gold?.includes(i) })),
  down: DOWN.map((g, i) => member(`down${i}`, g, { x: XS[i], y: DOWN_Y }, { size: 110, gold: o.gold?.includes(i) })),
  go: XS.map((x, i) => arrow(`go${i}`, { x, y: UP_Y }, { x, y: DOWN_Y }, { gap: 92, pen: o.gold?.includes(i) ? 'gold' : 'ink' })),
  names: o.names ? [...label('nameA', ['A'], { x: 90, y: UP_Y }, 120), ...label('nameB', ['B'], { x: 90, y: DOWN_Y }, 120)] : [],
})
const beside = (y: number, toks: Tok[], o: { size?: number; gold?: string[] } = {}) => line(toks, { x: SIDE.x, y, size: o.size ?? SIDE.size, gold: o.gold })

// ── things that are alike in a looser way ────────────────────────────────

const shape = (k: string, x: number, y: number, round: boolean, pen: Pen = 'blue'): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, o: 1 },
  d: {
    id: `shape ${round} ${pen}`,
    draw: (p) => (round ? <circle cx={p.x} cy={p.y} r={170} fill="#fbf6ea" stroke={pen === 'blue' ? '#2f6394' : '#9c3c2b'} strokeWidth={10} /> : <rect x={p.x - 150} y={p.y - 150} width={300} height={300} fill="#fbf6ea" stroke={pen === 'blue' ? '#2f6394' : '#9c3c2b'} strokeWidth={10} strokeLinejoin="round" />),
  },
})

// ── crossing over, and a clock ───────────────────────────────────────────

/** A hard sum up here, an easy one down there. */
const HARD = { left: 500, right: 1420, up: 320, down: 740 }
const crossing = (stage: 0 | 1 | 2 | 3): Patch => ({
  hard: line(['8', '×', '16'], { x: HARD.left, y: HARD.up, size: 160 }),
  over: stage >= 1 ? [arrow('over', { x: HARD.left, y: HARD.up }, { x: HARD.left, y: HARD.down }, { gap: 110 }), ...label('log', ['log', { sub: '2' }], { x: HARD.left + 170, y: (HARD.up + HARD.down) / 2 }, 90)] : [],
  easy: stage >= 1 ? line(['3', '+', '4'], { x: HARD.left, y: HARD.down, size: 160 }) : [],
  sum: stage >= 2 ? [...label('eq', ['='], { x: 960, y: HARD.down }, 160), ...label('seven', ['7'], { x: HARD.right, y: HARD.down }, 160)] : [],
  back: stage >= 3 ? [arrow('back', { x: HARD.right, y: HARD.down }, { x: HARD.right, y: HARD.up }, { gap: 110, pen: 'gold' }), ...label('eqUp', ['='], { x: 960, y: HARD.up }, 160), ...label('answer', ['128'], { x: HARD.right, y: HARD.up }, 160, ['128'])] : [],
})

/** A clock face with one hand; `turn` is how far round the hand has gone (1 is all the way). */
const CLOCK = { x: 600, y: 560, r: 290 }
const clock = (turn: number): Sprite[] => [
  {
    k: 'clock',
    type: 'custom',
    n: { x: CLOCK.x, y: CLOCK.y, turn, o: 1 },
    d: {
      id: 'clock',
      draw: (p) => {
        const a = p.turn * Math.PI * 2
        return (
          <g stroke={INK} strokeLinecap="round">
            <circle cx={p.x} cy={p.y} r={CLOCK.r} fill="#fbf6ea" strokeWidth={8} />
            {Array.from({ length: 12 }, (_, i) => {
              const t = (i / 12) * Math.PI * 2
              return <line key={i} x1={p.x + Math.sin(t) * (CLOCK.r - 22)} y1={p.y - Math.cos(t) * (CLOCK.r - 22)} x2={p.x + Math.sin(t) * (CLOCK.r - 4)} y2={p.y - Math.cos(t) * (CLOCK.r - 4)} strokeWidth={5} />
            })}
            <line x1={p.x} y1={p.y} x2={p.x + Math.sin(a) * (CLOCK.r - 150)} y2={p.y - Math.cos(a) * (CLOCK.r - 150)} stroke="#9c3c2b" strokeWidth={14} />
            <circle cx={p.x} cy={p.y} r={14} fill={INK} stroke="none" />
          </g>
        )
      },
    },
  },
  ...['12', '3', '6', '9'].map((g, i) => member(`hour${g}`, g, { x: CLOCK.x + Math.sin((i * Math.PI) / 2) * (CLOCK.r - 70), y: CLOCK.y - Math.cos((i * Math.PI) / 2) * (CLOCK.r - 70) }, { size: 70 })),
]

export const r51: Spec = {
  rank: 51,
  id: 'r51',
  title: 'Isomorphism',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { ...rows({ gold: [1, 2, 3] }), top: beside(UP_Y, ['2', '×', '4', '=', '8']), bottom: beside(DOWN_Y, ['1', '+', '2', '=', '3']) },
      say: 'Two rows of numbers, paired by arrows. Up here, two times four is eight. Underneath: one plus two is three. Does it work for four times four too?',
      turn: { kind: 'predict', id: 'fourfour', prompt: 'Does it work for four times four too?', options: [{ label: 'Yes' }, { label: 'No' }] },
    },
    {
      stage: { ...rows({ gold: [2, 4] }), top: beside(UP_Y, ['4', '×', '4', '=', '16']), bottom: beside(DOWN_Y, ['2', '+', '2', '=', '4']) },
      say: 'Yes. Four times four is sixteen. Underneath: two plus two is four.',
    },
    {
      stage: { ...rows({ names: true }), top: null, bottom: null, ask: beside(540, ['A', { g: '?', k: 'ask' }, 'B'], { size: 170, gold: ['ask'] }) },
      say: 'Call the rows A and B. Their numbers are different, but they behave alike. We need a sign for that.',
    },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { ...rows({ names: true, gold: [3] }), ask: null, map: beside(UP_Y, FAB, { size: 130 }), one: beside(DOWN_Y, ['8', '↦', '3'], { size: 150 }) },
      say: 'The pairing is a map: f, from A to B. Eight maps to three.',
    },
    {
      stage: { ...rows({ names: true }), one: null, map: beside(540, FAB, { size: 130 }), keeps: line([...of('f', 'x', '×', 'y'), '=', ...of('f', 'x'), '+', ...of('f', 'y')], { y: 930, size: 110, gold: ['×', '+'] }) },
      say: 'And the map keeps the pattern: times up here turns into plus down there.',
    },
    { clear: true, stage: { line: line(['A', '≅', 'B'], { y: 430, size: 320, gold: ['≅'] }) }, move: 1.1, quiet: 1.4, motif: true, say: 'For that, we put a wave on top of the equals sign. We read it: A is isomorphic to B.' },
    {
      clear: true,
      stage: { ...rows({ names: true }), line: beside(400, ['A', '≅', 'B'], { size: 170 }), not: beside(680, ['A', '≠', 'B'], { size: 170 }) },
      say: 'Isomorphic means: the same shape. A does not equal B: the members are different. The pattern they make is the same.',
      poster: true,
    },
    {
      clear: true,
      stage: { square: [shape('square', 480, 560, false)], round: [shape('round', 1440, 560, true, 'red')], line: line(['≃'], { y: 560, size: 320, gold: ['≃'] }) },
      quiet: 0.7,
      motif: true,
      say: 'With only one bar under the wave, we read: is equivalent to. It is looser. A square can be bent into a circle: for some questions, that is alike enough.',
    },
    {
      clear: true,
      stage: { family: line(['=', '≅', '≃', '≈'], { y: 500, size: 260, at: [360, 760, 1160, 1560], gold: ['≅', '≃'] }) },
      say: 'These signs are one family. A bar says: the same. A wave says: alike. The fewer the bars, the looser the likeness.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: crossing(0),
      also: [
        { at: 4.6, stage: crossing(1) },
        { at: 7.4, stage: crossing(2) },
      ],
      say: 'Isomorphic things can stand in for each other. Eight times sixteen is hard. So cross over: three plus four is seven.',
    },
    { stage: crossing(3), say: 'Then cross back: one hundred and twenty-eight. That is what a log is for: it turns times into plus.' },
    {
      clear: true,
      stage: { clock: clock(0), hours: beside(380, ['3', '+', '3', '=', '6'], { size: 130 }) },
      also: [
        { at: 2.6, move: 1.2, stage: { clock: clock(0.25) } },
        { at: 4.6, move: 1.2, stage: { clock: clock(0.5), turns: beside(700, [over('1', '4'), '+', over('1', '4'), '=', over('1', '2')], { size: 130 }) } },
      ],
      say: 'A clock: three hours and three more. Its hand: a quarter turn and a quarter more. Hours and turns are isomorphic.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { a: line(['2', '↦', '1'], { x: 330, y: TOP - 60, size: 100 }), b: line(['8', '↦', '3'], { x: 760, y: TOP - 60, size: 100 }), c: line(['16', '↦', '4'], { x: 1200, y: TOP - 60, size: 100 }), given: line(['2', '×', '8', '=', '16'], { y: TOP + 85, size: 120 }) },
      say: 'Two maps to one, eight to three, sixteen to four. Two times eight is sixteen. Which one says the same, underneath?',
      turn: { kind: 'choose', id: 'underneath', prompt: 'Which one says the same, underneath?', cards: [['1', '×', '3', '=', '3'], ['1', '+', '3', '=', '4']], right: 1 },
    },
    {
      clear: true,
      say: 'G and H have different members, but the same pattern. Which sign goes between them?',
      turn: { kind: 'place', id: 'whichwave', prompt: 'Different members, the same pattern. Which sign?', toks: ['G', '_', 'H'], tiles: ['=', '≅'], right: '≅', size: 210 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['V', '≅', 'W'], { y: 480, size: 280 }) }, move: 0.6, say: 'V is isomorphic to W.', turn: { kind: 'read', id: 'readiso', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { first: line(['(', '1', ',', '2', ')'], { x: 560, y: 420, size: 190 }), second: line(['(', '3', ',', '4', ',', '5', ')'], { x: 1320, y: 420, size: 190 }) },
      say: 'Here are two lists of numbers. There are two ways to put them together into one.',
    },
    {
      teaser: true,
      stage: { ask: line([{ g: '?', k: 'ask' }], { y: 760, size: 240, gold: ['ask'] }) },
      say: 'Join them end to end. Or multiply every number of one by every number of the other. How many numbers each way?',
      pad: 1,
    },
  ],
}
