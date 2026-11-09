/* eslint-disable react-refresh/only-export-components -- the kit exports its drawings together with their measures */
/**
 * The signs, drawn once: every sign in every explainer, on the road and on
 * the Bench is one of these strokes, so = is the same = everywhere, whatever
 * fonts the tablet has. Numerals are type; signs are drawn. A token is one
 * numeral, sign, mark or gap on an equation line, and `place` sets a line of
 * them, so tokens can slide and swap between two lines.
 */
import type { ReactNode } from 'react'
import { GOLD_EDGE, INK, SANS, SOFT } from './look'

/**
 * One thing on an equation line: a numeral ("5", "1,000,000"), a sign
 * ("=", "+"), "?" (not known yet), "_" (a gap for a sign), a tally, a Roman
 * numeral, or a fraction. `k` names it, so it can move to another place on
 * the next line (5 = V becomes V = 5).
 */
export type Tok =
  | string
  | { g: string; k: string }
  | { tally: number; k?: string }
  | { roman: string; n: number; k?: string }
  | { frac: [string, string]; k?: string }

export interface Item {
  k: string
  kind: 'num' | 'sign' | 'unknown' | 'gap' | 'tally' | 'roman' | 'frac'
  /** What it shows (a sign's name on the line: "=", "frac"). */
  g: string
  /** The amount a numeral or mark stands for. */
  n?: number
  top?: string
  bot?: string
}

/** Each drawn sign's width, in units of the line's size. */
const WIDTH: Record<string, number> = { '=': 0.7, '+': 0.7, '−': 0.7, '×': 0.64, '·': 0.26, '÷': 0.7, '/': 0.44, '(': 0.3, ')': 0.3, '<': 0.7, '>': 0.7, '≤': 0.7, '≥': 0.7, '≠': 0.7 }
export const isSign = (g: string) => g in WIDTH

const number = (g: string) => Number(g.replace(/,/g, ''))

/** A line's tokens, each with its kind and a name (its own, or its glyph and which one of them it is). */
export function items(toks: Tok[]): Item[] {
  const seen = new Map<string, number>()
  return toks.map((t) => {
    let it: Omit<Item, 'k'>
    let k: string | undefined
    if (typeof t === 'string' || 'g' in t) {
      const g = typeof t === 'string' ? t : t.g
      if (typeof t !== 'string') k = t.k
      if (g === '?') it = { kind: 'unknown', g }
      else if (g === '_') it = { kind: 'gap', g }
      else if (isSign(g)) it = { kind: 'sign', g }
      else if (/^[\d,]+$/.test(g)) it = { kind: 'num', g, n: number(g) }
      else throw new Error(`No such token: "${g}"`)
    } else if ('tally' in t) {
      it = { kind: 'tally', g: `tally${t.tally}`, n: t.tally }
      k = t.k
    } else if ('roman' in t) {
      it = { kind: 'roman', g: t.roman, n: t.n }
      k = t.k
    } else {
      it = { kind: 'frac', g: 'frac', top: t.frac[0], bot: t.frac[1], n: number(t.frac[0]) / number(t.frac[1]) }
      k = t.k
    }
    if (!k) {
      const i = seen.get(it.g) ?? 0
      seen.set(it.g, i + 1)
      k = `${it.g}#${i}`
    }
    return { ...it, k }
  })
}

/** Type is set to these widths whatever font the device has (see Token), so a line's layout never depends on it. */
const digits = (g: string) => [...g].reduce((w, c) => w + (c === ',' ? 0.3 : 0.62), 0)

/** A fraction's numerals, as a part of the line's size. */
const FRAC = 0.66

/** A token's width, in units of the line's size. */
export function widthOf(it: Item): number {
  switch (it.kind) {
    case 'num':
      return digits(it.g)
    case 'sign':
      return WIDTH[it.g]
    case 'unknown':
      return 0.56
    case 'gap':
      return 0.8
    case 'tally':
      return 0.16 * Math.min(it.n!, 5) + 0.24
    case 'roman':
      return 0.66 * it.g.length
    case 'frac':
      return Math.max(digits(it.top!), digits(it.bot!)) * FRAC + 0.2
  }
}

const SPACE = 0.26
const space = (a: Item, b: Item) => (a.g === '(' || b.g === ')' ? 0.05 : SPACE)

/** Where each token's middle sits along a line of this size, the whole line centred on 0. */
export function place(list: Item[], size: number): number[] {
  const xs: number[] = []
  let x = 0
  list.forEach((it, i) => {
    if (i > 0) x += space(list[i - 1], it)
    const w = widthOf(it)
    xs.push(x + w / 2)
    x += w
  })
  return xs.map((v) => (v - x / 2) * size)
}

/** One sign, its middle at (0, 0), at this size. */
export function Sign({ g, size, colour = INK }: { g: string; size: number; colour?: string }) {
  const S = size
  const st = { stroke: colour, strokeWidth: S * 0.09, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
  const L = (x1: number, y1: number, x2: number, y2: number, key?: number) => <line key={key} x1={x1 * S} y1={y1 * S} x2={x2 * S} y2={y2 * S} {...st} />
  const dot = (x: number, y: number, r = 0.068) => <circle cx={x * S} cy={y * S} r={r * S} fill={colour} />
  const less = (dir: number, dy = 0, h = 0.25) => <polyline points={`${0.25 * dir * S},${(dy - h) * S} ${-0.25 * dir * S},${dy * S} ${0.25 * dir * S},${(dy + h) * S}`} {...st} />
  let d: ReactNode
  switch (g) {
    case '=':
      d = [L(-0.25, -0.115, 0.25, -0.115, 0), L(-0.25, 0.115, 0.25, 0.115, 1)]
      break
    case '+':
      d = [L(-0.25, 0, 0.25, 0, 0), L(0, -0.25, 0, 0.25, 1)]
      break
    case '−':
      d = L(-0.25, 0, 0.25, 0)
      break
    case '×':
      d = [L(-0.21, -0.21, 0.21, 0.21, 0), L(-0.21, 0.21, 0.21, -0.21, 1)]
      break
    case '·':
      d = dot(0, 0, 0.075)
      break
    case '÷':
      d = (
        <>
          {L(-0.25, 0, 0.25, 0)}
          {dot(0, -0.2)}
          {dot(0, 0.2)}
        </>
      )
      break
    case '/':
      d = L(-0.13, 0.36, 0.13, -0.36)
      break
    case '(':
      d = <path d={`M ${0.07 * S} ${-0.43 * S} Q ${-0.2 * S} 0 ${0.07 * S} ${0.43 * S}`} {...st} />
      break
    case ')':
      d = <path d={`M ${-0.07 * S} ${-0.43 * S} Q ${0.2 * S} 0 ${-0.07 * S} ${0.43 * S}`} {...st} />
      break
    case '<':
      d = less(1)
      break
    case '>':
      d = less(-1)
      break
    case '≤':
      d = (
        <>
          {less(1, -0.09, 0.2)}
          {L(-0.25, 0.3, 0.25, 0.3)}
        </>
      )
      break
    case '≥':
      d = (
        <>
          {less(-1, -0.09, 0.2)}
          {L(-0.25, 0.3, 0.25, 0.3)}
        </>
      )
      break
    case '≠':
      d = [L(-0.25, -0.115, 0.25, -0.115, 0), L(-0.25, 0.115, 0.25, 0.115, 1), L(-0.12, 0.33, 0.12, -0.33, 2)]
      break
    default:
      // A sign with no drawing yet (the later stages): type.
      d = (
        <text fontFamily={SANS} fontWeight={800} fontSize={S} fill={colour} textAnchor="middle" dominantBaseline="central">
          {g}
        </text>
      )
  }
  return <g data-sign={g}>{d}</g>
}

const type = (size: number, colour: string) => ({ fontFamily: SANS, fontWeight: 800, fontSize: size, fill: colour, textAnchor: 'middle', dominantBaseline: 'central' }) as const

/** One token, its middle at (x, y). */
export function Token({ it, x, y, size, o = 1, s = 1, colour = INK }: { it: Item; x: number; y: number; size: number; o?: number; s?: number; colour?: string }) {
  if (o <= 0) return null
  const S = size
  let d: ReactNode
  switch (it.kind) {
    case 'num':
      d = (
        <text data-num={it.g} {...type(S, colour)} textLength={it.g.length > 1 ? digits(it.g) * S : undefined} lengthAdjust="spacingAndGlyphs">
          {it.g}
        </text>
      )
      break
    case 'sign':
      d = <Sign g={it.g} size={S} colour={colour} />
      break
    case 'unknown':
      d = <text {...type(S, SOFT)}>?</text>
      break
    case 'gap':
      d = <rect x={-0.36 * S} y={-0.4 * S} width={0.72 * S} height={0.8 * S} rx={0.08 * S} fill="none" stroke={GOLD_EDGE} strokeWidth={S * 0.03} strokeDasharray={`${S * 0.09} ${S * 0.07}`} />
      break
    case 'tally': {
      const n = it.n!
      const step = 0.16 * S
      const x0 = (-(Math.min(n, 5) - 1) * step) / 2
      const st = { stroke: colour, strokeWidth: S * 0.075, strokeLinecap: 'round' } as const
      d = (
        <g data-mark={it.g}>
          {Array.from({ length: Math.min(n, 4) }, (_, i) => (
            <line key={i} x1={x0 + i * step} y1={-0.3 * S} x2={x0 + i * step} y2={0.3 * S} {...st} />
          ))}
          {n >= 5 && <line x1={x0 - 0.1 * S} y1={0.2 * S} x2={x0 + 3 * step + 0.1 * S} y2={-0.2 * S} {...st} />}
        </g>
      )
      break
    }
    case 'roman':
      d = (
        <text data-mark={it.g} {...type(S, colour)}>
          {it.g}
        </text>
      )
      break
    case 'frac': {
      const w = widthOf(it) * S
      d = (
        <>
          <text data-num={it.top} {...type(S * FRAC, colour)} y={-0.38 * S}>
            {it.top}
          </text>
          <g data-sign="frac">
            <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke={colour} strokeWidth={S * 0.065} strokeLinecap="round" />
          </g>
          <text data-num={it.bot} {...type(S * FRAC, colour)} y={0.4 * S}>
            {it.bot}
          </text>
        </>
      )
      break
    }
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      {d}
    </g>
  )
}
