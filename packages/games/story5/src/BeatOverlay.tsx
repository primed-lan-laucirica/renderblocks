/**
 * An interactive beat: the scene is paused and the child does the action,
 * dragging each piece into a slot (ten beads into the shape of a ten bar,
 * four quarters into the empty circle). When every slot is filled, the
 * episode carries on and plays the fuse.
 */
import { useState } from 'react'
import type { Pt } from './engine/ease'
import type { Beat } from './engine/scene'
import { FractionPiece, StampTile, UnitBead } from './kit/kit'
import { BEAD, FRAC_R, TILE } from './kit/sizes'

const SNAP = { bead: 46, quarter: FRAC_R, tile: 60 }

export function BeatOverlay({ beat, onDone }: { beat: Beat; onDone: () => void }) {
  // Where each piece is, and which slot (if any) it's in.
  const [at, setAt] = useState<Pt[]>(() => beat.pieces.map((p) => ({ ...p })))
  const [slot, setSlot] = useState<(number | null)[]>(() => beat.pieces.map(() => null))
  const [drag, setDrag] = useState<{ i: number; dx: number; dy: number } | null>(null)
  const [finished, setFinished] = useState(false)

  const toScene = (e: React.PointerEvent): Pt => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement)
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }

  const half = beat.piece === 'bead' ? BEAD / 2 : beat.piece === 'tile' ? TILE / 2 : 0

  const down = (e: React.PointerEvent, i: number) => {
    if (finished) return
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const q = toScene(e)
    setDrag({ i, dx: at[i].x - q.x, dy: at[i].y - q.y })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const q = toScene(e)
    setAt((old) => old.map((p, j) => (j === drag.i ? { x: q.x + drag.dx, y: q.y + drag.dy } : p)))
  }
  const up = () => {
    if (!drag) return
    const i = drag.i
    setDrag(null)
    // Snap into the nearest free slot, if it's close enough.
    const here = { x: at[i].x + half, y: at[i].y + half }
    let best = -1
    let bestD = SNAP[beat.piece]
    beat.slots.forEach((s, k) => {
      const free = beat.piece === 'quarter' || !slot.some((v, j) => v === k && j !== i)
      const d = Math.hypot(s.x + half - here.x, s.y + half - here.y)
      if (free && d < bestD) {
        best = k
        bestD = d
      }
    })
    const nextSlot = slot.map((v, j) => (j === i ? (best >= 0 ? best : null) : v))
    const nextAt = at.map((p, j) => (j === i && best >= 0 ? { ...beat.slots[best] } : p))
    setSlot(nextSlot)
    setAt(nextAt)
    if (nextSlot.every((v) => v !== null)) {
      setFinished(true)
      setTimeout(onDone, 350)
    }
  }

  return (
    <svg viewBox="0 0 1920 1080" className="absolute inset-0 w-full h-full touch-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {/* The slots, dashed, until they're filled. */}
      {beat.piece !== 'quarter' &&
        beat.slots.map((s, k) =>
          slot.includes(k) ? null : (
            <rect key={k} x={s.x} y={s.y} width={beat.piece === 'tile' ? TILE : BEAD} height={beat.piece === 'tile' ? TILE : BEAD} rx={3} fill="none" stroke="#a7771a" strokeWidth={2} strokeDasharray="5 4" />
          ),
        )}
      {beat.piece === 'quarter' && <circle cx={beat.slots[0].x} cy={beat.slots[0].y} r={FRAC_R} fill="none" stroke="#fde68a" strokeWidth={4} strokeDasharray="14 10" />}
      {at.map((p, i) => (
        <g key={i} onPointerDown={(e) => down(e, i)} style={{ cursor: 'grab' }}>
          {/* A generous invisible target, so small fingers find small beads. */}
          <circle cx={p.x + half} cy={p.y + half} r={beat.piece === 'quarter' ? FRAC_R * 0.8 : 38} fill="transparent" />
          {beat.piece === 'bead' && <UnitBead x={p.x} y={p.y} glow={slot[i] !== null ? 0.7 : 0} />}
          {beat.piece === 'tile' && <StampTile value={1} x={p.x} y={p.y} />}
          {beat.piece === 'quarter' && <FractionPiece d={4} k={i} cx={p.x} cy={p.y} />}
        </g>
      ))}
    </svg>
  )
}
