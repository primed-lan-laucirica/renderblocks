/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 18 (Part 4, dividing): sharing. Thirteen beads, four skittles.
 * The child deals the first round, one bead to each skittle (the beat);
 * two more rounds follow, and one bead is left over: too few for another
 * round. It stays in sight, to the right of the skittles (Episode 20 picks
 * it up). Only then: 13 ÷ 4 = 3 r 1, and 4 × 3 + 1 = 13. It closes on
 * dividing the other way round, which Episode 19 answers.
 */
import { mix, outBack, p, smooth, win, type Pt } from '../engine/ease'
import { scatter } from '../engine/layout'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Notation, Skittle, UnitBead } from '../kit/kit'
import { Label } from '../kit/part4'
import { BEAD } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 33
const N = 13
const SHARES = 4
const PILE = scatter(420, 560, N, 31, 170)
const SKITTLE_X = [0, 1, 2, 3].map((s) => 820 + s * 240)
const SKITTLE_Y = 560
/** Where skittle s's k-th bead sits (top-left): a column under the skittle. */
const SPOT = (s: number, k: number): Pt => ({ x: SKITTLE_X[s] - BEAD / 2, y: 600 + k * 30 })
/** The one left over: to the right of the skittles, in plain sight. */
export const LEFTOVER: Pt = { x: 1720, y: 600 }
const APPEAR = (i: number) => 3.4 + i * 0.12
const DEAL = [9.0, 11.6] as const
/** When bead i (dealt in rounds: bead i goes to skittle i % 4) starts moving. */
const MOVE = (i: number) => {
  const k = Math.floor(i / SHARES)
  const s = i % SHARES
  return k === 0 ? DEAL[0] + s * 0.6 : k === 1 ? 12.0 + s * 0.35 : 13.6 + s * 0.35
}
const LEFT_MOVE = [15.4, 16.2] as const

const events: SceneEvent[] = [
  ...PILE.map((_, i) => ({ time: APPEAR(i), kind: 'bead' as const, n: i })),
  ...SKITTLE_X.map((_, s) => ({ time: 5.4 + s * 0.25, kind: 'slide' as const, n: s })),
  ...Array.from({ length: 12 }, (_, i) => ({ time: MOVE(i) + 0.45, kind: 'bead' as const, n: Math.floor(i / SHARES) })),
  { time: LEFT_MOVE[0], kind: 'slide', n: 0 },
  ...SKITTLE_X.map((_, s) => ({ time: 18.6 + s * 0.15, kind: 'card' as const, n: 3 })),
  { time: 19.4, kind: 'equals', n: 0 },
  { time: 22.8, kind: 'equals', n: 1 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  return (
    <Stage>
      <TitleCard t={t} number={18} title="Sharing" />
      <g opacity={a}>
        {SKITTLE_X.map((x, s) => (
          <Skittle key={s} x={x} y={SKITTLE_Y} o={smooth(p(t, 5.4 + s * 0.25, 5.8 + s * 0.25))} />
        ))}
        {PILE.map((b, i) => {
          const k = outBack(p(t, APPEAR(i), APPEAR(i) + 0.35))
          if (k <= 0) return null
          // The child deals the first round themselves.
          if (beat === 'deal' && i < SHARES) return null
          const to = i < 12 ? SPOT(i % SHARES, Math.floor(i / SHARES)) : LEFTOVER
          const m = i < 12 ? smooth(p(t, MOVE(i), MOVE(i) + 0.5)) : smooth(p(t, ...LEFT_MOVE))
          const at = mix(b, to, m)
          return <UnitBead key={i} x={at.x} y={at.y} s={k} />
        })}
        {SKITTLE_X.map((x, s) => (
          <Label key={s} text="3" x={x} y={750} size={64} o={smooth(p(t, 18.6 + s * 0.15, 18.9 + s * 0.15))} />
        ))}
        <Say t={t} a={6.8} b={8.9} text="Thirteen beads. Four skittles." />
        <Say t={t} a={15.4} b={18.4} text="Each skittle has 3. One is left over." />
        <Notation text="13 ÷ 4 = 3 r 1" y={900} o={win(t, 19.4, 22.8)} />
        <Notation text="4 × 3 + 1 = 13" y={900} o={win(t, 22.8, 25.6)} />
        <Say t={t} a={25.8} b={DURATION} text="Twelve in threes: how many groups?" />
      </g>
    </Stage>
  )
}

export const ep18: SceneDef = {
  id: 'ep18',
  number: 18,
  title: 'Sharing',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'deal',
      time: DEAL[0],
      resume: DEAL[1],
      pieces: PILE.slice(0, SHARES),
      slots: SKITTLE_X.map((_, s) => SPOT(s, 0)),
      piece: 'bead',
      prompt: 'One to each skittle',
      say: 'Give one bead to each skittle.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode eighteen. Sharing.' },
    { time: 6.8, say: 'Thirteen beads. Four skittles.' },
    { time: 15.4, say: 'Each skittle has three. One is left over.' },
    { time: 19.5, say: 'Thirteen divided by four is three, remainder one.' },
    { time: 22.9, say: 'Four threes and one make thirteen.' },
    { time: 25.8, say: 'What if we know the size of each group? Twelve in threes: how many groups?' },
  ],
  render: 'svg',
  Scene,
}
