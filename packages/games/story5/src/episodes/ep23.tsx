/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 23 (Part 5): 3/4 + 2/4. Three quarter pieces, then two, each named
 * only after it's there; together they're five quarters. The child fits
 * four into the empty circle (the beat), they fuse into a whole (the
 * exchange again), and one quarter is left: 5/4 = 1 1/4. Closes on
 * 3 × 1/4, which Episode 24 answers.
 */
import { mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { FractionFrame, FractionPiece, Notation } from '../kit/kit'
import { SOFT } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 32
const R = 150
/** Each piece is drawn as its own quarter of a circle centred on its point. */
const LEFT: Pt = { x: 420, y: 470 }
const RIGHT: Pt = { x: 1500, y: 470 }
const FRAME: Pt = { x: 960, y: 420 }
/** Which quarter of its circle each piece is: left 0–2, right 3 and 0 (so each keeps its turn into the whole). */
const kOf = (i: number) => (i < 4 ? i : 0)
/**
 * The five pieces, lined up below once they're together. A piece is drawn
 * from its circle's centre, so each centre is set back from its spot in the
 * row by where its quarter lies (otherwise neighbours overlap).
 */
const ROW: Pt[] = [0, 1, 2, 3, 4].map((i) => {
  const mid = -Math.PI / 2 + (kOf(i) + 0.5) * (Math.PI / 2)
  return { x: 480 + i * 240 - Math.sign(Math.cos(mid)) * (R / 2), y: 840 - Math.sign(Math.sin(mid)) * (R / 2) }
})
const IN = [3.0, 3.7, 4.4, 7.0, 7.7]
const GROUP = [11.4, 13.6] as const
const FILL = [14.6, 17.4] as const
const FUSE = [17.4, 19.2] as const

const events: SceneEvent[] = [
  ...IN.map((time, i) => ({ time, kind: 'piece' as const, n: i < 3 ? i : i - 3 })),
  { time: 5.8, kind: 'card', n: 3 },
  { time: 9.8, kind: 'card', n: 2 },
  { time: 12.4, kind: 'slide', n: 0 },
  { time: 18.3, kind: 'fuse', n: 0 },
  { time: 20.6, kind: 'card', n: 1 },
  { time: 22.0, kind: 'equals', n: 0 },
  { time: 23.6, kind: 'equals', n: 1 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const group = smooth(p(t, ...GROUP))
  const progress = t < FILL[0] ? -1 : t < FILL[1] ? 0.6 * p(t, ...FILL) : 0.6 + 0.4 * p(t, ...FUSE)
  // Before they're grouped, pieces sit as part-circles left (k = 0, 1, 2) and right (k = 0, 1).
  const home = (i: number): Pt => (i < 3 ? LEFT : RIGHT)
  const pos = (i: number) => mix(home(i), ROW[i], group)
  return (
    <Stage>
      <TitleCard t={t} number={23} title="Adding fractions" />
      <g opacity={a}>
        <FractionFrame cx={FRAME.x} cy={FRAME.y} r={R} o={smooth(p(t, 12.6, 13.4))} />
        {[0, 1, 2, 3, 4].map((i) => {
          const k = outBack(p(t, IN[i], IN[i] + 0.45))
          if (k <= 0) return null
          if ((progress >= 0 || beat === 'fill') && i < 4) return null
          // The fifth piece, left over, moves to sit beside the whole.
          const at = i === 4 ? mix(pos(4), { x: 1360, y: FRAME.y }, smooth(p(t, 19.4, 20.4))) : pos(i)
          return <FractionPiece key={i} d={4} k={kOf(i)} cx={at.x} cy={at.y} r={R * Math.min(1, k)} />
        })}
        {progress >= 0 && beat !== 'fill' && exchange('quarters→whole', [0, 1, 2, 3].map(pos), FRAME, progress)}
        <Notation text="3/4" x={LEFT.x} y={720} size={84} o={smooth(p(t, 5.6, 6.2)) * (1 - group)} />
        <Notation text="+" x={960} y={720} size={84} o={smooth(p(t, 9.6, 10.1)) * (1 - group)} />
        <Notation text="2/4" x={RIGHT.x} y={720} size={84} o={smooth(p(t, 9.6, 10.2)) * (1 - group)} />
        <Say t={t} a={13.6} b={15.0} text="Five quarters." />
        <Notation text="1" x={FRAME.x} y={650} size={72} o={smooth(p(t, 20.4, 21.0))} colour={SOFT} />
        <Notation text="1/4" x={1360} y={650} size={72} o={smooth(p(t, 20.4, 21.0))} colour={SOFT} />
        {/* One equation, growing: … = 5/4, then … = 5/4 = 1 1/4. */}
        <Notation text="3/4 + 2/4 = 5/4" y={900} o={smooth(p(t, 22.0, 22.6)) * (1 - smooth(p(t, 23.6, 24.0)))} />
        <Notation text="3/4 + 2/4 = 5/4 = 1 1/4" y={900} o={smooth(p(t, 23.6, 24.2))} />
        <Say t={t} a={26.4} b={DURATION} text="What is 3 groups of 1/4?" />
      </g>
    </Stage>
  )
}

export const ep23: SceneDef = {
  id: 'ep23',
  number: 23,
  title: 'Adding fractions',
  duration: DURATION,
  events,
  beats: [{ id: 'fill', time: FILL[0], resume: FILL[1], pieces: [0, 1, 2, 3].map((i) => ROW[i]), slots: [0, 1, 2, 3].map(() => FRAME), piece: 'quarter', prompt: 'Fill the circle' }],
  render: 'svg',
  Scene,
}
