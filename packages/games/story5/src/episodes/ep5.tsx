/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 5 (Part 2, place value): ten loose beads fuse into a ten bar, the
 * first exchange. The beads arrive one at a time; the child gathers the ten
 * together (the beat); they fuse; only then does "10" appear. More loose
 * beads follow, and it closes on the question Episode 6 answers.
 */
import { outBack, p, smooth, type Pt } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'
import { scatter } from '../engine/layout'
import { exchange } from '../kit/exchange'
import { NumeralCard, UnitBead } from '../kit/kit'
import { BEAD, GAP } from '../kit/sizes'
import { Say, Stage, TitleCard } from './common'
import { sceneAlpha } from './timing'

const DURATION = 36
const LOOSE = scatter(760, 560, 10, 5, 210)
/** Where the ten bar forms (its top bead's top-left). */
const BAR_AT: Pt = { x: 1180, y: 300 }
const SLOTS = Array.from({ length: 10 }, (_, i) => ({ x: BAR_AT.x, y: BAR_AT.y + i * (BEAD + GAP) }))
const ARRIVE = (i: number) => 3.4 + i * 0.75
const GATHER = [13.4, 15.8] as const
const FUSE = [15.8, 17.4] as const
const MORE = scatter(1500, 470, 9, 21, 110)
const MORE_AT = (i: number) => 21 + i * 0.7

const events: SceneEvent[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ time: ARRIVE(i), kind: 'bead' as const, n: i })),
  { time: 16.6, kind: 'fuse', n: 0 },
  { time: 17.8, kind: 'card', n: 1 },
  ...Array.from({ length: 9 }, (_, i) => ({ time: MORE_AT(i), kind: 'bead' as const, n: i })),
]

function Scene({ t, beat }: { t: number; beat?: string }) {
  const a = sceneAlpha(t, DURATION)
  // Gathering (0 → 0.6) then fusing (0.6 → 1).
  const progress = t < GATHER[0] ? 0 : t < GATHER[1] ? 0.6 * p(t, ...GATHER) : 0.6 + 0.4 * p(t, ...FUSE)
  return (
    <Stage>
      <TitleCard t={t} number={5} title="Ten" />
      <g opacity={a}>
        {beat === 'gather'
          ? null
          : t < GATHER[0]
          ? LOOSE.map((b, i) => {
              const k = outBack(p(t, ARRIVE(i), ARRIVE(i) + 0.45))
              return k > 0 ? <UnitBead key={i} x={b.x + (BEAD / 2) * (1 - k)} y={b.y + (BEAD / 2) * (1 - k)} s={k} /> : null
            })
          : exchange('units→ten', LOOSE, BAR_AT, progress)}
        <NumeralCard value={10} right={1500} y={330} o={smooth(p(t, 17.6, 18.2))} />
        {MORE.map((b, i) => {
          const k = outBack(p(t, MORE_AT(i), MORE_AT(i) + 0.45))
          return k > 0 ? <UnitBead key={i} x={b.x} y={b.y + 140} s={k} /> : null
        })}
        <Say t={t} a={12.2} b={13.6} text="Ten loose beads." />
        <Say t={t} a={18.4} b={20.8} text="Ten units make one ten." />
        <Say t={t} a={28} b={DURATION} text="And when there are ten tens?" />
      </g>
    </Stage>
  )
}

export const ep5: SceneDef = {
  id: 'ep5',
  number: 5,
  title: 'Ten',
  duration: DURATION,
  events,
  beats: [{ id: 'gather', time: GATHER[0], resume: GATHER[1], pieces: LOOSE, slots: SLOTS, piece: 'bead', prompt: 'Put the ten together', say: 'Put the ten together.' }],
  voice: [
    { time: 0.5, say: 'Episode five. Ten.' },
    { time: 12.0, say: 'Ten loose beads.' },
    { time: 18.4, say: 'Ten units make one ten.' },
    { time: 28, say: 'And when there are ten tens?' },
  ],
  render: 'svg',
  Scene,
}
