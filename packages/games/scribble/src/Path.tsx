import { useEffect, useMemo, useRef, useState } from 'react'
import { usePan } from '@renderblocks/scene/usePan'
import { Page } from './Page'
import { layoutOf, type PageDef } from './model'

/** Each stretch of the path in its own colour, from its first page on. */
const STAGE_COLOURS: Record<string, string> = {
  Numbers: '#f97316',
  Letters: '#0ea5e9',
  'Small letters': '#6366f1',
  'Bigger numbers': '#ef4444',
  Words: '#10b981',
  Sums: '#a855f7',
  'Other things': '#eab308',
  'My own': '#64748b',
}
const colourOf = (stage: string) => STAGE_COLOURS[stage] ?? '#64748b'

/** One window: its page's boxes with their examples, on a little chalkboard. */
function Thumb({ def }: { def: PageDef }) {
  const lay = useMemo(() => layoutOf(def.items, def.perRow), [def])
  return <Page lay={lay} ink={[]} className="w-full h-full" />
}

interface Hung {
  i: number
  def: PageDef
  ax: number
  ay: number
  x: number
  y: number
  w: number
  h: number
  above: boolean
}

/** The same road as Sneeze's, Symbols' and the Story of Numbers': windows hung in turn above and below a winding line. */
function layout(defs: PageDef[], vw: number, vh: number) {
  const h = Math.round(Math.min(vh * 0.25, 200))
  const w = Math.round((h * 16) / 9)
  const step = w * 0.62
  const mid = vh * 0.52
  const amp = vh * 0.045
  const period = step * 4.6
  const roadY = (x: number) => mid + amp * Math.sin((x / period) * Math.PI * 2)
  const thread = Math.max(16, vh * 0.04)
  const start = Math.max(vw * 0.5, 400)
  const hung: Hung[] = defs.map((def, i) => {
    const ax = start + i * step
    const ay = roadY(ax)
    const above = i % 2 === 0
    return { i, def, ax, ay, x: ax - w / 2, y: above ? ay - thread - h : ay + thread, w, h, above }
  })
  const width = start + (defs.length - 1) * step + w + vw * 0.4
  return { hung, width, roadY, titleW: Math.max(160, start - w / 2 - 64) }
}

/**
 * Scribble's path (Lan, Nov 13: a path explorer, as in the other recent apps):
 * every page a window on one road, in order, one box first; each stretch
 * (Numbers, Letters … Other things) is its own colour. A tap on a window
 * opens that page. Every page is open from the start; a star marks the ones
 * he has finished, and the one he is on glows.
 */
export function Path({ defs, done, at, onOpen, onExit, right }: { defs: PageDef[]; /** How many times each page has been finished. */ done: Record<number, number>; at: number; onOpen: (i: number) => void; onExit: () => void; right: React.ReactNode }) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const { hung, width, roadY, titleW } = useMemo(() => layout(defs, size.w, size.h), [defs, size])
  const { track, cam, seen, place, handlers } = usePan({
    width,
    viewW: size.w,
    onTap: (target) => {
      const i = target.closest('[data-window]')?.getAttribute('data-window')
      if (i != null) onOpen(Number(i))
    },
  })
  // Opening: straight to where he is.
  const placedOnce = useRef(false)
  useEffect(() => {
    if (placedOnce.current) return place(cam.current)
    placedOnce.current = true
    const p = hung[at]
    place(p && at > 0 ? p.ax - size.w / 2 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hung])

  // The road, each stretch in its colour, from halfway between its first window and the one before.
  const stretches = useMemo(() => {
    const starts = hung.filter((p, i) => i === 0 || hung[i - 1].def.stage !== p.def.stage)
    return starts.map((p, k) => {
      const x = k === 0 ? 0 : (hung[p.i - 1].ax + p.ax) / 2
      const next = starts[k + 1]
      const to = next ? (hung[next.i - 1].ax + next.ax) / 2 : width
      let d = ''
      for (let q = x; q <= to + 1; q += 24) d += `${d ? 'L' : 'M'}${q.toFixed(0)} ${roadY(Math.min(q, to)).toFixed(1)}`
      return { name: p.def.stage, colour: colourOf(p.def.stage), x, d }
    })
  }, [hung, width, roadY])

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none touch-none bg-gradient-to-b from-slate-200 to-slate-100 text-slate-900" {...handlers}>
      <style>{`@keyframes scribble-glow { 0%, 100% { box-shadow: 0 0 0 4px #facc15, 0 0 18px 4px #facc1588 } 50% { box-shadow: 0 0 0 4px #facc15, 0 0 34px 12px #facc15aa } }`}</style>
      <div ref={track} className="absolute left-0 top-0 h-full" style={{ width }}>
        <svg width={width} height={size.h} className="absolute left-0 top-0 pointer-events-none" aria-hidden="true">
          {stretches.map((s) => (
            <path key={s.name} d={s.d} fill="none" stroke={s.colour} strokeWidth={14} strokeLinecap="round" />
          ))}
          {stretches.map((s) => (
            <path key={`${s.name}-line`} d={s.d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="10 12" />
          ))}
        </svg>
        <div className="absolute flex items-end" style={{ left: 32, top: 0, height: size.h * 0.42, width: titleW }}>
          <div className="font-black text-slate-700" style={{ fontSize: 'clamp(28px, min(7dvh, 8vw), 60px)', lineHeight: 1.05 }}>
            Scribble ✏️
          </div>
        </div>
        {stretches.map((s, i) => (
          <div
            key={`stage-${s.name}`}
            data-stage={s.name}
            className="absolute z-[1] rounded-full px-3 py-0.5 whitespace-nowrap pointer-events-none text-white font-black text-base shadow"
            style={{ left: i === 0 ? 32 : s.x, transform: i === 0 ? 'translateY(-50%)' : 'translate(-50%, -50%)', top: roadY(i === 0 ? 32 : s.x), background: s.colour }}
          >
            {s.name}
          </div>
        ))}
        {hung.map((p) => {
          const colour = colourOf(p.def.stage)
          const starred = (done[p.i] ?? 0) > 0
          const glow = at === p.i
          // Only the windows near the screen draw their boxes (there are dozens).
          const near = p.x + p.w > seen.from - 200 && p.x < seen.to + 200
          return (
            <div key={p.i}>
              <div className="absolute bg-slate-500/40" style={{ left: p.ax - 1, top: p.above ? p.y + p.h : p.ay, width: 2, height: Math.abs(p.ay - (p.above ? p.y + p.h : p.y)) }} />
              <button
                type="button"
                data-window={p.i}
                aria-label={`${p.i + 1}: ${p.def.items.join(' ')}${starred ? ', done' : ''}`}
                className="absolute rounded-2xl bg-[#27323A] p-1.5"
                style={{ left: p.x, top: p.y, width: p.w, height: p.h, border: `4px solid ${colour}`, boxShadow: glow ? undefined : '0 4px 14px rgba(15,23,42,0.25)', animation: glow ? 'scribble-glow 1.6s ease-in-out infinite' : undefined }}
              >
                <div className="w-full h-full pointer-events-none">{near && <Thumb def={p.def} />}</div>
                {starred && <span className="absolute -top-4 -right-3 text-3xl pointer-events-none">⭐</span>}
              </button>
              <div className="absolute text-center whitespace-nowrap pointer-events-none font-black text-lg text-slate-700" style={{ left: p.x - 30, width: p.w + 60, top: p.above ? p.y - 32 : p.y + p.h + 6 }}>
                <span className="inline-flex items-center justify-center min-w-7 h-7 px-1 rounded-full text-white text-base tabular-nums" style={{ background: colour }}>
                  {p.i + 1}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={onExit} onPointerDown={(e) => e.stopPropagation()} className="absolute top-3 left-3 w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Home">
        ←
      </button>
      <div className="absolute top-3 right-3 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
        {right}
      </div>
    </div>
  )
}
