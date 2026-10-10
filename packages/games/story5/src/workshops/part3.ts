/** Part 3's workshop: the Stamp Game. */
import { StampGame } from './StampGame'
import { STAMP_LINES } from './stampLines'
import type { WorkshopDef } from './types'

export const WORKSHOP3: WorkshopDef = { View: StampGame, lines: Object.values(STAMP_LINES) }
