/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 10 (Part 3, adding): joining. Three beads and four beads; the
 * child pushes the four over to the three (the beat), and only then do the
 * signs appear: 3 + 4 = 7. Then a balance: 3 and 4 in one pan, and beads
 * drop one by one into the other until the beam levels at 7. That's what =
 * means: the same amount. Closes on "7 and how many more make 10?", which
 * Episode 11 answers.
 */
import { lerp, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Balance, Notation, UnitBead } from '../kit/kit'
import { Gap, PanBeads } from '../kit/part3'
import { BEAD } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 36
/** Beads are drawn large here: there are only a few, and they're the whole idea. */
const S = 2.4
const STEP = BEAD * S + 8
/** The joined row of seven; the three start in its first places. */
const ROW: Pt[] = Array.from({ length: 7 }, (_, i) => ({ x: 960 - 3.5 * STEP + i * STEP, y: 400 }))
const FOUR: Pt[] = [0, 1, 2, 3].map((i) => ({ x: 1230 + i * STEP, y: 400 }))
const IN_A = (i: number) => 3.0 + i * 0.4
const IN_B = (i: number) => 4.6 + i * 0.4
const JOIN = [9.0, 11.4] as const
const GROUP_OUT = [15.0, 15.8] as const
const BAL_IN = [15.8, 16.6] as const
const DROP = (i: number) => 18.0 + i * 0.45
const BAL_OUT = [27.4, 28.2] as const
const CLOSE = 28.4

const events: SceneEvent[] = [
  ...[0, 1, 2].map((i) => ({ time: IN_A(i), kind: 'bead' as const, n: i })),
  ...[0, 1, 2, 3].map((i) => ({ time: IN_B(i), kind: 'bead' as const, n: i })),
  { time: 6.8, kind: 'card', n: 3 },
  { time: 7.6, kind: 'card', n: 4 },
  { time: 10.6, kind: 'slide', n: 0 },
  { time: 12.4, kind: 'equals', n: 7 },
  ...Array.from({ length: 7 }, (_, i) => ({ time: DROP(i) + 0.3, kind: 'bead' as const, n: i })),
  { time: 21.6, kind: 'equals', n: 0 },
  ...Array.from({ length: 7 }, (_, i) => ({ time: CLOSE + 0.6 + i * 0.12, kind: 'bead' as const, n: i })),
]

/** How many beads have landed in the right pan by t (smoothly, so the beam eases). */
const landed = (t: number) => Array.from({ length: 7 }, (_, i) => smooth(p(t, DROP(i), DROP(i) + 0.45))).reduce((a, b) => a + b, 0)

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const join = smooth(p(t, ...JOIN))
  const group = 1 - smooth(p(t, ...GROUP_OUT))
  const bal = smooth(p(t, ...BAL_IN)) * (1 - smooth(p(t, ...BAL_OUT)))
  // Left pan holds 7 from the start; the right pan fills. Heavier side drops (positive tilt: the right pan).
  const tilt = ((landed(t) - 7) / 7) * 12
  const close = smooth(p(t, CLOSE, CLOSE + 0.8))
  return (
    <Stage>
      <TitleCard t={t} number={10} title="Joining" />
      <g opacity={a}>
        {/* ——— Joining ——— */}
        {group > 0 && (
          <g opacity={group}>
            {[0, 1, 2].map((i) => {
              const k = outBack(p(t, IN_A(i), IN_A(i) + 0.4))
              return k > 0 ? <UnitBead key={i} x={ROW[i].x} y={ROW[i].y} s={S * Math.min(1, k)} /> : null
            })}
            {beat === 'join'
              ? null
              : FOUR.map((b, i) => {
                  const k = outBack(p(t, IN_B(i), IN_B(i) + 0.4))
                  if (k <= 0) return null
                  const to = ROW[3 + i]
                  // Each bead slides over in turn, a little behind the one before.
                  const m = smooth(p(join, i * 0.12, 0.64 + i * 0.12))
                  return <UnitBead key={i} x={lerp(b.x, to.x, m)} y={lerp(b.y, to.y, m)} s={S * Math.min(1, k)} />
                })}
            <Notation text="3" x={ROW[1].x + (BEAD * S) / 2} y={560} size={84} o={smooth(p(t, 6.8, 7.3)) * (1 - join)} />
            <Notation text="4" x={FOUR[1].x + STEP / 2 + (BEAD * S) / 2} y={560} size={84} o={smooth(p(t, 7.6, 8.1)) * (1 - join)} />
            <Notation text="7" x={960} y={560} size={84} o={smooth(p(t, 12.0, 12.5))} />
            <Notation text="3 + 4 = 7" y={860} o={smooth(p(t, 12.4, 13.0))} />
          </g>
        )}

        {/* ——— The balance: = means the same amount ——— */}
        {bal > 0 && (
          <g opacity={bal}>
            <Balance
              x={960}
              y={300}
              tilt={tilt}
              left={
                <>
                  <PanBeads n={3} />
                  <PanBeads n={4} from={5} />
                </>
              }
              right={<PanBeads n={Math.floor(landed(t) + 1e-6)} />}
            />
            {/* The bead on its way down into the right pan. */}
            {Array.from({ length: 7 }, (_, i) => {
              const k = p(t, DROP(i), DROP(i) + 0.45)
              if (k <= 0 || k >= 1) return null
              const rad = (tilt * Math.PI) / 180
              const px = 960 + Math.cos(rad) * 340
              const py = 300 + Math.sin(rad) * 340 + 118
              const slot = { x: ((i % 5) - 2) * (BEAD * 1.6 + 4) - (BEAD * 1.6) / 2, y: -BEAD * 1.6 - 4 - Math.floor(i / 5) * (BEAD * 1.6 + 4) }
              return <UnitBead key={i} x={px + slot.x} y={lerp(py - 260, py + slot.y, k * k)} s={1.6} />
            })}
            <Notation text="3 + 4" x={620} y={780} size={84} o={smooth(p(t, 17.0, 17.6))} />
            <Notation text="7" x={1300} y={780} size={84} o={smooth(p(t, 21.0, 21.6))} />
            <Notation text="=" x={960} y={780} size={110} o={smooth(p(t, 21.6, 22.2))} colour="#2f855a" />
            <Say t={t} a={24.6} b={27.4} text="= means the same amount." y={150} />
          </g>
        )}

        {/* ——— Closing: seven, and three empty places ——— */}
        {close > 0 && (
          <g opacity={close}>
            {ROW.map((b, i) => (
              <UnitBead key={i} x={b.x - 1.5 * STEP} y={b.y} s={S * Math.min(1, outBack(p(t, CLOSE + 0.6 + i * 0.12, CLOSE + 1.0 + i * 0.12)))} />
            ))}
            {[0, 1, 2].map((j) => (
              <Gap key={j} x={ROW[6].x - 1.5 * STEP + (j + 1) * STEP} y={ROW[0].y} w={BEAD * S} h={BEAD * S} o={smooth(p(t, CLOSE + 1.6, CLOSE + 2.2))} />
            ))}
            <Say t={t} a={30.0} b={DURATION} text="7 and how many more make 10?" y={640} />
          </g>
        )}
      </g>
    </Stage>
  )
}

const BIG = BEAD * S

export const ep10: SceneDef = {
  id: 'ep10',
  number: 10,
  title: 'Joining',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'join',
      time: JOIN[0],
      resume: JOIN[1],
      pieces: FOUR,
      slots: ROW.slice(3),
      piece: 'custom',
      draw: (at, _i, done) => <UnitBead x={at.x} y={at.y} s={S} glow={done ? 0.7 : 0} />,
      drawSlot: (at, k) => <Gap key={k} x={at.x} y={at.y} w={BIG} h={BIG} />,
      centre: { x: BIG / 2, y: BIG / 2 },
      reach: 50,
      snap: 70,
      prompt: 'Put them together',
      say: 'Put them together.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode ten. Joining.' },
    { time: 6.6, say: 'Three beads, and four beads.' },
    { time: 12.4, say: 'Three and four make seven.' },
    { time: 16.8, say: 'Is it the same as seven?' },
    { time: 21.8, say: 'Level. Three plus four equals seven.' },
    { time: 24.8, say: 'Equals means the same amount.' },
    { time: 30.0, say: 'Seven, and how many more make ten?' },
  ],
  render: 'svg',
  Scene,
}
