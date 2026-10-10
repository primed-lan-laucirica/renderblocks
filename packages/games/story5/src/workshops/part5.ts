/** Part 5's workshop: the Fraction Table. */
import { FT_LINES } from './fractionLines'
import { FractionTable } from './FractionTable'
import type { WorkshopDef } from './types'

export const WORKSHOP5: WorkshopDef = { View: FractionTable, lines: Object.values(FT_LINES) }
