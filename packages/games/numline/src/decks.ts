export type DeckId = 'addsub10' | 'addsub20' | 'addsub100' | 'times' | 'divide'

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
