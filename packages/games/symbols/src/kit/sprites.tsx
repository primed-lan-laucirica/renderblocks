/* eslint-disable react-refresh/only-export-components -- the kit exports its drawings together with the helpers that place them */
/**
 * Everything an explainer shows is a sprite: a bead, a token of an equation
 * line, the balance, a few words, a card, or a one-off drawing. A sprite is
 * a name, numbers that can move (where it is, how big, how solid) and what
 * it shows. Two states of the same sprite blend by their numbers, so a
 * scene is drawn for any t from the states either side of it.
 *
 * The helpers below (balance, line, words, loose, custom) lay out the usual
 * things as sprites; a spec's stage is made of them.
 */
import type { ReactNode } from 'react'
import { lerp, type Pt } from '@renderblocks/scene/ease'
import { items, place, Token, type Item, type Tok } from './glyphs'
import { B, GOLD, GOLD_EDGE, HAND, INK, LINE, SANS, SERIF, WOOD, WOOD_DARK } from './look'

export type BeadColour = 'gold' | 'blue' | 'red' | 'green'
const BEAD: Record<BeadColour, [string, string]> = {
  gold: [GOLD, GOLD_EDGE],
  blue: ['#5b9bd5', '#2f6394'],
  red: ['#dd6b55', '#9c3c2b'],
  green: ['#6bb36f', '#3c7a41'],
}

export type Nums = Record<string, number>

interface Data {
  it?: Item
  text?: string
  font?: 'hand' | 'old' | 'sans'
  anchor?: 'start' | 'middle' | 'end'
  colour?: string
  /** A one-off drawing: its name, and how to draw it from its numbers. */
  id?: string
  draw?: (p: Nums) => ReactNode
}

export interface Sprite {
  /** Its name on the stage (a helper's sprites are named within their actor). */
  k: string
  type: 'bead' | 'tok' | 'balance' | 'text' | 'card' | 'custom'
  /** What can move: x, y, o (how solid), s (scale) and the type's own. */
  n: Nums
  d: Data
  /** Where it comes in from, and goes out to (default: fades where it stands). */
  enter?: Nums
  exit?: Nums
}

/** What a sprite shows, apart from its numbers: two states that differ here cross-fade. */
export const sig = (s: Sprite) => `${s.type}|${s.d.it ? `${s.d.it.kind}:${s.d.it.g}:${s.d.it.top ?? ''}/${s.d.it.bot ?? ''}` : ''}|${s.d.text ?? ''}|${s.d.font ?? ''}|${s.d.anchor ?? ''}|${s.d.colour ?? ''}|${s.d.id ?? ''}`

const REST: Nums = { o: 1, s: 1, ghost: 0, w: 1, gold: 0, tilt: 0 }

function blend(a: Nums, b: Nums, k: number): Nums {
  const out: Nums = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key] ?? REST[key] ?? b[key]
    const vb = b[key] ?? REST[key] ?? a[key]
    out[key] = lerp(va, vb, k)
  }
  return out
}

export const same = (a: Sprite | null, b: Sprite | null) => {
  if (!a || !b) return a === b
  if (sig(a) !== sig(b)) return false
  const ka = Object.keys(a.n)
  return ka.length === Object.keys(b.n).length && ka.every((key) => a.n[key] === b.n[key])
}

/** A sprite part of the way (k, 0 to 1) from one state to the next; either may be absent. */
export function between(a: Sprite | null, b: Sprite | null, k: number): Sprite[] {
  if (!a && !b) return []
  if (!a) return [{ ...b!, n: blend({ ...b!.n, o: 0, ...b!.enter }, b!.n, k) }]
  if (!b) return [{ ...a, n: blend(a.n, { ...a.n, o: 0, ...a.exit }, k) }]
  const n = blend(a.n, b.n, k)
  if (sig(a) === sig(b)) return [{ ...b, n }]
  const o = n.o ?? 1
  return [
    { ...a, n: { ...n, o: o * (1 - k) } },
    { ...b, n: { ...n, o: o * k } },
  ]
}

/** The same sprites, some coming in from (or going out to) their own places: `from[name]` overrides where that sprite starts. */
export const entering = (list: Sprite[], from: Record<string, Nums>): Sprite[] => list.map((s) => (from[s.k] ? { ...s, enter: from[s.k] } : s))
export const leaving = (list: Sprite[], to: Record<string, Nums>): Sprite[] => list.map((s) => (to[s.k] ? { ...s, exit: to[s.k] } : s))

// ── the balance ──────────────────────────────────────────────────────────

/** Half the beam, how far a pan hangs under it, and the post's height. */
export const ARM = 420
const HANG = 150
const POST = 420

/** The middle of the balance on the paper, and of each pan. */
export const PIVOT = { x: 960, y: 430 }
export const PAN_X = { left: PIVOT.x - ARM, right: PIVOT.x + ARM }
/** A level pan's floor. */
export const PAN_Y = PIVOT.y + HANG - 2

/** Where a pan's load stands (the middle of its floor): side −1 is the left pan. A positive tilt (degrees) drops the right one. */
export function panFloor(x: number, y: number, tilt: number, side: -1 | 1): Pt {
  const r = (tilt * Math.PI) / 180
  return { x: x + side * ARM * Math.cos(r), y: y + side * ARM * Math.sin(r) + HANG - 2 }
}

function BalanceShape({ n }: { n: Nums }) {
  const { x, y } = n
  const r = ((n.tilt ?? 0) * Math.PI) / 180
  const dx = ARM * Math.cos(r)
  const dy = ARM * Math.sin(r)
  return (
    <g opacity={n.o ?? 1}>
      <rect x={x - 190} y={y + POST - 14} width={380} height={28} rx={10} fill={WOOD_DARK} />
      <polygon points={`${x},${y} ${x - 76},${y + POST - 8} ${x + 76},${y + POST - 8}`} fill={WOOD} />
      {([-1, 1] as const).map((side) => {
        const px = x + side * dx
        const py = y + side * dy
        return (
          <g key={side}>
            <line x1={px} y1={py} x2={px - 150} y2={py + HANG} stroke="#8a6a2a" strokeWidth={3.5} />
            <line x1={px} y1={py} x2={px + 150} y2={py + HANG} stroke="#8a6a2a" strokeWidth={3.5} />
            <path d={`M ${px - 170} ${py + HANG} Q ${px} ${py + HANG + 66} ${px + 170} ${py + HANG} Z`} fill="#9a6b45" />
          </g>
        )
      })}
      <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={WOOD_DARK} strokeWidth={17} strokeLinecap="round" />
      <circle cx={x} cy={y} r={20} fill="#d9a441" stroke={GOLD_EDGE} strokeWidth={2} />
    </g>
  )
}

/** A pile of beads on a pan: `ghost` of the last ones only outlines (taken away), `part` one more that is only part of a bead. */
export interface Pile {
  n: number
  cols?: number
  colour?: BeadColour
  ghost?: number
  part?: number
}

/** What a pan holds: piles of beads side by side, or a numeral card (which weighs its number). */
export interface Pan {
  piles?: Pile[]
  card?: string
  /** Its weight, if not what it shows. */
  weight?: number
  /** New beads come in from here (from the pan's floor), e.g. rolling in from off the paper. */
  from?: Pt
  /** A bead's side, when the usual size would pile too high. */
  size?: number
}

export const beadsOn = (...piles: (number | Pile)[]): Pan => ({ piles: piles.map((p) => (typeof p === 'number' ? { n: p } : p)) })
export const cardOn = (card: string): Pan => ({ card })

const amount = (p: Pile) => p.n - (p.ghost ?? 0) + (p.part ?? 0)
export const weigh = (pan?: Pan) => (!pan ? 0 : (pan.weight ?? (pan.card ? Number(pan.card.replace(/,/g, '')) : (pan.piles ?? []).reduce((w, p) => w + amount(p), 0))))

/** How far the beam leans for a difference in weight (right minus left), in degrees. */
export const lean = (d: number) => (d === 0 ? 0 : Math.sign(d) * Math.min(12, 5 + 2 * Math.abs(d)))

const PAN_BEAD = 50
const PAN_ROOM = 300

/** Beads in piles standing on a floor point, as sprites named `${name}${i}`. */
export function piled(name: string, floor: Pt, piles: Pile[], opts: { size?: number; room?: number; from?: Pt; fade?: number } = {}): Sprite[] {
  const cols = piles.map((p) => p.cols ?? Math.min(Math.max(p.n + (p.part ? 1 : 0), 1), 5))
  let size = opts.size ?? PAN_BEAD
  const gap = 0.5
  const wide = (sz: number) => cols.reduce((w, c) => w + c * sz * 1.11, 0) + (cols.length - 1) * sz * gap
  const room = opts.room ?? PAN_ROOM
  if (wide(size) > room) size *= room / wide(size)
  const step = size * 1.11
  const out: Sprite[] = []
  let left = floor.x - wide(size) / 2
  let i = 0
  piles.forEach((pile, pi) => {
    const c = cols[pi]
    const total = pile.n + (pile.part ? 1 : 0)
    for (let j = 0; j < total; j++, i++) {
      const part = j >= pile.n ? pile.part! : 1
      const cell = left + (j % c) * step
      const x = cell + (size * part) / 2 + (step - size) / 2
      const y = floor.y - Math.floor(j / c) * step - size / 2
      const n: Nums = { x, y, s: size / B, o: opts.fade ?? 1, ghost: j >= pile.n - (pile.ghost ?? 0) && j < pile.n ? 1 : 0, w: part }
      out.push({ k: `${name}${i}`, type: 'bead', n, d: { colour: pile.colour }, enter: opts.from ? { x: floor.x + opts.from.x, y: floor.y + opts.from.y } : undefined })
    }
    left += c * step + size * gap
  })
  return out
}

/**
 * The balance, with what its pans hold. The beam leans by the weights
 * unless it is `held` level (a hand on it) or given a `tilt`.
 */
export function balance(o: { x?: number; y?: number; left?: Pan; right?: Pan; held?: boolean; tilt?: number; fade?: number } = {}): Sprite[] {
  const x = o.x ?? 960
  const y = o.y ?? PIVOT.y
  const fade = o.fade ?? 1
  const tilt = o.tilt ?? (o.held ? 0 : lean(weigh(o.right) - weigh(o.left)))
  const out: Sprite[] = [{ k: 'beam', type: 'balance', n: { x, y, tilt, o: fade }, d: {} }]
  for (const side of [-1, 1] as const) {
    const pan = side < 0 ? o.left : o.right
    if (!pan) continue
    const name = side < 0 ? 'L' : 'R'
    const floor = panFloor(x, y, tilt, side)
    if (pan.card) {
      out.push({ k: `${name}card`, type: 'card', n: { x: floor.x, y: floor.y - 62, w: 150, h: 120, o: fade }, d: {} })
      out.push({ k: `${name}num`, type: 'tok', n: { x: floor.x, y: floor.y - 60, size: 96, o: fade }, d: { it: items([pan.card])[0] } })
    }
    if (pan.piles) out.push(...piled(name, floor, pan.piles, { from: pan.from, fade, size: pan.size }))
  }
  return out
}

/** Blocks under both pans, holding the beam level whatever it carries; taken off, they drop away. */
export function props(x = PIVOT.x, y = PIVOT.y): Sprite[] {
  const draw = (p: Nums) => (
    <>
      {[-1, 1].map((side) => (
        <rect key={side} x={p.x + side * ARM - 42} y={p.y + HANG + 36} width={84} height={POST - HANG - 50} rx={9} fill="#b9a488" stroke="#8f7a5e" strokeWidth={3} />
      ))}
    </>
  )
  return [{ k: 'props', type: 'custom', n: { x, y, o: 1 }, d: { id: 'props', draw }, enter: { y: y + 70 }, exit: { y: y + 70 } }]
}

// ── the equation line ────────────────────────────────────────────────────

export interface LineOpts {
  x?: number
  y?: number
  size?: number
  /** Each numeral's amount as beads under it (up to 30). */
  under?: boolean
  /** The size of those beads, when several lines must share one (the cards of a choice). */
  bead?: number
  /** Tokens to show in gold (by name or by glyph), and tokens to show faint. */
  gold?: string[]
  faint?: string[]
  fade?: number
  /** Each token's own x, when the line is spread out (a numeral over each pan). */
  at?: number[]
}

/** An equation line: its tokens set in a row, centred on (x, y). */
/** Does a token get beads under it? Whole numbers up to thirty do. */
const counted = (it: Item) => it.kind !== 'frac' && it.n !== undefined && Number.isInteger(it.n) && it.n > 0 && it.n <= 30
/** How many beads wide the pile under a numeral is: one row up to ten, then rows of five. */
const underCols = (n: number) => (n > 10 ? 5 : n)

/**
 * The size of the beads under a line's numerals. They are one size along the
 * whole line, so more beads look like more, and small enough that two
 * neighbours' piles never touch. `xs` are the tokens' middles.
 */
export function underBead(list: Item[], xs: number[], size: number): number {
  let bead = size * (list.some((it) => counted(it) && it.n! > 6) ? 0.15 : 0.2)
  let last = -1
  list.forEach((it, i) => {
    if (!counted(it)) return
    if (last >= 0) bead = Math.min(bead, (xs[i] - xs[last]) / (((underCols(it.n!) + underCols(list[last].n!)) / 2) * 1.11 + 0.6))
    last = i
  })
  return bead
}

/** How far the beads under a line reach past its first and last tokens' middles. */
export function underReach(toks: Tok[], bead: number): number {
  const list = items(toks)
  return Math.max(0, ...[list[0], list[list.length - 1]].map((it) => (counted(it) ? (underCols(it.n!) * bead * 1.11) / 2 : 0)))
}

export function line(toks: Tok[], o: LineOpts = {}): Sprite[] {
  const x = o.x ?? 960
  const y = o.y ?? 200
  const size = o.size ?? LINE
  const fade = o.fade ?? 1
  const list = items(toks)
  const xs = place(list, size)
  if (o.at) list.forEach((_, i) => (xs[i] = o.at![i] - x))
  const bead = o.bead ?? underBead(list, xs, size)
  const out: Sprite[] = []
  list.forEach((it, i) => {
    const has = (names?: string[]) => !!names && (names.includes(it.k) || names.includes(it.g))
    out.push({ k: it.k, type: 'tok', n: { x: x + xs[i], y, size, o: fade * (has(o.faint) ? 0.3 : 1), gold: has(o.gold) ? 1 : 0 }, d: { it } })
    if (o.under && counted(it)) {
      const cols = underCols(it.n!)
      const rows = Math.ceil(it.n! / cols)
      out.push(...piled(`${it.k}/u`, { x: x + xs[i], y: y + size * 0.62 + rows * bead * 1.11 }, [{ n: it.n!, cols }], { size: bead, room: 1e6, fade }))
    }
  })
  return out
}

// ── words, loose beads, cards, one-offs ──────────────────────────────────

export interface WordsOpts {
  x?: number
  y: number
  size?: number
  font?: 'hand' | 'old' | 'sans'
  /** How much of it is written yet (0 to 1). */
  write?: number
  anchor?: 'start' | 'middle' | 'end'
  colour?: string
  fade?: number
  k?: string
}

/** A few words on the paper (not narration: old words, a title on a drawn book, a label). */
export function words(text: string, o: WordsOpts): Sprite[] {
  return [{ k: o.k ?? 't', type: 'text', n: { x: o.x ?? 960, y: o.y, size: o.size ?? 64, o: o.fade ?? 1, w: o.write ?? 1 }, d: { text, font: o.font ?? 'hand', anchor: o.anchor ?? 'middle', colour: o.colour } }]
}

/** Loose beads, each at its own point (its middle). */
export function loose(pts: Pt[], o: { colour?: BeadColour; s?: number; ghost?: (i: number) => number; k?: string; from?: Pt; fade?: number } = {}): Sprite[] {
  return pts.map((pt, i) => ({ k: `${o.k ?? 'b'}${i}`, type: 'bead', n: { x: pt.x, y: pt.y, s: o.s ?? 1, o: o.fade ?? 1, ghost: o.ghost?.(i) ?? 0 }, d: { colour: o.colour }, enter: o.from ? { x: o.from.x, y: o.from.y } : undefined }))
}

/** n points in a row centred on (x, y). */
export const row = (n: number, x: number, y: number, step = B * 1.15): Pt[] => Array.from({ length: n }, (_, i) => ({ x: x + (i - (n - 1) / 2) * step, y }))
/** n points in rows of `cols`, the block centred on (x, y). */
export const grid = (n: number, cols: number, x: number, y: number, step = B * 1.15): Pt[] => {
  const rows = Math.ceil(n / cols)
  return Array.from({ length: n }, (_, i) => ({ x: x + ((i % cols) - (cols - 1) / 2) * step, y: y + (Math.floor(i / cols) - (rows - 1) / 2) * step }))
}

export function card(k: string, x: number, y: number, w: number, h: number, o: { gold?: number; fade?: number } = {}): Sprite {
  return { k, type: 'card', n: { x, y, w, h, o: o.fade ?? 1, gold: o.gold ?? 0 }, d: {} }
}

/** A one-off drawing (the book, the quill, Recorde's long lines): drawn from numbers, so it can move like anything else. */
export function custom(id: string, draw: (p: Nums) => ReactNode, p: Nums = {}): Sprite[] {
  return [{ k: id, type: 'custom', n: { x: 0, y: 0, o: 1, ...p }, d: { id, draw } }]
}

// ── drawing ──────────────────────────────────────────────────────────────

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
/** A colour part of the way between two (#rrggbb). */
export function tint(a: string, b: string, k: number) {
  if (k <= 0) return a
  if (k >= 1) return b
  const [x, y] = [hex(a), hex(b)]
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(' ')})`
}

function Bead({ n, colour = 'gold' }: { n: Nums; colour?: BeadColour }) {
  const size = B * (n.s ?? 1)
  const [fill, edge] = BEAD[colour]
  const ghost = n.ghost ?? 0
  const stroke = Math.max(1.2, size * 0.055)
  // Half a bead (`half` -1 is the left half, 1 the right): round outside, cut straight inside. (x, y) is the half's own middle.
  if (n.half) {
    const d = Math.sign(n.half)
    const r = size * 0.2
    const out = n.x + (d * size) / 4
    const cut = n.x - (d * size) / 4
    const top = n.y - size / 2
    const bot = n.y + size / 2
    return (
      <g opacity={n.o ?? 1} data-bead="half">
        <path d={`M ${cut} ${top} L ${out - d * r} ${top} Q ${out} ${top} ${out} ${top + r} L ${out} ${bot - r} Q ${out} ${bot} ${out - d * r} ${bot} L ${cut} ${bot} Z`} fill={fill} stroke={edge} strokeWidth={stroke} strokeLinejoin="round" />
        <rect x={d < 0 ? out + size * 0.14 : cut + size * 0.04} y={top + size * 0.13} width={d < 0 ? size * 0.3 : size * 0.12} height={size * 0.16} rx={size * 0.08} fill="#fff" opacity={0.35} />
      </g>
    )
  }
  const w = size * (n.w ?? 1)
  return (
    <g opacity={n.o ?? 1} data-bead="">
      <rect x={n.x - w / 2} y={n.y - size / 2} width={w} height={size} rx={size * 0.2} fill={fill} fillOpacity={1 - ghost * 0.92} stroke={edge} strokeWidth={stroke} strokeDasharray={ghost > 0.5 ? `${size * 0.16} ${size * 0.12}` : undefined} />
      {ghost < 0.5 && <rect x={n.x - w / 2 + size * 0.14} y={n.y - size / 2 + size * 0.13} width={Math.max(0, w - size * 0.5)} height={size * 0.16} rx={size * 0.08} fill="#fff" opacity={0.35 * (1 - ghost)} />}
    </g>
  )
}

const FONT = { hand: HAND, old: SERIF, sans: SANS }

export function Draw({ s }: { s: Sprite }) {
  const n = s.n
  const o = n.o ?? 1
  if (o <= 0.001) return null
  switch (s.type) {
    case 'bead':
      return <Bead n={n} colour={s.d.colour as BeadColour | undefined} />
    case 'tok':
      return <Token it={s.d.it!} x={n.x} y={n.y} size={n.size} o={o} s={n.s ?? 1} colour={tint(INK, GOLD_EDGE, n.gold ?? 0)} />
    case 'balance':
      return <BalanceShape n={n} />
    case 'text': {
      const text = s.d.text ?? ''
      const shown = (n.w ?? 1) >= 1 ? text : text.slice(0, Math.round(text.length * (n.w ?? 1)))
      const font = s.d.font ?? 'hand'
      return (
        <text x={n.x} y={n.y} opacity={o} fontFamily={FONT[font]} fontStyle={font === 'old' ? 'italic' : undefined} fontWeight={font === 'sans' ? 700 : 400} fontSize={n.size} fill={s.d.colour ?? INK} textAnchor={s.d.anchor ?? 'middle'} dominantBaseline="central" style={{ whiteSpace: 'pre' }}>
          {shown}
        </text>
      )
    }
    case 'card': {
      const sc = n.s ?? 1
      const gold = n.gold ?? 0
      return (
        <g opacity={o} transform={`translate(${n.x} ${n.y}) scale(${sc})`}>
          <rect x={-n.w / 2 + 3} y={-n.h / 2 + 6} width={n.w} height={n.h} rx={18} fill="#3b2f25" opacity={0.14} />
          <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} rx={18} fill="#fbf6ea" stroke={tint('#cbbd9f', GOLD, gold)} strokeWidth={3 + gold * 5} />
        </g>
      )
    }
    case 'custom':
      return <g opacity={o}>{s.d.draw?.(n)}</g>
  }
}

/** A list of sprites, drawn in order. */
export function Sprites({ list }: { list: Sprite[] }) {
  return (
    <>
      {list.map((s) => (
        <Draw key={`${s.k}|${sig(s)}`} s={s} />
      ))}
    </>
  )
}
