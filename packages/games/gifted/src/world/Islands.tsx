/**
 * Gifted's home: three islands in a sea, one for each part of the real
 * tests, joined by bridges, with Mixed practice on a raft where it starts.
 * Each puzzle type is a window on its island showing a puzzle of its own
 * (its explainer's worked example, solved, where it has one). He drags or
 * flings the sea sideways; a tap on a window opens it. Types not yet in the
 * mix are faint (still open to try); the newest glows; the top level earns
 * a star.
 */
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { rng, usePan } from '@renderblocks/scene'
import type { Progress } from '../adaptive'
import { EXPLAINERS, posterT } from '../explain'
import { MAX_LEVEL, generate } from '../generators'
import { SUBTEST_NAME, SUBTESTS, type SubtestId } from '../types'
import { ISLANDS } from './islands'
import { Sample } from './Sample'

export type Target = SubtestId | 'mixed'

interface Placed {
  id: Target
  x: number
  y: number
}
interface IslandBox {
  i: number
  x: number
  y: number
  w: number
  h: number
}

function layout(vw: number, vh: number) {
  const wh = Math.round(Math.min(160, Math.max(78, vh * 0.19)))
  const ww = Math.round((wh * 16) / 9)
  const gapX = Math.round(ww * 0.2)
  const label = 46
  const gapY = Math.round(wh * 0.22)
  const padX = Math.round(ww * 0.4)
  const padTop = 64
  const padBottom = 34
  const sea = Math.round(ww * 0.75)
  const mid = vh * 0.5
  const windows: Placed[] = []
  const islands: IslandBox[] = []
  // The raft, after the title.
  let x = Math.max(32, vw * 0.06) + 20
  windows.push({ id: 'mixed', x, y: mid - wh / 2 })
  const raft = { x: x - 22, y: mid + wh / 2 + label - 6, w: ww + 44 }
  x += ww + sea
  ISLANDS.forEach((isl, i) => {
    const cols = Math.ceil(isl.subs.length / 2)
    const innerW = cols * ww + (cols - 1) * gapX
    const innerH = 2 * (wh + label) + gapY
    const w = innerW + padX * 2
    const h = innerH + padTop + padBottom
    const y = mid - h / 2 + (i % 2 ? 1 : -1) * vh * 0.025
    islands.push({ i, x, y, w, h })
    isl.subs.forEach((sub, k) => {
      const r = k < cols ? 0 : 1
      const inRow = r === 0 ? Math.min(cols, isl.subs.length) : isl.subs.length - cols
      const c = r === 0 ? k : k - cols
      const rowW = inRow * ww + (inRow - 1) * gapX
      windows.push({ id: sub, x: x + (w - rowW) / 2 + c * (ww + gapX), y: y + padTop + r * (wh + label + gapY) })
    })
    x += w + sea
  })
  return { ww, wh, windows, islands, raft, width: x - sea + Math.max(80, vw * 0.1), mid }
}

/** A soft, wavy island outline round a box (seeded, so it never changes). */
function blob(b: { x: number; y: number; w: number; h: number }, grow: number, seed: number) {
  const r = rng(seed)
  const pts: [number, number][] = []
  const x0 = b.x - grow
  const y0 = b.y - grow
  const w = b.w + grow * 2
  const h = b.h + grow * 2
  const R = Math.min(w, h) * 0.32
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const N = 48
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2
    // A rounded rectangle in polar form (superellipse), then a little wobble.
    const c = Math.cos(a)
    const s = Math.sin(a)
    const n = 4
    const px = cx + Math.sign(c) * Math.abs(c) ** (2 / n) * (w / 2)
    const py = cy + Math.sign(s) * Math.abs(s) ** (2 / n) * (h / 2)
    const wob = (r() - 0.5) * R * 0.18
    const dx = px - cx
    const dy = py - cy
    const d = Math.hypot(dx, dy) || 1
    pts.push([px + (dx / d) * wob, py + (dy / d) * wob])
  }
  const m = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M ${m(pts[N - 1], pts[0]).join(' ')}`
  for (let k = 0; k < N; k++) d += ` Q ${pts[k].join(' ')} ${m(pts[k], pts[(k + 1) % N]).join(' ')}`
  return d + ' Z'
}

const Sea = memo(function Sea({ width, height, islands, dark }: { width: number; height: number; islands: IslandBox[]; dark: boolean }) {
  const r = rng(7)
  const waves = Array.from({ length: Math.round(width / 70) }, () => ({ x: r() * width, y: r() * height, s: 0.6 + r() * 0.8 }))
  const sand = dark ? '#7c6a48' : '#f1dfae'
  const grass = dark ? '#2f4f3a' : '#b5dc93'
  const shallow = dark ? '#123552' : '#c9ecf5'
  return (
    <svg width={width} height={height} className="absolute left-0 top-0 pointer-events-none" aria-hidden="true">
      {waves.map((w, k) => (
        <path key={k} d={`M ${w.x} ${w.y} q ${12 * w.s} ${-8 * w.s} ${24 * w.s} 0 q ${12 * w.s} ${8 * w.s} ${24 * w.s} 0`} fill="none" stroke={dark ? '#1e4a6e' : '#ffffff'} strokeOpacity={dark ? 0.7 : 0.55} strokeWidth={3} strokeLinecap="round" />
      ))}
      {/* Bridges, from each island to the next. */}
      {islands.slice(1).map((b, k) => {
        const a = islands[k]
        const y = (a.y + a.h / 2 + b.y + b.h / 2) / 2
        const x0 = a.x + a.w - 10
        const x1 = b.x + 10
        const planks = Math.max(3, Math.round((x1 - x0) / 22))
        return (
          <g key={k}>
            <rect x={x0} y={y - 22} width={x1 - x0} height={44} fill={dark ? '#5b4630' : '#b07d4f'} rx={6} />
            {Array.from({ length: planks }, (_, j) => (
              <line key={j} x1={x0 + ((j + 0.5) * (x1 - x0)) / planks} y1={y - 22} x2={x0 + ((j + 0.5) * (x1 - x0)) / planks} y2={y + 22} stroke={dark ? '#3d2e1f' : '#8a5f39'} strokeWidth={3} />
            ))}
            <line x1={x0} y1={y - 24} x2={x1} y2={y - 24} stroke={dark ? '#3d2e1f' : '#7a5232'} strokeWidth={5} />
            <line x1={x0} y1={y + 24} x2={x1} y2={y + 24} stroke={dark ? '#3d2e1f' : '#7a5232'} strokeWidth={5} />
          </g>
        )
      })}
      {islands.map((b) => (
        <g key={b.i}>
          <path d={blob(b, 30, b.i + 11)} fill={shallow} />
          <path d={blob(b, 10, b.i + 11)} fill={sand} />
          <path d={blob(b, -14, b.i + 11)} fill={grass} />
        </g>
      ))}
    </svg>
  )
})

export interface IslandsHandle {
  rectOf: (id: Target) => DOMRect | null
  glideTo: (id: Target) => void
}

interface Props {
  progress: Progress
  dark: boolean
  /** The window to glow (the newest type), or null. */
  next: Target | null
  covered: boolean
  onOpen: (id: Target) => void
  /** Things that stay put in the corner (the score, the light switch). */
  corner: React.ReactNode
}

export const Islands = forwardRef<IslandsHandle, Props>(function Islands({ progress, dark, next, covered, onOpen, corner }, ref) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const L = useMemo(() => layout(size.w, size.h), [size])
  // One puzzle of each type to show in its window (made once).
  const samples = useMemo(() => Object.fromEntries(SUBTESTS.map((s) => [s, generate(s, 1)])), [])

  const { track, cam, seen, place, glide, stop, handlers } = usePan({
    width: L.width,
    viewW: size.w,
    disabled: covered,
    onTap: (target) => {
      const id = target.closest('[data-window]')?.getAttribute('data-window') as Target | null
      if (id) onOpen(id)
    },
  })
  const centreOf = (id: Target) => {
    const w = L.windows.find((q) => q.id === id)
    return w ? w.x + L.ww / 2 - size.w / 2 : cam.current
  }
  // Opening: straight to what's next.
  useEffect(() => {
    place(next ? centreOf(next) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L])

  useImperativeHandle(ref, () => ({
    rectOf: (id) => {
      stop()
      const w = L.windows.find((q) => q.id === id)
      if (!w) return null
      if (w.x - cam.current < 0 || w.x + L.ww - cam.current > size.w) place(centreOf(id))
      return new DOMRect(w.x - cam.current, w.y, L.ww, L.wh)
    },
    glideTo: (id) => glide(centreOf(id)),
  }))

  const ink = dark ? 'text-slate-100' : 'text-slate-700'
  return (
    <div
      className="h-dvh w-full relative overflow-hidden select-none touch-none"
      style={{ background: dark ? 'linear-gradient(#0c2740, #08182a)' : 'linear-gradient(#a8daf0, #8ccbe6)' }}
      {...handlers}
    >
      <style>{`@keyframes gifted-glow { 0%, 100% { box-shadow: 0 0 0 4px #a78bfa, 0 0 16px 4px #a78bfa88 } 50% { box-shadow: 0 0 0 4px #a78bfa, 0 0 32px 12px #a78bfaaa } }`}</style>
      <div ref={track} className="absolute left-0 top-0 h-full" style={{ width: L.width }}>
        <Sea width={L.width} height={size.h} islands={L.islands} dark={dark} />
        {/* The title, above the raft. */}
        <div className={`absolute font-extrabold ${ink}`} style={{ left: L.windows[0].x - 8, top: L.windows[0].y - 86, fontSize: 40 }}>
          Gifted
        </div>
        {/* The raft under Mixed practice. */}
        <div className="absolute rounded-md" style={{ left: L.raft.x, top: L.raft.y, width: L.raft.w, height: 26, background: 'repeating-linear-gradient(90deg, #b07d4f 0 26px, #8a5f39 26px 29px)' }} />
        {/* Each island's sign. */}
        {L.islands.map((b) => (
          <div key={b.i} className="absolute rounded-full px-4 py-1 font-extrabold text-white whitespace-nowrap pointer-events-none" style={{ left: b.x + 18, top: b.y + 12, background: dark ? '#5b4630' : '#9a6a3f', fontSize: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
            {ISLANDS[b.i].icon} {ISLANDS[b.i].name}
          </div>
        ))}
        {L.windows.map((w) => {
          if (w.x + L.ww < seen.from || w.x > seen.to) return null
          const mixed = w.id === 'mixed'
          const sub = mixed ? null : (w.id as SubtestId)
          const lv = sub ? progress.levels[sub] : 0
          const open = mixed || progress.unlocked.includes(sub!)
          const scene = sub ? EXPLAINERS[sub] : undefined
          return (
            <div key={w.id} style={{ opacity: open ? 1 : 0.72 }}>
              <button
                type="button"
                data-window={w.id}
                aria-label={mixed ? 'Mixed practice' : SUBTEST_NAME[sub!]}
                className="absolute rounded-xl overflow-hidden"
                style={{
                  left: w.x,
                  top: w.y,
                  width: L.ww,
                  height: L.wh,
                  background: mixed ? '#8b5cf6' : '#f5f3ff',
                  outline: `3px solid ${mixed ? '#7c3aed' : dark ? '#334155' : '#ffffff'}`,
                  boxShadow: next === w.id ? undefined : '0 4px 14px rgba(15,40,60,0.25)',
                  animation: next === w.id ? 'gifted-glow 1.6s ease-in-out infinite' : undefined,
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  {mixed ? (
                    <div className="h-full flex flex-col items-center justify-center text-white">
                      <div style={{ fontSize: L.wh * 0.42 }}>🎲</div>
                      <div className="font-extrabold" style={{ fontSize: L.wh * 0.12 }}>
                        {progress.unlocked.length} of {SUBTESTS.length}
                      </div>
                    </div>
                  ) : scene ? (
                    <scene.Scene t={posterT(scene)} />
                  ) : (
                    <Sample item={samples[sub!]} />
                  )}
                </div>
                {lv >= MAX_LEVEL && (
                  <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm pointer-events-none bg-amber-300" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    ⭐
                  </div>
                )}
              </button>
              {/* Its name and level, under it. */}
              <div className="absolute text-center pointer-events-none" style={{ left: w.x - 16, width: L.ww + 32, top: w.y + L.wh + 6 }}>
                <div className={`font-extrabold leading-tight whitespace-nowrap ${ink}`} style={{ fontSize: 16 }}>
                  {mixed ? 'Mixed practice' : SUBTEST_NAME[sub!]}
                </div>
                {sub && (
                  <div className="flex gap-1 justify-center mt-1">
                    {Array.from({ length: MAX_LEVEL }, (_, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${i < lv ? 'bg-violet-500' : dark ? 'bg-slate-600' : 'bg-white/70'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
        {corner}
      </div>
    </div>
  )
})
