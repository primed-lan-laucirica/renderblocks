/**
 * The drill engine's run rule (packages/drill/src/drillState.ts), the same
 * rule, kept here because the drill package doesn't export it: a challenge
 * answered right first time retires; one that was missed comes back three
 * places later, until it's answered right first time. A run with no misses
 * earns a star.
 */
export const REQUEUE_GAP = 3

export function advanceQueue<T>(queue: T[], dirty: boolean): T[] {
  const [head, ...rest] = queue
  if (!dirty) return rest
  const position = Math.min(REQUEUE_GAP, rest.length)
  return [...rest.slice(0, position), head, ...rest.slice(position)]
}
