/**
 * Dividing with stamp tiles: the number's tiles at the top, one lane per
 * share below (a skittle heads each). The child deals every tile (drag one
 * into a lane) and breaks every tile that won't share (tap a hundred or a
 * ten in the supply: it becomes ten of the place below). A tap on a lane's
 * tile puts it back. Nothing is ever broken or dealt for them.
 */
import { useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { StampTile } from '../kit/kit'
import { SmallSkittle } from '../kit/part4'
import { PLACE_COLOUR, SANS } from '../kit/sizes'
import { breakTile, deal, undeal, type TileState } from './boardLogic'

const W = 900
const SUPPLY_H = 300
const LANE0 = 320
const LANE_H = 130
const T = 52
const S = T / 64
/** Each place's region (x, width), by place: ones, tens, hundreds. */
const REG = [
  { x: 590, w: 300 },
  { x: 250, w: 330 },
  { x: 10, w: 230 },
]
/** Where the i-th of n tiles sits in a region `rows` high (bunching up when there are many). */
function slot(place: number, i: number, n: number, top: number, rows: number, inset = 0): Pt {
  const { x, w } = REG[place]
  const width = w - 12 - inset
  const base = Math.floor(width / (T + 4))
  const perRow = Math.max(base, Math.ceil(n / rows))
  const step = perRow > 1 ? Math.min(T + 4, (width - T) / (perRow - 1)) : 0
  return { x: x + 6 + inset + (i % perRow) * step, y: top + Math.floor(i / perRow) * (T + 6) }
}
const NAMES = ['ones', 'tens', 'hundreds']

type From = 'supply' | number

export function TileShare({ value, onChange, onCue, className }: { value: TileState; onChange?: (s: TileState) => void; onCue?: (kind: 'tile' | 'break') => void; className?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ from: From; place: number; start: Pt; at: Pt; moved: boolean } | null>(null)
  const k = value.lanes.length
  const H = LANE0 + k * LANE_H

  const toSvg = (e: React.PointerEvent): Pt => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  const placeAt = (q: Pt) => REG.findIndex((r) => q.x >= r.x && q.x <= r.x + r.w)
  const areaAt = (q: Pt): From | null => {
    if (q.y < SUPPLY_H) return 'supply'
    const l = Math.floor((q.y - LANE0) / LANE_H)
    return q.y >= LANE0 && l >= 0 && l < k ? l : null
  }

  const down = (e: React.PointerEvent) => {
    if (!onChange) return
    const q = toSvg(e)
    const place = placeAt(q)
    const from = areaAt(q)
    if (place < 0 || from === null) return
    const have = from === 'supply' ? value.supply[place] : value.lanes[from][place]
    if (have <= 0) return
    svg.current?.setPointerCapture?.(e.pointerId)
    setDrag({ from, place, start: q, at: q, moved: false })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const q = toSvg(e)
    setDrag({ ...drag, at: q, moved: drag.moved || Math.hypot(q.x - drag.start.x, q.y - drag.start.y) > 14 })
  }
  const up = () => {
    if (!drag || !onChange) return
    const { from, place, at, moved } = drag
    setDrag(null)
    if (!moved) {
      // A tap: break a supply tile, or put a lane's tile back.
      if (from === 'supply') {
        if (place > 0) {
          onChange(breakTile(value, place))
          onCue?.('break')
        }
      } else onChange(undeal(value, place, from))
      return
    }
    const to = areaAt(at)
    if (to === null || to === from) return
    if (from === 'supply' && typeof to === 'number') onChange(deal(value, place, to))
    else if (typeof from === 'number' && to === 'supply') onChange(undeal(value, place, from))
    else if (typeof from === 'number' && typeof to === 'number') onChange(deal(undeal(value, place, from), place, to))
    onCue?.('tile')
  }

  const lifted = (area: From, place: number) => (drag?.moved && drag.from === area && drag.place === place ? 1 : 0)
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={`touch-none select-none ${className ?? ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={SUPPLY_H} rx={18} fill="#efe6d4" />
      {[2, 1, 0].map((pl) => {
        const n = value.supply[pl] - lifted('supply', pl)
        return (
          <g key={pl}>
            <text x={REG[pl].x + 8} y={30} fontFamily={SANS} fontWeight={800} fontSize={26} fill={PLACE_COLOUR[pl]}>
              {NAMES[pl]}
            </text>
            {Array.from({ length: n }, (_, i) => {
              const at = slot(pl, i, n, 46, 4)
              return <StampTile key={i} value={(10 ** pl) as 1 | 10 | 100} x={at.x} y={at.y} s={S} />
            })}
          </g>
        )
      })}
      {value.lanes.map((lane, l) => {
        const top = LANE0 + l * LANE_H
        return (
          <g key={l}>
            <rect x={0} y={top} width={W} height={LANE_H - 10} rx={14} fill="#e4d6b8" />
            <SmallSkittle x={30} y={top + 100} s={0.45} />
            {[2, 1, 0].map((pl) => {
              const n = lane[pl] - lifted(l, pl)
              return Array.from({ length: n }, (_, i) => {
                const at = slot(pl, i, n, top + 4, 2, pl === 2 ? 44 : 0)
                return <StampTile key={`${pl}-${i}`} value={(10 ** pl) as 1 | 10 | 100} x={at.x} y={at.y} s={S} />
              })
            })}
          </g>
        )
      })}
      {drag?.moved && <StampTile value={(10 ** drag.place) as 1 | 10 | 100} x={drag.at.x - T / 2} y={drag.at.y - T / 2} s={S} />}
    </svg>
  )
}
