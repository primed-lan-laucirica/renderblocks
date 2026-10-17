/**
 * Evidence from before the progress log: the drills' stars. A starred table
 * was run with every fact right first time, so each of its facts counts as
 * right once, dated BEFORE. One more clean answer on a real day makes it
 * secure.
 *
 * This reads the drills' saved state directly (rb:<app>:progress), read-only.
 */
import type { ProgressEvent } from '@renderblocks/kernel'
import { CONCEPTS } from './concepts'
import { BEFORE } from './mastery'

export function seedEvents(get: (key: string) => string | null = (k) => localStorage.getItem(k)): ProgressEvent[] {
  const out: ProgressEvent[] = []
  for (const c of CONCEPTS) {
    if (c.kind !== 'facts') continue
    for (const app of c.apps) {
      let stars: Record<string, boolean> = {}
      try {
        stars = (JSON.parse(get(`rb:${app}:progress`) ?? '{}') as { stars?: Record<string, boolean> }).stars ?? {}
      } catch {
        continue
      }
      for (const r of c.grid.rows) {
        if (stars[String(r)] !== true) continue
        for (let i = 0; i < c.grid.cols; i++) out.push({ t: BEFORE, app, concept: c.codes[0], item: c.grid.item(r, i), ok: true })
      }
    }
  }
  return out
}
