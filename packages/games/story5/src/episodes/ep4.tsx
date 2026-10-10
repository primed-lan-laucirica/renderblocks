/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 4 (Part 1, quantity): the track. Episode 3's staircase lies down,
 * rod by rod, on one line; each rod ends at its own number, and the numbers
 * are left in a row: a track. Then the pebble from Episode 1 hops along it:
 * one more, one less. The child moves it one more (the beat). It hops on up
 * to ten and closes on "What happens when we get to ten?", which Episode 5
 * answers with ten beads becoming one ten.
 */
import { mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { NumberTrack } from '../kit/kit'
import { HERO, Label, PilePebble, ROD_H, Rod, UNIT } from '../kit/part1'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 40
const X0 = 480
const LINE = 820
const STAIR = (n: number): Pt => ({ x: X0, y: 130 + (n - 1) * 58 })
const DROP = (n: number) => 5.0 + (n - 1) * 0.7
const FALL = 0.5
/** Where the pebble sits on the track at v. */
const AT = (v: number): Pt => ({ x: X0 + v * UNIT, y: LINE - HERO.r - 10 })
/** The pebble's hops: [start time, from, to], each 0.6 s. */
const HOPS: [number, number, number][] = [
  [17.6, 3, 4],
  [19.9, 4, 3],
  [22.2, 3, 6],
  [25.4, 6, 7],
  [28.6, 7, 6],
  [31.4, 6, 7],
  [32.1, 7, 8],
  [32.8, 8, 9],
  [33.5, 9, 10],
]
const HOP = 0.6
const BEAT = [25.4, 26.2] as const

const events: SceneEvent[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ time: DROP(i + 1) + FALL, kind: 'slide' as const, n: i })),
  ...Array.from({ length: 10 }, (_, i) => ({ time: DROP(i + 1) + FALL + 0.1, kind: 'digit' as const, n: i + 1 })),
  { time: 15.4, kind: 'pebble', n: 3 },
  ...HOPS.map(([s, , to]) => ({ time: s + HOP, kind: 'pebble' as const, n: to })),
]

/** Where the pebble is at t (it waits between hops, arcing over each). */
function pebbleAt(t: number): Pt {
  let at = AT(3)
  for (const [s, from, to] of HOPS) {
    if (t < s) break
    const k = smooth(p(t, s, s + HOP))
    const pt = mix(AT(from), AT(to), k)
    at = { x: pt.x, y: pt.y - Math.sin(Math.PI * k) * (50 + 25 * Math.abs(to - from)) }
  }
  return at
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const track = smooth(p(t, DROP(1) + FALL, DROP(1) + FALL + 0.5))
  const peb = outBack(p(t, 15.2, 15.7))
  const q = pebbleAt(t)
  return (
    <Stage>
      <TitleCard t={t} number={4} title="The track" />
      <g opacity={a}>
        <NumberTrack x={X0} y={LINE} from={0} to={10} unit={UNIT} labels={false} o={track} />
        <Label text="0" x={X0} y={LINE + 56} anchor="middle" size={46} o={track} />
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1
          // Each rod lies down on the line, its end on its number; then it goes, the number stays.
          const k = smooth(p(t, DROP(n), DROP(n) + FALL))
          const gone = smooth(p(t, DROP(n) + 1.2, DROP(n) + 1.6))
          const y = STAIR(n).y + (LINE - ROD_H - 8 - STAIR(n).y) * k
          const landed = smooth(p(t, DROP(n) + FALL, DROP(n) + FALL + 0.25))
          return (
            <g key={n}>
              <Rod n={n} x={X0} y={y} o={smooth(p(t, 2.8, 3.4)) * (1 - gone)} />
              <Label text={String(n)} x={X0 + n * UNIT + (1 - k) * 34} y={y + ROD_H / 2 + (LINE + 56 - y - ROD_H / 2) * landed} anchor="middle" size={46} o={smooth(p(t, 2.8, 3.4))} />
            </g>
          )
        })}
        {peb > 0 && beat !== 'more' && (
          <g transform={`translate(${q.x} ${q.y}) scale(${peb}) translate(${-q.x} ${-q.y})`}>
            <PilePebble x={q.x} y={q.y} i={0} />
          </g>
        )}
        <Say t={t} a={5.2} b={7.9} text="Lay each rod down on one line." y={90} />
        <Say t={t} a={8.4} b={11.2} text="Each one ends at its own number." y={90} />
        <Say t={t} a={11.8} b={15.2} text="The numbers sit in a row: a track." y={90} />
        <Say t={t} a={35.0} b={DURATION} text="What happens when we get to ten?" y={420} />
      </g>
    </Stage>
  )
}

export const ep4: SceneDef = {
  id: 'ep4',
  number: 4,
  title: 'The track',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'more',
      time: BEAT[0],
      resume: BEAT[1],
      pieces: [AT(6)],
      slots: [AT(7)],
      piece: 'custom',
      draw: (at) => <PilePebble x={at.x} y={at.y} i={0} />,
      drawSlot: (at, k) => <ellipse key={k} cx={at.x} cy={at.y} rx={HERO.r * 1.4} ry={HERO.r * 1.1} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="6 5" />,
      reach: 70,
      snap: UNIT * 0.5,
      prompt: 'One more',
      say: 'Move it one more.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode four. The track.' },
    { time: 3.2, say: 'The staircase again.' },
    { time: 5.2, say: 'Lay each rod down on one line.' },
    { time: 8.4, say: 'Each one ends at its own number.' },
    { time: 11.8, say: 'The numbers sit in a row: a track.' },
    { time: 15.6, say: 'A pebble on three.' },
    { time: 18.3, say: 'One more: four.' },
    { time: 20.6, say: 'One less: three.' },
    { time: 22.4, say: "Now it's on six." },
    { time: 26.4, say: 'Seven: one more than six.' },
    { time: 29.2, say: 'One less than seven: six.' },
    { time: 32.0, say: 'Seven.' },
    { time: 32.7, say: 'Eight.' },
    { time: 33.4, say: 'Nine.' },
    { time: 34.1, say: 'Ten.' },
    { time: 35.0, say: 'What happens when we get to ten?' },
  ],
  render: 'svg',
  Scene,
}
