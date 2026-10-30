/**
 * The fraction table: frames (round holes) and fraction pieces under the
 * child's hands. One tool at a time:
 *   - move: drag a piece into a frame (it fits where there's room), lay it
 *     on another loose piece (it lies over it, side by side with its own
 *     size), or anywhere on the table; drop it in the box to put it away.
 *     The table has a rim and pieces never leave it; while a piece is
 *     dragged, where it would land lights up (a full frame shows red, and
 *     shakes if he lets go there, the piece sliding back home);
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

/** The table, wider than tall like the tablet's space for it, rim and all. */
export const TABLE_W = 1300
export const TABLE_H = 1000
const RIM = 22
export const R = 150
/** Where pieces are put away (bottom right). */
const BOX = { x: 1010, y: 600, w: 262, h: 372 }
const inBox = (q: Pt) => q.x > BOX.x && q.x < BOX.x + BOX.w && q.y > BOX.y && q.y < BOX.y + BOX.h
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** The nearest place a loose piece lies wholly on the table (and clear of the box, if there is one). */
function keepOn(c: Pt, box: boolean): Pt {
  let x = clamp(c.x, RIM + R, TABLE_W - RIM - R)
  let y = clamp(c.y, RIM + R, TABLE_H - RIM - R)
  if (box && x + R > BOX.x && y + R > BOX.y) {
    if (x + R - BOX.x < y + R - BOX.y) x = BOX.x - R
    else y = BOX.y - R
  }
  return { x, y }
}
const GLOW = '#fde047'
const NO = '#ef4444'
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
  /** There's a box on the table to put pieces away in. */
  removable?: boolean
  className?: string
}

export function FractionCircles({ pieces, frames, tool, onChange, removable = true, className }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: number; off: Pt; at: Pt; start: Pt; moved: boolean } | null>(null)
  const [gather, setGather] = useState<{ ids: number[]; at: Pt; start: Pt; moved: boolean } | null>(null)
  const [flash, setFlash] = useState<{ id: number; n: number } | null>(null)
  /** A piece sliding back home from where it was let go, and the frame that refused it (shaking). */
  const [back, setBack] = useState<{ id: number; from: Pt; frame: number; n: number } | null>(null)
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

  /** Where the dragged piece would land if he let go now. */
  type Landing = { kind: 'box' } | { kind: 'frame'; f: number; a: number | null } | { kind: 'pile'; g: Piece[] } | { kind: 'table'; c: Pt }
  const landing = (d: NonNullable<typeof drag>, p: Piece): Landing => {
    if (removable && inBox(d.at)) return { kind: 'box' }
    const raw = { x: d.at.x + d.off.x, y: d.at.y + d.off.y }
    const others = pieces.filter((x) => x.id !== p.id)
    // Into a frame, where there's room.
    const f = frames.findIndex((fr) => !fr.locked && Math.hypot(raw.x - fr.x, raw.y - fr.y) < R * 0.8)
    if (f >= 0) return { kind: 'frame', f, a: placeIn(others.filter((x) => x.frame === f), p.d, p.a) }
    const c = keepOn(raw, removable)
    // Onto another loose piece: laid over it.
    const g = looseGroups(others).find((q) => Math.hypot(q[0].x - c.x, q[0].y - c.y) < 70)
    return g ? { kind: 'pile', g } : { kind: 'table', c }
  }
  const dragged = drag?.moved ? pieces.find((x) => x.id === drag.id) : undefined
  const aim = drag && dragged ? landing(drag, dragged) : null

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
    const l = landing(d, p)
    if (l.kind === 'box') {
      onChange(others)
      cue('place', 1)
    } else if (l.kind === 'frame') {
      if (l.a === null) {
        // No room: the frame shakes and the piece slides back where it was.
        setBack({ id: p.id, from: keepOn({ x: d.at.x + d.off.x, y: d.at.y + d.off.y }, false), frame: l.f, n: (back?.n ?? 0) + 1 })
        return
      }
      onChange([...others, { ...p, frame: l.f, a: l.a }])
      cue('piece', p.d % 10)
    } else if (l.kind === 'pile') {
      onChange([...others, { ...p, frame: null, x: l.g[0].x, y: l.g[0].y, a: layOn(l.g, p.d, p.a) }])
      cue('piece', p.d % 10)
    } else onChange([...others, { ...p, frame: null, x: l.c.x, y: l.c.y }])
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
      viewBox={`0 0 ${TABLE_W} ${TABLE_H}`}
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
      <style>{`@keyframes ft-flash { 0% { filter: brightness(1.7) } 100% { filter: brightness(1) } } .ft-flash { animation: ft-flash 0.9s ease-out }
@keyframes ft-shake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-16px) } 40%,80% { transform: translateX(16px) } } .ft-shake { animation: ft-shake 0.4s ease-in-out }
@keyframes ft-back { from { transform: translate(var(--dx), var(--dy)) } to { transform: translate(0, 0) } } .ft-back { animation: ft-back 0.3s ease-out }`}</style>
      {/* The table: a wooden rim round the cloth, so it's plain where it ends. */}
      <rect x={0} y={0} width={TABLE_W} height={TABLE_H} rx={30} fill="#8a6440" />
      <rect x={RIM} y={RIM} width={TABLE_W - 2 * RIM} height={TABLE_H - 2 * RIM} rx={16} fill="#efe6d4" stroke="#6e4f31" strokeWidth={3} />
      {removable && <PutAway lit={aim?.kind === 'box'} />}
      {frames.map((f, i) => (
        <g key={`${i}-${back?.frame === i ? back.n : 0}`} className={back?.frame === i ? 'ft-shake' : undefined}>
          <FractionFrame cx={f.x} cy={f.y} r={R} />
          {f.locked && <rect x={f.x - R - 30} y={f.y - R - 30} width={2 * R + 60} height={2 * R + 60} rx={14} fill="none" stroke="#c8a24a" strokeWidth={6} />}
        </g>
      ))}
      {/* Where the piece would land: a frame with room or a pile glows; a full frame shows red. */}
      {aim?.kind === 'frame' && <circle cx={frames[aim.f].x} cy={frames[aim.f].y} r={R + 14} fill="none" stroke={aim.a === null ? NO : GLOW} strokeWidth={12} opacity={0.9} />}
      {aim?.kind === 'pile' && <circle cx={aim.g[0].x} cy={aim.g[0].y} r={R + 12} fill="none" stroke={GLOW} strokeWidth={12} opacity={0.9} />}
      {order.map((p) => {
        const dragging = drag?.moved && drag.id === p.id
        // Dragged, it stays on the table, except over the box, where it shrinks to go in.
        const toBox = dragging && aim?.kind === 'box'
        const c = dragging ? (toBox ? drag.at : keepOn({ x: drag.at.x + drag.off.x, y: drag.at.y + drag.off.y }, false)) : centreOf(p, frames)
        const colour = picked.has(p.id) ? PICKED : over.has(p.id) ? OVER : RED
        const home = back?.id === p.id ? centreOf(p, frames) : null
        return (
          <g key={`${p.id}-${flash?.id === p.id ? flash.n : 0}-${home ? back?.n : 0}`} className={flash?.id === p.id ? 'ft-flash' : home ? 'ft-back' : undefined} opacity={dragging ? 0.92 : 1} style={home && back ? ({ '--dx': `${back.from.x - home.x}px`, '--dy': `${back.from.y - home.y}px` } as React.CSSProperties) : undefined}>
            <FractionPiece d={p.d} k={p.a / span(p.d)} cx={c.x} cy={c.y} r={toBox ? R * 0.5 : R} colour={colour} />
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

/** The box on the table where pieces are put away: open, flaps out, a few pieces showing; it lights up when a piece is over it. */
function PutAway({ lit }: { lit: boolean }) {
  const { x, y, w, h } = BOX
  const top = y + h * 0.38
  return (
    <g pointerEvents="none">
      {lit && <rect x={x - 12} y={y - 12} width={w + 24} height={h + 24} rx={28} fill={GLOW} opacity={0.6} />}
      {/* The flaps, opened out. */}
      <path d={`M${x + 14} ${top} L${x - 4} ${y + 20} L${x + w * 0.42} ${y + 50} L${x + w * 0.46} ${top} Z`} fill="#c8925c" stroke="#6e4f31" strokeWidth={4} strokeLinejoin="round" />
      <path d={`M${x + w - 14} ${top} L${x + w + 4} ${y + 20} L${x + w * 0.58} ${y + 50} L${x + w * 0.54} ${top} Z`} fill="#c8925c" stroke="#6e4f31" strokeWidth={4} strokeLinejoin="round" />
      {/* Pieces inside, peeking over the front. */}
      <FractionPiece d={2} k={0} cx={x + w * 0.4} cy={top + 6} r={64} colour="#b83232" />
      <FractionPiece d={4} k={3} cx={x + w * 0.62} cy={top + 10} r={60} colour="#c63a3a" />
      {/* The front. */}
      <rect x={x + 10} y={top} width={w - 20} height={y + h - top} rx={10} fill="#a47148" stroke="#6e4f31" strokeWidth={4} />
      <rect x={x + 10} y={top} width={w - 20} height={16} rx={6} fill="#6e4f31" opacity={0.45} />
    </g>
  )
}
