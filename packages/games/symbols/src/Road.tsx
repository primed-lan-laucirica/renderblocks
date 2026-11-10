/**
 * Home: the symbol road. Every rank of the learning path in order along one
 * road, each a window showing its sign; each stage's stretch is its own
 * colour and ends at its Bench. A tap on a window picks it and draws thin
 * gold threads back to the signs it is built from; a second tap goes in.
 * A picked window also offers its deep dive, a lecture for whoever wants more.
 * Ranks that have no explainer yet are there, faint, so the whole road can
 * be seen (and their threads followed), but they don't open.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { usePan } from '@renderblocks/scene/usePan'
import { BenchCover, Cover } from './Cover'
import { divesOf } from './data/dives'
import { RANKS, STAGES, stageColour } from './data/path'
import { GOLD, INK, PAPER, SANS, SERIF, SOFT } from './kit/look'

export type Stop = { kind: 'rank'; id: string; rank: number; stage: number } | { kind: 'bench'; id: string; stage: number }

interface Placed {
  stop: Stop
  /** Where it hangs from the road. */
  ax: number
  ay: number
  x: number
  y: number
  w: number
  h: number
  above: boolean
}

/** Along the road: each stage's ranks, then its Bench (if it has one yet). */
export const stops = (benches: number[]): Stop[] =>
  STAGES.flatMap((s) => [
    ...s.ranks.map((rank) => ({ kind: 'rank', id: `r${rank}`, rank, stage: s.n }) as Stop),
    ...(benches.includes(s.n) ? [{ kind: 'bench', id: `bench${s.n}`, stage: s.n } as Stop] : []),
  ])

function layout(list: Stop[], vw: number, vh: number) {
  const wh = Math.round(Math.min(vh * 0.25, 210))
  const ww = Math.round((wh * 16) / 9)
  const step = ww * 0.62
  const mid = vh * 0.52
  const amp = vh * 0.045
  const period = step * 4.6
  const roadY = (x: number) => mid + amp * Math.sin((x / period) * Math.PI * 2)
  const thread = Math.max(16, vh * 0.04)
  const start = Math.max(vw * 0.5, 400)
  const placed: Placed[] = []
  let x = start
  list.forEach((stop, i) => {
    const big = stop.kind === 'bench'
    if (i > 0) x += big || list[i - 1].kind === 'bench' ? step * 1.3 : step
    const h = big ? Math.round(wh * 1.15) : wh
    const w = Math.round((h * 16) / 9)
    const ay = roadY(x)
    const above = i % 2 === 0
    placed.push({ stop, ax: x, ay, x: x - w / 2, y: above ? ay - thread - h : ay + thread, w, h, above })
  })
  const width = x + ww + vw * 0.4
  return { placed, width, roadY, titleW: Math.max(160, start - ww / 2 - 64) }
}

/** The height of the deep dive's button. */
const DIVE_H = 36

export interface RoadHandle {
  /** The window's rectangle on screen (after bringing it into view at once). */
  rectOf: (id: string) => DOMRect | null
  /** Glide along the road until this stop is in the middle, and pick it. */
  glideTo: (id: string) => void
}

interface Props {
  /** Ranks that have an explainer. */
  built: Set<number>
  /** Stages that have a Bench. */
  benches: number[]
  watched: Set<number>
  stars: number[]
  /** The stop to glow (what comes next). */
  next: string | null
  /** Hidden behind an explainer or the Bench: it stops listening. */
  covered: boolean
  onOpen: (stop: Stop) => void
  /** The picked sign's deep dive was asked for. */
  onDive: (rank: number) => void
  onExit: () => void
}

export const Road = forwardRef<RoadHandle, Props>(function Road({ built, benches, watched, stars, next, covered, onOpen, onDive, onExit }, ref) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const list = useMemo(() => stops(benches), [benches])
  const { placed, width, roadY, titleW } = useMemo(() => layout(list, size.w, size.h), [list, size])
  const find = (id: string | null) => placed.find((q) => q.stop.id === id)

  // What is picked: its threads are drawn, and another tap on it goes in. What's next starts picked.
  const [picked, setPicked] = useState<string | null>(next)
  useEffect(() => setPicked(next), [next])

  const { track, cam, seen, place, glide, stop, handlers } = usePan({
    width,
    viewW: size.w,
    disabled: covered,
    onTap: (target) => {
      const dive = target.closest('[data-dive]')?.getAttribute('data-dive')
      if (dive) return onDive(Number(dive))
      const hit = find(target.closest('[data-stop]')?.getAttribute('data-stop') ?? null)
      if (!hit) return setPicked(null)
      const s = hit.stop
      const opens = s.kind === 'bench' || built.has(s.rank)
      // The Bench has no threads to show, so it opens at once.
      if (opens && (s.kind === 'bench' || picked === s.id)) return onOpen(s)
      setPicked(s.id)
    },
  })
  const centreOf = (id: string) => {
    const p = find(id)
    return p ? p.ax - size.w / 2 : cam.current
  }
  // Opening: straight to what's next.
  const placedOnce = useRef(false)
  useEffect(() => {
    if (placedOnce.current) return place(cam.current)
    placedOnce.current = true
    place(next && next !== list[0]?.id ? centreOf(next) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  useImperativeHandle(ref, () => ({
    rectOf: (id) => {
      stop()
      const p = find(id)
      if (!p) return null
      if (p.x - cam.current < 0 || p.x + p.w - cam.current > size.w) place(centreOf(id))
      return new DOMRect(p.x - cam.current, p.y, p.w, p.h)
    },
    glideTo: (id) => glide(centreOf(id)),
  }))

  // The road itself, each stage's stretch in its colour.
  const stretches = useMemo(() => {
    const starts = placed.flatMap((p, i) => (i === 0 || p.stop.stage !== placed[i - 1].stop.stage ? [{ stage: p.stop.stage, x: i === 0 ? 0 : (placed[i - 1].ax + p.ax) / 2 }] : []))
    return starts.map((s, i) => {
      const to = starts[i + 1]?.x ?? width
      let d = ''
      for (let x = s.x; x <= to + 1; x += 24) d += `${d ? 'L' : 'M'}${x.toFixed(0)} ${roadY(Math.min(x, to)).toFixed(1)}`
      return { ...s, d }
    })
  }, [placed, width, roadY])

  const sel = find(picked)
  const deps = sel?.stop.kind === 'rank' ? RANKS[sel.stop.rank - 1].dependsOn.map((n) => find(`r${n}`)).filter((p): p is Placed => !!p) : []
  const isDep = (p: Placed) => deps.includes(p)

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none touch-none" style={{ background: `radial-gradient(ellipse at center, ${PAPER} 55%, #e2d5bc)` }} {...handlers}>
      <style>{`@keyframes sym-glow { 0%, 100% { box-shadow: 0 0 0 4px ${GOLD}, 0 0 18px 4px ${GOLD}88 } 50% { box-shadow: 0 0 0 4px ${GOLD}, 0 0 34px 12px ${GOLD}aa } }`}</style>
      <div ref={track} className="absolute left-0 top-0 h-full" style={{ width }}>
        <svg width={width} height={size.h} className="absolute left-0 top-0 pointer-events-none" aria-hidden="true">
          {stretches.map((s) => (
            <path key={s.stage} d={s.d} fill="none" stroke={stageColour(s.stage)} strokeWidth={12} strokeLinecap="round" />
          ))}
        </svg>
        {/* The title, where the road begins. */}
        <div className="absolute flex items-end" style={{ left: 32, top: 0, height: size.h * 0.42, width: titleW }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, color: INK, fontSize: 'clamp(28px, min(7dvh, 8vw), 60px)', lineHeight: 1.05 }}>Symbols</div>
        </div>
        {/* Where each stage's stretch begins: its name, on the road. */}
        {stretches.map((s) => (
          <div
            key={`stage${s.stage}`}
            className="absolute -translate-y-1/2 z-[1] rounded-full px-3 py-0.5 whitespace-nowrap pointer-events-none"
            style={{ left: s.stage === 1 ? 32 : s.x, transform: s.stage === 1 ? 'translateY(-50%)' : 'translate(-50%, -50%)', top: roadY(s.stage === 1 ? 32 : s.x), background: stageColour(s.stage), color: s.stage >= 3 && s.stage <= 5 ? INK : '#fff', fontFamily: SERIF, fontWeight: 700, fontSize: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
          >
            {s.stage} · {STAGES.find((q) => q.n === s.stage)?.name}
          </div>
        ))}
        {placed.map((p) => {
          if (p.x + p.w < seen.from || p.x > seen.to) return null
          const s = p.stop
          const colour = stageColour(s.stage)
          const open = s.kind === 'bench' || built.has(s.rank)
          const done = s.kind === 'rank' ? watched.has(s.rank) : stars.includes(s.stage)
          const glow = next === s.id
          const on = picked === s.id || isDep(p)
          const r = s.kind === 'rank' ? RANKS[s.rank - 1] : null
          return (
            <div key={s.id}>
              {/* The thread it hangs from. */}
              <div className="absolute" style={{ left: p.ax - 1, top: p.above ? p.y + p.h : p.ay, width: 2, height: Math.abs(p.ay - (p.above ? p.y + p.h : p.y)), background: '#b9a98f' }} />
              <button
                type="button"
                data-stop={s.id}
                data-open={open ? '' : undefined}
                aria-label={r ? `${r.rank}: ${r.name}${open ? '' : ' (not yet)'}` : `Stage ${s.stage} Bench`}
                className="absolute rounded-xl overflow-hidden"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.w,
                  height: p.h,
                  background: PAPER,
                  boxShadow: glow ? undefined : '0 4px 14px rgba(59,47,37,0.25)',
                  outline: on ? `4px solid ${GOLD}` : `${s.kind === 'bench' ? 5 : 2}px solid ${s.kind === 'bench' ? colour : '#b9a98f'}`,
                  animation: glow ? 'sym-glow 1.6s ease-in-out infinite' : undefined,
                }}
              >
                <div className="absolute inset-0 pointer-events-none">{r ? <Cover rank={r.rank} dim={!open} /> : <BenchCover />}</div>
                {done && (
                  <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black pointer-events-none" style={{ background: GOLD, color: INK, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {s.kind === 'bench' ? '⭐' : '✓'}
                  </div>
                )}
              </button>
              {/* Its number and name, on the side away from the road. */}
              <div className="absolute text-center whitespace-nowrap pointer-events-none" style={{ left: p.x - 30, width: p.w + 60, top: p.above ? p.y - 30 : p.y + p.h + 6, fontFamily: SANS, fontWeight: 700, fontSize: 17, color: open ? INK : SOFT, opacity: open ? 1 : 0.7 }}>
                {r && <span style={{ color: SOFT, marginRight: 8 }}>{r.rank}</span>}
                {r ? r.name : 'The Bench'}
              </div>
            </div>
          )
        })}
        {/* The picked sign's threads: back to each sign it is built from. */}
        {sel && deps.length > 0 && (
          <svg width={width} height={size.h} className="absolute left-0 top-0 pointer-events-none z-[2]" aria-hidden="true" data-threads={deps.length}>
            {deps.map((d) => {
              const a = { x: sel.x + sel.w / 2, y: sel.above ? sel.y : sel.y + sel.h }
              const b = { x: d.x + d.w / 2, y: sel.above ? d.y : d.y + d.h }
              // An arc over (or under) the windows between them.
              const far = Math.abs(a.x - b.x)
              const lift = Math.min(size.h * 0.2, 30 + far * 0.08)
              const up = sel.above ? -1 : 1
              const edge = sel.above ? Math.min(a.y, b.y) : Math.max(a.y, b.y)
              const cy = edge + up * lift
              return (
                <g key={d.stop.id}>
                  <path d={`M${a.x} ${a.y} C ${a.x} ${cy}, ${b.x} ${cy}, ${b.x} ${b.y}`} fill="none" stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" />
                  <circle cx={b.x} cy={b.y} r={6} fill={GOLD} />
                </g>
              )
            })}
          </svg>
        )}
        {/* The picked sign's deep dive, beyond its name. */}
        {sel?.stop.kind === 'rank' && divesOf(sel.stop.rank).length > 0 && (
          <div
            data-dive={sel.stop.rank}
            role="button"
            aria-label={`Deep dive: ${RANKS[sel.stop.rank - 1].name}`}
            className="absolute z-[3] -translate-x-1/2 rounded-full px-4 whitespace-nowrap flex items-center"
            style={{ left: sel.ax, top: sel.above ? Math.max(8, sel.y - 30 - DIVE_H - 6) : Math.min(size.h - DIVE_H - 8, sel.y + sel.h + 36), height: DIVE_H, background: PAPER, color: INK, border: `2px solid ${INK}`, fontFamily: SANS, fontWeight: 700, fontSize: 15, boxShadow: '0 2px 8px rgba(59,47,37,0.25)' }}
          >
            ▶ Deep dive
          </div>
        )}
      </div>
      <button type="button" onClick={onExit} onPointerDown={(e) => e.stopPropagation()} className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold opacity-40 active:opacity-80" style={{ color: INK }} aria-label="Home">
        ←
      </button>
    </div>
  )
})
