/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 25 (Part 6, decimals): a unit bead, close up. The child taps it
 * (the beat) and it breaks into ten equal slices: tenths. One tenth is named
 * 1/10, then 0.1. On the decimal board the tenths take the first column to
 * the right of the point, and one unit and three tenths are written 1.3.
 * Then money: a dollar is a unit, ten dimes make it, so a dime is a tenth;
 * the child taps a dime (the second beat) and it breaks into ten pennies.
 * Closes on what part of a dollar a penny is, which Episode 26 answers.
 */
import { lerp, mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent, VoiceLine } from '../engine/scene'
import { DecimalBoard, Notation, UnitBead } from '../kit/kit'
import { BILL_H, BILL_W, Bill, Coin, DEC_COLOUR, SlicedBead, TenthPiece, fuse } from '../kit/part6'
import { SOFT } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 44
/** The bead, close up: centre and side. */
const C: Pt = { x: 960, y: 440 }
const BIG = 300
const ZOOM = [4.0, 6.0] as const
const BREAK = [6.6, 6.8] as const
const SPREAD = 16
/** The slice that's singled out as one tenth. */
const ONE = 4

// ——— the decimal board ———
const BOARD = { x: 248, y: 250, col: 200, height: 520 }
const colLeft = (i: number) => BOARD.x + i * BOARD.col + (i > 3 ? 24 : 0)
const colMid = (i: number) => colLeft(i) + (BOARD.col - 8) / 2
const POINT_X = BOARD.x + 4 * BOARD.col + 8
/** Board pieces at 3× (a tenth 24 × 66): ten tenths in two rows of five. */
const PS = 3
const TENTHS_AT = (i: number): Pt => ({ x: colMid(4) - 72 + (i % 5) * 30, y: 340 + Math.floor(i / 5) * 90 })
const UNIT_AT: Pt = { x: colMid(3) - 33, y: 340 }
const TO_BOARD = [17.2, 18.8] as const

// ——— money ———
const BILL_S = 2.5
const BILL_AT: Pt = { x: C.x - (BILL_W * BILL_S) / 2, y: 420 - (BILL_H * BILL_S) / 2 }
const DIMES: Pt[] = Array.from({ length: 10 }, (_, i) => ({ x: C.x + (i - 4.5) * 96, y: 440 }))
const LIFTED: Pt = { x: C.x, y: 300 }
const PENNIES: Pt[] = Array.from({ length: 10 }, (_, i) => ({ x: C.x + (i - 4.5) * 96, y: 600 }))
const TO_DIMES = [30.2, 32.2] as const
const PENNY_BEAT = [36.0, 36.2] as const
const TO_PENNIES = [36.2, 38.2] as const

const events: SceneEvent[] = [
  { time: 3.0, kind: 'bead', n: 0 },
  { time: 6.9, kind: 'break', n: 0 },
  { time: 11.6, kind: 'slide', n: 0 },
  { time: 12.4, kind: 'card', n: 1 },
  { time: 14.4, kind: 'equals', n: 0 },
  { time: 17.2, kind: 'slide', n: 1 },
  { time: 20.4, kind: 'bead', n: 1 },
  { time: 22.8, kind: 'place', n: 1 },
  { time: 27.6, kind: 'card', n: 2 },
  { time: 30.3, kind: 'break', n: 1 },
  { time: 32.8, kind: 'card', n: 3 },
  { time: 36.3, kind: 'break', n: 2 },
]

const voice: VoiceLine[] = [
  { time: 0.5, say: 'Episode twenty-five. Tenths.' },
  { time: 4.2, say: 'One unit.' },
  { time: 9.4, say: 'Ten equal parts: ten tenths.' },
  { time: 12.4, say: 'One tenth.' },
  { time: 14.4, say: 'One tenth is also written zero point one.' },
  { time: 20.6, say: 'One unit and three tenths.' },
  { time: 23.0, say: 'One point three. The point marks where the units end.' },
  { time: 27.8, say: 'A dollar is a unit too.' },
  { time: 30.4, say: 'Ten dimes make one dollar.' },
  { time: 32.8, say: 'One dime is one tenth of a dollar.' },
  { time: 36.4, say: 'And ten pennies make one dime.' },
  { time: 39.0, say: 'What part of a dollar is one penny?' },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  // ——— the bead, close up ———
  const appear = outBack(p(t, 3.0, 3.5))
  const size = lerp(22, BIG, smooth(p(t, ...ZOOM)))
  const cuts = smooth(p(t, BREAK[1], BREAK[1] + 0.6))
  const spread = SPREAD * smooth(p(t, 7.4, 8.8))
  const tint = smooth(p(t, 7.6, 9.2))
  const lift = smooth(p(t, 11.6, 12.2)) * (1 - smooth(p(t, 16.4, 17.0)))
  const toBoard = smooth(p(t, ...TO_BOARD))
  const closeUp = 1 - smooth(p(t, 18.4, 19.0))
  const width = size + 9 * spread
  // Shrinking to the board: the slices' row moves over the tenths column.
  const bs = lerp(size, 66, toBoard)
  const bsp = lerp(spread, 4, toBoard)
  const bx = lerp(C.x - width / 2, colMid(4) - (66 + 9 * 4) / 2, toBoard)
  const by = lerp(C.y - size / 2, 340, toBoard)

  // ——— the board ———
  const board = smooth(p(t, 17.0, 17.8)) * (1 - smooth(p(t, 26.6, 27.4)))
  const pieces = smooth(p(t, 18.4, 19.0))
  const leave = smooth(p(t, 19.4, 20.2))
  const unitIn = outBack(p(t, 20.4, 20.9))
  const point = smooth(p(t, 22.8, 23.4))

  // ——— money ———
  const money = smooth(p(t, 27.4, 28.0))
  const dimes = p(t, ...TO_DIMES)
  const liftDime = smooth(p(t, 32.6, 33.4))
  const pennies = p(t, ...TO_PENNIES)
  const dimeAt = (i: number) => (i === 9 ? mix(DIMES[9], LIFTED, liftDime) : DIMES[i])

  return (
    <Stage>
      <TitleCard t={t} number={25} title="Tenths" />
      <g opacity={a}>
        {/* The bead, close up, then its slices. */}
        {t < 19.2 && appear > 0 && beat !== 'break' && (
          <g opacity={closeUp}>
            <SlicedBead
              x={bx}
              y={by}
              size={bs * (t < 3.5 ? appear : 1)}
              spread={bsp}
              cuts={cuts}
              tint={tint}
              lift={(i) => (i === ONE ? 60 * lift : 0)}
              dim={(i) => (i === ONE ? 1 : 1 - 0.55 * lift)}
            />
          </g>
        )}
        <Say t={t} a={4.0} b={6.4} text="One unit." />
        <Say t={t} a={9.2} b={11.6} text="Ten equal parts: ten tenths." />
        <Notation text="1/10" x={C.x} y={760} size={80} o={smooth(p(t, 12.4, 12.9)) * (1 - smooth(p(t, 14.2, 14.6)))} />
        <Notation text="1/10 = 0.1" x={C.x} y={760} size={80} o={smooth(p(t, 14.4, 14.9)) * (1 - smooth(p(t, 16.4, 17.0)))} />
        <Say t={t} a={14.4} b={16.9} text="One tenth is also written 0.1" />

        {/* The decimal board: units, the point, tenths. */}
        {board > 0 && (
          <g opacity={board}>
            <DecimalBoard x={BOARD.x} y={BOARD.y} col={BOARD.col} height={BOARD.height} />
            {Array.from({ length: 10 }, (_, i) => {
              const gone = i >= 3 ? leave : 0
              return <TenthPiece key={i} x={TENTHS_AT(i).x} y={TENTHS_AT(i).y - 60 * gone} s={PS} o={pieces * (1 - gone)} />
            })}
            {unitIn > 0 && <UnitBead x={UNIT_AT.x} y={UNIT_AT.y} s={PS * unitIn} />}
            <circle cx={POINT_X} cy={BOARD.y + BOARD.height - 30} r={10 + 8 * point * (1 - smooth(p(t, 23.6, 24.4)))} fill="none" stroke="#c8643b" strokeWidth={4} opacity={point * (1 - smooth(p(t, 24.2, 24.6)))} />
            <Notation text="1" x={colMid(3)} y={850} size={110} colour={DEC_COLOUR[0]} o={point} />
            <Notation text="." x={POINT_X} y={850} size={110} o={point} />
            <Notation text="3" x={colMid(4)} y={850} size={110} colour={DEC_COLOUR[-1]} o={point} />
          </g>
        )}
        <Say t={t} a={20.4} b={22.6} text="One unit and three tenths." y={150} />
        <Say t={t} a={23.0} b={26.6} text="1.3: the point marks where the units end." y={150} />

        {/* Money: a dollar breaks into dimes; a dime into pennies. */}
        {money > 0 && (
          <g opacity={money}>
            {t < TO_DIMES[0] ? (
              <Bill x={BILL_AT.x} y={BILL_AT.y} s={BILL_S} />
            ) : dimes < 1 ? (
              fuse({
                from: DIMES,
                to: BILL_AT,
                progress: dimes,
                reverse: true,
                piece: (at, glow) => <Coin x={at.x} y={at.y} kind="dime" s={2} glow={glow} />,
                whole: (at, o) => <Bill x={at.x} y={at.y} s={BILL_S} o={o} />,
                slot: (i) => ({ x: (BILL_W * BILL_S) / 2 + (i - 4.5) * 12, y: (BILL_H * BILL_S) / 2 }),
              })
            ) : (
              <>
                {DIMES.map((_, i) => {
                  if (i === 9 && (t >= PENNY_BEAT[1] || beat === 'pennies')) return null
                  const at = dimeAt(i)
                  return <Coin key={i} x={at.x} y={at.y} kind="dime" s={2} o={i === 9 ? 1 : 1 - 0.55 * liftDime} />
                })}
                {t >= TO_PENNIES[0] &&
                  pennies < 1 &&
                  fuse({
                    from: PENNIES,
                    to: LIFTED,
                    progress: pennies,
                    reverse: true,
                    piece: (at, glow) => <Coin x={at.x} y={at.y} kind="penny" s={2} glow={glow} />,
                    whole: (at, o) => <Coin x={at.x} y={at.y} kind="dime" s={2} o={o} />,
                    slot: () => ({ x: 0, y: 0 }),
                  })}
                {pennies >= 1 && PENNIES.map((q, i) => <Coin key={i} x={q.x} y={q.y} kind="penny" s={2} />)}
              </>
            )}
            <Notation text="$1.00" x={C.x} y={620} size={72} colour={SOFT} o={smooth(p(t, 28.0, 28.6)) * (1 - smooth(p(t, 29.8, 30.2)))} />
            <Notation text="1 dime = $0.10 = 1/10 of a dollar" y={900} size={64} o={smooth(p(t, 32.8, 33.4)) * (1 - smooth(p(t, 35.8, 36.2)))} />
            <Notation text="10 pennies = 1 dime" y={900} size={64} o={smooth(p(t, 36.6, 37.2)) * (1 - smooth(p(t, 38.8, 39.2)))} />
          </g>
        )}
        <Say t={t} a={27.6} b={30.0} text="A dollar is a unit too." />
        <Say t={t} a={30.4} b={32.6} text="Ten dimes make one dollar." />
        <Say t={t} a={32.8} b={35.8} text="One dime is one tenth of a dollar." />
        <Say t={t} a={36.4} b={38.8} text="And ten pennies make one dime." />
        <Say t={t} a={39.0} b={DURATION} text="What part of a dollar is one penny?" y={900} />
      </g>
    </Stage>
  )
}

export const ep25: SceneDef = {
  id: 'ep25',
  number: 25,
  title: 'Tenths',
  duration: DURATION,
  events,
  beats: [
    {
      id: 'break',
      time: BREAK[0],
      resume: BREAK[1],
      action: 'tap',
      pieces: [{ x: C.x - BIG / 2, y: C.y - BIG / 2 }],
      slots: [{ x: C.x - BIG / 2, y: C.y - BIG / 2 }],
      piece: 'custom',
      draw: (at, _i, done) => <SlicedBead x={at.x} y={at.y} size={BIG} cuts={done ? 1 : 0} />,
      centre: { x: BIG / 2, y: BIG / 2 },
      reach: BIG * 0.6,
      prompt: 'Break the unit',
      say: 'Break the unit.',
    },
    {
      id: 'pennies',
      time: PENNY_BEAT[0],
      resume: PENNY_BEAT[1],
      action: 'tap',
      pieces: [LIFTED],
      slots: [LIFTED],
      piece: 'custom',
      draw: (at, _i, done) => <Coin x={at.x} y={at.y} kind="dime" s={2} glow={done ? 1 : 0} />,
      reach: 70,
      prompt: 'Break the dime',
      say: 'Break the dime.',
    },
  ],
  voice,
  render: 'svg',
  Scene,
}
