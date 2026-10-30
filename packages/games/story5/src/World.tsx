/**
 * The Story of Numbers as a place: one long bead chain winding across the
 * paper, from Episode 0's pebbles to the decimals. Each episode hangs on it
 * as a little live window (the scene itself, drawn at one moment), each
 * part's stretch of chain is its own bead colour, every tenth bead carries
 * its count, and each part ends at its workshop. He flings it sideways and
 * taps a window to go in.
 */
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { PARTS } from './curriculum'
import type { SceneDef } from './engine/scene'
import { EPISODES } from './episodes'
import { GOLD, INK, PAPER, SANS, SERIF, SOFT } from './kit/sizes'
import { beadColour, posterT, STOPS, type Stop } from './stops'

interface Placed {
  stop: Stop
  /** Where it hangs from the chain. */
  ax: number
  ay: number
  /** The window. */
  x: number
  y: number
  w: number
  h: number
  above: boolean
}

function layout(vw: number, vh: number) {
  const wh = Math.round(Math.min(vh * 0.24, 200))
  const ww = Math.round((wh * 16) / 9)
  const step = ww * 0.62
  const mid = vh * 0.5
  const amp = vh * 0.05
  const period = step * 4.6
  const chainY = (x: number) => mid + amp * Math.sin((x / period) * Math.PI * 2)
  const thread = Math.max(14, vh * 0.035)
  const start = Math.max(vw * 0.55, 420)
  const placed: Placed[] = []
  let x = start
  STOPS.forEach((stop, i) => {
    const big = stop.kind === 'workshop'
    if (i > 0) x += big || STOPS[i - 1].kind === 'workshop' ? step * 1.25 : step
    const h = big ? Math.round(wh * 1.12) : wh
    const w = big ? Math.round((h * 16) / 9) : ww
    const ay = chainY(x)
    const above = i % 2 === 0
    placed.push({ stop, ax: x, ay, x: x - w / 2, y: above ? ay - thread - h : ay + thread, w, h, above })
  })
  const width = x + ww + vw * 0.45
  // The title fits in the paper before the first window.
  const titleW = Math.max(160, start - ww / 2 - 64)
  return { placed, width, chainY, titleW }
}

/** The chain's beads, each part's stretch in its colour, with every tenth bead's count. */
const Chain = memo(function Chain({ width, height, chainY, placed }: { width: number; height: number; chainY: (x: number) => number; placed: Placed[] }) {
  const R = 6.5
  const beads: { x: number; y: number; c: string; n: number }[] = []
  // Where each part's stretch begins: halfway between its first stop and the stop before.
  const starts = placed.map((p, i) => ({ part: p.stop.part, x: i === 0 ? 0 : (placed[i - 1].ax + p.ax) / 2 }))
  let part = starts[0]?.part ?? 0
  let k = 0
  let n = 0
  for (let x = 24; x < width - 24; x += R * 2.1) {
    while (k + 1 < starts.length && starts[k + 1].x <= x) part = starts[++k].part
    beads.push({ x, y: chainY(x), c: beadColour(part), n: ++n })
  }
  return (
    <svg width={width} height={height} className="absolute left-0 top-0 pointer-events-none" aria-hidden="true">
      <path d={beads.map((b, i) => `${i ? 'L' : 'M'}${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join(' ')} fill="none" stroke="#b9a98f" strokeWidth={2} />
      {beads.map((b) => (
        <g key={b.n}>
          <circle cx={b.x} cy={b.y} r={b.n % 10 === 0 ? R + 1.5 : R} fill={b.c} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />
          {b.n % 10 === 0 && (
            <text x={b.x} y={b.y + 22} fontFamily={SANS} fontWeight={700} fontSize={12} fill={SOFT} textAnchor="middle">
              {b.n}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
})

/** An episode's window: the scene itself, small and still. */
const Still = memo(function Still({ scene }: { scene: SceneDef }) {
  const { Scene } = scene
  return <Scene t={posterT(scene)} />
})

export interface WorldHandle {
  /** The window's rectangle on screen (after bringing it into view at once). */
  rectOf: (id: string) => DOMRect | null
  /** Glide along the chain until this stop is in the middle. */
  glideTo: (id: string) => void
}

interface Props {
  watched: Set<string>
  stars: number[]
  /** The stop to glow (what comes next). */
  next: string | null
  /** Hidden behind an episode or workshop: it stops listening. */
  covered: boolean
  onOpen: (stop: Stop) => void
  onExit: () => void
}

export const World = forwardRef<WorldHandle, Props>(function World({ watched, stars, next, covered, onOpen, onExit }, ref) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const { placed, width, chainY, titleW } = useMemo(() => layout(size.w, size.h), [size])
  const maxCam = Math.max(0, width - size.w)

  // The camera: how far along the chain. Moved directly (every frame while flung); React hears about it only to choose which windows to draw.
  const track = useRef<HTMLDivElement>(null)
  const cam = useRef(0)
  const [seen, setSeen] = useState({ from: 0, to: size.w })
  const anim = useRef(0)
  const place = (x: number) => {
    cam.current = Math.min(maxCam, Math.max(0, x))
    if (track.current) track.current.style.transform = `translateX(${-cam.current}px)`
    const from = Math.floor((cam.current - size.w * 0.5) / 400) * 400
    setSeen((s) => (s.from === from ? s : { from, to: from + size.w * 2 + 400 }))
  }
  const centreOf = (id: string) => {
    const p = placed.find((q) => q.stop.id === id)
    return p ? p.ax - size.w / 2 : cam.current
  }
  const glide = (to: number) => {
    cancelAnimationFrame(anim.current)
    const from = cam.current
    const t0 = performance.now()
    const dur = Math.min(1400, 400 + Math.abs(to - from) * 0.4)
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      place(from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2))
      if (k < 1) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }

  // Opening: straight to what's next.
  const placedOnce = useRef(false)
  useEffect(() => {
    if (placedOnce.current) return place(cam.current)
    placedOnce.current = true
    place(next && next !== STOPS[0]?.id ? centreOf(next) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  useImperativeHandle(ref, () => ({
    rectOf: (id) => {
      cancelAnimationFrame(anim.current)
      const p = placed.find((q) => q.stop.id === id)
      if (!p) return null
      if (p.x - cam.current < 0 || p.x + p.w - cam.current > size.w) place(centreOf(id))
      return new DOMRect(p.x - cam.current, p.y, p.w, p.h)
    },
    glideTo: (id) => glide(centreOf(id)),
  }))

  // Dragging and flinging. A press that hardly moves is a tap on whatever's under it.
  const press = useRef<{ id: number; x0: number; c0: number; moved: boolean; v: number; lx: number; lt: number } | null>(null)
  const down = (e: React.PointerEvent) => {
    if (covered) return
    cancelAnimationFrame(anim.current)
    press.current = { id: e.pointerId, x0: e.clientX, c0: cam.current, moved: false, v: 0, lx: e.clientX, lt: performance.now() }
  }
  const move = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!p.moved && Math.abs(e.clientX - p.x0) > 8) {
      p.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!p.moved) return
    const now = performance.now()
    p.v = (p.lx - e.clientX) / Math.max(1, now - p.lt)
    p.lx = e.clientX
    p.lt = now
    place(p.c0 - (e.clientX - p.x0))
  }
  const up = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    press.current = null
    if (!p.moved) {
      const stop = (e.target as Element).closest('[data-stop]')?.getAttribute('data-stop')
      const hit = stop && placed.find((q) => q.stop.id === stop)
      if (hit) onOpen(hit.stop)
      return
    }
    // A fling carries on and slows down.
    let v = p.v * 16
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 16
      last = now
      v *= 0.95 ** dt
      place(cam.current + v * dt)
      if (Math.abs(v) > 0.3 && cam.current > 0 && cam.current < maxCam) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }
  const wheel = (e: React.WheelEvent) => {
    cancelAnimationFrame(anim.current)
    place(cam.current + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY))
  }

  return (
    <div
      className="h-dvh w-full relative overflow-hidden select-none touch-none"
      style={{ background: `radial-gradient(ellipse at center, ${PAPER} 55%, #e2d5bc)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => (press.current = null)}
      onWheel={wheel}
    >
      <style>{`@keyframes story5-glow { 0%, 100% { box-shadow: 0 0 0 4px ${GOLD}, 0 0 18px 4px ${GOLD}88 } 50% { box-shadow: 0 0 0 4px ${GOLD}, 0 0 34px 12px ${GOLD}aa } }`}</style>
      <div ref={track} className="absolute left-0 top-0 h-full" style={{ width }}>
        <Chain width={width} height={size.h} chainY={chainY} placed={placed} />
        {/* The title, where the chain begins. */}
        <div className="absolute flex items-end" style={{ left: 32, top: 0, height: size.h * 0.42, width: titleW }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, color: INK, fontSize: 'clamp(28px, min(6dvh, 8vw), 56px)', lineHeight: 1.05 }}>The Story of Numbers</div>
        </div>
        {/* Where each part's stretch of chain begins: its name, on the chain. */}
        {placed.map((p, i) => {
          if (i === 0 || p.stop.part === placed[i - 1].stop.part) return null
          const x = (placed[i - 1].ax + p.ax) / 2
          const part = PARTS.find((q) => q.n === p.stop.part)
          return (
            <div
              key={`part${p.stop.part}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-[1] rounded-full px-3 py-0.5 whitespace-nowrap pointer-events-none"
              style={{ left: x, top: chainY(x), background: beadColour(p.stop.part), color: p.stop.part >= 3 && p.stop.part <= 5 ? INK : '#fff', fontFamily: SERIF, fontWeight: 700, fontSize: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
            >
              Part {p.stop.part} · {part?.title}
            </div>
          )
        })}
        {placed.map((p) => {
          if (p.x + p.w < seen.from || p.x > seen.to) return null
          const s = p.stop
          const done = s.kind === 'episode' ? watched.has(s.id) : stars.includes(s.part)
          const glow = next === s.id
          const scene = s.kind === 'episode' ? EPISODES[s.n] : null
          const title = s.kind === 'episode' ? (s.n === 0 ? 'The Story of Numbers' : PARTS.find((q) => q.n === s.part)?.episodes.find((e) => e.n === s.n)?.title) : PARTS.find((q) => q.n === s.part)?.workshop
          return (
            <div key={s.id}>
              {/* The thread it hangs from. */}
              <div className="absolute" style={{ left: p.ax - 1, top: p.above ? p.y + p.h : p.ay, width: 2, height: Math.abs(p.ay - (p.above ? p.y + p.h : p.y)), background: '#b9a98f' }} />
              <button
                type="button"
                data-stop={s.id}
                aria-label={s.kind === 'episode' ? `Episode ${s.n}: ${title}` : `${title} workshop`}
                className="absolute rounded-xl overflow-hidden"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.w,
                  height: p.h,
                  background: s.kind === 'workshop' ? beadColour(s.part) : PAPER,
                  boxShadow: glow ? undefined : '0 4px 14px rgba(59,47,37,0.25)',
                  outline: `${s.kind === 'workshop' ? 4 : 2}px solid ${s.kind === 'workshop' ? INK : '#b9a98f'}`,
                  animation: glow ? 'story5-glow 1.6s ease-in-out infinite' : undefined,
                }}
              >
                {scene ? (
                  <div className="absolute inset-0 pointer-events-none">
                    <Still scene={scene} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ color: s.part === 4 || s.part === 3 ? INK : '#fff', fontFamily: SERIF }}>
                    <div style={{ fontSize: p.h * 0.32 }}>🛠</div>
                    <div style={{ fontWeight: 700, fontSize: p.h * 0.15 }}>{title}</div>
                  </div>
                )}
                {done && (
                  <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black pointer-events-none" style={{ background: GOLD, color: INK, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {s.kind === 'workshop' ? '⭐' : '✓'}
                  </div>
                )}
              </button>
              {/* Its number and name, on the side away from the chain. */}
              <div
                className="absolute text-center whitespace-nowrap pointer-events-none"
                style={{ left: p.x - 20, width: p.w + 40, top: p.above ? p.y - 30 : p.y + p.h + 6, fontFamily: SERIF, fontWeight: 700, fontSize: 18, color: INK }}
              >
                {s.kind === 'episode' && <span style={{ color: SOFT, marginRight: 8 }}>{s.n}</span>}
                {s.kind === 'episode' ? title : `Part ${s.part} workshop`}
              </div>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onExit}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold opacity-40 active:opacity-80"
        style={{ color: INK }}
        aria-label="Home"
      >
        ←
      </button>
    </div>
  )
})
