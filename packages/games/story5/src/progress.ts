/** What this child has done in Story5, kept in the tile's own storage. */
import type { NamespacedStorage } from '@renderblocks/kernel'

export interface Progress {
  /** Episodes watched to the end. */
  watched: string[]
  /** Beats done, as "ep5:gather". */
  beats: string[]
  /** Mastery stars by part number. */
  stars: number[]
}

const KEY = 'progress'

export function load(storage: NamespacedStorage): Progress {
  try {
    const p = JSON.parse(storage.get(KEY) ?? '{}') as Partial<Progress>
    return { watched: p.watched ?? [], beats: p.beats ?? [], stars: p.stars ?? [] }
  } catch {
    return { watched: [], beats: [], stars: [] }
  }
}

export function save(storage: NamespacedStorage, p: Progress) {
  storage.set(KEY, JSON.stringify(p))
}
