import type { ReactNode } from 'react'
import { useRef } from 'react'

export const RANGE = 5

const CELL = 40
const PAD = 26
const SIDE = PAD * 2 + CELL * RANGE * 2

export interface Pt {
  x: number
  y: number
}

/** World -> svg coords. */
export function sx(x: number): number {
  return PAD + (x + RANGE) * CELL
}
export function sy(y: number): number {
  return PAD + (RANGE - y) * CELL
}

interface PlaneProps {
  dark: boolean
  onTap?: (p: Pt) => void
  children?: ReactNode
}

/**
 * Graph-paper SVG plane: light gridlines, heavier axes, every integer
 * labelled (negatives included — the axes are the number lines that make
 * negative coordinates legible). Children render in svg space via sx/sy.
 */
export function Plane({ dark, onTap, children }: PlaneProps) {
  const ref = useRef<SVGSVGElement>(null)

  const grid = dark ? '#334155' : '#dbeafe'
  const axis = dark ? '#cbd5e1' : '#475569'
  const label = dark ? '#94a3b8' : '#64748b'

  const handleTap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onTap || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * SIDE
    const py = ((e.clientY - rect.top) / rect.height) * SIDE
    const x = Math.round((px - PAD) / CELL - RANGE)
    const y = Math.round(RANGE - (py - PAD) / CELL)
    if (x < -RANGE || x > RANGE || y < -RANGE || y > RANGE) return
    onTap({ x, y })
  }

  const ticks: number[] = []
  for (let i = -RANGE; i <= RANGE; i++) ticks.push(i)

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIDE} ${SIDE}`}
      className="w-full max-w-md aspect-square touch-none select-none"
      onPointerDown={handleTap}
    >
      <rect width={SIDE} height={SIDE} fill={dark ? '#0f172a' : '#ffffff'} rx="16" />
      {ticks.map((i) => (
        <g key={i}>
          <line x1={sx(i)} y1={sy(-RANGE)} x2={sx(i)} y2={sy(RANGE)} stroke={grid} strokeWidth="1" />
          <line x1={sx(-RANGE)} y1={sy(i)} x2={sx(RANGE)} y2={sy(i)} stroke={grid} strokeWidth="1" />
        </g>
      ))}
      {/* axes */}
      <line x1={sx(0)} y1={sy(-RANGE)} x2={sx(0)} y2={sy(RANGE)} stroke={axis} strokeWidth="2.5" />
      <line x1={sx(-RANGE)} y1={sy(0)} x2={sx(RANGE)} y2={sy(0)} stroke={axis} strokeWidth="2.5" />
      {/* integer labels along both axes (0 once, at the origin corner) */}
      {ticks.map(
        (i) =>
          i !== 0 && (
            <g key={`l${i}`} fill={label} fontSize="13" fontWeight="700">
              <text x={sx(i)} y={sy(0) + 17} textAnchor="middle">
                {i}
              </text>
              <text x={sx(0) - 8} y={sy(i) + 5} textAnchor="end">
                {i}
              </text>
            </g>
          ),
      )}
      <text x={sx(0) - 8} y={sy(0) + 17} fill={label} fontSize="13" fontWeight="700" textAnchor="end">
        0
      </text>
      {children}
    </svg>
  )
}
