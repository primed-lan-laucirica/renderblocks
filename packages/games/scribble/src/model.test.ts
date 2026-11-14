import { describe, expect, it } from 'vitest'
import { boxAt, boxClips, boxWidth, charClips, clearBox, customPage, dateItems, DEFAULT_SETTINGS, filled, isFull, itemClips, layoutOf, nextEmpty, pageOf, pathOf, pathPages, PATH_LENGTH, PROMPT, promptAt, savedPage, undo, type Settings, type Stroke } from './model'

const at = (box: number): Stroke => ({ box, pts: [0, 0, 1, 1] })
const level = (n: number): Settings => ({ ...DEFAULT_SETTINGS, level: n })
const rowsOf = (items: string[], perRow: number) => {
  const ys = layoutOf(items, perRow).boxes.map((b) => b.y)
  return [...new Set(ys)].map((y) => ys.filter((v) => v === y).length)
}
const words = (n: number) => [String(n)]

describe('the path', () => {
  const pages = pathPages(new Date(2026, 10, 13))
  it('begins with one box, and the boxes only grow while the numbers go 1 to 10', () => {
    expect(pages[0].items).toEqual(['1'])
    const counts = pages.slice(0, 8).map((p) => p.items.length)
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 8, 10])
  })

  it('has the chalkboard\'s two sets: 1–10 in two rows of five, A–H in two rows of four', () => {
    const ten = pages.find((p) => p.items.join('') === '12345678910')!
    expect(rowsOf(ten.items, ten.perRow)).toEqual([5, 5])
    expect(layoutOf(ten.items, ten.perRow).boxes[9].ch).toBe('10')
    const ah = pages.find((p) => p.items.join('') === 'ABCDEFGH')!
    expect(rowsOf(ah.items, ah.perRow)).toEqual([4, 4])
  })

  it('goes on to bigger numbers, words, sums and other things, in that order', () => {
    const stages = [...new Set(pages.map((p) => p.stage))]
    expect(stages).toEqual(['Numbers', 'Letters', 'Small letters', 'Bigger numbers', 'Words', 'Sums', 'Other things'])
    expect(pages.some((p) => p.items.includes('cat'))).toBe(true)
    expect(pages.some((p) => p.items.includes('2×3=6'))).toBe(true)
    expect(PATH_LENGTH).toBe(pages.length)
  })

  it('has today\'s date on it, as the chalkboard does', () => {
    expect(dateItems(new Date(2026, 10, 13))).toEqual(['Fri', '13', 'Nov', '2026'])
    expect(pages.some((p) => p.items.join(' ') === 'Fri 13 Nov 2026')).toBe(true)
  })

  it('stays on the last page past the end', () => {
    expect(pageOf(level(999)).items).toEqual(pageOf(level(PATH_LENGTH - 1)).items)
    expect(pageOf(level(-3)).items).toEqual(['1'])
  })

  it('a grown-up\'s own text is split into words, each one box', () => {
    expect(customPage('Fri 13 Nov').items).toEqual(['Fri', '13', 'Nov'])
    expect(customPage('a b c').perRow).toBe(5)
    expect(customPage('cat').perRow).toBe(8)
    expect(customPage('x'.repeat(40)).items[0].length).toBe(12)
  })
})

describe('the page', () => {
  it('each example sits directly above its own box: same left and right edges, just above it', () => {
    for (const p of pathPages()) {
      const lay = layoutOf(p.items, p.perRow)
      for (const [i, b] of lay.boxes.entries()) {
        expect(promptAt(lay, b.x + b.w / 2, b.y - PROMPT / 2)).toBe(i)
        expect(promptAt(lay, b.x + b.w / 2, b.y + 0.5)).toBe(-1)
        expect(b.y - PROMPT).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('boxes do not overlap, examples do not run into the row above, and all sit inside the page', () => {
    for (const p of pathPages()) {
      const lay = layoutOf(p.items, p.perRow)
      for (const [i, a] of lay.boxes.entries()) {
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x + a.w).toBeLessThanOrEqual(lay.w + 1e-9)
        expect(a.y + 1).toBeLessThanOrEqual(lay.h + 1e-9)
        for (const b of lay.boxes.slice(i + 1)) expect(b.x >= a.x + a.w || a.x >= b.x + b.w || Math.abs(a.y - b.y) >= 1 + PROMPT).toBe(true)
      }
    }
  })

  it('a box holds a whole string: 10, cat, 1000 and a sum are one box each, wider as they are longer', () => {
    for (const items of [['10'], ['cat'], ['1000'], ['12÷4=3'], ['run', 'hop', 'jump']]) {
      const lay = layoutOf(items, 8)
      expect(lay.boxes.map((b) => b.ch)).toEqual(items)
    }
    expect(boxWidth('7')).toBe(1)
    expect(boxWidth('cat')).toBeGreaterThan(boxWidth('10'))
    expect(boxWidth('1,000,000')).toBeGreaterThan(boxWidth('cat'))
    for (const p of pathPages()) expect(layoutOf(p.items, p.perRow).boxes.length).toBe(p.items.length)
  })

  it('a stroke belongs to the box it starts in, a little outside the edge included', () => {
    const lay = layoutOf(['1', 'cat', '3'], 5)
    const b = lay.boxes[1]
    expect(boxAt(lay, b.x + b.w - 0.1, b.y + 0.5)).toBe(1)
    expect(boxAt(lay, b.x - 0.05, b.y + 0.5)).toBe(1)
    expect(boxAt(lay, b.x + 0.5, b.y - PROMPT / 2)).toBe(-1)
  })
})

describe('whose turn it is', () => {
  it('a box is filled once he has written in it, whatever he wrote', () => {
    expect(filled([at(1)], 3)).toEqual([false, true, false])
    expect(isFull([at(0), at(1), at(2)], 3)).toBe(true)
    expect(isFull([at(0), at(0)], 2)).toBe(false)
    expect(isFull([], 0)).toBe(false)
  })

  it('the turn passes to the next empty box, going round, and stops when all are filled', () => {
    expect(nextEmpty([at(0)], 3, 0)).toBe(1)
    expect(nextEmpty([at(2), at(1)], 3, 2)).toBe(0)
    expect(nextEmpty([at(0), at(1), at(2)], 3, 2)).toBe(-1)
  })

  it('undo takes off his last stroke and clear empties one box', () => {
    expect(undo([at(0), at(1)])).toEqual([at(0)])
    expect(clearBox([at(0), at(1), at(0)], 0)).toEqual([at(1)])
  })
})

describe('what is said and drawn', () => {
  it('each box says its digit, letter or sign', () => {
    expect(charClips('7')).toEqual([{ kind: 'number', name: 'seven' }])
    expect(charClips('b')).toEqual([{ kind: 'letter', letter: 'B' }])
    expect(charClips('÷')).toEqual([{ kind: 'number', name: 'dividedBy' }])
    expect(charClips(':')).toEqual([])
    expect(charClips('10', (n) => [String(n)])).toEqual([{ kind: 'number', name: '10' }])
  })

  it('a box is said whole: the number, the word, the sum; else character by character', () => {
    const names = (s: string) => boxClips(s, words).map((c) => (c.kind === 'number' ? c.name : c.kind === 'letter' ? c.letter : c.word))
    expect(names('7')).toEqual(['seven'])
    expect(names('10')).toEqual(['10'])
    expect(names('1,000,000')).toEqual(['1000000'])
    expect(names('cat')).toEqual(['cat'])
    expect(names('A')).toEqual(['A'])
    expect(names('12÷4=3')).toEqual(['12', 'dividedBy', '4', 'equals', '3'])
    expect(names('7:30')).toEqual(['seven', 'three', 'zero'])
    expect(itemClips('7', words)).toBeNull()
  })

  it('a stroke of one point is a dot, and a longer one a path through all of it', () => {
    expect(pathOf([1, 2])).toContain('M1.000 2.000')
    expect(pathOf([0, 0, 1, 0, 1, 1, 2, 1]).match(/Q/g)!.length).toBe(2)
  })

  it('reads pages saved when every character had its own box', () => {
    expect(savedPage({ id: '1', at: 0, ink: [], perRow: 5, tokens: ['1', '2', ''] } as never).items).toEqual(['1', '2', ' '])
    expect(savedPage({ id: '1', at: 0, ink: [], perRow: 8, items: ['cat', 'dog'] }).items).toEqual(['c', 'a', 't', 'd', 'o', 'g'])
    expect(savedPage({ id: '1', at: 0, ink: [], perRow: 5, items: ['9', '10'], whole: true } as never).items).toEqual(['9', '10'])
    expect(savedPage({ id: '1', at: 0, ink: [], perRow: 8, items: ['cat'], v: 2 }).items).toEqual(['cat'])
  })
})
