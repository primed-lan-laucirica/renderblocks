/** Each puzzle type's explainer: a narrated worked example that hands over to his first puzzle. */
import type { SceneDef } from '@renderblocks/scene'
import type { SubtestId } from '../types'
import { figureClassify } from './figureClassify'
import { numberSeries } from './numberSeries'
import { pictureClassify } from './pictureClassify'

export const EXPLAINERS: Partial<Record<SubtestId, SceneDef>> = { figureClassify, pictureClassify, numberSeries }

/** The frame a window shows: the worked example, solved. */
export const posterT = (s: SceneDef) => s.duration - 0.5

/** Every narrated line (for scripts/voice.mjs). */
export const allLines = () => [...new Set(Object.values(EXPLAINERS).flatMap((s) => s!.voice.map((v) => v.say)))]
