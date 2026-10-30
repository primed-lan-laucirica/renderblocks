/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/** Figure Classification: three different shapes, all blue; the blue star goes with them. */
import type { SceneDef, SceneEvent } from '@renderblocks/scene'
import type { Puzzle } from '../world/Thumb'
import type { Cell, Glyph } from '../types'
import { ClassifyScene } from './classify'
import { narrate } from './kit'

const L = narrate([
  'Look at these three shapes.',
  'They are all different shapes.',
  'But they are all blue.',
  'Which one is blue too?',
  'The blue star!',
  'Find what is the same about all three.',
  { say: 'Now you try.', pause: 0.6 },
  'Which one goes with these?',
])
const BLUE = '#3b82f6'
const g = (shape: Glyph['shape'], color: string, n = 1, fill: Glyph['fill'] = 'solid', size = 1): Cell => ({ kind: 'glyphs', glyphs: Array.from({ length: n }, () => ({ shape, color, size: n === 1 ? size : 0.72, rotation: 0, fill })) })
const THREE = [g('circle', BLUE, 1, 'outline', 0.8), g('triangle', BLUE, 2), g('square', BLUE, 3, 'light')]
const CHOICES = [g('triangle', '#ef4444', 2), g('star', BLUE), g('square', '#f59e0b')]
const at = {
  appear: L[0].time + 0.2,
  look: [L[1].time, L[1].end] as [number, number],
  ring: L[2].time + 0.4,
  choices: L[3].time,
  slide: [L[4].time + 0.1, L[4].time + 1.1] as [number, number],
}

function Scene({ t }: { t: number }) {
  return <ClassifyScene t={t} three={THREE} choices={CHOICES} answer={1} label="all blue" labelColour={BLUE} at={at} />
}

const events: SceneEvent[] = [
  ...[0, 1, 2].map((i) => ({ time: at.appear + i * 0.45, kind: 'place' as const, n: i })),
  { time: at.ring, kind: 'notch', n: 0 },
  { time: at.slide[0], kind: 'slide', n: 0 },
  { time: at.slide[1], kind: 'equals', n: 0 },
]

export const figureClassify: SceneDef = { id: 'figureClassify', number: 0, title: 'Figure Classification', duration: L[7].end + 1.2, events, beats: [], voice: L.map(({ time, say }) => ({ time, say })), render: 'svg', Scene }

/** The worked example, for its window on the islands. */
export const example: Puzzle = { layout: 'classify', stimulus: THREE, blankIndex: -1, choices: CHOICES, answer: 1 }
