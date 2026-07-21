import type { ReactNode } from 'react'
import { useRef } from 'react'

export const BASE_RANGE = 5
export const MAX_RANGE = 100

const PAD = 26
const SIDE = 480

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
  children?: ReactNode
}

/**
 * Graph-paper SVG plane with an auto-sized window. Axis labels thin out as
 * the window grows (every 1 / 2 / 5) so the numerals stay readable — the
 * labelled axes are the number lines that make negatives legible.
 */
export function Plane({ range, dark, onTap, children }: PlaneProps) {
  const ref = useRef<SVGSVGElement>(null)
  const s = scaleFor(range)

  const grid = dark ? '#334155' : '#dbeafe'
  const axis = dark ? '#cbd5e1' : '#475569'
  const label = dark ? '#94a3b8' : '#64748b'
  // Level of detail: gridlines need ~9px spacing, labels ~26px, so the
  // paper coarsens (every 1 -> 2 -> 5 -> 10...) as the window grows.
  const gridStep = stepFor(s.cell, 9)
  const labelStep = Math.max(stepFor(s.cell, 26), gridStep)

  const handleTap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onTap || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * SIDE
    const py = ((e.clientY - rect.top) / rect.height) * SIDE
    const x = Math.round((px - PAD) / s.cell - range)
    const y = Math.round(range - (py - PAD) / s.cell)
    if (x < -range || x > range || y < -range || y > range) return
    onTap({ x, y })
  }

  const ticks: number[] = []
  for (let i = -range; i <= range; i += gridStep) ticks.push(i)

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIDE} ${SIDE}`}
      className="w-full max-w-2xl aspect-square touch-none select-none"
      onPointerDown={handleTap}
    >
      <rect width={SIDE} height={SIDE} fill={dark ? '#0f172a' : '#ffffff'} rx="16" />
      {ticks.map((i) => (
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
      {ticks.map(
        (i) =>
          i !== 0 &&
          i % labelStep === 0 && (
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
