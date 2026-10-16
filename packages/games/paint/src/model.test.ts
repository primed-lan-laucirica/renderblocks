import { describe, expect, it } from 'vitest'
import { bounds, fillTarget, hits, History, moved, outline, rng, scaled, topAt, type Page, type Shape, type Stroke } from './model'

const stroke = (pts: [number, number][], tool: Stroke['tool'] = 'brush', size = 10): Stroke => ({
  id: Math.random().toString(),
  type: 'stroke',
  tool,
  colour: '#E53935',
  size,
  seed: 1,
  pts: pts.flatMap(([x, y], i) => [x, y, 0, i * 16]),
})
const circle = (cx: number, cy: number, r: number, gap = 0): [number, number][] =>
  Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * (Math.PI * 2 - gap)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
const shape = (kind: Shape['kind'], x1: number, y1: number, x2: number, y2: number): Shape => ({ id: kind + x1, type: 'shape', kind, colour: '#222222', size: 4, seed: 2, x1, y1, x2, y2 })

describe('closed things (for the paint pot)', () => {
  it('a circle he drew round, ends nearly meeting, is closed; a line or a big C is not', () => {
    expect(outline(stroke(circle(100, 100, 50)))).not.toBeNull()
    expect(outline(stroke(circle(100, 100, 50, 0.4)))).not.toBeNull()
    expect(outline(stroke(circle(100, 100, 50, 2.5)))).toBeNull()
    expect(outline(stroke([[0, 0], [50, 0], [100, 0], [150, 0], [200, 0], [250, 0]]))).toBeNull()
  })
  it('spray and highlighter are never filled', () => {
    expect(outline(stroke(circle(100, 100, 50), 'spray'))).toBeNull()
    expect(outline(stroke(circle(100, 100, 50), 'highlighter'))).toBeNull()
  })
  it('rectangles, ellipses and triangles are closed; lines and arrows are not', () => {
    expect(outline(shape('rect', 0, 0, 100, 50))).toHaveLength(4)
    expect(outline(shape('ellipse', 0, 0, 100, 50))!.length).toBeGreaterThan(20)
    expect(outline(shape('triangle', 0, 0, 100, 50))).toHaveLength(3)
    expect(outline(shape('line', 0, 0, 100, 50))).toBeNull()
    expect(outline(shape('arrow', 0, 0, 100, 50))).toBeNull()
  })
  it('fills the smallest closed thing round the tap: a circle inside a square fills the circle', () => {
    const sq = shape('rect', 0, 0, 400, 400)
    const c = stroke(circle(200, 200, 60))
    expect(fillTarget([sq, c], 200, 200)).toBe(c)
    expect(fillTarget([c, sq], 200, 200)).toBe(c)
    expect(fillTarget([sq, c], 30, 30)).toBe(sq)
    expect(fillTarget([sq, c], 500, 500)).toBeNull()
  })
})

describe('touching things', () => {
  it('a stroke is touched on its paint, not beside it; a filled one inside too', () => {
    const c = stroke(circle(100, 100, 50))
    expect(hits(c, 150, 100, 2)).toBe(true)
    expect(hits(c, 100, 100, 2)).toBe(false)
    expect(hits({ ...c, fill: { style: 'solid', colour: '#FFFFFF' } }, 100, 100, 2)).toBe(true)
    expect(hits(c, 170, 100, 2)).toBe(false)
  })
  it('the top one is picked', () => {
    const a = stroke([[0, 0], [100, 0]])
    const b = stroke([[50, -50], [50, 50]])
    expect(topAt([a, b], 50, 0, 2)).toBe(b)
    expect(topAt([b, a], 50, 0, 2)).toBe(a)
    expect(topAt([a, b], 300, 300, 2)).toBeNull()
  })
  it('an arrow is touched on its head too', () => {
    const a = shape('arrow', 0, 0, 200, 0)
    expect(hits(a, 180, 9, 2)).toBe(true)
  })
})

describe('moving and resizing', () => {
  it('moves every point, and grows the paint with the thing', () => {
    const s = stroke([[0, 0], [100, 0]])
    const m = moved(s, 10, 20)
    expect(bounds(m).x).toBeCloseTo(bounds(s).x + 10)
    expect(bounds(m).y).toBeCloseTo(bounds(s).y + 20)
    const big = scaled(s, 2, 0, 0)
    expect(big.size).toBe(20)
    expect(big.pts[4]).toBe(200)
    expect(s.pts[4]).toBe(100)
    const r = scaled(shape('rect', 10, 10, 20, 20), 3, 10, 10)
    expect([r.x1, r.y1, r.x2, r.y2]).toEqual([10, 10, 40, 40])
  })
})

describe('undo', () => {
  it('goes back and forward; a new change clears the redo', () => {
    const p0: Page = { paper: '#FFF', things: [] }
    const h = new History(p0)
    const a = stroke([[0, 0], [1, 1]])
    h.push({ ...h.now, things: [a] })
    h.push({ ...h.now, paper: '#E53935' })
    expect(h.undo()).toBe(true)
    expect(h.now.paper).toBe('#FFF')
    expect(h.now.things).toEqual([a])
    expect(h.undo()).toBe(true)
    expect(h.now).toBe(p0)
    expect(h.undo()).toBe(false)
    expect(h.redo()).toBe(true)
    expect(h.canRedo).toBe(true)
    h.push({ ...h.now, things: [] })
    expect(h.canRedo).toBe(false)
  })
})

it('the same seed gives the same texture', () => {
  const a = rng(42)
  const b = rng(42)
  for (let i = 0; i < 10; i++) expect(a()).toBe(b())
  expect(rng(43)()).not.toBe(rng(42)())
})
