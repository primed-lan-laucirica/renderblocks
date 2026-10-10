/** Part 6's workshop: the Decimal Board. */
import { DecimalBoard } from './DecimalBoard'
import { DECIMAL_LINES } from './decimalLines'
import type { WorkshopDef } from './types'

export const WORKSHOP6: WorkshopDef = { View: DecimalBoard, lines: Object.values(DECIMAL_LINES) }
