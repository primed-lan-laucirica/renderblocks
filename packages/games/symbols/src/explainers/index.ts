/** The explainers, compiled against the voiced clips. */
import type { Clip } from '@renderblocks/scene/voice'
import { compile, type Explainer } from '../engine/compile'
import CLIPS from '../voice.json'
import { SPECS } from './specs'

export const EXPLAINERS: Explainer[] = SPECS.map((s) => compile(s, CLIPS as Record<string, Clip>))
export const explainerOf = (rank: number) => EXPLAINERS.find((e) => e.rank === rank)
