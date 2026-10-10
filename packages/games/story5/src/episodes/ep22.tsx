/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 22 (Part 5): the same amount. Two quarters laid over a half cover
 * it exactly; the child lays four eighths over it too (the beat): 1/2 = 2/4
 * = 4/8. Then 2/3 against 3/4: cut both into twelfths and count, 8/12 <
 * 9/12. Closes on 3/4 and 2/4 side by side, the question Episode 23 answers.
 */
import { mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { FractionFrame, FractionPiece, Notation } from '../kit/kit'
import { CutLines } from '../kit/part5'
import { FRAC_R } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 42
const R = FRAC_R
const RED = '#d63b3b'
const QUARTER = '#e9823a'
const EIGHTH = '#e3b23c'
const A: Pt = { x: 620, y: 450 }
/** The two quarters wait to the right, together as a half. */
const Q_FROM: Pt = { x: 1320, y: 450 }
const Q_IN = [5.4, 6.8] as const
/** The four eighths, apart, each drawn from its own circle's centre. */
const E_OUT: Pt[] = [
  { x: 1150, y: 420 },
  { x: 1350, y: 380 },
  { x: 1350, y: 560 },
  { x: 1150, y: 560 },
]
const LAY = [11.6, 14.6] as const
const LB: Pt = { x: 560, y: 430 }
const RB: Pt = { x: 1360, y: 430 }
const CUT12 = 22.8
const COUNT_L = 25.2
const COUNT_R = 27.6

const events: SceneEvent[] = [
  { time: 3.2, kind: 'piece', n: 0 },
  { time: Q_IN[1] - 0.2, kind: 'piece', n: 1 },
  { time: 9.2, kind: 'equals', n: 0 },
  ...E_OUT.map((_, i) => ({ time: LAY[0] + 0.5 * i + 0.9, kind: 'piece' as const, n: 2 + i })),
  { time: 15.0, kind: 'equals', n: 1 },
  { time: 19.0, kind: 'piece', n: 0 },
  { time: CUT12, kind: 'break', n: 0 },
  ...Array.from({ length: 8 }, (_, j) => ({ time: COUNT_L + 0.2 * j, kind: 'bead' as const, n: j })),
  ...Array.from({ length: 9 }, (_, j) => ({ time: COUNT_R + 0.2 * j, kind: 'bead' as const, n: j })),
  { time: 30.0, kind: 'equals', n: 2 },
  { time: 36.4, kind: 'slide', n: 0 },
  { time: 37.2, kind: 'piece', n: 0 },
]

/** A brief glow on a twelfth as it's counted. */
const flash = (t: number, at: number) => smooth(p(t, at, at + 0.15)) * (1 - smooth(p(t, at + 0.35, at + 0.6)))

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const partA = 1 - smooth(p(t, 18.0, 18.6))
  const partB = smooth(p(t, 18.8, 19.4))
  const qAt = mix(Q_FROM, A, smooth(p(t, ...Q_IN)))
  const eAt = (i: number) => mix(E_OUT[i], A, smooth(p(t, LAY[0] + 0.5 * i, LAY[0] + 0.5 * i + 1.0)))
  const leftGone = 1 - smooth(p(t, 35.8, 36.4))
  const toLeft = smooth(p(t, 36.4, 37.4))
  const threeQ = mix(RB, LB, toLeft)
  const lines = smooth(p(t, CUT12 - 0.3, CUT12 + 0.3)) * (1 - smooth(p(t, 35.8, 36.3)))
  return (
    <Stage>
      <TitleCard t={t} number={22} title="The same amount" />
      <g opacity={a}>
        {/* ——— 1/2 = 2/4 = 4/8, by laying pieces over each other ——— */}
        <g opacity={partA}>
          <FractionFrame cx={A.x} cy={A.y} r={R} o={smooth(p(t, 2.8, 3.4))} />
          {t >= 3.2 && <FractionPiece d={2} k={0} cx={A.x} cy={A.y} r={R * outBack(p(t, 3.2, 3.7))} colour={RED} />}
          <Notation text="1/2" x={A.x} y={720} size={72} o={smooth(p(t, 3.8, 4.3))} />
          {t >= 4.6 && [0, 1].map((k) => <FractionPiece key={k} d={4} k={k} cx={qAt.x} cy={qAt.y} r={R} colour={QUARTER} o={smooth(p(t, 4.6, 5.0))} />)}
          <Say t={t} a={7.0} b={9.0} text="Two quarters cover it exactly." />
          {t >= 10.6 && beat !== 'eighths' && E_OUT.map((_, k) => <FractionPiece key={k} d={8} k={k} cx={eAt(k).x} cy={eAt(k).y} r={R} colour={EIGHTH} o={smooth(p(t, 10.6, 11.0))} />)}
          <Notation text="1/2 = 2/4" y={860} o={smooth(p(t, 9.2, 9.7)) * (1 - smooth(p(t, 14.8, 15.0)))} />
          <Notation text="1/2 = 2/4 = 4/8" y={860} o={smooth(p(t, 15.0, 15.5))} />
        </g>

        {/* ——— 2/3 or 3/4? Cut both into twelfths and count ——— */}
        <g opacity={partB}>
          <FractionFrame cx={LB.x} cy={LB.y} r={R} />
          <g opacity={leftGone}>
            {[0, 1].map((k) => (
              <FractionPiece key={k} d={3} k={k} cx={LB.x} cy={LB.y} r={R * outBack(p(t, 19.0, 19.5))} colour={RED} />
            ))}
            <CutLines d={12} cx={LB.x} cy={LB.y} from={1} to={7} grow={lines} />
            {Array.from({ length: 8 }, (_, j) => (
              <FractionPiece key={j} d={12} k={j} cx={LB.x} cy={LB.y} colour="#fff6d5" o={0.7 * flash(t, COUNT_L + 0.2 * j)} />
            ))}
            <Notation text="2/3" x={LB.x} y={690} size={72} o={smooth(p(t, 19.6, 20.1)) * (1 - smooth(p(t, COUNT_L - 0.2, COUNT_L)))} />
            <Notation text="2/3 = 8/12" x={LB.x} y={690} size={72} o={smooth(p(t, COUNT_L, COUNT_L + 0.5))} />
          </g>
          <FractionFrame cx={RB.x} cy={RB.y} r={R} />
          {[0, 1, 2].map((k) => (
            <FractionPiece key={k} d={4} k={k} cx={threeQ.x} cy={threeQ.y} r={R * outBack(p(t, 19.0, 19.5))} colour={RED} />
          ))}
          <CutLines d={12} cx={RB.x} cy={RB.y} from={1} to={8} grow={lines} />
          {Array.from({ length: 9 }, (_, j) => (
            <FractionPiece key={j} d={12} k={j} cx={RB.x} cy={RB.y} colour="#fff6d5" o={0.7 * flash(t, COUNT_R + 0.2 * j)} />
          ))}
          <g opacity={leftGone}>
            <Notation text="3/4" x={RB.x} y={690} size={72} o={smooth(p(t, 19.6, 20.1)) * (1 - smooth(p(t, COUNT_R - 0.2, COUNT_R)))} />
            <Notation text="3/4 = 9/12" x={RB.x} y={690} size={72} o={smooth(p(t, COUNT_R, COUNT_R + 0.5))} />
            <Notation text="8/12 < 9/12" y={900} o={smooth(p(t, 30.0, 30.5)) * (1 - smooth(p(t, 32.6, 32.8)))} />
            <Notation text="2/3 < 3/4" y={900} o={smooth(p(t, 32.8, 33.3))} />
          </g>
          <Say t={t} a={19.8} b={22.4} text="Two thirds or three quarters: which is more?" />
          <Say t={t} a={23.4} b={25.0} text="Cut both into twelfths." />
          {/* Three quarters, and two quarters beside them. */}
          {t >= 37.2 && [0, 1].map((k) => <FractionPiece key={k} d={4} k={k} cx={RB.x} cy={RB.y} r={R * outBack(p(t, 37.2, 37.7))} colour={RED} />)}
          <Say t={t} a={37.4} b={DURATION} text="What are three quarters and two quarters together?" y={1000} />
        </g>
      </g>
    </Stage>
  )
}

export const ep22: SceneDef = {
  id: 'ep22',
  number: 22,
  title: 'The same amount',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'eighths',
      time: LAY[0],
      resume: LAY[1],
      pieces: E_OUT,
      slots: E_OUT.map(() => A),
      piece: 'custom',
      draw: (at, i) => <FractionPiece d={8} k={i} cx={at.x} cy={at.y} r={R} colour={EIGHTH} />,
      // Each eighth's middle, from its circle's centre (so a finger finds the piece, not the empty centre).
      centre: { x: 0, y: 0 },
      reach: R * 0.75,
      snap: R,
      stack: true,
      prompt: 'Cover the half with eighths',
      say: 'Cover the half with eighths.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode twenty-two. The same amount.' },
    { time: 3.8, say: 'One half.' },
    { time: 7.0, say: 'Two quarters cover it exactly.' },
    { time: 9.2, say: 'One half equals two quarters.' },
    { time: 15.0, say: 'One half equals two quarters equals four eighths.' },
    { time: 19.8, say: 'Two thirds or three quarters: which is more?' },
    { time: 23.4, say: 'Cut both into twelfths.' },
    { time: 25.2, say: 'Two thirds is eight twelfths.' },
    { time: 27.6, say: 'Three quarters is nine twelfths.' },
    { time: 30.0, say: 'Eight twelfths is less than nine twelfths.' },
    { time: 32.8, say: 'So two thirds is less than three quarters.' },
    { time: 37.4, say: 'What are three quarters and two quarters together?' },
  ],
  render: 'svg',
  Scene,
}
