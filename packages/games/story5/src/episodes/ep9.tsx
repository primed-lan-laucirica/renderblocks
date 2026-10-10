/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 9 (Part 2): Episode 8 asked "is there another way to make 23?".
 * Two tens and three units; then a copy where the child breaks a ten (the
 * beat): one ten and thirteen units; then twenty-three units. The same
 * amount three ways. Then comparing: 23 and 19, tens first, 23 > 19; 23 and
 * 27, the tens are the same, so the units decide, 23 < 27. Closes on two
 * groups about to meet: what happens when we put them together? (Episode 10.)
 */
import { outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { Notation, TenBar, UnitBead } from '../kit/kit'
import { Material, materialLayout, type Counts4 } from '../kit/part2'
import { BAR, BEAD } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 44
const Y = 300
const UNIT_DY = BEAD + 10
/** Unit k of a way, in columns of ten starting at x. */
const unit = (x: number, k: number): Pt => ({ x: x + Math.floor(k / 10) * 40, y: Y + (k % 10) * UNIT_DY })

// The three ways: [tens x], units column x.
const W1 = { tens: [330, 366], units: 460, cx: 420 }
const W2 = { tens: [870, 906], units: 1000, cx: 960 }
const W3 = { tens: [1410], units: 1500, cx: 1500 }
const BREAK2 = [9.6, 11.0] as const
const BREAK3 = [15.0, 16.4] as const
const TAP = [7.8, 9.6] as const
const LAND2 = Array.from({ length: 10 }, (_, j) => unit(W2.units, 3 + j))
const LAND3 = Array.from({ length: 10 }, (_, j) => unit(W3.units, 13 + j))
const WAYS_OUT = [20.2, 20.8] as const

// Comparing.
const LEFT_CX = 560
const RIGHT_CX = 1360
const CY = 300
const CMP1 = [21.0, 21.6] as const
const SWAP = [28.8, 29.6] as const
const CLOSE = [38.0, 38.6] as const

/** A box around one place's pieces in a `Material` drawn at full size. */
function PlaceBox({ counts, cx, place, o }: { counts: Counts4; cx: number; place: number; o: number }) {
  if (o <= 0) return null
  const { pieces, width } = materialLayout(counts)
  const mine = pieces.filter((pc) => pc.place === place)
  const left = cx - width / 2 + Math.min(...mine.map((pc) => pc.at.x))
  const right = cx - width / 2 + Math.max(...mine.map((pc) => pc.at.x)) + BEAD
  const bottom = CY + Math.max(...mine.map((pc) => pc.at.y)) + (place === 1 ? BAR : BEAD)
  return <rect x={left - 16} y={CY - 18} width={right - left + 32} height={bottom - CY + 36} rx={14} fill="none" stroke="#c53030" strokeWidth={5} opacity={o} />
}

const events: SceneEvent[] = [
  { time: 3.0, kind: 'slide', n: 0 },
  { time: 3.2, kind: 'slide', n: 1 },
  ...[0, 1, 2].map((k) => ({ time: 3.5 + k * 0.15, kind: 'bead' as const, n: k })),
  { time: 6.4, kind: 'card', n: 0 },
  { time: 6.8, kind: 'slide', n: 2 },
  { time: 9.7, kind: 'break', n: 0 },
  { time: 13.4, kind: 'card', n: 1 },
  { time: 14.0, kind: 'slide', n: 3 },
  { time: 15.1, kind: 'break', n: 0 },
  { time: 17.0, kind: 'card', n: 2 },
  { time: 18.2, kind: 'equals', n: 0 },
  { time: 23.0, kind: 'place', n: 1 },
  { time: 26.2, kind: 'equals', n: 1 },
  { time: 31.0, kind: 'place', n: 1 },
  { time: 32.6, kind: 'place', n: 0 },
  { time: 34.8, kind: 'equals', n: 2 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const ways = 1 - smooth(p(t, ...WAYS_OUT))
  const cmp = smooth(p(t, ...CMP1)) * (1 - smooth(p(t, CLOSE[0] - 0.4, CLOSE[0])))
  const swap = smooth(p(t, ...SWAP))
  const close = smooth(p(t, ...CLOSE))
  const b2 = t < BREAK2[0] ? -1 : p(t, ...BREAK2)
  const b3 = t < BREAK3[0] ? -1 : p(t, ...BREAK3)
  const in1 = smooth(p(t, 3.0, 3.6))
  const in2 = smooth(p(t, 6.8, 7.4))
  const in3 = smooth(p(t, 14.0, 14.6))
  const pulse = t >= TAP[0] && t < BREAK2[0] && beat !== 'break' ? 0.5 + 0.5 * Math.sin((t - TAP[0]) * 8) : 0
  return (
    <Stage>
      <TitleCard t={t} number={9} title="Three ways to 23" />
      <g opacity={a}>
        {/* ——— Three ways ——— */}
        <g opacity={ways}>
          {/* 2 tens and 3 units. */}
          <g opacity={in1}>
            {W1.tens.map((x) => (
              <TenBar key={x} x={x} y={Y} />
            ))}
            {[0, 1, 2].map((k) => (
              <UnitBead key={k} {...unit(W1.units, k)} />
            ))}
          </g>
          <Notation text="20 + 3" x={W1.cx} y={720} size={72} o={smooth(p(t, 6.4, 6.9))} />
          {/* 1 ten and 13 units: the child breaks a ten. */}
          <g opacity={in2}>
            <TenBar x={W2.tens[0]} y={Y} />
            {b2 < 0 && beat !== 'break' && <TenBar x={W2.tens[1]} y={Y} />}
            {pulse > 0 && <rect x={W2.tens[1] - 14} y={Y - 14} width={BEAD + 28} height={BAR + 28} rx={12} fill="none" stroke="#fde68a" strokeWidth={6} opacity={pulse} />}
            {b2 >= 0 && exchange('units→ten', LAND2, { x: W2.tens[1], y: Y }, b2, true)}
            {[0, 1, 2].map((k) => (
              <UnitBead key={k} {...unit(W2.units, k)} />
            ))}
            {t >= BREAK2[1] && LAND2.map((u, j) => <UnitBead key={j} {...u} />)}
          </g>
          <Notation text="10 + 13" x={W2.cx} y={720} size={72} o={smooth(p(t, 13.4, 13.9))} />
          {/* 23 units. */}
          <g opacity={in3}>
            {b3 < 0 && <TenBar x={W3.tens[0]} y={Y} />}
            {b3 >= 0 && exchange('units→ten', LAND3, { x: W3.tens[0], y: Y }, b3, true)}
            {Array.from({ length: t >= BREAK3[1] ? 23 : 13 }, (_, k) => (
              <UnitBead key={k} {...unit(W3.units, k)} />
            ))}
          </g>
          <Notation text="23" x={W3.cx} y={720} size={72} o={smooth(p(t, 17.0, 17.5))} />
          <Notation text="=" x={(W1.cx + W2.cx) / 2} y={720} size={72} o={smooth(p(t, 18.2, 18.7))} />
          <Notation text="=" x={(W2.cx + W3.cx) / 2 + 30} y={720} size={72} o={smooth(p(t, 18.2, 18.7))} />
          <Say t={t} a={18.2} b={20.4} text="The same amount, three ways." y={160} />
        </g>

        {/* ——— Comparing: tens first ——— */}
        <g opacity={cmp}>
          <Material counts={[3, 2, 0, 0]} cx={LEFT_CX} y={CY} />
          <Material counts={[9, 1, 0, 0]} cx={RIGHT_CX} y={CY} o={1 - swap} />
          <Material counts={[7, 2, 0, 0]} cx={RIGHT_CX} y={CY} o={swap} />
          <Say t={t} a={21.4} b={22.8} text="Which is more?" y={160} />
          {/* 23 and 19: the tens decide. */}
          <PlaceBox counts={[3, 2, 0, 0]} cx={LEFT_CX} place={1} o={smooth(p(t, 23.0, 23.4)) * (1 - smooth(p(t, 28.4, 28.8)))} />
          <PlaceBox counts={[9, 1, 0, 0]} cx={RIGHT_CX} place={1} o={smooth(p(t, 23.0, 23.4)) * (1 - smooth(p(t, 28.4, 28.8)))} />
          <Say t={t} a={23.0} b={26.0} text="Tens first: two tens, one ten." y={160} />
          <Notation text=">" x={960} y={440} size={180} o={smooth(p(t, 26.2, 26.6)) * (1 - smooth(p(t, 28.4, 28.8)))} />
          <Notation text="23 > 19" y={820} o={smooth(p(t, 26.2, 26.8)) * (1 - smooth(p(t, 28.4, 28.8)))} />
          {/* 23 and 27: the tens are the same, so the units decide. */}
          <PlaceBox counts={[3, 2, 0, 0]} cx={LEFT_CX} place={1} o={smooth(p(t, 31.0, 31.4)) * (1 - smooth(p(t, 32.4, 32.8)))} />
          <PlaceBox counts={[7, 2, 0, 0]} cx={RIGHT_CX} place={1} o={smooth(p(t, 31.0, 31.4)) * (1 - smooth(p(t, 32.4, 32.8)))} />
          <PlaceBox counts={[3, 2, 0, 0]} cx={LEFT_CX} place={0} o={smooth(p(t, 32.6, 33.0))} />
          <PlaceBox counts={[7, 2, 0, 0]} cx={RIGHT_CX} place={0} o={smooth(p(t, 32.6, 33.0))} />
          <Say t={t} a={31.0} b={34.6} text="The tens are the same, so look at the units." y={160} />
          <Notation text="<" x={960} y={440} size={180} o={smooth(p(t, 34.8, 35.2))} />
          <Notation text="23 < 27" y={820} o={smooth(p(t, 34.8, 35.4))} />
        </g>

        {/* ——— Two groups, about to meet ——— */}
        <g opacity={close}>
          {[0, 1, 2].map((k) => (
            <UnitBead key={k} x={700 + k * 40 + smooth(p(t, 39.0, 42.0)) * 60} y={520} s={outBack(p(t, 38.2 + k * 0.1, 38.6 + k * 0.1))} />
          ))}
          {[0, 1, 2, 3].map((k) => (
            <UnitBead key={k} x={1100 + k * 40 - smooth(p(t, 39.0, 42.0)) * 60} y={520} s={outBack(p(t, 38.4 + k * 0.1, 38.8 + k * 0.1))} />
          ))}
          <Say t={t} a={38.6} b={DURATION} text="What happens when we put two groups together?" y={200} />
        </g>
      </g>
    </Stage>
  )
}

export const ep9: SceneDef = {
  id: 'ep9',
  number: 9,
  title: 'Three ways to 23',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'break',
      time: TAP[0],
      resume: TAP[1],
      action: 'tap',
      pieces: [{ x: W2.tens[1], y: Y }],
      slots: [{ x: W2.tens[1], y: Y }],
      piece: 'custom',
      draw: (at, _i, done) => (
        <g>
          <rect x={at.x - 30} y={at.y - 10} width={BEAD + 60} height={BAR + 20} fill="transparent" />
          <TenBar x={at.x} y={at.y} o={done ? 0.4 : 1} />
        </g>
      ),
      centre: { x: BEAD / 2, y: BAR / 2 },
      reach: 40,
      prompt: 'Break a ten',
      say: 'Break a ten.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode nine. Three ways to twenty-three.' },
    { time: 4.4, say: 'Two tens and three units.' },
    { time: 11.4, say: 'One ten and thirteen units.' },
    { time: 16.8, say: 'Twenty-three units.' },
    { time: 18.2, say: 'The same amount, three ways.' },
    { time: 21.4, say: 'Which is more?' },
    { time: 23.0, say: 'Tens first: two tens, one ten.' },
    { time: 26.4, say: 'Twenty-three is greater than nineteen.' },
    { time: 29.8, say: 'Now twenty-seven.' },
    { time: 31.0, say: 'The tens are the same, so look at the units.' },
    { time: 35.0, say: 'Twenty-three is less than twenty-seven.' },
    { time: 38.6, say: 'What happens when we put two groups together?' },
  ],
  render: 'svg',
  Scene,
}
