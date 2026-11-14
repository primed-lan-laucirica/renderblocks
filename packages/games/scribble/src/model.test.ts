import { describe, expect, it } from 'vitest'
import { boxAt, clearBox, DEFAULT_SETTINGS, filled, isFull, layoutOf, nextEmpty, pathOf, perRowOf, spokenOf, tokensOf, typedTokens, undo, type Settings, type Stroke } from './model'

const with_ = (s: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...s })
const at = (box: number): Stroke => ({ box, pts: [0, 0, 1, 1] })

describe('the sets', () => {
  it('numbers are 1 to 10 in two rows of five, as on the chalkboard', () => {
    const s = with_({ set: 'numbers' })
    expect(tokensOf(s)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    const lay = layoutOf(tokensOf(s).length, perRowOf(s))
    expect(new Set(lay.boxes.map((b) => b.y)).size).toBe(2)
    expect(lay.boxes.filter((b) => b.y === lay.boxes[0].y).length).toBe(5)
  })

  it('letters are A to H in two rows of four', () => {
    const s = with_({ set: 'letters' })
    expect(tokensOf(s).join('')).toBe('ABCDEFGH')
    const lay = layoutOf(8, perRowOf(s))
    expect(lay.boxes.filter((b) => b.y === lay.boxes[0].y).length).toBe(4)
    expect(new Set(lay.boxes.map((b) => b.y)).size).toBe(2)
  })

  it('a typed set is one character a box, spaces dropped, in rows of five', () => {
    const s = with_({ set: 'custom', custom: 'Nov 13' })
    expect(tokensOf(s)).toEqual(['N', 'o', 'v', '1', '3'])
    expect(perRowOf(s)).toBe(5)
    expect(typedTokens('  a b ')).toEqual(['a', 'b'])
  })

  it('the number of boxes can be chosen: the set goes on, or free boxes are added', () => {
    expect(tokensOf(with_({ set: 'numbers', count: 12 })).slice(-2)).toEqual(['11', '12'])
    expect(tokensOf(with_({ set: 'numbers', count: 3 }))).toEqual(['1', '2', '3'])
    expect(tokensOf(with_({ set: 'letters', count: 10 })).join('')).toBe('ABCDEFGHIJ')
    expect(tokensOf(with_({ set: 'custom', custom: 'cat', count: 5 }))).toEqual(['c', 'a', 't', '', ''])
    expect(tokensOf(with_({ set: 'custom', custom: '' })).length).toBe(10)
    expect(tokensOf(with_({ set: 'numbers', count: 99 })).length).toBe(20)
  })
})

describe('the page', () => {
  const lay = layoutOf(10, 5)
  it('boxes do not overlap and sit inside the page', () => {
    for (const [i, a] of lay.boxes.entries()) {
      expect(a.x + 1).toBeLessThan(lay.w)
      expect(a.y + 1).toBeLessThan(lay.h)
      for (const b of lay.boxes.slice(i + 1)) expect(Math.abs(a.x - b.x) >= 1 || Math.abs(a.y - b.y) >= 1).toBe(true)
    }
  })

  it('a stroke belongs to the box it starts in, a little outside the edge included', () => {
    const b = lay.boxes[6]
    expect(boxAt(lay, b.x + 0.5, b.y + 0.5)).toBe(6)
    expect(boxAt(lay, b.x - 0.05, b.y + 0.5)).toBe(6)
    expect(boxAt(lay, lay.w + 1, 0)).toBe(-1)
  })
})

describe('whose turn it is', () => {
  it('a box is filled once he has written in it, whatever he wrote', () => {
    expect(filled([at(1)], 3)).toEqual([false, true, false])
    expect(isFull([at(0), at(1), at(2)], 3)).toBe(true)
    expect(isFull([at(0), at(0)], 2)).toBe(false)
  })

  it('the turn passes to the next empty box, going round, and stops when all are filled', () => {
    expect(nextEmpty([at(0)], 3, 0)).toBe(1)
    expect(nextEmpty([at(0), at(1)], 3, 1)).toBe(2)
    expect(nextEmpty([at(2), at(1)], 3, 2)).toBe(0)
    expect(nextEmpty([at(0), at(1), at(2)], 3, 2)).toBe(-1)
  })

  it('undo takes off his last stroke and clear empties one box', () => {
    expect(undo([at(0), at(1)])).toEqual([at(0)])
    expect(undo([])).toEqual([])
    expect(clearBox([at(0), at(1), at(0)], 0)).toEqual([at(1)])
  })
})

describe('what is said and drawn', () => {
  it('numbers and letters are spoken; anything else is not', () => {
    expect(spokenOf('10')).toEqual({ kind: 'number', n: 10 })
    expect(spokenOf('b')).toEqual({ kind: 'letter', letter: 'B' })
    expect(spokenOf('/')).toBeNull()
    expect(spokenOf('')).toBeNull()
  })

  it('a stroke of one point is a dot, and a longer one a path through all of it', () => {
    expect(pathOf([1, 2])).toContain('M1.000 2.000')
    const d = pathOf([0, 0, 1, 0, 1, 1, 2, 1])
    expect(d.startsWith('M0.000 0.000')).toBe(true)
    expect(d.endsWith('L2.000 1.000')).toBe(true)
    expect(d.match(/Q/g)!.length).toBe(2)
  })
})
