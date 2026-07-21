import type { ReactNode } from 'react'
import { useRef } from 'react'

export const BASE_RANGE = 5
export const MAX_RANGE = 100

const PAD = 26
const SIDE = 480
const TAP_SLOP_PX = 10

export interface Pt {
  x: number
  y: number
}

export interface Scale {
  sx: (x: number) => number
  sy: (y: number) => number
  cell: number
  /** Marker radius sized to the current cell density. */
  r: number
}

/** Fixed canvas, variable window: more range = smaller cells. */
export function scaleFor(range: number): Scale {
  const cell = (SIDE - PAD * 2) / (range * 2)
  return {
    sx: (x) => PAD + (x + range) * cell,
    sy: (y) => PAD + (range - y) * cell,
    cell,
    r: Math.min(9, Math.max(4.5, cell * 0.28)),
  }
}

/** Grow the window to fit the largest coordinate: steps of 5 to ±20, then 10s. */
export function rangeToFit(values: number[]): number {
  const maxAbs = Math.max(BASE_RANGE, ...values.map((v) => Math.abs(v)))
  const fit = maxAbs <= 20 ? Math.ceil(maxAbs / 5) * 5 : Math.ceil(maxAbs / 10) * 10
  return Math.min(MAX_RANGE, fit)
}

/** Smallest step from the ladder whose on-screen spacing clears `minPx`. */
function stepFor(cell: number, minPx: number): number {
  for (const step of [1, 2, 5, 10, 20, 25, 50]) {
    if (step * cell >= minPx) return step
  }
  return 50
}

interface PlaneProps {
  range: number
  dark: boolean
  onTap?: (p: Pt) => void
  /** Pinch zoom: reports the desired window; the app clamps and applies. */
  onRangeChange?: (range: number) => void
  children?: ReactNode
}

/**
 * Graph-paper SVG plane with an auto-sized window, pinch zoom, and
 * letterbox-aware tap snapping (the svg fills whatever box the layout
 * gives it; content centers with preserveAspectRatio meet).
 */
export function Plane({ range, dark, onTap, onRangeChange, children }: PlaneProps) {
  const ref = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    pinching: boolean
    startDist: number
    startRange: number
    tapStart: { id: number; x: number; y: number } | null
  }>({ pinching: false, startDist: 0, startRange: range, tapStart: null })

  const s = scaleFor(range)
  const grid = dark ? '#334155' : '#dbeafe'
  const axis = dark ? '#cbd5e1' : '#475569'
  const label = dark ? '#94a3b8' : '#64748b'
  // Level of detail: gridlines need ~9px spacing, labels ~26px, so the
  // paper coarsens (every 1 -> 2 -> 5 -> 10...) as the window grows.
  const gridStep = stepFor(s.cell, 9)
  const labelStep = Math.max(stepFor(s.cell, 26), gridStep)

  /** Client point -> world point, accounting for meet letterboxing. */
  const toWorld = (clientX: number, clientY: number): Pt | null => {
    if (!ref.current) return null
    const rect = ref.current.getBoundingClientRect()
    const scale = Math.min(rect.width, rect.height) / SIDE
    const ox = rect.left + (rect.width - SIDE * scale) / 2
    const oy = rect.top + (rect.height - SIDE * scale) / 2
    const px = (clientX - ox) / scale
    const py = (clientY - oy) / scale
    const x = Math.round((px - PAD) / s.cell - range)
    const y = Math.round(range - (py - PAD) / s.cell)
    if (x < -range || x > range || y < -range || y > range) return null
    return { x, y }
  }

  const dist = (): number => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ref.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      gesture.current.tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY }
    } else if (pointers.current.size === 2) {
      gesture.current.pinching = true
      gesture.current.startDist = dist()
      gesture.current.startRange = range
      gesture.current.tapStart = null
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (gesture.current.pinching && pointers.current.size === 2 && onRangeChange) {
      const d = dist()
      if (d > 0 && gesture.current.startDist > 0) {
        // Fingers apart = zoom in = smaller window.
        onRangeChange(Math.round(gesture.current.startRange * (gesture.current.startDist / d)))
      }
    }
  }

  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    const tap = gesture.current.tapStart
    if (
      tap &&
      tap.id === e.pointerId &&
      !gesture.current.pinching &&
      Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_SLOP_PX &&
      onTap
    ) {
      const p = toWorld(e.clientX, e.clientY)
      if (p) onTap(p)
    }
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      gesture.current.pinching = false
      gesture.current.tapStart = null
    }
  }

  // Gridlines/labels aligned to step multiples so arbitrary pinch ranges work.
  const stepTicks = (step: number): number[] => {
    const ticks: number[] = []
    for (let i = Math.ceil(-range / step) * step; i <= range; i += step) ticks.push(i)
    return ticks
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIDE} ${SIDE}`}
      className="w-full h-full touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <rect width={SIDE} height={SIDE} fill={dark ? '#0f172a' : '#ffffff'} rx="16" />
      {stepTicks(gridStep).map((i) => (
        <g key={i}>
          <line
            x1={s.sx(i)}
            y1={s.sy(-range)}
            x2={s.sx(i)}
            y2={s.sy(range)}
            stroke={grid}
            strokeWidth={s.cell >= 20 ? 1 : 0.6}
          />
          <line
            x1={s.sx(-range)}
            y1={s.sy(i)}
            x2={s.sx(range)}
            y2={s.sy(i)}
            stroke={grid}
            strokeWidth={s.cell >= 20 ? 1 : 0.6}
          />
        </g>
      ))}
      {/* axes */}
      <line x1={s.sx(0)} y1={s.sy(-range)} x2={s.sx(0)} y2={s.sy(range)} stroke={axis} strokeWidth="2.5" />
      <line x1={s.sx(-range)} y1={s.sy(0)} x2={s.sx(range)} y2={s.sy(0)} stroke={axis} strokeWidth="2.5" />
      {/* integer labels, thinned to the window size */}
      {stepTicks(labelStep).map(
        (i) =>
          i !== 0 && (
            <g key={`l${i}`} fill={label} fontSize="13" fontWeight="700">
              <text x={s.sx(i)} y={s.sy(0) + 17} textAnchor="middle">
                {i}
              </text>
              <text x={s.sx(0) - 7} y={s.sy(i) + 5} textAnchor="end">
                {i}
              </text>
            </g>
          ),
      )}
      <text x={s.sx(0) - 7} y={s.sy(0) + 17} fill={label} fontSize="13" fontWeight="700" textAnchor="end">
        0
      </text>
      {children}
    </svg>
  )
}
