import { beforeAll, describe, expect, it } from 'vitest'
import { arrange, CHAINS, count, factorsOf, hasStar, isRect, labelOf, optionsFor, rect, same, sliderOf, sneezeOf, spanOf, stairs, startsOf, sumOf, trailOf, written, type ChainId, type Shape } from './chains'
import { initPhysics } from '../sim'
import { boxOf, RoadStage, STEP } from './stage'

/** Sneeze all the way down, always by the first thing on the slider (or `pick`). */
function run(chain: ChainId, start: Shape, pick?: (s: Shape) => number | undefined) {
  const says: string[] = []
  const stays: Shape[] = []
  let s = start
  for (let i = 0; i < 100; i++) {
    const res = sneezeOf(chain, s, pick?.(s))
    if (!res) break
    says.push(written(res.says))
    stays.push(...res.parts.filter((p) => !p.fly).map((p) => p.shape))
    s = res.parts.find((p) => p.fly)!.shape
  }
  return { says, stays, last: s }
}

describe('every chain', () => {
  it('loses no blocks, pops out exactly one piece, and the parts tile the shape they came from', () => {
    for (const chain of CHAINS)
      for (const start of startsOf(chain)) {
        const picks = [undefined, ...(sliderOf(chain, start.shape)?.values ?? [])]
        for (const pick of picks) {
          const res = sneezeOf(chain, start.shape, pick)!
          expect(res, `${chain} ${start.title}`).not.toBeNull()
          const whole = res.as ?? start.shape
          expect(res.parts.filter((p) => p.fly)).toHaveLength(1)
          expect(res.parts[res.parts.length - 1].fly).toBe(true)
          expect(res.parts.reduce((a, p) => a + count(p.shape), 0)).toBe(count(start.shape))
          // Every cell of the whole is covered once.
          const seen = new Set<string>()
          for (const p of res.parts) p.shape.forEach((h, i) => Array.from({ length: h }, (_, j) => seen.add(`${p.x + i},${p.y + j}`)))
          expect(seen.size).toBe(count(whole))
          whole.forEach((h, i) => expect(seen.has(`${i},${h - 1}`)).toBe(true))
        }
      }
  })

  it('what pops out is the same kind of thing, so it can go all the way down', () => {
    for (const chain of CHAINS)
      for (const start of startsOf(chain)) {
        const { stays, last } = run(chain, start.shape)
        expect(sneezeOf(chain, last)).toBeNull()
        expect(count(last) + stays.reduce((a, s) => a + count(s), 0)).toBe(count(start.shape))
      }
  })

  it('the sentence is true, its question has its answer, and going back says the opposite', () => {
    const value = (t: (number | string)[]) => {
      const [a, op, b] = t as [number, string, number]
      return op === '−' ? a - b : op === '+' ? a + b : op === '×' ? a * b : a / b
    }
    for (const chain of CHAINS)
      for (const start of startsOf(chain))
        for (const pick of [undefined, ...(sliderOf(chain, start.shape)?.values ?? [])]) {
          const res = sneezeOf(chain, start.shape, pick)!
          for (const o of [res, res.back]) {
            expect(value(o.says)).toBe(o.says[4])
            expect(o.ask.slice(0, 4)).toEqual(o.says.slice(0, 4))
            expect(o.ask[4]).toBe('?')
            expect(o.answer).toBe(o.says[4])
          }
          expect(res.back.says[4]).toBe(res.says[0])
        }
  })

  it('the slider rests on what a plain tap does, and every stop on it does something different', () => {
    for (const chain of CHAINS)
      for (const start of startsOf(chain)) {
        const sl = sliderOf(chain, start.shape)
        if (!sl) continue
        expect(sl.values.length).toBeGreaterThan(1)
        expect(written(sneezeOf(chain, start.shape, sl.at)!.says)).toBe(written(sneezeOf(chain, start.shape)!.says))
        expect(new Set(sl.values.map((v) => written(sneezeOf(chain, start.shape, v)!.says))).size).toBe(sl.values.length)
        expect(sl.labels).toHaveLength(sl.values.length)
      }
  })
})

describe('corner squares', () => {
  it('a square pops the next square down and keeps an L: the odd numbers', () => {
    const { says, stays, last } = run('corner', rect(5, 5))
    expect(says).toEqual(['25 − 9 = 16', '16 − 7 = 9', '9 − 5 = 4', '4 − 3 = 1'])
    expect(stays.map(count)).toEqual([9, 7, 5, 3])
    expect(stays[0]).toEqual([5, 1, 1, 1, 1])
    expect(last).toEqual([1])
    expect(written(sumOf([...stays, last])!)).toBe('25 = 9 + 7 + 5 + 3 + 1')
  })
  it('the slider picks any smaller square', () => {
    expect(sliderOf('corner', rect(5, 5))).toEqual({ values: [4, 3, 2, 1], at: 4, labels: ['16', '9', '4', '1'] })
    const res = sneezeOf('corner', rect(5, 5), 3)!
    expect(written(res.says)).toBe('25 − 16 = 9')
    expect(res.parts[0].shape).toEqual([5, 5, 2, 2, 2])
    expect(res.parts[1]).toEqual({ shape: rect(3, 3), x: 2, y: 2, fly: true })
    expect(written(res.back.says)).toBe('9 + 16 = 25')
  })
  it('an L and a one cannot sneeze', () => {
    expect(sneezeOf('corner', [5, 1, 1, 1, 1])).toBeNull()
    expect(sneezeOf('corner', [1])).toBeNull()
    expect(sneezeOf('corner', rect(2, 3))).toBeNull()
  })
})

describe('step triangles', () => {
  it('a staircase pops the next one down and keeps its tallest column', () => {
    const { says, stays, last } = run('steps', stairs(5))
    expect(says).toEqual(['15 − 5 = 10', '10 − 4 = 6', '6 − 3 = 3', '3 − 2 = 1'])
    expect(stays).toEqual([[5], [4], [3], [2]])
    expect(last).toEqual([1])
    expect(written(sumOf([...stays, last])!)).toBe('15 = 5 + 4 + 3 + 2 + 1')
  })
  it('the slider picks any smaller staircase, and a run of columns stays', () => {
    expect(sliderOf('steps', stairs(5))?.labels).toEqual(['10', '6', '3', '1'])
    const res = sneezeOf('steps', stairs(5), 2)!
    expect(written(res.says)).toBe('15 − 12 = 3')
    expect(res.parts.map((p) => p.shape)).toEqual([[5, 4, 3], [2, 1]])
    expect(res.parts[1].x).toBe(3)
  })
})

describe('factors and powers', () => {
  it('60 goes down by its smallest factor to a prime, which cannot sneeze', () => {
    const { says, last } = run('factors', rect(6, 10))
    expect(says).toEqual(['60 ÷ 2 = 30', '30 ÷ 2 = 15', '15 ÷ 3 = 5'])
    expect(count(last)).toBe(5)
    expect(written(trailOf([2, 2, 3], 5)!)).toBe('60 = 2 × 2 × 3 × 5')
    expect(trailOf([], 60)).toBeNull()
    expect(written(trailOf([2, 2, 2], 1)!)).toBe('8 = 2 × 2 × 2')
  })
  it('the slider offers every factor, and the shape stands as that many copies', () => {
    expect(sliderOf('factors', rect(4, 6))?.labels).toEqual(['÷ 2', '÷ 3', '÷ 4', '÷ 6', '÷ 8', '÷ 12'])
    expect(sliderOf('factors', rect(1, 7))).toBeNull()
    for (const n of [12, 24, 60, 64, 100])
      for (const f of factorsOf('factors', n)) {
        const { r, c, a, b } = arrange(n, f)
        expect(r * c * a * b).toBe(n)
        expect(a * b).toBe(f)
        const res = sneezeOf('factors', [n], f)!
        expect(res.parts).toHaveLength(f)
        expect(res.parts.every((p) => same(p.shape, rect(r, c)))).toBe(true)
        expect(res.factor).toBe(f)
      }
    expect(arrange(100, 10)).toEqual({ r: 1, c: 10, a: 10, b: 1 })
    // 64 in two: a square again.
    const two = arrange(64, 2)
    expect([two.a * two.r, two.b * two.c]).toEqual([8, 8])
  })
  it('a shape that already stands right is left as it is', () => {
    const first = sneezeOf('factors', [24])!
    expect(first.as).toBeDefined()
    expect(sneezeOf('factors', first.as!)!.as).toBeUndefined()
  })
  it('powers go by the base, down to one', () => {
    expect(factorsOf('powers', 64)).toEqual([2, 4, 8])
    expect(factorsOf('powers', 100)).toEqual([10])
    expect(factorsOf('powers', 2)).toEqual([2])
    // A number that is no smaller number's power is its own base: into ones.
    expect(factorsOf('powers', 12)).toEqual([12])
    expect(run('powers', [16]).says).toEqual(['16 ÷ 2 = 8', '8 ÷ 2 = 4', '4 ÷ 2 = 2', '2 ÷ 2 = 1'])
    expect(run('powers', [100]).says).toEqual(['100 ÷ 10 = 10', '10 ÷ 10 = 1'])
    expect(run('powers', [64], () => 4).says).toEqual(['64 ÷ 4 = 16', '16 ÷ 4 = 4', '4 ÷ 2 = 2', '2 ÷ 2 = 1'])
  })
  it('only the times tables are recorded as facts', () => {
    expect(sneezeOf('factors', [12])!.fact).toEqual({ concept: '3.OA.C.7', item: '12÷2' })
    expect(sneezeOf('factors', [12])!.back.fact).toEqual({ concept: '3.OA.C.7', item: '2×6' })
    expect(sneezeOf('factors', [60])!.fact).toBeUndefined()
  })
})

describe('the biggest square', () => {
  it('5 × 8 keeps a square and pops the rest, down the Fibonacci numbers to a square', () => {
    const { says, stays, last } = run('rect', rect(5, 8))
    expect(says).toEqual(['8 − 5 = 3', '5 − 3 = 2', '3 − 2 = 1', '2 − 1 = 1'])
    expect(stays.map((s) => s.length)).toEqual([5, 3, 2, 1])
    expect(stays.every((s) => isRect(s) && s[0] === s.length)).toBe(true)
    expect(last).toEqual([1])
  })
  it('ends at the square whose side goes into both sides', () => {
    expect(run('rect', rect(8, 12)).last).toEqual(rect(4, 4))
    expect(run('rect', rect(6, 9)).last).toEqual(rect(3, 3))
    expect(run('rect', rect(3, 7)).last).toEqual(rect(1, 1))
  })
  it('the slider picks how many squares stay, never all of it', () => {
    expect(sliderOf('rect', rect(5, 8))).toBeNull()
    expect(sliderOf('rect', rect(5, 12))).toEqual({ values: [1, 2], at: 1, labels: ['− 5', '− 10'] })
    expect(sliderOf('rect', rect(4, 12))?.values).toEqual([1, 2])
    expect(written(sneezeOf('rect', rect(5, 12), 2)!.says)).toBe('12 − 10 = 2')
    expect(written(sneezeOf('rect', rect(12, 5), 2)!.says)).toBe('12 − 10 = 2')
  })
  it('is labelled by its sides', () => {
    expect(written(labelOf('rect', rect(5, 8)))).toBe('5 × 8')
    expect(written(labelOf('corner', rect(5, 5)))).toBe('25')
  })
})

describe('guesses and stars', () => {
  it('offers the answer among three different numbers', () => {
    for (let a = 1; a < 40; a++)
      for (let seed = 0; seed < 12; seed++) {
        const o = optionsFor(a, seed)
        expect(o).toContain(a)
        expect(new Set(o).size).toBe(3)
        expect(o.every((x) => x >= 1)).toBe(true)
      }
  })
  it('a star takes three right guesses on more than one day', () => {
    expect(hasStar(['2026-11-12', '2026-11-12', '2026-11-12'])).toBe(false)
    expect(hasStar(['2026-11-12', '2026-11-13'])).toBe(false)
    expect(hasStar(['2026-11-12', '2026-11-12', '2026-11-13'])).toBe(true)
  })
})

describe('the stage', () => {
  beforeAll(async () => {
    await initPhysics()
  })
  const settle = (st: RoadStage, s = 8) => {
    for (let i = 0; i < s / STEP; i++) st.step()
  }
  const total = (st: RoadStage) => st.pieces.reduce((a, p) => a + count(p.shape), 0)

  it('a whole chain lands, with every block, on the floor', () => {
    for (const chain of CHAINS) {
      const start = startsOf(chain)[3].shape
      const st = new RoadStage([start], spanOf(chain, start))
      let cur = st.pieces[0]
      for (let i = 0; i < 30; i++) {
        const res = sneezeOf(chain, cur.shape)
        if (!res) break
        if (res.as) cur = st.reform(cur, res.as)
        const made = st.sneeze(cur, res.parts, res.back, res.factor)
        cur = made[made.length - 1]
        settle(st, 4)
      }
      settle(st)
      expect(total(st), chain).toBe(count(start))
      for (const p of st.pieces) {
        expect(p.settled, chain).toBe(true)
        expect(boxOf(p.shape, p.x, p.y).y0, chain).toBeGreaterThan(-0.1)
      }
      st.free()
    }
  })

  it('carried back where it came from, it is the whole again, and that can go back in turn', () => {
    for (const chain of CHAINS) {
      const start = startsOf(chain)[3].shape
      const st = new RoadStage([start], spanOf(chain, start))
      const first = sneezeOf(chain, start)!
      const whole1 = first.as ?? start
      let cur = first.as ? st.reform(st.pieces[0], first.as) : st.pieces[0]
      const id1 = cur.id
      cur = st.sneeze(cur, first.parts, first.back, first.factor).at(-1)!
      settle(st)
      const second = sneezeOf(chain, cur.shape)
      if (!second) continue
      const id2 = cur.id
      const whole2 = second.as ?? cur.shape
      if (second.as) cur = st.reform(cur, second.as)
      expect(cur.id).toBe(id2)
      expect(cur.from?.id).toBe(id1)
      cur = st.sneeze(cur, second.parts, second.back, second.factor).at(-1)!
      settle(st)
      // The first one out cannot go back while it is in pieces: only the last.
      expect(st.piece(id2)).toBeUndefined()
      for (const [id, whole] of [[id2, whole2], [id1, whole1]] as const) {
        expect(st.homeOf(cur), chain).not.toBeNull()
        expect(st.grab(cur)).toBe(true)
        const home = st.homeOf(cur)!
        st.holdAt(home.x0 + cur.from!.outAt.x + cur.shape.length / 2, home.y0 + cur.from!.outAt.y + 1)
        expect(st.overHome(), chain).toBe(true)
        const back = st.joinBack()!
        expect(back.id).toBe(id)
        expect(back.shape).toEqual(whole)
        settle(st, 3)
        cur = st.piece(id)!
      }
      expect(st.pieces).toHaveLength(1)
      expect(cur.from).toBeNull()
      expect(cur.path).toEqual([])
      expect(total(st)).toBe(count(start))
      st.free()
    }
  })

  it('held far from home, it is not over it', () => {
    const st = new RoadStage([rect(5, 5)], 5)
    const res = sneezeOf('corner', rect(5, 5))!
    const out = st.sneeze(st.pieces[0], res.parts, res.back).at(-1)!
    settle(st)
    st.grab(out)
    st.holdAt(out.x + 30, 10)
    expect(st.overHome()).toBe(false)
    st.release()
    settle(st)
    expect(out.settled).toBe(true)
    st.free()
  })
})
