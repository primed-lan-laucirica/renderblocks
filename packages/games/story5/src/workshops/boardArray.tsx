/**
 * The bead board, under the child's hands: drag (or tap) to the hole where
 * the array's far corner goes, and the beads fill the rectangle back to the
 * board's corner. In split mode, a tap between two columns splits the array
 * there. Turning (a quarter turn about its centre) is the parent's button.
 */
import { useRef, useState } from 'react'
import { ARRAY_BEAD } from '../kit/part4'
import { GRID, type ArrayState } from './boardLogic'

const CELL = 60
const PAD = 24
const SIZE = GRID * CELL + PAD * 2
const RIGHT_PART = '#c05621'

interface Props {
  value: ArrayState
  onChange?: (a: ArrayState) => void
  /** Taps between columns split the array (instead of resizing it). */
  splitting?: boolean
  /** The array is turning a quarter turn (it swaps rows and columns when it lands). */
  turning?: boolean
  onTurned?: () => void
  className?: string
}

export function ArrayBoard({ value, onChange, splitting, turning, onTurned, className }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [down, setDown] = useState(false)
  const { rows, cols, split } = value

  const cellAt = (e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return null
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: (q.x - PAD) / CELL, y: (q.y - PAD) / CELL }
  }
  const resize = (e: React.PointerEvent) => {
    const c = cellAt(e)
    if (!c || !onChange) return
    const r = Math.min(GRID, Math.max(1, Math.floor(c.y) + 1))
    const k = Math.min(GRID, Math.max(1, Math.floor(c.x) + 1))
    if (r !== rows || k !== cols) onChange({ rows: r, cols: k, split: null })
  }
  const onDown = (e: React.PointerEvent) => {
    if (!onChange || turning) return
    if (splitting) {
      const c = cellAt(e)
      if (!c || c.y < 0 || c.y > rows + 0.5) return
      const s = Math.round(c.x)
      if (s < 1 || s >= cols) return
      onChange({ ...value, split: split === s ? null : s })
      return
    }
    svg.current?.setPointerCapture?.(e.pointerId)
    setDown(true)
    resize(e)
  }

  // A quarter turn about the array's centre (rows and columns swap when it lands).
  const cx = PAD + (cols * CELL) / 2
  const cy = PAD + (rows * CELL) / 2
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`touch-none select-none ${className ?? ''}`}
      onPointerDown={onDown}
      onPointerMove={(e) => down && resize(e)}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      preserveAspectRatio="xMidYMid meet"
    >
      <style>{`@keyframes bb-turn { from { transform: rotate(0deg) } to { transform: translate(var(--dx), var(--dy)) rotate(90deg) } }`}</style>
      <rect x={0} y={0} width={SIZE} height={SIZE} rx={16} fill="#c9a77a" />
      {Array.from({ length: GRID * GRID }, (_, i) => (
        <circle key={i} cx={PAD + (i % GRID) * CELL + CELL / 2} cy={PAD + Math.floor(i / GRID) * CELL + CELL / 2} r={CELL * 0.12} fill="#8a6a45" />
      ))}
      <g
        style={
          turning
            ? ({
                transformBox: 'view-box',
                transformOrigin: `${cx}px ${cy}px`,
                // It lands in the board's corner, where the turned array is drawn.
                '--dx': `${((rows - cols) * CELL) / 2}px`,
                '--dy': `${((cols - rows) * CELL) / 2}px`,
                animation: 'bb-turn 0.6s ease-in-out forwards',
              } as React.CSSProperties)
            : undefined
        }
        onAnimationEnd={onTurned}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          return <circle key={i} cx={PAD + c * CELL + CELL / 2} cy={PAD + r * CELL + CELL / 2} r={CELL * 0.36} fill={split && c >= split ? RIGHT_PART : ARRAY_BEAD} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
        })}
        {split ? <line x1={PAD + split * CELL} y1={PAD - 12} x2={PAD + split * CELL} y2={PAD + rows * CELL + 12} stroke="#fbf6ea" strokeWidth={5} strokeDasharray="12 8" /> : null}
      </g>
      {/* In split mode, the places a split can go. */}
      {splitting &&
        Array.from({ length: Math.max(0, cols - 1) }, (_, i) => (
          <line key={i} x1={PAD + (i + 1) * CELL} y1={PAD} x2={PAD + (i + 1) * CELL} y2={PAD + rows * CELL} stroke="#fbf6ea" strokeWidth={2} opacity={0.5} />
        ))}
    </svg>
  )
}
