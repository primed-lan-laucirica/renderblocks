import { describe, expect, it } from 'vitest'
import { GROUPS, PIC, PICTURES, RELATIONS, clearMembers, clearNonMembers } from './pictures'

describe('picture library', () => {
  it('has unique ids and emoji', () => {
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length)
    const dupEmoji = PICTURES.map((p) => p.emoji).filter((e, i, a) => a.indexOf(e) !== i)
    expect(dupEmoji).toEqual([])
  })

  it('every relation and unsure id refers to a real picture', () => {
    for (const r of RELATIONS) for (const [a, b] of r.pairs) {
      expect(PIC[a], `${r.id}: ${a}`).toBeTruthy()
      expect(PIC[b], `${r.id}: ${b}`).toBeTruthy()
    }
    for (const g of GROUPS) for (const u of g.unsure ?? []) expect(PIC[u], `${g.id}: ${u}`).toBeTruthy()
  })

  it('every group has enough clear members and non-members to build items', () => {
    for (const g of GROUPS) {
      expect(clearMembers(g.id).length, g.id).toBeGreaterThanOrEqual(4)
      expect(clearNonMembers(g.id).length, g.id).toBeGreaterThanOrEqual(20)
    }
  })

  it('a relation never maps one picture to two answers', () => {
    for (const r of RELATIONS) {
      const firsts = r.pairs.map(([a]) => a)
      expect(new Set(firsts).size, r.id).toBe(firsts.length)
    }
  })
})
