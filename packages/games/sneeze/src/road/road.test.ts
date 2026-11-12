import { beforeAll, describe, expect, it } from 'vitest'
import { initPhysics } from '../sim'
import { count, divisors, hasStar, joinOf, optionsFor, rect, sneezeOf, spanOf, spoken, startOf, STARTS, STOPS, sumOf, tower, written, type Block, type StopId } from './ops'
import { scene } from './windows'
import { boxOf, RoadStage } from './stage'

const total = (bs: Block[]) => bs.reduce((s, b) => s + count(b), 0)

describe('every sneeze keeps every block', () => {
  it('from every start of every stop, all the way down', () => {
    for (const stop of STOPS)
      for (const n of STARTS[stop].all) {
        let pieces = startOf(stop, n)
        expect(total(pieces), `${stop} ${n}`).toBe(n)
        // Sneeze whatever can, until nothing can (shapes: once round its rectangles).
        for (let i = 0; i < 200; i++) {
          const at = pieces.findIndex((b) => sneezeOf(stop, b, 0, i))
          if (at < 0 || (stop === 'shapes' && i >= divisors(n).length)) break
          const res = sneezeOf(stop, pieces[at], 0, i)!
          expect(total(res.parts.map((p) => p.block)), `${stop} ${n}: ${written(res.says)}`).toBe(count(pieces[at]))
          // The parts lie inside the shape they came from, and don't overlap.
          const cells = new Set<string>()
          for (const p of res.parts)
            for (let y = 0; y < p.block.rows; y++)
              for (let x = 0; x < p.block.cols; x++) {
                const key = `${p.x + x},${p.y + y}`
                expect(cells.has(key), `${stop} ${n} overlap at ${key}`).toBe(false)
                cells.add(key)
              }
          if (!res.reform) expect(cells.size).toBe(count(pieces[at]))
          pieces = [...pieces.slice(0, at), ...res.parts.map((p) => p.block), ...pieces.slice(at + 1)]
        }
        expect(total(pieces), `${stop} ${n}`).toBe(n)
      }
  })

  it('a start is on its own list, and the stage is scaled to hold it', () => {
    for (const stop of STOPS) {
      expect(STARTS[stop].all).toContain(STARTS[stop].first)
      for (const n of STARTS[stop].all) expect(spanOf(stop, n)).toBeGreaterThanOrEqual(Math.max(...startOf(stop, n).map((b) => Math.max(b.cols, b.rows))))
    }
  })
})

describe('the sentence each sneeze makes', () => {
  const says = (stop: StopId, b: Block, row?: number) => written(sneezeOf(stop, b, row)!.says)
  it('one out, split, twins', () => {
    expect(says('one', tower(7))).toBe('7 − 1 = 6')
    expect(sneezeOf('one', tower(1))).toBeNull()
    // The block he taps and all above it fly: the top block is row 9 of ten.
    expect(says('split', tower(10), 9.5)).toBe('10 − 1 = 9')
    expect(says('split', tower(10), 7.2)).toBe('10 − 3 = 7')
    expect(says('split', tower(10), 0.1)).toBe('10 − 9 = 1')
    expect(says('twins', tower(8))).toBe('8 = 4 + 4')
    expect(says('twins', tower(7))).toBe('7 = 3 + 3 + 1')
  })
  it('rows, all at once, one left over', () => {
    expect(says('rows', rect(3, 4))).toBe('12 − 4 = 8')
    expect(sneezeOf('rows', rect(1, 4))).toBeNull()
    expect(says('burst', rect(3, 4))).toBe('12 ÷ 4 = 3')
    expect(sneezeOf('burst', rect(3, 4))!.parts).toHaveLength(3)
    expect(says('over', rect(3, 4, 1))).toBe('13 ÷ 4 = 3 r 1')
    expect(sneezeOf('over', rect(3, 4, 1))!.parts.map((p) => count(p.block))).toEqual([4, 4, 4, 1])
  })
  it('same number, new shape: every rectangle in turn, and a prime is only ever a line', () => {
    const round = (n: number) => {
      const out: string[] = []
      let b = tower(n)
      for (let i = 0; i < divisors(n).length; i++) {
        const res = sneezeOf('shapes', b)!
        out.push(written(res.says))
        b = res.parts[0].block
      }
      return out
    }
    expect(round(12)).toEqual(['12 = 1 × 12', '12 = 2 × 6', '12 = 3 × 4', '12 = 4 × 3', '12 = 6 × 2', '12 = 12 × 1'])
    expect(round(7)).toEqual(['7 = 1 × 7', '7 = 7 × 1'])
  })
  it('chain: halves, down to ones', () => {
    expect(says('chain', rect(4, 4))).toBe('16 = 2 × 8')
    expect(sneezeOf('chain', rect(1, 1))).toBeNull()
    expect(sneezeOf('chain', rect(1, 2))!.parts.map((p) => [p.x, p.y])).toEqual([[0, 0], [1, 0]])
  })
  it('the facts go to the log as the drills write them', () => {
    expect(sneezeOf('split', tower(10), 7)!.fact).toEqual({ concept: '2.OA.B.2', item: '10−3' })
    expect(sneezeOf('burst', rect(3, 4))!.fact).toEqual({ concept: '3.OA.C.7', item: '12÷4' })
    expect(joinOf('build', rect(2, 4), rect(1, 4))!.fact).toEqual({ concept: '3.OA.C.7', item: '3×4' })
    expect(joinOf('join', tower(7), tower(3))!.fact).toEqual({ concept: '2.OA.B.2', item: '7+3' })
  })
})

describe('putting back is the opposite', () => {
  it('towers add, rows multiply, a few blocks are left over', () => {
    expect(written(joinOf('join', tower(7), tower(3))!.says)).toBe('7 + 3 = 10')
    expect(written(joinOf('build', rect(2, 4), rect(1, 4))!.says)).toBe('3 × 4 = 12')
    expect(joinOf('over', rect(3, 4), rect(1, 1))!.whole).toEqual(rect(3, 4, 1))
    expect(written(joinOf('over', rect(3, 4), rect(1, 1))!.says)).toBe('3 × 4 + 1 = 13')
    expect(joinOf('rows', rect(2, 4), rect(1, 3))).toBeNull()
    expect(joinOf('shapes', tower(2), tower(2))).toBeNull()
  })
  it('every sneeze can be put back', () => {
    for (const stop of ['one', 'split', 'rows', 'chain'] as const) {
      const b = startOf(stop, STARTS[stop].first)[0]
      const res = sneezeOf(stop, b, 1)!
      if (stop === 'chain' && res.parts[1].x) continue
      expect(joinOf(stop, res.parts[0].block, res.parts[1].block)!.whole, stop).toEqual(b)
    }
  })
})

describe('guess first, the sum line, stars', () => {
  it('three different answers, the right one among them, the same for the same seed', () => {
    for (let a = 1; a <= 30; a++)
      for (let seed = 0; seed < 12; seed++) {
        const o = optionsFor(a, seed)
        expect(new Set(o).size, `${a} ${seed}`).toBe(3)
        expect(o).toContain(a)
        expect(o.every((x) => x >= 1)).toBe(true)
        expect(optionsFor(a, seed)).toEqual(o)
      }
  })
  it('everything on the stage adds up', () => {
    expect(sumOf([rect(1, 4)])).toBeNull()
    expect(written(sumOf([rect(1, 4), rect(2, 4)])!)).toBe('12 = 8 + 4')
    expect(written(sumOf(Array.from({ length: 8 }, () => rect(1, 2)))!)).toBe('16 = 8 × 2')
  })
  it('a remainder is said the other way round', () => {
    expect(written(spoken([13, '÷', 4, '=', 3, 'r', 1]))).toBe('13 = 3 × 4 + 1')
    expect(written(spoken([12, '−', 4, '=', '?']))).toBe('12 − 4 =')
  })
  it('a star takes three right guesses on more than one day', () => {
    expect(hasStar(['2026-11-12', '2026-11-12', '2026-11-12'])).toBe(false)
    expect(hasStar(['2026-11-12', '2026-11-13'])).toBe(false)
    expect(hasStar(['2026-11-12', '2026-11-12', '2026-11-13'])).toBe(true)
  })
  it('every window has a picture', () => {
    for (const stop of STOPS) expect(scene(stop).length, stop).toBeGreaterThan(stop === 'one' ? 1 : 0)
  })
})

describe('the stage', () => {
  beforeAll(() => initPhysics())
  const run = (s: RoadStage, seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) s.step()
  }
  const apart = (s: RoadStage) => {
    for (const p of s.pieces)
      for (const q of s.pieces) {
        if (p.id >= q.id) continue
        const [a, b] = [boxOf(p.block, p.x, p.y), boxOf(q.block, q.x, q.y)]
        const e = 0.06
        expect(a.x1 - e > b.x0 && a.x0 + e < b.x1 && a.y1 - e > b.y0 && a.y0 + e < b.y1, `${p.id} in ${q.id}`).toBe(false)
      }
  }

  it('every stop: sneeze all the way down, everything lands, nothing overlaps, no block is lost', () => {
    for (const stop of STOPS) {
      const n = STARTS[stop].first
      const s = new RoadStage(startOf(stop, n), spanOf(stop, n))
      for (let i = 0; i < 80; i++) {
        const p = s.pieces.find((x) => x.settled && sneezeOf(stop, x.block, 0, i))
        if (!p || (stop === 'shapes' && i >= 6)) break
        const res = sneezeOf(stop, p.block, 0, i)!
        if (res.reform) s.reform(p, res.parts[0].block)
        else s.sneeze(p, res.parts)
        run(s, 4)
      }
      run(s, 3)
      expect(s.pieces.every((p) => p.settled), stop).toBe(true)
      expect(total(s.pieces.map((p) => p.block)), stop).toBe(n)
      for (const p of s.pieces) expect(boxOf(p.block, p.x, p.y).y0, stop).toBeGreaterThan(-0.05)
      apart(s)
      s.free()
    }
  })

  it('a piece carried back onto another makes the whole again', () => {
    const s = new RoadStage([tower(10)], 10)
    const [stay, out] = s.sneeze(s.pieces[0], sneezeOf('split', tower(10), 7)!.parts)
    run(s, 4)
    expect(s.grab(out)).toBe(true)
    s.holdAt(stay.x, stay.y + 5)
    run(s, 0.2)
    expect(s.under((q) => !!joinOf('split', q.block, out.block))).toBe(stay)
    const whole = s.join(stay, joinOf('split', stay.block, out.block)!.whole)!
    run(s, 2)
    expect(s.pieces).toEqual([whole])
    expect(count(whole.block)).toBe(10)
    expect(whole.settled).toBe(true)
    s.free()
  })

  it('let go over another piece, it drops onto it, not into it', () => {
    const s = new RoadStage([tower(3), tower(2)], 5)
    const [a, b] = s.pieces
    s.grab(b)
    s.holdAt(a.x, a.y)
    run(s, 0.1)
    s.release()
    run(s, 3)
    expect(s.pieces.every((p) => p.settled)).toBe(true)
    apart(s)
    s.free()
  })
})
