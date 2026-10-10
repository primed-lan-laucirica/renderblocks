import type { SceneDef } from '../engine/scene'
import { ep0 } from './ep0'
import { ep13 } from './ep13'
import { ep23 } from './ep23'
import { ep5 } from './ep5'

/** The episodes built so far (Phase 1: Episode 0 and the pilots 5, 13 and 23). */
export const EPISODES: Record<number, SceneDef> = { 0: ep0, 5: ep5, 13: ep13, 23: ep23 }
export const ALL_SCENES: SceneDef[] = [ep0, ep5, ep13, ep23]
