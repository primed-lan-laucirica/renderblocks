import { SUBTESTS, type SubtestId } from './types'
import { MAX_LEVEL } from './generators'

/** Consecutive correct answers needed to move up a level. */
const PROMOTE_STREAK = 3
/** Misses at the current level before dropping back. */
const DEMOTE_MISSES = 2
/** A generator unlocks the next one once it reaches this level. */
const UNLOCK_AT = 3

export interface Progress {
  version: 1
  levels: Record<SubtestId, number>
  streak: Record<SubtestId, number>
  misses: Record<SubtestId, number>
  unlocked: SubtestId[]
  seen: number
  correct: number
}

function fresh(): Progress {
  const levels = {} as Record<SubtestId, number>
  const streak = {} as Record<SubtestId, number>
  const misses = {} as Record<SubtestId, number>
  for (const g of SUBTESTS) {
    levels[g] = 1
    streak[g] = 0
    misses[g] = 0
  }
  // Start with only the most accessible task available.
  return { version: 1, levels, streak, misses, unlocked: ['figureClassify'], seen: 0, correct: 0 }
}

export function loadProgress(raw: string | null): Progress {
  if (!raw) return fresh()
  try {
    const p = JSON.parse(raw) as Partial<Progress>
    if (p.version !== 1) return fresh()
    const base = fresh()
    for (const g of SUBTESTS) {
      const lv = p.levels?.[g]
      if (typeof lv === 'number' && lv >= 1 && lv <= MAX_LEVEL) base.levels[g] = Math.floor(lv)
      const st = p.streak?.[g]
      if (typeof st === 'number' && st >= 0) base.streak[g] = Math.floor(st)
      const ms = p.misses?.[g]
      if (typeof ms === 'number' && ms >= 0) base.misses[g] = Math.floor(ms)
    }
    const unlocked = Array.isArray(p.unlocked)
      ? (p.unlocked.filter((g) => (SUBTESTS as readonly string[]).includes(g)) as SubtestId[])
      : []
    base.unlocked = unlocked.length ? [...new Set<SubtestId>(['figureClassify', ...unlocked])] : base.unlocked
    if (typeof p.seen === 'number' && p.seen >= 0) base.seen = Math.floor(p.seen)
    if (typeof p.correct === 'number' && p.correct >= 0) base.correct = Math.floor(p.correct)
    return base
  } catch {
    return fresh()
  }
}

/** Choose the next task type: unlocked, never the same one three times running. */
export function chooseGen(p: Progress, recent: SubtestId[]): SubtestId {
  const pool = p.unlocked.length ? p.unlocked : (['figureClassify'] as SubtestId[])
  const lastTwo = recent.slice(-2)
  const varied =
    lastTwo.length === 2 && lastTwo[0] === lastTwo[1]
      ? pool.filter((g) => g !== lastTwo[0])
      : pool
  const candidates = varied.length ? varied : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export interface Outcome {
  next: Progress
  levelledUp: boolean
  unlockedGen: SubtestId | null
}

/** Apply an answer: ladder the level, and unlock the next task type in turn. */
export function record(p: Progress, gen: SubtestId, correct: boolean): Outcome {
  const next: Progress = {
    ...p,
    levels: { ...p.levels },
    streak: { ...p.streak },
    misses: { ...p.misses },
    unlocked: [...p.unlocked],
    seen: p.seen + 1,
    correct: p.correct + (correct ? 1 : 0),
  }

  let levelledUp = false
  if (correct) {
    next.streak[gen] += 1
    if (next.streak[gen] >= PROMOTE_STREAK && next.levels[gen] < MAX_LEVEL) {
      next.levels[gen] += 1
      next.streak[gen] = 0
      next.misses[gen] = 0
      levelledUp = true
    }
  } else {
    next.streak[gen] = 0
    next.misses[gen] += 1
    if (next.misses[gen] >= DEMOTE_MISSES && next.levels[gen] > 1) {
      next.levels[gen] -= 1
      next.misses[gen] = 0
    }
  }

  // Unlock the next generator in sequence once this one is established.
  let unlockedGen: SubtestId | null = null
  const idx = SUBTESTS.indexOf(gen)
  const following = SUBTESTS[idx + 1]
  if (
    following &&
    next.levels[gen] >= UNLOCK_AT &&
    !next.unlocked.includes(following) &&
    next.unlocked.includes(gen)
  ) {
    next.unlocked.push(following)
    unlockedGen = following
  }

  return { next, levelledUp, unlockedGen }
}
