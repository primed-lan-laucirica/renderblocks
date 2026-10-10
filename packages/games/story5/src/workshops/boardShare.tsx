/**
 * Skittles for dealing: a pile of golden beads on the left, skittles on the
 * right. The child deals every bead: drag one from the pile to a skittle,
 * or tap a skittle to give it one from the pile; tap a skittle's beads to
 * take one back. Nothing is ever dealt for them.
 */
import { useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { UnitBead } from '../kit/kit'
import { SmallSkittle } from '../kit/part4'
import { BEAD } from '../kit/sizes'
import type { ShareState } from './boardLogic'

const W = 1000
const H = 640
const PILE_W = 300
const PILE_BEAD = 1.6
const COL_BEAD = 1.3
const SKITTLE_BASE = 300
const pileAt = (i: number): Pt => ({ x: 24 + (i % 6) * 44, y: 110 + Math.floor(i / 6) * 48 })
const colX = (s: number, k: number) => PILE_W + 30 + (s + 0.5) * ((W - PILE_W - 30) / k)
const colAt = (s: number, k: number, j: number): Pt => ({ x: colX(s, k) - (BEAD * COL_BEAD) / 2, y: SKITTLE_BASE + 20 + j * 32 })

export function ShareTable({ value, onChange, onDeal, className }: { value: ShareState; onChange?: (s: ShareState) => void; onDeal?: () => void; className?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ start: Pt; at: Pt; moved: boolean } | null>(null)
  const k = value.shares.length

  const toSvg = (e: React.PointerEvent): Pt => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  /** The skittle whose column a point is in, or -1. */
  const columnAt = (q: Pt) => {
    if (q.x < PILE_W + 30) return -1
    const s = Math.floor((q.x - PILE_W - 30) / ((W - PILE_W - 30) / k))
    return s >= 0 && s < k ? s : -1
  }
  const give = (s: number) => {
    if (!onChange || value.pile <= 0) return
    onChange({ pile: value.pile - 1, shares: value.shares.map((v, j) => (j === s ? v + 1 : v)) })
    onDeal?.()
  }
  const takeBack = (s: number) => {
    if (!onChange || value.shares[s] <= 0) return
    onChange({ pile: value.pile + 1, shares: value.shares.map((v, j) => (j === s ? v - 1 : v)) })
  }

  const down = (e: React.PointerEvent) => {
    if (!onChange) return
    svg.current?.setPointerCapture?.(e.pointerId)
    const q = toSvg(e)
    setDrag({ start: q, at: q, moved: false })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const q = toSvg(e)
    setDrag({ ...drag, at: q, moved: drag.moved || Math.hypot(q.x - drag.start.x, q.y - drag.start.y) > 14 })
  }
  const up = () => {
    if (!drag) return
    const { start, at, moved } = drag
    setDrag(null)
    const s = columnAt(at)
    if (moved) {
      // From the pile to a skittle.
      if (start.x < PILE_W && s >= 0) give(s)
      return
    }
    if (s < 0) return
    // A tap on the skittle gives it a bead; a tap on its beads takes one back.
    if (at.y < SKITTLE_BASE + 10) give(s)
    else takeBack(s)
  }

  const dragging = drag?.moved && drag.start.x < PILE_W && value.pile > 0
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={`touch-none select-none ${className ?? ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} rx={20} fill="#efe6d4" />
      <rect x={8} y={60} width={PILE_W - 16} height={H - 80} rx={16} fill="#e4d6b8" />
      {Array.from({ length: value.pile - (dragging ? 1 : 0) }, (_, i) => {
        const at = pileAt(i)
        return <UnitBead key={i} x={at.x} y={at.y} s={PILE_BEAD} />
      })}
      {value.shares.map((n, s) => (
        <g key={s}>
          <SmallSkittle x={colX(s, k)} y={SKITTLE_BASE} s={0.8} />
          {Array.from({ length: n }, (_, j) => {
            const at = colAt(s, k, j)
            return <UnitBead key={j} x={at.x} y={at.y} s={COL_BEAD} />
          })}
        </g>
      ))}
      {dragging && <UnitBead x={drag.at.x - (BEAD * PILE_BEAD) / 2} y={drag.at.y - (BEAD * PILE_BEAD) / 2} s={PILE_BEAD} glow={1} />}
    </svg>
  )
}
