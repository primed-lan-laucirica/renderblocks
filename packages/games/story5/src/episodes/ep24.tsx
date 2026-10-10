/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 24 (Part 5): groups of a fraction. It opens on Episode 15's idea,
 * three groups of three (3 × 3 = 9), then makes three groups of one quarter.
 * The child puts the three quarters together (the beat): 3 × 1/4 = 3/4. A
 * fourth group makes four quarters, which fuse into a whole (the exchange):
 * 4 × 1/4 = 1. Closes on a unit bead and the question Episode 25 answers.
 */
import { mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { BeadBar, FractionFrame, FractionPiece, Notation, UnitBead } from '../kit/kit'
import { FRAC_R, GOLD_EDGE } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 33
const R = FRAC_R
const PLATES: Pt[] = [360, 760, 1160, 1560].map((x) => ({ x, y: 330 }))
/** A quarter in each plate, its circle's centre set back so the piece sits in the middle of the plate. */
const PIECE: Pt[] = PLATES.map((pl, k) => {
  const mid = -Math.PI / 2 + (k + 0.5) * (Math.PI / 2)
  return { x: pl.x - Math.sign(Math.cos(mid)) * (R / 2), y: pl.y - Math.sign(Math.sin(mid)) * (R / 2) }
})
const F: Pt = { x: 960, y: 760 }
const BARS = [3.4, 3.8, 4.2]
const IN = [10.0, 10.6, 11.2, 21.0]
const GATHER = [14.2, 17.0] as const
const FUSE = [23.0, 24.6] as const
const BEAD = 27.4

const events: SceneEvent[] = [
  ...BARS.map((time, i) => ({ time, kind: 'bead' as const, n: 3 * (i + 1) - 1 })),
  { time: 6.4, kind: 'equals', n: 0 },
  ...IN.map((time, i) => ({ time, kind: 'piece' as const, n: i })),
  ...[0, 1, 2].map((i) => ({ time: GATHER[0] + 0.6 * i + 1.1, kind: 'place' as const, n: i })),
  { time: 17.4, kind: 'equals', n: 1 },
  { time: 23.8, kind: 'fuse', n: 0 },
  { time: 24.6, kind: 'equals', n: 2 },
  { time: BEAD, kind: 'bead', n: 0 },
]

/** A plate: one group (a dashed outline). */
function Plate({ at, o }: { at: Pt; o: number }) {
  if (o <= 0) return null
  return <rect x={at.x - 160} y={at.y - 145} width={320} height={290} rx={22} fill="rgba(255,255,255,0.35)" stroke="#b9a684" strokeWidth={3} strokeDasharray="12 9" opacity={o} />
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const bars = 1 - smooth(p(t, 9.0, 9.6))
  const plates = smooth(p(t, 9.4, 9.9)) * (1 - smooth(p(t, 26.6, 27.2)))
  /** Where quarter i is: in its plate, then (watched straight through) into the frame. */
  const at = (i: number) => (i < 3 ? mix(PIECE[i], F, smooth(p(t, GATHER[0] + 0.6 * i, GATHER[0] + 0.6 * i + 1.2))) : PIECE[3])
  const fuse = t < FUSE[0] ? -1 : p(t, ...FUSE)
  const notes = 1 - smooth(p(t, 26.8, 27.3))
  return (
    <Stage>
      <TitleCard t={t} number={24} title="Groups of a fraction" />
      <g opacity={a}>
        {/* Episode 15 again: three groups of three. */}
        <g opacity={bars}>
          {BARS.map((time, i) => (
            <BeadBar key={i} n={3} x={690 + i * 210} y={330} s={2} o={smooth(p(t, time, time + 0.3))} />
          ))}
          <Say t={t} a={4.6} b={6.3} text="Three groups of three." />
          <Notation text="3 × 3 = 9" y={520} o={smooth(p(t, 6.4, 6.9))} />
        </g>

        {/* Three groups of one quarter. */}
        {PLATES.map((pl, i) => (
          <Plate key={i} at={pl} o={i < 3 ? plates : smooth(p(t, 20.4, 20.9)) * (1 - smooth(p(t, 26.6, 27.2)))} />
        ))}
        <FractionFrame cx={F.x} cy={F.y} r={R} o={smooth(p(t, 12.6, 13.2))} />
        {fuse < 0 &&
          IN.map((time, i) => {
            if (t < time || (i < 3 && beat === 'gather')) return null
            const q = at(i)
            return <FractionPiece key={i} d={4} k={i} cx={q.x} cy={q.y} r={R * Math.min(1, outBack(p(t, time, time + 0.45)))} />
          })}
        {fuse >= 0 && exchange('quarters→whole', [F, F, F, PIECE[3]], F, fuse)}
        <Say t={t} a={11.8} b={14.0} text="Three groups of one quarter." y={110} />
        <Notation text="3 × 1/4" y={990} size={80} o={smooth(p(t, 12.2, 12.7)) * (1 - smooth(p(t, 17.2, 17.4)))} />
        <Notation text="3 × 1/4 = 3/4" y={990} size={80} o={smooth(p(t, 17.4, 17.9)) * (1 - smooth(p(t, 20.8, 21.0)))} />
        <Say t={t} a={21.0} b={23.0} text="Four groups of one quarter?" y={110} />
        <Notation text="4 × 1/4 = 4/4 = 1" y={990} size={80} o={smooth(p(t, 24.6, 25.1)) * notes} />

        {/* A unit bead: what if it's cut into ten? */}
        <g opacity={smooth(p(t, BEAD, BEAD + 0.5))}>
          <UnitBead x={360 - 66} y={F.y - 66} s={6} />
          {Array.from({ length: 9 }, (_, j) => (
            <line key={j} x1={360 - 66 + 13.2 * (j + 1)} y1={F.y - 70} x2={360 - 66 + 13.2 * (j + 1)} y2={F.y + 70} stroke={GOLD_EDGE} strokeWidth={3} strokeDasharray="8 5" opacity={smooth(p(t, BEAD + 1.2, BEAD + 2.0))} />
          ))}
        </g>
        <Say t={t} a={28.0} b={DURATION} text="What if we cut a unit into ten?" y={990} />
      </g>
    </Stage>
  )
}

export const ep24: SceneDef = {
  id: 'ep24',
  number: 24,
  title: 'Groups of a fraction',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'gather',
      time: GATHER[0],
      resume: GATHER[1],
      pieces: PIECE.slice(0, 3),
      slots: [F, F, F],
      piece: 'custom',
      draw: (q, i) => <FractionPiece d={4} k={i} cx={q.x} cy={q.y} r={R} />,
      drawSlot: (q, k) => (k === 0 ? <circle key={k} cx={q.x} cy={q.y} r={R} fill="none" stroke="#fde68a" strokeWidth={4} strokeDasharray="14 10" /> : null),
      reach: R * 0.75,
      snap: R,
      stack: true,
      prompt: 'Put the quarters together',
      say: 'Put the quarters together.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode twenty-four. Groups of a fraction.' },
    { time: 4.6, say: 'Three groups of three.' },
    { time: 6.6, say: 'Three times three is nine.' },
    { time: 11.8, say: 'Three groups of one quarter.' },
    { time: 17.6, say: 'Three times one quarter is three quarters.' },
    { time: 21.0, say: 'Four groups of one quarter?' },
    { time: 24.8, say: 'Four quarters make one whole.' },
    { time: 28.0, say: 'What if we cut a unit into ten?' },
  ],
  render: 'svg',
  Scene,
}
