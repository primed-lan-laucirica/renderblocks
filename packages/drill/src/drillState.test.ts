import { describe, expect, it } from 'vitest'
import { advanceQueue, factOf, freshMixRun, freshRun, loadDrillState, MIX, saveDrillState } from './drillState'

const KEYS = Array.from({ length: 12 }, (_, i) => i + 1)

describe('the mixed run', () => {
  it('deals different facts from across every key', () => {
    const run = freshMixRun(KEYS.length, 12)
    expect(run.key).toBe(MIX)
    expect(run.queue).toHaveLength(12)
    expect(new Set(run.queue).size).toBe(12)
    for (const id of run.queue) {
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThan(144)
    }
    // Over a few runs, facts come from many different tables.
    const tables = new Set(Array.from({ length: 5 }, () => freshMixRun(KEYS.length, 12)).flatMap((r) => r.queue.map((id) => factOf(r, id, KEYS, 12).key)))
    expect(tables.size).toBeGreaterThan(6)
  })
  it('maps a fact id to its key and step', () => {
    const mix = { key: MIX, queue: [], missed: [] }
    expect(factOf(mix, 0, KEYS, 12)).toEqual({ key: 1, step: 0 })
    expect(factOf(mix, 13, KEYS, 12)).toEqual({ key: 2, step: 1 })
    expect(factOf(mix, 143, KEYS, 12)).toEqual({ key: 12, step: 11 })
    expect(factOf(freshRun(7, 12), 4, KEYS, 12)).toEqual({ key: 7, step: 4 })
  })
  it('requeues a missed mixed fact like any other', () => {
    expect(advanceQueue([140, 3, 77, 9, 12], true)).toEqual([3, 77, 9, 140, 12])
  })
  it('saves and loads a mixed run, and keeps its star', () => {
    const run = { key: MIX, queue: [100, 5, 143], missed: [5] }
    const loaded = loadDrillState(saveDrillState(run, { '-1': true, '3': true }), KEYS, 12)
    expect(loaded.run).toEqual(run)
    expect(loaded.stars).toEqual({ '-1': true, '3': true })
  })
  it('still loads a single-table save', () => {
    const loaded = loadDrillState(saveDrillState({ key: 4, queue: [2, 3], missed: [] }, {}), KEYS, 12)
    expect(loaded.run).toEqual({ key: 4, queue: [2, 3], missed: [] })
  })
})
