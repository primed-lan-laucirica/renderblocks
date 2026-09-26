import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULTS } from './config'
import { enumerate, isMember, isPrime, notation, spawnNumbers, type SetId } from './sets'
import { fallSeconds, pickScream, type ScreamClip } from './screams'
import { bigSide, blockShape } from './shapes'
import { initPhysics, Sim } from './sim'

const trialPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

describe('isPrime', () => {
  it('matches trial division below 20,000 and at sampled points up to 10^9', () => {
    for (let n = -5; n < 20_000; n++) expect(isPrime(n)).toBe(trialPrime(n))
    for (let n = 999_999_000; n < 999_999_400; n++) expect(isPrime(n)).toBe(trialPrime(n))
  })

  it('is exact near 10^12, including strong pseudoprimes', () => {
    expect(isPrime(999_999_999_989)).toBe(true) // largest prime below 10^12
    expect(isPrime(1_000_000_000_039)).toBe(true) // smallest prime above 10^12
    expect(isPrime(1_000_000_000_000)).toBe(false)
    expect(isPrime(999_999_999_999)).toBe(false)
    expect(isPrime(3_215_031_751)).toBe(false) // strong pseudoprime to bases 2, 3, 5 and 7
    expect(isPrime(1_000_000_007)).toBe(true)
  })
})

describe('set membership', () => {
  it('classifies each set', () => {
    expect([-3, -2, 0, 7].map((n) => isMember('odds', n))).toEqual([true, false, false, true])
    expect([-2, 0, 3].map((n) => isMember('evens', n))).toEqual([true, true, false])
    expect([0, 1, 4, 8, 1_000_000_000_000].map((n) => isMember('squares', n))).toEqual([false, true, true, false, true])
    expect([1, 3, 6, 7, 10, 500_000_500_000].map((n) => isMember('triangular', n))).toEqual([true, true, true, false, true, true])
  })

  it('classifies powers of 10 and 2 exactly', () => {
    expect([1, 10, 100, 1_000_000_000_000, 0, 20, 110, 999].map((n) => isMember('pow10', n))).toEqual([
      true, true, true, true, false, false, false, false,
    ])
    expect([1, 2, 1024, 549_755_813_888, 0, 6, 1000].map((n) => isMember('pow2', n))).toEqual([
      true, true, true, true, false, false, false,
    ])
  })

  it('gives club and power blocks their notation', () => {
    expect(notation('squares', 49)).toEqual({ base: '7', sup: '2' })
    expect(notation('squares', 1_000_000_000_000)).toEqual({ base: '1,000,000', sup: '2' })
    expect(notation('triangular', 10)).toEqual({ base: 'T', sub: '4' })
    expect(notation('pow10', 1000)).toEqual({ base: '10', sup: '3' })
    expect(notation('pow10', 1)).toEqual({ base: '10', sup: '0' })
    expect(notation('pow2', 32)).toEqual({ base: '2', sup: '5' })
    expect(notation('squares', 50)).toBeNull()
    expect(notation('integers', 49)).toBeNull()
  })

  it('enumerates small ranges and gives up past the limit', () => {
    expect(enumerate('primes', 1, 30, 30)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29])
    expect(enumerate('squares', -10, 50, 30)).toEqual([1, 4, 9, 16, 25, 36, 49])
    expect(enumerate('integers', 1, 100, 30)).toBeNull()
  })
})

describe('spawnNumbers', () => {
  const check = (set: SetId, from: number, to: number) => {
    const out = spawnNumbers(set, { from, to })
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out).toEqual([...out].sort((a, b) => a - b))
    expect(new Set(out).size).toBe(out.length)
    for (const v of out) {
      expect(isMember(set, v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(Math.min(from, to))
      expect(v).toBeLessThanOrEqual(Math.max(from, to))
    }
    return out
  }

  it('spawns every member of small ranges', () => {
    expect(check('integers', 1, 25)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1))
    expect(check('primes', 1, 100)).toHaveLength(25)
  })

  it('keeps small numbers, round values and the ends for -3 to a billion', () => {
    const out = check('integers', -3, 1_000_000_000)
    for (let n = -3; n <= 25; n++) expect(out).toContain(n)
    for (let k = 2; k <= 9; k++) expect(out).toContain(10 ** k)
    expect(out).toContain(30)
  })

  it('keeps one block per power of ten even for ±10^12 (spec 14.4)', () => {
    const out = check('integers', -1_000_000_000_000, 1_000_000_000_000)
    expect(out).toHaveLength(60)
    for (let k = 2; k <= 12; k++) {
      expect(out).toContain(10 ** k)
      expect(out).toContain(-(10 ** k))
    }
    expect(out).toContain(0)
  })

  it('spawns every power of 10 and of 2 in range', () => {
    expect(check('pow10', 1, 1_000_000_000_000)).toEqual(Array.from({ length: 13 }, (_, k) => 10 ** k))
    expect(check('pow2', 1, 1_000_000_000_000)).toEqual(Array.from({ length: 40 }, (_, k) => 2 ** k))
    expect(check('pow2', -3, 1000)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512])
    expect(check('pow10', 5, 5000)).toEqual([10, 100, 1000])
  })

  it('handles every set and preset', () => {
    for (const set of ['integers', 'odds', 'evens', 'primes', 'squares', 'triangular', 'pow10', 'pow2'] as SetId[]) {
      for (const [from, to] of [
        [1, 10],
        [1, 25],
        [1, 100],
        [1, 1000],
        [-3, 1_000_000],
        [-3, 1_000_000_000],
        [1, 1_000_000_000_000],
      ]) {
        const out = check(set, from, to)
        expect(out.length).toBeGreaterThan(0)
      }
    }
    expect(check('primes', 1, 1_000_000_000_000)).toContain(999_999_999_989)
  })
})

describe('block shapes', () => {
  it('uses the true Blocks-game layout up to 100', () => {
    expect(blockShape(7)).toMatchObject({ w: 1, h: 7 })
    expect(blockShape(4)).toMatchObject({ w: 2, h: 2 })
    expect(blockShape(25)).toMatchObject({ w: 2, h: 13 })
    expect(blockShape(100)).toMatchObject({ w: 10, h: 10 })
    for (const n of [1, 9, 25, 37, 64, 100]) {
      const s = blockShape(n)
      expect(s.cubes).toHaveLength(n)
      const area = s.rects.reduce((sum, r) => sum + r.w * r.h, 0)
      expect(area).toBeCloseTo(n) // the collider covers exactly the cubes
    }
  })

  it('grows on a log scale above 100 with equal area and no shrinking', () => {
    expect(bigSide(1_000_000_000)).toBeCloseTo(31)
    for (const n of [150, 999, 1000, 1e6, 1e12]) {
      const area = blockShape(n).rects.reduce((sum, r) => sum + r.w * r.h, 0)
      expect(area).toBeCloseTo(bigSide(n) ** 2, 5)
    }
    let last = 0
    for (const n of [1, 10, 50, 100, 101, 500, 999, 1000, 1e5, 1e9, 1e12]) {
      const area = blockShape(n).rects.reduce((sum, r) => sum + r.w * r.h, 0)
      expect(area).toBeGreaterThanOrEqual(last)
      last = area
    }
  })

  it('draws Square Club members as squares and Step Squad members as staircases', () => {
    expect(blockShape(16, 'square')).toMatchObject({ w: 4, h: 4 })
    expect(blockShape(81, 'square')).toMatchObject({ w: 9, h: 9 })
    expect(blockShape(10, 'steps')).toMatchObject({ w: 4, h: 4 })
    expect(blockShape(91, 'steps')).toMatchObject({ w: 13, h: 13 })
    const area = (s: ReturnType<typeof blockShape>) => s.rects.reduce((sum, r) => sum + r.w * r.h, 0)
    for (const n of [1, 3, 6, 10, 15, 21, 28, 91]) {
      const s = blockShape(n, 'steps')
      expect(s.cubes).toHaveLength(n)
      expect(area(s)).toBeCloseTo(n)
      // Rising to the right: the tallest column is the rightmost.
      const tallestX = Math.max(...s.cubes.filter((c) => c.cy === Math.max(...s.cubes.map((d) => d.cy))).map((c) => c.cx))
      expect(tallestX).toBeCloseTo(s.w / 2 - 0.5)
    }
    for (const n of [121, 961]) {
      expect(area(blockShape(n, 'square'))).toBeCloseTo(bigSide(n) ** 2, 5)
      expect(blockShape(n, 'square').w).toBeCloseTo(blockShape(n, 'square').h)
    }
    for (const n of [5050, 500_000_500_000]) expect(area(blockShape(n, 'steps'))).toBeCloseTo(bigSide(n) ** 2, 5)
    // A staircase's notation sits on its steps, not on the stepped edge.
    for (const n of [10, 91, 5050, 500_500]) {
      const s = blockShape(n, 'steps')
      expect(s.cubes.some((c) => Math.abs(c.cx - s.mark.x) <= c.w / 2 && Math.abs(c.cy - s.mark.y) <= c.h / 2)).toBe(true)
    }
    // The style only changes club members; 16 in an Integers battle keeps its Blocks shape.
    expect(blockShape(16)).toMatchObject({ w: 2, h: 8 })
  })

  it('stands every part of a block over 100 on the same floor', () => {
    for (const n of [128, 150, 199, 256, 512, 999]) {
      const s = blockShape(n)
      const bottom = Math.min(...s.rects.map((r) => r.cy - r.h / 2))
      // The hundred-squares and the leftover both reach the floor.
      const onFloor = s.rects.filter((r) => Math.abs(r.cy - r.h / 2 - bottom) < 1e-9)
      expect(onFloor.reduce((sum, r) => sum + r.w, 0)).toBeCloseTo(s.w)
    }
  })

  it('gives negatives the shape of their magnitude, and zero a 1×1 frame', () => {
    expect(blockShape(-25)).toMatchObject({ w: 2, h: 13 })
    expect(blockShape(0)).toMatchObject({ w: 1, h: 1, kind: 'zero' })
  })
})

describe('physics', () => {
  beforeAll(() => initPhysics())

  it('a fresh battle does not crumble', () => {
    const sim = new Sim(spawnNumbers('integers', { from: 1, to: 25 }), DEFAULTS)
    const { x0, x1 } = sim.platform
    for (let i = 0; i < 60 * 3; i++) sim.step()
    expect(sim.platform).toMatchObject({ x0, x1 })
    sim.free()
  })

  it('a fresh battle stands still on the platform', () => {
    for (const values of [
      spawnNumbers('integers', { from: 1, to: 25 }),
      spawnNumbers('integers', { from: -3, to: 1e9 }),
      spawnNumbers('pow2', { from: 1, to: 1e12 }),
      spawnNumbers('integers', { from: 1, to: 1000 }),
    ]) {
      const sim = new Sim(values, DEFAULTS)
      for (let i = 0; i < 60 * 5; i++) sim.step()
      expect(sim.alive()).toHaveLength(values.length)
      for (const b of sim.blocks) {
        expect(Number.isFinite(b.cur.x) && Number.isFinite(b.cur.y)).toBe(true)
        expect(b.cur.y).toBeCloseTo(b.shape.h / 2, 1)
      }
      sim.free()
    }
  })

  it('dragging a block into the lava puts it out, and it is removed', () => {
    const sim = new Sim([1, 2, 3], DEFAULTS)
    const b = sim.blocks[2]
    const edgeBefore = sim.platform.x1
    sim.startGrab(b, b.cur.x, b.cur.y)
    sim.moveGrab(sim.platform.x1 + 3, 3) // off the end first...
    for (let i = 0; i < 60; i++) sim.step()
    sim.moveGrab(sim.platform.x1 + 3, sim.lavaY - 5) // ...then down into the lava
    let sizzled = false
    for (let i = 0; i < 60 * 4 && !sizzled; i++) sizzled = sim.step().sizzles.includes(b)
    expect(sizzled).toBe(true)
    for (let i = 0; i < 60 * 3; i++) sim.step()
    expect(b.removed).toBe(true)
    expect(sim.alive()).toHaveLength(2)
    // The empty right end crumbled back toward the 2, keeping the margin.
    const two = sim.blocks[1]
    expect(sim.platform.x1).toBeLessThan(edgeBefore)
    expect(sim.platform.x1).toBeGreaterThanOrEqual(two.cur.x + two.shape.w / 2 + 3 - 0.01)
    expect(sim.platform.x1).toBeLessThan(two.cur.x + two.shape.w / 2 + 3 + 1.01)
    sim.free()
  })

  it('when every block falls, the last one into the lava is the winner', () => {
    const sim = new Sim([1, 2], DEFAULTS)
    const pushOff = (b: (typeof sim.blocks)[number]) => {
      sim.startGrab(b, b.cur.x, b.cur.y)
      sim.moveGrab(sim.platform.x1 + 3, 3)
      for (let i = 0; i < 60; i++) sim.step()
      sim.moveGrab(sim.platform.x1 + 3, sim.lavaY - 5)
      for (let i = 0; i < 60 * 4 && b.outAt === null; i++) sim.step()
    }
    const [one, two] = sim.blocks
    pushOff(two)
    expect(sim.lastOut()).toBe(two)
    pushOff(one)
    expect(sim.alive()).toHaveLength(0)
    expect(sim.lastOut()).toBe(one)
    sim.free()
  })

  it('a fling rises no more than about flingApex block sizes', () => {
    const sim = new Sim([5], DEFAULTS)
    const b = sim.blocks[0]
    b.body.setLinvel({ x: 0, y: 500 }, true)
    sim.startGrab(b, b.cur.x, b.cur.y)
    sim.endGrab()
    const start = b.cur.y
    let top = start
    for (let i = 0; i < 60 * 3; i++) {
      sim.step()
      top = Math.max(top, b.cur.y)
    }
    expect(top - start).toBeLessThanOrEqual(DEFAULTS.flingApex * b.shape.L + 0.01)
    sim.free()
  })
})

describe('screams', () => {
  const lengths = [1, 1.5, 2, 3, 4, 5, 6, 8]
  const clips: ScreamClip[] = ['aah', 'noo', 'wait'].flatMap((type) =>
    lengths.map((seconds) => ({ name: `${type}_${seconds}`, type, seconds })),
  )
  const lasts = (c: { name: string; rate: number }) => clips.find((x) => x.name === c.name)!.seconds / c.rate

  it('predicts the fall time to the lava', () => {
    expect(fallSeconds(0, 0, -8, 4)).toBeCloseTo(2) // ½·4·t² = 8
    expect(fallSeconds(3, 2, -5, 4)).toBeGreaterThan(fallSeconds(3, 0, -5, 4)) // thrown up: longer
  })

  it('lasts the whole fall, ending just after impact', () => {
    // Falls every clip set can cover within the ±15% nudge (longer ones: next test).
    for (const fall of [0.8, 1.3, 2.2, 3.7, 5.5]) {
      for (const pitch of [0.7, 1, 1.35]) {
        const c = pickScream(clips, fall, pitch, 0)!
        expect(lasts(c)).toBeGreaterThanOrEqual(fall)
        expect(lasts(c)).toBeLessThan(fall + 1.2)
        expect(c.rate).toBeGreaterThanOrEqual(pitch * 0.85 - 1e-9)
        expect(c.rate).toBeLessThanOrEqual(pitch * 1.15 + 1e-9)
      }
    }
  })

  it('rotates through the scream types', () => {
    const types = [0, 1, 2, 3].map((turn) => pickScream(clips, 2, 1, turn)!.name.split('_')[0])
    expect(types).toEqual(['aah', 'noo', 'wait', 'aah'])
  })

  it('slows the longest scream down for a fall longer than any clip', () => {
    const c = pickScream(clips, 12, 1, 0)!
    expect(c.name.endsWith('_8')).toBe(true)
    expect(c.rate).toBeLessThan(1)
  })
})

