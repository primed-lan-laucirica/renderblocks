import { WORKSHOP1 } from './part1'
import { WORKSHOP2 } from './part2'
import { WORKSHOP3 } from './part3'
import { WORKSHOP4 } from './part4'
import { WORKSHOP5 } from './part5'
import { WORKSHOP6 } from './part6'
import type { WorkshopDef } from './types'

/** The workshops built, by part number (each part registers its own in part<n>.ts). */
export const WORKSHOPS: Record<number, WorkshopDef> = Object.fromEntries(
  [WORKSHOP1, WORKSHOP2, WORKSHOP3, WORKSHOP4, WORKSHOP5, WORKSHOP6].flatMap((w, i) => (w ? [[i + 1, w]] : [])),
)
