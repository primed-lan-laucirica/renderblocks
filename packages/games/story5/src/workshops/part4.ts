/** Part 4's workshop: the Bead Board. */
import { BeadBoardWorkshop } from './BeadBoardWorkshop'
import { BOARD_LINES } from './boardLogic'
import type { WorkshopDef } from './types'

export const WORKSHOP4: WorkshopDef = { View: BeadBoardWorkshop, lines: Object.values(BOARD_LINES) }
