import { describe, expect, it } from 'vitest'
import { chain, choices, innerSide, norm, ROUNDS, show, sneeze, sqrt, squaresAround, wears } from './rules'

const rings = (side: bigint, rule: 'ring' | 'big') => chain(side, rule).map((s) => `${show(s.whole, s.k)}-${show(s.out, s.k)}=${show(s.ring, s.k)}`)

describe('the ring rule (Square on the Moon)', () => {
  it('sneezes out the square two sizes smaller: the show’s even and odd chains', () => {
    expect(rings(10n, 'ring').slice(0, 4)).toEqual(['100-64=36', '64-36=28', '36-16=20', '16-4=12'])
    expect(rings(9n, 'ring').slice(0, 4)).toEqual(['81-49=32', '49-25=24', '25-9=16', '9-1=8'])
  })
  it('below 4, two tenths smaller, then two hundredths', () => {
    const c = rings(2n, 'ring')
    expect(c[0]).toBe('4-3.24=0.76')
    expect(c[9]).toBe('0.04-0.0324=0.0076')
    // (0.0004 can't: 0.0004 − 0.000324 has six places.)
    expect(c[c.length - 1]).toBe('0.0016-0.0004=0.0012')
    expect(c).toHaveLength(18)
  })
})

describe('the big sneeze', () => {
  it('halves the side at every size, so a quarter flies out and three quarters stay', () => {
    for (const r of ROUNDS) {
      const s = sneeze(r.side, 'big')!
      expect(s.outSide * 2n).toBe(r.side)
      expect(s.out * 4n).toBe(s.whole)
    }
    expect(rings(8n, 'big')[0]).toBe('64-16=48')
    expect(rings(100n, 'big')[0]).toBe('10,000-2,500=7,500')
    expect(rings(100000n, 'big')[0]).toBe('10,000,000,000-2,500,000,000=7,500,000,000')
  })
  it('round 12 halves all the way to 4, then on into decimals', () => {
    expect(rings(2000n, 'big')).toEqual([
      '4,000,000-1,000,000=3,000,000',
      '1,000,000-250,000=750,000',
      '250,000-62,500=187,500',
      '62,500-15,876=46,624', // 250 → 126 (125 would put the hole off centre)
      '15,876-4,096=11,780', // 126 → 64 (63 would put the hole off centre)
      '4,096-1,024=3,072',
      '1,024-256=768',
      '256-64=192',
      '64-16=48',
      '16-4=12',
      '4-1=3',
      '1-0.36=0.64',
      '0.36-0.16=0.20',
      '0.16-0.04=0.12',
      '0.04-0.01=0.03',
      '0.01-0.0036=0.0064',
      '0.0036-0.0016=0.0020',
      '0.0016-0.0004=0.0012',
      '0.0004-0.0001=0.0003',
    ])
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

describe('decimals', () => {
  it('a square stops at 0.0001', () => {
    expect(sneeze(1n, 'big', 2)).toBeNull()
    expect(sneeze(1n, 'ring', 2)).toBeNull()
    expect(sneeze(2n, 'ring', 2)).toBeNull()
    expect(rings(3n, 'big').slice(-1)[0]).toBe('0.0004-0.0001=0.0003')
  })
  it('written as they are: no .00 on a whole one, the hundredths kept on a decimal', () => {
    expect(show(300n, 1)).toBe('3')
    expect(show(400n, 2)).toBe('0.04')
    expect(show(300n, 3)).toBe('0.0003')
    expect(show(20n, 1)).toBe('0.20')
    expect(show(36n, 2)).toBe('0.0036')
    expect(show(12345n, 0)).toBe('12,345')
    expect(norm(10n, 1)).toEqual({ side: 1n, k: 0 })
    expect(norm(6n, 2)).toEqual({ side: 6n, k: 2 })
  })
  it('a decimal wears the colours of its digits; a whole ring in hundredths, its own', () => {
    expect(wears(36n, 1)).toEqual({ n: 36n, per: 1 })
    expect(wears(300n, 1)).toEqual({ n: 3n, per: 100 })
    expect(wears(64n, 1)).toEqual({ n: 64n, per: 1 })
  })
  it('the sum of every piece is the start, exactly', () => {
    for (const [side, rule] of [[2000n, 'big'], [10n, 'ring'], [9n, 'ring']] as const) {
      const c = chain(side, rule)
      let total = 0n
      // In millionths (the finest a ring is counted in is thousandths of a block).
      for (const s of c) total += s.ring * 100n ** BigInt(3 - s.k)
      const last = c[c.length - 1]
      total += last.out * 100n ** BigInt(3 - last.k)
      expect(total).toBe(side * side * 1000000n)
    }
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
    // Decimals: in the sneeze's hundredths.
    expect(choices(1n, 'big', 2)).toContain(64n)
    // 64: the argument in the comments.
    expect(choices(8n, 'big', 1)).toEqual(expect.arrayContaining([48n, 28n]))
  })
})
