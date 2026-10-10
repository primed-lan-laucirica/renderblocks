/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 11 (Part 3, adding): partners of ten, with the number rods. Under
 * the ten rod, a seven rod leaves a gap; the child slides the three rod in
 * (the beat), and 7 + 3 = 10. The two swap places and still match: 3 + 7.
 * Then every pair, 9 + 1 down to 1 + 9, each row as long as the ten.
 * Closes on "take three away from ten", which Episode 12 answers.
 */
import { lerp, mix, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { Notation, NumberRod } from '../kit/kit'
import { Gap } from '../kit/part3'
import { ROD_UNIT, SOFT } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 38
const LEFT = 660
const TEN: Pt = { x: LEFT, y: 300 }
const SEVEN: Pt = { x: LEFT, y: 400 }
const GAP_AT: Pt = { x: LEFT + 7 * ROD_UNIT, y: 400 }
const THREE: Pt = { x: 1320, y: 560 }
const FILL = [8.0, 10.2] as const
const SWAP = [13.2, 14.8] as const
const PAIRS_OUT = [17.4, 18.2] as const
const ROW_IN = (k: number) => 18.6 + (k - 1) * 0.6
const ROW_Y = (k: number) => 210 + (k - 1) * 72
const TABLE_OUT = [30.0, 30.8] as const
const CLOSE = 31.0

const events: SceneEvent[] = [
  { time: 3.0, kind: 'slide', n: 0 },
  { time: 4.0, kind: 'card', n: 1 },
  { time: 4.6, kind: 'slide', n: 7 },
  { time: 6.0, kind: 'slide', n: 3 },
  { time: 9.8, kind: 'equals', n: 0 },
  { time: 13.2, kind: 'slide', n: 0 },
  { time: 15.0, kind: 'equals', n: 1 },
  ...Array.from({ length: 9 }, (_, i) => ({ time: ROW_IN(i + 1), kind: 'slide' as const, n: i })),
  { time: 32.2, kind: 'slide', n: 3 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const pairs = 1 - smooth(p(t, ...PAIRS_OUT))
  const table = smooth(p(t, 18.4, 18.8)) * (1 - smooth(p(t, ...TABLE_OUT)))
  const close = smooth(p(t, CLOSE, CLOSE + 0.6))

  // The three rod: waiting below, then into the gap; then the swap (three to the front, seven behind it).
  const fill = smooth(p(t, FILL[0], FILL[1] - 0.4))
  const swap = smooth(p(t, ...SWAP))
  const arc = Math.sin(Math.PI * swap) * 70
  const three = mix(mix(THREE, GAP_AT, fill), SEVEN, swap)
  const seven = mix(SEVEN, { x: LEFT + 3 * ROD_UNIT, y: SEVEN.y }, swap)
  const lift = 1 - smooth(p(t, CLOSE + 1.2, CLOSE + 2.2))
  return (
    <Stage>
      <TitleCard t={t} number={11} title="Partners of ten" />
      <g opacity={a}>
        {pairs > 0 && (
          <g opacity={pairs}>
            <NumberRod n={10} x={lerp(-700, TEN.x, smooth(p(t, 3.0, 3.8)))} y={TEN.y} />
            <Notation text="10" x={TEN.x + 10 * ROD_UNIT + 70} y={TEN.y + 18} size={60} o={smooth(p(t, 4.0, 4.5))} colour={SOFT} />
            <NumberRod n={7} x={seven.x} y={seven.y - arc} o={smooth(p(t, 4.6, 5.2))} />
            <Gap x={GAP_AT.x} y={GAP_AT.y} w={3 * ROD_UNIT} h={30} o={smooth(p(t, 6.4, 6.9)) * (1 - fill)} />
            {beat !== 'fill' && <NumberRod n={3} x={three.x} y={three.y + arc} o={smooth(p(t, 6.0, 6.6))} />}
            <Notation text="7 + 3 = 10" y={860} o={smooth(p(t, 10.6, 11.2)) * (1 - smooth(p(t, 13.2, 13.6)))} />
            <Notation text="3 + 7 = 10" y={860} o={smooth(p(t, 15.0, 15.6))} />
          </g>
        )}

        {/* ——— Every partner of ten ——— */}
        {table > 0 && (
          <g opacity={table}>
            {Array.from({ length: 9 }, (_, i) => {
              const k = i + 1
              const o = smooth(p(t, ROW_IN(k), ROW_IN(k) + 0.4))
              if (o <= 0) return null
              // The pairs that swap (7 + 3 and 3 + 7) glow together.
              const pick = (k === 3 || k === 7) && t > 26.6 ? 0.5 + 0.5 * Math.sin((t - 26.6) * 6) : 0
              return (
                <g key={k} opacity={o}>
                  {pick > 0 && <rect x={LEFT - 14} y={ROW_Y(k) - 10} width={10 * ROD_UNIT + 28} height={50} rx={10} fill="#fde68a" opacity={pick} />}
                  <NumberRod n={10 - k} x={LEFT} y={ROW_Y(k)} />
                  <NumberRod n={k} x={LEFT + (10 - k) * ROD_UNIT + 4} y={ROW_Y(k)} />
                  <Notation text={`${10 - k} + ${k}`} x={LEFT + 10 * ROD_UNIT + 150} y={ROW_Y(k) + 18} size={46} />
                </g>
              )
            })}
          </g>
        )}

        {/* ——— Closing: three lifts off the ten ——— */}
        {close > 0 && (
          <g opacity={close}>
            <NumberRod n={7} x={LEFT} y={460} />
            <NumberRod n={3} x={LEFT + 7 * ROD_UNIT + 40 * (1 - lift)} y={460 - 120 * (1 - lift)} o={0.35 + 0.65 * lift} />
            <Say t={t} a={32.6} b={DURATION} text="Take 3 away from 10: what is left?" y={640} />
          </g>
        )}
      </g>
    </Stage>
  )
}

const ROD3 = <NumberRod n={3} x={0} y={0} />

export const ep11: SceneDef = {
  id: 'ep11',
  number: 11,
  title: 'Partners of ten',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'fill',
      time: FILL[0],
      resume: FILL[1],
      pieces: [THREE],
      slots: [GAP_AT],
      piece: 'custom',
      draw: (at) => <g transform={`translate(${at.x} ${at.y})`}>{ROD3}</g>,
      drawSlot: (at, k) => <Gap key={k} x={at.x} y={at.y} w={3 * ROD_UNIT} h={30} />,
      centre: { x: 1.5 * ROD_UNIT, y: 15 },
      reach: 90,
      snap: 90,
      prompt: 'Fill the gap',
      say: 'Fill the gap.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode eleven. Partners of ten.' },
    { time: 4.8, say: 'Ten, and seven.' },
    { time: 6.4, say: 'What fills the gap?' },
    { time: 10.6, say: 'Seven and three make ten.' },
    { time: 15.2, say: 'Three and seven: still ten.' },
    { time: 24.6, say: 'Every pair makes ten.' },
    { time: 26.6, say: 'Swap the order: still the same.' },
    { time: 32.6, say: 'Take three away from ten. What is left?' },
  ],
  render: 'svg',
  Scene,
}
