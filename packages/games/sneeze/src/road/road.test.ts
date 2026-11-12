import { beforeAll, describe, expect, it } from 'vitest'
import { arrange, cellOf, CHAINS, choicesFor, count, cube, isCube, shell, factorsOf, hasStar, isRect, labelOf, MAX_K, optionsFor, rect, same, sidesOf, sliderOf, sneezeOf, spanOf, stairs, startsOf, sumOf, trailOf, unitOf, valueOf, written, type ChainId, type Shape } from './chains'
import { initPhysics } from '../sim'
import { boxOf, RoadStage, STEP } from './stage'

/**
 * Sneeze all the way down, always by the first thing on the slider (or
 * `pick`). `whole`: stop where the decimals would begin. `left` is what is
 * on the stage at the end, as amounts.
 */
function run(chain: ChainId, start: Shape, opts: { pick?: (s: Shape) => number | undefined; whole?: boolean } = {}) {
  const says: string[] = []
  const stays: Shape[] = []
  const left: number[] = []
  let s = start
  let k = 0
  let last: number | undefined
  for (let i = 0; i < 100; i++) {
    const res = sneezeOf(chain, s, opts.pick?.(s), k, last)
    if (!res || (opts.whole && res.k > 0)) break
    says.push(written(res.says))
    for (const p of res.parts.filter((q) => !q.fly)) {
      stays.push(p.shape)
      left.push(valueOf(count(p.shape), res.k))
    }
    s = res.parts.find((p) => p.fly)!.shape
    k = res.k
    last = res.factor
  }
  return { says, stays, last: s, k, factor: last, left: [...left, valueOf(count(s), k)] }
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
          expect(res.k).toBe(0)
          // Every cell of the whole is covered once.
          const seen = new Set<string>()
          for (const p of res.parts) p.shape.forEach((h, i) => Array.from({ length: h }, (_, j) => seen.add(`${p.x + i},${p.y + j}`)))
          // (A deep shape is covered as it is seen from the front.)
          expect(seen.size).toBe(whole.reduce((x, h) => x + h, 0))
          whole.forEach((h, i) => expect(seen.has(`${i},${h - 1}`)).toBe(true))
        }
      }
  })

  it('what pops out is the same kind of thing, so it can go all the way down', () => {
    for (const chain of CHAINS)
      for (const start of startsOf(chain)) {
        const { last, k, factor, left } = run(chain, start.shape)
        expect(sneezeOf(chain, last, undefined, k, factor), `${chain} ${start.title}`).toBeNull()
        expect(k).toBeLessThanOrEqual(MAX_K)
        // Nothing is lost on the way, decimals and all.
        expect(left.reduce((a, b) => a + b, 0)).toBeCloseTo(count(start.shape), 6)
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
    const { says, stays, last } = run('corner', rect(5, 5), { whole: true })
    expect(says).toEqual(['25 − 9 = 16', '16 − 7 = 9', '9 − 5 = 4', '4 − 3 = 1'])
    expect(stays.map(count)).toEqual([9, 7, 5, 3])
    expect(stays[0]).toEqual([5, 1, 1, 1, 1])
    expect(last).toEqual([1])
    expect(written(sumOf([...stays, last].map(count))!)).toBe('25 = 9 + 7 + 5 + 3 + 1')
  })
  it('the slider picks any smaller square', () => {
    expect(sliderOf('corner', rect(5, 5))).toEqual({ values: [4, 3, 2, 1], at: 4, labels: ['16', '9', '4', '1'] })
    const res = sneezeOf('corner', rect(5, 5), 3)!
    expect(written(res.says)).toBe('25 − 16 = 9')
    expect(res.parts[0].shape).toEqual([5, 5, 2, 2, 2])
    expect(res.parts[1]).toEqual({ shape: rect(3, 3), x: 2, y: 2, fly: true })
    expect(written(res.back.says)).toBe('9 + 16 = 25')
  })
  it('an L cannot sneeze', () => {
    expect(sneezeOf('corner', [5, 1, 1, 1, 1])).toBeNull()
    expect(sneezeOf('corner', rect(2, 3))).toBeNull()
  })
  it('below one it goes on in hundredths, as Sneeze² does, to a ten-thousandth', () => {
    const one = sneezeOf('corner', [1])!
    expect(one.as).toEqual(rect(10, 10))
    expect(one.k).toBe(2)
    expect(written(one.says)).toBe('1 − 0.19 = 0.81')
    expect(written(one.back.says)).toBe('0.81 + 0.19 = 1')
    expect(one.fact).toBeUndefined()
    expect(sliderOf('corner', [1])?.labels.slice(0, 3)).toEqual(['0.81', '0.64', '0.49'])
    const { says, last, k } = run('corner', rect(2, 2))
    expect(says.slice(0, 3)).toEqual(['4 − 3 = 1', '1 − 0.19 = 0.81', '0.81 − 0.17 = 0.64'])
    expect(says[9]).toBe('0.04 − 0.03 = 0.01')
    expect(says[10]).toBe('0.01 − 0.0019 = 0.0081')
    expect(says.at(-1)).toBe('0.0004 − 0.0003 = 0.0001')
    expect([last, k]).toEqual([[1], 4])
    expect(sneezeOf('corner', [1], undefined, 4)).toBeNull()
  })
})

describe('step triangles', () => {
  it('a staircase pops the next one down and keeps its tallest column', () => {
    const { says, stays, last } = run('steps', stairs(5), { whole: true })
    expect(says).toEqual(['15 − 5 = 10', '10 − 4 = 6', '6 − 3 = 3', '3 − 2 = 1'])
    expect(stays).toEqual([[5], [4], [3], [2]])
    expect(last).toEqual([1])
    expect(written(sumOf([...stays, last].map(count))!)).toBe('15 = 5 + 4 + 3 + 2 + 1')
  })
  it('the slider picks any smaller staircase, and a run of columns stays', () => {
    expect(sliderOf('steps', stairs(5))?.labels).toEqual(['10', '6', '3', '1'])
    const res = sneezeOf('steps', stairs(5), 2)!
    expect(written(res.says)).toBe('15 − 12 = 3')
    expect(res.parts.map((p) => p.shape)).toEqual([[5, 4, 3], [2, 1]])
    expect(res.parts[1].x).toBe(3)
  })
  it('below one, a one is ten tenths: a staircase of four', () => {
    const one = sneezeOf('steps', [1])!
    expect(one.as).toEqual(stairs(4))
    expect(one.k).toBe(1)
    const { says, k } = run('steps', stairs(2))
    expect(says).toEqual([
      '3 − 2 = 1',
      ...['1 − 0.4 = 0.6', '0.6 − 0.3 = 0.3', '0.3 − 0.2 = 0.1'],
      ...['0.1 − 0.04 = 0.06', '0.06 − 0.03 = 0.03', '0.03 − 0.02 = 0.01'],
      ...['0.01 − 0.004 = 0.006', '0.006 − 0.003 = 0.003', '0.003 − 0.002 = 0.001'],
      ...['0.001 − 0.0004 = 0.0006', '0.0006 − 0.0003 = 0.0003', '0.0003 − 0.0002 = 0.0001'],
    ])
    expect(k).toBe(4)
  })
})

describe('corner cubes', () => {
  it('a cube is its side three times over, and what stays is the cube less the one that left', () => {
    expect(count(cube(3))).toBe(27)
    expect(count(shell(3, 2))).toBe(19)
    expect(count(shell(4, 1))).toBe(63)
    expect(isCube(cube(1))).toBe(true)
    expect(isCube(shell(3, 2))).toBe(false)
    expect(isCube(rect(3, 3))).toBe(false)
  })

  it('a cube pops the next cube down and keeps a floor and two walls', () => {
    const { says, stays, left } = run('cubes', cube(4), { whole: true })
    expect(says).toEqual(['64 − 37 = 27', '27 − 19 = 8', '8 − 7 = 1'])
    expect(stays.every((x) => x.deep && !isCube(x))).toBe(true)
    expect(written(sumOf(left)!)).toBe('64 = 37 + 19 + 7 + 1')
  })

  it('the slider picks any smaller cube', () => {
    expect(sliderOf('cubes', cube(4))!.labels).toEqual(['27', '8', '1'])
    expect(written(sneezeOf('cubes', cube(4), 2)!.says)).toBe('64 − 56 = 8')
    expect(written(sneezeOf('cubes', cube(4), 2)!.back.says)).toBe('8 + 56 = 64')
  })

  it('what stays cannot sneeze, and a flat square is not a cube', () => {
    expect(sneezeOf('cubes', shell(3, 2))).toBeNull()
    expect(sneezeOf('cubes', rect(3, 3))).toBeNull()
  })

  it('below one it goes on in thousandths, a tenth of a block across, and ends at a thousandth', () => {
    const res = sneezeOf('cubes', cube(1))!
    expect(written(res.says)).toBe('1 − 0.271 = 0.729')
    expect(res.k).toBe(3)
    expect(count(res.as!)).toBe(1000)
    expect(cellOf(res.as!, 3)).toBeCloseTo(0.1)
    expect(sliderOf('cubes', cube(1))!.labels.slice(0, 2)).toEqual(['0.729', '0.512'])
    const { last, k } = run('cubes', cube(2))
    expect(valueOf(count(last), k)).toBeCloseTo(0.001)
    expect(sneezeOf('cubes', last, undefined, k)).toBeNull()
  })

  it('is labelled by its number, a whole cube with its sides', () => {
    expect(written(labelOf('cubes', cube(3)))).toBe('27')
    expect(written(sidesOf('cubes', cube(3))!)).toBe('3 × 3 × 3')
    expect(sidesOf('cubes', shell(3, 2))).toBeNull()
    expect(sidesOf('cubes', cube(9), 3)).toBeNull()
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
    expect(run('powers', [16], { whole: true }).says).toEqual(['16 ÷ 2 = 8', '8 ÷ 2 = 4', '4 ÷ 2 = 2', '2 ÷ 2 = 1'])
    expect(run('powers', [100], { whole: true }).says).toEqual(['100 ÷ 10 = 10', '10 ÷ 10 = 1'])
    expect(run('powers', [64], { whole: true, pick: (s) => (count(s) > 4 ? 4 : undefined) }).says).toEqual(['64 ÷ 4 = 16', '16 ÷ 4 = 4', '4 ÷ 2 = 2', '2 ÷ 2 = 1'])
  })
  it('below one, powers go on dividing by what they were divided by', () => {
    expect(run('powers', [4]).says).toEqual(['4 ÷ 2 = 2', '2 ÷ 2 = 1', '1 ÷ 2 = 0.5', '0.5 ÷ 2 = 0.25', '0.25 ÷ 2 = 0.125', '0.125 ÷ 2 = 0.0625'])
    expect(run('powers', [100]).says).toEqual(['100 ÷ 10 = 10', '10 ÷ 10 = 1', '1 ÷ 10 = 0.1', '0.1 ÷ 10 = 0.01', '0.01 ÷ 10 = 0.001', '0.001 ÷ 10 = 0.0001'])
    expect(run('powers', [25]).says.slice(2)).toEqual(['1 ÷ 5 = 0.2', '0.2 ÷ 5 = 0.04', '0.04 ÷ 5 = 0.008', '0.008 ÷ 5 = 0.0016'])
    // Thirds never come out even: 9 ends at one, unless he picks something that does.
    expect(run('powers', [9]).says).toEqual(['9 ÷ 3 = 3', '3 ÷ 3 = 1'])
    expect(sneezeOf('powers', [1], undefined, 0, 3)).toBeNull()
    expect(sliderOf('powers', [1], 0, 3)?.at).toBe(-1)
    expect(written(sneezeOf('powers', [1], 5, 0, 3)!.says)).toBe('1 ÷ 5 = 0.2')
    expect(sliderOf('powers', [1], 0, 10)).toEqual({ values: [2, 4, 5, 8, 10], at: 10, labels: ['÷ 2', '÷ 4', '÷ 5', '÷ 8', '÷ 10'] })
    const half = sneezeOf('powers', [1], 2)!
    expect([half.as, half.k, half.parts.length]).toEqual([rect(2, 5), 1, 2])
    expect(written(half.back.says)).toBe('2 × 0.5 = 1')
    expect(written(trailOf([2, 2, 2], 0.5)!)).toBe('4 = 2 × 2 × 2 × 0.5')
  })
  it('factors do not: a prime is where they end', () => {
    expect(run('factors', [12]).says).toEqual(['12 ÷ 2 = 6', '6 ÷ 2 = 3'])
    expect(sneezeOf('factors', [3])).toBeNull()
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
    expect(written(labelOf('rect', rect(5, 8)))).toBe('40')
    expect(written(sidesOf('rect', rect(5, 8))!)).toBe('5 × 8')
    expect(sidesOf('corner', rect(5, 5))).toBeNull()
    expect(written(labelOf('corner', rect(5, 5)))).toBe('25')
  })
})

describe('guesses and stars', () => {
  it('makes a decimal answer near misses in its own places', () => {
    const o = choicesFor(0.81, 2, 5)
    expect(o).toContain(0.81)
    expect(new Set(o).size).toBe(3)
    expect(o.every((x) => Number.isInteger(Math.round(x * 100 * 1e6) / 1e6))).toBe(true)
    expect(unitOf(2)).toBeCloseTo(0.1)
    expect(sumOf([0.81, 0.19])).toEqual([1, '=', 0.81, '+', 0.19])
  })
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
  const total = (st: RoadStage) => st.pieces.reduce((a, p) => a + valueOf(count(p.shape), p.k), 0)

  it('a whole chain lands, decimals and all, with every block, on the floor', () => {
    for (const chain of CHAINS) {
      const start = startsOf(chain)[0].shape
      const st = new RoadStage([start], spanOf(chain, start))
      let cur = st.pieces[0]
      let slowest = 0
      for (let i = 0; i < 40; i++) {
        const res = sneezeOf(chain, cur.shape, undefined, cur.k, cur.path.at(-1))
        if (!res) break
        if (res.as) cur = st.reform(cur, res.as, res.k)
        const made = st.sneeze(cur, res.parts, res.back, res.factor)
        cur = made[made.length - 1]
        // How long until it has landed (he taps fast: it must not hang in the air).
        let t = 0
        while (!cur.settled && t < 8) {
          st.step()
          t += STEP
        }
        slowest = Math.max(slowest, t)
      }
      settle(st)
      expect(slowest, `${chain} lands in time`).toBeLessThan(4)
      expect(total(st), chain).toBeCloseTo(count(start), 6)
      for (const p of st.pieces) {
        expect(p.settled, chain).toBe(true)
        expect(boxOf(p).y0, chain).toBeGreaterThan(-0.1 * cellOf(p.shape, p.k))
      }
      if (chain === 'corner' || chain === 'steps' || chain === 'powers') expect(cur.k, chain).toBe(MAX_K)
      st.free()
    }
  })

  it('a one goes back together from its hundredths', () => {
    const st = new RoadStage([rect(2, 2)], 2)
    let cur = st.pieces[0]
    for (let i = 0; i < 2; i++) {
      const res = sneezeOf('corner', cur.shape, undefined, cur.k)!
      if (res.as) cur = st.reform(cur, res.as, res.k)
      cur = st.sneeze(cur, res.parts, res.back).at(-1)!
      settle(st, 4)
    }
    expect([count(cur.shape), cur.k]).toEqual([81, 2])
    expect(boxOf(cur).x1 - boxOf(cur).x0).toBeCloseTo(0.9)
    st.grab(cur)
    const home = st.homeOf(cur)!
    st.holdAt(home.x0 + 0.5, home.y0 + 0.5)
    expect(st.overHome()).toBe(true)
    const one = st.joinBack()!
    expect([count(one.shape), one.k]).toEqual([100, 2])
    expect(total(st)).toBeCloseTo(4)
    st.free()
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
