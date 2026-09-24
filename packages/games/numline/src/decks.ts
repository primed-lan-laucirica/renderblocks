export type DeckId =
  | 'addsub10'
  | 'addsub20'
  | 'addsub100'
  | 'decMirror'
  | 'decTenths'
  | 'decOnes'
  | 'times'
  | 'divide'

export interface Card {
  a: number
  op: '+' | '−' | '×' | '÷'
  b: number
  answer: number
}

export const DECKS: Array<{ id: DeckId; label: string }> = [
  { id: 'addsub10', label: 'Add & Subtract to 10' },
  { id: 'addsub20', label: 'Add & Subtract to 20' },
  { id: 'addsub100', label: 'Add & Subtract to 100' },
  { id: 'decMirror', label: 'Decimals: Halves & Quarters' },
  { id: 'decTenths', label: 'Decimals: Tenths' },
  { id: 'decOnes', label: 'Decimals: Ones & Tenths' },
  { id: 'times', label: 'Times Tables 1–12' },
  { id: 'divide', label: 'Divide 1–12' },
]

function addSub(max: number): Card[] {
  const out: Card[] = []
  for (let a = 0; a <= max; a++) {
    for (let b = 0; b <= max; b++) {
      if (a + b <= max) out.push({ a, op: '+', b, answer: a + b })
      // Subtraction never goes negative — the minuend is the larger number.
      if (a >= b) out.push({ a, op: '−', b, answer: a - b })
    }
  }
  return out
}

/**
 * Decimal cards are built in whole TENTHS and divided at the end, so every
 * value is exactly one decimal place and prints cleanly — never 0.30000000004.
 */
function tenthsCard(A: number, op: '+' | '−', B: number): Card {
  return { a: A / 10, op, b: B / 10, answer: (op === '+' ? A + B : A - B) / 10 }
}

/**
 * The quarters level: every number on a card — both operands AND the
 * answer — is a whole number or ends in .25, .5 or .75. Cards are built in
 * integer quarters and divided at the end; quarters are exact in binary, so
 * nothing prints as 2.4999999.
 */
const q = (n: number) => n / 4
const isQuarter = (v: number) => Number.isInteger(v * 4)
const hasDecimal = (...vs: number[]) => vs.some((v) => !Number.isInteger(v))

/** An even spread of `n` items across `list`, fixed rather than random. */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)])
}

function quartersDeck(): Card[] {
  const add: Card[] = []
  const sub: Card[] = []
  const timesWhole: Card[] = []
  const timesHalves: Card[] = []
  const div: Card[] = []
  // Operands 0.25 – 5, at least one of them a decimal.
  for (let A = 1; A <= 20; A++)
    for (let B = 1; B <= 20; B++) {
      const a = q(A)
      const b = q(B)
      if (!hasDecimal(a, b)) continue
      if (A + B <= 32) add.push({ a, op: '+', b, answer: q(A + B) }) // 2.5 + 2.5 = 5
      if (A > B) sub.push({ a, op: '−', b, answer: q(A - B) }) //       3.75 − 1.5 = 2.25
    }
  // A decimal times a whole number: 2.5 × 2 = 5, 1.25 × 4 = 5, 0.75 × 3 = 2.25.
  for (let A = 1; A <= 16; A++)
    for (let k = 2; k <= 6; k++) {
      const a = q(A)
      if (!hasDecimal(a)) continue
      timesWhole.push(A % 2 ? { a: k, op: '×', b: a, answer: q(A * k) } : { a, op: '×', b: k, answer: q(A * k) })
    }
  // Halves times halves is the one decimal-by-decimal product that stays in
  // quarters: 0.5 × 0.5 = 0.25, 1.5 × 2.5 = 3.75.
  for (let x = 1; x <= 7; x += 2)
    for (let y = x; y <= 7; y += 2) timesHalves.push({ a: x / 2, op: '×', b: y / 2, answer: (x * y) / 4 })
  // Sharing into 2 or 4 when the answer is still a quarter: 5 ÷ 2 = 2.5, 3 ÷ 4 = 0.75.
  for (let A = 2; A <= 40; A++)
    for (const k of [2, 4]) {
      const answer = q(A) / k
      if (isQuarter(answer) && hasDecimal(answer)) div.push({ a: q(A), op: '÷', b: k, answer })
    }
  return [
    ...spread(add, 24),
    ...spread(sub, 16),
    ...spread(timesWhole, 16),
    ...timesHalves,
    ...spread(div, 8),
  ]
}

export function buildDeck(id: DeckId): Card[] {
  switch (id) {
    case 'addsub10':
      return addSub(10)
    case 'addsub20':
      return addSub(20)
    case 'addsub100': {
      // Full 0-100 would be thousands of cards; sample two-digit work instead.
      const out: Card[] = []
      for (let a = 10; a <= 99; a++) {
        const b = 1 + ((a * 7) % 89)
        if (a + b <= 100) out.push({ a, op: '+', b, answer: a + b })
        if (a - b >= 0) out.push({ a, op: '−', b, answer: a - b })
      }
      return out
    }
    case 'decMirror':
      return quartersDeck()
    case 'decTenths': {
      // 0.1–0.9 with 0.1–0.9. The sums that cross 1 (0.7 + 0.5 = 1.2) are
      // the heart of beginner decimals; subtraction never goes negative.
      const out: Card[] = []
      for (let A = 1; A <= 9; A++)
        for (let B = 1; B <= 9; B++) {
          out.push(tenthsCard(A, '+', B))
          if (A > B) out.push(tenthsCard(A, '−', B))
        }
      return out
    }
    case 'decOnes': {
      // Ones and tenths together (2.5 + 1.3, 4.2 − 0.7). A fixed spread
      // rather than every pair, which would be thousands of cards.
      const out: Card[] = []
      for (let i = 0; i < 60; i++) {
        const A = 5 + ((i * 37) % 50) // 0.5 – 5.4
        const B = 1 + ((i * 23) % 29) // 0.1 – 2.9
        out.push(tenthsCard(A, '+', B))
        if (A >= B) out.push(tenthsCard(A, '−', B))
      }
      return out
    }
    case 'times': {
      const out: Card[] = []
      for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) out.push({ a, op: '×', b, answer: a * b })
      return out
    }
    case 'divide': {
      const out: Card[] = []
      for (let k = 1; k <= 12; k++)
        for (let s = 1; s <= 12; s++) out.push({ a: k * s, op: '÷', b: k, answer: s })
      return out
    }
  }
}

export function shuffled(cards: Card[]): Card[] {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
