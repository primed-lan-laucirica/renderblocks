/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 7 (Part 2): Episode 6 asked "how do we write this number?". The
 * material for 1,345 lies out; under each kind a card appears (1000, 300,
 * 40, 5), and the child slides the cards together (the beat). They nest
 * into 1345: each card covers the zeros of the one beneath, as the cards
 * show when they're pulled apart. Then the hundreds go: the thousand card's
 * own zero shows through and holds the place, 1045. Closes on a ten and
 * three units: what do we call that? (Episode 8.)
 */
import { lerp, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Notation, NumeralCard } from '../kit/kit'
import { Material, placeCentre, type Counts4 } from '../kit/part2'
import { DIGIT_W, SOFT } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 36.5
const FULL: Counts4 = [5, 4, 3, 1]
const NO_HUNDREDS: Counts4 = [5, 4, 0, 1]
const S = 0.5
const MY = 250
/** The cards, biggest first (that's the order they nest in: each smaller one on top). */
const VALUES = [1000, 300, 40, 5]
const PLACE = [3, 2, 1, 0]
const cardW = (v: number) => String(v).length * DIGIT_W + 10
const CARD_Y = 470
/** Each card's own spot, under its kind (x is its right edge). */
const HOME: Pt[] = VALUES.map((v, i) => ({ x: placeCentre(FULL, 960, MY, S, PLACE[i]) + cardW(v) / 2, y: CARD_Y }))
/** Where they nest: right edges together, the 1000 card centred. */
const NEST: Pt = { x: 960 + cardW(1000) / 2, y: 680 }
const CARD_IN = [5.0, 6.2, 7.4, 8.4]
const GATHER = [9.6, 12.4] as const
const slideAt = (i: number) => GATHER[0] + i * 0.6
const APART = [19.0, 20.2] as const
const BACK = [22.0, 23.0] as const
const DROP = [23.6, 24.6] as const
const CLOSE = [30.6, 31.4] as const

const events: SceneEvent[] = [
  ...FULL.flatMap((n, place) => Array.from({ length: n }, (_, j) => ({ time: 3.0 + (3 - place) * 0.4 + j * 0.08, kind: 'bead' as const, n: place }))),
  ...CARD_IN.map((time, i) => ({ time, kind: 'card' as const, n: PLACE[i] })),
  ...VALUES.map((_, i) => ({ time: slideAt(i) + 0.7, kind: 'slide' as const, n: i })),
  { time: 15.4, kind: 'equals', n: 0 },
  { time: APART[0], kind: 'slide', n: 0 },
  { time: BACK[0], kind: 'slide', n: 1 },
  { time: 26.2, kind: 'zero', n: 0 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const drop = smooth(p(t, ...DROP))
  const apart = smooth(p(t, ...APART)) * (1 - smooth(p(t, ...BACK)))
  const close = smooth(p(t, ...CLOSE))
  // Where card i is at t: its home, sliding to the nest, then pulled apart into a staircase and back.
  const cardAt = (i: number): Pt => {
    const k = smooth(p(t, slideAt(i), slideAt(i) + 0.8))
    const at = { x: lerp(HOME[i].x, NEST.x, k), y: lerp(HOME[i].y, NEST.y, k) }
    return { x: at.x, y: at.y + apart * (i - 1.5) * 108 }
  }
  // The hundreds column on the nested cards: where the 1000 card's zero shows.
  const zeroX = NEST.x - 8 - 2.5 * DIGIT_W
  const ring = smooth(p(t, 26.2, 26.7)) * (1 - smooth(p(t, 29.8, 30.4)))
  return (
    <Stage>
      <TitleCard t={t} number={7} title="Numeral cards" />
      <g opacity={a * (1 - close)}>
        <Material counts={FULL} cx={960} y={MY} s={S} o={1 - drop} appear={(i) => smooth(p(t, 3.0 + i * 0.12, 3.4 + i * 0.12))} />
        <Material counts={NO_HUNDREDS} cx={960} y={MY} s={S} o={drop} />
        {beat !== 'nest' &&
          VALUES.map((v, i) => {
            const fade = i === 1 ? 1 - drop : 1
            return <NumeralCard key={v} value={v} right={cardAt(i).x} y={cardAt(i).y} o={smooth(p(t, CARD_IN[i], CARD_IN[i] + 0.4)) * fade} />
          })}
        <Notation text="1000 + 300 + 40 + 5 = 1345" y={900} size={80} o={smooth(p(t, 15.4, 16.0)) * (1 - smooth(p(t, 18.6, 19.0)))} />
        <Say t={t} a={19.4} b={21.8} text="Each card hides the zeros underneath." y={160} />
        {ring > 0 && <ellipse cx={zeroX} cy={NEST.y + 52} rx={34} ry={46} fill="none" stroke="#c53030" strokeWidth={6} opacity={ring} />}
        <Say t={t} a={26.2} b={28.6} text="The zero holds the hundreds place." y={160} />
        <Notation text="1045" y={900} o={smooth(p(t, 28.8, 29.4))} colour={SOFT} />
      </g>
      <g opacity={a * close}>
        <Material counts={[3, 1, 0, 0]} cx={960} y={380} />
        <Say t={t} a={31.4} b={DURATION} text="What do we call one ten and three units?" y={200} />
      </g>
    </Stage>
  )
}

export const ep7: SceneDef = {
  id: 'ep7',
  number: 7,
  title: 'Numeral cards',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'nest',
      time: GATHER[0],
      resume: GATHER[1],
      pieces: HOME,
      // One spot, shared: each card nests onto it (one slot per card, all the same).
      slots: HOME.map(() => NEST),
      piece: 'custom',
      draw: (at, i) => <NumeralCard value={VALUES[i]} right={at.x} y={at.y} />,
      drawSlot: (at, k) => <rect key={k} x={at.x - cardW(1000)} y={at.y} width={cardW(1000)} height={100} rx={8} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="10 8" />,
      centre: { x: -60, y: 50 },
      reach: 80,
      snap: 170,
      stack: true,
      prompt: 'Slide the cards together',
      say: 'Slide the cards together.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode seven. Numeral cards.' },
    { time: 5.0, say: 'One thousand.' },
    { time: 6.2, say: 'Three hundred.' },
    { time: 7.4, say: 'Forty.' },
    { time: 8.4, say: 'Five.' },
    { time: 12.8, say: 'One thousand, three hundred and forty-five.' },
    { time: 15.4, say: 'One thousand plus three hundred plus forty plus five.' },
    { time: 19.4, say: 'Each card hides the zeros underneath.' },
    { time: 24.8, say: 'No hundreds.' },
    { time: 26.2, say: 'The zero holds the hundreds place.' },
    { time: 28.8, say: 'One thousand and forty-five.' },
    { time: 31.4, say: 'What do we call one ten and three units?' },
  ],
  render: 'svg',
  Scene,
}
