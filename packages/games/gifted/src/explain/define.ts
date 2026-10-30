/**
 * An explainer from a script: its narration (timed by the clips), what the
 * board does when, and its sounds. The narration's last two lines are always
 * "Now you try." and the puzzle's own instruction.
 */
import { createElement } from 'react'
import type { SceneDef, SceneEvent, VoiceLine } from '@renderblocks/scene'
import type { SubtestId } from '../types'
import type { Puzzle } from '../world/Thumb'
import { Board, type Script } from './board'
import { narrate } from './kit'

type Line = string | { say: string; pause: number }
export interface Explained {
  scene: SceneDef
  /** The worked example (its window on the islands shows it solved). */
  example: Puzzle
}

export function explainer(id: SubtestId, title: string, lines: Line[], build: (L: (VoiceLine & { end: number })[]) => Script & { events?: SceneEvent[] }): Explained {
  const L = narrate(lines)
  const script = build(L)
  // Default sounds: a pop as each piece appears, a slide and a chime as the answer goes in, a tick on each tap.
  const n = script.puzzle.layout === 'field' ? 1 : script.puzzle.stimulus.length || (script.puzzle.layout === 'lone' ? 1 : 0)
  const events: SceneEvent[] = script.events ?? [
    ...Array.from({ length: script.memory ? 0 : n }, (_, i) => ({ time: script.appear + i * (script.step ?? 0.4), kind: 'place' as const, n: i })),
    ...(script.answer ? [{ time: script.answer[0], kind: 'slide' as const, n: 0 }, { time: script.answer[1], kind: 'equals' as const, n: 0 }] : []),
    ...(script.taps ?? []).map((k, i) => ({ time: k.at, kind: 'notch' as const, n: i })),
  ]
  const Scene = ({ t }: { t: number }) => createElement(Board, { t, script })
  return {
    scene: { id, number: 0, title, duration: L[L.length - 1].end + 1.2, events, beats: [], voice: L.map(({ time, say }) => ({ time, say })), render: 'svg', Scene },
    example: script.puzzle,
  }
}
