/**
 * A Mastery run: eight items, four each way. "Write what you see" shows the
 * beads and he builds the line; "make it true" shows a line with a gap or
 * two and he fills them. Items use only the signs he has watched, with
 * small numbers (sums to about 20, products to 30, divisions that come out
 * whole), and are drawn from a seed, so the same seed gives the same run.
 */
import { rng } from '@renderblocks/scene/ease'
import { isRelation, join, statement, type Statement } from './parse'
import { look } from './picture'

export type Skill = 'write' | 'make'

/** A gap in a "make it true" line: one sign, or a numeral. */
export type Want = 'sign' | 'num'

export interface Item {
  skill: Skill
  /** Its name in the evidence: "write 3 + 2 = 5", "make 3 + _ = 5". */
  id: string
  /** write: the statement the picture is drawn from. make: the line, "_" for each gap. */
  toks: string[]
  /** make: what each gap takes. */
  wants: Want[]
  /** One answer that is right (there may be others): the whole line's tiles, or each gap's tiles. */
  answer: string[][]
}

/** A "make it true" line with its gaps filled (each gap's tiles become its tokens). */
export function filled(item: Item, fills: string[][]): string[] {
  let g = 0
  return item.toks.flatMap((t) => (t === '_' ? join(fills[g++] ?? []) : [t]))
}

/** Does this line say what the picture shows? A true statement whose two sides look like the two pans (either way round). */
export function matches(toks: string[], shown: string[]): boolean {
  const mine = statement(toks, true)
  const theirs = statement(shown, true)
  if (!mine.whole || mine.truth !== true || !theirs.left || !theirs.right) return false
  const [a, b] = [look(mine.left!), look(mine.right!)]
  const [l, r] = [look(theirs.left), look(theirs.right)]
  return (a === l && b === r) || (a === r && b === l)
}

/** Is his answer right? write: his tiles are the whole line. make: his tiles for each gap. */
export function check(item: Item, fills: string[][]): boolean {
  if (item.skill === 'write') return matches(join(fills[0] ?? []), item.toks)
  if (fills.length < item.wants.length || item.wants.some((_, i) => !fills[i]?.length)) return false
  const s: Statement = statement(filled(item, fills), true)
  return s.whole && s.truth === true
}

const tiles = (n: number) => [...String(n)]

type Rand = () => number

interface Kit {
  r: Rand
  has: (g: string) => boolean
  /** The sign he writes for times and for shared: the cross and ÷ if he has them, else the dot and the slash. */
  times: string
  shared: string
  rels: string[]
}

const int = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1))
const pick = <T>(r: Rand, list: T[]) => list[Math.floor(r() * list.length)]

const write = (toks: (string | number)[]): Item => {
  const t = toks.map(String)
  return { skill: 'write', id: `write ${t.join(' ')}`, toks: t, wants: [], answer: [t.flatMap((x) => (/^\d+$/.test(x) ? [...x] : [x]))] }
}
const make = (toks: (string | number)[], answer: (string | number)[]): Item => {
  const t = toks.map(String)
  const a = answer.map((x) => (typeof x === 'number' ? tiles(x) : [x]))
  return { skill: 'make', id: `make ${t.join(' ')}`, toks: t, wants: answer.map((x) => (typeof x === 'number' ? 'num' : 'sign')), answer: a }
}

/** Two different amounts in the order a relation sign needs, and the sign. */
function unequal(k: Kit): [number, string, number] {
  const rel = pick(k.r, k.rels.filter((g) => g !== '='))
  const a = int(k.r, 1, 9)
  let b = int(k.r, 1, 9)
  if (b === a) b = a === 9 ? 8 : a + 1
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)]
  return rel === '<' || rel === '≤' ? [lo, rel, hi] : rel === '>' || rel === '≥' ? [hi, rel, lo] : [a, rel, b]
}

/** What he can be shown to write, by what he has watched. */
const WRITES: Record<string, (k: Kit) => Item | null> = {
  same: (k) => {
    if (!k.has('=')) return null
    const a = int(k.r, 2, 10)
    return write([a, '=', a])
  },
  add: (k) => {
    if (!k.has('=') || !k.has('+')) return null
    const a = int(k.r, 1, 9)
    const b = int(k.r, 1, Math.min(9, 15 - a))
    return write([a, '+', b, '=', a + b])
  },
  takeAway: (k) => {
    if (!k.has('=') || !k.has('−')) return null
    const a = int(k.r, 3, 12)
    const b = int(k.r, 1, a - 1)
    return write([a, '−', b, '=', a - b])
  },
  times: (k) => {
    if (!k.has('=') || !k.times) return null
    const a = int(k.r, 2, 4)
    const b = int(k.r, 2, 6)
    return write([a, k.times, b, '=', a * b])
  },
  shared: (k) => {
    if (!k.has('=') || !k.shared) return null
    const b = int(k.r, 2, 4)
    const q = int(k.r, 2, 5)
    return write([b * q, k.shared, b, '=', q])
  },
  compare: (k) => (k.rels.some((g) => g !== '=') ? write(unequal(k)) : null),
}

/** What he can be asked to make true. */
const MAKES: Record<string, (k: Kit) => Item | null> = {
  same: (k) => {
    if (!k.has('=')) return null
    const a = int(k.r, 2, 20)
    return make(pick(k.r, [[a, '=', '_'], ['_', '=', a]]), [a])
  },
  add: (k) => {
    if (!k.has('=') || !k.has('+')) return null
    const a = int(k.r, 1, 10)
    const b = int(k.r, 1, 10)
    return pick(k.r, [make([a, '+', '_', '=', a + b], [b]), make(['_', '+', b, '=', a + b], [a]), make([a, '+', b, '=', '_'], [a + b]), make([a + b, '=', a, '+', '_'], [b])])
  },
  takeAway: (k) => {
    if (!k.has('=') || !k.has('−')) return null
    const a = int(k.r, 3, 20)
    const b = int(k.r, 1, a - 1)
    return pick(k.r, [make([a, '−', '_', '=', a - b], [b]), make([a, '−', b, '=', '_'], [a - b])])
  },
  times: (k) => {
    if (!k.has('=') || !k.times) return null
    const a = int(k.r, 2, 5)
    const b = int(k.r, 2, 6)
    return pick(k.r, [make([a, k.times, '_', '=', a * b], [b]), make([a, k.times, b, '=', '_'], [a * b])])
  },
  shared: (k) => {
    if (!k.has('=') || !k.shared) return null
    const b = int(k.r, 2, 5)
    const q = int(k.r, 2, 6)
    return pick(k.r, [make([b * q, k.shared, b, '=', '_'], [q]), make([b * q, k.shared, '_', '=', q], [b])])
  },
  /** Which sign goes between? (Only when there is more than one to choose from.) */
  whichSign: (k) => {
    const ops = ['+', '−', k.times, k.shared].filter((g) => g && k.has(g))
    if (!k.has('=') || ops.length < 2) return null
    const op = pick(k.r, ops)
    const b = int(k.r, 2, 5)
    const a = op === k.shared ? b * int(k.r, 2, 5) : op === k.times ? int(k.r, 2, 6) : int(k.r, b + 1, 9)
    const v = op === '+' ? a + b : op === '−' ? a - b : op === k.times ? a * b : a / b
    return make([a, '_', b, '=', v], [op])
  },
  /** The same signs, a different amount: where does the fence go? */
  brackets: (k) => {
    if (!k.has('=') || !k.has('(') || !k.has(')') || !k.has('+') || !k.times) return null
    const a = int(k.r, 1, 4)
    const b = int(k.r, 1, 4)
    const c = int(k.r, 2, 4)
    return pick(k.r, [
      make(['_', a, '+', b, '_', k.times, c, '=', (a + b) * c], ['(', ')']),
      make(['(', a, '+', b, ')', k.times, c, '=', '_'], [(a + b) * c]),
      make([a, '+', b, k.times, c, '=', '_'], [a + b * c]),
    ])
  },
  compare: (k) => {
    if (!k.rels.some((g) => g !== '=')) return null
    const [a, rel, b] = unequal(k)
    // The sign is the gap, or one of the amounts is (any amount that makes it true will do).
    return pick(k.r, [make([a, '_', b], [rel]), make([a, rel, '_'], [b]), make(['_', rel, b], [a])])
  },
}

function kitFor(signs: string[], r: Rand): Kit {
  const has = (g: string) => signs.includes(g)
  return { r, has, times: has('×') ? '×' : has('·') ? '·' : '', shared: has('÷') ? '÷' : has('/') ? '/' : '', rels: signs.filter(isRelation) }
}

/** Four items of one kind: every kind he can do in turn (in a shuffled order), no item twice. */
function four(pool: Record<string, (k: Kit) => Item | null>, k: Kit): Item[] {
  const kinds = Object.keys(pool).filter((name) => pool[name]({ ...k, r: rng(1) }) !== null)
  if (!kinds.length) return []
  const order = kinds.map((name) => ({ name, at: k.r() })).sort((a, b) => a.at - b.at).map((x) => x.name)
  const out: Item[] = []
  for (let i = 0, tries = 0; out.length < 4 && tries < 200; tries++) {
    const item = pool[order[i % order.length]](k)
    if (!item || out.some((o) => o.id === item.id)) continue
    out.push(item)
    i++
  }
  return out
}

/** A run of eight for these signs: write, make, write, make… (Empty if he has no relation sign yet.) */
export function makeRun(signs: string[], seed: number): Item[] {
  const k = kitFor(signs, rng(seed))
  const w = four(WRITES, k)
  const m = four(MAKES, k)
  if (w.length < 4 || m.length < 4) return []
  return w.flatMap((item, i) => [item, m[i]])
}
