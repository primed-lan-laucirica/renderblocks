/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 17 (Part 4, multiplying): times ten. 23 in golden beads; the
 * child makes each piece ten times bigger (the beat): every unit grows into
 * a ten, every ten into a hundred, and everything moves one place left, so
 * 23 × 10 = 230. Then 23 × 4 as a rectangle, which the child splits (a
 * second beat) into 20 × 4 and 3 × 4: 80 + 12 = 92. It closes on sharing
 * thirteen beads among four skittles, which Episode 18 answers.
 */
import { lerp, mix, outBack, p, smooth, type Pt } from '../engine/ease'
import { scatter } from '../engine/layout'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { HundredSquare, Notation, Skittle, TenBar, UnitBead } from '../kit/kit'
import { GridRect, Label } from '../kit/part4'
import { BAR, BEAD, PLACE_COLOUR, SANS } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 40

// ——— Part one: × 10 shifts a place ———
/** Column centres, by place: units, tens, hundreds. */
const colX = (place: number) => [1360, 960, 560][place]
const TOP = 280
const TENS_AT = (i: number): Pt => ({ x: colX(1) - 30 + i * 36, y: TOP })
/** The units, spread out: the child taps each one (touch circles mustn't overlap). */
const UNITS_AT = (j: number): Pt => ({ x: colX(0) - 71 + j * 60, y: TOP })
// After: the units became tens (in the tens column), the tens became hundreds.
const NEW_TENS = (j: number): Pt => ({ x: colX(1) - 50 + j * 36, y: TOP })
const NEW_HUNDREDS = (i: number): Pt => ({ x: colX(2) - BAR / 2 - 20 + i * 30, y: TOP + i * 30 })
const GROW = { beat: 7.0, resume: 7.05, units: [7.1, 8.3], tens: [8.4, 9.6], move: [9.8, 11.2], digits: [11.4, 12.4] } as const
const PART1_OUT = [17.4, 18.0] as const

// ——— Part two: 23 × 4 splits ———
const CELL = 40
const RX = 500
const RY = 360
const CUT = 20
const SPLIT = { beat: 22.0, resume: 22.05, move: [22.1, 23.3] } as const
const GAP_X = 80
const PART2_OUT = [33.6, 34.2] as const
const CLOSE = 34.2
const PILE = scatter(560, 620, 13, 18, 140)

const events: SceneEvent[] = [
  ...[0, 1].map((i) => ({ time: 3.2 + i * 0.5, kind: 'slide' as const, n: i })),
  ...[0, 1, 2].map((j) => ({ time: 4.6 + j * 0.25, kind: 'bead' as const, n: j })),
  { time: 5.6, kind: 'card', n: 2 },
  { time: GROW.units[0], kind: 'fuse', n: 0 },
  { time: GROW.tens[0], kind: 'fuse', n: 1 },
  { time: GROW.move[0], kind: 'slide', n: 0 },
  { time: GROW.digits[1], kind: 'zero', n: 0 },
  { time: 14.2, kind: 'equals', n: 0 },
  ...[0, 1, 2, 3].map((r) => ({ time: 18.4 + r * 0.4, kind: 'tile' as const, n: r })),
  { time: SPLIT.move[0], kind: 'break', n: 0 },
  { time: 23.6, kind: 'card', n: 8 },
  { time: 25.8, kind: 'card', n: 2 },
  { time: 28.2, kind: 'equals', n: 1 },
  { time: 30.9, kind: 'equals', n: 2 },
  ...PILE.map((_, i) => ({ time: CLOSE + 0.2 + i * 0.12, kind: 'bead' as const, n: i })),
]

/** A piece stretched along one axis about its top-left (a unit growing into a ten, a ten into a hundred). */
const stretch = (at: Pt, sx: number, sy: number, node: React.ReactNode) => <g transform={`translate(${at.x} ${at.y}) scale(${sx} ${sy}) translate(${-at.x} ${-at.y})`}>{node}</g>

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const out1 = 1 - smooth(p(t, ...PART1_OUT))
  const grownU = (j: number) => smooth(p(t, GROW.units[0] + j * 0.2, GROW.units[0] + j * 0.2 + 0.8))
  const grownT = (i: number) => smooth(p(t, GROW.tens[0] + i * 0.2, GROW.tens[0] + i * 0.2 + 0.8))
  const moved = smooth(p(t, ...GROW.move))
  const shift = smooth(p(t, ...GROW.digits))
  const split = smooth(p(t, ...SPLIT.move))
  const out2 = 1 - smooth(p(t, ...PART2_OUT))
  const rows = Math.min(4, Math.max(0, Math.floor((t - 18.4) / 0.4) + 1))
  return (
    <Stage>
      <TitleCard t={t} number={17} title="Times ten" />
      <g opacity={a}>
        {/* ——— × 10 ——— */}
        {out1 > 0 && (
          <g opacity={out1 * smooth(p(t, 2.8, 3.2))}>
            {[2, 1, 0].map((pl) => (
              <text key={pl} x={colX(pl)} y={190} fontFamily={SANS} fontWeight={800} fontSize={40} fill={PLACE_COLOUR[pl]} textAnchor="middle">
                {['units', 'tens', 'hundreds'][pl]}
              </text>
            ))}
            {[1, 2].map((k) => (
              <line key={k} x1={(colX(k) + colX(k - 1)) / 2} y1={160} x2={(colX(k) + colX(k - 1)) / 2} y2={720} stroke="#d8c8a6" strokeWidth={3} />
            ))}
            {/* The two tens: bars, growing into hundreds, then moving to the hundreds column. */}
            {[0, 1].map((i) => {
              const k = outBack(p(t, 3.2 + i * 0.5, 3.7 + i * 0.5))
              if (k <= 0) return null
              const g = grownT(i)
              const at = mix(TENS_AT(i), NEW_HUNDREDS(i), moved)
              if (g <= 0) return <TenBar key={i} x={at.x} y={at.y - 140 * (1 - k)} o={Math.min(1, k)} />
              return <g key={i}>{stretch(at, lerp(BEAD / BAR, 1, g), 1, <HundredSquare x={at.x} y={at.y} />)}</g>
            })}
            {/* The three units: beads, growing into tens, then moving to the tens column. */}
            {[0, 1, 2].map((j) => {
              const k = outBack(p(t, 4.6 + j * 0.25, 4.95 + j * 0.25))
              if (k <= 0 || (beat === 'grow' && grownU(j) <= 0)) return null
              const g = grownU(j)
              const at = mix(UNITS_AT(j), NEW_TENS(j), moved)
              if (g <= 0) return <UnitBead key={j} x={at.x} y={at.y} s={k} />
              return <g key={j}>{stretch(at, 1, lerp(BEAD / BAR, 1, g), <TenBar x={at.x} y={at.y} />)}</g>
            })}
            {/* The digits: 2 3, then each moves one place left and a 0 holds the units. */}
            <Label text="2" x={lerp(colX(1), colX(2), shift)} y={640} size={120} colour={PLACE_COLOUR[shift > 0.5 ? 2 : 1]} o={smooth(p(t, 5.6, 6.1))} />
            <Label text="3" x={lerp(colX(0), colX(1), shift)} y={640} size={120} colour={PLACE_COLOUR[shift > 0.5 ? 1 : 0]} o={smooth(p(t, 5.6, 6.1))} />
            <Label text="0" x={colX(0)} y={640} size={120} colour={PLACE_COLOUR[0]} o={smooth(p(t, GROW.digits[1], GROW.digits[1] + 0.4))} />
            <Notation text="23 × 10 = 230" y={880} o={smooth(p(t, 14.2, 14.8))} />
          </g>
        )}

        {/* ——— 23 × 4, split ——— */}
        {t >= 18.0 && out2 > 0 && (
          <g opacity={out2}>
            <Notation text="23 × 4" y={250} size={84} o={smooth(p(t, 20.2, 20.8))} />
            <GridRect x={RX} y={RY} cols={CUT} rows={4} cell={CELL} shownRows={rows} />
            <GridRect x={RX + CUT * CELL + GAP_X * split} y={RY} cols={3} rows={4} cell={CELL} shownRows={rows} />
            {beat !== 'cut' && t >= SPLIT.beat - 1 && split < 1 && (
              <line x1={RX + CUT * CELL} y1={RY - 30} x2={RX + CUT * CELL} y2={RY + 4 * CELL + 30} stroke="#c53030" strokeWidth={4} strokeDasharray="12 8" opacity={(1 - split) * smooth(p(t, SPLIT.beat - 1, SPLIT.beat - 0.5))} />
            )}
            <Label text="20 × 4 = 80" x={RX + (CUT * CELL) / 2} y={620} size={60} o={smooth(p(t, 23.6, 24.1))} />
            <Label text="3 × 4 = 12" x={RX + CUT * CELL + GAP_X + 60} y={620} size={60} o={smooth(p(t, 25.8, 26.3))} />
            <Notation text="80 + 12 = 92" y={780} size={84} o={smooth(p(t, 28.2, 28.8))} />
            <Notation text="23 × 4 = 92" y={920} size={84} o={smooth(p(t, 30.9, 31.5))} />
          </g>
        )}

        {/* ——— The question: thirteen beads, four skittles ——— */}
        {PILE.map((b, i) => {
          const k = outBack(p(t, CLOSE + 0.2 + i * 0.12, CLOSE + 0.55 + i * 0.12))
          return k > 0 ? <UnitBead key={i} x={b.x} y={b.y} s={k} /> : null
        })}
        {[0, 1, 2, 3].map((i) => (
          <Skittle key={i} x={1000 + i * 200} y={700} o={smooth(p(t, CLOSE + 1.2 + i * 0.2, CLOSE + 1.6 + i * 0.2))} />
        ))}
        <Say t={t} a={CLOSE} b={DURATION} text="How do we share them fairly?" y={260} />
      </g>
    </Stage>
  )
}

/** The cut line the child taps. */
const drawCut = (at: Pt, _i: number, done: boolean) => (
  <g>
    <line x1={at.x} y1={at.y - 110} x2={at.x} y2={at.y + 110} stroke={done ? '#2f855a' : '#c53030'} strokeWidth={6} strokeDasharray="12 8" />
    <circle cx={at.x} cy={at.y + 130} r={22} fill={done ? '#2f855a' : '#c53030'} />
  </g>
)

export const ep17: SceneDef = {
  id: 'ep17',
  number: 17,
  title: 'Times ten',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'grow',
      time: GROW.beat,
      resume: GROW.resume,
      action: 'tap',
      pieces: [0, 1, 2].map(UNITS_AT),
      slots: [0, 1, 2].map(UNITS_AT),
      piece: 'custom',
      draw: (at, _i, done) => <UnitBead x={at.x} y={at.y} glow={done ? 1 : 0} />,
      centre: { x: BEAD / 2, y: BEAD / 2 },
      reach: 30,
      prompt: 'Make each one ten times bigger',
      say: 'Tap each bead to make it ten times bigger.',
    },
    {
      id: 'cut',
      time: SPLIT.beat,
      resume: SPLIT.resume,
      action: 'tap',
      pieces: [{ x: RX + CUT * CELL, y: RY + 2 * CELL }],
      slots: [{ x: RX + CUT * CELL, y: RY + 2 * CELL }],
      piece: 'custom',
      draw: drawCut,
      reach: 90,
      prompt: 'Split it',
      say: 'Tap the line to split twenty-three into twenty and three.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode seventeen. Times ten.' },
    { time: 5.6, say: 'Twenty-three.' },
    { time: 7.2, say: 'Every piece is ten times bigger, so every digit moves one place.' },
    { time: 12.6, say: 'Two hundred thirty.' },
    { time: 14.3, say: 'Twenty-three times ten is two hundred thirty.' },
    { time: 20.2, say: 'Twenty-three times four.' },
    { time: 23.7, say: 'Twenty times four is eighty.' },
    { time: 25.9, say: 'Three times four is twelve.' },
    { time: 28.3, say: 'Eighty and twelve make ninety-two.' },
    { time: 31.0, say: 'Twenty-three times four is ninety-two.' },
    { time: CLOSE, say: 'Thirteen beads and four skittles. How do we share them fairly?' },
  ],
  render: 'svg',
  Scene,
}
