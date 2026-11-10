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
 * One thing on an equation line: a numeral ("5", "1,000,000", "0.25",
 * "−3"), a sign ("=", "+"), "?" (not known yet), "_" (a gap for a sign), a
 * tally, a Roman numeral, a fraction, something raised (the 5 of 2⁵, set
 * against the token before it) or a root over what it reaches. `k` names
 * it, so it can move to another place on the next line (5 = V becomes
 * V = 5).
 */
export type Tok = string | { g: string; k: string } | { tally: number; k?: string } | { roman: string; n: number; k?: string } | { frac: [Part, Part]; k?: string } | { sup: Part; k?: string } | { root: Part; k?: string }

/** What a token holds inside it, itself a little line: one token, or several. */
export type Part = string | Tok[]

export interface Item {
  k: string
  kind: 'num' | 'sign' | 'unknown' | 'gap' | 'tally' | 'roman' | 'frac' | 'sup' | 'root'
  /** What it shows (a sign's name on the line: "=", "frac", "pow"). */
  g: string
  /** The amount a numeral or mark stands for. */
  n?: number
  /** The little lines inside it: a fraction's top and bottom, what is raised, what is under the root. */
  parts?: Item[][]
  /** Every sign it puts on the paper, its own first. */
  signs: string[]
  /** All that it shows, as text: two items with the same id are drawn alike. */
  id: string
  /** A bar that opens its pair (the first of | |). */
  opens?: boolean
  /** A minus with nothing before it to take from (−3): it is set against its number. */
  unary?: boolean
}

/** Each drawn sign's width, in units of the line's size. */
const WIDTH: Record<string, number> = {
  '=': 0.7,
  '+': 0.7,
  '−': 0.7,
  '×': 0.64,
  '·': 0.26,
  '÷': 0.7,
  '/': 0.44,
  '(': 0.3,
  ')': 0.3,
  '<': 0.7,
  '>': 0.7,
  '≤': 0.7,
  '≥': 0.7,
  '≠': 0.7,
  '√': 0.6,
  '.': 0.2,
  '%': 0.74,
  '≈': 0.7,
  '|': 0.1,
}
export const isSign = (g: string) => g in WIDTH

/** A numeral: digits, with commas, a point or a minus before it. */
const NUMERAL = /^−?[\d,]+(\.\d+)?$/
const number = (g: string) => Number(g.replace(/,/g, '').replace('−', '-'))
const within = (part: Part) => items(typeof part === 'string' ? [part] : part)
/** The amount of a part that is one numeral. */
const amount = (list: Item[]) => (list.length === 1 && list[0].kind === 'num' ? list[0].n : undefined)

/** A line's tokens, each with its kind and a name (its own, or its glyph and which one of them it is). */
export function items(toks: Tok[]): Item[] {
  const seen = new Map<string, number>()
  let bars = 0
  let before: Item | undefined
  return toks.map((t) => {
    let it: Omit<Item, 'k' | 'signs' | 'id'>
    let k: string | undefined
    if (typeof t === 'string' || 'g' in t) {
      const g = typeof t === 'string' ? t : t.g
      if (typeof t !== 'string') k = t.k
      if (g === '?') it = { kind: 'unknown', g }
      else if (g === '_') it = { kind: 'gap', g }
      else if (g === '|') it = { kind: 'sign', g, opens: bars++ % 2 === 0 }
      else if (g === '−') it = { kind: 'sign', g, unary: !before || (before.kind === 'sign' && !closes(before) && before.g !== '%') }
      else if (isSign(g)) it = { kind: 'sign', g }
      else if (NUMERAL.test(g)) it = { kind: 'num', g, n: number(g) }
      else throw new Error(`No such token: "${g}"`)
    } else if ('tally' in t) {
      it = { kind: 'tally', g: `tally${t.tally}`, n: t.tally }
      k = t.k
    } else if ('roman' in t) {
      it = { kind: 'roman', g: t.roman, n: t.n }
      k = t.k
    } else if ('frac' in t) {
      const parts = [within(t.frac[0]), within(t.frac[1])]
      const [top, bot] = parts.map(amount)
      it = { kind: 'frac', g: 'frac', parts, n: top !== undefined && bot !== undefined ? top / bot : undefined }
      k = t.k
    } else if ('sup' in t) {
      it = { kind: 'sup', g: 'pow', parts: [within(t.sup)] }
      k = t.k
    } else {
      it = { kind: 'root', g: '√', parts: [within(t.root)] }
      k = t.k
    }
    if (!k) {
      const i = seen.get(it.g) ?? 0
      seen.set(it.g, i + 1)
      k = `${it.g}#${i}`
    }
    const inner = (it.parts ?? []).flat()
    const own = it.kind === 'num' ? ['−', '.'].filter((c) => it.g.includes(c)) : it.kind === 'sign' || it.parts ? [it.g] : []
    const id = `${it.kind}:${it.g}` + (it.parts ? `[${it.parts.map((part) => part.map((x) => x.id).join(' ')).join(' | ')}]` : '')
    return (before = { ...it, k, signs: [...own, ...inner.flatMap((x) => x.signs)], id })
  })
}

/** Type is set to these widths whatever font the device has (see Token), so a line's layout never depends on it. */
const CHAR: Record<string, number> = { ',': 0.3, '.': 0.24, '−': 0.5 }
const digits = (g: string) => [...g].reduce((w, c) => w + (CHAR[c] ?? 0.62), 0)

/** A fraction's numerals, and what is raised, as a part of the line's size. */
const FRAC = 0.66
const SUP = 0.56
/** The root's own strokes before what it reaches, and the line's run past it. */
const ROOT = { lead: 0.46, tail: 0.08 }

const SPACE = 0.26
const closes = (it: Item) => it.g === ')' || (it.g === '|' && !it.opens)
const opens = (it: Item) => it.g === '(' || (it.g === '|' && !!it.opens)
/** The room between two neighbours: none to speak of inside a pair, under a raised number, or round a point. */
function space(a: Item, b: Item) {
  if (b.kind === 'sup' || a.g === '.' || b.g === '.') return 0.03
  // A bar is a plain stroke, so it stands a little further off than a bracket (a minus next to it must not run into it).
  if ((a.g === '|' && opens(a)) || (b.g === '|' && closes(b))) return 0.13
  if (opens(a) || closes(b) || a.unary || b.g === '%') return 0.05
  return SPACE
}

/** A little line's whole width, in units of its size. */
const span = (list: Item[]): number => list.reduce((w, it, i) => w + widthOf(it) + (i > 0 ? space(list[i - 1], it) : 0), 0)

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
      return Math.max(span(it.parts![0]), span(it.parts![1])) * FRAC + 0.2
    case 'sup':
      return span(it.parts![0]) * SUP + 0.02
    case 'root':
      return ROOT.lead + span(it.parts![0]) + ROOT.tail
  }
}

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

/** The root sign's strokes from x0 to x1 (a tick, down, up, and along the top at y), in units of the size. */
const radical = (x0: number, x1: number, top: number): [number, number][] => [
  [x0 + 0.02, 0.08],
  [x0 + 0.11, 0.02],
  [x0 + 0.22, 0.4],
  [x0 + 0.4, top],
  [x1 - 0.02, top],
]
/** How high the line over a root must sit to clear what is under it. */
const rootTop = (list: Item[]) => (list.some((it) => it.kind === 'sup' || it.kind === 'frac' || it.kind === 'root') ? -0.7 : -0.54)

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
    case '√':
      d = (
        <path
          d={radical(-0.3, 0.3, -0.5)
            .map(([x, y], i) => `${i ? 'L' : 'M'} ${x * S} ${y * S}`)
            .join(' ')}
          {...st}
          strokeWidth={S * 0.075}
        />
      )
      break
    case '.':
      d = dot(0, 0.3, 0.08)
      break
    case '%':
      d = (
        <>
          {L(0.2, -0.36, -0.2, 0.36)}
          <circle cx={-0.22 * S} cy={-0.23 * S} r={0.105 * S} {...st} strokeWidth={S * 0.075} />
          <circle cx={0.22 * S} cy={0.23 * S} r={0.105 * S} {...st} strokeWidth={S * 0.075} />
        </>
      )
      break
    case '≈':
      d = [-0.125, 0.125].map((y, i) => (
        <path key={i} d={`M ${-0.25 * S} ${(y + 0.035) * S} C ${-0.14 * S} ${(y - 0.13) * S} ${-0.06 * S} ${(y - 0.07) * S} 0 ${y * S} C ${0.06 * S} ${(y + 0.07) * S} ${0.14 * S} ${(y + 0.13) * S} ${0.25 * S} ${(y - 0.035) * S}`} {...st} />
      ))
      break
    case '|':
      d = L(0, -0.44, 0, 0.44)
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

/** A little line inside a token, centred on (0, 0). */
function Row({ list, size, colour }: { list: Item[]; size: number; colour: string }) {
  const xs = place(list, size)
  return (
    <>
      {list.map((it, i) => (
        <Token key={it.k} it={it} x={xs[i]} y={0} size={size} colour={colour} />
      ))}
    </>
  )
}

/** One token, its middle at (x, y). */
export function Token({ it, x, y, size, o = 1, s = 1, colour = INK }: { it: Item; x: number; y: number; size: number; o?: number; s?: number; colour?: string }) {
  if (o <= 0) return null
  const S = size
  let d: ReactNode
  switch (it.kind) {
    case 'num':
      if (it.signs.length === 0) {
        d = (
          <text data-num={it.g} {...type(S, colour)} textLength={it.g.length > 1 ? digits(it.g) * S : undefined} lengthAdjust="spacingAndGlyphs">
            {it.g}
          </text>
        )
      } else {
        // A minus before it and the point inside it are drawn, like every sign; the digits either side are type.
        const pieces = it.g.split(/([−.])/).filter(Boolean)
        const start = -digits(it.g) / 2
        d = (
          <g data-num={it.g}>
            {pieces.map((piece, i) => {
              const w = digits(piece)
              const mid = (start + pieces.slice(0, i).reduce((x, q) => x + digits(q), 0) + w / 2) * S
              if (piece === '−' || piece === '.')
                return (
                  <g key={i} transform={`translate(${mid} 0)`}>
                    <Sign g={piece} size={piece === '−' ? S * 0.8 : S} colour={colour} />
                  </g>
                )
              return (
                <text key={i} x={mid} {...type(S, colour)} textLength={piece.length > 1 ? w * S : undefined} lengthAdjust="spacingAndGlyphs">
                  {piece}
                </text>
              )
            })}
          </g>
        )
      }
      break
    case 'sign':
      d = <Sign g={it.g} size={S} colour={colour} />
      break
    case 'unknown':
      d = <text {...type(S, colour === INK ? SOFT : colour)}>?</text>
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
          <g transform={`translate(0 ${-0.38 * S})`}>
            <Row list={it.parts![0]} size={S * FRAC} colour={colour} />
          </g>
          <g data-sign="frac">
            <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke={colour} strokeWidth={S * 0.065} strokeLinecap="round" />
          </g>
          <g transform={`translate(0 ${0.4 * S})`}>
            <Row list={it.parts![1]} size={S * FRAC} colour={colour} />
          </g>
        </>
      )
      break
    }
    case 'sup':
      d = (
        <g data-sign="pow" transform={`translate(0 ${-0.36 * S})`}>
          <Row list={it.parts![0]} size={S * SUP} colour={colour} />
        </g>
      )
      break
    case 'root': {
      const w = widthOf(it)
      const pts = radical(-w / 2, w / 2, rootTop(it.parts![0]))
      d = (
        <>
          <g data-sign="√">
            <path d={pts.map(([px, py], i) => `${i ? 'L' : 'M'} ${px * S} ${py * S}`).join(' ')} stroke={colour} strokeWidth={S * 0.075} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
          <g transform={`translate(${((ROOT.lead - ROOT.tail) / 2) * S} 0)`}>
            {/* Gold is for the sign alone: what it covers stays in ink. */}
            <Row list={it.parts![0]} size={S} colour={INK} />
          </g>
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
