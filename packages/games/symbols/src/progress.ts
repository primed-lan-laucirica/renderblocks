/** What this child has done in Symbols, kept in the tile's own storage. */
import type { NamespacedStorage } from '@renderblocks/kernel'

export interface Progress {
  /** Ranks watched to the end. */
  watched: number[]
  /** Turns done, as "r01:same". */
  turns: string[]
  /** Bench mastery stars, by stage. */
  stars: number[]
}

const KEY = 'progress'

export function load(storage: NamespacedStorage): Progress {
  try {
    const p = JSON.parse(storage.get(KEY) ?? '{}') as Partial<Progress>
    return { watched: p.watched ?? [], turns: p.turns ?? [], stars: p.stars ?? [] }
  } catch {
    return { watched: [], turns: [], stars: [] }
  }
}

export function save(storage: NamespacedStorage, p: Progress) {
  storage.set(KEY, JSON.stringify(p))
}
