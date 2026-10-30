/**
 * An interactive beat: the scene is paused and the child does the action.
 * 'drag': each piece into a slot (ten beads into the shape of a ten bar,
 * four quarters into the empty circle). 'tap': each piece in turn (break a
 * bar). When every piece is done, the episode carries on and plays the rest.
 */
import { useState, type ReactNode } from 'react'
import type { Pt } from './engine/ease'
import type { Beat } from './engine/scene'
import { FractionPiece, StampTile, UnitBead } from './kit/kit'
import { BEAD, FRAC_R, TILE } from './kit/sizes'

/** Each built-in piece: drawing, middle, touch radius, snap distance, slot outline. */
interface Kind {
  draw: (at: Pt, i: number, done: boolean) => ReactNode
  centre: Pt
  reach: number
  snap: number
  stack: boolean
  slot?: (at: Pt, k: number) => ReactNode
}

const dashed = (size: number) => (at: Pt, k: number) => (
  <rect key={k} x={at.x} y={at.y} width={size} height={size} rx={3} fill="none" stroke="#a7771a" strokeWidth={2} strokeDasharray="5 4" />
)

function kindOf(beat: Beat): Kind {
  switch (beat.piece) {
    case 'bead':
      // A generous invisible target, so small fingers find small beads.
      return { draw: (at, _i, done) => <UnitBead x={at.x} y={at.y} glow={done ? 0.7 : 0} />, centre: { x: BEAD / 2, y: BEAD / 2 }, reach: 38, snap: 46, stack: false, slot: dashed(BEAD) }
    case 'tile':
      return { draw: (at) => <StampTile value={1} x={at.x} y={at.y} />, centre: { x: TILE / 2, y: TILE / 2 }, reach: 38, snap: 60, stack: false, slot: dashed(TILE) }
    case 'quarter':
      return {
        draw: (at, i) => <FractionPiece d={4} k={i} cx={at.x} cy={at.y} />,
        centre: { x: 0, y: 0 },
        reach: FRAC_R * 0.8,
        snap: FRAC_R,
        stack: true,
        slot: (at, k) => (k === 0 ? <circle key={k} cx={at.x} cy={at.y} r={FRAC_R} fill="none" stroke="#fde68a" strokeWidth={4} strokeDasharray="14 10" /> : null),
      }
    default:
      return {
        draw: beat.draw ?? (() => null),
        centre: beat.centre ?? { x: 0, y: 0 },
        reach: beat.reach ?? 50,
        snap: beat.snap ?? 70,
        stack: !!beat.stack,
        slot: beat.drawSlot,
      }
  }
}

export function BeatOverlay({ beat, onDone }: { beat: Beat; onDone: () => void }) {
  const kind = kindOf(beat)
  const tap = beat.action === 'tap'
  // Where each piece is, and which slot (if any) it's in (for taps: -1 once tapped).
  const [at, setAt] = useState<Pt[]>(() => beat.pieces.map((p) => ({ ...p })))
  const [slot, setSlot] = useState<(number | null)[]>(() => beat.pieces.map(() => null))
  const [drag, setDrag] = useState<{ i: number; dx: number; dy: number } | null>(null)
  const [finished, setFinished] = useState(false)
  // A stack that builds up: the pieces in it, in the order they went in.
  const [order, setOrder] = useState<number[]>([])
  const built = !!(kind.stack && beat.stackAt)
  /** Where piece i is drawn: in a building stack, its place in it. */
  const pos = (i: number): Pt => {
    const k = slot[i]
    if (!built || k === null || k === undefined || k < 0 || drag?.i === i) return at[i]
    const off = beat.stackAt!(order.indexOf(i))
    return { x: beat.slots[k].x + off.x, y: beat.slots[k].y + off.y }
  }
  // Pieces he's moved stop bobbing (a spare one put down anywhere too).
  const [touched, setTouched] = useState<Set<number>>(() => new Set())

  const toScene = (e: React.PointerEvent): Pt => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement)
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }

  const settle = (next: (number | null)[]) => {
    setSlot(next)
    const placed = next.filter((v) => v !== null).length
    const full = beat.spare && !tap ? (kind.stack ? placed >= beat.slots.length : beat.slots.every((_, k) => next.includes(k))) : next.every((v) => v !== null)
    if (full) {
      setFinished(true)
      setTimeout(onDone, 350)
    }
  }

  const down = (e: React.PointerEvent, i: number) => {
    if (finished) return
    if (tap) {
      if (slot[i] === null) settle(slot.map((v, j) => (j === i ? -1 : v)))
      return
    }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setTouched((s) => new Set(s).add(i))
    const q = toScene(e)
    const from = pos(i)
    setAt((old) => old.map((p, j) => (j === i ? from : p)))
    setDrag({ i, dx: from.x - q.x, dy: from.y - q.y })
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
    const here = { x: at[i].x + kind.centre.x, y: at[i].y + kind.centre.y }
    let best = -1
    let bestD = kind.snap
    // A stack that's full (with spares) takes no more: the fifth quarter stays out of the circle.
    const room = !(beat.spare && kind.stack) || slot.filter((v, j) => v !== null && j !== i).length < beat.slots.length
    if (room) beat.slots.forEach((s, k) => {
      const free = kind.stack || !slot.some((v, j) => v === k && j !== i)
      const d = Math.hypot(s.x + kind.centre.x - here.x, s.y + kind.centre.y - here.y)
      if (free && d < bestD) {
        best = k
        bestD = d
      }
    })
    setAt(at.map((p, j) => (j === i && best >= 0 ? { ...beat.slots[best] } : p)))
    // Into the stack at the back (it grows); out of it, the rest close up.
    if (built) setOrder((o) => [...o.filter((j) => j !== i), ...(best >= 0 ? [i] : [])])
    settle(slot.map((v, j) => (j === i ? (best >= 0 ? best : null) : v)))
  }

  return (
    // Only the pieces catch a touch: the rest of the layer lets taps through (to the prompt under it).
    <svg viewBox="0 0 1920 1080" className="absolute inset-0 w-full h-full touch-none" style={{ pointerEvents: 'none' }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {/* The slots, outlined, until they're filled. */}
      {!tap && kind.slot && beat.slots.map((s, k) => (slot.includes(k) && !kind.stack ? null : kind.slot!(s, k)))}
      {/* The pieces still to do bob a little, so he can see they're his to move. */}
      <style>{`@keyframes beat-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }`}</style>
      {/* Drawn back to front: the stack's last-in first (it's furthest back), then the loose pieces, the one in his hand on top. */}
      {[...[...order].reverse().filter((i) => i !== drag?.i), ...at.map((_, i) => i).filter((i) => !order.includes(i) && i !== drag?.i), ...(drag ? [drag.i] : [])].map((i) => [pos(i), i] as const).map(([p, i]) => (
        <g key={i} onPointerDown={(e) => down(e, i)} style={{ cursor: tap ? 'pointer' : 'grab', pointerEvents: 'all' }}>
          <g style={slot[i] === null && !touched.has(i) ? { animation: `beat-bob 1.4s ease-in-out ${(i % 5) * 0.15}s infinite` } : undefined}>
            <circle cx={p.x + kind.centre.x} cy={p.y + kind.centre.y} r={kind.reach} fill="transparent" />
            {kind.draw(p, i, slot[i] !== null)}
          </g>
        </g>
      ))}
    </svg>
  )
}
