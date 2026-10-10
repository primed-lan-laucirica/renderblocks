/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 6 (Part 2, place value): Episode 5 asked "and when there are ten
 * tens?". Ten ten bars arrive; the child slides them side by side (the
 * first beat); they fuse into a hundred square. Then ten hundred squares
 * arrive; the child stacks them (the second beat); they fuse into a
 * thousand cube. The four kinds stand in a row with their cards, and it
 * closes on a pile of material: how do we write this number? (Episode 7.)
 */
import { lerp, outBack, p, rng, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { HundredSquare, NumeralCard, TenBar, ThousandCube, UnitBead } from '../kit/kit'
import { Material } from '../kit/part2'
import { BAR, BEAD, GAP } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 38.5
const STEP = BEAD + GAP

// ——— Ten tens → one hundred ———
const jitter = rng(6)
const BARS: Pt[] = Array.from({ length: 10 }, (_, i) => ({ x: 360 + i * 64, y: 330 + Math.round((jitter() - 0.5) * 60) }))
const HSQ_AT: Pt = { x: 1240, y: 330 }
const BAR_SLOTS = Array.from({ length: 10 }, (_, i) => ({ x: HSQ_AT.x + i * STEP, y: HSQ_AT.y }))
const BAR_IN = (i: number) => 3.0 + i * 0.4
const GATHER1 = [8.4, 10.8] as const
const FUSE1 = [10.8, 12.4] as const

// ——— Ten hundreds → one thousand, drawn at half size so ten fit ———
const K = 0.5
const G: Pt = { x: 300, y: 300 }
const GRID: Pt[] = Array.from({ length: 10 }, (_, i) => ({ x: (i % 5) * 300, y: Math.floor(i / 5) * 320 }))
const CUBE_AT: Pt = { x: 1700, y: 160 }
const toStage = (q: Pt): Pt => ({ x: G.x + q.x * K, y: G.y + q.y * K })
const SHRINK = [15.0, 16.0] as const
const SQ_IN = (i: number) => 16.2 + (i - 1) * 0.35
const GATHER2 = [21.2, 23.8] as const
const FUSE2 = [23.8, 25.6] as const

// ——— The four kinds in a row (at 0.6, so the cube is in proportion) ———
const L = 0.6
const LX = 571
const LY = 380
const LINE: { x: number; y: number }[] = [
  { x: 0, y: BAR - BEAD },
  { x: 260, y: 0 },
  { x: 520, y: 0 },
  { x: 940, y: 0 },
]
const LINE_W = [BEAD, BEAD, BAR, BAR]
const CARD_AT = (place: number) => LX + L * (LINE[place].x + LINE_W[place] / 2) + (String(10 ** place).length * 64 + 10) / 2
const LINEUP = [28.6, 29.2] as const
const CARD_IN = (place: number) => 29.6 + place * 0.6
const CLOSE = [32.4, 33.0] as const

const events: SceneEvent[] = [
  ...BARS.map((_, i) => ({ time: BAR_IN(i), kind: 'slide' as const, n: i })),
  { time: 11.8, kind: 'fuse', n: 0 },
  { time: 12.6, kind: 'card', n: 2 },
  ...Array.from({ length: 9 }, (_, j) => ({ time: SQ_IN(j + 1), kind: 'slide' as const, n: j + 1 })),
  { time: 24.9, kind: 'fuse', n: 0 },
  { time: 25.8, kind: 'card', n: 3 },
  ...[0, 1, 2, 3].map((place) => ({ time: CARD_IN(place), kind: 'card' as const, n: place })),
]

/** A dashed outline of a thousand cube at scale `s` (front face at x, y). */
function CubeOutline({ x, y, s }: { x: number; y: number; s: number }) {
  const b = BAR * s
  const d = b * 0.5
  return (
    <g fill="none" stroke="#a7771a" strokeWidth={3} strokeDasharray="10 8">
      <rect x={x} y={y} width={b} height={b} />
      <polyline points={`${x},${y} ${x + d},${y - d} ${x + b + d},${y - d} ${x + b + d},${y + b - d} ${x + b},${y + b}`} />
      <line x1={x + b} y1={y} x2={x + b + d} y2={y - d} />
    </g>
  )
}

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const p1 = t < GATHER1[0] ? -1 : t < GATHER1[1] ? 0.6 * p(t, ...GATHER1) : 0.6 + 0.4 * p(t, ...FUSE1)
  const p2 = t < GATHER2[0] ? -1 : t < GATHER2[1] ? 0.6 * p(t, ...GATHER2) : 0.6 + 0.4 * p(t, ...FUSE2)
  const shrink = smooth(p(t, ...SHRINK))
  const partA = 1 - smooth(p(t, 27.9, 28.4))
  const lineup = smooth(p(t, ...LINEUP)) * (1 - smooth(p(t, CLOSE[0] - 0.4, CLOSE[0])))
  const first = toStage(GRID[0])
  return (
    <Stage>
      <TitleCard t={t} number={6} title="Hundreds and thousands" />
      <g opacity={a}>
        <g opacity={partA}>
          {/* Ten tens: they arrive, gather, fuse. */}
          {beat === 'gather' || t >= FUSE1[1]
            ? null
            : p1 < 0
              ? BARS.map((b, i) => {
                  const k = outBack(p(t, BAR_IN(i), BAR_IN(i) + 0.45))
                  return k > 0 ? <TenBar key={i} x={b.x} y={b.y - (1 - Math.min(1, k)) * 40} o={Math.min(1, k)} /> : null
                })
              : exchange('tens→hundred', BARS, HSQ_AT, p1)}
          <Say t={t} a={7.0} b={8.4} text="Ten tens." />
          {/* The hundred: it stays, then shrinks into the first spot of the grid. */}
          {t >= FUSE1[1] && t < SHRINK[1] && <HundredSquare x={lerp(HSQ_AT.x, first.x, shrink)} y={lerp(HSQ_AT.y, first.y, shrink)} s={lerp(1, K, shrink)} />}
          <NumeralCard value={100} right={1700} y={400} o={smooth(p(t, 12.6, 13.2)) * (1 - smooth(p(t, 14.8, 15.2)))} />
          <Say t={t} a={12.8} b={14.9} text="Ten tens make one hundred." />

          {/* Ten hundreds: they arrive, stack, fuse. */}
          <g transform={`translate(${G.x} ${G.y}) scale(${K})`}>
            {beat === 'stack' || t < SHRINK[1] || t >= FUSE2[1]
              ? null
              : p2 < 0
                ? GRID.map((q, i) => {
                    const k = i === 0 ? 1 : outBack(p(t, SQ_IN(i), SQ_IN(i) + 0.45))
                    return k > 0 ? <HundredSquare key={i} x={q.x} y={q.y} o={Math.min(1, k)} /> : null
                  })
                : exchange('hundreds→thousand', GRID, CUBE_AT, p2)}
            {t >= FUSE2[1] && <ThousandCube x={CUBE_AT.x} y={CUBE_AT.y} />}
          </g>
          <Say t={t} a={19.8} b={21.2} text="Ten hundreds." />
          <NumeralCard value={1000} right={1760} y={440} o={smooth(p(t, 25.8, 26.4))} />
          <Say t={t} a={26.0} b={28.0} text="Ten hundreds make one thousand." />
        </g>

        {/* One, ten, one hundred, one thousand. */}
        {lineup > 0 && (
          <g opacity={lineup}>
            <g transform={`translate(${LX} ${LY}) scale(${L})`}>
              <UnitBead x={LINE[0].x} y={LINE[0].y} />
              <TenBar x={LINE[1].x} y={LINE[1].y} />
              <HundredSquare x={LINE[2].x} y={LINE[2].y} />
              <ThousandCube x={LINE[3].x} y={LINE[3].y} />
            </g>
            {[0, 1, 2, 3].map((place) => (
              <NumeralCard key={place} value={10 ** place} right={CARD_AT(place)} y={640} o={smooth(p(t, CARD_IN(place), CARD_IN(place) + 0.4))} />
            ))}
          </g>
        )}

        {/* And all together: what number is this? */}
        <Material counts={[5, 4, 3, 1]} cx={960} y={420} s={0.5} o={smooth(p(t, ...CLOSE))} />
        <Say t={t} a={33.4} b={DURATION} text="How do we write this number?" y={200} />
      </g>
    </Stage>
  )
}

const stackSlot = toStage(CUBE_AT)

export const ep6: SceneDef = {
  id: 'ep6',
  number: 6,
  title: 'Hundreds and thousands',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [
    {
      id: 'gather',
      time: GATHER1[0],
      resume: GATHER1[1],
      pieces: BARS,
      slots: BAR_SLOTS,
      piece: 'custom',
      // The whole bar is the touch target (a circle would reach its neighbours).
      draw: (at) => (
        <g>
          <rect x={at.x - 20} y={at.y - 10} width={BEAD + 40} height={BAR + 20} fill="transparent" />
          <TenBar x={at.x} y={at.y} />
        </g>
      ),
      drawSlot: (at, k) => <rect key={k} x={at.x} y={at.y} width={BEAD} height={BAR} rx={4} fill="none" stroke="#a7771a" strokeWidth={2} strokeDasharray="6 5" />,
      centre: { x: BEAD / 2, y: BAR / 2 },
      reach: 30,
      snap: 60,
      prompt: 'Put the tens side by side',
      say: 'Put the tens side by side.',
    },
    {
      id: 'stack',
      time: GATHER2[0],
      resume: GATHER2[1],
      pieces: GRID.map(toStage),
      // One spot, shared: each square stacks onto the cube (one slot per piece, all the same).
      slots: GRID.map(() => stackSlot),
      piece: 'custom',
      draw: (at) => <HundredSquare x={at.x} y={at.y} s={K} />,
      drawSlot: (at, k) => <CubeOutline key={k} x={at.x} y={at.y} s={K} />,
      centre: { x: (BAR * K) / 2, y: (BAR * K) / 2 },
      reach: 70,
      snap: 140,
      stack: true,
      prompt: 'Stack the hundreds',
      say: 'Stack the hundreds.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode six. Hundreds and thousands.' },
    { time: 7.0, say: 'Ten tens.' },
    { time: 12.8, say: 'Ten tens make one hundred.' },
    { time: 19.8, say: 'Ten hundreds.' },
    { time: 26.0, say: 'Ten hundreds make one thousand.' },
    { time: 29.6, say: 'One, ten, one hundred, one thousand.' },
    { time: 33.4, say: 'How do we write this number?' },
  ],
  render: 'svg',
  Scene,
}
