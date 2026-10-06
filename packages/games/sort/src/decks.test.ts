import { describe, expect, it } from 'vitest'
import { DECKS, deal, rightBin } from './decks'

describe('the decks', () => {
  it.each(DECKS.map((d) => [d.id, d] as const))('%s: every card in exactly one bin, every bin has cards, no example is a card', (_, d) => {
    const emojis = d.cards.map((c) => c.card.emoji)
    expect(new Set(emojis).size).toBe(emojis.length)
    d.bins.forEach((_, b) => expect(d.cards.some((c) => c.bin === b)).toBe(true))
    for (const c of d.cards) {
      expect(c.card.emoji.length).toBeGreaterThan(0)
      expect(c.card.name.length).toBeGreaterThan(0)
      expect(c.bin).toBeLessThan(d.bins.length)
    }
    expect(d.bins.some((b) => emojis.includes(b.example))).toBe(false)
    if (d.then) {
      for (const c of d.cards) expect(d.then.bin.get(c.card.emoji)).toBeLessThan(d.then.bins.length)
      d.then.bins.forEach((_, b) => expect([...d.then!.bin.values()].includes(b)).toBe(true))
    }
  })

  it('deals a round spread across the bins, no card twice', () => {
    for (const d of DECKS) {
      const cards = deal(d)
      expect(new Set(cards.map((c) => c.emoji)).size).toBe(cards.length)
      expect(cards.length).toBe(Math.min(d.then ? d.cards.length : 12, d.cards.length))
      if (!d.then) {
        // Every bin gets its share (or all it has).
        const per = d.bins.map((_, b) => cards.filter((c) => rightBin(d, c) === b).length)
        const has = d.bins.map((_, b) => d.cards.filter((c) => c.bin === b).length)
        per.forEach((n, b) => expect(n).toBeGreaterThanOrEqual(Math.min(has[b], Math.floor(12 / d.bins.length))))
      }
    }
  })

  it('a switch deck sorts the same cards a second way', () => {
    const d = DECKS.find((x) => x.id === 'oddeven')!
    const seven = d.cards.find((c) => c.card.name === 'seven')!.card
    expect(d.bins[rightBin(d, seven)].label).toBe('odd')
    expect(d.then!.bins[rightBin(d, seven, true)].label).toBe('5 and up')
  })
})
