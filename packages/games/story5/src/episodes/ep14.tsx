/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 14 (Part 3, taking away): 52 − 27, which Episode 13 left open.
 * Five tens and two units: not enough units to take seven. The child taps
 * a ten bar (the beat) and it breaks into ten units, the exchange run
 * backwards. Now there are twelve: take seven, take two tens, and 25 is
 * left. Then the same in stamp-game tiles. Closes on four groups of three,
 * which Episode 15 answers.
 */
import { lerp, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { BeadBar, Notation, NumeralCard, StampTile, TenBar, UnitBead } from '../kit/kit'
import { BAR, BEAD, GAP, TILE } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 48
const STEP = BEAD + GAP + 2

// ——— Golden beads ———
const TENS = (i: number): Pt => ({ x: 640 + i * 36, y: 300 })
const unitGrid = (x: number, y: number, n: number): Pt[] => Array.from({ length: n }, (_, j) => ({ x: x + (j % 5) * STEP, y: y + Math.floor(j / 5) * STEP }))
const UNITS = unitGrid(1000, 300, 12)
const BUILD = (i: number) => 3.0 + i * 0.35
const BREAK = [11.2, 13.6] as const
const SPLIT = [11.2, 13.2] as const
const TAKE_U = [16.6, 18.2] as const
const TAKE_T = [18.6, 20.2] as const
const TIDY = [20.6, 21.4] as const

// ——— Stamp tiles ———
const TSTEP = TILE + 8
const tileGrid = (x: number, y: number, n: number, cols: number): Pt[] => Array.from({ length: n }, (_, j) => ({ x: x + (j % cols) * TSTEP, y: y + Math.floor(j / cols) * TSTEP }))
const T_TENS = (i: number): Pt => ({ x: 480 + i * TSTEP, y: 300 })
const T_ONES = tileGrid(1000, 300, 12, 5)
const TILES_IN = 27.4
const T_SPLIT = [30.0, 32.4] as const
const T_TAKE_U = [33.0, 34.4] as const
const T_TAKE_T = [34.6, 36.0] as const
const CLOSE = 39.6

const events: SceneEvent[] = [
  ...[0, 1, 2, 3, 4].map((i) => ({ time: BUILD(i), kind: 'slide' as const, n: i })),
  { time: BUILD(5) + 0.2, kind: 'bead', n: 0 },
  { time: BUILD(5) + 0.42, kind: 'bead', n: 1 },
  { time: 6.0, kind: 'card', n: 5 },
  { time: 12.2, kind: 'break', n: 0 },
  { time: TAKE_U[0], kind: 'slide', n: 7 },
  { time: TAKE_T[0], kind: 'slide', n: 2 },
  { time: 21.6, kind: 'card', n: 2 },
  { time: 22.4, kind: 'card', n: 5 },
  { time: 23.2, kind: 'equals', n: 0 },
  ...Array.from({ length: 7 }, (_, i) => ({ time: TILES_IN + i * 0.2, kind: 'tile' as const, n: i })),
  { time: 31.0, kind: 'break', n: 0 },
  { time: T_TAKE_U[0], kind: 'slide', n: 7 },
  { time: T_TAKE_T[0], kind: 'slide', n: 2 },
  { time: 37.4, kind: 'equals', n: 0 },
  ...[0, 1, 2, 3].map((i) => ({ time: CLOSE + 0.4 + i * 0.5, kind: 'card' as const, n: (i + 1) * 3 })),
]

/** Units after the break: 0–1 were there; 2–11 came from the ten. Which go: 5–11 (seven). What's left slides to the front. */
function unitAt(t: number, j: number): { at: Pt; o: number } | null {
  const take = smooth(p(t, ...TAKE_U))
  if (j >= 5) return take >= 1 ? null : { at: { x: UNITS[j].x + 420 * take, y: UNITS[j].y }, o: 1 - take }
  return { at: UNITS[j], o: 1 }
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const beadsOut = 1 - smooth(p(t, 26.4, 27.2))
  const tilesIn = smooth(p(t, 27.0, 27.6))
  const tilesOut = 1 - smooth(p(t, 39.0, 39.6))
  const split = t < SPLIT[0] ? -1 : p(t, ...SPLIT)
  const takeT = smooth(p(t, ...TAKE_T))
  const tSplit = t < T_SPLIT[0] ? -1 : p(t, ...T_SPLIT)
  const tTakeU = smooth(p(t, ...T_TAKE_U))
  const tTakeT = smooth(p(t, ...T_TAKE_T))
  const close = smooth(p(t, CLOSE, CLOSE + 0.6))

  return (
    <Stage>
      <TitleCard t={t} number={14} title="Borrowing" />
      <g opacity={a}>
        {/* ——— Golden beads ——— */}
        <g opacity={beadsOut}>
          {[0, 1, 2, 3, 4].map((i) => {
            const k = outBack(p(t, BUILD(i), BUILD(i) + 0.4))
            if (k <= 0) return null
            // The last bar is the one that breaks (or that the child taps).
            if (i === 4 && (split >= 0 || beat === 'break')) return null
            // Two tens are taken away.
            if (i >= 2) {
              const m = i === 4 ? 0 : takeT
              return m >= 1 ? null : <TenBar key={i} x={TENS(i).x + 420 * m} y={TENS(i).y - 200 * m} o={Math.min(1, k) * (1 - m)} />
            }
            return <TenBar key={i} x={TENS(i).x} y={TENS(i).y} o={Math.min(1, k)} />
          })}
          {/* The two units there from the start. */}
          {[0, 1].map((j) => {
            const k = outBack(p(t, BUILD(5) + 0.2 + j * 0.22, BUILD(5) + 0.55 + j * 0.22))
            return k > 0 ? <UnitBead key={j} x={UNITS[j].x} y={UNITS[j].y} s={k} /> : null
          })}
          {/* The ten breaking into units (the exchange, backwards), then those units as units. */}
          {split >= 0 && split < 1 && beat !== 'break' && exchange('units→ten', UNITS.slice(2, 12), TENS(4), split, true)}
          {split >= 1 &&
            Array.from({ length: 10 }, (_, k) => {
              const u = unitAt(t, k + 2)
              return u ? <UnitBead key={k} x={u.at.x} y={u.at.y} o={u.o} /> : null
            })}
          <Notation text="52 − 27" y={830} size={84} o={smooth(p(t, 6.0, 6.6)) * (1 - smooth(p(t, 22.8, 23.2)))} />
          <Say t={t} a={8.4} b={11.0} text="Only 2 units. We need 7." />
          <NumeralCard value={20} right={1060} y={600} o={smooth(p(t, 21.6, 22.2)) * smooth(p(t, ...TIDY))} />
          <NumeralCard value={5} right={1060} y={lerp(460, 600, smooth(p(t, 22.2, 22.8)))} o={smooth(p(t, 22.0, 22.4))} />
          <Notation text="52 − 27 = 25" y={830} size={84} o={smooth(p(t, 23.2, 23.8))} />
        </g>

        {/* ——— Stamp tiles ——— */}
        <g opacity={tilesIn * tilesOut}>
          <Say t={t} a={28.2} b={29.8} text="Now with tiles." />
          {[0, 1, 2, 3, 4].map((i) => {
            const k = outBack(p(t, TILES_IN + i * 0.2, TILES_IN + i * 0.2 + 0.35))
            if (k <= 0 || (i === 4 && tSplit >= 0)) return null
            const m = i >= 2 && i < 4 ? tTakeT : 0
            return m >= 1 ? null : <StampTile key={i} value={10} x={T_TENS(i).x + 420 * m} y={T_TENS(i).y - 200 * m} s={k} o={1 - m} />
          })}
          {[0, 1].map((j) => {
            const k = outBack(p(t, TILES_IN + 1 + j * 0.2, TILES_IN + 1.35 + j * 0.2))
            return k > 0 ? <StampTile key={j} value={1} x={T_ONES[j].x} y={T_ONES[j].y} s={k} /> : null
          })}
          {tSplit >= 0 && tSplit < 1 && exchange('ones→ten tile', T_ONES.slice(2, 12), T_TENS(4), tSplit, true)}
          {tSplit >= 1 &&
            T_ONES.slice(2).map((u, k) => {
              const j = k + 2
              if (j < 5) return <StampTile key={j} value={1} x={u.x} y={u.y} />
              return tTakeU >= 1 ? null : <StampTile key={j} value={1} x={u.x + 420 * tTakeU} y={u.y} o={1 - tTakeU} />
            })}
          <Notation text="52 − 27 = 25" y={830} size={84} o={smooth(p(t, 37.4, 38.0))} />
        </g>

        {/* ——— Closing: four groups of three ——— */}
        {close > 0 && (
          <g opacity={close}>
            {[0, 1, 2, 3].map((i) => {
              const k = smooth(p(t, CLOSE + 0.4 + i * 0.5, CLOSE + 0.8 + i * 0.5))
              return <BeadBar key={i} n={3} x={lerp(560, 600, k) + i * 220} y={440} s={2} o={k} />
            })}
            <Say t={t} a={42.0} b={DURATION} text="4 groups of 3: how many beads?" y={640} />
          </g>
        )}
      </g>
    </Stage>
  )
}

const BAR_TAP = <TenBar x={0} y={0} />

export const ep14: SceneDef = {
  id: 'ep14',
  number: 14,
  title: 'Borrowing',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'break',
      time: BREAK[0],
      resume: BREAK[1],
      action: 'tap',
      pieces: [TENS(4)],
      // Unused by a tap beat; one per piece, like every beat.
      slots: [TENS(4)],
      piece: 'custom',
      draw: (at, _i, done) => (
        <g transform={`translate(${at.x} ${at.y})`} opacity={done ? 0.4 : 1}>
          {BAR_TAP}
        </g>
      ),
      centre: { x: BEAD / 2, y: BAR / 2 },
      reach: 70,
      prompt: 'Break a ten',
      say: 'Tap a ten to break it.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode fourteen. Borrowing.' },
    { time: 6.2, say: 'Fifty-two take away twenty-seven.' },
    { time: 8.4, say: 'Only two units. We need seven.' },
    { time: 13.8, say: 'One ten becomes ten units: twelve units.' },
    { time: 16.6, say: 'Take away seven.' },
    { time: 18.6, say: 'Take away two tens.' },
    { time: 23.4, say: 'Fifty-two take away twenty-seven is twenty-five.' },
    { time: 28.2, say: 'Now with tiles.' },
    { time: 30.2, say: 'Break a ten into ten ones.' },
    { time: 37.6, say: 'Twenty-five again.' },
    { time: 42.0, say: 'Four groups of three. How many beads?' },
  ],
  render: 'svg',
  Scene,
}
