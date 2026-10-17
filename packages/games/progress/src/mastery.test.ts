import { describe, expect, it } from 'vitest'
import type { ProgressEvent } from '@renderblocks/kernel'
import { CONCEPTS, quadrant, type FactsConcept } from './concepts'
import { BEFORE, milestones, next, perDay, status, summarise, type FactsSummary } from './mastery'
import { seedEvents } from './seed'

const DAY = 86_400_000
const T0 = new Date(2026, 9, 10, 10).getTime()
const times = CONCEPTS.find((c) => c.id === 'times') as FactsConcept
const plane = CONCEPTS.find((c) => c.id === 'plane')!
const ev = (item: string, ok: boolean | undefined, t: number, app = 'times', concept = '3.OA.C.7'): ProgressEvent => ({ t, app, concept, item, ok })

describe('an item', () => {
  it('is new, tried, getting it, then secure', () => {
    expect(status([])).toBe('new')
    expect(status([{ t: T0, ok: false }])).toBe('tried')
    expect(status([{ t: T0, ok: true }])).toBe('getting')
    // Twice on one day isn't secure; on two days it is.
    expect(status([{ t: T0, ok: true }, { t: T0 + 1000, ok: true }])).toBe('getting')
    expect(status([{ t: T0, ok: true }, { t: T0 + DAY, ok: true }])).toBe('secure')
  })

  it('slips back when the last answer needed another go', () => {
    expect(status([{ t: T0, ok: true }, { t: T0 + DAY, ok: true }, { t: T0 + 2 * DAY, ok: false }])).toBe('getting')
  })
})

describe('a facts concept', () => {
  it('counts every fact, secure per row', () => {
    const events = [ev('7×8', true, T0), ev('7×8', true, T0 + DAY), ev('7×9', true, T0), ev('3×2', false, T0)]
    const s = summarise(times, events) as FactsSummary
    expect(s.total).toBe(144)
    expect(s.counts).toEqual({ secure: 1, getting: 1, tried: 1, new: 141 })
    expect(s.rows[6]).toBe(1)
    expect(s.items.get('7×8')).toBe('secure')
  })

  it('only takes its own app and code', () => {
    const s = summarise(times, [ev('7×8', true, T0, 'calc'), ev('7×8', true, T0 + DAY, 'times', '2.OA.B.2')]) as FactsSummary
    expect(s.counts.new).toBe(144)
  })

  it('reaches a whole table, then a quarter of the concept', () => {
    const events: ProgressEvent[] = []
    for (const a of [1, 2, 3])
      for (let b = 1; b <= 12; b++) {
        events.push(ev(`${a}×${b}`, true, T0), ev(`${a}×${b}`, true, T0 + DAY + a * 1000 + b))
      }
    const m = milestones(events).map((x) => x.text)
    expect(m).toContain('Times tables: the first fact secure')
    expect(m).toContain('Times tables: 1 times table, all 12 secure')
    expect(m).toContain('Times tables: 3 times table, all 12 secure')
    expect(m).toContain('Times tables: a quarter secure (36 of 144)')
    expect(m).not.toContain('Times tables: half secure (72 of 144)')
    expect(next(summarise(times, events))).toEqual({ text: 'half secure', more: 36 })
  })
})

describe('a count concept', () => {
  it('counts points by quadrant, and the first in each', () => {
    expect([quadrant('(3, 4)'), quadrant('(-3, 4)'), quadrant('(-3, -4)'), quadrant('(3, -4)')]).toEqual([0, 1, 2, 3])
    const events = [ev('(1, 2)', true, T0, 'graph', '5.G.A.1'), ev('(-1, 2)', true, T0 + 1, 'graph', '6.NS.C.8'), ev('(-1, -2)', false, T0 + 2, 'graph', '6.NS.C.8')]
    const s = summarise(plane, events)
    expect('count' in s && s.count).toBe(2)
    expect('groups' in s && s.groups).toEqual([1, 1, 0, 0])
    const m = milestones(events).map((x) => x.text)
    expect(m).toEqual(['Coordinate plane: the first one', 'Coordinate plane: first one in II'])
  })
})

describe('the days', () => {
  it('counts answers per day, ignoring stars from before', () => {
    const days = perDay([ev('7×8', true, T0), ev('7×9', false, T0 + 60_000), ev('7×8', true, BEFORE)], T0 + DAY, 3)
    expect(days.map((d) => d.byConcept[2])).toEqual([0, 2, 0])
  })
})

describe('the stars from before', () => {
  it('count each fact of a starred table as right once', () => {
    const store: Record<string, string> = { 'rb:times:progress': JSON.stringify({ version: 2, stars: { '7': true, '-1': true } }) }
    const seeded = seedEvents((k) => store[k] ?? null)
    expect(seeded).toHaveLength(12)
    const s = summarise(times, [...seeded, ev('7×8', true, T0)]) as FactsSummary
    expect(s.counts.getting).toBe(11)
    expect(s.counts.secure).toBe(1)
  })
})
