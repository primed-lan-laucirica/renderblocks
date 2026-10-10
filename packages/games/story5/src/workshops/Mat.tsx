/**
 * The Bead Bank mat: four columns of golden bead material (thousands,
 * hundreds, tens, units), drawn with the kit at the episodes' scale. On a
 * live mat the child does every exchange with their own hands:
 *   - drag across ten of a kind to gather them: they fuse into one of the next kind;
 *   - tap a ten, hundred or thousand: it breaks into ten of the kind below;
 *   - drag pieces off the mat (onto the tray) to put them back.
 * Nothing is ever carried or broken for them.
 */
import { useEffect, useRef, useState } from 'react'
import type { Pt } from '../engine/ease'
import { exchange, type ExchangeKind } from '../kit/exchange'
import { HundredSquare, TenBar, ThousandCube, UnitBead } from '../kit/kit'
import { PLACE_COLOUR, SANS } from '../kit/sizes'
import { COL, MAT_H, MAT_W, PLACE_NAMES, THOUSAND_S, box, colX, layout, type Counts } from './matLayout'

const KIND: ExchangeKind[] = ['units→ten', 'tens→hundred', 'hundreds→thousand']
const ANIM_MS = 900

interface Anim {
  kind: ExchangeKind
  from: Pt[]
  to: Pt
  start: number
  reverse: boolean
  /** What to add when it finishes. */
  add: [place: number, n: number]
}

export function Piece({ place, at, glow = 0 }: { place: number; at: Pt; glow?: number }) {
  if (place === 0) return <UnitBead x={at.x} y={at.y} glow={glow} />
  const p = place === 1 ? <TenBar x={at.x} y={at.y} /> : place === 2 ? <HundredSquare x={at.x} y={at.y} /> : <ThousandCube x={at.x} y={at.y} s={THOUSAND_S} />
  return glow > 0 ? <g opacity={0.75}>{p}</g> : p
}

interface Props {
  counts: Counts
  /** Change the counts (live mats only). */
  onChange?: (c: Counts) => void
  /** A sound for each exchange the child makes. */
  onExchange?: (kind: 'fuse' | 'break') => void
  className?: string
}

export function Mat({ counts, onChange, onExchange, className }: Props) {
  const live = !!onChange
  const [anims, setAnims] = useState<Anim[]>([])
  const [now, setNow] = useState(0)
  const [gather, setGather] = useState<{ place: number; picked: number[]; moved: boolean; at: Pt; start: Pt } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  // The counts as they'll be once running animations land (so a quick second gesture sees the truth).
  const pending = useRef<Counts>(counts)
  useEffect(() => {
    pending.current = counts
  }, [counts])

  // Run the animations, then land what they carry.
  useEffect(() => {
    if (!anims.length) return
    let raf = 0
    const tick = (ts: number) => {
      setNow(ts)
      const done = anims.filter((a) => ts - a.start >= ANIM_MS)
      if (done.length) {
        const c = [...pending.current] as Counts
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
  const hit = (place: number, at: Pt, n: number) => {
    const out: number[] = []
    for (let i = n - 1; i >= 0; i--) {
      const b = box(place, i)
      if (at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h) out.push(i)
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
    if (moved)
      for (const i of hit(gather.place, at, pending.current[gather.place])) if (!picked.includes(i) && picked.length < 10) picked.push(i)
    setGather({ ...gather, picked, moved, at })
  }
  const up = (e: React.PointerEvent) => {
    if (!gather || !onChange) return
    const { place, picked, moved } = gather
    setGather(null)
    const at = toMat(e)
    const c = [...pending.current] as Counts
    // The touch's own time: the same clock the animation frames run on.
    const t0 = e.timeStamp
    if (!moved) {
      // A tap: break one of this kind into ten of the kind below.
      if (place === 0) return
      const from = layout(place, c[place] - 1)
      c[place] -= 1
      const landing = Array.from({ length: 10 }, (_, k) => layout(place - 1, c[place - 1] + k))
      pending.current = c
      onChange(c)
      onExchange?.('break')
      setAnims((old) => [...old, { kind: KIND[place - 1], from: landing, to: from, start: t0, reverse: true, add: [place - 1, 10] }])
      return
    }
    // Dragged off the mat: those pieces go back to the tray.
    if (at.y > MAT_H - 10 || at.y < 0 || at.x < 0 || at.x > MAT_W) {
      c[place] = Math.max(0, c[place] - picked.length)
      pending.current = c
      onChange(c)
      return
    }
    // Ten gathered: they fuse into one of the next kind.
    if (picked.length === 10 && place < 3) {
      const from = picked.map((i) => layout(place, i))
      c[place] -= 10
      const to = layout(place + 1, c[place + 1])
      pending.current = c
      onChange(c)
      onExchange?.('fuse')
      setAnims((old) => [...old, { kind: KIND[place], from, to, start: t0, reverse: false, add: [place + 1, 1] }])
    }
  }

  // Pieces being animated aren't drawn in their columns: the counts already exclude them.
  const picked = new Set(gather?.moved ? gather.picked : [])
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
      {[3, 2, 1, 0].map((place) => (
        <g key={place}>
          {place < 3 && <line x1={colX(place)} y1={20} x2={colX(place)} y2={MAT_H - 20} stroke="#d8c8a6" strokeWidth={3} />}
          <text x={colX(place) + COL / 2} y={50} fontFamily={SANS} fontWeight={800} fontSize={34} fill={PLACE_COLOUR[place]} textAnchor="middle">
            {PLACE_NAMES[place]}
          </text>
          {Array.from({ length: counts[place] }, (_, i) => (
            <g key={i} onPointerDown={(e) => down(e, place, i)}>
              <Piece place={place} at={layout(place, i)} glow={gather?.place === place && picked.has(i) ? 1 : 0} />
            </g>
          ))}
          <text x={colX(place) + COL / 2} y={MAT_H - 30} fontFamily={SANS} fontWeight={900} fontSize={64} fill={PLACE_COLOUR[place]} textAnchor="middle">
            {counts[place]}
          </text>
        </g>
      ))}
      {/* Gathered so far: a count by the finger. */}
      {gather?.moved && (
        <text x={gather.at.x + 30} y={gather.at.y - 30} fontFamily={SANS} fontWeight={900} fontSize={56} fill={gather.picked.length === 10 ? '#2f855a' : '#7a6a58'}>
          {gather.picked.length}
        </text>
      )}
      {anims.map((a, k) => (
        <g key={k}>{exchange(a.kind, a.from, a.to, Math.min(1, (now - a.start) / ANIM_MS), a.reverse, a.kind === 'hundreds→thousand' ? THOUSAND_S : 1)}</g>
      ))}
    </svg>
  )
}
