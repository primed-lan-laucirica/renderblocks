/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 20 (Part 5): parts of a whole. Episode 18's one leftover bead
 * becomes a whole circle; it's cut into halves, then (another whole) thirds,
 * which the child puts back together (the beat), then quarters. Pieces are
 * counted one at a time: the numerator counts, the denominator names the
 * size. Closes on a fifth quarter, which Episode 21 answers on the track.
 */
import { mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { FractionFrame, FractionPiece, Notation, UnitBead } from '../kit/kit'
import { CutCircle, CutLines, FracText } from '../kit/part5'
import { FRAC_R } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 40
const R = FRAC_R
const MID: Pt = { x: 960, y: 470 }
const L: Pt = { x: 420, y: 470 }
const M: Pt = { x: 960, y: 470 }
const RT: Pt = { x: 1500, y: 470 }
const SEP = 12
/** Where the three thirds wait for the child (each drawn from its own circle's centre). */
const THIRDS_OUT: Pt[] = [
  { x: 640, y: 870 },
  { x: 960, y: 800 },
  { x: 1280, y: 870 },
]
const BEAD_IN = 3.2
const GROW = [5.4, 7.0] as const
const TO_LEFT = [8.4, 9.4] as const
const CUT2 = 9.6
const CUT3 = 16.8
const OUT3 = [18.6, 19.4] as const
const FILL = [19.4, 22.0] as const
const LIT3 = [22.4, 23.3, 24.2]
const CUT4 = 26.8

const events: SceneEvent[] = [
  { time: BEAD_IN, kind: 'bead', n: 0 },
  { time: 5.8, kind: 'piece', n: 0 },
  { time: CUT2, kind: 'break', n: 0 },
  { time: 12.4, kind: 'card', n: 1 },
  { time: 13.8, kind: 'card', n: 2 },
  { time: 16.0, kind: 'piece', n: 0 },
  { time: CUT3, kind: 'break', n: 0 },
  ...THIRDS_OUT.map((_, i) => ({ time: FILL[0] + 0.6 * i + 0.8, kind: 'piece' as const, n: i })),
  ...LIT3.map((time, i) => ({ time, kind: 'card' as const, n: i + 1 })),
  { time: 26.0, kind: 'piece', n: 0 },
  { time: CUT4, kind: 'break', n: 0 },
  { time: 30.0, kind: 'card', n: 3 },
  { time: 36.4, kind: 'piece', n: 4 },
]

/** One whole growing in at `at` from t0 (its frame first). */
const grow = (t: number, t0: number) => outBack(p(t, t0, t0 + 0.6))

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  // ——— the bead becomes a whole, which moves left to be cut in half ———
  const g = smooth(p(t, ...GROW))
  const wholeAt = mix(MID, L, smooth(p(t, ...TO_LEFT)))
  const sep2 = SEP * smooth(p(t, CUT2 + 0.4, CUT2 + 1.0))
  const lit2 = (k: number) => (t < 12.4 ? 1 : t < 13.6 ? (k === 0 ? 1 : 0.35) : 1)
  // ——— thirds ———
  const sep3 = SEP * smooth(p(t, CUT3 + 0.4, CUT3 + 0.8))
  const out3 = smooth(p(t, ...OUT3))
  /** Each third: out to the child, then (watched straight through) back into its frame one by one. */
  const thirdAt = (k: number): Pt => {
    const back = smooth(p(t, FILL[0] + 0.6 * k, FILL[0] + 0.6 * k + 1.0))
    const home = { x: M.x + Math.cos(-Math.PI / 2 + ((k + 0.5) / 3) * Math.PI * 2) * sep3, y: M.y + Math.sin(-Math.PI / 2 + ((k + 0.5) / 3) * Math.PI * 2) * sep3 }
    return t < FILL[0] ? mix(home, THIRDS_OUT[k], out3) : mix(THIRDS_OUT[k], M, back)
  }
  const lit3 = (k: number) => (t < LIT3[0] ? 1 : t < LIT3[1] ? (k < 1 ? 1 : 0.35) : t < LIT3[2] ? (k < 2 ? 1 : 0.35) : 1)
  const n3 = t < LIT3[1] ? 1 : t < LIT3[2] ? 2 : 3
  // ——— quarters ———
  const sep4 = SEP * smooth(p(t, CUT4 + 0.4, CUT4 + 0.8))
  const lit4 = (k: number) => (t < 29.8 ? 1 : k < 3 ? 1 : 0.35)
  const hi = t >= 31.2 && t < 33.8 ? 'd' : t >= 34.0 && t < 35.8 ? 'n' : undefined
  return (
    <Stage>
      <TitleCard t={t} number={20} title="Parts of a whole" />
      <g opacity={a}>
        {/* The one bead left over from sharing 13 among 4. */}
        {t < GROW[1] && <UnitBead x={MID.x - 44 * (1 + g)} y={MID.y - 44 * (1 + g)} s={4 * (1 + g)} o={smooth(p(t, BEAD_IN, BEAD_IN + 0.5)) * (1 - g)} />}
        <Say t={t} a={3.6} b={6.6} text="One bead left over." />
        <FractionFrame cx={L.x} cy={L.y} r={R} o={smooth(p(t, 8.6, 9.4))} />
        {t >= GROW[0] && t < CUT2 && <FractionPiece d={1} k={0} cx={wholeAt.x} cy={wholeAt.y} r={R * Math.max(0.05, g)} />}
        <Say t={t} a={7.4} b={9.4} text="One whole." />
        {/* Halves. */}
        {t >= CUT2 && <CutCircle d={2} cx={L.x} cy={L.y} sep={sep2} lit={lit2} />}
        <CutLines d={2} cx={L.x} cy={L.y} grow={smooth(p(t, CUT2 - 0.4, CUT2))} o={1 - smooth(p(t, CUT2, CUT2 + 0.3))} />
        <Say t={t} a={10.6} b={12.2} text="Two equal parts: halves." />
        <Notation text="1/2" x={L.x} y={720} size={72} o={smooth(p(t, 12.4, 12.9)) * (1 - smooth(p(t, 13.6, 13.8)))} />
        <Notation text="2/2" x={L.x} y={720} size={72} o={smooth(p(t, 13.8, 14.3))} />
        <Say t={t} a={13.8} b={15.8} text="Two halves make one whole." />

        {/* Thirds: a new whole, cut; out to the child, and back together. */}
        <FractionFrame cx={M.x} cy={M.y} r={R} o={smooth(p(t, 15.6, 16.2))} />
        {t >= 16.0 && t < CUT3 && <FractionPiece d={1} k={0} cx={M.x} cy={M.y} r={R * Math.max(0.05, grow(t, 16.0))} />}
        <CutLines d={3} cx={M.x} cy={M.y} grow={smooth(p(t, CUT3 - 0.4, CUT3))} o={1 - smooth(p(t, CUT3, CUT3 + 0.3))} />
        {t >= CUT3 &&
          beat !== 'thirds' &&
          [0, 1, 2].map((k) => {
            const at = thirdAt(k)
            return <FractionPiece key={k} d={3} k={k} cx={at.x} cy={at.y} r={R} o={lit3(k)} />
          })}
        <Say t={t} a={17.6} b={19.2} text="Three equal parts: thirds." />
        <Notation text={`${n3}/3`} x={M.x} y={720} size={72} o={smooth(p(t, LIT3[0], LIT3[0] + 0.4))} />

        {/* Quarters. */}
        <FractionFrame cx={RT.x} cy={RT.y} r={R} o={smooth(p(t, 25.6, 26.2))} />
        {t >= 26.0 && t < CUT4 && <FractionPiece d={1} k={0} cx={RT.x} cy={RT.y} r={R * Math.max(0.05, grow(t, 26.0))} />}
        <CutLines d={4} cx={RT.x} cy={RT.y} grow={smooth(p(t, CUT4 - 0.4, CUT4))} o={1 - smooth(p(t, CUT4, CUT4 + 0.3))} />
        {t >= CUT4 && <CutCircle d={4} cx={RT.x} cy={RT.y} sep={sep4} lit={lit4} />}
        <Say t={t} a={27.8} b={29.6} text="Four equal parts: quarters." />
        <FracText n={3} d={4} x={RT.x} y={720} size={72} hi={hi} o={smooth(p(t, 30.0, 30.5))} />
        <Say t={t} a={31.2} b={33.8} text="Four tells the size of each part." />
        <Say t={t} a={34.0} b={35.8} text="Three counts how many." />

        {/* One more quarter: what comes after four quarters? */}
        {t >= 36.4 && <FractionPiece d={4} k={0} cx={1700} cy={660} r={R * Math.max(0.01, grow(t, 36.4))} />}
        <Say t={t} a={36.4} b={DURATION} text="What comes after four quarters?" y={1000} />
      </g>
    </Stage>
  )
}

export const ep20: SceneDef = {
  id: 'ep20',
  number: 20,
  title: 'Parts of a whole',
  duration: DURATION,
  events,
  beats: [
    {
      id: 'thirds',
      time: FILL[0],
      resume: FILL[1],
      pieces: THIRDS_OUT,
      slots: [M, M, M],
      piece: 'custom',
      draw: (at, i) => <FractionPiece d={3} k={i} cx={at.x} cy={at.y} r={R} />,
      drawSlot: (at, k) => (k === 0 ? <circle key={k} cx={at.x} cy={at.y} r={R} fill="none" stroke="#fde68a" strokeWidth={4} strokeDasharray="14 10" /> : null),
      reach: R * 0.75,
      snap: R,
      stack: true,
      prompt: 'Put the thirds back together',
      say: 'Put the thirds back together.',
    },
  ],
  voice: [
    { time: 0.5, say: 'Episode twenty. Parts of a whole.' },
    { time: 3.6, say: 'One bead left over.' },
    { time: 7.4, say: 'One whole.' },
    { time: 10.6, say: 'Two equal parts: halves.' },
    { time: 12.4, say: 'One half.' },
    { time: 13.8, say: 'Two halves make one whole.' },
    { time: 17.6, say: 'Three equal parts: thirds.' },
    { time: 22.4, say: 'One third. Two thirds. Three thirds: one whole.' },
    { time: 27.8, say: 'Four equal parts: quarters.' },
    { time: 30.0, say: 'Three quarters.' },
    { time: 31.2, say: 'Four tells the size of each part.' },
    { time: 34.0, say: 'Three counts how many.' },
    { time: 36.4, say: 'What comes after four quarters?' },
  ],
  render: 'svg',
  Scene,
}
