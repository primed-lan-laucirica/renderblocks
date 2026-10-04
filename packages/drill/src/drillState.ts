/**
 * Pure run-state logic for the drill engine's miss-aware repetition.
 *
 * A run over a key is a queue of fact indices (0-based). The head is the
 * current problem. A fact answered clean (no misses this encounter) retires;
 * a fact answered dirty re-enters the queue REQUEUE_GAP positions later and
 * keeps returning until answered clean. A run with zero misses earns a star.
 */

export const REQUEUE_GAP = 3

/**
 * The mixed run (the default): random facts from every key. Its queue holds
 * fact ids across all keys (keyIndex × steps + stepIndex) instead of step
 * indices within one key.
 */
export const MIX = -1

export interface DrillRunState {
  key: number
  queue: number[]
  missed: number[]
}

export function freshQueue(steps: number): number[] {
  return Array.from({ length: steps }, (_, i) => i)
}

export function freshRun(key: number, steps: number): DrillRunState {
  return { key, queue: freshQueue(steps), missed: [] }
}

/** A mixed run of `length` different facts drawn at random from every key. */
export function freshMixRun(keyCount: number, steps: number, length = steps, rand = Math.random): DrillRunState {
  const ids = Array.from({ length: keyCount * steps }, (_, i) => i)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return { key: MIX, queue: ids.slice(0, Math.min(length, ids.length)), missed: [] }
}

/** Which key and step a queued fact is: a step index within the key, or (mixed) an id across all keys. */
export function factOf(run: DrillRunState, id: number, keys: number[], steps: number): { key: number; step: number } {
  return run.key === MIX ? { key: keys[Math.floor(id / steps)], step: id % steps } : { key: run.key, step: id }
}

/**
 * Complete the current encounter (a correct answer). Clean retires the head;
 * dirty re-inserts it REQUEUE_GAP positions in (or at the end of a shorter
 * queue — including immediately re-encountering a dirty final fact).
 */
export function advanceQueue(queue: number[], dirty: boolean): number[] {
  const [head, ...rest] = queue
  if (!dirty) return rest
  const position = Math.min(REQUEUE_GAP, rest.length)
  return [...rest.slice(0, position), head, ...rest.slice(position)]
}

export interface DrillPersistedV2 {
  version: 2
  key: number
  queue: number[]
  missed: number[]
  stars: Record<string, boolean>
}

export interface LoadedDrillState {
  run: DrillRunState
  stars: Record<string, boolean>
}

function sanitizeIndices(value: unknown, steps: number): number[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  const result: number[] = []
  for (const item of value) {
    const n = typeof item === 'number' ? Math.floor(item) : NaN
    if (Number.isInteger(n) && n >= 0 && n < steps && !seen.has(n)) {
      seen.add(n)
      result.push(n)
    }
  }
  return result
}

export function loadDrillState(
  raw: string | null,
  keys: number[],
  steps: number,
): LoadedDrillState {
  const fallback: LoadedDrillState = { run: freshRun(keys[0], steps), stars: {} }
  if (!raw) return fallback
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>
    const stars: Record<string, boolean> = {}
    if (saved.stars && typeof saved.stars === 'object') {
      for (const k of [...keys, MIX]) {
        if ((saved.stars as Record<string, unknown>)[String(k)] === true) {
          stars[String(k)] = true
        }
      }
    }

    if (saved.version === 2 && saved.key === MIX) {
      const queue = sanitizeIndices(saved.queue, keys.length * steps)
      if (queue.length === 0) return { run: freshMixRun(keys.length, steps), stars }
      return { run: { key: MIX, queue, missed: sanitizeIndices(saved.missed, keys.length * steps) }, stars }
    }

    if (saved.version === 2) {
      const key = keys.includes(saved.key as number) ? (saved.key as number) : keys[0]
      const queue = sanitizeIndices(saved.queue, steps)
      // An empty/corrupt queue means the run has no current problem — restart
      // the run on the same key rather than inventing a position.
      if (queue.length === 0) return { run: freshRun(key, steps), stars }
      return { run: { key, queue, missed: sanitizeIndices(saved.missed, steps) }, stars }
    }

    // v1 save: {version:1, key|table, step} with sequential 1-based step.
    const savedKey = (saved.key ?? saved.table) as number
    const key = keys.includes(savedKey) ? savedKey : keys[0]
    const step = typeof saved.step === 'number' ? Math.floor(saved.step) : 1
    const startIndex = step >= 1 && step <= steps ? step - 1 : 0
    return {
      run: { key, queue: freshQueue(steps).slice(startIndex), missed: [] },
      stars,
    }
  } catch {
    return fallback
  }
}

export function saveDrillState(
  run: DrillRunState,
  stars: Record<string, boolean>,
): string {
  const persisted: DrillPersistedV2 = {
    version: 2,
    key: run.key,
    queue: run.queue,
    missed: run.missed,
    stars,
  }
  return JSON.stringify(persisted)
}
