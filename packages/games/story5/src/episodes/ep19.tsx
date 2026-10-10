/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 19 (Part 4, dividing): how many groups. Twelve beads, taken in
 * threes: the child makes the first group (the beat), the rest follow, and
 * there are four groups, so 12 ÷ 3 = 4, the inverse of Episode 15's
 * 4 × 3 = 12. Then 465 shared by three in stamp tiles: a hundred each, and
 * the hundred left over can't be shared until the child breaks it into ten
 * tens (a second beat). The ten left over breaks into ones; each share is
 * 155. It closes on Episode 18's leftover bead: can one be shared too?
 */
import { mix, outBack, p, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Notation, StampTile, UnitBead } from '../kit/kit'
import { Label, SmallSkittle } from '../kit/part4'
import { BEAD, GAP, PLACE_COLOUR, SANS, TILE } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 52

// ——— Part one: twelve in threes ———
const ROW: Pt[] = Array.from({ length: 12 }, (_, i) => ({ x: 630 + i * 60, y: 400 }))
const GROUP_AT = (i: number): Pt => ({ x: 560 + Math.floor(i / 3) * 240 + (i % 3) * (BEAD + GAP), y: 560 })
const APPEAR = (i: number) => 3.4 + i * 0.15
const GROUP = [7.6, 9.8] as const
const MOVE = (i: number) => (i < 3 ? GROUP[0] + i * 0.5 : 10.0 + (i - 3) * 0.22)
const COUNT = (g: number) => 12.4 + g * 0.42
const PART1_OUT = [20.2, 20.8] as const

// ——— Part two: 465 ÷ 3 in tiles ———
const STEP = TILE + 8
const SUPPLY_Y = 200
const SH = (i: number): Pt => ({ x: 170 + i * STEP, y: SUPPLY_Y })
const ST = (j: number): Pt => ({ x: 560 + (j % 8) * STEP, y: SUPPLY_Y + Math.floor(j / 8) * STEP })
const SO = (j: number): Pt => ({ x: 1200 + (j % 8) * STEP, y: SUPPLY_Y + Math.floor(j / 8) * STEP })
const LANE_Y = (l: number) => 470 + l * 140
const LH = (l: number): Pt => ({ x: 260, y: LANE_Y(l) })
const LT = (l: number, k: number): Pt => ({ x: 400 + k * STEP, y: LANE_Y(l) })
const LO = (l: number, k: number): Pt => ({ x: 860 + k * STEP, y: LANE_Y(l) })
const TILES_IN = 21.4
const HD = (i: number) => 25.6 + i * 0.5
const BREAK_H = { beat: 31.0, resume: 31.05, go: [31.1, 32.3] } as const
const TD = (j: number) => 32.6 + j * 0.16
const BREAK_T = [35.4, 36.4] as const
const OD = (j: number) => 38.2 + j * 0.14
const CLOSE = 46.0

const events: SceneEvent[] = [
  ...ROW.map((_, i) => ({ time: APPEAR(i), kind: 'bead' as const, n: i })),
  ...ROW.map((_, i) => ({ time: MOVE(i) + 0.4, kind: 'bead' as const, n: i % 3 })),
  ...[0, 1, 2, 3].map((g) => ({ time: COUNT(g), kind: 'digit' as const, n: g + 1 })),
  { time: 14.6, kind: 'equals', n: 0 },
  { time: 17.2, kind: 'equals', n: 1 },
  ...Array.from({ length: 15 }, (_, i) => ({ time: TILES_IN + i * 0.1, kind: 'tile' as const, n: i % 10 })),
  ...[0, 1, 2].map((i) => ({ time: HD(i) + 0.45, kind: 'tile' as const, n: 2 })),
  { time: BREAK_H.go[0], kind: 'break', n: 0 },
  ...Array.from({ length: 15 }, (_, j) => ({ time: TD(j) + 0.35, kind: 'tile' as const, n: 1 })),
  { time: BREAK_T[0], kind: 'break', n: 1 },
  ...Array.from({ length: 15 }, (_, j) => ({ time: OD(j) + 0.35, kind: 'tile' as const, n: 0 })),
  ...[0, 1, 2].map((l) => ({ time: 40.8 + l * 0.15, kind: 'card' as const, n: l })),
  { time: 41.4, kind: 'equals', n: 2 },
]

/** A tile arriving (popping in) at `at` from `t0`. */
const pop = (t: number, t0: number) => outBack(p(t, t0, t0 + 0.35))

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const out1 = 1 - smooth(p(t, ...PART1_OUT))
  const brokeH = smooth(p(t, ...BREAK_H.go))
  const brokeT = smooth(p(t, ...BREAK_T))
  const part2 = t >= TILES_IN && t < CLOSE + 0.6
  const out2 = 1 - smooth(p(t, CLOSE - 0.4, CLOSE + 0.2))
  return (
    <Stage>
      <TitleCard t={t} number={19} title="How many groups" />
      <g opacity={a}>
        {/* ——— Twelve in threes ——— */}
        {out1 > 0 && (
          <g opacity={out1}>
            {ROW.map((b, i) => {
              const k = outBack(p(t, APPEAR(i), APPEAR(i) + 0.35))
              if (k <= 0 || (beat === 'group' && i < 3)) return null
              const at = mix(b, GROUP_AT(i), smooth(p(t, MOVE(i), MOVE(i) + 0.45)))
              return <UnitBead key={i} x={at.x} y={at.y} s={k} />
            })}
            {[0, 1, 2, 3].map((g) => (
              <Label key={g} text={String(g + 1)} x={GROUP_AT(g * 3 + 1).x + BEAD / 2} y={500} size={56} o={smooth(p(t, COUNT(g), COUNT(g) + 0.3))} />
            ))}
            <Say t={t} a={5.6} b={7.5} text="Twelve beads, in threes." />
            <Notation text="12 ÷ 3 = 4" y={760} o={smooth(p(t, 14.6, 15.2))} />
            <Notation text="4 × 3 = 12" y={900} o={smooth(p(t, 17.2, 17.8))} />
          </g>
        )}

        {/* ——— 465 ÷ 3 ——— */}
        {part2 && (
          <g opacity={out2}>
            {[2, 1, 0].map((pl) => (
              <text key={pl} x={[SO(0), ST(0), SH(0)][pl].x} y={170} fontFamily={SANS} fontWeight={800} fontSize={30} fill={PLACE_COLOUR[pl]}>
                {['ones', 'tens', 'hundreds'][pl]}
              </text>
            ))}
            <line x1={120} y1={420} x2={1800} y2={420} stroke="#d8c8a6" strokeWidth={3} />
            {[0, 1, 2].map((l) => (
              <SmallSkittle key={l} x={170} y={LANE_Y(l) + 64} s={0.5} o={smooth(p(t, 23.2 + l * 0.2, 23.6 + l * 0.2))} />
            ))}
            {/* Hundreds: three dealt, one left over, which breaks. */}
            {[0, 1, 2, 3].map((i) => {
              const k = pop(t, TILES_IN + i * 0.1)
              if (k <= 0) return null
              if (i === 3) {
                if (beat === 'break' || brokeH >= 1) return null
                return <StampTile key={i} value={100} x={SH(i).x} y={SH(i).y} s={k} o={1 - brokeH} />
              }
              const at = mix(SH(i), LH(i), smooth(p(t, HD(i), HD(i) + 0.5)))
              return <StampTile key={i} value={100} x={at.x} y={at.y} s={k} />
            })}
            {/* Tens: six to start, ten more from the broken hundred; fifteen dealt, one left, which breaks. */}
            {Array.from({ length: 16 }, (_, j) => {
              const fromHundred = j >= 6
              const k = fromHundred ? brokeH : pop(t, TILES_IN + 0.4 + j * 0.1)
              if (k <= 0) return null
              const start = fromHundred ? mix(SH(3), ST(j), brokeH) : ST(j)
              if (j === 15) return brokeT >= 1 ? null : <StampTile key={j} value={10} x={start.x} y={start.y} o={Math.min(1, k) * (1 - brokeT)} />
              const at = mix(start, LT(j % 3, Math.floor(j / 3)), smooth(p(t, TD(j), TD(j) + 0.4)))
              return <StampTile key={j} value={10} x={at.x} y={at.y} o={Math.min(1, k)} s={fromHundred ? 1 : k} />
            })}
            {/* Ones: five to start, ten more from the broken ten; all fifteen dealt. */}
            {Array.from({ length: 15 }, (_, j) => {
              const fromTen = j >= 5
              const k = fromTen ? brokeT : pop(t, TILES_IN + 1.0 + j * 0.1)
              if (k <= 0) return null
              const start = fromTen ? mix(ST(15), SO(j), brokeT) : SO(j)
              const at = mix(start, LO(j % 3, Math.floor(j / 3)), smooth(p(t, OD(j), OD(j) + 0.4)))
              return <StampTile key={j} value={1} x={at.x} y={at.y} o={Math.min(1, k)} s={fromTen ? 1 : k} />
            })}
            {[0, 1, 2].map((l) => (
              <Label key={l} text="155" x={1500} y={LANE_Y(l) + TILE / 2} size={64} o={smooth(p(t, 40.8 + l * 0.15, 41.1 + l * 0.15))} />
            ))}
            <Notation text="465 ÷ 3 = 155" y={960} size={84} o={smooth(p(t, 41.4, 42.0))} />
          </g>
        )}

        {/* The one left over from Episode 18. */}
        <g opacity={win(t, CLOSE + 0.4, DURATION + 1)}>
          <UnitBead x={960 - BEAD / 2} y={520} s={1.6} />
        </g>
        <Say t={t} a={CLOSE + 0.4} b={DURATION} text="Can we share one too?" y={320} />
      </g>
    </Stage>
  )
}

export const ep19: SceneDef = {
  id: 'ep19',
  number: 19,
  title: 'How many groups',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'group',
      time: GROUP[0],
      resume: GROUP[1],
      pieces: ROW.slice(0, 3),
      slots: [0, 1, 2].map(GROUP_AT),
      piece: 'bead',
      prompt: 'Make a group of three',
      say: 'Put three beads together.',
    },
    {
      id: 'break',
      time: BREAK_H.beat,
      resume: BREAK_H.resume,
      action: 'tap',
      pieces: [SH(3)],
      slots: [SH(3)],
      piece: 'custom',
      draw: (at, _i, done) => <StampTile value={100} x={at.x} y={at.y} o={done ? 0.5 : 1} />,
      centre: { x: TILE / 2, y: TILE / 2 },
      reach: 56,
      prompt: 'Break the hundred',
      say: 'Tap the hundred to break it into ten tens.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode nineteen. How many groups.' },
    { time: 5.6, say: 'Twelve beads, in threes.' },
    { time: 12.4, say: 'One, two, three, four groups.' },
    { time: 14.7, say: 'Twelve divided by three is four.' },
    { time: 17.3, say: 'Four groups of three make twelve again.' },
    { time: 23.2, say: 'Four hundred sixty-five, shared by three.' },
    { time: 27.6, say: 'One hundred is left. Break it into ten tens.' },
    { time: 35.2, say: 'And the ten left over breaks into ten ones.' },
    { time: 41.5, say: 'Four hundred sixty-five divided by three is one hundred fifty-five.' },
    { time: CLOSE, say: 'And the one left over from thirteen: can we share it too?' },
  ],
  render: 'svg',
  Scene,
}
