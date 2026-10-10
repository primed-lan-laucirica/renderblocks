/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 1 (Part 1, quantity): one for one. The shepherd's pebble from
 * Episode 0 comes back, and pebbles are matched to sheep, one under each,
 * with no counting at all: the same, then more pebbles than sheep (the child
 * does this matching: the beat), then fewer. It closes on the question
 * Episode 2 answers: how many sheep are there?
 */
import { lerp, mix, outBack, p, rng, smooth, win, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Caption } from '../kit/kit'
import { HERO, PilePebble, Sheep } from '../kit/part1'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 38
const SHEEP_Y = 380
const UNDER_Y = 560
const sheepX = (i: number, n: number) => 960 + (i - (n - 1) / 2) * 270
const under = (i: number, n: number): Pt => ({ x: sheepX(i, n), y: UNDER_Y })

/** A loose pile of n pebbles around (cx, cy), seeded, never touching. */
function pile(n: number, seed: number, cx = 960, cy = 830): Pt[] {
  const q = rng(seed)
  const out: Pt[] = []
  while (out.length < n) {
    const pt = { x: cx + (q() - 0.5) * 520, y: cy + (q() - 0.5) * 150 }
    if (out.every((o) => Math.hypot(o.x - pt.x, o.y - pt.y) > 70)) out.push(pt)
  }
  return out
}

/** The three matchings: how many sheep, how many pebbles, when it starts and ends. */
const ACTS = [
  { sheep: 5, pebbles: 5, from: 6.0, to: 15.8, match: 7.8, pile: pile(5, 11) },
  { sheep: 4, pebbles: 6, from: 15.8, to: 25.2, match: 18.0, pile: pile(6, 23) },
  { sheep: 5, pebbles: 3, from: 25.2, to: 33.0, match: 26.6, pile: pile(3, 37) },
] as const
const MATCH_STEP = 0.6
const HERO_AT: Pt = { x: 960, y: 580 }
const BEAT = [18.0, 20.6] as const
const END = 33.0

const events: SceneEvent[] = [
  { time: 3.2, kind: 'pebble', n: 0 },
  ...ACTS.flatMap((a) => Array.from({ length: Math.min(a.sheep, a.pebbles) }, (_, i) => ({ time: a.match + i * MATCH_STEP + 0.45, kind: 'pebble' as const, n: i }))),
  { time: 11.0, kind: 'equals', n: 0 },
]

function Act({ t, k, beat }: { t: number; k: number; beat?: string }) {
  const a = ACTS[k]
  const o = win(t, a.from, a.to)
  if (o <= 0) return null
  const matched = Math.min(a.sheep, a.pebbles)
  return (
    <g opacity={o}>
      {Array.from({ length: a.sheep }, (_, i) => {
        // Sheep walk in from the left, a little apart.
        const s0 = a.from + i * 0.15
        const k2 = smooth(p(t, s0, s0 + 1.4))
        const x = lerp(sheepX(i, a.sheep) - 1100, sheepX(i, a.sheep), k2)
        return <Sheep key={i} x={x} y={SHEEP_Y} s={1.5} step={k2 < 1 ? t * 12 + i : 0} />
      })}
      {Array.from({ length: a.pebbles }, (_, i) => {
        // The child moves the first ones at the beat: the scene leaves them out.
        if (k === 1 && beat === 'match' && i < matched) return null
        // The first act's first pebble is the hero, walking over from the middle.
        const start = k === 0 && i === 0 ? mix(HERO_AT, a.pile[0], smooth(p(t, 6.0, 7.0))) : a.pile[i]
        const pop = k === 0 && i === 0 ? 1 : outBack(p(t, a.from + 0.3 + i * 0.12, a.from + 0.7 + i * 0.12))
        if (pop <= 0) return null
        const m0 = a.match + i * MATCH_STEP
        const at = i < matched ? mix(start, under(i, a.sheep), smooth(p(t, m0, m0 + 0.5))) : start
        return (
          <g key={i} transform={`translate(${at.x} ${at.y}) scale(${pop}) translate(${-at.x} ${-at.y})`}>
            <PilePebble x={at.x} y={at.y} i={i} />
          </g>
        )
      })}
    </g>
  )
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  // The pebble from Episode 0, alone, before the sheep come.
  const hero = outBack(p(t, 3.0, 3.6)) * (1 - smooth(p(t, 5.9, 6.0)))
  const empty = smooth(p(t, 29.0, 29.6)) * (1 - smooth(p(t, 32.4, 33.0)))
  return (
    <Stage>
      <TitleCard t={t} number={1} title="One for one" />
      <g opacity={a}>
        {hero > 0 && (
          <g transform={`translate(${HERO_AT.x} ${HERO_AT.y}) scale(${hero * 2.4})`}>
            <PilePebble x={0} y={0} i={0} />
          </g>
        )}
        {[0, 1, 2].map((k) => (
          <Act key={k} t={t} k={k} beat={beat} />
        ))}
        {/* Fewer: the sheep with no pebble get an empty place. */}
        {[3, 4].map((i) => (
          <ellipse key={i} cx={under(i, 5).x} cy={UNDER_Y} rx={HERO.r * 1.2} ry={HERO.r * 0.9} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="6 5" opacity={empty} />
        ))}
        {/* The end: the five sheep again, and the question. */}
        {Array.from({ length: 5 }, (_, i) => (
          <Sheep key={i} x={sheepX(i, 5)} y={SHEEP_Y + 60} s={1.5} o={win(t, END, DURATION + 1)} />
        ))}
        <Say t={t} a={3.2} b={5.9} text="Long ago, a pebble stood for a sheep." />
        <Caption text="the same" y={700} size={72} o={win(t, 11.0, 15.4)} />
        <Caption text="more pebbles than sheep" y={700} size={64} o={win(t, 21.4, 25.0)} />
        <Caption text="fewer pebbles than sheep" y={700} size={64} o={win(t, 29.0, 32.8)} />
        <Say t={t} a={33.2} b={DURATION} text="How many sheep are there?" />
      </g>
    </Stage>
  )
}

const B = ACTS[1]
export const ep1: SceneDef = {
  id: 'ep1',
  number: 1,
  title: 'One for one',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'match',
      time: BEAT[0],
      resume: BEAT[1],
      pieces: B.pile.slice(0, 4),
      slots: Array.from({ length: 4 }, (_, i) => under(i, 4)),
      piece: 'custom',
      draw: (at, i) => <PilePebble x={at.x} y={at.y} i={i} />,
      drawSlot: (at, k) => <ellipse key={k} cx={at.x} cy={at.y} rx={HERO.r * 1.3} ry={HERO.r} fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="6 5" />,
      reach: 60,
      snap: 100,
      prompt: 'A pebble for each sheep',
      say: 'Give each sheep a pebble.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode one. One for one.' },
    { time: 3.2, say: 'Long ago, a pebble stood for a sheep.' },
    { time: 6.6, say: 'One pebble for each sheep.' },
    { time: 10.8, say: 'Every sheep has a pebble, and every pebble has a sheep. The same.' },
    { time: 16.2, say: 'Now match these.' },
    { time: 21.4, say: 'Some pebbles have no sheep. More pebbles than sheep.' },
    { time: 28.8, say: 'Some sheep have no pebble. Fewer pebbles than sheep.' },
    { time: 33.2, say: 'But how many sheep are there?' },
  ],
  render: 'svg',
  Scene,
}
