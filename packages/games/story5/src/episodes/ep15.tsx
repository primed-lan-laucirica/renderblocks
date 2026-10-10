/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 15 (Part 4, multiplying): equal groups. Four bars of three
 * arrive; the child links them into a chain (the beat); the chain is
 * counted by threes, 3, 6, 9, 12, and only then do the sums appear:
 * 3 + 3 + 3 + 3 = 12, and 4 × 3 = 12, "four groups of three". The bars
 * then lie side by side, four rows of three, the question Episode 16 answers.
 */
import { mix, outBack, p, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { BeadBar, Notation } from '../kit/kit'
import { Label } from '../kit/part4'
import { BEAD_R } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 34
const N = 3
/** A 3-bar's length, link to link, in a chain. */
const LINK = N * BEAD_R * 2 + 10
/** Where the bars arrive: one above the other. */
const COLUMN: Pt[] = [0, 1, 2, 3].map((i) => ({ x: 560, y: 340 + i * 90 }))
/** The chain: four bars end to end. */
const CHAIN: Pt[] = [0, 1, 2, 3].map((i) => ({ x: 960 - (4 * LINK - 10) / 2 + BEAD_R + i * LINK, y: 640 }))
/** Side by side at the close: four rows of three. */
const ROWS: Pt[] = [0, 1, 2, 3].map((i) => ({ x: 960 - BEAD_R * 2, y: 560 + i * (BEAD_R * 2 + 2) }))
const ARRIVE = (i: number) => 3.4 + i * 0.7
const CHAIN_AT = [10.0, 13.0] as const
const LINKS = (i: number) => CHAIN_AT[0] + i * 0.45
const COUNT = (i: number) => 13.7 + i * 0.4
const SIDE = [25.0, 27.0] as const

const events: SceneEvent[] = [
  ...COLUMN.map((_, i) => ({ time: ARRIVE(i), kind: 'slide' as const, n: i })),
  ...CHAIN.map((_, i) => ({ time: LINKS(i) + 1.0, kind: 'bead' as const, n: i })),
  ...CHAIN.map((_, i) => ({ time: COUNT(i), kind: 'digit' as const, n: (i + 1) * 3 })),
  { time: 17.6, kind: 'equals', n: 0 },
  { time: 21.2, kind: 'equals', n: 1 },
  ...ROWS.map((_, i) => ({ time: SIDE[0] + 0.3 + i * 0.3, kind: 'slide' as const, n: i })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const side = smooth(p(t, ...SIDE))
  return (
    <Stage>
      <TitleCard t={t} number={15} title="Equal groups" />
      <g opacity={a}>
        {beat === 'chain'
          ? null
          : COLUMN.map((c, i) => {
              const k = outBack(p(t, ARRIVE(i), ARRIVE(i) + 0.5))
              if (k <= 0) return null
              const m = smooth(p(t, LINKS(i), LINKS(i) + 1.1))
              const at = mix(mix({ x: c.x - 200 * (1 - k), y: c.y }, CHAIN[i], m), ROWS[i], side)
              return <BeadBar key={i} n={N} x={at.x} y={at.y} o={Math.min(1, k)} />
            })}
        {/* The links between bars, once they're a chain (and until they lie side by side). */}
        {CHAIN.slice(0, 3).map((c, i) => {
          const o = smooth(p(t, LINKS(i + 1) + 1.0, LINKS(i + 1) + 1.3)) * (1 - side)
          return o > 0 ? <circle key={i} cx={c.x + (N - 1) * BEAD_R * 2 + BEAD_R + 5} cy={c.y} r={4} fill="none" stroke="#8a6a2a" strokeWidth={2} opacity={o} /> : null
        })}
        {/* Counting the chain by threes, at the end of each bar. */}
        {CHAIN.map((c, i) => (
          <Label key={i} text={String((i + 1) * N)} x={c.x + (N - 1) * BEAD_R * 2} y={c.y - 60} o={smooth(p(t, COUNT(i), COUNT(i) + 0.3)) * (1 - side)} />
        ))}
        <Say t={t} a={7.4} b={9.9} text="Four bars of three." />
        <Notation text="3 + 3 + 3 + 3 = 12" y={860} o={win(t, 17.4, 21.0)} />
        <Notation text="4 × 3 = 12" y={860} o={win(t, 21.0, 24.8)} />
        <Say t={t} a={27.6} b={DURATION} text="Four rows of three. What shape is that?" />
      </g>
    </Stage>
  )
}

/** The child's beat: link the four bars end to end. */
const drawBar = (at: Pt) => <BeadBar n={N} x={at.x} y={at.y} />

export const ep15: SceneDef = {
  id: 'ep15',
  number: 15,
  title: 'Equal groups',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'chain',
      time: CHAIN_AT[0],
      resume: CHAIN_AT[1],
      pieces: COLUMN,
      slots: CHAIN,
      piece: 'custom',
      draw: drawBar,
      drawSlot: (at, k) => <rect key={k} x={at.x - BEAD_R - 4} y={at.y - BEAD_R - 4} width={(N - 1) * BEAD_R * 2 + BEAD_R * 2 + 8} height={BEAD_R * 2 + 8} rx={14} fill="none" stroke="#a7771a" strokeWidth={2} strokeDasharray="6 5" />,
      centre: { x: BEAD_R * 2, y: 0 },
      reach: 56,
      snap: 70,
      prompt: 'Make a chain',
      say: 'Link the bars into a chain.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode fifteen. Equal groups.' },
    { time: 7.4, say: 'Four bars of three.' },
    { time: 13.7, say: 'Three, six, nine, twelve.' },
    { time: 17.5, say: 'Three and three and three and three make twelve.' },
    { time: 21.1, say: 'Four groups of three: four times three is twelve.' },
    { time: 27.6, say: 'Four rows of three. What shape is that?' },
  ],
  render: 'svg',
  Scene,
}
