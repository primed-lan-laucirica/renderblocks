/**
 * What an equation line says. The Bench's line is a row of tiles (digits
 * and signs); digits side by side join into one numeral, and the tokens are
 * read as a statement: an expression, or two with one relation sign
 * between them. × · ÷ / bind before + −, brackets first, everything left
 * to right. Amounts are exact fractions, so 1 ÷ 3 × 3 = 1 is true.
 *
 * A stacked fraction is not a tile yet: on the Bench a fraction is written
 * with the slash.
 */

// ── exact amounts ────────────────────────────────────────────────────────

/** p / q in lowest terms, q > 0. */
export interface Q {
  p: number
  q: number
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

export function Q(p: number, q = 1): Q {
  if (q < 0) [p, q] = [-p, -q]
  const g = gcd(p, q) || 1
  return { p: p / g, q: q / g }
}
export const add = (a: Q, b: Q) => Q(a.p * b.q + b.p * a.q, a.q * b.q)
export const sub = (a: Q, b: Q) => Q(a.p * b.q - b.p * a.q, a.q * b.q)
export const mul = (a: Q, b: Q) => Q(a.p * b.p, a.q * b.q)
/** null when dividing by nothing. */
export const div = (a: Q, b: Q): Q | null => (b.p === 0 ? null : Q(a.p * b.q, a.q * b.p))
export const cmp = (a: Q, b: Q) => Math.sign(a.p * b.q - b.p * a.q)
export const isInt = (a: Q) => a.q === 1
export const num = (a: Q) => a.p / a.q

// ── tiles and tokens ─────────────────────────────────────────────────────

export const RELATIONS = ['=', '<', '>', '≤', '≥', '≠'] as const
export type Relation = (typeof RELATIONS)[number]
export const isRelation = (g: string): g is Relation => (RELATIONS as readonly string[]).includes(g)

export const isDigit = (g: string) => g.length === 1 && g >= '0' && g <= '9'
export const isNumeral = (g: string) => /^\d+$/.test(g)

/** The signs the Bench can read (every stage 1 sign but the stacked fraction bar). */
export const READS = ['=', '+', '−', '×', '·', '÷', '/', '(', ')', '<', '>', '≤', '≥', '≠']

/** Tiles to tokens: digits side by side are one numeral. */
export function join(tiles: string[]): string[] {
  const out: string[] = []
  let wasDigit = false
  for (const t of tiles) {
    if (isDigit(t) && wasDigit) out[out.length - 1] += t
    else out.push(t)
    wasDigit = isDigit(t)
  }
  return out
}

/**
 * Can this tile come next? A line is written the way it is read: a sign of
 * arithmetic needs an amount before it, a relation sign comes once, between
 * two finished sides, and a bracket closes only what was opened. Every line
 * that can be read can be written this way; nothing else can.
 */
export function canFollow(tiles: string[], g: string): boolean {
  const last = tiles[tiles.length - 1]
  const open = tiles.filter((t) => t === '(').length - tiles.filter((t) => t === ')').length
  /** The line so far ends in an amount: a numeral, or a closed bracket. */
  const amount = last !== undefined && (isDigit(last) || last === ')')
  if (isDigit(g)) return last !== ')'
  if (g === '(') return !amount
  if (g === ')') return amount && open > 0
  if (isRelation(g)) return amount && open === 0 && !tiles.some(isRelation)
  return g in OPS && amount
}

// ── expressions ──────────────────────────────────────────────────────────

export type Op = '+' | '−' | '×' | '÷'
const OPS: Record<string, Op> = { '+': '+', '−': '−', '×': '×', '·': '×', '÷': '÷', '/': '÷' }

export type Node = { kind: 'num'; v: Q } | { kind: 'op'; op: Op; a: Node; b: Node; v: Q } | { kind: 'group'; inner: Node; v: Q }

/** An expression's tree, or null if these tokens are not one (or it divides by nothing). */
export function expression(toks: string[]): Node | null {
  let i = 0
  const factor = (): Node | null => {
    const t = toks[i]
    if (t === undefined) return null
    if (isNumeral(t)) {
      i++
      return { kind: 'num', v: Q(Number(t)) }
    }
    if (t === '(') {
      i++
      const inner = sum()
      if (!inner || toks[i] !== ')') return null
      i++
      return { kind: 'group', inner, v: inner.v }
    }
    return null
  }
  const chain = (next: () => Node | null, ops: Op[]) => (): Node | null => {
    let a = next()
    while (a && toks[i] !== undefined && ops.includes(OPS[toks[i]])) {
      const op = OPS[toks[i++]]
      const b = next()
      if (!b) return null
      const v = op === '+' ? add(a.v, b.v) : op === '−' ? sub(a.v, b.v) : op === '×' ? mul(a.v, b.v) : div(a.v, b.v)
      if (!v || !Number.isSafeInteger(v.p) || !Number.isSafeInteger(v.q)) return null
      a = { kind: 'op', op, a, b, v }
    }
    return a
  }
  const product = chain(factor, ['×', '÷'])
  const sum = chain(product, ['+', '−'])
  const tree = sum()
  return tree && i === toks.length ? tree : null
}

/**
 * As much of these tokens as makes an expression: signs left hanging at the
 * end are dropped and open brackets closed ("(3 +" reads as 3), so a line
 * being written always shows what it has so far.
 */
export function soFar(toks: string[]): Node | null {
  for (let n = toks.length; n > 0; n--) {
    const cut = toks.slice(0, n)
    const open = cut.filter((t) => t === '(').length - cut.filter((t) => t === ')').length
    const tree = open >= 0 ? expression([...cut, ...Array<string>(open).fill(')')]) : null
    if (tree) return tree
  }
  return null
}

// ── statements ───────────────────────────────────────────────────────────

export interface Statement {
  /** Each side's tree (null: nothing there that can be read). */
  left: Node | null
  right: Node | null
  /** The relation sign and which token it is. */
  rel: Relation | null
  relAt: number
  /** Every token was read: two whole expressions and one relation (or one expression, alone). */
  whole: boolean
  /** True or false when it is a whole statement with a relation; otherwise null. */
  truth: boolean | null
}

export const holds = (rel: Relation, a: Q, b: Q) => {
  const c = cmp(a, b)
  return rel === '=' ? c === 0 : rel === '<' ? c < 0 : rel === '>' ? c > 0 : rel === '≤' ? c <= 0 : rel === '≥' ? c >= 0 : c !== 0
}

/** Read a line. With `strict`, a side is read only if all of it is an expression. */
export function statement(toks: string[], strict = false): Statement {
  const relAt = toks.findIndex(isRelation)
  const read = (side: string[]) => (strict ? expression(side) : soFar(side))
  if (relAt < 0) {
    const left = read(toks)
    return { left, right: null, rel: null, relAt, whole: !!expression(toks), truth: null }
  }
  const rel = toks[relAt] as Relation
  const [l, r] = [toks.slice(0, relAt), toks.slice(relAt + 1)]
  // A second relation sign ends what can be read of the right side.
  const again = r.findIndex(isRelation)
  const left = read(l)
  const right = read(again < 0 ? r : r.slice(0, again))
  const whole = again < 0 && !!expression(l) && !!expression(r)
  return { left, right, rel, relAt, whole, truth: whole ? holds(rel, left!.v, right!.v) : null }
}
