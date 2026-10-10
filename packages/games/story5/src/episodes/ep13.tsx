/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 13 (Part 3): 38 + 25 with golden beads. The two amounts are
 * built, then pushed together: 13 units, too many for one place. The child
 * gathers ten of them (the beat), they fuse into a ten, and the ten joins
 * the tens: 63. Then the same problem in stamp-game tiles, ten green tiles
 * exchanging for one blue. Closes on 52 − 27, which Episode 14 answers.
 */
import { lerp, mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { Notation, NumeralCard, StampTile, TenBar, UnitBead } from '../kit/kit'
import { BEAD, GAP, TILE } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 47
const STEP = BEAD + GAP + 2

// ——— Part one: golden beads ———
const unitGrid = (x: number, y: number, n: number): Pt[] => Array.from({ length: n }, (_, j) => ({ x: x + (j % 5) * STEP, y: y + Math.floor(j / 5) * STEP }))
// Before: 38 on the left, 25 on the right.
const A_BARS = [0, 1, 2].map((i) => ({ x: 300 + i * 36, y: 300 }))
const A_UNITS = unitGrid(440, 300, 8)
const B_BARS = [0, 1].map((i) => ({ x: 1260 + i * 36, y: 300 }))
const B_UNITS = unitGrid(1360, 300, 5)
// After pushing together: tens in one column, all 13 units in the next.
const TENS = (i: number): Pt => ({ x: 640 + i * 36, y: 330 })
const UNITS = unitGrid(1000, 330, 13)
const BAR_AT: Pt = { x: 1400, y: 330 }
const SLOTS = Array.from({ length: 10 }, (_, i) => ({ x: BAR_AT.x, y: BAR_AT.y + i * (BEAD + GAP) }))
const BUILD_A = (i: number) => 3.0 + i * 0.35
const BUILD_B = (i: number) => 6.6 + i * 0.35
const PUSH = [10.6, 12.6] as const
const GATHER = [14.6, 17.0] as const
const FUSE = [17.0, 18.6] as const
const JOIN = [18.8, 20.2] as const

// ——— Part two: stamp tiles ———
const TSTEP = TILE + 8
const tileGrid = (x: number, y: number, n: number, cols: number): Pt[] => Array.from({ length: n }, (_, j) => ({ x: x + (j % cols) * TSTEP, y: y + Math.floor(j / cols) * TSTEP }))
const TA_TENS = tileGrid(260, 260, 3, 3)
const TA_ONES = tileGrid(260, 360, 8, 4)
const TB_TENS = tileGrid(1260, 260, 2, 2)
const TB_ONES = tileGrid(1260, 360, 5, 4)
const T_TENS = (i: number): Pt => ({ x: 560 + i * TSTEP, y: 300 })
const T_ONES = tileGrid(1000, 300, 13, 5)
const TILE_AT: Pt = { x: 1460, y: 300 }
const TILES_IN = 25.6
const T_PUSH = [30.2, 32.0] as const
const T_EX = [32.4, 35.0] as const
const T_JOIN = [35.2, 36.4] as const

const events: SceneEvent[] = [
  ...[0, 1, 2].map((i) => ({ time: BUILD_A(i), kind: 'slide' as const, n: i })),
  ...A_UNITS.map((_, j) => ({ time: BUILD_A(3) + 0.2 + j * 0.22, kind: 'bead' as const, n: j })),
  ...[0, 1].map((i) => ({ time: BUILD_B(i), kind: 'slide' as const, n: i })),
  ...B_UNITS.map((_, j) => ({ time: BUILD_B(2) + 0.2 + j * 0.22, kind: 'bead' as const, n: j })),
  { time: 9.3, kind: 'card', n: 3 },
  { time: 9.9, kind: 'card', n: 2 },
  { time: 11.6, kind: 'slide', n: 0 },
  { time: 17.8, kind: 'fuse', n: 0 },
  { time: 19.4, kind: 'slide', n: 5 },
  { time: 20.9, kind: 'card', n: 6 },
  { time: 21.7, kind: 'card', n: 3 },
  { time: 22.6, kind: 'equals', n: 0 },
  ...Array.from({ length: 18 }, (_, i) => ({ time: TILES_IN + i * 0.2, kind: 'tile' as const, n: i % 10 })),
  { time: 31, kind: 'slide', n: 0 },
  { time: 34.2, kind: 'fuse', n: 0 },
  { time: 35.8, kind: 'slide', n: 5 },
  { time: 37.6, kind: 'equals', n: 0 },
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const push = smooth(p(t, ...PUSH))
  const beadsOut = 1 - smooth(p(t, 24.2, 25.0))
  const tilesOut = 1 - smooth(p(t, 39.4, 40.2))
  const progress = t < GATHER[0] ? -1 : t < GATHER[1] ? 0.6 * p(t, ...GATHER) : 0.6 + 0.4 * p(t, ...FUSE)
  const join = smooth(p(t, ...JOIN))

  // Golden beads: before the exchange all 13 units are loose; after it, units 10–12 stay.
  const beadUnits = [...A_UNITS.map((u, j) => mix(u, UNITS[j], push)), ...B_UNITS.map((u, j) => mix(u, UNITS[8 + j], push))]
  const beadTens = [...A_BARS.map((b, i) => mix(b, TENS(i), push)), ...B_BARS.map((b, i) => mix(b, TENS(3 + i), push))]

  const tPush = smooth(p(t, ...T_PUSH))
  const tProgress = t < T_EX[0] ? -1 : 0.0 + p(t, ...T_EX)
  const tJoin = smooth(p(t, ...T_JOIN))
  const tileOnes = [...TA_ONES.map((u, j) => mix(u, T_ONES[j], tPush)), ...TB_ONES.map((u, j) => mix(u, T_ONES[8 + j], tPush))]
  const tileTens = [...TA_TENS.map((b, i) => mix(b, T_TENS(i), tPush)), ...TB_TENS.map((b, i) => mix(b, T_TENS(3 + i), tPush))]

  return (
    <Stage>
      <TitleCard t={t} number={13} title="Carrying" />
      <g opacity={a}>
        {/* ——— Golden beads ——— */}
        <g opacity={beadsOut}>
          {beadTens.map((b, i) => {
            const k = outBack(p(t, i < 3 ? BUILD_A(i) : BUILD_B(i - 3), (i < 3 ? BUILD_A(i) : BUILD_B(i - 3)) + 0.4))
            return k > 0 ? <TenBar key={i} x={b.x} y={b.y} o={Math.min(1, k)} /> : null
          })}
          {beadUnits.map((u, j) => {
            const at = j < 8 ? BUILD_A(3) + 0.2 + j * 0.22 : BUILD_B(2) + 0.2 + (j - 8) * 0.22
            const k = outBack(p(t, at, at + 0.35))
            if (k <= 0 || (progress >= 0 && j < 10) || (beat === 'gather' && j < 10)) return null
            // The three left over slide up to the top of the units column once the ten has gone.
            const to = UNITS[j - 10] ?? u
            const at2 = j >= 10 ? mix(u, to, smooth(p(t, 19.0, 20.0))) : u
            return <UnitBead key={j} x={at2.x} y={at2.y} s={k} />
          })}
          {progress >= 0 && join < 1 && beat !== 'gather' && exchange('units→ten', UNITS.slice(0, 10), BAR_AT, progress)}
          {join > 0 && <TenBar x={lerp(BAR_AT.x, TENS(5).x, join)} y={lerp(BAR_AT.y, TENS(5).y, join)} />}
          <Notation text="38" x={420} y={640} size={84} o={smooth(p(t, 9.2, 9.8)) * (1 - push)} />
          <Notation text="+" x={960} y={640} size={84} o={smooth(p(t, 9.8, 10.3)) * (1 - push)} />
          <Notation text="25" x={1340} y={640} size={84} o={smooth(p(t, 9.8, 10.4)) * (1 - push)} />
          <Say t={t} a={12.4} b={14.9} text="13 units. Too many for one place." />
          <NumeralCard value={60} right={1060} y={700} o={smooth(p(t, 20.8, 21.4))} />
          <NumeralCard value={3} right={1060} y={lerp(560, 700, smooth(p(t, 21.6, 22.2)))} o={smooth(p(t, 21.4, 21.8))} />
          <Notation text="38 + 25 = 63" y={900} o={smooth(p(t, 22.6, 23.2))} />
        </g>

        {/* ——— Stamp tiles ——— */}
        <g opacity={tilesOut * smooth(p(t, 25.0, 25.6))}>
          <Say t={t} a={25.2} b={29.6} text="Now with tiles." />
          {tileTens.map((b, i) => {
            const k = outBack(p(t, TILES_IN + i * 0.2, TILES_IN + i * 0.2 + 0.35))
            return k > 0 ? <StampTile key={i} value={10} x={b.x} y={b.y} s={k} /> : null
          })}
          {tileOnes.map((u, j) => {
            const k = outBack(p(t, TILES_IN + 1 + j * 0.2, TILES_IN + 1 + j * 0.2 + 0.35))
            if (k <= 0 || (tProgress >= 0 && j < 10)) return null
            const to = T_ONES[j - 10] ?? u
            return <StampTile key={j} value={1} x={mix(u, to, smooth(p(t, 35.4, 36.4))).x} y={mix(u, to, smooth(p(t, 35.4, 36.4))).y} s={k} />
          })}
          {tProgress >= 0 && tJoin < 1 && exchange('ones→ten tile', T_ONES.slice(0, 10), TILE_AT, tProgress)}
          {tJoin > 0 && <StampTile value={10} x={lerp(TILE_AT.x, T_TENS(5).x, tJoin)} y={lerp(TILE_AT.y, T_TENS(5).y, tJoin)} />}
          <Notation text="38 + 25 = 63" y={900} o={smooth(p(t, 37.6, 38.2))} />
        </g>

        <Say t={t} a={40.3} b={DURATION} text="52 − 27: only 2 units. How do we take away 7?" y={540} />
      </g>
    </Stage>
  )
}

export const ep13: SceneDef = {
  id: 'ep13',
  number: 13,
  title: 'Carrying',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [{ id: 'gather', time: GATHER[0], resume: GATHER[1], pieces: UNITS.slice(0, 10), slots: SLOTS, piece: 'bead', prompt: 'Make a ten', say: 'Make a ten.' }],
  voice: [
    { time: 0.5, say: 'Episode thirteen. Carrying.' },
    { time: 9.4, say: 'Thirty-eight plus twenty-five.' },
    { time: 12.4, say: 'Thirteen units. Too many for one place.' },
    { time: 22.6, say: 'Thirty-eight plus twenty-five equals sixty-three.' },
    { time: 25.4, say: 'Now with tiles.' },
    { time: 37.6, say: 'Thirty-eight plus twenty-five equals sixty-three.' },
    { time: 40.3, say: 'Fifty-two take away twenty-seven. Only two units. How do we take away seven?' },
  ],
  render: 'svg',
  Scene,
}
