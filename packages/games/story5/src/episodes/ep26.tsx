/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 26 (Part 6), the last: both ways by tens. The camera starts on a
 * unit bead and pulls back as a ten bar, a hundred square and a thousand
 * cube join it, each ten of the one before. Then it turns the other way: a
 * unit breaks into tenths, and the child taps a tenth (the beat), which
 * breaks into hundredths, crumbs too small to see from far off. Pulled all
 * the way back, the row reads 1000, 100, 10, 1, 0.1, 0.01: every place ten
 * of the next. Everything fades but the unit, which becomes the pebble from
 * Episode 1: one pebble, for one sheep, where the story began.
 *
 * Everything sits in one world drawn to scale (a tenth is a true tenth of
 * the bead's width; a hundredth a true tenth of the tenth), and a camera
 * (a pure function of t) pans and zooms across it.
 */
import { clamp, lerp, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent, VoiceLine } from '../engine/scene'
import { HundredSquare, Pebble, TenBar, ThousandCube } from '../kit/kit'
import { DEC_COLOUR, HUNDREDTH_EDGE, HUNDREDTH_FILL, Label, SlicedBead, TENTH_EDGE, TENTH_FILL } from '../kit/part6'
import { BAR, BEAD, PEBBLE_COLOURS, PLACE_COLOUR } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 48

// ——— the world (kit sizes; everything stands on y = 0) ———
const CUBE: Pt = { x: 0, y: -BAR }
const SQUARE: Pt = { x: 420, y: -BAR }
const TEN: Pt = { x: 700, y: -BAR }
const UNIT: Pt = { x: 780, y: -BEAD }
/** The second unit, which breaks into tenths. */
const UNIT2: Pt = { x: 900, y: -BEAD }
const T_GAP = 0.8
const T_W = BEAD / 10
/** Where the singled-out tenth goes to be broken, and the hundredths' gap. */
const SLAB: Pt = { x: 1020, y: -BEAD }
const H_GAP = 0.8

// ——— the camera: centre and zoom at each key, eased between ———
interface Key {
  t: number
  cx: number
  cy: number
  z: number
}
const ON_UNIT = { cx: UNIT.x + BEAD / 2, cy: -BEAD / 2 }
const WIDE = { cx: 512, cy: -170, z: 1.25 }
const KEYS: Key[] = [
  { t: 0, ...ON_UNIT, z: 8 },
  { t: 5.2, ...ON_UNIT, z: 8 },
  { t: 7.4, cx: 730, cy: -120, z: 2.6 },
  { t: 9.6, cx: 730, cy: -120, z: 2.6 },
  { t: 11.6, cx: 600, cy: -140, z: 1.7 },
  { t: 13.0, cx: 600, cy: -140, z: 1.7 },
  { t: 15.2, cx: 420, cy: -170, z: 1.25 },
  { t: 18.6, cx: 420, cy: -170, z: 1.25 },
  { t: 21.0, cx: 860, cy: -BEAD / 2, z: 7 },
  { t: 23.8, cx: 860, cy: -BEAD / 2, z: 7 },
  { t: 25.4, cx: SLAB.x + T_W / 2, cy: -BEAD / 2, z: 18 },
  { t: 29.6, cx: SLAB.x + T_W / 2, cy: -BEAD / 2, z: 18 },
  { t: 32.0, ...WIDE },
  { t: 38.0, ...WIDE },
  { t: 39.6, ...ON_UNIT, z: 8 },
  { t: 40.4, ...ON_UNIT, z: 8 },
  { t: 42.0, ...ON_UNIT, z: 1 },
  { t: DURATION, ...ON_UNIT, z: 1 },
]

function camera(t: number) {
  const i = Math.max(0, KEYS.findIndex((_, j) => j === KEYS.length - 1 || KEYS[j + 1].t > t))
  const a = KEYS[i]
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)]
  const k = b.t > a.t ? smooth(clamp((t - a.t) / (b.t - a.t))) : 0
  // Zoom eases in log space, so a big zoom feels even all the way.
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) }
}
const screen = (t: number) => {
  const c = camera(t)
  return { z: c.z, at: (w: Pt): Pt => ({ x: 960 + (w.x - c.cx) * c.z, y: 560 + (w.y - c.cy) * c.z }) }
}

const BEAT = [26.0, 26.2] as const
const TENTHS_BREAK = [21.4, 23.0] as const
const SLAB_MOVE = [24.4, 25.4] as const
const CRUMBS = [26.2, 27.8] as const

/** Hundredth k of the broken slab: a crumb as wide as the slab, a tenth of its height. */
const crumbAt = (k: number, spread: number): Pt => {
  const h = BEAD / 10
  const total = BEAD + 9 * spread
  return { x: SLAB.x, y: -BEAD / 2 - total / 2 + k * (h + spread) }
}

const events: SceneEvent[] = [
  { time: 3.2, kind: 'bead', n: 0 },
  { time: 7.4, kind: 'slide', n: 1 },
  { time: 10.2, kind: 'slide', n: 2 },
  { time: 13.6, kind: 'slide', n: 3 },
  { time: 20.8, kind: 'bead', n: 1 },
  { time: 21.5, kind: 'break', n: 0 },
  { time: 24.4, kind: 'slide', n: 0 },
  { time: 26.3, kind: 'break', n: 1 },
  { time: 30.6, kind: 'equals', n: 0 },
  { time: 41.4, kind: 'pebble', n: 0 },
]

const voice: VoiceLine[] = [
  { time: 0.5, say: 'Episode twenty-six. Both ways by tens.' },
  { time: 3.4, say: 'One unit.' },
  { time: 7.6, say: 'Ten units make a ten.' },
  { time: 10.2, say: 'Ten tens make a hundred.' },
  { time: 13.6, say: 'Ten hundreds make a thousand.' },
  { time: 15.8, say: 'Each place is ten of the place to its right.' },
  { time: 20.0, say: 'Now the other way.' },
  { time: 21.6, say: 'A unit breaks into ten tenths.' },
  { time: 24.0, say: 'Zero point one.' },
  { time: 26.4, say: 'A tenth breaks into ten hundredths.' },
  { time: 28.8, say: 'Zero point zero one.' },
  { time: 30.6, say: 'One thousand, one hundred, ten, one, one tenth, one hundredth.' },
  { time: 35.6, say: 'The rule runs both ways, by tens.' },
  { time: 42.2, say: 'It all began with one pebble, for one sheep.' },
]

/** The slab as the child sees it at the beat (screen space). */
const AT_BEAT = screen(BEAT[0])
const BEAT_SLAB = AT_BEAT.at(SLAB)

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const { z, at } = screen(t)
  // Everything but the first unit fades before the end; the unit becomes the pebble.
  const rest = 1 - smooth(p(t, 37.6, 38.6))
  const toPebble = smooth(p(t, 41.2, 42.2))

  const tenIn = outBack(p(t, 7.2, 7.8))
  const squareIn = outBack(p(t, 10.0, 10.6))
  const cubeIn = outBack(p(t, 13.4, 14.0))
  const unit2In = smooth(p(t, 20.6, 21.2))
  const tb = p(t, ...TENTHS_BREAK)
  const tSpread = T_GAP * smooth(clamp((tb - 0.3) / 0.7))
  const tTint = smooth(clamp(tb / 0.8))
  const slabMove = smooth(p(t, ...SLAB_MOVE))
  const cr = p(t, ...CRUMBS)
  const cSpread = H_GAP * smooth(clamp((cr - 0.3) / 0.7))
  const cTint = smooth(clamp(cr / 0.8))

  // Labels and their fades.
  const wide1 = smooth(p(t, 15.4, 16.0)) * (1 - smooth(p(t, 18.2, 18.8)))
  const wide2 = smooth(p(t, 30.4, 31.0)) * (1 - smooth(p(t, 37.6, 38.4)))
  const labelY = at({ x: 0, y: 0 }).y + 60
  const centreX = (w: Pt, width: number) => at({ x: w.x + width / 2, y: 0 }).x
  const rowLabels: { s: string; x: number; c: string }[] = [
    { s: '1000', x: centreX(CUBE, BAR * 1.5), c: PLACE_COLOUR[3] },
    { s: '100', x: centreX(SQUARE, BAR), c: PLACE_COLOUR[2] },
    { s: '10', x: centreX(TEN, BEAD), c: PLACE_COLOUR[1] },
    { s: '1', x: centreX(UNIT, BEAD), c: PLACE_COLOUR[0] },
    { s: '0.1', x: centreX(UNIT2, T_W), c: DEC_COLOUR[-1] },
    { s: '0.01', x: centreX(SLAB, T_W), c: DEC_COLOUR[-2] },
  ]

  const slabScreen = at(slabMove > 0 ? { x: lerp(UNIT2.x + 9 * (T_W + T_GAP), SLAB.x, slabMove), y: lerp(-BEAD, SLAB.y, slabMove) } : SLAB)
  const U = at(UNIT)
  return (
    <Stage>
      <TitleCard t={t} number={26} title="Both ways by tens" />
      <g opacity={a}>
        <g opacity={rest}>
          {cubeIn > 0 && <ThousandCube {...at(CUBE)} s={z * Math.min(1, cubeIn)} />}
          {squareIn > 0 && <HundredSquare {...at(SQUARE)} s={z * Math.min(1, squareIn)} />}
          {tenIn > 0 && <TenBar {...at(TEN)} s={z * Math.min(1, tenIn)} />}
          {/* The second unit, breaking into tenths (one tenth leaves to be broken again). */}
          {unit2In > 0 && (
            <SlicedBead
              {...at(UNIT2)}
              size={BEAD * z}
              spread={tSpread * z}
              cuts={smooth(clamp(tb / 0.3))}
              tint={tTint}
              o={unit2In}
              dim={(i) => (i === 9 && t >= SLAB_MOVE[0] ? 0 : i === 0 ? 1 : 1 - smooth(p(t, 29.8, 30.8)))}
            />
          )}
          {/* The singled-out tenth, then its ten hundredths. */}
          {t >= SLAB_MOVE[0] && t < CRUMBS[0] && beat !== 'hundredths' && <rect x={slabScreen.x} y={slabScreen.y} width={T_W * z} height={BEAD * z} rx={Math.min(3, T_W * z * 0.2)} fill={TENTH_FILL} stroke={TENTH_EDGE} strokeWidth={1.5} />}
          {t >= CRUMBS[0] &&
            Array.from({ length: 10 }, (_, k) => {
              const c = at(crumbAt(k, cSpread))
              const fill = cTint > 0.5 ? HUNDREDTH_FILL : TENTH_FILL
              const keep = k === 9 ? 1 : 1 - smooth(p(t, 29.8, 30.8))
              return <rect key={k} opacity={keep} x={c.x} y={c.y} width={T_W * z} height={(BEAD / 10) * z} rx={Math.min(3, T_W * z * 0.2)} fill={fill} stroke={cTint > 0.5 ? HUNDREDTH_EDGE : TENTH_EDGE} strokeWidth={1.5} />
            })}
        </g>
        {/* The first unit, all the way through; at the end it becomes the pebble. */}
        <g opacity={1 - toPebble}>
          <SlicedBead x={U.x} y={U.y} size={BEAD * z * Math.min(1, outBack(p(t, 3.0, 3.5)))} cuts={0} />
        </g>
        {toPebble > 0 && <Pebble x={960} y={560} r={22} colour={PEBBLE_COLOURS[0]} seed={1} o={toPebble} />}

        {/* Labels: the place values under their pieces. */}
        {[wide1, wide2].map((o, w) =>
          o > 0 ? (
            <g key={w} opacity={o}>
              {rowLabels.slice(0, w === 0 ? 4 : 6).map((l, i) => (
                <Label key={i} text={l.s} x={l.x} y={labelY} size={40} colour={l.c} />
              ))}
            </g>
          ) : null,
        )}
        {/* The rule, both ways. */}
        <Label text="← ×10 each place" x={700} y={labelY + 80} size={40} colour="#7a6a58" o={smooth(p(t, 35.6, 36.2)) * wide2} />
        <Label text="each place ÷10 →" x={1300} y={labelY + 80} size={40} colour="#7a6a58" o={smooth(p(t, 35.6, 36.2)) * wide2} />
        <Label text="0.1" x={at({ x: UNIT2.x + (BEAD + 9 * T_GAP) / 2, y: 0 }).x} y={at({ x: 0, y: 0 }).y + 70} size={64} colour={DEC_COLOUR[-1]} o={smooth(p(t, 24.0, 24.4)) * (1 - smooth(p(t, 24.8, 25.2)))} />
        <Label text="0.01" x={at(SLAB).x + 170} y={560} size={72} colour={DEC_COLOUR[-2]} o={smooth(p(t, 28.8, 29.3)) * (1 - smooth(p(t, 30.0, 30.6)))} />

        <Say t={t} a={3.2} b={5.6} text="One unit." />
        <Say t={t} a={7.6} b={9.8} text="Ten units make a ten." />
        <Say t={t} a={10.2} b={13.2} text="Ten tens make a hundred." />
        <Say t={t} a={13.6} b={15.6} text="Ten hundreds make a thousand." />
        <Say t={t} a={15.8} b={19.6} text="Each place is ten of the place to its right." />
        <Say t={t} a={20.0} b={21.4} text="Now the other way." />
        <Say t={t} a={21.6} b={23.8} text="A unit breaks into ten tenths." />
        <Say t={t} a={26.4} b={28.6} text="A tenth breaks into ten hundredths." />
        <Say t={t} a={35.6} b={38.6} text="The rule runs both ways, by tens." />
        <Say t={t} a={42.2} b={DURATION} text="It all began with one pebble, for one sheep." y={820} />
      </g>
    </Stage>
  )
}

export const ep26: SceneDef = {
  id: 'ep26',
  number: 26,
  title: 'Both ways by tens',
  duration: DURATION,
  events,
  beats: [
    {
      id: 'hundredths',
      time: BEAT[0],
      resume: BEAT[1],
      action: 'tap',
      pieces: [BEAT_SLAB],
      slots: [BEAT_SLAB],
      piece: 'custom',
      draw: (at, _i, done) => (
        <rect x={at.x} y={at.y} width={T_W * AT_BEAT.z} height={BEAD * AT_BEAT.z} rx={3} fill={done ? HUNDREDTH_FILL : TENTH_FILL} stroke={done ? HUNDREDTH_EDGE : TENTH_EDGE} strokeWidth={1.5} />
      ),
      centre: { x: (T_W * AT_BEAT.z) / 2, y: (BEAD * AT_BEAT.z) / 2 },
      reach: 200,
      prompt: 'Break the tenth',
      say: 'Break the tenth.',
    },
  ],
  voice,
  render: 'svg',
  Scene,
}
