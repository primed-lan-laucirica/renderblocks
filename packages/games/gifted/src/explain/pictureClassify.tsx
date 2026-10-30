/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/** Picture Classification: a shirt, pants and shoes are all clothes; so is the glove. */
import type { SceneDef, SceneEvent } from '@renderblocks/scene'
import type { Puzzle } from '../world/Thumb'
import type { Cell } from '../types'
import { ClassifyScene } from './classify'
import { narrate } from './kit'

const L = narrate([
  'Look at these three pictures.',
  'A shirt, pants, and shoes.',
  'How are they the same?',
  'They are all clothes.',
  'Which one is clothes too?',
  'Not the bear. Not the fox.',
  'The glove! A glove is clothes too.',
  { say: 'Now you try.', pause: 0.6 },
  'Which one goes with these?',
])
const pic = (emoji: string): Cell => ({ kind: 'pic', emoji })
const THREE = [pic('👕'), pic('👖'), pic('👟')]
const CHOICES = [pic('🐻'), pic('🧤'), pic('🦊')]
const fifth = (L[5].end - L[5].time) / 2
const at = {
  appear: L[0].time + 0.2,
  look: [L[1].time, L[1].end] as [number, number],
  ring: L[3].time,
  choices: L[4].time,
  ruleOut: [L[5].time + 0.1, L[5].time + fifth] as [number, number],
  slide: [L[6].time + 0.3, L[6].time + 1.3] as [number, number],
}

function Scene({ t }: { t: number }) {
  return <ClassifyScene t={t} three={THREE} choices={CHOICES} answer={1} label="clothes" at={at} />
}

const events: SceneEvent[] = [
  ...[0, 1, 2].map((i) => ({ time: at.appear + i * 0.45, kind: 'place' as const, n: i })),
  { time: at.ring, kind: 'notch', n: 0 },
  { time: at.slide[0], kind: 'slide', n: 0 },
  { time: at.slide[1], kind: 'equals', n: 0 },
]

export const pictureClassify: SceneDef = { id: 'pictureClassify', number: 0, title: 'Picture Classification', duration: L[8].end + 1.2, events, beats: [], voice: L.map(({ time, say }) => ({ time, say })), render: 'svg', Scene }

/** The worked example, for its window on the islands. */
export const example: Puzzle = { layout: 'classify', stimulus: THREE, blankIndex: -1, choices: CHOICES, answer: 1 }
