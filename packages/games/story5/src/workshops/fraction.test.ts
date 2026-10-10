import { describe, expect, it } from 'vitest'
import { amount, cut, groupNotation, join, layOn, placeIn, sumOf, trackNotation, type Piece } from './fractionModel'

const piece = (id: number, d: number, a: number, frame: number | null = 0): Piece => ({ id, d, a, frame, x: 0, y: 0 })

describe('the Fraction Table', () => {
  it('writes amounts plainly, as mixed numbers past one', () => {
    expect(amount(18)).toBe('3/4')
    expect(amount(24)).toBe('1')
    expect(amount(30)).toBe('5/4 = 1 1/4')
    expect(amount(48)).toBe('2')
  })

  it('cuts a piece into equal pieces, side by side, only into sizes in the box', () => {
    expect(cut(piece(1, 2, 0), 2, 10)?.map((p) => [p.d, p.a])).toEqual([
      [4, 0],
      [4, 6],
    ])
    expect(cut(piece(1, 3, 8), 2, 10)?.map((p) => [p.d, p.a])).toEqual([
      [6, 8],
      [6, 12],
    ])
    expect(cut(piece(1, 8, 0), 2, 10)).toBeNull()
  })

  it('joins only pieces of one size, side by side, into a size in the box', () => {
    const quarters = [0, 6, 12, 18].map((a, i) => piece(i, 4, a))
    expect(join(quarters, 9)).toMatchObject({ d: 1 })
    expect(join([piece(1, 4, 18), piece(2, 4, 0)], 9)).toMatchObject({ d: 2, a: 18 })
    // Not side by side.
    expect(join([piece(1, 4, 0), piece(2, 4, 12)], 9)).toBeNull()
    // Three quarters don't make a size.
    expect(join(quarters.slice(0, 3), 9)).toBeNull()
    // Different sizes.
    expect(join([piece(1, 4, 0), piece(2, 2, 6)], 9)).toBeNull()
    // Different frames.
    expect(join([piece(1, 4, 0, 0), piece(2, 4, 6, 1)], 9)).toBeNull()
  })

  it('fits pieces into a frame where there is room', () => {
    const half = [piece(1, 2, 0)]
    expect(placeIn(half, 4, 0)).toBe(12)
    expect(placeIn([piece(1, 1, 0)], 4, 0)).toBeNull()
  })

  it('lays quarters on a half side by side, and names the overlay', () => {
    const half = { ...piece(1, 2, 0, null) }
    const q1 = { ...piece(2, 4, layOn([half], 4, 0), null) }
    const q2 = { ...piece(3, 4, layOn([half, q1], 4, 0), null) }
    expect([q1.a, q2.a]).toEqual([0, 6])
    expect(groupNotation([half, q1, q2])).toBe('1/2 = 2/4')
  })

  it('writes a frame as the sum of its pieces', () => {
    expect(sumOf([piece(1, 4, 6), piece(2, 4, 0), piece(3, 2, 12)])).toBe('1/4 + 1/4 + 1/2 = 1')
    expect(sumOf([piece(1, 3, 0)])).toBe('1/3')
  })

  it('writes the track', () => {
    expect(trackNotation([4, 4, 4, 4, 4])).toBe('5/4 = 1 1/4')
    expect(trackNotation([4, 4])).toBe('2/4 = 1/2')
    expect(trackNotation([2, 4])).toBe('1/2 + 1/4 = 3/4')
  })
})
