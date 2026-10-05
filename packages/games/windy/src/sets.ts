/**
 * LavaBlocks' number sets (integers, odds, evens, primes, Square Club, Step
 * Squad, Cube Club, common logs, the times tables, powers of 2–10) and its
 * range presets, as lineups for Windy.
 */
import { defaultRange, enumerate, MULTIPLE_SETS, POWER_SETS, PRESETS, SETS, spawnNumbers, type NumberRange, type SetId } from '@renderblocks/lava/sets'

export type { NumberRange, SetId }
export { defaultRange, PRESETS }

/** Every set, in LavaBlocks' order: the families, then times tables, then powers. */
export const ALL_SETS = [...SETS, ...MULTIPLE_SETS, ...POWER_SETS]

/** Every member goes up to this many; past it, a spread of them (LavaBlocks' own sampler). */
export const ALL_UP_TO = 200
export const SAMPLE = 100

/** The numbers a set and range add to the lineup: positive only (a character needs at least one block). */
export function lineupFor(set: SetId, range: NumberRange): number[] {
  const lo = Math.max(1, Math.min(range.from, range.to))
  const hi = Math.max(range.from, range.to)
  if (hi < 1) return []
  const all = enumerate(set, lo, hi, ALL_UP_TO)
  return (all ?? spawnNumbers(set, { from: lo, to: hi }, SAMPLE)).filter((n) => n >= 1)
}

/** A range as words-and-numbers: "1–100", "1–1,000,000". */
export const rangeLabel = (r: NumberRange) => `${Math.max(1, r.from).toLocaleString('en-US')}–${r.to.toLocaleString('en-US')}`

/** The presets offered (positive starts; LavaBlocks' negative ones start at 1 here), without repeats. */
export const RANGES: NumberRange[] = PRESETS.map((p) => ({ from: Math.max(1, p.from), to: p.to })).filter((p, i, a) => a.findIndex((q) => q.from === p.from && q.to === p.to) === i)
