import { describe, expect, it } from 'vitest'
import { getCubeColor, getCubeOutlineColor } from '@renderblocks/blocks/cubeLayout'
import { bands, bestDivisor, cellOf, colourOf, nearestSlot, readout, shapesFor, slots, startSlots, steps } from './shapes'

describe('shapes', () => {
  it('offers the almost-square first, then rectangles, steps, pairs, tens and a tower', () => {
    const s13 = shapesFor(13n)
    expect(s13[0]).toMatchObject({ kind: 'nearly', cols: 3n, rows: 4n, left: 1n })
    expect(s13.map((s) => `${s.kind} ${s.cols}`)).toEqual(['nearly 3', 'nearly 4', 'pairs 2', 'tower 1'])
    expect(shapesFor(16n)[0]).toMatchObject({ kind: 'square', cols: 4n, rows: 4n, left: 0n })
    const s12 = shapesFor(12n).map((s) => `${s.kind} ${s.cols}×${s.rows}+${s.left}`)
    expect(s12).toContain('rectangle 4×3+0')
    expect(s12).toContain('tower 1×12+0')
    expect(shapesFor(10n).map((s) => s.kind)).toContain('steps')
    expect(shapesFor(1n)).toEqual([{ kind: 'square', cols: 1n, rows: 1n, left: 0n }])
  })
  it('never offers more than six cards, or two the same', () => {
    for (const n of [1n, 2n, 7n, 36n, 100n, 720n, 5050n, 1_000_000n, 999_999_999_989n, 10n ** 40n + 7n]) {
      const s = shapesFor(n)
      expect(s.length).toBeLessThanOrEqual(6)
      expect(new Set(s.map((x) => `${x.kind}${x.cols}${x.rows}${x.left}`)).size).toBe(s.length)
      for (const x of s) expect(x.kind === 'steps' ? (x.cols * (x.cols + 1n)) / 2n : x.cols * x.rows + x.left).toBe(n)
    }
  })
  it('has no upper limit: a trillion, a big prime, a 41-digit number', () => {
    expect(shapesFor(1_000_000_000_000n)[0]).toMatchObject({ kind: 'square', cols: 1_000_000n, rows: 1_000_000n })
    expect(bestDivisor(999_999_999_989n)).toBe(1n) // prime: no rectangle
    expect(shapesFor(999_999_999_989n)[0].left).toBeGreaterThan(0n)
    const huge = 10n ** 40n
    expect(shapesFor(huge)[0]).toMatchObject({ kind: 'square', cols: 10n ** 20n, rows: 10n ** 20n })
    expect(readout(huge, shapesFor(huge)[0])).toBe(`${huge.toLocaleString('en-US')} = ${(10n ** 20n).toLocaleString('en-US')} × ${(10n ** 20n).toLocaleString('en-US')}`)
  })
  it('only offers shapes that are wide enough to see', () => {
    expect(shapesFor(13n).map((s) => s.kind)).toContain('tower') // 1 × 13
    expect(shapesFor(100n).map((s) => s.kind)).not.toContain('tower') // 1 × 100 is a hairline
    const big = shapesFor(10n ** 30n + 3n)
    for (const s of big) expect(s.rows <= s.cols * 60n && s.cols <= (s.rows || 1n) * 60n).toBe(true)
  })
  it('knows the step squads', () => {
    expect([1n, 3n, 6n, 10n, 15n, 5050n].map(steps)).toEqual([1n, 2n, 3n, 4n, 5n, 100n])
    expect(steps(11n)).toBe(0n)
  })
  it('reads each shape out', () => {
    expect(readout(13n, shapesFor(13n)[0])).toBe('13 = 3 × 4 + 1')
    expect(readout(10n, { kind: 'steps', cols: 4n, rows: 4n, left: 0n })).toBe('10 = 1 + 2 + 3 + 4')
    expect(readout(1_000_000n, shapesFor(1_000_000n)[0])).toBe('1,000,000 = 1,000 × 1,000')
  })
  it('places blocks bottom row first, and steps column by column', () => {
    const s = { kind: 'nearly' as const, cols: 3n, rows: 4n, left: 1n }
    expect(cellOf(s, 0)).toEqual({ col: 0, row: 0 })
    expect(cellOf(s, 12)).toEqual({ col: 0, row: 4 })
    const st = { kind: 'steps' as const, cols: 4n, rows: 4n, left: 0n }
    expect([0, 1, 2, 3, 4, 5, 9].map((i) => cellOf(st, i))).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 3 },
    ])
  })
})

describe('leftover blocks', () => {
  const s = { kind: 'nearly' as const, cols: 3n, rows: 4n, left: 2n }
  it('start on top and can go on top or beside the full rows', () => {
    expect(slots(s)).toHaveLength(3 + 2 * 4)
    expect(startSlots(s)).toEqual([0, 1])
  })
  it('snap to the nearest free spot, never onto another leftover', () => {
    expect(slots(s)[nearestSlot(s, [0, 1], -0.5, 1.4, 0)]).toEqual({ col: -1, row: 1 })
    expect(nearestSlot(s, [0, 1], 1.5, 4.5, 0)).not.toBe(1)
  })
})

describe('colours', () => {
  it('match the Blocks app (which colours up to its thousands) block for block', () => {
    for (const n of [1, 7, 9, 10, 13, 17, 27, 70, 77, 99, 100, 123, 777, 900, 1000, 1234, 7777, 9999]) {
      const bs = bands(BigInt(n))
      for (let i = 0; i < n; i++) {
        expect(colourOf(BigInt(n), BigInt(i), bs).fill, `${n} #${i}`).toBe(getCubeColor(n, i, n))
        if (n < 1000) expect(colourOf(BigInt(n), BigInt(i), bs).edge, `${n} #${i} edge`).toBe(getCubeOutlineColor(n, i))
      }
    }
  })
  it('keep alternating bright and pale past the thousands', () => {
    const b = bands(23_456n)
    expect(b.map((x) => x.place)).toEqual([4, 3, 2, 1, 0])
    expect(colourOf(23_456n, 0n).fill).not.toBe(colourOf(23_456n, 20_000n).fill)
    // A 25-digit number: still a band for every non-zero digit.
    expect(bands(10n ** 24n + 5n).map((x) => x.place)).toEqual([24, 0])
  })
})
