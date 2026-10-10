import type { SceneDef } from '../engine/scene'
import { ep0 } from './ep0'
import { PART1 } from './part1'
import { PART2 } from './part2'
import { PART3 } from './part3'
import { PART4 } from './part4'
import { PART5 } from './part5'
import { PART6 } from './part6'

/** Every episode built: Episode 0, then each part's (each part lists its own in part<n>.ts). */
export const ALL_SCENES: SceneDef[] = [ep0, ...PART1, ...PART2, ...PART3, ...PART4, ...PART5, ...PART6]
export const EPISODES: Record<number, SceneDef> = Object.fromEntries(ALL_SCENES.map((s) => [s.number, s]))
