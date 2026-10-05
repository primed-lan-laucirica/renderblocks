import { describe, expect, it } from 'vitest'
import { body, fromKey, fromShared, mass, MAX_SIZE, STANDARD, standard } from './characters'
import { CHUNK, chunk, START } from './course'
import { BREEZE, gustNow, push, windAt } from './wind'

describe('characters', () => {
  it('stands the Numberblocks as usual, and any number at all', () => {
    expect(STANDARD.slice(0, 10).map((c) => `${c.shape.cols}x${c.shape.rows}`)).toEqual(['1x1', '1x2', '1x3', '2x2', '1x5', '2x3', '1x7', '2x4', '3x3', '2x5'])
    expect(STANDARD).toHaveLength(20)
    expect(standard(13n).shape).toMatchObject({ cols: 2n, rows: 6n, left: 1n })
    expect(standard(13n).leftovers).toEqual([0])
    expect(standard(10n ** 30n).n).toBe(10n ** 30n)
    expect(fromKey('n-123456789012345678901234567890', [])?.n).toBe(123456789012345678901234567890n)
    expect(fromKey('n-0', [])).toBeNull()
    expect(fromKey('mine-14', [])).toBeNull()
  })
  it('builds the body from the design, leftovers and all', () => {
    const c = { key: 'x', n: 13n, shape: { kind: 'nearly' as const, cols: 3n, rows: 4n, left: 1n }, leftovers: [3 + 2 * 1 + 1], look: standard(1n).look, mine: true }
    const b = body(c)
    expect(b.rects).toHaveLength(2)
    expect(b.rects[1]).toEqual({ x: 3, y: 1, w: 1, h: 1 }) // beside the right column, second row
    expect(b.x1 - b.x0).toBe(4)
    expect(b.scale).toBe(1)
  })
  it('shrinks giants to fit the town, but keeps them heavy', () => {
    const big = { key: 'm', n: 1_000_000n, shape: { kind: 'square' as const, cols: 1000n, rows: 1000n, left: 0n }, leftovers: [], look: standard(1n).look, mine: true }
    const b = body(big)
    expect((b.x1 - b.x0) * b.scale).toBeCloseTo(MAX_SIZE)
    expect(mass(1_000_000n)).toBeGreaterThan(mass(1000n))
    expect(mass(10n)).toBe(10)
    expect(mass(10n ** 40n)).toBeLessThan(50_000) // heavy, but the physics stays steady
  })
  it('reads his Designer characters from shared storage', () => {
    const raw = JSON.stringify({ '14': { n: '14', shape: { kind: 'nearly', cols: '3', rows: '4', left: '2' }, leftovers: [0, 1], look: { eyes: 'star', mouth: 'grin', arms: 'up', legs: 'long', hat: 'helmet' } } })
    const mine = fromShared(raw)
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ n: 14n, mine: true, leftovers: [0, 1] })
    expect(mine[0].look.hat).toBe('helmet')
    expect(fromShared('nonsense')).toEqual([])
  })
})

describe('the town', () => {
  it('starts with the lineup rooftop and is the same every time', () => {
    const c0 = chunk(0)
    expect(c0.pieces[0]).toEqual({ kind: 'building', x: START.x, w: START.w, h: START.h })
    expect(chunk(3)).toEqual(chunk(3))
    expect(chunk(3)).not.toEqual(chunk(4))
  })
  it('keeps every piece inside its chunk, with buildings not overlapping', () => {
    for (let i = 0; i < 30; i++) {
      const { pieces, zones } = chunk(i)
      const buildings = pieces.filter((p) => p.kind === 'building') as { x: number; w: number }[]
      for (let k = 1; k < buildings.length; k++) expect(buildings[k].x).toBeGreaterThan(buildings[k - 1].x + buildings[k - 1].w)
      for (const p of pieces) if (!(i === 0 && p.kind === 'building' && p.x === START.x)) expect(p.x).toBeGreaterThanOrEqual(i * CHUNK)
      expect(zones.length).toBeGreaterThan(0)
    }
  })
})

describe('the wind', () => {
  it('is a breeze, stronger in a windy stretch, plus a gust when asked', () => {
    const zones = [{ x0: 10, x1: 40, strength: 10 }]
    expect(windAt(0, 0, zones)).toBeCloseTo(BREEZE * (1 + 0.25 * Math.sin(1.3)))
    expect(windAt(25, 0, zones)).toBeGreaterThan(windAt(0, 0, zones) * 2)
    expect(windAt(0, 0, zones, gustNow(0))).toBeGreaterThan(windAt(0, 0, zones) + 15)
    expect(gustNow(10)).toBe(0)
  })
  it('pushes a tall character harder than a flat one, and nothing already going faster than the wind', () => {
    expect(push(10, 0, 7)).toBeGreaterThan(push(10, 0, 1))
    expect(push(10, 12, 7)).toBe(0)
  })
})
