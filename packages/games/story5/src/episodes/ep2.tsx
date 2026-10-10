/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 2 (Part 1, quantity): counting. Episode 1's question (how many
 * sheep?) is answered by counting their pebbles: the child touches each one
 * (the beat), then each touch gets a number word, and the last word names
 * the whole. The pebbles scatter and gather: still five. Then dot patterns
 * 1–5, known at a glance. Closes on "How long is five?", which the number
 * rods of Episode 3 answer.
 */
import { lerp, mix, outBack, p, rng, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Caption } from '../kit/kit'
import { DotPattern, HERO, Label, PilePebble, Sheep } from '../kit/part1'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 41
const N = 5
const ROW: Pt[] = Array.from({ length: N }, (_, i) => ({ x: 960 + (i - 2) * 220, y: 560 }))
const SHEEP_Y = 380
// A tap beat skips nothing; the test asks every beat to resume after it pauses, so a tenth of a second.
const TOUCH = [6.6, 6.7] as const
const COUNT = (i: number) => 7.0 + i * 0.9
const WHOLE = 11.6
const SPREAD = [15.0, 16.6] as const
const GATHER = [18.4, 19.8] as const
const PATTERNS = [3, 1, 4, 2, 5]
const PAT = (j: number) => 25.2 + j * 2.4
const WORDS = ['One.', 'Two.', 'Three.', 'Four.', 'Five.']

/** Spread wide, then close together: seeded spots, so every frame agrees. */
const WIDE: Pt[] = (() => {
  const q = rng(52)
  const out: Pt[] = []
  while (out.length < N) {
    const pt = { x: 360 + q() * 1200, y: 360 + q() * 420 }
    if (out.every((o) => Math.hypot(o.x - pt.x, o.y - pt.y) > 260)) out.push(pt)
  }
  return out
})()
const CLOSE: Pt[] = [
  { x: 930, y: 540 },
  { x: 990, y: 548 },
  { x: 958, y: 590 },
  { x: 905, y: 592 },
  { x: 1016, y: 600 },
]

const events: SceneEvent[] = [
  ...ROW.map((_, i) => ({ time: COUNT(i), kind: 'pebble' as const, n: i })),
  { time: WHOLE, kind: 'equals', n: 0 },
  ...PATTERNS.map((n, j) => ({ time: PAT(j) + 0.9, kind: 'digit' as const, n })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const pebblesO = 1 - smooth(p(t, 21.6, 22.4))
  const spread = smooth(p(t, ...SPREAD))
  const gather = smooth(p(t, ...GATHER))
  const at = (i: number) => (t < GATHER[0] ? mix(ROW[i], WIDE[i], spread) : mix(WIDE[i], CLOSE[i], gather))
  // The ring that touches each pebble as it's counted.
  const counting = t >= COUNT(0) - 0.2 && t < COUNT(N - 1) + 0.8
  const which = Math.min(N - 1, Math.max(0, Math.floor((t - COUNT(0) + 0.2) / 0.9)))
  const whole = smooth(p(t, WHOLE, WHOLE + 0.6))
  return (
    <Stage>
      <TitleCard t={t} number={2} title="Counting" />
      <g opacity={a}>
        {/* Episode 1's sheep, their pebbles beneath; the sheep go, the pebbles stay. */}
        {ROW.map((r, i) => (
          <Sheep key={i} x={r.x} y={SHEEP_Y} s={1.5} o={win(t, 2.8, 6.4)} />
        ))}
        <g opacity={pebblesO}>
          {beat !== 'touch' &&
            ROW.map((_, i) => {
              const k = outBack(p(t, 3.0 + i * 0.1, 3.5 + i * 0.1))
              if (k <= 0) return null
              const q = at(i)
              return (
                <g key={i} transform={`translate(${q.x} ${q.y}) scale(${k}) translate(${-q.x} ${-q.y})`}>
                  <PilePebble x={q.x} y={q.y} i={i} />
                </g>
              )
            })}
          {counting && <circle cx={ROW[which].x} cy={ROW[which].y} r={HERO.r * 2} fill="none" stroke="#a7771a" strokeWidth={4} />}
          {/* A number word for each touch, above its pebble, until they move. */}
          {ROW.map((r, i) => (
            <Label key={i} text={String(i + 1)} x={r.x} y={r.y - 90} anchor="middle" size={64} o={smooth(p(t, COUNT(i), COUNT(i) + 0.25)) * (1 - smooth(p(t, 14.6, 15.0)))} />
          ))}
          {/* The last word names them all. */}
          <rect x={lerp(ROW[0].x - 80, ROW[0].x - 80, whole)} y={ROW[0].y - 60} width={(ROW[N - 1].x - ROW[0].x + 160) * whole} height={120} rx={60} fill="none" stroke="#a7771a" strokeWidth={4} opacity={whole * (1 - smooth(p(t, 14.6, 15.0)))} />
          <Label text="5" x={960} y={860} anchor="middle" size={150} o={whole} />
        </g>
        <Say t={t} a={3.2} b={6.4} text="How many?" />
        <Caption text="still five" y={200} size={64} o={win(t, 17.0, 21.4)} />
        {/* Patterns: known at a glance. */}
        <Say t={t} a={22.6} b={24.9} text="Some we know at a glance." />
        {PATTERNS.map((n, j) => {
          const o = win(t, PAT(j), PAT(j) + 2.2)
          if (o <= 0) return null
          return (
            <g key={j}>
              <DotPattern n={n} x={960 - 260} y={430} size={240} o={o} />
              <Label text={String(n)} x={1140} y={550} size={150} o={o * smooth(p(t, PAT(j) + 0.9, PAT(j) + 1.15))} />
            </g>
          )
        })}
        {/* The end: five in a row, and the question. */}
        {ROW.map((r, i) => (
          <PilePebble key={i} x={r.x} y={600} i={i} o={win(t, 37.0, DURATION + 1)} />
        ))}
        <Say t={t} a={37.2} b={DURATION} text="How long is five?" />
      </g>
    </Stage>
  )
}

export const ep2: SceneDef = {
  id: 'ep2',
  number: 2,
  title: 'Counting',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'touch',
      time: TOUCH[0],
      resume: TOUCH[1],
      action: 'tap',
      pieces: ROW,
      slots: ROW,
      piece: 'custom',
      draw: (q, i, done) => (
        <g>
          <PilePebble x={q.x} y={q.y} i={i} />
          {done && <circle cx={q.x} cy={q.y} r={HERO.r * 2} fill="none" stroke="#a7771a" strokeWidth={4} />}
        </g>
      ),
      reach: 70,
      prompt: 'Touch each pebble',
      say: 'Touch each pebble.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode two. Counting.' },
    { time: 3.2, say: 'How many? Touch each one and say a number.' },
    ...WORDS.map((say, i) => ({ time: COUNT(i), say })),
    { time: 11.8, say: 'The last number names them all: five.' },
    { time: 15.0, say: 'Spread them out.' },
    { time: 17.0, say: 'Still five.' },
    { time: 20.0, say: 'Close together: still five.' },
    { time: 22.6, say: 'Some we know at a glance.' },
    ...PATTERNS.map((n, j) => ({ time: PAT(j) + 0.9, say: WORDS[n - 1] })),
    { time: 37.2, say: 'How long is five?' },
  ],
  render: 'svg',
  Scene,
}
