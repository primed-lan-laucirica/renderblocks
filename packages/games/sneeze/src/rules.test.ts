import { describe, expect, it } from 'vitest'
import { chain, choices, innerSide, ROUNDS, sneeze, sqrt, squaresAround } from './rules'

const rings = (side: bigint, rule: 'ring' | 'big') => chain(side, rule).map((s) => `${s.whole}-${s.out}=${s.ring}`)

describe('the ring rule (Square on the Moon)', () => {
  it('sneezes out the square two sizes smaller: the show’s even and odd chains', () => {
    expect(rings(10n, 'ring')).toEqual(['100-64=36', '64-36=28', '36-16=20', '16-4=12'])
    expect(rings(9n, 'ring')).toEqual(['81-49=32', '49-25=24', '25-9=16', '9-1=8'])
  })
  it('4 and 1 have nothing to sneeze', () => {
    expect(sneeze(2n, 'ring')).toBeNull()
    expect(sneeze(1n, 'ring')).toBeNull()
  })
})

describe('the big sneeze (RATOT’s rounds)', () => {
  it('each round sneezes out the round before: exactly the video’s table', () => {
    const table = ROUNDS.slice(0, 12).map((r) => sneeze(r.side, 'big'))
    expect(table.map((s) => s!.ring)).toEqual([12n, 48n, 192n, 768n, 3072n, 5904n, 30000n, 120000n, 200000n, 280000n, 360000n, 3000000n])
    expect(ROUNDS[11].n).toBe(4000000n)
    // Round 18: 10,000,000,000 → 5,904,000,000 + 4,096,000,000.
    expect(ROUNDS[17].n).toBe(10000000000n)
    expect(sneeze(ROUNDS[17].side, 'big')!.ring).toBe(5904000000n)
  })
  it('round 12’s chain is twelve sneezes, down to 16 → 12 + 4', () => {
    const c = chain(2000n, 'big')
    expect(c).toHaveLength(12)
    expect(c[c.length - 1].ring).toBe(12n)
  })
  it('any other square sneezes out the square nearest half its side, with the hole in the middle', () => {
    expect(innerSide(3n, 'big')).toBe(1n) // Nine: 9 → 8 + 1
    expect(innerSide(5n, 'big')).toBe(3n) // 25 → 16 + 9
    expect(innerSide(6n, 'big')).toBe(4n) // 36 → 20 + 16, as tutorialmorphup's
    expect(innerSide(10n, 'big')).toBe(6n)
    for (let a = 1n; a < 300n; a++) {
      const b = innerSide(a, 'big')
      if (b === null) continue
      expect((a - b) % 2n).toBe(0n)
      expect(b >= 1n && b < a).toBe(true)
    }
    expect(innerSide(2n, 'big')).toBeNull()
  })
})

describe('numbers', () => {
  it('square roots, exactly, of huge numbers', () => {
    expect(sqrt(10000000000n)).toBe(100000n)
    expect(sqrt(99n)).toBeNull()
    expect(sqrt(999999999999999n * 999999999999999n)).toBe(999999999999999n)
    expect(squaresAround(50n)).toEqual([7n, 8n])
  })
  it('guess first: the right answer, the other rule’s, and a near miss — all different', () => {
    for (const a of [3n, 4n, 8n, 10n, 64n, 2000n]) {
      for (const rule of ['ring', 'big'] as const) {
        const c = choices(a, rule, 3)
        const s = sneeze(a, rule)
        if (!s) continue
        expect(c).toContain(s.ring)
        expect(new Set(c).size).toBe(c.length)
        expect(c.length).toBe(3)
        expect(c.every((x) => x > 0n)).toBe(true)
      }
    }
    // 64: the argument in the comments.
    expect(choices(8n, 'big', 1)).toEqual(expect.arrayContaining([48n, 28n]))
  })
})
