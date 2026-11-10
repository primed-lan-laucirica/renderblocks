/* eslint-disable react-refresh/only-export-components -- a turn's layout and its drawing live together */
/**
 * What a turn puts on the paper (two answers, the cards, a line with a gap
 * and its tiles), laid out once: the scene draws it when the explainer is
 * watched straight through or exported, and the overlay draws his live copy
 * in the same places.
 */
import { items, place, widthOf, type Tok } from '../kit/glyphs'
import { GOLD_EDGE, INK, SANS } from '../kit/look'
import { card, line, loose, row, Sprites, underBead, underReach, type Sprite } from '../kit/sprites'
import type { ChooseTurn, PlaceTurn, PredictTurn } from './spec'

// ── predict ──────────────────────────────────────────────────────────────

export const PREDICT = { y: 968, w: 580, h: 116, gap: 80 }
export const predictX = (i: number) => 960 + (i === 0 ? -1 : 1) * (PREDICT.w + PREDICT.gap) / 2

export function PredictView({ turn, picked = -1, o = 1 }: { turn: PredictTurn; picked?: number; o?: number }) {
  return (
    <g opacity={o}>
      {turn.options.map((opt, i) => {
        const x = predictX(i)
        return (
          <g key={i} data-option={i}>
            <Sprites list={[card(`opt${i}`, x, PREDICT.y, PREDICT.w, PREDICT.h, { gold: picked === i ? 1 : 0 })]} />
            {opt.icon && <g transform={`translate(${x - PREDICT.w / 2 + 84} ${PREDICT.y})`}>{opt.icon()}</g>}
            <text x={opt.icon ? x - PREDICT.w / 2 + 176 : x} y={PREDICT.y} fontFamily={SANS} fontWeight={800} fontSize={48} fill={picked === i ? GOLD_EDGE : INK} textAnchor={opt.icon ? 'start' : 'middle'} dominantBaseline="central">
              {opt.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ── choose ───────────────────────────────────────────────────────────────

const CHOOSE = { y: 560, h: 340, gap: 80, pad: 70, room: 1820 }

/** Where each card sits: `order[i]` is the card in place i. Long statements are set smaller, so the cards always fit the paper. */
export function chooseLayout(turn: ChooseTurn, order: number[]) {
  const n = turn.cards.length
  const lists = turn.cards.map((toks) => items(toks))
  const units = Math.max(
    ...lists.map((list) => {
      const xs = place(list, 1)
      return xs[xs.length - 1] - xs[0] + (widthOf(list[0]) + widthOf(list[list.length - 1])) * 0.5
    }),
  )
  const room = (CHOOSE.room - (n - 1) * CHOOSE.gap) / n - CHOOSE.pad * 2
  const size = Math.min(n > 2 ? 120 : 160, room / units)
  // The beads under the numerals are one size on every card, and the cards are wide enough to hold them.
  const bead = turn.under ? Math.min(...lists.map((list) => underBead(list, place(list, size), size))) : 0
  const reach = turn.under ? Math.max(...turn.cards.map((toks) => underReach(toks, bead))) : 0
  const w = Math.max(units * size + CHOOSE.pad * 2, (units - 0.6) * size + reach * 2 + 60)
  const total = n * w + (n - 1) * CHOOSE.gap
  const h = turn.under ? CHOOSE.h + 70 : CHOOSE.h
  return order.map((c, i) => ({ card: c, x: 960 - total / 2 + w / 2 + i * (w + CHOOSE.gap), y: CHOOSE.y, w, h, size, bead }))
}

export function chooseSprites(turn: ChooseTurn, order: number[], gold = -1): Sprite[][] {
  return chooseLayout(turn, order).map((at) => [
    card(`card${at.card}`, at.x, at.y, at.w, at.h, { gold: gold === at.card ? 1 : 0 }),
    ...line(turn.cards[at.card], { x: at.x, y: turn.under ? at.y - 60 : at.y, size: at.size, under: turn.under, bead: at.bead || undefined }).map((s) => ({ ...s, k: `card${at.card}/${s.k}` })),
  ])
}

/** The line the right card leaves on the paper once the others have gone. */
export function chosenLine(turn: ChooseTurn): Sprite[] {
  const at = chooseLayout(turn, turn.cards.map((_, i) => i))
  const mid = at[Math.floor((at.length - 1) / 2)]
  return line(turn.cards[turn.right], { x: 960, y: turn.under ? mid.y - 60 : mid.y, size: mid.size, under: turn.under, bead: mid.bead || undefined })
}

// ── place ────────────────────────────────────────────────────────────────

export const PLACE = { tile: 170, gap: 60, trayY: 860 }

export function placeLayout(turn: PlaceTurn) {
  const size = turn.size ?? 170
  const y = turn.y ?? 430
  const list = items(turn.toks)
  const xs = place(list, size)
  const gapAt = list.findIndex((it) => it.kind === 'gap')
  const n = turn.tiles.length
  const total = n * PLACE.tile + (n - 1) * PLACE.gap
  return {
    size,
    y,
    gap: { x: 960 + xs[gapAt], y },
    tiles: turn.tiles.map((g, i) => ({ g, x: 960 - total / 2 + PLACE.tile / 2 + i * (PLACE.tile + PLACE.gap), y: PLACE.trayY })),
  }
}

/** The line with its gap (or, `filled`, with the sign in it). */
export function placeLine(turn: PlaceTurn, filled = false): Sprite[] {
  const { size, y } = placeLayout(turn)
  const toks: Tok[] = filled ? turn.toks.map((t) => (t === '_' ? turn.right : t)) : turn.toks
  return line(toks, { y, size, under: turn.under })
}

/** One sign tile, its middle at (x, y). */
export function tileSprites(g: string, x: number, y: number, o: { gold?: number; s?: number; fade?: number } = {}): Sprite[] {
  const c = card(`tile${g}`, x, y, PLACE.tile, PLACE.tile, { gold: o.gold, fade: o.fade })
  c.n.s = o.s ?? 1
  return [c, { k: `tile${g}/g`, type: 'tok', n: { x, y, size: 120 * (o.s ?? 1), o: o.fade ?? 1, gold: o.gold ?? 0 }, d: { it: items([g])[0] } }]
}

export function PlaceView({ turn, k = 0, o = 1 }: { turn: PlaceTurn; k?: number; o?: number }) {
  const at = placeLayout(turn)
  return (
    <g opacity={o}>
      <Sprites list={placeLine(turn)} />
      {at.tiles.map((tile) => {
        if (tile.g !== turn.right || k <= 0) return <Sprites key={tile.g} list={tileSprites(tile.g, tile.x, tile.y)} />
        // The demonstration: the right tile slides up into the gap, and its card falls away.
        const x = tile.x + (at.gap.x - tile.x) * k
        const y = tile.y + (at.gap.y - tile.y) * k
        const [c, g] = tileSprites(tile.g, x, y, { s: 1 + (at.size / 120 - 1) * k })
        return <Sprites key={tile.g} list={[{ ...c, n: { ...c.n, s: 1, o: 1 - k } }, g]} />
      })}
    </g>
  )
}

// ── build ────────────────────────────────────────────────────────────────

/** The tray his beads come from. */
export const SUPPLY = { x: 960, y: 975, w: 420, h: 84 }

export function SupplyView({ o = 1, unit = 1, empty = false }: { o?: number; unit?: number; empty?: boolean }) {
  const { x, y, w, h } = SUPPLY
  // What one move brings: a bead, or a little bar of them.
  const bars = unit > 5 ? 1 : unit > 1 ? Math.max(2, Math.floor(7 / (unit + 0.6))) : 7
  const step = unit > 1 ? Math.min(44, (w - 40) / unit) : 54
  return (
    <g opacity={o}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={20} fill="#9a6b45" />
      <rect x={x - w / 2 + 10} y={y - h / 2 + 10} width={w - 20} height={h - 20} rx={12} fill="#7d5636" />
      {!empty &&
        Array.from({ length: bars }, (_, b) => {
          const mid = x + (b - (bars - 1) / 2) * (unit > 1 ? unit * step + 26 : step)
          return <Sprites key={b} list={loose(row(unit, mid, y, step), { s: unit > 1 ? Math.min(1, step / 44) : 1.15, k: `supply${b}/` })} />
        })}
    </g>
  )
}
