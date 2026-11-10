/**
 * Stage 2's things: a closed box (a number not known yet, its letter on
 * the front), a list of piles with a name under each, and a function
 * machine (a number goes in on the left, the rule is on its front, a number
 * comes out on the right). All are sprites, so they move and fade like the
 * beads; every letter and numeral on them is a token, so the path's rule
 * about which signs an explainer may show holds for them too.
 */
import type { Pt } from '@renderblocks/scene/ease'
import { items, type Tok } from './glyphs'
import { B, INK, WOOD, WOOD_DARK } from './look'
import { line, type BeadColour, type Sprite } from './sprites'

// ── the box ──────────────────────────────────────────────────────────────

export const BOX = { w: 132, h: 100, bead: 34, cols: 3 }

/**
 * A box standing on `floor` (the middle of its foot), small enough for a
 * pan of the balance. Closed, its letter is on the front; `open`, the lid
 * is off, the `n` beads inside show (three to a row, from the bottom) and
 * the letter is a tag under it (under the pan it stands on).
 */
export function box(k: string, floor: Pt, o: { letter?: string; n?: number; open?: boolean; colour?: BeadColour; from?: Pt; gold?: number } = {}): Sprite[] {
  const { w, h, bead, cols } = BOX
  const step = bead + 4
  const out: Sprite[] = [
    {
      k: `${k}/body`,
      type: 'custom',
      n: { x: floor.x, y: floor.y, lid: o.open ? 0 : 1, o: 1 },
      d: {
        id: 'box',
        draw: (p) => (
          <g>
            <rect x={p.x - w / 2} y={p.y - h} width={w} height={h} rx={12} fill="#fbf6ea" stroke={WOOD} strokeWidth={6} />
            <g opacity={p.lid} transform={`translate(0 ${(p.lid - 1) * 46})`}>
              <rect x={p.x - w / 2 - 9} y={p.y - h - 14} width={w + 18} height={26} rx={9} fill={WOOD} stroke={WOOD_DARK} strokeWidth={4} />
            </g>
          </g>
        ),
      },
    },
  ]
  if (o.open)
    for (let i = 0; i < (o.n ?? 0); i++)
      out.push({ k: `${k}/b${i}`, type: 'bead', n: { x: floor.x + ((i % cols) - (cols - 1) / 2) * step, y: floor.y - 10 - bead / 2 - Math.floor(i / cols) * step, s: bead / B, o: 1, ghost: 0 }, d: { colour: o.colour }, enter: o.from ? { x: o.from.x, y: o.from.y } : undefined })
  if (o.letter) out.push({ k: `${k}/name`, type: 'tok', n: o.open ? { x: floor.x, y: floor.y + 86, size: 76, o: 1, gold: o.gold ?? 0 } : { x: floor.x, y: floor.y - h / 2 + 6, size: 80, o: 1, gold: o.gold ?? 0 }, d: { it: items([o.letter])[0] } })
  return out
}

// ── a list of piles ──────────────────────────────────────────────────────

export interface PilesOpts {
  /** The middle of the row, and the floor the piles stand on. */
  x?: number
  y: number
  /** From one pile's middle to the next. */
  step?: number
  /** A bead's side. */
  size?: number
  k?: string
  colour?: BeadColour | ((i: number) => BeadColour | undefined)
  /** What is written under pile i (counting from 0): a name such as x₁, or its amount. */
  label?: (i: number) => Tok[] | null
  labelSize?: number
  /** Piles whose labels show in gold, and piles shown faint (beads and label). */
  gold?: number[]
  faint?: number[]
}

/** Where pile i of n stands. */
export const pileX = (i: number, n: number, o: { x?: number; step?: number }) => (o.x ?? 960) + (i - (n - 1) / 2) * (o.step ?? 200)

/** A row of piles, one bead wide, each standing on the floor with its label under it. */
export function piles(values: number[], o: PilesOpts): Sprite[] {
  const size = o.size ?? 56
  const up = size * 1.1
  const k = o.k ?? 'p'
  const out: Sprite[] = []
  values.forEach((v, i) => {
    const x = pileX(i, values.length, o)
    const fade = o.faint?.includes(i) ? 0.3 : 1
    const colour = typeof o.colour === 'function' ? o.colour(i) : o.colour
    for (let j = 0; j < v; j++) out.push({ k: `${k}${i}/b${j}`, type: 'bead', n: { x, y: o.y - size / 2 - j * up, s: size / B, o: fade, ghost: 0 }, d: { colour } })
    const label = o.label?.(i)
    if (label) out.push(...line(label, { x, y: o.y + (o.labelSize ?? 80) * 0.75, size: o.labelSize ?? 80, fade, gold: o.gold?.includes(i) ? items(label).map((it) => it.k) : [] }).map((s) => ({ ...s, k: `${k}${i}/${s.k}` })))
  })
  return out
}

// ── the function machine ─────────────────────────────────────────────────

export interface Machine {
  x: number
  y: number
  w?: number
  h?: number
}
const sized = (m: Machine) => ({ w: m.w ?? 460, h: m.h ?? 300 })
/** Where a number waits before it goes in, the machine's middle (where it is out of sight), and where it comes out. */
export const machineIn = (m: Machine): Pt => ({ x: m.x - sized(m).w / 2 - 190, y: m.y })
export const machineOut = (m: Machine): Pt => ({ x: m.x + sized(m).w / 2 + 190, y: m.y })

/** The machine: a body with a funnel on the left and a spout on the right. Its rule is a line set on its front (`machineRule`). */
export function machine(m: Machine, k = 'machine'): Sprite[] {
  const { w, h } = sized(m)
  return [
    {
      k,
      type: 'custom',
      n: { x: m.x, y: m.y, o: 1 },
      d: {
        id: `machine ${w} ${h}`,
        draw: (p) => (
          <g strokeLinejoin="round">
            <path d={`M ${p.x - w / 2 - 96} ${p.y - 84} L ${p.x - w / 2 + 6} ${p.y - 44} L ${p.x - w / 2 + 6} ${p.y + 44} L ${p.x - w / 2 - 96} ${p.y + 84} Z`} fill="#b99a6f" stroke={WOOD_DARK} strokeWidth={6} />
            <path d={`M ${p.x + w / 2 - 6} ${p.y - 44} L ${p.x + w / 2 + 84} ${p.y - 44} L ${p.x + w / 2 + 84} ${p.y + 44} L ${p.x + w / 2 - 6} ${p.y + 44} Z`} fill="#b99a6f" stroke={WOOD_DARK} strokeWidth={6} />
            <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={34} fill="#d8bf95" stroke={WOOD_DARK} strokeWidth={7} />
            <rect x={p.x - w / 2 + 34} y={p.y - h / 2 + 46} width={w - 68} height={h - 92} rx={18} fill="#fbf6ea" stroke={WOOD} strokeWidth={4} />
            <circle cx={p.x - w / 2 + 40} cy={p.y - h / 2 + 24} r={7} fill={INK} opacity={0.5} />
            <circle cx={p.x + w / 2 - 40} cy={p.y - h / 2 + 24} r={7} fill={INK} opacity={0.5} />
          </g>
        ),
      },
    },
  ]
}

/** The rule on the machine's front, set to fit its window. */
export function machineRule(m: Machine, toks: Tok[], o: { size?: number; gold?: string[] } = {}): Sprite[] {
  return line(toks, { x: m.x, y: m.y, size: o.size ?? 84, gold: o.gold })
}

/** A numeral (or a letter) on its way through: `where` is 'in', 'inside' (out of sight) or 'out'. */
export function through(k: string, m: Machine, tok: string, where: 'in' | 'inside' | 'out', o: { size?: number; gold?: number } = {}): Sprite {
  const at = where === 'in' ? machineIn(m) : where === 'out' ? machineOut(m) : { x: m.x, y: m.y }
  return { k, type: 'tok', n: { x: at.x, y: at.y, size: o.size ?? 130, o: where === 'inside' ? 0 : 1, gold: o.gold ?? 0 }, d: { it: items([tok])[0] } }
}
