/** Part 1's workshop: the Counting Table. */
import { CountingTable } from './CountingTable'
import { COUNTING_LINES } from './countingLines'
import type { WorkshopDef } from './types'

export const WORKSHOP1: WorkshopDef = { View: CountingTable, lines: Object.values(COUNTING_LINES) }
