/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 16 (Part 4, multiplying): arrays on the bead board. Beads fill
 * three rows of four; the child turns the array a quarter turn (the beat):
 * now it's four rows of three, the same twelve beads, so 3 × 4 = 4 × 3.
 * Then squares grow on the board, 1, 4, 9, 16, and it closes on what
 * multiplying by ten does, which Episode 17 answers.
 */
import { lerp, p, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { BeadBoard, Caption, Notation } from '../kit/kit'
import { ARRAY_BEAD, BeadArray, Label } from '../kit/part4'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 39
const CELL = 44
/** The board's first hole's top-left. */
const X0 = 380
const Y0 = 260
const centreOf = (rows: number, cols: number): Pt => ({ x: X0 + (cols * CELL) / 2, y: Y0 + (rows * CELL) / 2 })
const FILL = (i: number) => 3.6 + i * 0.25
const TURN = { beat: 12.0, resume: 12.05, lift: [12.1, 12.5], spin: [12.5, 13.9], land: [13.9, 14.3] } as const
const ARRAY_OUT = [22.2, 22.8] as const
/** Each square grows from the last: its new beads (an L) appear from S(k). */
const S = (k: number) => 23.0 + (k - 1) * 1.4
const TEN = 33.6

const events: SceneEvent[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ time: FILL(i), kind: 'bead' as const, n: i })),
  { time: 9.0, kind: 'equals', n: 0 },
  { time: TURN.spin[0], kind: 'slide', n: 0 },
  { time: TURN.land[0], kind: 'place', n: 1 },
  { time: 14.6, kind: 'equals', n: 1 },
  { time: 18.2, kind: 'equals', n: 2 },
  ...[1, 2, 3, 4].map((k) => ({ time: S(k), kind: 'bead' as const, n: k * k })),
  { time: 31.0, kind: 'equals', n: 3 },
  ...Array.from({ length: 10 }, (_, i) => ({ time: TEN + 0.2 + i * 0.12, kind: 'bead' as const, n: i })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const lift = smooth(p(t, ...TURN.lift)) * (1 - smooth(p(t, ...TURN.land)))
  const spin = smooth(p(t, ...TURN.spin))
  // The 3 × 4 array's centre moves to the 4 × 3's as it turns, so it lands in the board's corner.
  const c = { x: lerp(centreOf(3, 4).x, centreOf(4, 3).x, spin), y: lerp(centreOf(3, 4).y, centreOf(4, 3).y, spin) }
  const shown = Array.from({ length: 12 }, (_, i) => i).filter((i) => t >= FILL(i)).length
  const arrayO = 1 - smooth(p(t, ...ARRAY_OUT))
  return (
    <Stage>
      <TitleCard t={t} number={16} title="Arrays" />
      <g opacity={a}>
        <BeadBoard x={X0} y={Y0} cell={CELL} />
        {beat !== 'turn' && shown > 0 && arrayO > 0 && <BeadArray rows={3} cols={4} cx={c.x} cy={c.y} cell={CELL * (1 + 0.06 * lift)} rot={90 * spin} shown={shown} o={arrayO} />}
        <Notation text="3 × 4 = 12" x={1340} y={380} size={84} o={smooth(p(t, 9.0, 9.6)) * arrayO} />
        <Notation text="4 × 3 = 12" x={1340} y={500} size={84} o={smooth(p(t, 14.6, 15.2)) * arrayO} />
        <Notation text="3 × 4 = 4 × 3" x={1340} y={640} size={84} o={smooth(p(t, 18.2, 18.8)) * arrayO} />
        <Say t={t} a={7.0} b={11.9} text="Three rows of four." />
        <Say t={t} a={14.7} b={18.0} text="Four rows of three." />

        {/* Squares: each bead (r, c) belongs to the square of side max(r, c) + 1. */}
        {Array.from({ length: 16 }, (_, i) => {
          const r = Math.floor(i / 4)
          const col = i % 4
          const k = Math.max(r, col) + 1
          const order = r < col ? r : k - 1 + (k - 1 - col)
          const o = smooth(p(t, S(k) + order * 0.08, S(k) + order * 0.08 + 0.25)) * (1 - smooth(p(t, TEN - 0.6, TEN)))
          if (o <= 0) return null
          return <circle key={i} cx={X0 + col * CELL + CELL / 2} cy={Y0 + r * CELL + CELL / 2} r={CELL * 0.36} fill={ARRAY_BEAD} stroke="rgba(0,0,0,0.25)" strokeWidth={1} opacity={o} />
        })}
        {[1, 2, 3, 4].map((k) => (
          <Label key={k} text={String(k * k)} x={1120 + (k - 1) * 150} y={420} size={84} o={smooth(p(t, S(k) + 0.9, S(k) + 1.2)) * (1 - smooth(p(t, TEN - 0.6, TEN)))} />
        ))}
        <Caption text="Square numbers" x={1340} y={560} o={win(t, 28.6, TEN - 0.3)} />
        <Notation text="4 × 4 = 16" x={1340} y={720} size={84} o={win(t, 31.0, TEN)} />

        {/* One row of ten, for the question. */}
        {t >= TEN && <BeadArray rows={1} cols={10} cx={X0 + 5 * CELL} cy={Y0 + CELL / 2} cell={CELL} shown={Math.floor((t - TEN - 0.2) / 0.12) + 1} />}
        <Say t={t} a={TEN} b={DURATION} text="And what does × 10 do?" y={860} />
      </g>
    </Stage>
  )
}

export const ep16: SceneDef = {
  id: 'ep16',
  number: 16,
  title: 'Arrays',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'turn',
      time: TURN.beat,
      resume: TURN.resume,
      action: 'tap',
      pieces: [centreOf(3, 4)],
      slots: [centreOf(3, 4)],
      piece: 'custom',
      draw: (at, _i, done) => <BeadArray rows={3} cols={4} cx={at.x} cy={at.y} cell={CELL} colour={done ? '#e86a6a' : ARRAY_BEAD} />,
      reach: 120,
      prompt: 'Turn it',
      say: 'Tap the beads to give them a quarter turn.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode sixteen. Arrays.' },
    { time: 7.0, say: 'Three rows of four.' },
    { time: 9.1, say: 'Three times four is twelve.' },
    { time: 14.7, say: 'Four rows of three. Four times three is twelve.' },
    { time: 18.3, say: 'Three times four is the same as four times three.' },
    { time: 28.6, say: 'One, four, nine, sixteen: square numbers.' },
    { time: 31.1, say: 'Four times four is sixteen.' },
    { time: TEN, say: 'And what happens when we multiply by ten?' },
  ],
  render: 'svg',
  Scene,
}
