/**
 * The Counting Table's surfaces: a table of pebbles to move, add and take
 * away; rods laid end to end on the track; the track with its pebble token;
 * the rod rack; and the card that flashes a dot pattern. Drawn with the
 * kit, at the episodes' pieces.
 */
import { useEffect, useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { NumberRod, NumberTrack } from '../kit/kit'
import { DotPattern, HERO, PilePebble, ROD_H, ROD_S, Sheep } from '../kit/part1'
import { INK, SANS } from '../kit/sizes'
import { TABLE_H, TABLE_W, TRACK_H, TRACK_UNIT, TRACK_W, TRACK_X0, TRACK_Y, nearest } from './countingLayout'

const svgPoint = (svg: SVGSVGElement | null, e: React.PointerEvent): Pt => {
  const m = svg?.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
  return { x: q.x, y: q.y }
}

/**
 * The pebble table. Drag a pebble anywhere on it; drag it off the table to
 * put it back. `sheep`, if given, stand on the left (the match challenge).
 */
export function PebbleTable({ pebbles, onChange, sheep, divider, className }: { pebbles: Pt[]; onChange?: (p: Pt[]) => void; sheep?: Pt[]; divider?: number; className?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ i: number; dx: number; dy: number } | null>(null)
  const down = (e: React.PointerEvent, i: number) => {
    if (!onChange) return
    e.stopPropagation()
    svg.current?.setPointerCapture?.(e.pointerId)
    const q = svgPoint(svg.current, e)
    setDrag({ i, dx: pebbles[i].x - q.x, dy: pebbles[i].y - q.y })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag || !onChange) return
    const q = svgPoint(svg.current, e)
    onChange(pebbles.map((p, j) => (j === drag.i ? { x: q.x + drag.dx, y: q.y + drag.dy } : p)))
  }
  const up = () => {
    if (!drag || !onChange) return
    const p = pebbles[drag.i]
    setDrag(null)
    if (p.x < 0 || p.x > TABLE_W || p.y < 0 || p.y > TABLE_H) onChange(pebbles.filter((_, j) => j !== drag.i))
  }
  return (
    <svg ref={svg} viewBox={`0 0 ${TABLE_W} ${TABLE_H}`} className={`touch-none select-none ${className ?? ''}`} onPointerMove={move} onPointerUp={up} onPointerCancel={up} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={TABLE_W} height={TABLE_H} rx={24} fill="#efe6d4" />
      {divider !== undefined && <line x1={divider} y1={24} x2={divider} y2={TABLE_H - 24} stroke="#d8c8a6" strokeWidth={3} />}
      {sheep?.map((s, i) => (
        <Sheep key={i} x={s.x} y={s.y} s={0.85} />
      ))}
      {pebbles.map((p, i) => (
        <g key={i} onPointerDown={(e) => down(e, i)} style={{ cursor: onChange ? 'grab' : undefined }}>
          <circle cx={p.x} cy={p.y} r={44} fill="transparent" />
          <PilePebble x={p.x} y={p.y} i={i} />
        </g>
      ))}
    </svg>
  )
}

/** The track's numerals, larger than the kit's (the workshop is touched, not watched). */
function TrackNumbers() {
  return (
    <>
      {Array.from({ length: 11 }, (_, v) => (
        <text key={v} x={TRACK_X0 + v * TRACK_UNIT} y={TRACK_Y + 64} fontFamily={SANS} fontWeight={700} fontSize={50} fill="#475569" textAnchor="middle">
          {v}
        </text>
      ))}
    </>
  )
}

/** Rods laid end to end on the track from 0. Tap a rod to take it off. */
export function RodTrack({ rods, onRemove, className }: { rods: number[]; onRemove?: (i: number) => void; className?: string }) {
  // Where each rod starts: the sum of the rods before it.
  const starts = rods.map((_, i) => rods.slice(0, i).reduce((s, n) => s + n, 0))
  return (
    <svg viewBox={`0 0 ${TRACK_W} ${TRACK_H}`} className={`select-none ${className ?? ''}`} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={TRACK_W} height={TRACK_H} rx={24} fill="#efe6d4" />
      <NumberTrack x={TRACK_X0} y={TRACK_Y} from={0} to={10} unit={TRACK_UNIT} labels={false} />
      <TrackNumbers />
      {rods.map((n, i) => {
        const x = TRACK_X0 + starts[i] * TRACK_UNIT
        return (
          <g key={i} onClick={() => onRemove?.(i)} style={{ cursor: onRemove ? 'pointer' : undefined }}>
            <rect x={x} y={TRACK_Y - ROD_H - 40} width={n * TRACK_UNIT} height={ROD_H + 40} fill="transparent" />
            <NumberRod n={n} x={x} y={TRACK_Y - ROD_H - 8} s={ROD_S} />
            {/* A thin gap shows where one rod ends and the next begins. */}
            <line x1={x} y1={TRACK_Y - ROD_H - 14} x2={x} y2={TRACK_Y - 2} stroke="#efe6d4" strokeWidth={4} />
          </g>
        )
      })}
    </svg>
  )
}

/** The track and its pebble token: drag the pebble; it settles on the nearest number. */
export function TokenTrack({ value, onChange, className }: { value: number; onChange?: (v: number) => void; className?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [dragX, setDragX] = useState<number | null>(null)
  const x = dragX ?? TRACK_X0 + value * TRACK_UNIT
  const y = TRACK_Y - HERO.r * 2 - 10
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${TRACK_W} ${TRACK_H}`}
      className={`touch-none select-none ${className ?? ''}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={(e) => dragX !== null && setDragX(Math.max(TRACK_X0 - 20, Math.min(TRACK_X0 + 10 * TRACK_UNIT + 20, svgPoint(svg.current, e).x)))}
      onPointerUp={(e) => {
        if (dragX === null) return
        setDragX(null)
        onChange?.(nearest(svgPoint(svg.current, e).x))
      }}
      onPointerCancel={() => setDragX(null)}
    >
      <rect x={0} y={0} width={TRACK_W} height={TRACK_H} rx={24} fill="#efe6d4" />
      <NumberTrack x={TRACK_X0} y={TRACK_Y} from={0} to={10} unit={TRACK_UNIT} labels={false} />
      <TrackNumbers />
      <g
        onPointerDown={(e) => {
          if (!onChange) return
          svg.current?.setPointerCapture?.(e.pointerId)
          setDragX(svgPoint(svg.current, e).x)
        }}
        style={{ cursor: onChange ? 'grab' : undefined }}
      >
        <circle cx={x} cy={y} r={75} fill="transparent" />
        <g transform={`translate(${x} ${y}) scale(2.2) translate(${-x} ${-y})`}>
          <PilePebble x={x} y={y} i={0} />
        </g>
      </g>
    </svg>
  )
}

/** The rod rack: every rod, shortest to longest, with no numerals (its length is what tells). */
export function RodRack({ room, onPick }: { room: number; onPick: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-1 w-full items-start">
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1
        return (
          <button key={n} type="button" disabled={n > room} onClick={() => onPick(n)} className="py-1 rounded-md active:bg-white/10 disabled:opacity-25" style={{ width: `${n * 9.6}%` }} aria-label={`Rod of ${n}`}>
            <svg viewBox={`0 0 ${n * 60} 30`} className="w-full h-5 landscape:h-6 block" preserveAspectRatio="none">
              <NumberRod n={n} x={0} y={0} />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

/**
 * A dot pattern, shown briefly: hidden for a moment, then up for 1.2 s,
 * then face down. Tap the face-down card to see it again (remount it).
 */
export function FlashCard({ n, onAgain, className }: { n: number; onAgain: () => void; className?: string }) {
  const [phase, setPhase] = useState<'wait' | 'show' | 'hidden'>('wait')
  useEffect(() => {
    const a = window.setTimeout(() => setPhase('show'), 700)
    const b = window.setTimeout(() => setPhase('hidden'), 1900)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])
  return (
    <svg viewBox="0 0 400 400" className={`select-none ${className ?? ''}`} onClick={() => phase === 'hidden' && onAgain()} preserveAspectRatio="xMidYMid meet">
      {phase === 'show' ? (
        <DotPattern n={n} x={50} y={50} size={300} />
      ) : (
        <g>
          <rect x={54} y={56} width={300} height={300} rx={30} fill="rgba(60,40,20,0.15)" />
          <rect x={50} y={50} width={300} height={300} rx={30} fill="#d8c8a6" stroke="#b9a684" strokeWidth={3} />
          {phase === 'hidden' && (
            <text x={200} y={206} fontFamily={SANS} fontWeight={800} fontSize={110} fill={INK} opacity={0.35} textAnchor="middle" dominantBaseline="middle">
              ↻
            </text>
          )}
        </g>
      )}
    </svg>
  )
}
