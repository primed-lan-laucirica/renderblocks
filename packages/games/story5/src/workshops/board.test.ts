import { describe, expect, it } from 'vitest'
import { rng } from '../engine/ease'
import { arrayNotation, breakTile, deal, divisionFor, factorPairs, newRun, share0, shareDone, shareNotation, tiles0, tilesDone, tilesNotation, type TileState } from './boardLogic'

describe('the Bead Board', () => {
  it('finds every array that fits the board', () => {
    expect(factorPairs(12)).toEqual([
      [1, 12],
      [2, 6],
      [3, 4],
    ])
    expect(factorPairs(9)).toEqual([
      [1, 9],
      [3, 3],
    ])
  })

  it('writes a split array as the sum of its parts', () => {
    expect(arrayNotation({ rows: 4, cols: 6, split: 2 })).toBe('4 × 6 = 4 × 2 + 4 × 4 = 8 + 16 = 24')
    expect(arrayNotation({ rows: 3, cols: 4, split: null })).toBe('3 × 4 = 12')
  })

  it('names the share and remainder only once the dealing is fair and finished', () => {
    const s = share0(17, 5)
    expect(shareNotation(s)).toBe('17 ÷ 5 = ?')
    const dealt = { pile: 2, shares: [3, 3, 3, 3, 3] }
    expect(shareDone(dealt)).toBe(true)
    expect(shareNotation(dealt)).toBe('17 ÷ 5 = 3 r 2')
    expect(shareDone({ pile: 7, shares: [2, 2, 2, 2, 2] })).toBe(false)
  })

  it('465 ÷ 3 can only be shared by breaking a hundred and a ten', () => {
    let s: TileState = tiles0(465, 3)
    for (let l = 0; l < 3; l++) s = deal(s, 2, l)
    expect(s.supply[2]).toBe(1)
    s = breakTile(s, 2)
    for (let j = 0; j < 15; j++) s = deal(s, 1, j % 3)
    s = breakTile(s, 1)
    for (let j = 0; j < 15; j++) s = deal(s, 0, j % 3)
    expect(tilesDone(s)).toBe(true)
    expect(tilesNotation(s)).toBe('465 ÷ 3 = 155')
  })

  it('every division challenge needs a hundred broken, and every run is well formed', () => {
    for (let seed = 1; seed < 200; seed++) {
      const r = rng(seed)
      const k = 2 + (seed % 3)
      const n = divisionFor(r, k)
      expect(n % k).toBe(0)
      expect(Math.floor(n / 100) % k).not.toBe(0)
      const run = newRun(rng(seed))
      expect(run).toHaveLength(8)
      for (const c of run) {
        if (c.kind === 'share') {
          expect(c.n % c.k).not.toBe(0)
          expect(Math.floor(c.n / c.k)).toBeLessThanOrEqual(9)
        }
        if (c.kind === 'array') expect(c.rows * c.cols).toBeLessThanOrEqual(144)
        if (c.kind === 'every') expect(factorPairs(c.n).length).toBeGreaterThan(1)
      }
      expect(new Set(run.map((c) => c.id)).size).toBe(8)
    }
  })
})
