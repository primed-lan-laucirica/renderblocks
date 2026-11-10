import { describe, expect, it } from 'vitest'
import { check, filled, makeRun, matches, type Item } from './items'
import { canFollow, expression, join, num, Q, READS, soFar, statement } from './parse'
import { look, panOf } from './picture'
import { advanceQueue } from './queue'

const t = (s: string) => s.split(' ').filter(Boolean)
const value = (s: string) => {
  const e = expression(t(s))
  return e ? num(e.v) : null
}

describe('the line is read', () => {
  it('digits side by side are one numeral', () => {
    expect(join(['1', '2', '+', '3', '0', '5'])).toEqual(['12', '+', '305'])
    expect(join([])).toEqual([])
  })

  it('times and shared bind before plus and minus, left to right', () => {
    expect(value('2 + 3 × 4')).toBe(14)
    expect(value('2 × 3 + 4')).toBe(10)
    expect(value('20 − 6 ÷ 2')).toBe(17)
    expect(value('10 − 4 − 3')).toBe(3)
    expect(value('24 ÷ 4 ÷ 2')).toBe(3)
    expect(value('2 · 3 + 8 / 4')).toBe(8)
  })

  it('brackets first', () => {
    expect(value('( 2 + 3 ) × 4')).toBe(20)
    expect(value('2 × ( 3 + ( 4 − 1 ) )')).toBe(12)
    expect(value('( 7 )')).toBe(7)
  })

  it('amounts are exact', () => {
    expect(statement(t('1 ÷ 3 × 3 = 1'), true).truth).toBe(true)
    expect(statement(t('1 / 3 + 1 / 6 = 1 / 2'), true).truth).toBe(true)
    expect(expression(t('7 ÷ 2'))!.v).toEqual(Q(7, 2))
    expect(expression(t('6 ÷ 4'))!.v).toEqual({ p: 3, q: 2 })
  })

  it('what is not an expression is not read', () => {
    for (const bad of ['', '+', '3 +', '3 + + 2', '( 3 + 2', '3 )', '3 4', '( )', '5 ÷ 0', '× 3', '3 ( 4 )']) expect(expression(t(bad)), bad).toBeNull()
  })

  it('every relation', () => {
    const truth = (s: string) => statement(t(s), true).truth
    expect(truth('3 + 2 = 5')).toBe(true)
    expect(truth('5 = 3 + 2')).toBe(true)
    expect(truth('6 = 9')).toBe(false)
    expect(truth('4 < 7')).toBe(true)
    expect(truth('7 < 4')).toBe(false)
    expect(truth('7 > 4')).toBe(true)
    expect(truth('5 ≤ 5')).toBe(true)
    expect(truth('6 ≤ 5')).toBe(false)
    expect(truth('5 ≥ 5')).toBe(true)
    expect(truth('4 ≠ 7')).toBe(true)
    expect(truth('4 ≠ 4')).toBe(false)
    expect(truth('2 + 3 × 4 = 14')).toBe(true)
    expect(truth('( 2 + 3 ) × 4 = 20')).toBe(true)
  })

  it('a statement that is not whole is neither true nor false', () => {
    for (const s of ['3 + 2', '3 + 2 =', '= 5', '3 = 3 = 3', '3 + = 5', '5 ÷ 0 = 0']) {
      const st = statement(t(s), true)
      expect(st.truth, s).toBeNull()
    }
    expect(statement(t('3 + 2')).whole).toBe(true)
    expect(statement(t('3 + 2 =')).whole).toBe(false)
  })

  it('a line being written shows what it has so far', () => {
    expect(num(soFar(t('3 +'))!.v)).toBe(3)
    expect(num(soFar(t('( 3 + 2'))!.v)).toBe(5)
    expect(num(soFar(t('2 × ( 3 +'))!.v)).toBe(6)
    expect(soFar(t('+'))).toBeNull()
    const half = statement(t('3 + 2 = 4 +'))
    expect(num(half.left!.v)).toBe(5)
    expect(num(half.right!.v)).toBe(4)
    expect(half.whole).toBe(false)
    expect(half.truth).toBeNull()
    const twice = statement(t('3 = 3 = 4'))
    expect(num(twice.right!.v)).toBe(3)
    expect(twice.truth).toBeNull()
  })
})

describe('the picture', () => {
  const pan = (s: string) => panOf(expression(t(s)))
  it('a sum is piles side by side, in different colours', () => {
    const p = pan('3 + 2')
    expect(p.piles.map((x) => x.n)).toEqual([3, 2])
    expect(new Set(p.piles.map((x) => x.colour)).size).toBe(2)
    expect(p.weight).toBe(5)
  })
  it('a difference leaves outlines; a product is rows; a quotient is one share of several', () => {
    expect(pan('7 − 2').piles).toMatchObject([{ n: 7, ghost: 2 }])
    expect(pan('3 × 4').piles).toMatchObject([{ n: 12, cols: 4 }])
    const shares = pan('12 ÷ 3')
    expect(shares.piles.map((x) => x.n - (x.ghost ?? 0))).toEqual([4, 0, 0])
    expect(shares.weight).toBe(4)
  })
  it('an amount that is not whole ends in part of a bead; a big one is a card', () => {
    expect(pan('7 ÷ 2').piles).toMatchObject([{ n: 3, part: 0.5 }])
    expect(pan('1 / 2').piles).toMatchObject([{ n: 0, part: 0.5 }])
    expect(pan('9 × 9')).toMatchObject({ piles: [], card: '81', weight: 81 })
    expect(pan('3 − 5')).toMatchObject({ piles: [], weight: -2 })
  })
  it('what a pan weighs is what its solid beads come to', () => {
    for (const s of ['3 + 2', '7 − 2', '3 × 4', '12 ÷ 3', '2 + 3 × 4', '7 ÷ 2', '( 2 + 3 ) × 4', '10 − 4 − 3', '8']) {
      const p = pan(s)
      expect(p.piles.reduce((w, x) => w + x.n - (x.ghost ?? 0) + (x.part ?? 0), 0), s).toBeCloseTo(p.weight)
    }
  })
  it('the same picture has the same word', () => {
    const w = (s: string) => look(expression(t(s))!)
    expect(w('3 + 2')).toBe(w('2 + 3'))
    expect(w('3 × 4')).toBe(w('4 · 3'))
    expect(w('12 ÷ 3')).toBe(w('12 / 3'))
    expect(w('( 3 + 2 )')).toBe(w('3 + 2'))
    expect(w('5')).not.toBe(w('3 + 2'))
    expect(w('6 − 2')).not.toBe(w('4'))
    expect(w('6 − 2')).not.toBe(w('7 − 3'))
    expect(w('12 ÷ 3')).not.toBe(w('12 ÷ 4'))
  })
})

describe('write what you see', () => {
  const shown = t('3 + 2 = 5')
  it('any true line that looks like the picture, either way round', () => {
    for (const ok of ['3 + 2 = 5', '5 = 3 + 2', '2 + 3 = 5', '5 = 2 + 3', '( 3 + 2 ) = 5']) expect(matches(t(ok), shown), ok).toBe(true)
  })
  it('not a line that is false, unfinished, or of another picture', () => {
    for (const no of ['5 = 5', '3 + 2 = 6', '3 + 2', '3 + 2 =', '4 + 1 = 5', '3 + 2 < 5', '6 − 1 = 5', '']) expect(matches(t(no), shown), no).toBe(false)
  })
  it('a tipped beam can be written with any sign that is true of it', () => {
    const tipped = t('4 < 7')
    for (const ok of ['4 < 7', '7 > 4', '4 ≠ 7', '7 ≠ 4', '4 ≤ 7', '7 ≥ 4']) expect(matches(t(ok), tipped), ok).toBe(true)
    for (const no of ['4 > 7', '4 = 7', '7 < 4', '3 < 7', '4 < 8']) expect(matches(t(no), tipped), no).toBe(false)
  })
  it('times may be the cross or the dot', () => {
    expect(matches(t('3 · 4 = 12'), t('3 × 4 = 12'))).toBe(true)
    expect(matches(t('4 × 3 = 12'), t('3 × 4 = 12'))).toBe(true)
    expect(matches(t('2 × 6 = 12'), t('3 × 4 = 12'))).toBe(false)
  })
})

const ALL = READS
const SETS: string[][] = [['='], ['=', '+', '−'], ['=', '+', '−', '×', '·'], ['=', '+', '−', '×', '·', '÷', '/'], ['=', '+', '−', '×', '·', '÷', '/', '(', ')'], ALL, ['=', '+', '·', '/', '≠']]
const DIGITS = '0123456789'.split('')

describe('a mastery run', () => {
  it('eight items, four each way, taking turns', () => {
    for (const signs of SETS)
      for (let seed = 1; seed <= 40; seed++) {
        const run = makeRun(signs, seed)
        expect(run.map((i) => i.skill), `${signs.join('')} #${seed}`).toEqual(['write', 'make', 'write', 'make', 'write', 'make', 'write', 'make'])
        expect(new Set(run.map((i) => i.id)).size).toBe(8)
      }
  })

  it('the same seed gives the same run; another seed, another', () => {
    expect(makeRun(ALL, 7)).toEqual(makeRun(ALL, 7))
    expect(makeRun(ALL, 7).map((i) => i.id)).not.toEqual(makeRun(ALL, 8).map((i) => i.id))
  })

  it('uses only the signs he has, and every item can be answered with his tiles', () => {
    for (const signs of SETS)
      for (let seed = 1; seed <= 60; seed++)
        for (const item of makeRun(signs, seed)) {
          const where = `${item.id} with ${signs.join(' ')}`
          for (const tok of item.toks) expect(tok === '_' || /^\d+$/.test(tok) || signs.includes(tok), where).toBe(true)
          for (const tile of item.answer.flat()) expect(DIGITS.includes(tile) || signs.includes(tile), where).toBe(true)
          expect(check(item, item.answer), where).toBe(true)
          if (item.skill === 'make') {
            expect(item.toks.filter((x) => x === '_').length, where).toBe(item.wants.length)
            expect(item.wants.length === 1 || item.wants.length === 2, where).toBe(true)
          } else expect(statement(item.toks, true).truth, where).toBe(true)
        }
  })

  it('numbers stay small', () => {
    for (let seed = 1; seed <= 80; seed++)
      for (const item of makeRun(ALL, seed)) for (const tok of [...item.toks, ...item.answer.map((a) => a.join(''))]) if (/^\d+$/.test(tok)) expect(Number(tok), item.id).toBeLessThanOrEqual(36)
  })

  it('with every sign watched, a run shows more than one kind of sign', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const used = new Set(makeRun(ALL, seed).flatMap((i) => [...i.toks, ...i.answer.flat()]).filter((x) => ALL.includes(x)))
      expect(used.size, `#${seed}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('nothing to ask before he has a relation sign', () => {
    expect(makeRun([], 1)).toEqual([])
    expect(makeRun(['+'], 1)).toEqual([])
  })
})

describe('the answer check', () => {
  const gap: Item = { skill: 'make', id: 'make 3 + _ = 5', toks: t('3 + _ = 5'), wants: ['num'], answer: [['2']] }
  it('a gap takes whatever makes the line true', () => {
    expect(check(gap, [['2']])).toBe(true)
    expect(check(gap, [['1', '+', '1']])).toBe(true)
    expect(check(gap, [['3']])).toBe(false)
    expect(check(gap, [[]])).toBe(false)
    expect(check(gap, [])).toBe(false)
    expect(filled(gap, [['1', '2']])).toEqual(t('3 + 12 = 5'))
  })
  it('two gaps: both must be filled', () => {
    const fence: Item = { skill: 'make', id: 'x', toks: t('_ 2 + 3 _ × 4 = 20'), wants: ['sign', 'sign'], answer: [['('], [')']] }
    expect(check(fence, [['('], [')']])).toBe(true)
    expect(check(fence, [['('], []])).toBe(false)
    expect(check(fence, [[')'], ['(']])).toBe(false)
  })
  it('a sign gap takes any sign that is true', () => {
    const rel: Item = { skill: 'make', id: 'x', toks: t('4 _ 7'), wants: ['sign'], answer: [['<']] }
    for (const g of ['<', '≤', '≠']) expect(check(rel, [[g]]), g).toBe(true)
    for (const g of ['>', '≥', '=', '+', '5']) expect(check(rel, [[g]]), g).toBe(false)
  })
  it('write: his tiles are the whole line', () => {
    const w: Item = { skill: 'write', id: 'write 12 − 4 = 8', toks: t('12 − 4 = 8'), wants: [], answer: [] }
    expect(check(w, [['1', '2', '−', '4', '=', '8']])).toBe(true)
    expect(check(w, [['8', '=', '1', '2', '−', '4']])).toBe(true)
    expect(check(w, [['8', '=', '8']])).toBe(false)
    expect(check(w, [[]])).toBe(false)
  })
})

describe('which tile can come next', () => {
  /** Put the tiles down one by one; the ones the line refuses are left out. */
  const typed = (s: string) => t(s).reduce<string[]>((line, g) => (canFollow(line, g) ? [...line, g] : line), [])
  const next = (s: string) => READS.concat('5').filter((g) => canFollow(t(s), g))
  const SIGNS = ['+', '−', '×', '·', '÷', '/']
  const RELS = ['=', '<', '>', '≤', '≥', '≠']

  it('an empty line starts with a number or an opening bracket', () => {
    expect(next('')).toEqual(['(', '5'])
  })

  it('a sign of arithmetic needs an amount before it, so two never sit side by side', () => {
    expect(next('3')).toEqual([...RELS.slice(0, 1), ...SIGNS, ...RELS.slice(1), '5'])
    for (const a of SIGNS) for (const b of [...SIGNS, ...RELS, ')']) expect(canFollow(['3', a], b), `3 ${a} ${b}`).toBe(false)
    expect(next('3 +')).toEqual(['(', '5'])
    expect(typed('3 + + × 5')).toEqual(t('3 + 5'))
  })

  it('one relation sign to a line', () => {
    expect(next('3 + 5 =')).toEqual(['(', '5'])
    for (const r of RELS) expect(canFollow(t('3 + 5 = 8'), r), r).toBe(false)
    expect(canFollow(t('3 + 5 = 8'), '+')).toBe(true)
    expect(typed('3 + 5 = 8 = = < 2')).toEqual(t('3 + 5 = 8 2'))
    expect(typed('= 3 = = 3')).toEqual(t('3 = 3'))
  })

  it('a bracket closes only what was opened, and only after an amount', () => {
    expect(canFollow(t('3'), ')')).toBe(false)
    expect(canFollow(t('('), ')')).toBe(false)
    expect(canFollow(t('( 3 +'), ')')).toBe(false)
    expect(canFollow(t('( 3 + 4'), ')')).toBe(true)
    expect(canFollow(t('( ( 3 )'), ')')).toBe(true)
    expect(canFollow(t('( 3 )'), ')')).toBe(false)
    expect(canFollow(t('( 3 + 4'), '=')).toBe(false)
    expect(canFollow(t('( 3 + 4 )'), '=')).toBe(true)
  })

  it('no number hard against a bracket, either side', () => {
    expect(canFollow(t('3'), '(')).toBe(false)
    expect(canFollow(t('( 3 )'), '(')).toBe(false)
    expect(canFollow(t('( 3 )'), '5')).toBe(false)
    expect(next('( 3 ) ×')).toEqual(['(', '5'])
  })

  it('whatever it lets through, the reader can read', () => {
    // Every line of up to seven tiles the rule allows: once it ends in an amount with its brackets closed, the whole of it is read.
    let read = 0
    const grow = (line: string[], left: number): void => {
      const last = line[line.length - 1]
      if ((last === '3' || last === ')') && canFollow(line, '+') && !canFollow(line, ')')) {
        const toks = join(line)
        if (toks.some((g) => RELS.includes(g))) expect(statement(toks, true).whole, line.join(' ')).toBe(true)
        else expect(expression(toks), line.join(' ')).not.toBeNull()
        read++
      }
      if (left === 0) return
      for (const g of ['3', '+', '×', '=', '<', '(', ')']) if (canFollow(line, g)) grow([...line, g], left - 1)
    }
    for (const g of ['3', '(']) grow([g], 6)
    expect(read).toBeGreaterThan(100)
  })

  it('every line a run asks him to write can be written', () => {
    for (let seed = 1; seed <= 200; seed++)
      for (const item of makeRun(READS, seed)) {
        if (item.skill !== 'write') continue
        expect(typed(item.answer[0].join(' ')), item.id).toEqual(item.answer[0])
        expect(check(item, [typed(item.answer[0].join(' '))]), item.id).toBe(true)
      }
  })
})

describe('the run rule', () => {
  it('right first time retires; a miss comes back three places later', () => {
    expect(advanceQueue([1, 2, 3, 4, 5, 6], false)).toEqual([2, 3, 4, 5, 6])
    expect(advanceQueue([1, 2, 3, 4, 5, 6], true)).toEqual([2, 3, 4, 1, 5, 6])
    expect(advanceQueue([1, 2], true)).toEqual([2, 1])
    expect(advanceQueue([1], true)).toEqual([1])
    expect(advanceQueue([1], false)).toEqual([])
  })
})
