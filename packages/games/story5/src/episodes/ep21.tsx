/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 21 (Part 5): fractions on the track. A circle is cut into
 * quarters and each quarter lays itself down on the track as a strip, one
 * after another: 1/4, 2/4, 3/4, 4/4 = 1. The child lays the fifth past 1
 * (the beat): 5/4 = 1 1/4. On to 8/4 = 2. Closes on a half laid over two
 * quarters, the question Episode 22 answers.
 */
import { lerp, mix, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { FractionPiece, Notation, NumberTrack } from '../kit/kit'
import { Bracket, CutCircle, CutLines, Label, Strip } from '../kit/part5'
import { FRAC_R, INK, SANS } from '../kit/sizes'
import { Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 31
const R = FRAC_R
const X0 = 200
const UNIT = 760
const Q = UNIT / 4
const TRACK_Y = 760
const STRIP_Y = TRACK_Y - 52
const STRIP_H = 40
const CIRCLE: Pt = { x: 960, y: 330 }
const CUT = 3.6
/** Each of the first four quarters leaves the circle for the track. */
const LAY = [5.0, 6.2, 7.4, 8.6]
const MORE = [12.6, 15.2] as const
/** Where the fifth quarter waits for the child (its strip's left end). */
const FIFTH_AT: Pt = { x: 1300, y: 430 }
const FIFTH_SLOT: Pt = { x: X0 + 4 * Q, y: STRIP_Y }
const PAST = [20.4, 21.2, 22.0]
const HALF_IN = 26.0

const events: SceneEvent[] = [
  { time: 3.0, kind: 'piece', n: 0 },
  { time: CUT, kind: 'break', n: 0 },
  ...LAY.map((time, i) => ({ time: time + 0.7, kind: 'place' as const, n: i + 1 })),
  { time: 10.2, kind: 'equals', n: 0 },
  { time: MORE[0] + 1.6, kind: 'place', n: 5 },
  { time: 17.2, kind: 'card', n: 1 },
  ...PAST.map((time, i) => ({ time: time + 0.5, kind: 'place' as const, n: i + 6 })),
  { time: 23.4, kind: 'equals', n: 1 },
  { time: HALF_IN, kind: 'slide', n: 0 },
]

/** Where quarter k's wedge sits in the circle (its middle). */
const wedgeMid = (k: number): Pt => {
  const a = -Math.PI / 2 + ((k + 0.5) / 4) * Math.PI * 2
  return { x: CIRCLE.x + Math.cos(a) * R * 0.55, y: CIRCLE.y + Math.sin(a) * R * 0.55 }
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const sep = 10 * smooth(p(t, CUT + 0.4, CUT + 0.8))
  // A quarter leaves the circle (fading) as its strip arrives on the track (dropping in).
  const left = (k: number) => smooth(p(t, LAY[k], LAY[k] + 0.9))
  const fifth = t < MORE[0] ? FIFTH_AT : mix(FIFTH_AT, FIFTH_SLOT, smooth(p(t, MORE[0] + 0.4, MORE[0] + 1.6)))
  const brackets = smooth(p(t, 17.0, 17.6)) * (1 - smooth(p(t, 19.8, 20.3)))
  const endLabels = 1 - smooth(p(t, 25.4, 25.9))
  return (
    <Stage>
      <TitleCard t={t} number={21} title="Fractions on the track" />
      <g opacity={a}>
        <NumberTrack x={X0} y={TRACK_Y} from={0} to={2} unit={UNIT} labels={false} />
        {[0, 1, 2].map((v) => (
          <text key={v} x={X0 + v * UNIT} y={TRACK_Y + 52} fontFamily={SANS} fontWeight={800} fontSize={44} fill={INK} textAnchor="middle" dominantBaseline="middle">
            {v}
          </text>
        ))}

        {/* The circle, cut into quarters; each quarter goes to the track in turn. */}
        {t < CUT && <FractionPiece d={1} k={0} cx={CIRCLE.x} cy={CIRCLE.y} r={R * smooth(p(t, 3.0, 3.5))} />}
        <CutLines d={4} cx={CIRCLE.x} cy={CIRCLE.y} grow={smooth(p(t, CUT - 0.4, CUT))} o={1 - smooth(p(t, CUT, CUT + 0.3))} />
        {t >= CUT && <CutCircle d={4} cx={CIRCLE.x} cy={CIRCLE.y} sep={sep} lit={(k) => 1 - left(k)} />}

        {LAY.map((_, k) => {
          const m = left(k)
          if (m <= 0) return null
          const from = wedgeMid(k)
          const at = mix({ x: from.x - Q / 2, y: from.y - STRIP_H / 2 }, { x: X0 + k * Q, y: STRIP_Y }, m)
          return <Strip key={k} x={at.x} y={at.y} len={Q} h={STRIP_H} o={smooth(p(t, LAY[k], LAY[k] + 0.3))} />
        })}
        {LAY.map((time, k) => (
          <Label key={k} text={`${k + 1}/4`} x={X0 + (k + 1) * Q} y={STRIP_Y - 34} o={smooth(p(t, time + 0.8, time + 1.2)) * endLabels} />
        ))}
        <Notation text="4/4 = 1" y={960} size={80} o={smooth(p(t, 10.2, 10.7)) * (1 - smooth(p(t, 12.2, 12.6)))} />

        {/* The fifth quarter: past 1. */}
        {t >= 12.0 && beat !== 'more' && <Strip x={fifth.x} y={fifth.y} len={Q} h={STRIP_H} o={smooth(p(t, 12.0, 12.4))} />}
        <Label text="5/4" x={X0 + 5 * Q} y={STRIP_Y - 34} o={smooth(p(t, MORE[1] + 0.2, MORE[1] + 0.6)) * endLabels} />
        <Bracket x0={X0} x1={X0 + UNIT} y={STRIP_Y - 90} label="1" o={brackets} />
        <Bracket x0={X0 + UNIT} x1={X0 + 5 * Q} y={STRIP_Y - 90} label="1/4" o={brackets} />
        <Notation text="5/4 = 1 1/4" y={960} size={80} o={smooth(p(t, 17.2, 17.7)) * (1 - smooth(p(t, 19.8, 20.3)))} />

        {/* On to two. */}
        {PAST.map((time, i) => (
          <g key={i}>
            <Strip x={lerp(1900, X0 + (5 + i) * Q, smooth(p(t, time, time + 0.5)))} y={STRIP_Y} len={Q} h={STRIP_H} o={smooth(p(t, time, time + 0.2))} />
            <Label text={`${6 + i}/4`} x={X0 + (6 + i) * Q} y={STRIP_Y - 34} o={smooth(p(t, time + 0.5, time + 0.9)) * endLabels} />
          </g>
        ))}
        <Notation text="8/4 = 2" y={960} size={80} o={smooth(p(t, 23.4, 23.9)) * (1 - smooth(p(t, 25.4, 25.9)))} />

        {/* A half, laid over the first two quarters. */}
        <Strip x={X0} y={lerp(360, STRIP_Y - 64, smooth(p(t, HALF_IN, HALF_IN + 0.9)))} len={UNIT / 2} h={STRIP_H} colour="#e9823a" o={smooth(p(t, HALF_IN, HALF_IN + 0.4))} />
        <Label text="1/2" x={X0 + UNIT / 4} y={STRIP_Y - 100} o={smooth(p(t, HALF_IN + 0.9, HALF_IN + 1.3))} />
        <Label text="2/4" x={X0 + UNIT / 2} y={TRACK_Y + 52} o={smooth(p(t, HALF_IN + 0.9, HALF_IN + 1.3))} />
        <Notation text="1/2 = 2/4 ?" y={960} size={80} o={smooth(p(t, 26.4, 26.9))} />
      </g>
    </Stage>
  )
}

export const ep21: SceneDef = {
  id: 'ep21',
  number: 21,
  title: 'Fractions on the track',
  duration: DURATION,
  events,
  beats: [
    {
      id: 'more',
      time: MORE[0],
      resume: MORE[1],
      pieces: [FIFTH_AT],
      slots: [FIFTH_SLOT],
      piece: 'custom',
      draw: (at) => <Strip x={at.x} y={at.y} len={Q} h={STRIP_H} />,
      drawSlot: (at, k) => <rect key={k} x={at.x} y={at.y} width={Q} height={STRIP_H} rx={4} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="10 8" />,
      centre: { x: Q / 2, y: STRIP_H / 2 },
      reach: 70,
      snap: 110,
      prompt: 'Put the next quarter on the track',
      say: 'Put the next quarter on the track.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode twenty-one. Fractions on the track.' },
    { time: 5.4, say: 'One quarter.' },
    { time: 6.6, say: 'Two quarters.' },
    { time: 7.8, say: 'Three quarters.' },
    { time: 9.0, say: 'Four quarters.' },
    { time: 10.2, say: 'Four quarters is one whole.' },
    { time: 15.6, say: 'Five quarters.' },
    { time: 17.2, say: 'Five quarters is one and one quarter.' },
    { time: 20.6, say: 'Six quarters, seven quarters, eight quarters.' },
    { time: 23.6, say: 'Eight quarters is two.' },
    { time: 26.4, say: 'Is one half the same as two quarters?' },
  ],
  render: 'svg',
  Scene,
}
