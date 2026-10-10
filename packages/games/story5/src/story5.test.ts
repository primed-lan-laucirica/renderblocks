import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { advanceQueue as drillAdvance } from '../../../drill/src/drillState'
import { rng } from './engine/ease'
import { ALL_SCENES } from './episodes'
import { clip } from './engine/voice'
import { exchange } from './kit/exchange'
import { allLines } from './voice-lines'
import { advanceQueue } from './workshops/queue'

/** A scene's frame at t, as markup. */
const frame = (Scene: (typeof ALL_SCENES)[number]['Scene'], t: number, beat?: string) => renderToStaticMarkup(createElement(Scene, { t, beat }))

describe('scenes are pure functions of t', () => {
  for (const s of ALL_SCENES.filter((x) => x.render === 'svg')) {
    it(`${s.id}: the same frame at the same t, whatever order the frames are drawn in`, () => {
      const times = [0.5, s.duration * 0.27, s.duration * 0.5, s.duration * 0.83, s.duration, ...s.beats.flatMap((b) => [b.time, b.resume])]
      const first = times.map((t) => frame(s.Scene, t))
      // Again, in a shuffled order (seeded), as a scrub or an export would.
      const r = rng(9)
      const order = times.map((_, i) => i).sort(() => r() - 0.5)
      const again: string[] = []
      for (const i of order) again[i] = frame(s.Scene, times[i])
      times.forEach((t, i) => expect(again[i], `${s.id} at ${t}s`).toBe(first[i]))
    })
  }

  it('every scene: cues inside its duration, beats resume after they pause', () => {
    for (const s of ALL_SCENES) {
      for (const e of s.events) expect(e.time).toBeLessThanOrEqual(s.duration)
      for (const b of s.beats) {
        expect(b.resume, `${s.id}:${b.id}`).toBeGreaterThan(b.time)
        expect(b.pieces.length, `${s.id}:${b.id} has no pieces`).toBeGreaterThan(0)
        // Every piece needs somewhere to go: a slot each, or one shared slot (stacking); a tap beat needs none.
        const stacks = b.stack || b.piece === 'quarter'
        if (b.action !== 'tap') expect(stacks ? b.slots.length > 0 : b.slots.length >= b.pieces.length, `${s.id}:${b.id} slots`).toBe(true)
      }
    }
  })

  it('a beat hides its pieces while the child moves their own', () => {
    for (const s of ALL_SCENES.filter((x) => x.beats.length))
      for (const b of s.beats) expect(frame(s.Scene, b.time, b.id)).not.toBe(frame(s.Scene, b.time))
  })
})

describe('the exchange', () => {
  const from = Array.from({ length: 10 }, (_, i) => ({ x: 100 + i * 30, y: 200 + (i % 3) * 20 }))
  it('draws the same picture for the same arguments', () => {
    for (const k of [0, 0.3, 0.65, 0.8, 1]) {
      const a = renderToStaticMarkup(createElement('svg', null, exchange('units→ten', from, { x: 600, y: 100 }, k)))
      const b = renderToStaticMarkup(createElement('svg', null, exchange('units→ten', from, { x: 600, y: 100 }, k)))
      expect(a).toBe(b)
    }
  })
  it('a break is a fuse played backwards', () => {
    const fuse = renderToStaticMarkup(createElement('svg', null, exchange('tens→hundred', from, { x: 600, y: 100 }, 0.25)))
    const brk = renderToStaticMarkup(createElement('svg', null, exchange('tens→hundred', from, { x: 600, y: 100 }, 0.75, true)))
    expect(brk).toBe(fuse)
  })
})

describe('the workshop run rule', () => {
  it("is the drill engine's: a miss comes back three places later", () => {
    const cases: [number[], boolean][] = [
      [[1, 2, 3, 4, 5, 6], true],
      [[1, 2, 3, 4, 5, 6], false],
      [[1, 2], true],
      [[1], true],
      [[1], false],
    ]
    for (const [q, dirty] of cases) expect(advanceQueue(q, dirty)).toEqual(drillAdvance(q, dirty))
  })
})

/** A line's length: its clip's, or (before `pnpm voice` has made it) an estimate at this voice's pace. */
const spoken = (say: string) => clip(say)?.dur ?? 0.32 * say.split(/\s+/).length + 0.2

describe('narration', () => {
  it('every line has a clip (run `pnpm voice` after changing a line)', () => {
    for (const l of allLines()) expect(clip(l), l).toBeDefined()
  })

  for (const s of ALL_SCENES) {
    it(`${s.id}: each line finishes before the next starts (counting may run back to back), and none is cut by a beat`, () => {
      const v = [...s.voice].sort((a, b) => a.time - b.time)
      v.forEach((l, i) => {
        const end = l.time + spoken(l.say)
        const next = v[i + 1]?.time ?? s.duration
        expect(end, `"${l.say}" runs into the next line`).toBeLessThanOrEqual(next)
        for (const b of s.beats) {
          // A line under way when the beat pauses keeps going while he works, so
          // it must be over by the time the scene resumes (or it's said twice).
          expect(l.time > b.time && l.time < b.resume, `"${l.say}" falls inside beat ${b.id}`).toBe(false)
          if (l.time <= b.time) expect(end, `"${l.say}" runs past beat ${b.id}`).toBeLessThanOrEqual(b.resume)
        }
      })
    })
  }
})
