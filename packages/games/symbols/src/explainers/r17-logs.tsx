/**
 * Rank 17, log e ln: the function that finds the power. log asks "ten to
 * which power makes this number?", so it runs f(x) = 10ˣ backwards; the root
 * sign undoes a power too, but gives back the base, where log gives back the
 * power. e is one number's name, as π is: what one grows to when it grows a
 * little at every moment. ln is the log that asks about powers of e. Where
 * they are used: a scale for very big numbers (one more is ten times as
 * much), and steady growth.
 *
 * No names or dates are narrated.
 */
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import { machine, type Machine } from '../kit/algebra'
import type { Tok } from '../kit/glyphs'
import { GOLD, GOLD_EDGE, INK, SOFT } from '../kit/look'
import { beadAt, hop, numberLine, onLine, type Ruler } from '../kit/measures'
import { line, type BeadColour, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const BLUE = '#2f6394'

/** A numeral as it is written: 10000 is 10,000. */
const written = (n: number) => n.toLocaleString('en-US')
/** A line whose sprites are named apart from another line's in the same actor. */
const named = (k: string, list: Sprite[]): Sprite[] => list.map((s) => ({ ...s, k: `${k}/${s.k}` }))

// ── the machine ──────────────────────────────────────────────────────────

const M: Machine = { x: 960, y: 600, w: 640, h: 300 }
/** What waits at the funnel and what has come out of the spout (it comes on from inside the machine). */
const fed = (k: string, into: string, out: string): Sprite[] => {
  const size = 124
  const wide = (g: string) => (g.length > 1 ? 330 : 80)
  return [
    ...named(`${k}in`, line([into], { x: M.x - 320 - 96 - 44 - wide(into) / 2, y: M.y, size })),
    ...named(`${k}out`, line([out], { x: M.x + 320 + 84 + 44 + wide(out) / 2, y: M.y, size })).map((s) => ({ ...s, enter: { x: M.x, o: 0 } })),
  ]
}

// ── growing ──────────────────────────────────────────────────────────────

const GROW = { x0: 460, x1: 1240, base: 900, unit: 320 }
const high = (v: number) => GROW.base - (v - 1) * GROW.unit
/**
 * One, growing for the same time three ways: by its whole self in one step
 * (to 2), by half and by half again (to 2.25), and a little at every moment
 * (to e). `show` is how many of the three are drawn; `only` leaves the last.
 */
function growing(show: 1 | 2 | 3, only = false): Sprite[] {
  const tok = (k: string, g: string, x: number, y: number, gold = 0): Sprite => ({ k, type: 'tok', n: { x, y, size: 66, o: 1, gold }, d: { it: line([g])[0].d.it } })
  const out: Sprite[] = [
    {
      k: 'growth',
      type: 'custom',
      n: { a: only ? 0 : 1, b: show > 1 && !only ? 1 : 0, c: show > 2 ? 1 : 0, o: 1 },
      d: {
        id: 'growth',
        draw: (p) => {
          const { x0, x1 } = GROW
          const mid = (x0 + x1) / 2
          const curve = Array.from({ length: 41 }, (_, i) => `${x0 + ((x1 - x0) * i) / 40},${high(Math.exp(i / 40))}`).join(' ')
          return (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1={x0 - 40} y1={high(1)} x2={x1 + 40} y2={high(1)} stroke={SOFT} strokeWidth={4} opacity={0.55} />
              <g opacity={p.a}>
                <polyline points={`${x0},${high(1)} ${x1},${high(2)}`} stroke={SOFT} strokeWidth={9} />
                <circle cx={x1} cy={high(2)} r={13} fill={SOFT} />
              </g>
              <g opacity={p.b}>
                <polyline points={`${x0},${high(1)} ${mid},${high(1.5)} ${x1},${high(2.25)}`} stroke={BLUE} strokeWidth={9} />
                <circle cx={mid} cy={high(1.5)} r={13} fill={BLUE} />
                <circle cx={x1} cy={high(2.25)} r={13} fill={BLUE} />
              </g>
              <g opacity={p.c}>
                <polyline points={curve} stroke={GOLD} strokeWidth={12} />
                <circle cx={x1} cy={high(Math.E)} r={17} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={4} />
              </g>
              <circle cx={x0} cy={high(1)} r={13} fill={INK} />
            </g>
          )
        },
      },
    },
    tok('from', '1', GROW.x0 - 60, high(1) - 6),
  ]
  if (!only) out.push(tok('two', '2', GROW.x1 + 62, high(2)))
  if (show > 1 && !only) out.push(tok('more', '2.25', GROW.x1 + 104, high(2.25)))
  if (show > 2 && !only) out.push(tok('most', 'e', GROW.x1 + 62, high(Math.E), 1))
  return out
}

// ── the scale ────────────────────────────────────────────────────────────

const SCALE: Ruler = { x0: 210, x1: 1710, y: 760, from: 1, to: 6 }
/** A line of logs, 1 to 6, with the number each one is the log of above it. */
const scale = (): Sprite[] => [
  ...numberLine(SCALE, { size: 64 }),
  ...[1, 2, 3, 4, 5, 6].flatMap((v) => named(`of${v}`, line([written(10 ** v)], { x: onLine(SCALE, v), y: SCALE.y - 78, size: 56 }))),
]

// ── building a log ───────────────────────────────────────────────────────

const BUILD = { y: 520, size: 84, step: 110 }
/** n beads in a row, one for each ten multiplied in; under them the power of ten they make. */
const tens = (n: number): Patch => ({
  beads: Array.from({ length: n }, (_, i) => ({ ...beadAt(`t${i}`, 960 + (i - (n - 1) / 2) * BUILD.step, BUILD.y, BUILD.size), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  power: line(['10', { sup: String(n), k: 'p' }, '=', { g: written(10 ** n), k: 'made' }], { y: 740, size: 130, gold: n === 4 ? ['p'] : [] }),
  line: line(['log', '(', '10,000', ')', '=', { g: n === 0 ? '?' : String(n), k: 'n' }], { y: TOP, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
})

// ── three beads (the question for rank 18) ───────────────────────────────

const THREE = { y: 560, size: 150, step: 250 }
const three = (order: BeadColour[]): Sprite[] => order.map((c, i) => beadAt(`bead ${c}`, 960 + (i - 1) * THREE.step, THREE.y, THREE.size, c))

const thousand = (gold: string[] = [], power: Tok = { sup: '3', k: 'p' }): Sprite[] => line(['10', power, '=', '1,000'], { y: 330, size: 210, gold })
const logOf = (gold: string[] = []): Sprite[] => line(['log', '(', '1,000', ')', '=', { g: '3', k: 'p' }], { y: 680, size: 210, gold })

export const r17: Spec = {
  rank: 17,
  id: 'r17',
  title: 'Logs and e',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { line: thousand(['x'], { sup: 'x', k: 'x' }) },
      say: 'Ten to which power is one thousand?',
      turn: { kind: 'predict', id: 'power', prompt: 'Ten to which power?', options: [{ label: 'Three' }, { label: 'Four' }] },
    },
    { stage: { line: thousand(), times: line(['10', '×', '10', '×', '10', '=', '1,000'], { y: 680, size: 130 }) }, say: 'Three. Ten times ten times ten is one thousand.' },
    { stage: { line: thousand(['p']) }, move: 0.5, say: 'We found the power by counting the tens. Is there a function that finds it for us?' },

    // ── 2. What the signs do ──
    { act: 2, stage: { line: thousand(), times: null, log: logOf(['log']) }, quiet: 1.4, motif: true, say: 'There is. This is log, short for logarithm.' },
    { stage: { log: logOf() }, move: 0.5, say: 'We read it: log of one thousand equals three.', poster: true },
    { stage: { line: thousand(['p']), log: logOf(['p']) }, move: 0.5, say: 'Log asks one question: ten to which power makes this number?' },
    {
      clear: true,
      stage: { machine: machine(M), rule: line([{ fn: 'f' }, '(', 'x', ')', '=', '10', { sup: 'x' }], { x: M.x, y: M.y, size: 84 }), fed: fed('a', '3', '1,000') },
      say: 'Here is a function: f of x equals ten to the x. Three goes in, and one thousand comes out.',
    },
    { stage: { rule: named('log', line(['log', '(', 'x', ')'], { x: M.x, y: M.y, size: 96, gold: ['log'] })), fed: fed('b', '1,000', '3') }, say: 'Log runs it backwards. One thousand goes in, and three comes out.' },
    {
      clear: true,
      stage: { line: line(['10', { sup: '2', k: 'p' }, '=', '100'], { y: 230, size: 170, gold: ['10'] }), root: line([{ root: '100' }, '=', '10'], { y: 530, size: 170, gold: ['10'] }) },
      say: 'The root sign undoes a power too. From one hundred, it gives back the ten.',
    },
    {
      stage: { line: line(['10', { sup: '2', k: 'p' }, '=', '100'], { y: 230, size: 170, gold: ['p'] }), root: line([{ root: '100' }, '=', '10'], { y: 530, size: 170 }), log: line(['log', '(', '100', ')', '=', '2'], { y: 820, size: 170, gold: ['2'] }) },
      say: 'Log gives back the two: the power.',
    },
    { clear: true, stage: { line: line(['e', '≈', '2.718'], { y: TOP, size: 170, gold: ['e'] }) }, quiet: 1.4, motif: true, say: 'This letter is the number E. Like pi, it is one number, always the same: about two point seven one eight.' },
    { stage: { line: line(['e', '≈', '2.718'], { y: TOP, size: 170 }), grow: growing(1) }, say: 'It comes from growing. Let one grow by its whole self in a single step. It doubles: two.' },
    { stage: { grow: growing(2) }, say: 'Grow it by half, and then by half again, and it reaches two and a quarter.' },
    { stage: { grow: growing(3) }, say: 'Grow it a little at every moment, and it reaches E.' },
    {
      clear: true,
      stage: { log: line(['log', '(', '10', { sup: '3' }, ')', '=', '3'], { y: 330, size: 180 }), ln: line(['ln', '(', 'e', { sup: '3' }, ')', '=', '3'], { y: 680, size: 180, gold: ['ln'] }) },
      say: 'This sign is the natural log. It works like log, but it asks: the number E to which power?',
    },

    // ── 3. Where they are used ──
    { act: 3, clear: true, stage: { scale: scale(), line: line(['log', '(', '1,000,000', ')', '=', '6'], { y: TOP, size: 150 }) }, say: 'Logs are used when numbers get very big. Log of a million is only six.' },
    {
      stage: { hop: [hop('hop', { ...SCALE, y: SCALE.y - 110 }, 5, 6, { h: 60 })], by: line(['×', '10'], { x: onLine(SCALE, 5.5), y: SCALE.y - 270, size: 90 }) },
      say: 'Loud sounds and earthquakes are measured on a scale like this. One more on the scale means ten times as strong.',
    },
    {
      clear: true,
      stage: { grow: growing(3, true), line: line(['e', { sup: 'x' }], { x: 1420, y: 420, size: 200 }) },
      say: 'E is used for steady growth: anything that grows a little at every moment, like money in a bank.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'Your turn. Which one is true?',
      turn: { kind: 'choose', id: 'log100', prompt: 'Which one is true?', cards: [['log', '(', '100', ')', '=', '10'], ['log', '(', '100', ')', '=', '2']], right: 1 },
    },
    {
      clear: true,
      say: 'Find the log of ten thousand. Put on a bead for every ten you multiply in.',
      turn: { kind: 'build', id: 'log10000', prompt: 'Find the log of ten thousand.', target: 4, max: 6, zone: { x: 460, y: 330, w: 1000, h: 330 }, state: tens },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['log', '(', '10', ')', '=', '1'], { y: 480, size: 220 }) }, move: 0.6, say: 'Log of ten equals one.', turn: { kind: 'read', id: 'readlog', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { beads: three(['red', 'blue', 'green']) }, say: 'Here are three beads: red, blue and green.' },
    { teaser: true, stage: { beads: three(['blue', 'red', 'green']) }, say: 'They can swap places. In how many orders can they stand in a row?', pad: 1 },
  ],
}
