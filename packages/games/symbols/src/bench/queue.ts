/**
 * The drill engine's run rule (packages/drill/src/drillState.ts), the same
 * rule Story5's workshops keep: an item answered right first time retires;
 * one that was missed comes back three places later, until it is answered
 * right first time. A run with no misses earns the star.
 */
export const REQUEUE_GAP = 3

export function advanceQueue<T>(queue: T[], dirty: boolean): T[] {
  const [head, ...rest] = queue
  if (!dirty) return rest
  const position = Math.min(REQUEUE_GAP, rest.length)
  return [...rest.slice(0, position), head, ...rest.slice(position)]
}

/** After a miss, the Bench takes no input for this long. */
export const LOCKOUT_MS = 1200
