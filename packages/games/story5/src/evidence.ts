/**
 * Evidence for the rest of RenderBlocks (the learner model / Proximal
 * frontier, when it exists): two separate streams in shared storage, so
 * "watched it" is never mistaken for "can do it".
 *
 *   rb:shared:story5.watched   — episodes seen to the end, beats done
 *   rb:shared:story5.workshop  — every workshop challenge result
 *
 * Each record is also announced as a window event, `rb:evidence`.
 */
import type { NamespacedStorage } from '@renderblocks/kernel'

export type Stream = 'watched' | 'workshop'

export interface Evidence {
  at: string
  app: 'story5'
  stream: Stream
  part: number
  /** What it's about: an episode ("ep5", "ep5:gather") or a challenge ("build 1345"). */
  item: string
  /** Workshop results: right first time? */
  correct?: boolean
  /** The challenge's kind, for workshop results. */
  skill?: string
}

const KEEP = 1000

export function record(shared: NamespacedStorage, e: Omit<Evidence, 'at' | 'app'>) {
  const full: Evidence = { at: new Date().toISOString(), app: 'story5', ...e }
  const key = `story5.${e.stream}`
  let list: Evidence[] = []
  try {
    list = JSON.parse(shared.get(key) ?? '[]') as Evidence[]
  } catch {
    list = []
  }
  list.push(full)
  shared.set(key, JSON.stringify(list.slice(-KEEP)))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('rb:evidence', { detail: full }))
}
