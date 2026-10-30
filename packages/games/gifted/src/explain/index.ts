/** Each puzzle type's explainer: a narrated worked example that hands over to his first puzzle. */
import type { SceneDef } from '@renderblocks/scene'
import type { SubtestId } from '../types'
import type { Puzzle } from '../world/Thumb'
import { example as figureExample, figureClassify } from './figureClassify'
import { example as numberExample, numberSeries } from './numberSeries'
import { example as pictureExample, pictureClassify } from './pictureClassify'

export const EXPLAINERS: Partial<Record<SubtestId, SceneDef>> = { figureClassify, pictureClassify, numberSeries }

/** Each explainer's worked example (its window shows it solved). */
export const EXAMPLES: Partial<Record<SubtestId, Puzzle>> = { figureClassify: figureExample, pictureClassify: pictureExample, numberSeries: numberExample }

/** The frame a window shows: the worked example, solved. */
export const posterT = (s: SceneDef) => s.duration - 0.5

/** Every narrated line (for scripts/voice.mjs). */
export const allLines = () => [...new Set(Object.values(EXPLAINERS).flatMap((s) => s!.voice.map((v) => v.say)))]
