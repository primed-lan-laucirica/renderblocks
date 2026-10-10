/**
 * The Stamp Game mat: three columns of stamp tiles (hundreds, tens, ones),
 * the same gestures as the Bead Bank's mat. On a live mat the child makes
 * every exchange with their own hands:
 *   - drag across ten tiles of a kind: they become one tile of the next kind;
 *   - tap a ten or a hundred tile: it becomes ten of the kind below;
 *   - drag tiles off the mat to take them away (when `removable`).
 * Nothing is ever carried or borrowed for them.
 */
import { useEffect, useRef, useState } from 'react'
import { clamp, mix, smooth, type Pt } from '../engine/ease'
import { StampTile } from '../kit/kit'
import { PLACE_COLOUR, SANS } from '../kit/sizes'
import { SM_COL, SM_H, SM_W, TILE_PLACES, TILE_VALUE, smColX, tileAt, tileBox, type Tiles } from './stampLayout'

const ANIM_MS = 900

interface Anim {
  /** The place of the small tiles (ones for ones ⇄ ten). */
  place: number
  from: Pt[]
  to: Pt
  start: number
  reverse: boolean
  add: [place: number, n: number]
}

/**
 * Ten tiles gliding into one spot and becoming one tile of the next place
 * (or, reversed, one tile becoming ten): 0–0.6 glide, 0.6–1 the big tile
 * fades in over the small ones.
 */
function tileExchange(a: Anim, progress: number) {
  const k = a.reverse ? 1 - clamp(progress) : clamp(progress)
  const fade = smooth(clamp((k - 0.6) / 0.4))
  return (
    <g>
      {a.from.map((f, i) => {
        const m = smooth(clamp((k - (i / 10) * 0.15) / 0.45))
        const at = mix(f, { x: a.to.x + i * 3, y: a.to.y - i * 3 }, m)
        return <StampTile key={i} value={TILE_VALUE[a.place]} x={at.x} y={at.y} o={1 - fade} />
      })}
      {fade > 0 && <StampTile value={TILE_VALUE[a.place + 1] as 10 | 100} x={a.to.x} y={a.to.y} o={fade} />}
    </g>
  )
}

interface Props {
  tiles: Tiles
  /** Change the tiles (live mats only). */
  onChange?: (c: Tiles) => void
  /** Dragging tiles off the mat takes them away. */
  removable?: boolean
  /** A sound for each exchange the child makes. */
  onExchange?: (kind: 'fuse' | 'break') => void
  className?: string
}

export function TileMat({ tiles, onChange, removable = false, onExchange, className }: Props) {
  const live = !!onChange
  const [anims, setAnims] = useState<Anim[]>([])
  const [now, setNow] = useState(0)
  const [gather, setGather] = useState<{ place: number; picked: number[]; moved: boolean; at: Pt; start: Pt } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  // The tiles as they'll be once running animations land.
  const pending = useRef<Tiles>(tiles)
  useEffect(() => {
    pending.current = tiles
  }, [tiles])

  useEffect(() => {
    if (!anims.length) return
    let raf = 0
    const tick = (ts: number) => {
      setNow(ts)
      const done = anims.filter((a) => ts - a.start >= ANIM_MS)
      if (done.length) {
        const c = [...pending.current] as Tiles
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
      const b = tileBox(place, i)
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
    if (moved) for (const i of hit(gather.place, at, pending.current[gather.place])) if (!picked.includes(i) && picked.length < 10) picked.push(i)
    setGather({ ...gather, picked, moved, at })
  }
  const up = (e: React.PointerEvent) => {
    if (!gather || !onChange) return
    const { place, picked, moved } = gather
    setGather(null)
    const at = toMat(e)
    const c = [...pending.current] as Tiles
    // The touch's own time: the same clock the animation frames run on.
    const t0 = e.timeStamp
    if (!moved) {
      // A tap: a ten or a hundred becomes ten of the kind below.
      if (place === 0) return
      const from = tileAt(place, c[place] - 1)
      c[place] -= 1
      const landing = Array.from({ length: 10 }, (_, k) => tileAt(place - 1, c[place - 1] + k))
      pending.current = c
      onChange(c)
      onExchange?.('break')
      setAnims((old) => [...old, { place: place - 1, from: landing, to: from, start: t0, reverse: true, add: [place - 1, 10] }])
      return
    }
    // Dragged off the mat: those tiles are taken away.
    if (at.y > SM_H - 10 || at.y < 0 || at.x < 0 || at.x > SM_W) {
      if (!removable) return
      c[place] = Math.max(0, c[place] - picked.length)
      pending.current = c
      onChange(c)
      return
    }
    // Ten gathered: they become one of the next kind.
    if (picked.length === 10 && place < 2) {
      const from = picked.map((i) => tileAt(place, i))
      c[place] -= 10
      const to = tileAt(place + 1, c[place + 1])
      pending.current = c
      onChange(c)
      onExchange?.('fuse')
      setAnims((old) => [...old, { place, from, to, start: t0, reverse: false, add: [place + 1, 1] }])
    }
  }

  const picked = new Set(gather?.moved ? gather.picked : [])
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${SM_W} ${SM_H}`}
      className={`touch-none select-none ${className ?? ''}`}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setGather(null)}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={SM_W} height={SM_H} rx={24} fill="#efe6d4" />
      {[2, 1, 0].map((place) => (
        <g key={place}>
          {place < 2 && <line x1={smColX(place)} y1={20} x2={smColX(place)} y2={SM_H - 20} stroke="#d8c8a6" strokeWidth={3} />}
          <text x={smColX(place) + SM_COL / 2} y={50} fontFamily={SANS} fontWeight={800} fontSize={34} fill={PLACE_COLOUR[place]} textAnchor="middle">
            {TILE_PLACES[place]}
          </text>
          {Array.from({ length: tiles[place] }, (_, i) => {
            const at = tileAt(place, i)
            const glow = gather?.place === place && picked.has(i)
            return (
              <g key={i} onPointerDown={(e) => down(e, place, i)} opacity={glow ? 0.6 : 1}>
                <StampTile value={TILE_VALUE[place]} x={at.x} y={at.y} />
                {glow && <rect x={at.x - 4} y={at.y - 4} width={72} height={72} rx={10} fill="none" stroke="#fff6d5" strokeWidth={5} />}
              </g>
            )
          })}
          <text x={smColX(place) + SM_COL / 2} y={SM_H - 30} fontFamily={SANS} fontWeight={900} fontSize={64} fill={PLACE_COLOUR[place]} textAnchor="middle">
            {tiles[place]}
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
        <g key={k}>{tileExchange(a, Math.min(1, (now - a.start) / ANIM_MS))}</g>
      ))}
    </svg>
  )
}
