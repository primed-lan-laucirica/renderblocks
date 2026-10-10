/**
 * The fraction table: frames (round holes) and fraction pieces under the
 * child's hands. One tool at a time:
 *   - move: drag a piece into a frame (it fits where there's room), lay it
 *     on another loose piece (it lies over it, side by side with its own
 *     size), or anywhere on the table; drag it off the table to put it away;
 *   - cut in 2 / cut in 3: tap a piece;
 *   - join: drag across pieces of one size lying together; they join into
 *     one bigger piece if they make a size in the box (four quarters: a whole).
 * Every change is the child's own.
 */
import { useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { FractionFrame, FractionPiece } from '../kit/kit'
import { SANS } from '../kit/sizes'
import { cue } from './sound'
import { TURN, cut, fits, join, layOn, looseGroups, placeIn, span, together, type Piece } from './fractionModel'

export type Tool = 'move' | 'cut2' | 'cut3' | 'join'

export interface FrameSpec extends Pt {
  /** A frame the child can look at but not change (the amount to match). */
  locked?: boolean
}

export const TABLE = 1000
export const R = 150
const RED = '#d63b3b'
/** A piece lying over another is drawn in a second colour, so both show. */
const OVER = '#e9823a'
const PICKED = '#f6b26b'

/** Where a piece's circle is centred. */
const centreOf = (p: Piece, frames: FrameSpec[]): Pt => (p.frame !== null ? frames[p.frame] : { x: p.x, y: p.y })

/** Is point q on piece p (inside its wedge)? */
function onPiece(p: Piece, c: Pt, q: Pt) {
  const dx = q.x - c.x
  const dy = q.y - c.y
  if (Math.hypot(dx, dy) > R) return false
  if (p.d === 1) return true
  const ang = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2)
  const u = (ang / (Math.PI * 2)) * TURN
  const rel = (u - p.a + TURN) % TURN
  return rel < span(p.d)
}

interface Props {
  pieces: Piece[]
  frames: FrameSpec[]
  tool: Tool
  onChange: (ps: Piece[]) => void
  /** Pieces dragged off the table go back in the box (otherwise they spring back). */
  removable?: boolean
  className?: string
}

export function FractionCircles({ pieces, frames, tool, onChange, removable = true, className }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: number; off: Pt; at: Pt; start: Pt; moved: boolean } | null>(null)
  const [gather, setGather] = useState<{ ids: number[]; at: Pt; start: Pt; moved: boolean } | null>(null)
  const [flash, setFlash] = useState<{ id: number; n: number } | null>(null)
  const nextId = pieces.reduce((m, p) => Math.max(m, p.id), 0) + 1
  const locked = (p: Piece) => p.frame !== null && !!frames[p.frame]?.locked

  const toTable = (e: React.PointerEvent): Pt => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  /** Drawing order: frame pieces, then loose ones as they were put down. The topmost piece under q. */
  const order = [...pieces.filter((p) => p.frame !== null), ...pieces.filter((p) => p.frame === null)]
  const hit = (q: Pt) => [...order].reverse().find((p) => onPiece(p, centreOf(p, frames), q)) ?? null

  const down = (e: React.PointerEvent) => {
    const q = toTable(e)
    const p = hit(q)
    if (!p || locked(p)) return
    if (tool === 'cut2' || tool === 'cut3') {
      const parts = cut(p, tool === 'cut2' ? 2 : 3, nextId)
      if (!parts) return
      const i = pieces.indexOf(p)
      onChange([...pieces.slice(0, i), ...parts, ...pieces.slice(i + 1)])
      cue('break')
      return
    }
    svg.current?.setPointerCapture?.(e.pointerId)
    if (tool === 'join') {
      setGather({ ids: [p.id], at: q, start: q, moved: false })
      return
    }
    const c = centreOf(p, frames)
    setDrag({ id: p.id, off: { x: c.x - q.x, y: c.y - q.y }, at: q, start: q, moved: false })
  }

  const move = (e: React.PointerEvent) => {
    const q = toTable(e)
    if (drag) setDrag({ ...drag, at: q, moved: drag.moved || Math.hypot(q.x - drag.start.x, q.y - drag.start.y) > 8 })
    if (gather) {
      const first = pieces.find((p) => p.id === gather.ids[0])
      const p = hit(q)
      const ids = p && first && !gather.ids.includes(p.id) && p.d === first.d && together(first, p) ? [...gather.ids, p.id] : gather.ids
      setGather({ ...gather, ids, at: q, moved: gather.moved || Math.hypot(q.x - gather.start.x, q.y - gather.start.y) > 8 })
    }
  }

  const up = () => {
    if (gather) {
      const g = gather
      setGather(null)
      const picked = pieces.filter((p) => g.ids.includes(p.id))
      const whole = join(picked, nextId)
      if (!whole) return
      const at = pieces.findIndex((p) => g.ids.includes(p.id))
      const rest = pieces.filter((p) => !g.ids.includes(p.id))
      onChange([...rest.slice(0, at), whole, ...rest.slice(at)])
      setFlash({ id: whole.id, n: (flash?.n ?? 0) + 1 })
      cue('fuse')
      return
    }
    if (!drag) return
    const d = drag
    setDrag(null)
    if (!d.moved) return
    const p = pieces.find((x) => x.id === d.id)
    if (!p) return
    const others = pieces.filter((x) => x.id !== p.id)
    const c = { x: d.at.x + d.off.x, y: d.at.y + d.off.y }
    // Into a frame, where there's room.
    const f = frames.findIndex((fr) => !fr.locked && Math.hypot(c.x - fr.x, c.y - fr.y) < R * 0.8)
    if (f >= 0) {
      const a = placeIn(
        others.filter((x) => x.frame === f),
        p.d,
        p.a,
      )
      if (a === null) return
      onChange([...others, { ...p, frame: f, a }])
      cue('piece', p.d % 10)
      return
    }
    // Off the table: back in the box.
    if (c.x < 0 || c.y < 0 || c.x > TABLE || c.y > TABLE) {
      if (removable) onChange(others)
      return
    }
    // Onto another loose piece: laid over it.
    const group = looseGroups(others).find((g) => Math.hypot(g[0].x - c.x, g[0].y - c.y) < 70)
    if (group) {
      onChange([...others, { ...p, frame: null, x: group[0].x, y: group[0].y, a: layOn(group, p.d, p.a) }])
      cue('piece', p.d % 10)
      return
    }
    onChange([...others, { ...p, frame: null, x: Math.min(TABLE - 40, Math.max(40, c.x)), y: Math.min(TABLE - 40, Math.max(40, c.y)) }])
  }

  // Which loose pieces lie over others (drawn in the second colour).
  const over = new Set<number>()
  for (const g of looseGroups(pieces)) {
    const bottom: Piece[] = []
    for (const p of g) {
      if (fits(bottom, p.d, p.a)) bottom.push(p)
      else over.add(p.id)
    }
  }
  const picked = new Set(gather?.ids ?? [])

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${TABLE} ${TABLE}`}
      className={`touch-none select-none ${className ?? ''}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        setDrag(null)
        setGather(null)
      }}
    >
      <style>{`@keyframes ft-flash { 0% { filter: brightness(1.7) } 100% { filter: brightness(1) } } .ft-flash { animation: ft-flash 0.9s ease-out }`}</style>
      <rect x={0} y={0} width={TABLE} height={TABLE} rx={24} fill="#efe6d4" />
      {frames.map((f, i) => (
        <g key={i}>
          <FractionFrame cx={f.x} cy={f.y} r={R} />
          {f.locked && <rect x={f.x - R - 30} y={f.y - R - 30} width={2 * R + 60} height={2 * R + 60} rx={14} fill="none" stroke="#c8a24a" strokeWidth={6} />}
        </g>
      ))}
      {order.map((p) => {
        const dragging = drag?.moved && drag.id === p.id
        const c = dragging ? { x: drag.at.x + drag.off.x, y: drag.at.y + drag.off.y } : centreOf(p, frames)
        const colour = picked.has(p.id) ? PICKED : over.has(p.id) ? OVER : RED
        return (
          <g key={`${p.id}-${flash?.id === p.id ? flash.n : 0}`} className={flash?.id === p.id ? 'ft-flash' : undefined} opacity={dragging ? 0.92 : 1}>
            <FractionPiece d={p.d} k={p.a / span(p.d)} cx={c.x} cy={c.y} r={R} colour={colour} />
          </g>
        )
      })}
      {/* Gathered so far: a count by the finger. */}
      {gather?.moved && (
        <text x={gather.at.x + 30} y={gather.at.y - 30} fontFamily={SANS} fontWeight={900} fontSize={56} fill="#7a6a58">
          {gather.ids.length}
        </text>
      )}
    </svg>
  )
}
