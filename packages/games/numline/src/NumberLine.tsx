export type Op = '+' | '−' | '×' | '÷'

const W = 800
const H = 170
const AXIS_Y = 100
const EDGE = 24
const MAX_HOPS = 12

interface NumberLineProps {
  a: number
  op: Op | null
  /** Second operand, null until typed. */
  b: number | null
  /** Live result, null when incomputable (e.g. ÷0). */
  result: number | null
  dark: boolean
}

/**
 * Smallest 1/2/5 × 10^n step whose on-screen spacing clears `minPx` —
 * unbounded above, floored at 1 so the line never shows fraction ticks.
 */
function stepFor(pxPerUnit: number, minPx: number): number {
  const raw = Math.max(minPx / pxPerUnit, 1e-9)
  let mag = Math.pow(10, Math.floor(Math.log10(raw)))
  for (;;) {
    for (const m of [1, 2, 5]) {
      const step = m * mag
      if (step >= raw) return Math.max(1, step)
    }
    mag *= 10
  }
}

const fmtTick = (v: number) => v.toLocaleString('en-US')

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * The calculation drawn on a number line. Window auto-fits everything in
 * play (zero stays anchored in view); ticks/labels coarsen as it widens.
 * + / − are jumps; × is repeated hops (skip counting); ÷ measures hops.
 */
export function NumberLine({ a, op, b, result, dark }: NumberLineProps) {
  const values = [0, a]
  if (result !== null) values.push(result)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi - lo < 10) {
    if (lo < 0 && hi <= 0) lo = hi - 10
    else hi = lo + 10
  }
  const margin = (hi - lo) * 0.06 + 0.4
  lo -= margin
  hi += margin
  const ppu = (W - EDGE * 2) / (hi - lo)
  const toX = (v: number) => EDGE + (v - lo) * ppu

  const axis = dark ? '#cbd5e1' : '#475569'
  const minor = dark ? '#475569' : '#cbd5e6'
  const labelC = dark ? '#94a3b8' : '#64748b'
  const teal = '#0d9488'
  const amber = '#f59e0b'

  const minorStep = stepFor(ppu, 9)
  // Label spacing scales with how wide the numerals actually are, so
  // six-figure labels don't collide at large windows.
  const widest = fmtTick(Math.round(Math.max(Math.abs(lo), Math.abs(hi)))).length
  const labelStep = Math.max(stepFor(ppu, Math.max(44, widest * 10 + 16)), minorStep)

  const ticksBy = (step: number): number[] => {
    const out: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v)
    return out
  }

  const arrow = (from: number, to: number, y: number, color: string) =>
    Math.abs(to - from) * ppu > 4 && (
      <g stroke={color} fill={color}>
        <line x1={toX(from)} y1={y} x2={toX(to)} y2={y} strokeWidth="3.5" />
        <path
          d={
            to >= from
              ? `M ${toX(to)} ${y} l -9 -5 v 10 z`
              : `M ${toX(to)} ${y} l 9 -5 v 10 z`
          }
          stroke="none"
        />
        <line x1={toX(from)} y1={y - 5} x2={toX(from)} y2={y + 5} strokeWidth="3" />
      </g>
    )

  const hop = (from: number, to: number, color: string, dashed = false) => (
    <path
      key={`${from}-${to}`}
      d={`M ${toX(from)} ${AXIS_Y - 2} Q ${(toX(from) + toX(to)) / 2} ${AXIS_Y - 46} ${toX(to)} ${AXIS_Y - 2}`}
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeDasharray={dashed ? '6 5' : undefined}
    />
  )

  // Operation stage (drawn once b is typed)
  let stage: React.ReactNode = null
  if (op !== null && b !== null && result !== null) {
    if (op === '+' || op === '−') {
      stage = arrow(a, result, 62, amber)
    } else if (op === '×') {
      // b hops of size a: 0 -> a -> 2a ... skip counting made visible.
      if (a !== 0 && b >= 1 && b <= MAX_HOPS && Number.isInteger(b)) {
        stage = <g>{Array.from({ length: b }, (_, i) => hop(i * a, (i + 1) * a, amber))}</g>
      } else {
        stage = arrow(0, result, 62, amber)
      }
    } else if (op === '÷') {
      // Measure a with hops of size b; the count is the quotient.
      const whole = Math.floor(Math.abs(result))
      if (b !== 0 && whole >= 1 && whole <= MAX_HOPS && a >= 0 && b > 0) {
        stage = (
          <g>
            {Array.from({ length: whole }, (_, i) => hop(i * b, (i + 1) * b, amber))}
            {whole * b < a && hop(whole * b, a, amber, true)}
          </g>
        )
      } else {
        stage = arrow(0, result, 62, amber)
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      {/* minor ticks */}
      {ticksBy(minorStep).map((v) => (
        <line
          key={`m${v}`}
          x1={toX(v)}
          y1={AXIS_Y - 4}
          x2={toX(v)}
          y2={AXIS_Y + 4}
          stroke={minor}
          strokeWidth="1"
        />
      ))}
      {/* axis */}
      <line x1={EDGE - 8} y1={AXIS_Y} x2={W - EDGE + 8} y2={AXIS_Y} stroke={axis} strokeWidth="2.5" />
      {/* labelled ticks */}
      {ticksBy(labelStep).map((v) => (
        <g key={`t${v}`}>
          <line
            x1={toX(v)}
            y1={AXIS_Y - 7}
            x2={toX(v)}
            y2={AXIS_Y + 7}
            stroke={v === 0 ? axis : labelC}
            strokeWidth={v === 0 ? 3 : 2}
          />
          <text
            x={toX(v)}
            y={AXIS_Y + 26}
            textAnchor="middle"
            fontSize="15"
            fontWeight={v === 0 ? 800 : 700}
            fill={v === 0 ? axis : labelC}
          >
            {fmtTick(v)}
          </text>
        </g>
      ))}

      {/* first operand: arrow 0 -> a (skipped for ×, whose hops start at 0) */}
      {!(op === '×' && b !== null) && a !== 0 && arrow(0, a, 82, teal)}
      {a !== 0 && <circle cx={toX(a)} cy={AXIS_Y} r="6" fill={teal} />}

      {stage}

      {/* live result marker */}
      {result !== null && op !== null && b !== null && (
        <g>
          <circle cx={toX(result)} cy={AXIS_Y} r="7" fill={amber} />
          <text
            x={toX(result)}
            y={AXIS_Y + 52}
            textAnchor="middle"
            fontSize="24"
            fontWeight="800"
            fill={amber}
          >
            {round2(result).toLocaleString('en-US')}
          </text>
        </g>
      )}
    </svg>
  )
}
