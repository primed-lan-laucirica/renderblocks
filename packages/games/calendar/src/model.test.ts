import { describe, expect, it } from 'vitest'
import {
  balance,
  canTick,
  clock12,
  clock24,
  dayOfYear,
  daysInMonth,
  eventsOn,
  exportData,
  importData,
  isLeap,
  isoWeek,
  load,
  nowNext,
  occursOn,
  ordinal,
  ordinalWords,
  partOf,
  progress,
  redeem,
  routinesOn,
  seed,
  tick,
  timeWords,
  type CalEvent,
} from './model'

describe('time and date words', () => {
  it('says the time in words', () => {
    expect(timeWords(15, 30)).toBe('half past three')
    expect(timeWords(3, 15)).toBe('quarter past three')
    expect(timeWords(3, 45)).toBe('quarter to four')
    expect(timeWords(12, 0)).toBe("twelve o'clock")
    expect(timeWords(0, 0)).toBe("twelve o'clock")
    expect(timeWords(7, 20)).toBe('twenty past seven')
    expect(timeWords(7, 40)).toBe('twenty to eight')
    expect(timeWords(11, 55)).toBe('five to twelve')
    expect(timeWords(3, 7)).toBe('seven minutes past three')
    expect(timeWords(3, 1)).toBe('one minute past three')
    expect(timeWords(3, 59)).toBe('one minute to four')
  })

  it('shows both clocks', () => {
    expect(clock12(15, 30)).toBe('3:30 PM')
    expect(clock12(0, 5)).toBe('12:05 AM')
    expect(clock12(12, 0)).toBe('12:00 PM')
    expect(clock24(9, 5)).toBe('09:05')
  })

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 28, 31, 101, 111].map(ordinal)).toEqual(
      ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '28th', '31st', '101st', '111th'],
    )
    expect([1, 2, 3, 5, 8, 9, 12, 20, 21, 28, 30, 271].map(ordinalWords)).toEqual([
      'first', 'second', 'third', 'fifth', 'eighth', 'ninth', 'twelfth', 'twentieth', 'twenty-first', 'twenty-eighth',
      'thirtieth', 'two hundred seventy-first',
    ])
  })

  it('knows the calendar', () => {
    expect(dayOfYear('2026-09-28')).toBe(271)
    expect(dayOfYear('2028-12-31')).toBe(366)
    expect(isoWeek('2026-09-28')).toBe(40)
    expect(isoWeek('2026-01-01')).toBe(1)
    expect(isoWeek('2027-01-01')).toBe(53)
    expect([2024, 2026, 2028, 1900, 2000].map(isLeap)).toEqual([true, false, true, false, true])
    expect(daysInMonth(2028, 1)).toBe(29)
    expect(daysInMonth(2026, 1)).toBe(28)
  })
})

describe('events', () => {
  const ev = (repeat: CalEvent['repeat'], extra: Partial<CalEvent> = {}): CalEvent => ({ id: repeat, title: repeat, date: '2026-09-28', people: [], repeat, ...extra })
  it('repeats', () => {
    expect(occursOn(ev('none'), '2026-09-28')).toBe(true)
    expect(occursOn(ev('none'), '2026-09-29')).toBe(false)
    expect(occursOn(ev('daily'), '2026-12-01')).toBe(true)
    expect(occursOn(ev('daily'), '2026-09-27')).toBe(false) // not before it starts
    expect(occursOn(ev('weekly'), '2026-10-05')).toBe(true)
    expect(occursOn(ev('weekly'), '2026-10-06')).toBe(false)
    expect(occursOn(ev('monthly'), '2026-11-28')).toBe(true)
    expect(occursOn(ev('yearly'), '2027-09-28')).toBe(true)
    expect(occursOn(ev('yearly'), '2027-10-28')).toBe(false)
  })
  it('lists a day all-day first, then by time', () => {
    const list = eventsOn([ev('none', { id: 'b', start: '15:00', title: 'b' }), ev('none', { id: 'a', title: 'a' }), ev('none', { id: 'c', start: '09:00', title: 'c' })], '2026-09-28')
    expect(list.map((e) => e.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('routines, ticks and stars', () => {
  const data = seed()
  const [morning, , anytime] = data.routines
  const render = data.profiles[0].id
  const day = '2026-09-28'

  it('splits the day into parts', () => {
    expect([0, 11 * 60 + 59, 12 * 60, 17 * 60 + 59, 18 * 60, 23 * 60].map(partOf)).toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening'])
    expect(routinesOn(data.routines, day)).toHaveLength(3)
  })

  it('ticks, earns stars, and takes them back when unticked', () => {
    const t = morning.tasks[0]
    const a = tick(data, day, morning, t)
    expect(a.earned).toBe(1)
    expect(balance(a.data, render)).toBe(1)
    expect(progress(a.data, day, morning)).toEqual({ done: 1, total: 4 })
    const b = tick(a.data, day, morning, t)
    expect(b.earned).toBe(-1)
    expect(balance(b.data, render)).toBe(0)
  })

  it('counts a counter task up to its target before it is done', () => {
    const water = anytime.tasks[0] // Drink water, 4
    let d = data
    for (let i = 0; i < 3; i++) d = tick(d, day, anytime, water).data
    expect(balance(d, render)).toBe(0)
    const last = tick(d, day, anytime, water)
    expect(last.earned).toBe(1)
    expect(progress(last.data, day, anytime).done).toBe(1)
  })

  it('keeps in-order routines in order', () => {
    const inOrder = { ...morning, inOrder: true }
    expect(canTick(data, day, inOrder, inOrder.tasks[1])).toBe(false)
    expect(canTick(data, day, inOrder, inOrder.tasks[0])).toBe(true)
  })

  it('spends stars only when there are enough', () => {
    let d = data
    for (const t of morning.tasks) d = tick(d, day, morning, t).data
    const cheap = { id: 'x', label: 'Sticker', emoji: '⭐', cost: 3 }
    const dear = { id: 'y', label: 'Zoo', emoji: '🦁', cost: 50 }
    expect(redeem(d, render, dear, day)).toBeNull()
    const after = redeem(d, render, cheap, day)!
    expect(balance(after, render)).toBe(1)
  })

  it('says what is now, next and later', () => {
    const d = { ...data, events: [{ id: 'e', title: 'Swimming', date: day, start: '10:00', people: [], repeat: 'none' as const }] }
    const at = (h: number, m = 0) => nowNext(d, day, h * 60 + m)
    expect(at(8).now?.title).toBe('Morning')
    expect(at(8).next?.title).toBe('Swimming')
    expect(at(8).later?.title).toBe('Bedtime')
    expect(at(6).now).toBeUndefined()
    expect(at(6).next?.title).toBe('Morning')
    expect(at(10, 30).now?.title).toBe('Swimming') // it has started and hasn't ended
    expect(at(13).now).toBeUndefined() // the morning is over by the afternoon
    expect(at(13).next?.title).toBe('Bedtime')
    expect(at(19, 30).now?.title).toBe('Bedtime')
  })
})

describe('saving, export and import', () => {
  it('round-trips through export and import', () => {
    const d = seed()
    const back = importData(exportData(d, '2026-09-28'))!
    expect(back.routines.map((r) => r.title)).toEqual(d.routines.map((r) => r.title))
    expect(back.profiles).toEqual(d.profiles)
  })
  it('turns away things that are not calendar data', () => {
    expect(importData('hello')).toBeNull()
    expect(importData('{"app":"renderblocks-calendar","data":{"version":9}}')).toBeNull()
    expect(load(null)).toBeNull()
  })
  it('fills in missing settings', () => {
    const d = load(JSON.stringify({ ...seed(), settings: { scale: 4 } }))!
    expect(d.settings.scale).toBe(4)
    expect(d.settings.sleep.from).toBe('19:30')
  })
})
