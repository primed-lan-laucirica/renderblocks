/**
 * The track, in the Fraction Table. Explore: fraction strips laid end to end
 * from 0, as in Episode 21 (the child chooses each strip's size). Mastery:
 * fraction cards the child drags to where each one lies on the track; the
 * track has a tick for every part but numbers only at 0, 1 and 2.
 */
import { useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { NumberTrack } from '../kit/kit'
import { Strip } from '../kit/part5'
import { INK, SANS } from '../kit/sizes'
import { TURN, lcm, span } from './fractionModel'

export const TRACK_W = 1400
const X0 = 100
const UNIT = 600
/** The track runs 0 to 2. */
export const TRACK_MAX = 2 * TURN

function Numbers({ y }: { y: number }) {
  return (
    <>
      {[0, 1, 2].map((v) => (
        <text key={v} x={X0 + v * UNIT} y={y + 62} fontFamily={SANS} fontWeight={800} fontSize={64} fill={INK} textAnchor="middle" dominantBaseline="middle">
          {v}
        </text>
      ))}
    </>
  )
}

/** Strips of sizes `ds`, end to end from 0, each end named in the strips' common size ("2/4"). */
export function TrackExplore({ ds, className }: { ds: number[]; className?: string }) {
  const y = 230
  const common = ds.reduce((m, d) => lcm(m, d), 1)
  // Each strip starts where the ones before it end.
  const strips = ds.map((d, i) => ({ from: ds.slice(0, i).reduce((s, x) => s + span(x), 0), d }))
  const label = (n24: number) => {
    const n = (n24 / TURN) * common
    return common === 1 ? String(n) : `${n}/${common}`
  }
  return (
    <svg viewBox={`0 0 ${TRACK_W} 360`} className={`select-none ${className ?? ''}`} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={TRACK_W} height={360} rx={24} fill="#efe6d4" />
      <NumberTrack x={X0} y={y} from={0} to={2} unit={UNIT} labels={false} />
      <Numbers y={y} />
      {strips.map((s, i) => (
        <Strip key={i} x={X0 + (s.from / TURN) * UNIT} y={y - 52} len={(span(s.d) / TURN) * UNIT} h={40} />
      ))}
      {strips.length <= 16 &&
        strips.map((s, i) => (
          <text key={i} x={X0 + ((s.from + span(s.d)) / TURN) * UNIT} y={y - 76} fontFamily={SANS} fontWeight={800} fontSize={strips.length > 8 ? 34 : 50} fill={INK} textAnchor="middle">
            {label(s.from + span(s.d))}
          </text>
        ))}
    </svg>
  )
}

export interface Card {
  n: number
  d: number
}

/**
 * Cards to place on the track. `at[i]` is the tick card i sits on (in parts
 * of 1/den), or null while it's still in the row below.
 */
export function TrackPlace({ cards, den, at, onChange, className }: { cards: Card[]; den: number; at: (number | null)[]; onChange: (at: (number | null)[]) => void; className?: string }) {
  const H = 640
  const y = 360
  const step = UNIT / den
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ i: number; off: Pt; pos: Pt } | null>(null)
  const home = (i: number): Pt => ({ x: TRACK_W / 2 + (i - (cards.length - 1) / 2) * 300, y: 540 })
  // Placed cards alternate between two heights, left to right, so neighbours don't hide each other.
  const placed = cards.map((_, i) => i).filter((i) => at[i] !== null && drag?.i !== i).sort((p, q) => at[p]! - at[q]! || p - q)
  const level = (i: number) => (placed.indexOf(i) % 2 ? 250 : 130)
  const cardAt = (i: number): Pt => (drag?.i === i ? drag.pos : at[i] === null ? home(i) : { x: X0 + at[i]! * step, y: y - level(i) })
  const toBoard = (e: React.PointerEvent): Pt => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  const down = (e: React.PointerEvent, i: number) => {
    e.stopPropagation()
    svg.current?.setPointerCapture?.(e.pointerId)
    const q = toBoard(e)
    const c = cardAt(i)
    setDrag({ i, off: { x: c.x - q.x, y: c.y - q.y }, pos: c })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const q = toBoard(e)
    setDrag({ ...drag, pos: { x: q.x + drag.off.x, y: q.y + drag.off.y } })
  }
  const up = () => {
    if (!drag) return
    const { i, pos } = drag
    setDrag(null)
    const next = [...at]
    // Near the track: onto the nearest tick. Otherwise back to the row.
    next[i] = pos.y < y + 80 ? Math.min(2 * den, Math.max(0, Math.round((pos.x - X0) / step))) : null
    onChange(next)
  }
  return (
    <svg ref={svg} viewBox={`0 0 ${TRACK_W} ${H}`} className={`touch-none select-none ${className ?? ''}`} preserveAspectRatio="xMidYMid meet" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <rect x={0} y={0} width={TRACK_W} height={H} rx={24} fill="#efe6d4" />
      <NumberTrack x={X0} y={y} from={0} to={2} unit={UNIT} labels={false} />
      {Array.from({ length: 2 * den + 1 }, (_, k) => (k % den ? <line key={k} x1={X0 + k * step} y1={y - 8} x2={X0 + k * step} y2={y + 8} stroke="#475569" strokeWidth={2} /> : null))}
      <Numbers y={y} />
      {cards.map((c, i) => {
        const p = cardAt(i)
        return (
          <g key={i} onPointerDown={(e) => down(e, i)} style={{ cursor: 'grab' }}>
            {placed.includes(i) && <line x1={p.x} y1={p.y + 56} x2={p.x} y2={y - 4} stroke={INK} strokeWidth={4} />}
            <rect x={p.x - 100} y={p.y - 56} width={200} height={112} rx={14} fill="#fbf6ea" stroke="#d8c8a6" strokeWidth={3} />
            <text x={p.x} y={p.y + 4} fontFamily={SANS} fontWeight={800} fontSize={68} fill={INK} textAnchor="middle" dominantBaseline="middle">
              {c.n}/{c.d}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
