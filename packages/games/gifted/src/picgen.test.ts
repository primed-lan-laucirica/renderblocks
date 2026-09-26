import { describe, expect, it } from 'vitest'
import { generate, MAX_LEVEL } from './generators'
import { DIRECTIONS, buildDirection } from './directions'
import { GROUP, PICTURES, RELATIONS, type Picture } from './pictures'
import { SUBTESTS, sameCell, type Cell, type SubtestId } from './types'

const byEmoji = new Map(PICTURES.map((p) => [p.emoji, p]))
const picOf = (c: Cell): Picture | undefined => (c.kind === 'pic' && !c.count && !c.scale && !c.rotation ? byEmoji.get(c.emoji) : undefined)

/** Curated groups every picture belongs to, ignoring arguable members (as the generator does). */
function common(ps: Picture[]): string[] {
  return ps[0].tags.filter((t) => GROUP[t] && ps.every((p) => p.tags.includes(t) && !GROUP[t].unsure?.includes(p.id)))
}
const LABEL = (label: string) => Object.values(GROUP).find((g) => g.label === label)!

const RUNS = 150

describe('every subtest, every level', () => {
  it('produces a well-formed item with one answer among distinct choices', () => {
    for (const sub of SUBTESTS) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (let i = 0; i < 30; i++) {
          const item = generate(sub, level)
          if (item.touch) {
            expect(item.touch.targets.length, `${sub} L${level}`).toBeGreaterThan(0)
            for (const t of item.touch.targets) expect(t).toBeLessThan(item.stimulus.length)
            continue
          }
          expect(item.choices.length, `${sub} L${level}`).toBeGreaterThanOrEqual(3)
          expect(item.answer, `${sub} L${level}`).toBeGreaterThanOrEqual(0)
          for (let a = 0; a < item.choices.length; a++)
            for (let b = a + 1; b < item.choices.length; b++)
              expect(sameCell(item.choices[a], item.choices[b]), `${sub} L${level}: duplicate choices`).toBe(false)
        }
      }
    }
  })
})

describe('picture subtests are fair', () => {
  const each = (sub: SubtestId, check: (item: ReturnType<typeof generate>, level: number) => void) => {
    for (let level = 1; level <= MAX_LEVEL; level++) for (let i = 0; i < RUNS; i++) check(generate(sub, level), level)
  }

  it('Picture Classification: only the answer has everything the three share', () => {
    each('pictureClassify', (item) => {
      const stim = item.stimulus.map(picOf) as Picture[]
      const shared = common(stim)
      expect(shared.length).toBeGreaterThan(0)
      // The explanation names a group all three really are in.
      const g = LABEL(item.explain.match(/They are all (.+)\./)![1])
      expect(stim.every((p) => p.tags.includes(g.id)), item.explain).toBe(true)
      item.choices.forEach((c, i) => {
        const p = picOf(c)!
        const fits = shared.every((t) => p.tags.includes(t))
        expect(fits, `${stim.map((s) => s.id)} + ${p.id} (answer ${i === item.answer})`).toBe(i === item.answer)
      })
    })
  })

  it('Odd One Out: exactly one picture is the odd one', () => {
    each('oddOneOut', (item) => {
      const all = item.choices.map(picOf) as Picture[]
      const odd = all[item.answer]
      const rest = all.filter((p) => p !== odd)
      const shared = common(rest)
      expect(shared.some((t) => !odd.tags.includes(t)), 'the odd one lacks something the rest share').toBe(true)
      for (const m of rest) {
        const alt = common([...rest.filter((x) => x !== m), odd])
        expect(alt.some((t) => !m.tags.includes(t)), `${m.id} could also be the odd one out`).toBe(false)
      }
      // The explanation must be TRUE: the rest are all in the named group, and the odd one is not.
      const label = item.explain.match(/The others are all (.+) — /)![1]
      const g = LABEL(label)
      expect(rest.every((p) => p.tags.includes(g.id)), `${item.explain}`).toBe(true)
      expect(odd.tags.includes(g.id), `${item.explain}`).toBe(false)
    })
  })

  it('Picture Analogies: no distractor fits the same relationship', () => {
    each('pictureAnalogy', (item) => {
      const c = picOf(item.stimulus[2])
      if (!c) return // count and size analogies are checked by the general test
      const a = picOf(item.stimulus[0])!
      const b = picOf(item.stimulus[1])!
      const rel = RELATIONS.find((r) => r.pairs.some(([x, y]) => x === a.id && y === b.id))!
      expect(rel).toBeTruthy()
      item.choices.forEach((ch, i) => {
        if (i === item.answer) return
        const p = picOf(ch)!
        expect(rel.pairs.some(([x, y]) => x === c.id && y === p.id), `${c.id} ${rel.verb} ${p.id}?`).toBe(false)
      })
    })
  })

  it('Picture Memory: targets are exactly the studied pictures', () => {
    each('pictureMemory', (item) => {
      const study = item.memory!.study
      const targets = item.touch!.targets.map((t) => item.stimulus[t])
      expect(targets.length).toBe(study.length)
      for (const s of study) expect(targets.some((t) => sameCell(t, s))).toBe(true)
      expect(new Set(item.stimulus.map((c) => JSON.stringify(c))).size).toBe(item.stimulus.length)
    })
  })

  it('picture directions hit exactly the right targets', () => {
    for (const spec of DIRECTIONS.filter((d) => d.id.startsWith('p-'))) {
      for (let i = 0; i < RUNS; i++) {
        const built = buildDirection(spec, 9)
        const pics = built.grid.map(picOf)
        expect(new Set(built.targets).size, spec.id).toBe(built.targets.length)
        if (spec.id === 'p-every-fly') {
          const flyers = pics.map((p, k) => (p && p.tags.includes('flies') ? k : -1)).filter((k) => k >= 0)
          expect([...built.targets].sort(), spec.id).toEqual(flyers.sort())
        }
        if (spec.id === 'p-between-fruits') {
          const animals = pics.filter((p) => p?.tags.includes('animal'))
          expect(animals.length, 'only one animal on the board').toBe(1)
        }
        if (spec.id === 'p-second-bird') {
          const birds = pics.map((p, k) => (p?.tags.includes('bird') ? k : -1)).filter((k) => k >= 0)
          expect(birds[1]).toBe(built.targets[0])
        }
      }
    }
  })
})
