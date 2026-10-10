/** Part 2's workshop: the Bead Bank. */
import { BeadBank } from './BeadBank'
import { LINES } from './lines'
import type { WorkshopDef } from './types'

export const WORKSHOP2: WorkshopDef = { View: BeadBank, lines: Object.values(LINES) }
