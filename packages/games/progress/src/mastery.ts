/**
 * From the progress log to what he knows (pure, so it's tested directly).
 *
 * An item (one fact, one point) is:
 * - secure: right first time on at least two different days, and right the last time;
 * - getting it: right first time at least once;
 * - tried: answered, but never right first time yet;
 * - new: never seen.
 *
 * Milestones are the moments he reached something: a whole times table
 * secure, half of a concept, his 100th point. Once reached they stay reached,
 * even if a fact slips back later.
 */
import type { ProgressEvent } from '@renderblocks/kernel'
import { CONCEPTS, type Concept, type FactsConcept } from './concepts'

export type Status = 'secure' | 'getting' | 'tried' | 'new'
export const STATUSES: Status[] = ['secure', 'getting', 'tried', 'new']

/** Events from before the log existed (from the apps' own stars) are dated 0. */
export const BEFORE = 0

/** The day an event happened, local time; 'before' for evidence from the apps' old saves. */
export function day(t: number): string {
  if (t === BEFORE) return 'before'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function status(ev: { t: number; ok?: boolean }[]): Status {
  if (!ev.length) return 'new'
  const okDays = new Set(ev.filter((e) => e.ok).map((e) => day(e.t)))
  if (okDays.size >= 2 && ev[ev.length - 1].ok) return 'secure'
  if (okDays.size) return 'getting'
  return 'tried'
}

export const belongs = (c: Concept, e: ProgressEvent) => c.apps.includes(e.app) && c.codes.includes(e.concept)

const byTime = (a: ProgressEvent, b: ProgressEvent) => a.t - b.t

export interface FactsSummary {
  concept: FactsConcept
  /** Each item's status. */
  items: Map<string, Status>
  counts: Record<Status, number>
  total: number
  /** Secure facts in each row. */
  rows: number[]
}
export interface CountSummary {
  concept: Concept
  /** Answers right first time. */
  count: number
  /** Answers right first time in each group (quadrant, say). */
  groups: number[]
}
export type Summary = FactsSummary | CountSummary

export function summarise(c: Concept, events: ProgressEvent[]): Summary {
  const mine = events.filter((e) => belongs(c, e)).sort(byTime)
  if (c.kind === 'count') {
    const ok = mine.filter((e) => e.ok)
    const groups = c.group ? c.group.labels.map(() => 0) : []
    if (c.group) for (const e of ok) groups[c.group.of(e.item)]++
    return { concept: c, count: ok.length, groups }
  }
  const ev = new Map<string, ProgressEvent[]>()
  for (const e of mine) ev.set(e.item, [...(ev.get(e.item) ?? []), e])
  const items = new Map<string, Status>()
  const counts: Record<Status, number> = { secure: 0, getting: 0, tried: 0, new: 0 }
  const rows = c.grid.rows.map((r) => {
    let secure = 0
    for (let i = 0; i < c.grid.cols; i++) {
      const item = c.grid.item(r, i)
      const s = status(ev.get(item) ?? [])
      items.set(item, s)
      counts[s]++
      if (s === 'secure') secure++
    }
    return secure
  })
  return { concept: c, items, counts, total: c.grid.rows.length * c.grid.cols, rows }
}

/** Steps on the way to a whole concept, as shares of its facts. */
const SHARES: [number, string][] = [
  [0.25, 'a quarter'],
  [0.5, 'half'],
  [0.75, 'three quarters'],
  [1, 'all'],
]
/** Counts worth celebrating. */
export const COUNTS = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

export interface Milestone {
  t: number
  concept: Concept
  text: string
}

/** Every milestone reached, in the order he reached them. */
export function milestones(events: ProgressEvent[], concepts = CONCEPTS): Milestone[] {
  const out: Milestone[] = []
  for (const c of concepts) {
    const mine = events.filter((e) => belongs(c, e)).sort(byTime)
    if (c.kind === 'count') {
      let n = 0
      const seenGroup = new Set<number>()
      for (const e of mine) {
        if (!e.ok) continue
        n++
        if (COUNTS.includes(n)) out.push({ t: e.t, concept: c, text: n === 1 ? `${c.title}: the first one` : `${c.title}: ${n} ${c.unit}` })
        if (c.group) {
          const g = c.group.of(e.item)
          if (!seenGroup.has(g) && n > 1) out.push({ t: e.t, concept: c, text: `${c.title}: first one in ${c.group.labels[g]}` })
          seenGroup.add(g)
        }
      }
      continue
    }
    const { grid } = c
    const total = grid.rows.length * grid.cols
    const rowOf = new Map<string, number>()
    grid.rows.forEach((r) => {
      for (let i = 0; i < grid.cols; i++) rowOf.set(grid.item(r, i), r)
    })
    const ev = new Map<string, ProgressEvent[]>()
    const secure = new Set<string>()
    const rowsDone = new Set<number>()
    let share = 0
    let first = false
    for (const e of mine) {
      const r = rowOf.get(e.item)
      if (r === undefined) continue
      const list = [...(ev.get(e.item) ?? []), e]
      ev.set(e.item, list)
      if (status(list) === 'secure') secure.add(e.item)
      else secure.delete(e.item)
      if (!first && secure.size) {
        first = true
        out.push({ t: e.t, concept: c, text: `${c.title}: the first fact secure` })
      }
      if (!rowsDone.has(r) && Array.from({ length: grid.cols }, (_, i) => grid.item(r, i)).every((x) => secure.has(x))) {
        rowsDone.add(r)
        out.push({ t: e.t, concept: c, text: `${c.title}: ${c.rowName(r)}, all ${grid.cols} secure` })
      }
      while (share < SHARES.length && secure.size >= Math.ceil(SHARES[share][0] * total)) {
        out.push({ t: e.t, concept: c, text: `${c.title}: ${SHARES[share][1]} secure (${Math.ceil(SHARES[share][0] * total)} of ${total})` })
        share++
      }
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

/** What's next for a concept, and how far off it is. */
export function next(s: Summary): { text: string; more: number } | null {
  if ('items' in s) {
    const secure = s.counts.secure
    for (const [share, words] of SHARES) {
      const need = Math.ceil(share * s.total)
      if (secure < need) return { text: `${words} secure`, more: need - secure }
    }
    return null
  }
  const n = COUNTS.find((k) => k > s.count)
  if (n === undefined) return null
  return { text: n === 1 ? 'the first one' : `${n} ${s.concept.kind === 'count' ? s.concept.unit : ''}`.trim(), more: n - s.count }
}

/** Answers on each of the last `days` days (oldest first), split by concept. */
export function perDay(events: ProgressEvent[], now: number, days = 14, concepts = CONCEPTS): { day: string; date: Date; byConcept: number[] }[] {
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - (days - 1 - i))
    return { day: day(d.getTime()), date: d, byConcept: concepts.map(() => 0) }
  })
  const index = new Map(out.map((o, i) => [o.day, i]))
  for (const e of events) {
    if (e.t === BEFORE || e.ok === undefined) continue
    const i = index.get(day(e.t))
    if (i === undefined) continue
    const c = concepts.findIndex((k) => belongs(k, e))
    if (c >= 0) out[i].byConcept[c]++
  }
  return out
}
