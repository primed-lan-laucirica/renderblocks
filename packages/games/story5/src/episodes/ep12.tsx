/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 12 (Part 3, taking away): nine beads, and the child takes four
 * away (the beat): 9 − 4 = 5. Then comparing: an eight rod and a five rod
 * side by side, and the gap between them is the difference, 3. Then the
 * balance: five against five; add three and it tips; take the three away
 * and it levels again, so taking away undoes adding. Closes on 8 + 5 in
 * beads, more units than one place holds, which Episode 13 answers.
 */
import { lerp, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Balance, Notation, NumberRod, UnitBead } from '../kit/kit'
import { Gap, PanBeads } from '../kit/part3'
import { BEAD, ROD_UNIT } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 44
const S = 2.4
const BIG = BEAD * S
const STEP = BIG + 8
const NINE: Pt[] = Array.from({ length: 9 }, (_, i) => ({ x: 960 - 4.5 * STEP + i * STEP, y: 380 }))
/** Where the four taken away go: a little tray, down to the right. */
const AWAY: Pt[] = [0, 1, 2, 3].map((i) => ({ x: 1360 + i * STEP, y: 640 }))
const IN = (i: number) => 3.0 + i * 0.22
const TAKE = [7.6, 10.0] as const
const A_OUT = [13.4, 14.2] as const
const RODS_LEFT = 660
const B_OUT = [22.4, 23.2] as const
const ADD3 = [26.4, 27.6] as const
const SUB3 = [29.8, 31.0] as const
const BAL_OUT = [36.0, 36.6] as const
const CLOSE = 36.6

const events: SceneEvent[] = [
  ...NINE.map((_, i) => ({ time: IN(i), kind: 'bead' as const, n: i })),
  { time: 6.4, kind: 'card', n: 9 },
  { time: 9.4, kind: 'slide', n: 0 },
  { time: 10.6, kind: 'equals', n: 5 },
  { time: 14.6, kind: 'slide', n: 8 },
  { time: 15.2, kind: 'slide', n: 5 },
  { time: 18.0, kind: 'slide', n: 3 },
  { time: 19.6, kind: 'equals', n: 3 },
  { time: 23.4, kind: 'slide', n: 0 },
  ...[0, 1, 2].map((i) => ({ time: ADD3[0] + i * 0.3 + 0.3, kind: 'bead' as const, n: 5 + i })),
  { time: 27.8, kind: 'equals', n: 8 },
  { time: 30.6, kind: 'slide', n: 0 },
  { time: 31.2, kind: 'equals', n: 5 },
  ...Array.from({ length: 13 }, (_, i) => ({ time: CLOSE + 0.6 + i * 0.1, kind: 'bead' as const, n: i })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const partA = 1 - smooth(p(t, ...A_OUT))
  const partB = smooth(p(t, 14.4, 15.0)) * (1 - smooth(p(t, ...B_OUT)))
  const partC = smooth(p(t, 23.2, 24.0)) * (1 - smooth(p(t, ...BAL_OUT)))
  const take = smooth(p(t, TAKE[0], TAKE[1] - 0.4))
  // Three beads in the left pan (in, then out again); the heavier pan drops.
  const extra = smooth(p(t, ...ADD3)) * (1 - smooth(p(t, ...SUB3)))
  const tilt = -(extra * 3 / 5) * 10
  const close = smooth(p(t, CLOSE, CLOSE + 0.6))
  return (
    <Stage>
      <TitleCard t={t} number={12} title="Taking away" />
      <g opacity={a}>
        {/* ——— Taking away ——— */}
        {partA > 0 && (
          <g opacity={partA}>
            {NINE.map((b, i) => {
              const k = outBack(p(t, IN(i), IN(i) + 0.4))
              if (k <= 0) return null
              if (i < 5) return <UnitBead key={i} x={b.x} y={b.y} s={S * Math.min(1, k)} />
              if (beat === 'away') return null
              const j = i - 5
              const m = smooth(p(take, j * 0.1, 0.7 + j * 0.1))
              const to = AWAY[j]
              return <UnitBead key={i} x={lerp(b.x, to.x, m)} y={lerp(b.y, to.y, m)} s={S * Math.min(1, k)} o={1 - 0.6 * smooth(p(t, 10.2, 10.8))} />
            })}
            <Notation text="9" x={960} y={540} size={84} o={smooth(p(t, 6.4, 6.9)) * (1 - take)} />
            <Notation text="5" x={NINE[2].x + BIG / 2} y={540} size={84} o={smooth(p(t, 10.4, 10.9))} />
            <Notation text="9 − 4 = 5" y={860} o={smooth(p(t, 10.6, 11.2))} />
          </g>
        )}

        {/* ——— Comparing: the gap is the difference ——— */}
        {partB > 0 && (
          <g opacity={partB}>
            <NumberRod n={8} x={RODS_LEFT} y={360} o={smooth(p(t, 14.6, 15.0))} />
            <NumberRod n={5} x={RODS_LEFT} y={460} o={smooth(p(t, 15.2, 15.6))} />
            <Notation text="8" x={RODS_LEFT - 60} y={378} size={60} o={smooth(p(t, 15.0, 15.4))} />
            <Notation text="5" x={RODS_LEFT - 60} y={478} size={60} o={smooth(p(t, 15.6, 16.0))} />
            <Gap x={RODS_LEFT + 5 * ROD_UNIT} y={460} w={3 * ROD_UNIT} h={30} o={smooth(p(t, 17.0, 17.5)) * (1 - smooth(p(t, 18.8, 19.2)))} />
            <NumberRod n={3} x={lerp(1500, RODS_LEFT + 5 * ROD_UNIT, smooth(p(t, 18.0, 19.2)))} y={lerp(620, 460, smooth(p(t, 18.0, 19.2)))} o={smooth(p(t, 17.6, 18.0))} />
            <Notation text="8 − 5 = 3" y={860} o={smooth(p(t, 19.6, 20.2))} />
          </g>
        )}

        {/* ——— The balance: taking away undoes adding ——— */}
        {partC > 0 && (
          <g opacity={partC}>
            <Balance
              x={960}
              y={300}
              tilt={tilt}
              left={
                <>
                  <PanBeads n={5} />
                  {extra > 0.01 && <PanBeads n={3} from={5} lift={(1 - extra) * 200} o={Math.min(1, extra * 3)} />}
                </>
              }
              right={<PanBeads n={5} />}
            />
            <Notation text="5 + 3 = 8" y={820} o={smooth(p(t, 27.8, 28.4)) * (1 - smooth(p(t, 30.6, 31.0)))} />
            <Notation text="8 − 3 = 5" y={820} o={smooth(p(t, 31.2, 31.8))} />
            <Say t={t} a={34.0} b={36.0} text="Taking away undoes adding." />
          </g>
        )}

        {/* ——— Closing: 8 and 5 units ——— */}
        {close > 0 && (
          <g opacity={close}>
            {Array.from({ length: 13 }, (_, i) => {
              const x = i < 8 ? 420 + (i % 4) * 70 : 1200 + ((i - 8) % 4) * 70
              const y = 340 + Math.floor((i < 8 ? i : i - 8) / 4) * 70
              return <UnitBead key={i} x={x} y={y} s={2.2 * Math.min(1, outBack(p(t, CLOSE + 0.6 + i * 0.1, CLOSE + 1.0 + i * 0.1)))} />
            })}
            <Notation text="8" x={525} y={560} size={72} o={smooth(p(t, CLOSE + 1.8, CLOSE + 2.2))} />
            <Notation text="+" x={880} y={410} size={72} o={smooth(p(t, CLOSE + 1.8, CLOSE + 2.2))} />
            <Notation text="5" x={1305} y={560} size={72} o={smooth(p(t, CLOSE + 1.8, CLOSE + 2.2))} />
            <Say t={t} a={38.6} b={DURATION} text="More than 9 units: what then?" y={700} />
          </g>
        )}
      </g>
    </Stage>
  )
}

export const ep12: SceneDef = {
  id: 'ep12',
  number: 12,
  title: 'Taking away',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'away',
      time: TAKE[0],
      resume: TAKE[1],
      pieces: NINE.slice(5),
      slots: AWAY,
      piece: 'custom',
      draw: (at, _i, done) => <UnitBead x={at.x} y={at.y} s={S} glow={done ? 0.7 : 0} />,
      drawSlot: (at, k) => <Gap key={k} x={at.x} y={at.y} w={BIG} h={BIG} />,
      centre: { x: BIG / 2, y: BIG / 2 },
      reach: 50,
      snap: 70,
      prompt: 'Take four away',
      say: 'Take four away.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode twelve. Taking away.' },
    { time: 5.4, say: 'Nine beads.' },
    { time: 10.6, say: 'Take away four: five are left.' },
    { time: 15.6, say: 'Eight, and five. How much longer?' },
    { time: 19.6, say: 'The difference is three.' },
    { time: 24.0, say: 'Five and five: the same.' },
    { time: 27.8, say: 'Add three.' },
    { time: 31.2, say: 'Take three away: back to five.' },
    { time: 34.0, say: 'Taking away undoes adding.' },
    { time: 38.6, say: 'Eight units and five units. More than nine: what then?' },
  ],
  render: 'svg',
  Scene,
}
