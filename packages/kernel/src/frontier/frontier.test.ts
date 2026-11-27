import { describe, expect, it } from 'vitest'
import type { ProgressEvent } from '../types'
import {
  SHARED_EXPOSURE_KEY,
  computeFrontier,
  filterNoisyEvents,
  type StorageReader,
} from './mastery'
import {
  AUTO_VQ_COOLDOWN_MS,
  MIN_TILE_DWELL_MS,
  SKIP_BACKOFF_MS,
  evaluateTransitionVqTrigger,
  pickNextVq,
  recordVqCompletion,
  type VqCadenceState,
} from './vq'

const emptyReader: StorageReader = { getKey: () => null }
const DAY = 86_400_000
const T0 = new Date(2026, 10, 1, 10, 0, 0).getTime()

describe('Shared Continuous Learning Frontier Engine', () => {
  it('filters rapid <600ms button-mash events and applies asymmetric VQ mastery updates', () => {
    const events: ProgressEvent[] = [
      // Rapid mash miss (should be ignored completely)
      { t: T0, app: 'vq', concept: 'fractions', item: 'vq:frac:cmp', ok: false, how: 'vq', ms: 180 },
      // Two intentional right VQs raise pMastery & confidence strongly
      { t: T0 + 2000, app: 'vq', concept: 'fractions', item: 'vq:frac:bar12', ok: true, how: 'vq', ms: 1900 },
      { t: T0 + DAY, app: 'vq', concept: 'fractions', item: 'vq:frac:bar34', ok: true, how: 'vq', ms: 2100 },
    ]
    const { droppedNoise } = filterNoisyEvents(events)
    expect(droppedNoise).toBe(1)

    const fPass = computeFrontier(events, {}, emptyReader)
    const fracNode = fPass.byId.fractions
    expect(fracNode.pMastery).toBeGreaterThanOrEqual(0.78)
    expect(fracNode.confidence).toBeGreaterThanOrEqual(0.55)
    expect(fracNode.zone).toBe('mastered')

    // One isolated playful miss after two passes only gently dents pMastery
    const fOneMiss = computeFrontier(
      [...events, { t: T0 + 2 * DAY, app: 'vq', concept: 'fractions', item: 'vq:frac:dec', ok: false, how: 'vq', ms: 1500 }],
      {},
      emptyReader,
    )
    expect(fOneMiss.byId.fractions.pMastery).toBeGreaterThan(0.65)

    // Two consecutive deliberate misses pull pMastery down cleanly
    const fTwoMiss = computeFrontier(
      [
        ...events,
        { t: T0 + 2 * DAY, app: 'vq', concept: 'fractions', item: 'vq:frac:dec', ok: false, how: 'vq', ms: 1500 },
        { t: T0 + 2 * DAY + 5000, app: 'vq', concept: 'fractions', item: 'vq:frac:cmp', ok: false, how: 'vq', ms: 1600 },
      ],
      {},
      emptyReader,
    )
    expect(fTwoMiss.byId.fractions.pMastery).toBeLessThan(fOneMiss.byId.fractions.pMastery)
  })

  it('uses Proximal watch exposure to attract VQ probes without auto-mastering a concept', () => {
    const exposureReader: StorageReader = {
      getKey: (k) =>
        k === SHARED_EXPOSURE_KEY
          ? JSON.stringify({
              'science-space-astronomy': { seconds: 240, count: 2, lastAt: T0 },
            })
          : null,
    }
    const f = computeFrontier([], {}, exposureReader)
    const space = f.byId['science-space-astronomy']
    // Watching never auto-masters
    expect(space.zone).toBe('frontier')
    expect(space.active).toBe(true)
    expect(space.pMastery).toBeLessThan(0.5)

    // Adaptive VQ picker targets the exposed low-confidence concept
    const q = pickNextVq(f, { focusSubject: 'science', now: T0 + 60_000, seed: 42 })
    expect(q).not.toBeNull()
    expect(q!.concept).toBe('science-space-astronomy')
  })

  it('advances per-subject levelBand upward uncapped as mastery progresses', () => {
    const fCold = computeFrontier([], {}, emptyReader)
    expect(fCold.subjectBand.math).toBeLessThanOrEqual(1.0)

    const fAdv = computeFrontier(
      [],
      {
        counting: 'mastered',
        'number-sense': 'mastered',
        addition: 'mastered',
        multiplication: 'mastered',
        fractions: 'mastered',
        'algebra-equations': 'mastered',
      },
      emptyReader,
    )
    expect(fAdv.subjectBand.math).toBeGreaterThanOrEqual(4.0)
    expect(fAdv.frontierIds.has('deep-math')).toBe(true)

    const q = pickNextVq(fAdv, { focusSubject: 'math', now: T0, seed: 7 })
    expect(q).not.toBeNull()
    expect(q!.choices.length).toBeGreaterThanOrEqual(3)
    expect(q!.correctIndex).toBeGreaterThanOrEqual(0)
    expect(q!.correctIndex).toBeLessThan(q!.choices.length)
  })
})

describe('App-wide Validation Quizlet Transition Cadence', () => {
  it('requires >=30s dwell, skips Progress exits, and enforces exit count + cooldown + skip backoff', () => {
    const base: VqCadenceState = { lastShownAt: 0, exitsSinceLast: 0, consecutiveSkips: 0, recentQuestionIds: [] }

    // Too short (<30s): never counts or triggers
    const short = evaluateTransitionVqTrigger(base, 'add', MIN_TILE_DWELL_MS - 1000, T0)
    expect(short.trigger).toBe(false)
    expect(short.nextCadence.exitsSinceLast).toBe(0)

    // Exiting Progress never triggers
    const prog = evaluateTransitionVqTrigger(base, 'progress', 120_000, T0)
    expect(prog.trigger).toBe(false)

    // Exit #1 increments count; Exit #2 triggers!
    const e1 = evaluateTransitionVqTrigger(base, 'add', 45_000, T0)
    expect(e1.trigger).toBe(false)
    expect(e1.nextCadence.exitsSinceLast).toBe(1)

    const e2 = evaluateTransitionVqTrigger(e1.nextCadence, 'words', 60_000, T0 + 60_000)
    expect(e2.trigger).toBe(true)
    expect(e2.nextCadence.exitsSinceLast).toBe(0)

    // Within cooldown (<8 min): won't trigger even after 2 exits
    const soon1 = evaluateTransitionVqTrigger(e2.nextCadence, 'add', 45_000, T0 + 120_000)
    const soon2 = evaluateTransitionVqTrigger(soon1.nextCadence, 'times', 45_000, T0 + 180_000)
    expect(soon2.trigger).toBe(false)

    // After 8 min cooldown: triggers again
    const later = evaluateTransitionVqTrigger(soon2.nextCadence, 'sneeze', 45_000, T0 + 60_000 + AUTO_VQ_COOLDOWN_MS + 1000)
    expect(later.trigger).toBe(true)

    // Two consecutive skips extend cooldown to 20 min
    let skipped = recordVqCompletion(later.nextCadence, 'vq:1', true, T0 + 1_000_000)
    skipped = recordVqCompletion(skipped, 'vq:2', true, T0 + 1_001_000)
    skipped.exitsSinceLast = 2
    const blocked = evaluateTransitionVqTrigger(skipped, 'add', 45_000, T0 + 1_001_000 + AUTO_VQ_COOLDOWN_MS + 1000)
    expect(blocked.trigger).toBe(false)
    const unblocked = evaluateTransitionVqTrigger(skipped, 'add', 45_000, T0 + 1_001_000 + SKIP_BACKOFF_MS + 1000)
    expect(unblocked.trigger).toBe(true)
  })
})
