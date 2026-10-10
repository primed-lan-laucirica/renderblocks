/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 3 (Part 1, quantity): the number rods. "How long is five?" Ten
 * red-and-blue rods lie jumbled; one by one, shortest first, they build a
 * staircase, and only once a rod is in place does its numeral join it. The
 * child places the longest rod (the beat). Each rod is one longer than the
 * one before. Closes on "What if we lay them end to end?", which Episode 4
 * answers with the track.
 */
import { lerp, outBack, p, rng, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Label, ROD_H, Rod, UNIT } from '../kit/part1'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 35
/** The staircase: rod n's left end. */
export const STAIR = (n: number): Pt => ({ x: 300, y: 170 + (n - 1) * 60 })
const PLACE = (n: number) => 6.0 + (n - 1) * 1.5
const MOVE = 0.9
const NUMERAL = (n: number) => PLACE(n) + MOVE + 0.2
const BEAT = [PLACE(10), PLACE(10) + MOVE] as const
const WORDS = ['One.', 'Two.', 'Three.', 'Four.', 'Five.', 'Six.', 'Seven.', 'Eight.', 'Nine.', 'Ten.']

/**
 * Where each rod lies before it's placed: in the empty corner above and right
 * of the staircase, a row each, shuffled and a little tilted (seeded). The
 * longest lies straight on top, for the child to pick up.
 */
const ROW_OF = [7, 6, 10, 4, 9, 8, 5, 3, 2, 1]
const JUMBLE: { at: Pt; rot: number }[] = (() => {
  const q = rng(303)
  return Array.from({ length: 10 }, (_, i) => {
    const w = (i + 1) * UNIT
    return { at: { x: 1830 - w - q() * 120, y: STAIR(ROW_OF[i]).y }, rot: i === 9 ? 0 : (q() - 0.5) * 4 }
  })
})()

const events: SceneEvent[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ time: PLACE(i + 1) + MOVE - 0.1, kind: 'slide' as const, n: i })),
  ...Array.from({ length: 10 }, (_, i) => ({ time: NUMERAL(i + 1), kind: 'digit' as const, n: i + 1 })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const rods = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1
    if (n === 10 && beat === 'longest') return null
    const k = smooth(p(t, PLACE(n), PLACE(n) + MOVE))
    const j = JUMBLE[i]
    const pop = outBack(p(t, 3.0 + i * 0.12, 3.4 + i * 0.12))
    if (pop <= 0) return null
    const x = lerp(j.at.x, STAIR(n).x, k)
    const y = lerp(j.at.y, STAIR(n).y, k)
    const rot = lerp(j.rot, 0, k)
    // A lifted rod is drawn above the rest.
    return { n, k, el: (
      <g key={n} transform={`rotate(${rot} ${x} ${y + ROD_H / 2}) translate(${x} ${y}) scale(${pop}) translate(${-x} ${-y})`}>
        <Rod n={n} x={x} y={y} />
      </g>
    ) }
  }).filter((r) => r !== null)
  const order = [...rods].sort((r1, r2) => (r1.k > 0 && r1.k < 1 ? 1 : 0) - (r2.k > 0 && r2.k < 1 ? 1 : 0))
  return (
    <Stage>
      <TitleCard t={t} number={3} title="Number rods" />
      <g opacity={a}>
        <Say t={t} a={3.2} b={5.8} text="Ten rods, each a different length." y={90} />
        {order.map((r) => r.el)}
        {/* Each numeral joins its rod only once the rod is in place. */}
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1
          return <Label key={n} text={String(n)} x={STAIR(n).x + n * UNIT + 30} y={STAIR(n).y + ROD_H / 2 + 2} size={50} o={smooth(p(t, NUMERAL(n), NUMERAL(n) + 0.25))} />
        })}
        {/* One longer each step: the last part of each rod lights up, top to bottom. */}
        {Array.from({ length: 9 }, (_, i) => {
          const n = i + 2
          const s = 22.2 + i * 0.28
          const o = smooth(p(t, s, s + 0.3)) * (1 - smooth(p(t, 26.6, 27.2)))
          return o > 0 ? <rect key={n} x={STAIR(n).x + (n - 1) * UNIT - 3} y={STAIR(n).y - 3} width={UNIT + 6} height={ROD_H + 6} rx={6} fill="none" stroke="#f2d03b" strokeWidth={6} opacity={o} /> : null
        })}
        <Say t={t} a={21.8} b={26.8} text="Each rod is one longer than the one before." y={850} />
        <Say t={t} a={29.6} b={DURATION} text="What if we lay them end to end?" y={850} />
        <g opacity={win(t, 26.4, 29.4)}>
          <Label text="longest" x={STAIR(10).x + 10 * UNIT + 130} y={STAIR(10).y + ROD_H / 2} size={40} />
          <Label text="shortest" x={STAIR(1).x + UNIT + 130} y={STAIR(1).y + ROD_H / 2} size={40} />
        </g>
      </g>
    </Stage>
  )
}

export const ep3: SceneDef = {
  id: 'ep3',
  number: 3,
  title: 'Number rods',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'longest',
      time: BEAT[0],
      resume: BEAT[1],
      pieces: [JUMBLE[9].at],
      slots: [STAIR(10)],
      piece: 'custom',
      draw: (at) => <Rod n={10} x={at.x} y={at.y} />,
      drawSlot: (at, k) => <rect key={k} x={at.x} y={at.y} width={10 * UNIT} height={ROD_H} rx={4} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="10 8" />,
      centre: { x: 5 * UNIT, y: ROD_H / 2 },
      reach: 90,
      snap: 130,
      prompt: 'Put the longest rod at the bottom',
      say: 'Put the longest rod at the bottom.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode three. Number rods.' },
    { time: 3.2, say: 'Ten rods, each a different length.' },
    ...WORDS.map((say, i) => ({ time: NUMERAL(i + 1), say })),
    { time: 21.8, say: 'Each rod is one longer than the one before.' },
    { time: 26.4, say: 'Ten is the longest. One is the shortest.' },
    { time: 29.6, say: 'What if we lay them end to end?' },
  ],
  render: 'svg',
  Scene,
}
