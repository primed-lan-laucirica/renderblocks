/**
 * Rule inference over numeric series.
 *
 * An item is only fair if exactly one rule from the family a child could
 * reasonably apply fits the visible terms. This module enumerates that family
 * so generators can reject under-determined items instead of shipping two
 * defensible answers (the classic 2, 4, 8 → 16 or 14).
 */

export interface FittedRule {
  next: number
  /** Parent-facing explanation of why `next` follows. */
  explain: string
}

const diffs = (xs: number[]) => xs.slice(1).map((v, i) => v - xs[i])
const allEqual = (xs: number[]) => xs.every((v) => v === xs[0])

/** Every rule in the family that fits `seq`, keyed by predicted next value. */
export function fitRules(seq: number[]): FittedRule[] {
  const out: FittedRule[] = []
  const n = seq.length
  if (n < 3) return out
  const last = seq[n - 1]
  const d = diffs(seq)

  // Constant difference
  if (allEqual(d)) {
    const step = d[0]
    out.push({
      next: last + step,
      explain:
        step >= 0
          ? `Each number is ${step} more than the one before.`
          : `Each number is ${-step} less than the one before.`,
    })
  }

  // Constant ratio (integer only — a child reads these as doubling/tripling)
  if (seq.every((v) => v !== 0)) {
    const r = seq[1] / seq[0]
    if (Number.isInteger(r) && r > 1 && seq.every((v, i) => i === 0 || v === seq[i - 1] * r)) {
      out.push({
        next: last * r,
        explain: r === 2 ? 'Each number doubles.' : `Each number is multiplied by ${r}.`,
      })
    }
  }

  // Constant second difference (growing steps: +1, +2, +3 …)
  if (d.length >= 2) {
    const dd = diffs(d)
    if (allEqual(dd) && dd[0] !== 0) {
      out.push({
        next: last + d[d.length - 1] + dd[0],
        explain: `The step grows by ${dd[0]} each time (${d.join(', ')} …).`,
      })
    }
  }

  // Alternating difference (a, b, a, b …)
  if (d.length >= 3) {
    const evens = d.filter((_, i) => i % 2 === 0)
    const odds = d.filter((_, i) => i % 2 === 1)
    if (allEqual(evens) && allEqual(odds) && evens[0] !== odds[0]) {
      const step = d.length % 2 === 0 ? evens[0] : odds[0]
      out.push({
        next: last + step,
        explain: `The steps alternate: ${evens[0] >= 0 ? '+' : ''}${evens[0]}, then ${
          odds[0] >= 0 ? '+' : ''
        }${odds[0]}.`,
      })
    }
  }

  // Repeating cycle of values
  for (let p = 1; p <= Math.floor(n / 2); p++) {
    let ok = true
    for (let i = p; i < n; i++) if (seq[i] !== seq[i - p]) ok = false
    if (ok) {
      out.push({
        next: seq[n - p],
        explain: `The numbers repeat every ${p}.`,
      })
      break
    }
  }

  // De-duplicate by predicted value; keep the simplest explanation for each.
  const byNext = new Map<number, FittedRule>()
  for (const r of out) if (!byNext.has(r.next)) byNext.set(r.next, r)
  return [...byNext.values()]
}

/** Predicted next values that any fitting rule would justify. */
export function plausibleNext(seq: number[]): number[] {
  return fitRules(seq).map((r) => r.next)
}

/** A series is fair only when every fitting rule agrees on the next value. */
export function isDetermined(seq: number[]): boolean {
  return new Set(plausibleNext(seq)).size === 1
}

/* ---------- pair rules, for Number Analogies ---------- */

export interface PairRule {
  apply: (x: number) => number
  explain: string
}

/** Rules mapping x -> y that fit every given pair. */
export function fitPairRules(pairs: Array<[number, number]>): PairRule[] {
  const out: PairRule[] = []
  const [x0, y0] = pairs[0]

  const add = y0 - x0
  if (pairs.every(([x, y]) => y - x === add)) {
    out.push({
      apply: (x) => x + add,
      explain: add >= 0 ? `Add ${add} to the first number.` : `Subtract ${-add} from the first number.`,
    })
  }

  if (x0 !== 0 && Number.isInteger(y0 / x0)) {
    const mul = y0 / x0
    if (mul > 1 && pairs.every(([x, y]) => x !== 0 && y === x * mul)) {
      out.push({
        apply: (x) => x * mul,
        explain: mul === 2 ? 'The second number is double the first.' : `Multiply the first number by ${mul}.`,
      })
    }
  }

  if (y0 !== 0 && Number.isInteger(x0 / y0)) {
    const div = x0 / y0
    if (div > 1 && pairs.every(([x, y]) => y !== 0 && x === y * div)) {
      out.push({
        apply: (x) => x / div,
        explain: div === 2 ? 'The second number is half the first.' : `Divide the first number by ${div}.`,
      })
    }
  }

  return out
}

/** True when exactly one pair rule fits and it agrees on the answer. */
export function pairsDetermined(pairs: Array<[number, number]>, probe: number): boolean {
  const rules = fitPairRules(pairs)
  if (rules.length === 0) return false
  const answers = new Set(rules.map((r) => r.apply(probe)))
  return answers.size === 1
}
