/**
 * The Decimal Board's mat: four columns either side of the point (tens,
 * units | tenths, hundredths), in golden beads and their slices, or in
 * money (ten-dollar bills, dollars | dimes, pennies). On a live mat the
 * child does every exchange with their own hands, as on the Bead Bank:
 *   - drag across ten of a kind: they fuse into one of the kind to the left;
 *   - tap a ten, a unit or a tenth: it breaks into ten of the kind to the right;
 *   - drag pieces off the mat to put them back.
 * Nothing is ever carried or broken for them.
 */
import { useEffect, useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { TenBar, UnitBead } from '../kit/kit'
import { Bill, Coin, HundredthPiece, TenthPiece, fuse } from '../kit/part6'
import { SANS } from '../kit/sizes'
import { COL, DEC_PLACE_COLOUR, MAT_H, MAT_W, PLACE_NAMES, POINT_X, S, UNIT_IN_TEN, box, colX, type DecCounts, type Look } from './decimalLayout'

const ANIM_MS = 900

/** One piece of a place, drawn into its box. */
export function DecPiece({ look, place, at, glow = 0, o = 1 }: { look: Look; place: number; at: { x: number; y: number; w: number; h: number }; glow?: number; o?: number }) {
  if (look === 'money') {
    if (place >= 2) return <Bill x={at.x} y={at.y} s={S.bill} value={place === 3 ? 10 : 1} glow={glow} o={o} />
    return <Coin x={at.x + at.w / 2} y={at.y + at.h / 2} kind={place === 1 ? 'dime' : 'penny'} s={S.coin} glow={glow} o={o} />
  }
  switch (place) {
    case 3:
      return <TenBar x={at.x} y={at.y} s={S.ten} o={o} />
    case 2:
      return <UnitBead x={at.x} y={at.y} s={S.unit} glow={glow} o={o} />
    case 1:
      return <TenthPiece x={at.x} y={at.y} s={S.tenth} glow={glow} o={o} />
    default:
      return <HundredthPiece x={at.x} y={at.y} s={S.hundredth} glow={glow} o={o} />
  }
}

interface Anim {
  /** The place of the pieces (a fuse makes one of place + 1; a break, ten of place). */
  place: number
  from: Pt[]
  to: Pt
  start: number
  reverse: boolean
  add: [place: number, n: number]
}

interface Props {
  counts: DecCounts
  look: Look
  onChange?: (c: DecCounts) => void
  onExchange?: (kind: 'fuse' | 'break') => void
  className?: string
}

export function DecimalMat({ counts, look, onChange, onExchange, className }: Props) {
  const live = !!onChange
  const [anims, setAnims] = useState<Anim[]>([])
  const [now, setNow] = useState(0)
  const [gather, setGather] = useState<{ place: number; picked: number[]; moved: boolean; at: Pt; start: Pt } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  // The counts as they'll be once running animations land (so a quick second gesture sees the truth).
  const pending = useRef<DecCounts>(counts)
  useEffect(() => {
    pending.current = counts
  }, [counts])

  useEffect(() => {
    if (!anims.length) return
    let raf = 0
    const tick = (ts: number) => {
      setNow(ts)
      const done = anims.filter((a) => ts - a.start >= ANIM_MS)
      if (done.length) {
        const c = [...pending.current] as DecCounts
        for (const a of done) c[a.add[0]] += a.add[1]
        pending.current = c
        onChange?.(c)
        setAnims((old) => old.filter((a) => !done.includes(a)))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [anims, onChange])

  const toMat = (e: React.PointerEvent): Pt => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  // Generous: the smallest pieces are a few millimetres on a phone.
  const PAD = 10
  const hit = (place: number, at: Pt, n: number) => {
    const out: number[] = []
    for (let i = n - 1; i >= 0; i--) {
      const b = box(look, place, i)
      if (at.x >= b.x - PAD && at.x <= b.x + b.w + PAD && at.y >= b.y - PAD && at.y <= b.y + b.h + PAD) out.push(i)
    }
    return out
  }

  const down = (e: React.PointerEvent, place: number, i: number) => {
    if (!live) return
    e.stopPropagation()
    svg.current?.setPointerCapture?.(e.pointerId)
    const at = toMat(e)
    setGather({ place, picked: [i], moved: false, at, start: at })
  }
  const move = (e: React.PointerEvent) => {
    if (!gather) return
    const at = toMat(e)
    const moved = gather.moved || Math.hypot(at.x - gather.start.x, at.y - gather.start.y) > 10
    const picked = [...gather.picked]
    if (moved) for (const i of hit(gather.place, at, pending.current[gather.place])) if (!picked.includes(i) && picked.length < 10) picked.push(i)
    setGather({ ...gather, picked, moved, at })
  }
  const up = (e: React.PointerEvent) => {
    if (!gather || !onChange) return
    const { place, picked, moved } = gather
    setGather(null)
    const at = toMat(e)
    const c = [...pending.current] as DecCounts
    const t0 = e.timeStamp
    const xy = (p: number, i: number): Pt => {
      const b = box(look, p, i)
      return { x: b.x, y: b.y }
    }
    if (!moved) {
      // A tap: break one into ten of the kind to its right (a hundredth is as small as the board goes).
      if (place === 0) return
      const from = xy(place, c[place] - 1)
      c[place] -= 1
      const landing = Array.from({ length: 10 }, (_, k) => xy(place - 1, c[place - 1] + k))
      pending.current = c
      onChange(c)
      onExchange?.('break')
      setAnims((old) => [...old, { place: place - 1, from: landing, to: from, start: t0, reverse: true, add: [place - 1, 10] }])
      return
    }
    // Dragged off the mat: those pieces go back.
    if (at.y > MAT_H - 10 || at.y < 0 || at.x < 0 || at.x > MAT_W) {
      c[place] = Math.max(0, c[place] - picked.length)
      pending.current = c
      onChange(c)
      return
    }
    // Ten gathered: they fuse into one of the kind to the left.
    if (picked.length === 10 && place < 3) {
      const from = picked.map((i) => xy(place, i))
      c[place] -= 10
      const to = xy(place + 1, c[place + 1])
      pending.current = c
      onChange(c)
      onExchange?.('fuse')
      setAnims((old) => [...old, { place, from, to, start: t0, reverse: false, add: [place + 1, 1] }])
    }
  }

  const picked = new Set(gather?.moved ? gather.picked : [])
  const sizeOf = (p: number) => box(look, p, 0)
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${MAT_W} ${MAT_H}`}
      className={`touch-none select-none ${className ?? ''}`}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setGather(null)}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={MAT_W} height={MAT_H} rx={24} fill="#efe6d4" />
      {[1, 3].map((k) => (
        <line key={k} x1={k * COL} y1={20} x2={k * COL} y2={MAT_H - 20} stroke="#d8c8a6" strokeWidth={3} />
      ))}
      {/* The point: a firmer line, and the dot between the units' and tenths' counts. */}
      <line x1={POINT_X} y1={20} x2={POINT_X} y2={MAT_H - 20} stroke="#3b2f25" strokeWidth={4} opacity={0.5} />
      <circle cx={POINT_X} cy={MAT_H - 42} r={11} fill="#3b2f25" />
      {[3, 2, 1, 0].map((place) => (
        <g key={place}>
          <text x={colX(place) + COL / 2} y={50} fontFamily={SANS} fontWeight={800} fontSize={34} fill={DEC_PLACE_COLOUR[place]} textAnchor="middle">
            {PLACE_NAMES[look][place]}
          </text>
          {Array.from({ length: counts[place] }, (_, i) => {
            const b = box(look, place, i)
            return (
              <g key={i} onPointerDown={(e) => down(e, place, i)}>
                {/* An invisible pad round small pieces, so a finger finds them. */}
                <rect x={b.x - PAD} y={b.y - PAD} width={b.w + 2 * PAD} height={b.h + 2 * PAD} fill="transparent" />
                <DecPiece look={look} place={place} at={b} glow={gather?.place === place && picked.has(i) ? 1 : 0} />
              </g>
            )
          })}
          <text x={colX(place) + COL / 2} y={MAT_H - 30} fontFamily={SANS} fontWeight={900} fontSize={64} fill={DEC_PLACE_COLOUR[place]} textAnchor="middle">
            {counts[place]}
          </text>
        </g>
      ))}
      {gather?.moved && (
        <text x={gather.at.x + 30} y={gather.at.y - 30} fontFamily={SANS} fontWeight={900} fontSize={56} fill={gather.picked.length === 10 ? '#2f855a' : '#7a6a58'}>
          {gather.picked.length}
        </text>
      )}
      {anims.map((a, k) => {
        const whole = sizeOf(a.place + 1)
        return (
          <g key={k}>
            {fuse({
              from: a.from,
              to: a.to,
              progress: Math.min(1, (now - a.start) / ANIM_MS),
              reverse: a.reverse,
              piece: (at, glow) => <DecPiece look={look} place={a.place} at={{ ...sizeOf(a.place), x: at.x, y: at.y }} glow={glow} />,
              whole: (at, o) => <DecPiece look={look} place={a.place + 1} at={{ ...whole, x: at.x, y: at.y }} o={o} />,
              // Units stack into the bar's beads; smaller pieces gather onto the whole's spot.
              slot: (i) => (look === 'beads' && a.place === 2 ? { x: 0, y: i * UNIT_IN_TEN } : { x: (whole.w - sizeOf(a.place).w) / 2, y: (whole.h - sizeOf(a.place).h) / 2 }),
            })}
          </g>
        )
      })}
    </svg>
  )
}
