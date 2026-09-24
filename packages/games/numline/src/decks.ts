export type DeckId =
  | 'addsub10'
  | 'addsub20'
  | 'addsub100'
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
