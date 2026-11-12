import { useEffect, useMemo, useRef, useState } from 'react'
import { usePan } from '@renderblocks/scene/usePan'
import type { Look } from '@renderblocks/designer/look'
import { drawPiece } from '../draw'
import { drawShape } from './draw'
import { count, high, type ChainId } from './chains'
import { NAMES, scene, stageOf, STAGES, WINDOWS, type Placed, type Window } from './windows'

/** Shapes drawn to fit a box, standing on its bottom edge (in blocks, bottom-left corners). */
export function Picture({ parts, lookFor }: { parts: Placed[]; lookFor: (n: bigint) => Look }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      const x1 = Math.max(...parts.map((p) => p.x + p.shape.length))
      const y1 = Math.max(...parts.map((p) => p.y + high(p.shape)))
      // Room round them for arms and tilted corners.
      const scale = Math.min(w / (x1 + 2.4), h / (y1 + 1.6))
      for (const p of parts) {
        const cx = w / 2 + (p.x + p.shape.length / 2 - x1 / 2) * scale
        const cy = h * 0.9 - (p.y + high(p.shape) / 2) * scale
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(cx, cy)
        g.rotate(p.tilt ?? 0)
        g.scale(scale, -scale)
        g.translate(-p.shape.length / 2, -high(p.shape) / 2)
        drawShape(g, p.shape, lookFor(BigInt(count(p.shape))), scale)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [parts, lookFor])
  return <canvas ref={ref} className="w-full h-full" />
}

/** Sneeze²'s window: 16 sneezes out 4 and keeps a ring of 12. */
function Squares({ lookFor }: { lookFor: (n: bigint) => Look }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      const scale = Math.min(w / 9.5, h / 6.5)
      const at = (x: number, y: number, tilt: number, side: number) => {
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(w / 2 + (x - 4.2) * scale, h * 0.86 - y * scale)
        g.rotate(tilt)
        g.scale(scale, -scale)
        g.translate(-side / 2, -side / 2)
      }
      at(2, 2, 0, 4)
      drawPiece(g, 12n, 4n, 2n, { ...lookFor(12n), legs: 'none' }, scale)
      at(6.8, 3.3, 0.25, 2)
      drawPiece(g, 4n, 2n, 0n, { ...lookFor(4n), legs: 'none' }, scale)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [lookFor])
  return <canvas ref={ref} className="w-full h-full" />
}

function Thumb({ window: win, lookFor }: { window: Window; lookFor: (n: bigint) => Look }) {
  const parts = useMemo(() => (win === 'classic' ? [] : scene(win)), [win])
  return win === 'classic' ? <Squares lookFor={lookFor} /> : <Picture parts={parts} lookFor={lookFor} />
}

interface Hung {
  win: Window
  /** Where it hangs from the road. */
  ax: number
  ay: number
  x: number
  y: number
  w: number
  h: number
  above: boolean
}

/** The same road as Symbols' and the Story of Numbers': windows hung in turn above and below a winding line. */
function layout(vw: number, vh: number) {
  const h = Math.round(Math.min(vh * 0.25, 210))
  const w = Math.round((h * 16) / 9)
  const step = w * 0.62
  const mid = vh * 0.52
  const amp = vh * 0.045
  const period = step * 4.6
  const roadY = (x: number) => mid + amp * Math.sin((x / period) * Math.PI * 2)
  const thread = Math.max(16, vh * 0.04)
  const start = Math.max(vw * 0.5, 400)
  const hung: Hung[] = WINDOWS.map((win, i) => {
    const ax = start + i * step
    const ay = roadY(ax)
    const above = i % 2 === 0
    return { win, ax, ay, x: ax - w / 2, y: above ? ay - thread - h : ay + thread, w, h, above }
  })
  const width = start + (WINDOWS.length - 1) * step + w + vw * 0.4
  return { hung, width, roadY, titleW: Math.max(160, start - w / 2 - 64) }
}

/**
 * Home: the sneeze path (Lan, Nov 12: the way in is a path, as in Symbols and
 * the Story of Numbers). Every chain of sneezes is a window on one road, in
 * order, Sneeze² first; each stretch of the road is its own colour. A tap on
 * a window opens that chain's own page, where he picks what to start with.
 * Every window is open from the start (he is two and a half: a locked door
 * would end the play); a star marks the ones he has guessed right in, and the
 * one he was last in glows.
 */
export function Road({ stars, lookFor, last, onOpen, onExit }: { stars: Set<ChainId>; lookFor: (n: bigint) => Look; last: Window; onOpen: (w: Window) => void; onExit: () => void }) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const { hung, width, roadY, titleW } = useMemo(() => layout(size.w, size.h), [size])
  const { track, cam, place, handlers } = usePan({
    width,
    viewW: size.w,
    onTap: (target) => {
      const win = target.closest('[data-window]')?.getAttribute('data-window') as Window | null | undefined
      if (win && WINDOWS.includes(win)) onOpen(win)
    },
  })
  // Opening: straight to where he last was.
  const placedOnce = useRef(false)
  useEffect(() => {
    if (placedOnce.current) return place(cam.current)
    placedOnce.current = true
    const p = hung.find((q) => q.win === last)
    place(p && last !== WINDOWS[0] ? p.ax - size.w / 2 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hung])

  // The road itself, each stretch in its colour.
  const stretches = useMemo(
    () =>
      STAGES.map((s, i) => {
        const at = (k: number) => {
          const j = WINDOWS.indexOf(STAGES[k].from)
          return (hung[j - 1].ax + hung[j].ax) / 2
        }
        const x = i === 0 ? 0 : at(i)
        const to = i + 1 < STAGES.length ? at(i + 1) : width
        let d = ''
        for (let q = x; q <= to + 1; q += 24) d += `${d ? 'L' : 'M'}${q.toFixed(0)} ${roadY(Math.min(q, to)).toFixed(1)}`
        return { ...s, x, d }
      }),
    [hung, width, roadY],
  )

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none touch-none bg-gradient-to-b from-orange-100 to-amber-50 text-slate-900" {...handlers}>
      <style>{`@keyframes sneeze-glow { 0%, 100% { box-shadow: 0 0 0 4px #facc15, 0 0 18px 4px #facc1588 } 50% { box-shadow: 0 0 0 4px #facc15, 0 0 34px 12px #facc15aa } }`}</style>
      <div ref={track} className="absolute left-0 top-0 h-full" style={{ width }}>
        <svg width={width} height={size.h} className="absolute left-0 top-0 pointer-events-none" aria-hidden="true">
          {stretches.map((s) => (
            <path key={s.name} d={s.d} fill="none" stroke={s.colour} strokeWidth={14} strokeLinecap="round" />
          ))}
          {stretches.map((s) => (
            <path key={`${s.name}-line`} d={s.d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="10 12" />
          ))}
        </svg>
        {/* The title, where the road begins. */}
        <div className="absolute flex items-end" style={{ left: 32, top: 0, height: size.h * 0.42, width: titleW }}>
          <div className="font-black text-slate-700" style={{ fontSize: 'clamp(28px, min(7dvh, 8vw), 60px)', lineHeight: 1.05 }} aria-label="The sneeze road">
            Sneeze 🤧
          </div>
        </div>
        {/* Where each stretch begins: its name, on the road. */}
        {stretches.map((s, i) => (
          <div
            key={`stage-${s.name}`}
            data-stage={s.name}
            className="absolute z-[1] rounded-full px-3 py-0.5 whitespace-nowrap pointer-events-none text-white font-black text-base shadow"
            style={{ left: i === 0 ? 32 : s.x, transform: i === 0 ? 'translateY(-50%)' : 'translate(-50%, -50%)', top: roadY(i === 0 ? 32 : s.x), background: s.colour }}
          >
            {i + 1} · {s.name}
          </div>
        ))}
        {hung.map((p, i) => {
          const colour = STAGES[stageOf(p.win)].colour
          const starred = p.win !== 'classic' && stars.has(p.win)
          const glow = last === p.win
          return (
            <div key={p.win}>
              {/* The thread it hangs from. */}
              <div className="absolute bg-amber-700/40" style={{ left: p.ax - 1, top: p.above ? p.y + p.h : p.ay, width: 2, height: Math.abs(p.ay - (p.above ? p.y + p.h : p.y)) }} />
              <button
                type="button"
                data-window={p.win}
                aria-label={`${i + 1}: ${NAMES[p.win]}${starred ? ', star earned' : ''}`}
                className="absolute rounded-2xl bg-white p-1.5"
                style={{ left: p.x, top: p.y, width: p.w, height: p.h, border: `4px solid ${colour}`, boxShadow: glow ? undefined : '0 4px 14px rgba(120,53,15,0.25)', animation: glow ? 'sneeze-glow 1.6s ease-in-out infinite' : undefined }}
              >
                <div className="w-full h-full pointer-events-none">
                  <Thumb window={p.win} lookFor={lookFor} />
                </div>
                {starred && <span className="absolute -top-4 -right-3 text-3xl pointer-events-none">⭐</span>}
              </button>
              {/* Its number and name, on the side away from the road. */}
              <div className="absolute text-center whitespace-nowrap pointer-events-none font-black text-lg text-slate-700" style={{ left: p.x - 30, width: p.w + 60, top: p.above ? p.y - 32 : p.y + p.h + 6 }}>
                <span className="inline-flex items-center justify-center w-7 h-7 mr-2 rounded-full text-white text-base tabular-nums" style={{ background: colour }}>
                  {i + 1}
                </span>
                {NAMES[p.win]}
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={onExit} onPointerDown={(e) => e.stopPropagation()} className="absolute top-3 left-3 w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Home">
        ←
      </button>
    </div>
  )
}
