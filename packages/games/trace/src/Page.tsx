import { useEffect, useMemo, useRef, useState } from 'react'
import type { Layout, Poly, Pt } from './glyphs'
import { pageLayout, viewBox } from './sheet'
import { dots, FINISH_MS, goodEnough, liftTrace, moveTrace, overlap, STALL_MS, startTrace, TOLERANCE, traced, type FadeStep, type Trace } from './fade'
import type { Item } from './items'
import { strokeDone, tick, TICK_EVERY, wake } from './clicks'

export interface Pen {
  color: string
  rainbow: boolean
  /** Nib width in units (x-height is 1). */
  nib: number
}

/** One stroke of his ink: x, y (units) and t (ms since the page opened), flattened. */
export interface Ink {
  pts: number[]
  /** In a locked trace, the model stroke it belongs to (for undo). */
  s?: number
}

export interface Done {
  result: 'clean' | 'ok' | 'struggle'
  ink: Ink[]
  /** The wrap width the page was laid out at (so the gallery redraws it the same). */
  wrap: number
}

export type Size = 'big' | 'medium' | 'small'

/** Once a stylus touches the screen, fingers and palms are ignored (resting a hand). */
let stylusSeen = false


const polyPoints = (pts: Pt[]) => pts.map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(' ')

/** The part of a stroke up to distance s along it. */
const upTo = (p: Poly, s: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < p.pts.length && p.at[i] <= s; i++) out.push(p.pts[i])
  return out
}

/** His ink, drawn with the pen (a rainbow pen shades along the stroke). */
export function InkStrokes({ ink, pen, until }: { ink: Ink[]; pen: Pen; until?: number }) {
  let n = 0
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth={pen.nib}>
      {ink.map((st, k) => {
        const pts: Pt[] = []
        for (let i = 0; i < st.pts.length; i += 3) if (until === undefined || st.pts[i + 2] <= until) pts.push({ x: st.pts[i], y: st.pts[i + 1] })
        if (!pts.length) return null
        if (pts.length === 1) return <circle key={k} cx={pts[0].x} cy={pts[0].y} r={pen.nib / 2} fill={pen.rainbow ? `hsl(${(n++ * 4) % 360} 85% 55%)` : pen.color} />
        if (!pen.rainbow) return <polyline key={k} points={polyPoints(pts)} stroke={pen.color} />
        const parts = []
        for (let i = 0; i < pts.length - 1; i += 4) parts.push(<polyline key={i} points={polyPoints(pts.slice(i, i + 5))} stroke={`hsl(${(n++ * 4) % 360} 85% 55%)`} />)
        return <g key={k}>{parts}</g>
      })}
    </g>
  )
}

/** The lines under the writing: headline (only when something reaches it), midline, baseline. */
export function Lines({ lay, baselineOnly }: { lay: Layout; baselineOnly?: boolean }) {
  const vb = viewBox(lay)
  return (
    <g>
      {lay.lineTops.map((y) => (
        <g key={y}>
          {!baselineOnly && lay.tall && <line x1={vb.x} x2={vb.x + vb.w} y1={y} y2={y} stroke="#CBD5E1" strokeWidth={0.025} />}
          {!baselineOnly && <line x1={vb.x} x2={vb.x + vb.w} y1={y + 1} y2={y + 1} stroke="#93C5FD" strokeWidth={0.025} strokeDasharray="0.16 0.12" />}
          <line x1={vb.x} x2={vb.x + vb.w} y1={y + 2} y2={y + 2} stroke="#60A5FA" strokeWidth={0.045} />
        </g>
      ))}
    </g>
  )
}

/** The model as a solid path. */
function ModelPath({ lay, color, width, opacity = 1 }: { lay: Layout; color: string; width: number; opacity?: number }) {
  return (
    <g fill={color} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ opacity, transition: 'opacity 220ms' }}>
      {lay.strokes.map((p, i) => (p.dot ? <circle key={i} cx={p.pts[0].x} cy={p.pts[0].y} r={width * 0.75} stroke="none" /> : <polyline key={i} points={polyPoints(p.pts)} fill="none" />))}
    </g>
  )
}

/** Where to touch, pointing the way to go: an arrow on the current stroke where he's got to. */
function Arrow({ lay, trace }: { lay: Layout; trace: Trace }) {
  const p = lay.strokes[trace.stroke]
  if (!p) return null
  const at = p.dot ? 0 : Math.max(0, p.at.findIndex((s) => s >= trace.progress))
  const a = p.pts[at]
  const b = p.pts[Math.min(p.pts.length - 1, at + 3)]
  const ang = p.dot ? 90 : (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return (
    <g transform={`translate(${a.x} ${a.y}) rotate(${ang})`}>
      <polygon points="0.2,0 -0.13,-0.17 -0.06,0 -0.13,0.17" fill="#16A34A" stroke="white" strokeWidth={0.03} strokeLinejoin="round">
        <animate attributeName="opacity" values="1;0.45;1" dur="1.3s" repeatCount="indefinite" />
      </polygon>
    </g>
  )
}

function Dots({ lay, step }: { lay: Layout; step: FadeStep }) {
  return (
    <g>
      {lay.strokes.map((p, i) =>
        dots(p, step.spacing ?? 0.16, step.startsOnly).map((q, k) => (
          <circle key={`${i}-${k}`} cx={q.x} cy={q.y} r={k === 0 ? 0.095 : 0.065} fill={k === 0 ? '#16A34A' : '#94A3B8'} />
        )),
      )}
    </g>
  )
}

/** Show me: the strokes drawn in order by a moving pen. Returns the drawn parts at time t. */
const SHOW_SPEED = 2.4 // units per second
const SHOW_PAUSE = 300
function showMeTimes(lay: Layout) {
  let t = 0
  return lay.strokes.map((p) => {
    const start = t
    t += (p.dot ? 0.25 : p.at[p.at.length - 1] / SHOW_SPEED) * 1000 + SHOW_PAUSE
    return { start, end: t - SHOW_PAUSE }
  })
}

interface PageProps {
  item: Item
  /** Wrap width for long items (sheet.ts wrapFor). */
  wrap: number
  step: FadeStep
  lines: boolean
  pen: Pen
  size: Size
  onDone: (d: Done) => void
}

/**
 * One page: the item on its lines, drawn at its step of the fade
 * (Handwriting-MVP-spec.md). A locked step inks only on the path, in stroke
 * order and direction; a free step takes whatever he writes and, when he
 * stops, fades the model in over it.
 */
export function Page({ item, wrap, step, lines, pen, size, onDone }: PageProps) {
  const lay = useMemo(() => pageLayout(item, wrap), [item, wrap])
  const vb = viewBox(lay)
  const svg = useRef<SVGSVGElement>(null)
  const [ink, setInk] = useState<Ink[]>([])
  const [trace, setTrace] = useState<Trace>(startTrace)
  const [flash, setFlash] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [show, setShow] = useState<number | null>(null)
  const [replay, setReplay] = useState<number | null>(null)
  // Bookkeeping for the handlers (never read while rendering).
  const live = useRef({ trace: startTrace(), ink: [] as Ink[], pointer: -1, t0: 0, moves: 0, off: 0, showMe: false, timers: [] as number[], busy: false, ticked: 0 })

  const finished = done !== null
  const locked = step.locked

  // The page opens: the clock starts; a flash on opening, then on a timer.
  useEffect(() => {
    const l = live.current
    l.t0 = performance.now()
    const timers: number[] = []
    const flashOnce = () => {
      if (live.current.busy) return
      setFlash(true)
      timers.push(window.setTimeout(() => setFlash(false), step.show ?? 1000))
    }
    if (step.onOpen && step.show) timers.push(window.setTimeout(flashOnce, 600))
    const every = step.every ? window.setInterval(flashOnce, step.every) : 0
    return () => {
      timers.forEach(window.clearTimeout)
      window.clearInterval(every)
      l.timers.forEach(window.clearTimeout)
    }
  }, [step])

  const clearTimers = () => {
    live.current.timers.forEach(window.clearTimeout)
    live.current.timers = []
  }

  const finish = (result: Done['result']) => {
    clearTimers()
    const d = { result, ink: live.current.ink, wrap }
    live.current.busy = true
    setFlash(false)
    setDone(d)
    onDone(d)
  }

  const inkPoints = () => live.current.ink.map((s) => Array.from({ length: s.pts.length / 3 }, (_, i) => ({ x: s.pts[i * 3], y: s.pts[i * 3 + 1] })))
  /** A look at his writing: a match is clean (or just ok if he watched Show me); otherwise a struggle. */
  const look = () => {
    if (live.current.ink.length) finish(goodEnough(overlap(lay.strokes, inkPoints())) ? (live.current.showMe ? 'ok' : 'clean') : 'struggle')
  }

  /** A free page: he stopped writing. Finished if it already looks right; otherwise a reminder, then a look. */
  const stopped = () => {
    clearTimers()
    const l = live.current
    const o = overlap(lay.strokes, inkPoints())
    if (o.cover >= 0.85 && goodEnough(o)) {
      l.timers.push(window.setTimeout(look, 900))
      return
    }
    l.timers.push(
      window.setTimeout(() => {
        if (step.onStall && step.show) {
          setFlash(true)
          l.timers.push(window.setTimeout(() => setFlash(false), step.show))
        }
        l.timers.push(window.setTimeout(look, FINISH_MS))
      }, STALL_MS),
    )
  }

  const toUnits = (e: React.PointerEvent): { q: Pt; tol: number } | null => {
    const el = svg.current
    const m = el?.getScreenCTM()
    if (!el || !m) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    // Never fussier than about 24 px, however small the writing.
    return { q: { x: p.x, y: p.y }, tol: Math.max(TOLERANCE, 24 / m.a) }
  }

  const addPoint = (q: Pt, newStroke: boolean, s?: number) => {
    const l = live.current
    const t = Math.round(performance.now() - l.t0)
    const r = (v: number) => Math.round(v * 100) / 100
    if (newStroke || !l.ink.length) l.ink = [...l.ink, { pts: [r(q.x), r(q.y), t], s }]
    else {
      const last = l.ink[l.ink.length - 1]
      const n = last.pts.length
      if (Math.hypot(last.pts[n - 3] - q.x, last.pts[n - 2] - q.y) < 0.02) return
      l.ink = [...l.ink.slice(0, -1), { ...last, pts: [...last.pts, r(q.x), r(q.y), t] }]
    }
    setInk(l.ink)
  }

  /** The dial: a tick for each bit of path covered (pitch rising through the stroke), a tone when a stroke is done. */
  const dial = (before: Trace, after: Trace) => {
    const l = live.current
    if (after.stroke !== before.stroke) {
      l.ticked = 0
      return strokeDone()
    }
    const p = lay.strokes[after.stroke]
    if (!p || p.dot || after.progress - l.ticked < TICK_EVERY) return
    l.ticked = after.progress
    tick(after.progress / p.at[p.at.length - 1])
  }

  const onDown = (e: React.PointerEvent) => {
    const l = live.current
    if (e.pointerType === 'pen') stylusSeen = true
    if ((stylusSeen && e.pointerType === 'touch') || l.pointer !== -1 || finished || show !== null) return
    const u = toUnits(e)
    if (!u) return
    l.pointer = e.pointerId
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    clearTimers()
    wake()
    if (locked) {
      const before = l.trace
      const r = moveTrace(l.trace, lay.strokes, u.q, u.tol)
      l.trace = r.t
      setTrace(r.t)
      dial(before, r.t)
      if (r.ink) addPoint(u.q, true, before.stroke)
      if (traced(r.t, lay.strokes)) finish(l.off / Math.max(1, l.moves) < 0.35 && !l.showMe ? 'clean' : 'ok')
    } else addPoint(u.q, true)
  }

  const onMove = (e: React.PointerEvent) => {
    const l = live.current
    if (e.pointerId !== l.pointer) return
    const u = toUnits(e)
    if (!u) return
    if (!locked) return addPoint(u.q, false)
    const before = l.trace
    const r = moveTrace(l.trace, lay.strokes, u.q, u.tol)
    l.moves++
    if (!r.ink) l.off++
    l.trace = r.t
    setTrace(r.t)
    dial(before, r.t)
    // Ink only on the path: a fresh ink stroke whenever the finger rejoins it, or a new model stroke begins.
    const last = l.ink[l.ink.length - 1]
    if (r.ink) addPoint(u.q, !before.engaged || !last || last.s !== before.stroke, before.stroke)
    if (traced(r.t, lay.strokes)) finish(l.off / Math.max(1, l.moves) < 0.35 && !l.showMe ? 'clean' : 'ok')
  }

  const onUp = (e: React.PointerEvent) => {
    const l = live.current
    if (e.pointerId !== l.pointer) return
    l.pointer = -1
    if (finished) return
    if (locked) {
      const t = liftTrace(l.trace, lay.strokes)
      dial(l.trace, t)
      l.trace = t
      setTrace(t)
      if (traced(t, lay.strokes)) finish(l.off / Math.max(1, l.moves) < 0.35 && !l.showMe ? 'clean' : 'ok')
    } else stopped()
  }

  const undo = () => {
    const l = live.current
    if (finished || !l.ink.length) return
    if (locked) {
      // Start the current stroke again, or (if it hasn't begun) go back to the last one.
      const cur = l.trace.stroke
      const back = l.ink.some((s) => s.s === cur) ? cur : Math.max(0, cur - 1)
      l.ink = l.ink.filter((s) => (s.s ?? 0) < back)
      l.trace = { stroke: back, progress: 0, engaged: false, at: 0 }
      l.ticked = 0
      setTrace(l.trace)
    } else l.ink = l.ink.slice(0, -1)
    setInk(l.ink)
  }

  const clear = () => {
    const l = live.current
    if (finished) return
    clearTimers()
    l.ink = []
    l.trace = startTrace()
    l.ticked = 0
    setInk([])
    setTrace(l.trace)
  }

  const showMe = () => {
    if (show !== null || finished) return
    live.current.showMe = true
    live.current.busy = true
    setFlash(false)
    const times = showMeTimes(lay)
    const total = times[times.length - 1].end + 700
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      if (t > total) {
        setShow(null)
        live.current.busy = false
        return
      }
      setShow(t)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const play = () => {
    const end = Math.max(0, ...ink.map((s) => s.pts[s.pts.length - 1]))
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      if (t > end + 500) return setReplay(null)
      setReplay(t)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // What to draw.
  const pathShown = step.phase === 'solid'
  const dotsShown = step.phase === 'dots'
  const showTimes = show !== null ? showMeTimes(lay) : []
  const cur = lay.strokes[trace.stroke]
  const resume = locked && cur && !finished ? (cur.dot ? cur.pts[0] : (upTo(cur, trace.progress).at(-1) ?? cur.pts[0])) : null
  const sizeCap = size === 'big' ? '100%' : size === 'medium' ? '66%' : '44%'

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex items-center justify-center p-2">
        <svg
          ref={svg}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="w-full h-full touch-none select-none"
          style={{ maxHeight: sizeCap, maxWidth: size === 'big' ? '100%' : sizeCap }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {lines && <Lines lay={lay} baselineOnly={step.baselineOnly} />}
          {pathShown && <ModelPath lay={lay} color="#D6DEE8" width={0.36} />}
          {dotsShown && <Dots lay={lay} step={step} />}
                    {/* Flash: the whole pattern, for a moment. */}
          {step.show !== undefined && <ModelPath lay={lay} color="#64748B" width={0.2} opacity={flash ? 0.85 : 0} />}
          {/* Where to carry on: the arrow, or (arrows off) a ring. */}
          {!step.arrows && resume && show === null && (
            <circle cx={resume.x} cy={resume.y} r={0.14} fill="none" stroke="#16A34A" strokeWidth={0.05}>
              <animate attributeName="r" values="0.1;0.24;0.1" dur="1.3s" repeatCount="indefinite" />
            </circle>
          )}
          <InkStrokes ink={ink} pen={pen} until={replay ?? undefined} />
          {step.arrows && !finished && show === null && <Arrow lay={lay} trace={trace} />}
          {/* Show me: the strokes drawn in order. */}
          {show !== null && (
            <g stroke="#F59E0B" fill="#F59E0B" strokeWidth={0.16} strokeLinecap="round" strokeLinejoin="round">
              {lay.strokes.map((p, i) => {
                const { start, end } = showTimes[i]
                if (show < start) return null
                const f = Math.min(1, (show - start) / Math.max(1, end - start))
                if (p.dot) return <circle key={i} cx={p.pts[0].x} cy={p.pts[0].y} r={0.12 * f} stroke="none" />
                const pts = upTo(p, f * p.at[p.at.length - 1])
                const tip = pts[pts.length - 1]
                return (
                  <g key={i}>
                    <polyline points={polyPoints(pts)} fill="none" />
                    {f < 1 && tip && <circle cx={tip.x} cy={tip.y} r={0.13} stroke="none" fill="#B45309" />}
                  </g>
                )
              })}
            </g>
          )}
          {/* After a page without a path: the model fades in over his writing. */}
          {finished && !locked && <ModelPath lay={lay} color="#0EA5E9" width={0.1} opacity={0.6} />}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-2 p-2">
        {!finished && (
          <>
            <Tool label="Show me" onClick={showMe}>👀</Tool>
            <Tool label="Undo" onClick={undo}>↶</Tool>
            <Tool label="Clear" onClick={clear}>✕</Tool>
            {!locked && ink.length > 0 && (
              <Tool label="Done" onClick={look}>
                ✓
              </Tool>
            )}
          </>
        )}
        {finished && (
          <Tool label="Watch again" onClick={play}>▶</Tool>
        )}
      </div>
    </div>
  )
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="w-14 h-14 rounded-2xl bg-white shadow text-2xl font-black active:scale-95 transition-transform">
      {children}
    </button>
  )
}
