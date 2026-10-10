/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 8 (Part 2): Episode 7 asked "what do we call one ten and three
 * units?". A ten and three: thirteen, the 3 card nesting on the 10. Units
 * keep coming (fourteen … nineteen) until there are ten loose units; the
 * child gathers them (the beat) and they fuse: two tens, twenty. Then ten
 * bars arrive one by one as the hundred board fills a row at a time:
 * counting by tens to one hundred. Closes on 23: is there another way to
 * make it? (Episode 9.)
 */
import { lerp, mix, outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent, VoiceLine } from '../engine/scene'
import { exchange } from '../kit/exchange'
import { HundredBoard, NumeralCard, TenBar, UnitBead } from '../kit/kit'
import { Material } from '../kit/part2'
import { BEAD, GAP } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 43.5
const BAR1: Pt = { x: 700, y: 300 }
const BAR2: Pt = { x: 760, y: 300 }
const UNITS: Pt[] = Array.from({ length: 10 }, (_, k) => ({ x: 880, y: 300 + k * (BEAD + 10) }))
const SLOTS = Array.from({ length: 10 }, (_, i) => ({ x: BAR2.x, y: BAR2.y + i * (BEAD + GAP) }))
const CARD_Y = 600
const TENS_RIGHT = BAR1.x + BEAD / 2 + 69
const UNIT_IN = [3.8, 4.2, 4.6]
const NEST = [8.2, 9.0] as const
/** Units 4–9 (the teens) arrive a second apart, then the tenth. */
const TEEN = (k: number) => 11.4 + (k - 4) * 1.0
const TENTH = 17.4
const GATHER = [18.8, 21.2] as const
const FUSE = [21.2, 22.8] as const
// Counting by tens beside the hundred board.
const BOARD: Pt = { x: 1140, y: 230 }
const CELL = 56
const ROW_BAR = (k: number): Pt => ({ x: 320 + k * 44, y: 380 })
const TEN_AT = (k: number) => 25.6 + k * 1.0
const TO_BOARD = [24.6, 25.4] as const
const CLOSE = [38.0, 38.6] as const
const TEEN_WORDS = ['Fourteen.', 'Fifteen.', 'Sixteen.', 'Seventeen.', 'Eighteen.', 'Nineteen.']
const TENS_WORDS = ['Ten.', 'Twenty.', 'Thirty.', 'Forty.', 'Fifty.', 'Sixty.', 'Seventy.', 'Eighty.', 'Ninety.', 'One hundred.']

/** How many loose units are out at t (before the gather). */
const unitsAt = (t: number) => (t >= TENTH ? 10 : t >= TEEN(4) ? 3 + [4, 5, 6, 7, 8, 9].filter((k) => t >= TEEN(k)).length : UNIT_IN.filter((s) => t >= s).length)

const events: SceneEvent[] = [
  { time: 3.0, kind: 'slide', n: 0 },
  ...UNIT_IN.map((time, i) => ({ time, kind: 'bead' as const, n: i })),
  { time: 7.2, kind: 'card', n: 1 },
  { time: 7.6, kind: 'card', n: 0 },
  { time: NEST[1], kind: 'slide', n: 1 },
  ...[4, 5, 6, 7, 8, 9].map((k) => ({ time: TEEN(k), kind: 'bead' as const, n: k - 1 })),
  { time: TENTH, kind: 'bead', n: 9 },
  { time: 22.0, kind: 'fuse', n: 0 },
  { time: 23.0, kind: 'card', n: 2 },
  ...TENS_WORDS.map((_, k) => ({ time: TEN_AT(k), kind: 'place' as const, n: k })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  const n = unitsAt(t)
  const progress = t < GATHER[0] ? -1 : t < GATHER[1] ? 0.6 * p(t, ...GATHER) : 0.6 + 0.4 * p(t, ...FUSE)
  const nest = smooth(p(t, ...NEST))
  const toBoard = smooth(p(t, ...TO_BOARD))
  const close = smooth(p(t, ...CLOSE))
  // The ones card shows the loose units (13 … 19), and goes when there are ten.
  const onesO = smooth(p(t, 7.6, 8.0)) * (1 - smooth(p(t, TENTH - 0.3, TENTH)))
  const onesRight = lerp(UNITS[0].x + BEAD / 2 + 37, TENS_RIGHT, nest)
  const onesY = CARD_Y
  const bar2 = t >= FUSE[1]
  // The two tens move to the start of the row for counting by tens.
  const b1 = mix(BAR1, ROW_BAR(0), toBoard)
  const b2 = mix(BAR2, ROW_BAR(1), toBoard)
  const counting = t >= TO_BOARD[0]
  const filled = TENS_WORDS.filter((_, k) => t >= TEN_AT(k)).length * 10
  return (
    <Stage>
      <TitleCard t={t} number={8} title="Teens and tens" />
      <g opacity={a * (1 - close)}>
        {/* The first ten, and the second once it's made. */}
        <TenBar x={b1.x} y={b1.y} o={smooth(p(t, 3.0, 3.4))} />
        {bar2 && <TenBar x={b2.x} y={b2.y} />}
        {/* Loose units, until they gather into the second ten. */}
        {beat === 'gather' || bar2
          ? null
          : progress >= 0
            ? exchange('units→ten', UNITS, BAR2, progress)
            : UNITS.slice(0, n).map((u, k) => {
                const at = k < 3 ? UNIT_IN[k] : k < 9 ? TEEN(k + 1) : TENTH
                const s = outBack(p(t, at, at + 0.4))
                return <UnitBead key={k} x={u.x + (BEAD / 2) * (1 - s)} y={u.y + (BEAD / 2) * (1 - s)} s={s} />
              })}
        {/* Cards: 10, then the ones card nests on it: 13 … 19. Then 20. */}
        <g opacity={1 - smooth(p(t, 22.8, 23.0))}>
          <NumeralCard value={10} right={TENS_RIGHT} y={CARD_Y} o={smooth(p(t, 7.2, 7.6))} />
          {onesO > 0 && <NumeralCard value={Math.min(9, n)} right={onesRight} y={onesY} o={onesO} />}
        </g>
        <NumeralCard value={20} right={TENS_RIGHT + 30} y={CARD_Y} o={smooth(p(t, 23.0, 23.4)) * (1 - toBoard)} />
        <Say t={t} a={17.6} b={18.8} text="Ten units." y={170} />
        {/* Counting by tens: a bar for each row of the board. */}
        {counting &&
          Array.from({ length: 8 }, (_, j) => {
            const k = j + 2
            const s = outBack(p(t, TEN_AT(k), TEN_AT(k) + 0.4))
            const at = ROW_BAR(k)
            return s > 0 ? <TenBar key={k} x={at.x} y={at.y - (1 - Math.min(1, s)) * 40} o={Math.min(1, s)} /> : null
          })}
        <HundredBoard x={BOARD.x} y={BOARD.y} cell={CELL} filled={filled} o={toBoard} />
        <Say t={t} a={36.0} b={37.9} text="Ten tens: one hundred." y={170} />
      </g>
      <g opacity={a * close}>
        <Material counts={[3, 2, 0, 0]} cx={960} y={380} />
        <Say t={t} a={38.6} b={DURATION} text="Is there another way to make 23?" y={200} />
      </g>
    </Stage>
  )
}

const voice: VoiceLine[] = [
  { time: 0.5, say: 'Episode eight. Teens and tens.' },
  { time: 5.2, say: 'One ten and three units.' },
  { time: 9.2, say: 'Ten and three make thirteen.' },
  ...TEEN_WORDS.map((say, i) => ({ time: TEEN(i + 4), say })),
  { time: 17.6, say: 'Ten units.' },
  { time: 23.2, say: 'Two tens. Twenty.' },
  ...TENS_WORDS.map((say, k) => ({ time: TEN_AT(k), say })),
  { time: 36.0, say: 'Ten tens: one hundred.' },
  { time: 38.6, say: 'Is there another way to make twenty-three?' },
]

export const ep8: SceneDef = {
  id: 'ep8',
  number: 8,
  title: 'Teens and tens',
  duration: DURATION,
  events: events.sort((x, y) => x.time - y.time),
  beats: [{ id: 'gather', time: GATHER[0], resume: GATHER[1], pieces: UNITS, slots: SLOTS, piece: 'bead', prompt: 'Make a ten', say: 'Make a ten.' }],
  voice,
  render: 'svg',
  Scene,
}
