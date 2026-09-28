import { useRef } from 'react'

/** Hand colours, shared with the digital readout so the parts match. */
export const HOUR = '#2563eb'
export const MINUTE = '#16a34a'
export const SECOND = '#dc2626'

/**
 * An analog clock face (spec: explorer). Every minute has a tick, the
 * 5-minute numbers ring the rim (skip-counting by 5) and the hours sit
 * inside. With `onSet`, both hands can be dragged: the minute hand carries
 * the hour round with it, the way real clock gears do.
 */
export function AnalogClock({
  h,
  m,
  s,
  size = 280,
  minuteNumbers = true,
  onSet,
}: {
  h: number
  m: number
  s?: number
  size?: number
  minuteNumbers?: boolean
  onSet?: (h: number, m: number) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<'hour' | 'minute' | null>(null)

  const angleAt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !onSet) return
    const a = angleAt(e)
    const ch = h
    const cm = m
    if (drag.current === 'minute') {
      const nm = Math.round(a / 6) % 60
      // Crossing 12 moves the hour on (or back), like turning a real clock's hands.
      let nh = ch
      if (cm >= 45 && nm < 15) nh = (ch + 1) % 24
      else if (cm < 15 && nm >= 45) nh = (ch + 23) % 24
      onSet(nh, nm)
    } else {
      const twelve = Math.floor(a / 30) % 12
      onSet((ch >= 12 ? 12 : 0) + twelve, cm)
    }
  }

  const c = 100
  const hand = (deg: number, len: number) => ({ x: c + Math.sin((deg * Math.PI) / 180) * len, y: c - Math.cos((deg * Math.PI) / 180) * len })
  const hourDeg = ((h % 12) + m / 60) * 30
  const minDeg = (m + (s ?? 0) / 60) * 6
  const hp = hand(hourDeg, 44)
  const mp = hand(minDeg, 66)
  const sp = hand((s ?? 0) * 6, 72)

  return (
    <svg
      ref={svg}
      viewBox="-12 -12 224 224"
      width={size}
      height={size}
      className="select-none touch-none"
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      aria-label={`Clock showing ${h % 12 || 12}:${String(m).padStart(2, '0')}`}
    >
      <circle cx={c} cy={c} r={98} fill="var(--card)" stroke="var(--ink)" strokeWidth={3} />
      {Array.from({ length: 60 }, (_, i) => {
        const five = i % 5 === 0
        const a = hand(i * 6, 94)
        const b = hand(i * 6, five ? 84 : 89)
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink)" strokeWidth={five ? 2.4 : 1} opacity={five ? 1 : 0.55} />
      })}
      {minuteNumbers &&
        Array.from({ length: 12 }, (_, i) => {
          const p = hand(i * 30, 106)
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800} fill={MINUTE}>
              {String(i * 5).padStart(2, '0')}
            </text>
          )
        })}
      {Array.from({ length: 12 }, (_, i) => {
        const p = hand((i + 1) * 30, 72)
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={900} fill={HOUR}>
            {i + 1}
          </text>
        )
      })}
      <line x1={c} y1={c} x2={hp.x} y2={hp.y} stroke={HOUR} strokeWidth={8} strokeLinecap="round" />
      <line x1={c} y1={c} x2={mp.x} y2={mp.y} stroke={MINUTE} strokeWidth={5} strokeLinecap="round" />
      {s !== undefined && <line x1={c} y1={c} x2={sp.x} y2={sp.y} stroke={SECOND} strokeWidth={1.8} strokeLinecap="round" />}
      <circle cx={c} cy={c} r={5} fill="var(--ink)" />
      {onSet && (
        <>
          {/* Grab spots at the hands' tips. */}
          <circle cx={mp.x} cy={mp.y} r={13} fill={MINUTE} opacity={0.25} onPointerDown={(e) => ((drag.current = 'minute'), (e.target as Element).setPointerCapture?.(e.pointerId))} className="cursor-grab" />
          <circle cx={hp.x} cy={hp.y} r={13} fill={HOUR} opacity={0.25} onPointerDown={(e) => ((drag.current = 'hour'), (e.target as Element).setPointerCapture?.(e.pointerId))} className="cursor-grab" />
        </>
      )}
    </svg>
  )
}

/** A countdown wedge (spec 10): the part of the circle still to go. */
export function Wedge({ left, total, size = 240, colour = '#0f766e' }: { left: number; total: number; size?: number; colour?: string }) {
  const f = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  const a = f * 2 * Math.PI
  const x = 100 + Math.sin(a) * 90
  const y = 100 - Math.cos(a) * 90
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden>
      <circle cx={100} cy={100} r={94} fill="var(--card)" stroke="var(--line)" strokeWidth={4} />
      {f >= 0.999 ? (
        <circle cx={100} cy={100} r={90} fill={colour} />
      ) : f > 0 ? (
        <path d={`M100 100 L100 10 A90 90 0 ${f > 0.5 ? 1 : 0} 1 ${x} ${y} Z`} fill={colour} />
      ) : null}
    </svg>
  )
}
