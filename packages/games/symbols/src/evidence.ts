/**
 * Evidence for the rest of RenderBlocks (the learner model, when it
 * exists): two separate streams in shared storage, so "watched it" is never
 * mistaken for "can do it".
 *
 *   rb:shared:symbols.watched  — explainers seen to the end, turns done
 *   rb:shared:symbols.bench    — every Bench mastery result
 *
 * Each record is also announced as a window event, `rb:evidence`.
 */
import type { NamespacedStorage } from '@renderblocks/kernel'

export type Stream = 'watched' | 'bench'

export interface Evidence {
  at: string
  app: 'symbols'
  stream: Stream
  stage: number
  /** What it's about: an explainer ("r03", "r03:rows") or a Bench item ("write 3 + 2 = 5"). */
  item: string
  /** Bench results: right first time? */
  correct?: boolean
  /** The item's kind, for Bench results ("write" or "make"). */
  skill?: string
}

const KEEP = 1000

export function record(shared: NamespacedStorage, e: Omit<Evidence, 'at' | 'app'>) {
  const full: Evidence = { at: new Date().toISOString(), app: 'symbols', ...e }
  const key = `symbols.${e.stream}`
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
