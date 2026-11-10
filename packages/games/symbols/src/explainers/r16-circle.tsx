/**
 * Rank 16, π θ sin cos tan: the signs for round things and for turning.
 * π is one number's name (round ÷ across, the same for every circle); θ is
 * the usual name for an angle; cos and sin are functions, like f(x), that
 * take an angle and give how far across and how far up the end of an arm
 * one long is; tan is sin over cos, how steep the arm is. Where they are
 * used: wheels (C = πd), waves (anything that turns or swings), slopes.
 *
 * The sheet has no degree sign, so angles are drawn and named, never
 * numbered. No names or dates are narrated.
 */
import type { Spec } from '../engine/spec'
import { GOLD, GOLD_EDGE, INK, PAPER, SOFT } from '../kit/look'
import { beadAt, numberLine, type Ruler } from '../kit/measures'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

const BLUE = '#2f6394'
const CREAM = '#fbf6ea'

// ── the wheel ────────────────────────────────────────────────────────────

const ROAD: Ruler = { x0: 250, x1: 1690, y: 760, from: 0, to: 4 }
const UNIT = (ROAD.x1 - ROAD.x0) / 4

/**
 * A wheel standing on the ground at (x, y), `r` its radius, rolled `roll`
 * of a turn to the right. Its rim is a gold tape that is laid on the ground
 * as it rolls, so one whole turn leaves the distance round as a straight line.
 */
function wheel(o: { x: number; y: number; r: number; roll: number; from?: number; label?: string; ground?: boolean; round?: boolean }): Sprite[] {
  const far = (roll: number) => roll * 2 * Math.PI * o.r
  const out: Sprite[] = [
    {
      k: 'wheel',
      type: 'custom',
      n: { x: o.x, y: o.y, r: o.r, roll: o.roll, ground: o.ground ? 1 : 0, o: 1 },
      d: {
        id: 'wheel',
        draw: (p) => {
          const cx = p.x + p.roll * 2 * Math.PI * p.r
          const cy = p.y - p.r - 8
          const a0 = p.roll * 2 * Math.PI
          // An angle counted clockwise from the foot of the wheel, as it looks on the paper.
          const on = (a: number): [number, number] => [cx - p.r * Math.sin(a), cy + p.r * Math.cos(a)]
          const left = Array.from({ length: 61 }, (_, i) => on(a0 + ((2 * Math.PI - a0) * i) / 60).join(',')).join(' ')
          const [ax, ay] = on(a0 + Math.PI / 2)
          const [bx, by] = on(a0 - Math.PI / 2)
          const [mx, my] = on(a0)
          return (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1={p.x - p.r - 30} y1={p.y} x2={p.x + 2 * Math.PI * p.r + p.r + 30} y2={p.y} stroke={INK} strokeWidth={5} opacity={p.ground} />
              <circle cx={cx} cy={cy} r={p.r} fill={CREAM} stroke={INK} strokeWidth={5} />
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke={SOFT} strokeWidth={6} strokeDasharray="4 16" />
              {p.roll < 0.998 && <polyline points={left} stroke={GOLD} strokeWidth={14} />}
              {p.roll > 0.002 && <line x1={p.x} y1={p.y - 8} x2={cx} y2={p.y - 8} stroke={GOLD} strokeWidth={14} />}
              <circle cx={mx} cy={my} r={11} fill={INK} />
            </g>
          )
        },
      },
      enter: o.from !== undefined ? { roll: o.from, o: 1 } : undefined,
    },
  ]
  const cx = (roll: number) => o.x + far(roll)
  if (o.label) out.push({ k: 'across', type: 'tok', n: { x: cx(o.roll), y: o.y - o.r - 8 - o.r * 0.34, size: o.r * 0.5, o: 1 }, d: { it: line([o.label])[0].d.it }, enter: o.from !== undefined ? { x: cx(o.from), o: 1 } : undefined })
  if (o.round) out.push({ k: 'round', type: 'tok', n: { x: o.x + o.r * 0.94, y: o.y - o.r - 8 - o.r * 0.94, size: o.r * 0.5, o: 1, gold: 1 }, d: { it: line(['C'])[0].d.it } })
  return out
}
const ROLLING = { x: ROAD.x0, y: ROAD.y, r: UNIT / 2 }
const CIRCLE = { x: 540, y: 850, r: 230 }
const USED = { x: 300, y: 800, r: 140 }

// ── the arm that turns ───────────────────────────────────────────────────

const O = { x: 540, y: 560 }
const ARM = 300
/** Two angles whose across and up come out even: 0.8 and 0.6, then 0.6 and 0.8. */
const LOW = Math.atan2(0.6, 0.8)
const HIGH = Math.atan2(0.8, 0.6)
/** How far to the right of the up line its number stands. */
const UP_AT = 78

/** An arm one long, turned by `ang` inside its circle; `across` and `up` show how far the end of it is each way, with the number beside when one is given. */
function arm(ang: number, o: { across?: boolean | string; up?: boolean | string; one?: boolean; from?: number } = {}): Sprite[] {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const tok = (k: string, g: string, x: number, y: number, size = 62): Sprite => ({ k, type: 'tok', n: { x, y, size, o: 1 }, d: { it: line([g])[0].d.it } })
  const out: Sprite[] = [
    {
      k: 'arm',
      type: 'custom',
      n: { x: O.x, y: O.y, ang, across: o.across ? 1 : 0, up: o.up ? 1 : 0, plate: typeof o.up === 'string' ? 1 : 0, o: 1 },
      d: {
        id: 'arm',
        draw: (p) => {
          const px = p.x + ARM * Math.cos(p.ang)
          const py = p.y - ARM * Math.sin(p.ang)
          const arc = 84
          return (
            <g fill="none" strokeLinecap="round">
              <circle cx={p.x} cy={p.y} r={ARM} stroke={SOFT} strokeWidth={4} opacity={0.55} />
              <line x1={p.x - ARM - 30} y1={p.y} x2={p.x + ARM + 30} y2={p.y} stroke={SOFT} strokeWidth={4} opacity={0.55} />
              <line x1={p.x} y1={p.y - ARM - 30} x2={p.x} y2={p.y + ARM + 30} stroke={SOFT} strokeWidth={4} opacity={0.55} />
              {/* The circle stands back behind the number beside the up line. */}
              <rect x={px + UP_AT - 56} y={(p.y + py) / 2 - 34} width={112} height={68} rx={12} fill={PAPER} opacity={p.plate} />
              <path d={`M ${p.x + arc} ${p.y} A ${arc} ${arc} 0 0 0 ${p.x + arc * Math.cos(p.ang)} ${p.y - arc * Math.sin(p.ang)}`} stroke={INK} strokeWidth={5} />
              <line x1={p.x} y1={p.y} x2={px} y2={p.y} stroke={GOLD} strokeWidth={18} opacity={p.across} />
              <line x1={px} y1={p.y} x2={px} y2={py} stroke={BLUE} strokeWidth={18} opacity={p.up} />
              <line x1={p.x} y1={p.y} x2={px} y2={py} stroke={INK} strokeWidth={9} />
              <circle cx={p.x} cy={p.y} r={11} fill={INK} />
              <circle cx={px} cy={py} r={21} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={5} />
            </g>
          )
        },
      },
      enter: o.from !== undefined ? { ang: o.from, o: 1 } : undefined,
    },
    tok('theta', 'θ', O.x + 136 * Math.cos(ang / 2), O.y - 136 * Math.sin(ang / 2), 70),
  ]
  if (o.one) out.push(tok('one', '1', O.x + (ARM / 2) * c - 46 * s, O.y - (ARM / 2) * s - 46 * c))
  if (typeof o.across === 'string') out.push(tok('acrossN', o.across, O.x + (ARM / 2) * c, O.y + 52))
  if (typeof o.up === 'string') out.push(tok('upN', o.up, O.x + ARM * c + UP_AT, O.y - (ARM / 2) * s))
  return out
}
const BESIDE = { x: 1385, size: 112 }
const fOf = (y: number, g: 'cos' | 'sin', value?: string, gold = false): Sprite[] => line([g, '(', 'θ', ')', ...(value ? ['=', value] : [])], { ...BESIDE, y, gold: gold ? [g] : [] })

// ── the wave, and the ramp ───────────────────────────────────────────────

const WAVE = { cx: 330, cy: 640, r: 160, x0: 600, x1: 1750, turns: 2.25 }
/** The arm going round (`turn` of the way through a little over two turns), and its height set out along a line as it goes: a wave. */
const wave = (turn: number): Sprite[] => [
  {
    k: 'wave',
    type: 'custom',
    n: { x: WAVE.cx, y: WAVE.cy, turn, o: 1 },
    d: {
      id: 'wave',
      draw: (p) => {
        const whole = WAVE.turns * 2 * Math.PI
        const a = p.turn * whole
        const at = (b: number): [number, number] => [WAVE.x0 + (b / whole) * (WAVE.x1 - WAVE.x0), p.y - WAVE.r * Math.sin(b)]
        const n = Math.max(2, Math.ceil(p.turn * 160))
        const pts = Array.from({ length: n + 1 }, (_, i) => at((a * i) / n).join(',')).join(' ')
        const px = p.x + WAVE.r * Math.cos(a)
        const py = p.y - WAVE.r * Math.sin(a)
        const [wx, wy] = at(a)
        return (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx={p.x} cy={p.y} r={WAVE.r} stroke={SOFT} strokeWidth={4} opacity={0.55} />
            <line x1={p.x - WAVE.r - 30} y1={p.y} x2={WAVE.x1 + 30} y2={p.y} stroke={SOFT} strokeWidth={4} opacity={0.55} />
            <line x1={px} y1={py} x2={wx} y2={wy} stroke={SOFT} strokeWidth={4} strokeDasharray="4 14" />
            <polyline points={pts} stroke={BLUE} strokeWidth={12} />
            <line x1={p.x} y1={p.y} x2={px} y2={py} stroke={INK} strokeWidth={8} />
            <circle cx={p.x} cy={p.y} r={9} fill={INK} />
            <circle cx={px} cy={py} r={17} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={4} />
            <circle cx={wx} cy={wy} r={17} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={4} />
          </g>
        )
      },
    },
  },
]

const RAMP = { x: 330, y: 860, step: 150 }
/** A ramp that goes up three for every four across. */
const ramp = (): Sprite[] => {
  const tok = (k: string, g: string, x: number, y: number, size = 84): Sprite => ({ k, type: 'tok', n: { x, y, size, o: 1 }, d: { it: line([g])[0].d.it } })
  const w = 4 * RAMP.step
  const h = 3 * RAMP.step
  return [
    {
      k: 'ramp',
      type: 'custom',
      n: { x: RAMP.x, y: RAMP.y, o: 1 },
      d: {
        id: 'ramp',
        draw: (p) => (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={`M ${p.x} ${p.y} L ${p.x + w} ${p.y - h} L ${p.x + w} ${p.y} Z`} fill={CREAM} stroke="none" />
            <path d={`M ${p.x + 120} ${p.y} A 120 120 0 0 0 ${p.x + 96} ${p.y - 72}`} stroke={INK} strokeWidth={5} />
            <line x1={p.x} y1={p.y} x2={p.x + w} y2={p.y} stroke={GOLD} strokeWidth={16} />
            <line x1={p.x + w} y1={p.y} x2={p.x + w} y2={p.y - h} stroke={BLUE} strokeWidth={16} />
            <line x1={p.x} y1={p.y} x2={p.x + w} y2={p.y - h} stroke={INK} strokeWidth={9} />
          </g>
        ),
      },
    },
    tok('theta', 'θ', RAMP.x + 176, RAMP.y - 54, 70),
    tok('across', '4', RAMP.x + w / 2, RAMP.y + 70),
    tok('up', '3', RAMP.x + w + 64, RAMP.y - h / 2),
  ]
}

// ── doubling (the question for rank 17) ──────────────────────────────────

const GROW = { y: 880, size: 46, xs: [560, 740, 920, 1100, 1330] }
const doubling = (): Sprite[] =>
  [1, 2, 4, 8, 16].flatMap((n, i) => {
    const cols = n > 8 ? 2 : 1
    const step = GROW.size * 1.1
    return [
      ...Array.from({ length: n }, (_, j) => beadAt(`g${i}b${j}`, GROW.xs[i] + ((j % cols) - (cols - 1) / 2) * step, GROW.y - GROW.size / 2 - Math.floor(j / cols) * step, GROW.size)),
      ...line([String(n)], { x: GROW.xs[i], y: GROW.y + 62, size: 70 }).map((s) => ({ ...s, k: `g${i}n` })),
    ]
  })

export const r16: Spec = {
  rank: 16,
  id: 'r16',
  title: 'Pi and angles',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { axis: numberLine(ROAD, { size: 64 }), wheel: wheel({ ...ROLLING, roll: 0, label: '1' }) },
      say: 'This wheel is one across. Roll it once round. How far will it go?',
      turn: { kind: 'predict', id: 'round', prompt: 'Once round: how far?', options: [{ label: 'Exactly three' }, { label: 'More than three' }] },
    },
    { stage: { wheel: wheel({ ...ROLLING, roll: 1, label: '1' }) }, move: 3.2, quiet: 2.4, cue: 'slide', say: 'A bit more than three. And it is the same for every circle, big or small: round is that many times across.' },
    { stage: { line: line(['3.14159'], { y: TOP, size: 170 }) }, say: 'The number starts three point one four one five nine, and its digits never end. It needs a name.' },

    // ── 2. What the signs do ──
    { act: 2, stage: { line: line(['π', '≈', '3.14'], { y: TOP, size: 170, gold: ['π'] }) }, quiet: 1.4, motif: true, say: 'Its name is this letter: pi.' },
    { stage: { line: line(['π', '≈', '3.14'], { y: TOP, size: 170 }) }, move: 0.5, say: 'We read it: pi is approximately equal to three point one four.', poster: true },
    { say: 'Pi is not a variable. It is one number, always the same, like three or ten.' },
    {
      clear: true,
      stage: { wheel: wheel({ ...CIRCLE, roll: 0, label: 'd', round: true }), line: line([{ frac: ['C', 'd'] }, '=', 'π'], { x: 1340, y: 560, size: 210 }) },
      say: 'Take any circle. C is the distance round it, and D is the distance across. C divided by D equals pi.',
    },
    {
      clear: true,
      stage: { arm: arm(LOW, { one: true, from: 0 }) },
      move: 1.2,
      quiet: 1.4,
      motif: true,
      say: 'This letter is theta, the usual name for an angle. Here an arm, one long, has turned by theta.',
    },
    { stage: { arm: arm(LOW, { one: true, across: '0.8' }), cos: fOf(400, 'cos', '0.8', true) }, say: 'Cosine of theta is how far across the end of the arm is. Here, zero point eight.' },
    { stage: { arm: arm(LOW, { one: true, across: '0.8', up: '0.6' }), cos: fOf(400, 'cos', '0.8'), sin: fOf(580, 'sin', '0.6', true) }, say: 'Sine of theta is how far up it is. Here, zero point six.' },
    {
      stage: {
        sin: fOf(580, 'sin', '0.6'),
        tan: line(['tan', '(', 'θ', ')', '=', { frac: [['sin', '(', 'θ', ')'], ['cos', '(', 'θ', ')']] }, '=', '0.75'], { x: 1380, y: 790, size: 98, gold: ['tan'] }),
      },
      say: 'Tangent of theta is sine divided by cosine: up, divided by across. It tells how steep the arm is.',
    },
    {
      stage: {
        arm: arm(HIGH, { one: true, across: '0.6', up: '0.8' }),
        f: line([{ fn: 'f' }, '(', 'x', ')'], { ...BESIDE, y: 220 }),
        cos: fOf(400, 'cos', '0.6'),
        sin: fOf(580, 'sin', '0.8'),
        tan: line(['tan', '(', 'θ', ')', '=', { frac: [['sin', '(', 'θ', ')'], ['cos', '(', 'θ', ')']] }], { x: 1380, y: 790, size: 98 }),
      },
      move: 1.4,
      say: 'All three are functions, like f of x. An angle goes in, and a number comes out. Turn the arm, and the numbers change.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { wheel: wheel({ ...USED, roll: 0, label: 'd', ground: true }), line: line(['C', '=', 'π', 'd'], { y: 300, size: 200 }) },
      say: 'Pi is used for anything round.',
    },
    { stage: { wheel: wheel({ ...USED, roll: 1, label: 'd', ground: true }) }, move: 3.2, cue: 'slide', say: 'If a wheel is D across, one turn takes it pi times D.' },
    {
      clear: true,
      stage: { wave: wave(0), theta: line(['θ'], { x: WAVE.x1 + 40, y: WAVE.cy + 64, size: 70 }), line: line(['sin', '(', 'θ', ')'], { x: 1170, y: 270, size: 150 }) },
      say: 'Sine and cosine are used for anything that turns or swings.',
    },
    { stage: { wave: wave(1) }, move: 4.4, say: 'As the arm goes round, its height rises and falls in a wave.' },
    { say: 'Sound and light move in waves like this one.' },
    {
      clear: true,
      stage: { ramp: ramp(), line: line(['tan', '(', 'θ', ')', '=', { frac: ['3', '4'] }], { x: 1470, y: 600, size: 130 }) },
      say: 'And tangent is used for slopes. This ramp goes up three for every four across, so its tangent is three quarters.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { arm: arm(HIGH, { up: true }) },
      say: 'Your turn. Which one tells how far up the end of the arm is?',
      turn: { kind: 'predict', id: 'up', prompt: 'How far up: which one?', options: [{ label: 'Sine' }, { label: 'Cosine' }] },
    },
    { stage: { arm: arm(HIGH, { up: '0.8' }), sin: fOf(580, 'sin', '0.8', true) }, say: 'Sine. Sine of theta is how far up.' },
    {
      clear: true,
      say: 'Which one is true?',
      turn: { kind: 'choose', id: 'pi', prompt: 'Which one is true?', cards: [['π', '≈', '3.14'], ['π', '=', '3']], right: 0 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['cos', '(', 'θ', ')', '=', '0.8'], { y: 480, size: 200 }) }, move: 0.6, say: 'Cosine of theta equals zero point eight.', turn: { kind: 'read', id: 'readcos', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { grow: doubling() }, say: 'One bead doubles, and doubles again: two, four, eight, sixteen.' },
    { teaser: true, stage: { line: line(['2', { sup: 'x' }, '=', '16'], { y: 250, size: 200, gold: ['x'] }) }, say: 'Two to which power is sixteen? Is there a function that finds the power?', pad: 1 },
  ],
}
