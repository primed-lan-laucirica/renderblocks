import { describe, expect, it } from 'vitest'
import { add, addSteps, blockSize, palettePlaces, placeShort, colourOf, columns, expanded, groupsOf, placeName, power, powers, remove, shapeOf, standard, value, words } from './model'

const build = (...places: number[]) => places.reduce((m, p) => add(m, p), [] as number[])

describe('the mat', () => {
  it('adds a block to its place', () => {
    expect(build(2)).toEqual([0, 0, 1])
    expect(value(build(2, 0, 0))).toBe(102n)
  })

  it('bundles ten of a place into one of the next', () => {
    const nine = Array(9).fill(1)
    const m = build(...nine)
    expect(m).toEqual([0, 9])
    const steps = addSteps(m, 1)
    expect(steps.map((s) => s.carry)).toEqual([undefined, 1])
    expect(steps[0].mat).toEqual([0, 10]) // the tenth lands first, for the animation
    expect(steps[1].mat).toEqual([0, 0, 1])
  })

  it('chains carries: 9,999 + 1 = 10,000', () => {
    const m = [9, 9, 9, 9]
    const steps = addSteps(m, 0)
    expect(steps.map((s) => s.carry)).toEqual([undefined, 0, 1, 2, 3])
    expect(steps.at(-1)!.mat).toEqual([0, 0, 0, 0, 1])
    expect(value(steps.at(-1)!.mat)).toBe(10000n)
  })

  it('carries across a comma, past a billion and on', () => {
    const m = [0, 0, 0, 0, 0, 0, 9, 9, 9] // 999,000,000
    const after = add(m, 6)
    expect(value(after)).toBe(1_000_000_000n)
    expect(after.length).toBe(10)
    // Ten 1,000,000 blocks a thousand times over reach into the trillions.
    let big = [0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9]
    big = add(big, 6)
    expect(standard(value(big))).toBe('1,000,000,000,000')
  })

  it('takes blocks away and shrinks the columns back', () => {
    expect(remove([3, 1], 1)).toEqual([3])
    expect(remove([3], 2)).toEqual([3]) // nothing there to take
    expect(columns([])).toBe(4)
    expect(columns([0, 0, 0, 0, 0, 1])).toBe(6)
  })
})

describe('reading the number', () => {
  it('groups digits in threes', () => {
    expect(groupsOf(1234567n)).toEqual(['1', '234', '567'])
    expect(groupsOf(1000n)).toEqual(['1', '000'])
    expect(groupsOf(7n)).toEqual(['7'])
    expect(standard(1234567890n)).toBe('1,234,567,890')
  })

  it('says it in words', () => {
    expect(words(0n)).toBe('zero')
    expect(words(15n)).toBe('fifteen')
    expect(words(105n)).toBe('one hundred five')
    expect(words(1234567n)).toBe('one million, two hundred thirty-four thousand, five hundred sixty-seven')
    expect(words(3042000519n)).toBe('three billion, forty-two million, five hundred nineteen')
    expect(words(1000000000000n)).toBe('one trillion')
  })

  it('writes expanded form and powers, leaving zeros out', () => {
    expect(expanded([3, 0, 2, 1])).toBe('1,000 + 200 + 3')
    expect(powers([3, 0, 2, 1])).toBe('1 × 10³ + 2 × 10² + 3 × 10⁰')
    expect(expanded([])).toBe('0')
  })
})

describe('places', () => {
  it('repeats cube, rod, flat in every group of three', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(shapeOf)).toEqual(['cube', 'rod', 'flat', 'cube', 'rod', 'flat', 'cube', 'cube'])
  })
  it('names places and powers', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12].map(placeName)).toEqual([
      'ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions', 'ten millions', 'billions', 'ten billions', 'trillions',
    ])
    expect([0, 2, 3, 6, 14].map(placeShort)).toEqual(['1', '100', '1 thousand', '1 million', '100 trillion'])
    expect(power(0)).toBe('10⁰')
    expect(power(12)).toBe('10¹²')
  })
  it('colours start from the mat: yellow, green, blue, then the red thousand', () => {
    expect([0, 1, 2, 3].map(colourOf)).toEqual(['#F2B632', '#1E9E57', '#2E8BD8', '#D63A3A'])
    expect(colourOf(4)).not.toBe(colourOf(1)) // each group varies
  })
  it('gives every group its own colour family (a thousand never looks like a million)', () => {
    const cubes = [0, 3, 6, 9, 12].map(colourOf)
    expect(new Set(cubes).size).toBe(5)
    expect(colourOf(3)).toBe('#D63A3A')
    expect(colourOf(6)).toBe('#8243CC')
  })
})

describe('the palette', () => {
  it('offers 1 to 1,000,000, then one place past the highest column, up to 10¹⁴', () => {
    expect(palettePlaces([])).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(palettePlaces([0, 0, 0, 0, 0, 0, 3]).at(-1)).toBe(7) // a millions column: 10⁷ appears
    expect(palettePlaces(add([0, 0, 0, 0, 0, 0, 0, 5], 8)).at(-1)).toBe(9)
    expect(palettePlaces(Array(15).fill(1)).at(-1)).toBe(14)
    expect(palettePlaces(Array(16).fill(1)).at(-1)).toBe(14)
  })
})

describe('block sizes', () => {
  it('always fits nine of a place, as big as the room allows', () => {
    for (const [w, h] of [[80, 200], [300, 330], [90, 600], [140, 150]]) {
      for (const shape of ['cube', 'flat'] as const) {
        const s = blockSize(shape, w, h)
        const perRow = Math.floor((w + 6) / (s + 6))
        expect(Math.ceil(9 / perRow) * (s + 6), `${shape} ${w}×${h}`).toBeLessThanOrEqual(h)
        expect(s * perRow, `${shape} ${w}×${h}`).toBeLessThanOrEqual(w)
      }
      const rod = blockSize('rod', w, h)
      expect(9 * (rod * 0.16 + 6)).toBeLessThanOrEqual(h + 1)
    }
    expect(blockSize('cube', 300, 330)).toBeGreaterThan(blockSize('cube', 80, 200)) // bigger when there's room
  })
})
