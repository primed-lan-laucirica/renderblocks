/** Each puzzle type's explainer: a narrated worked example that hands over to his first puzzle. */
import type { SceneDef } from '@renderblocks/scene'
import type { SubtestId } from '../types'
import type { Puzzle } from '../world/Thumb'
import type { Explained } from './define'
import { numberAnalogy, numberPuzzle, numberSeries } from './numbers'
import { figureClassify, figureMatrix, figureSeries, paperFolding, patternCompletion } from './shapes'
import { auralReasoning, followDirections, oddOneOut, pictureAnalogy, pictureClassify, pictureMemory, pictureSeries } from './words'

const ALL: Record<SubtestId, Explained> = {
  figureClassify,
  figureSeries,
  figureMatrix,
  patternCompletion,
  paperFolding,
  pictureClassify,
  pictureAnalogy,
  pictureSeries,
  oddOneOut,
  pictureMemory,
  auralReasoning,
  followDirections,
  numberSeries,
  numberAnalogy,
  numberPuzzle,
}

export const EXPLAINERS: Partial<Record<SubtestId, SceneDef>> = Object.fromEntries(Object.entries(ALL).map(([k, v]) => [k, v.scene]))

/** Each explainer's worked example (its window shows it solved). */
export const EXAMPLES: Partial<Record<SubtestId, Puzzle>> = Object.fromEntries(Object.entries(ALL).map(([k, v]) => [k, v.example]))

/** The frame a window shows: the worked example, solved. */
export const posterT = (s: SceneDef) => s.duration - 0.5

/** Every narrated line (for scripts/voice.mjs). */
export const allLines = () => [...new Set(Object.values(ALL).flatMap((e) => e.scene.voice.map((v) => v.say)))]
