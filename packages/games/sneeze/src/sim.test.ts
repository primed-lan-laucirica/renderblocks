import { beforeAll, describe, expect, it } from 'vitest'
import { chain, type Rule } from './rules'
import { initPhysics, overlap, Stage, START, STEP } from './sim'

beforeAll(async () => {
  await initPhysics()
})

const run = (s: Stage, seconds: number) => {
  for (let i = 0; i < seconds / STEP; i++) s.step()
}

/** Sneeze the whole chain, waiting for each square to land; report each landing. */
function play(side: bigint, rule: Rule, legs = 0) {
  const s = new Stage(side, () => legs)
  const landings: { gap: number; size: number; restY: number; flight: number; sizeRatio: number }[] = []
  for (;;) {
    const r = s.sneeze(rule)
    if (!r) break
    let t = 0
    while (!r.out.settled && t < 12) {
      s.step()
      t += STEP
    }
    // How far clear of its ring it came down (in its ring's sizes), and that it rests on something.
    const gap = (r.out.cur.x - r.out.size / 2 - (r.ring.cur.x + r.ring.size / 2)) / r.ring.size
    landings.push({ gap, size: r.out.size, restY: r.out.cur.y / r.out.size, flight: t, sizeRatio: r.out.size / r.ring.size })
  }
  return { s, landings }
}

describe('a sneeze', () => {
  it('turns the square into a ring and a square, the same number in all', () => {
    const s = new Stage(10n)
    const r = s.sneeze('ring')!
    expect(r.ring.n + r.out.n).toBe(100n)
    expect(r.ring.n).toBe(36n)
    expect(s.current).toBe(r.out)
    expect(s.pieces).toHaveLength(2)
  })

  for (const [side, rule, legs] of [
    [10n, 'ring', 0],
    [9n, 'ring', 0],
    [2n, 'ring', 0.13],
    [2000n, 'big', 0],
    [100000n, 'big', 0],
    [10n, 'big', 0],
    [10n, 'ring', 0.13],
    [2000n, 'big', 0.13],
    [1000n, 'ring', 0.13],
  ] as [bigint, Rule, number][]) {
    it(`${side * side} (${rule}${legs ? ', standing on legs' : ''}): every square lands clear of its ring and comes to rest on the floor, at every size`, () => {
      const { s, landings } = play(side, rule, legs)
      expect(landings).toHaveLength(chain(side, rule).length)
      for (const l of landings) {
        expect(l.flight, 'settles').toBeLessThan(12)
        // Clear of the ring (not dropped back on it), not flung miles away.
        expect(l.gap).toBeGreaterThan(0)
        expect(l.gap).toBeLessThan(4)
        // Resting on the floor: its centre half its side up (or a little more, tilted on a neighbour).
        expect(l.restY).toBeGreaterThan(0.45 + legs * 0.9)
        expect(l.restY).toBeLessThan(1.2)
      }
      // Nothing overlaps anything else at the end.
      for (const p of s.pieces) for (const q of s.pieces) if (p !== q && !(p.hole && q.hole)) expect(overlap(p.cur, p.size * 0.97, q.cur, q.size * 0.97) && !(p.from === q || q.from === p)).toBe(false)
      for (const p of s.pieces) expect(Number.isFinite(p.cur.x + p.cur.y + p.cur.a)).toBe(true)
    })
  }

  for (const [side, rule] of [[10n, 'big'], [10n, 'ring'], [2n, 'big']] as [bigint, Rule][]) {
    it(`${side * side} (${rule}): unsneezed all the way back, each square put back in its ring`, () => {
      const { s } = play(side, rule)
      const sneezes = chain(side, rule).length
      for (let i = 0; i < sneezes; i++) {
        const p = s.current
        expect(s.grab()).toBe(true)
        // Carried over to its ring, through the ring's side, and held in the middle.
        for (let t = 0; t < 30; t++) {
          const f = (t + 1) / 30
          s.holdAt(p.cur.x + (p.from!.cur.x - p.cur.x) * f, p.cur.y + (p.from!.cur.y - p.cur.y) * f)
          s.step()
        }
        expect(s.fits()).toBe(true)
        const whole = s.unsneeze()!
        expect(whole.hole).toBe(0n)
        run(s, 2)
      }
      expect(s.pieces).toHaveLength(1)
      expect(s.current.side).toBe(side)
      expect(s.current.k).toBe(0)
      expect(s.current.n).toBe(side * side)
      expect(s.current.from).toBeNull()
      expect(s.unsneeze()).toBeNull()
      // And it sneezes again, the same as the first time.
      expect(s.sneeze(rule)!.s.ring).toBe(chain(side, rule)[0].ring)
    })
  }

  it('dropped anywhere but its ring, it lands again and nothing changes', () => {
    const s = new Stage(10n)
    const r = s.sneeze('big')!
    run(s, 4)
    s.grab()
    expect(s.fits()).toBe(false)
    for (let t = 0; t < 20; t++) {
      s.holdAt(r.out.cur.x + 5, 12)
      s.step()
    }
    expect(s.fits()).toBe(false)
    s.release({ x: 4, y: 0 })
    let t = 0
    while (!r.out.settled && t < 12) {
      s.step()
      t += STEP
    }
    expect(r.out.settled).toBe(true)
    expect(r.out.cur.y / r.out.size).toBeLessThan(1.2)
    expect(s.pieces).toHaveLength(2)
    expect(s.current).toBe(r.out)
  })

  it('below 4 it sneezes on in tenths and hundredths, down to 0.0001, which stays put', () => {
    const { s } = play(2n, 'big')
    expect(s.current.k).toBe(2)
    expect(s.current.n).toBe(1n) // 0.0001
    expect(s.current.size).toBeCloseTo(START / 200)
    expect(s.sneeze('big')).toBeNull()
    expect(s.sneeze('ring')).toBeNull()
    const count = s.pieces.length
    run(s, 1)
    expect(s.pieces).toHaveLength(count)
  })
})
