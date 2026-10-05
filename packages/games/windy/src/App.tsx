import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { bounds, drawBody, drawFeatures } from '@renderblocks/designer/draw'
import { fmt } from '@renderblocks/designer/shapes'
import { fromShared, STANDARD, type Character } from './characters'
import { initPhysics, STEP, Town, type Rider } from './sim'
import { blowLeaves, drawLeaves, drawSkyline, drawTown, type Leaf } from './scene'
import { blowing, silence, thud, wake, whoosh } from './sound'

const MAX_CAST = 8

/** A character drawn to fit a box (lineup cards). */
function Portrait({ c }: { c: Character }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = el.clientWidth
    const h = el.clientHeight
    el.width = Math.round(w * dpr)
    el.height = Math.round(h * dpr)
    const b = bounds(c.shape)
    const scale = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * 0.95
    g.setTransform(scale * dpr, 0, 0, -scale * dpr, (w / 2 - ((b.x0 + b.x1) / 2) * scale) * dpr, (h / 2 + ((b.y0 + b.y1) / 2) * scale) * dpr)
    drawBody(g, c.n, c.shape, c.leftovers, scale)
    drawFeatures(g, c.n, c.shape, c.leftovers, c.look)
  }, [c])
  return <canvas ref={ref} className="w-full h-full" />
}

/**
 * Windy (Lan, Oct 4: like Axel Domino's videos): line up characters, then
 * the town takes over — wind, buildings, ramps, awnings, seesaws — and a
 * finger can grab and fling anyone. Nobody is steered.
 */
function App({ services }: GameProps) {
  const mine = useMemo(() => fromShared(services.shared.get('designs')), [services])
  const all = useMemo(() => [...mine, ...STANDARD], [mine])
  const [cast, setCast] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(services.storage.get('lineup') ?? '[]') as string[]
      return Array.isArray(saved) && saved.length ? saved : ['std-1', 'std-4', 'std-7', 'std-9', 'std-10']
    } catch {
      return ['std-1', 'std-4', 'std-7', 'std-9', 'std-10']
    }
  })
  const [playing, setPlaying] = useState(false)
  useEffect(() => services.storage.set('lineup', JSON.stringify(cast)), [services, cast])

  const chosen = cast.map((k) => all.find((c) => c.key === k)).filter((c): c is Character => !!c)

  if (playing) return <Play cast={chosen} onLineup={() => setPlaying(false)} onHome={services.exitToHome} />

  const toggle = (k: string) => setCast((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length < MAX_CAST ? [...c, k] : c))
  const card = (c: Character) => {
    const on = cast.includes(c.key)
    return (
      <button key={c.key} type="button" onClick={() => toggle(c.key)} className={`h-32 rounded-2xl shadow p-2 flex flex-col items-center transition-colors ${on ? 'bg-sky-500 text-white' : 'bg-white text-slate-600'}`}>
        <div className="flex-1 w-full min-h-0">
          <Portrait c={c} />
        </div>
        <span className="font-black tabular-nums text-lg truncate max-w-full">{fmt(c.n)}</span>
      </button>
    )
  }
  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-sky-200 to-sky-50 text-slate-900 select-none">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Home">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-700">Who goes?</div>
        <button
          type="button"
          disabled={!chosen.length}
          onClick={() => setPlaying(true)}
          className="h-14 px-7 rounded-2xl bg-emerald-500 text-white text-2xl font-black shadow disabled:opacity-30 active:scale-95 transition-transform"
        >
          Go! 🌬️
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 flex flex-col gap-4">
        {mine.length > 0 && (
          <section>
            <h2 className="font-black text-slate-600 text-lg px-1 pb-2">Mine (from Designer)</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">{mine.map(card)}</div>
          </section>
        )}
        <section>
          <h2 className="font-black text-slate-600 text-lg px-1 pb-2">Numberblocks</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">{STANDARD.map(card)}</div>
        </section>
      </div>
    </div>
  )
}

/** The town: everyone blown along, the camera following, a finger to fling with. */
function Play({ cast, onLineup, onHome }: { cast: Character[]; onLineup: () => void; onHome: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const townRef = useRef<Town | null>(null)
  const [board, setBoard] = useState<{ n: string; best: number }[]>([])

  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    let raf = 0
    let alive = true
    let town: Town | null = null
    let acc = 0
    let last = performance.now()
    let view = { scale: 10, ox: 0, oy: 0 }
    let cam = { x: 0, w: 40, top: 22 }
    const leaves: Leaf[] = []
    let lastBoard = 0
    let holder = -1
    // The camera follows the last character touched (until then, the pack); the edge arrows can be tapped to switch.
    let focus: Rider | null = null
    let arrows: { x0: number; y0: number; x1: number; y1: number; r: Rider }[] = []

    const toWorld = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: (e.clientX - r.left - view.ox) / view.scale, y: (view.oy - (e.clientY - r.top)) / view.scale }
    }
    const down = (e: PointerEvent) => {
      wake()
      if (!town || holder !== -1) return
      const box = el.getBoundingClientRect()
      const sx = e.clientX - box.left
      const sy = e.clientY - box.top
      const arrow = arrows.find((a) => sx >= a.x0 && sx <= a.x1 && sy >= a.y0 && sy <= a.y1)
      if (arrow) {
        focus = arrow.r
        return
      }
      const p = toWorld(e)
      const r = town.riderAt(p.x, p.y)
      if (r) {
        focus = r
        town.startGrab(r, p.x, p.y)
        holder = e.pointerId
        el.setPointerCapture?.(e.pointerId)
      }
    }
    const move = (e: PointerEvent) => {
      if (town && e.pointerId === holder) {
        const p = toWorld(e)
        town.moveGrab(p.x, p.y)
      }
    }
    const up = (e: PointerEvent) => {
      if (!town || e.pointerId !== holder) return
      holder = -1
      const r = town.endGrab()
      if (r && Math.hypot(r.rb.linvel().x, r.rb.linvel().y) > 8) whoosh(0.4)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    const frame = (now: number) => {
      if (!alive || !town) return
      acc = Math.min(0.1, acc + (now - last) / 1000)
      last = now
      while (acc >= STEP) {
        for (const s of town.step()) thud(s)
        acc -= STEP
      }
      const k = acc / STEP
      const pose = (r: Rider) => ({ x: r.prev.x + (r.cur.x - r.prev.x) * k, y: r.prev.y + (r.cur.y - r.prev.y) * k, a: r.prev.a + (r.cur.a - r.prev.a) * k })
      const poses = town.riders.map(pose)

      // Camera: everyone in view while they're close; otherwise follow the leaders.
      const w = el.clientWidth
      const h = el.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      const xs = poses.map((p) => p.x)
      const lo = Math.min(...xs)
      const hi = Math.max(...xs)
      const spread = hi - lo
      // Everyone in view while they're close; otherwise the middle of the pack (runaways get an arrow).
      const sorted = [...xs].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      const fi = focus ? town.riders.indexOf(focus) : -1
      const fp = fi >= 0 ? poses[fi] : null
      const wantW = fp ? 50 : Math.min(90, Math.max(40, spread + 24))
      const wantX = fp ? fp.x + 6 : spread + 24 <= 90 ? (lo + hi) / 2 + 4 : median + 8
      const wantTop = Math.max(22, (fp ? fp.y : Math.max(...poses.map((p) => p.y))) + 12)
      cam = { x: cam.x + (wantX - cam.x) * 0.08, w: cam.w + (wantW - cam.w) * 0.05, top: cam.top + (wantTop - cam.top) * 0.05 }
      const bottom = -3
      const scale = Math.min(w / cam.w, h / (cam.top - bottom))
      const ox = w / 2 - cam.x * scale
      const oy = h + bottom * scale
      view = { scale, ox, oy }
      ;(window as unknown as { __windyView?: typeof view }).__windyView = view
      const x0 = (0 - ox) / scale
      const x1 = (w - ox) / scale

      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#7DD3FC')
      sky.addColorStop(1, '#E0F2FE')
      g.fillStyle = sky
      g.fillRect(0, 0, w, h)
      g.setTransform(scale * dpr, 0, 0, -scale * dpr, ox * dpr, oy * dpr)
      drawSkyline(g, x0, x1)
      drawTown(g, town, x0, x1, scale)
      blowLeaves(leaves, town, x0, x1, cam.top, 1 / 60)
      drawLeaves(g, leaves, town)
      town.riders.forEach((r, i) => {
        const p = poses[i]
        const s = r.geo.scale
        g.save()
        g.translate(p.x, p.y)
        g.rotate(p.a)
        g.scale(s, s)
        drawBody(g, r.c.n, r.c.shape, r.c.leftovers, scale * s)
        drawFeatures(g, r.c.n, r.c.shape, r.c.leftovers, r.c.look)
        g.restore()
      })
      // Anyone off the left edge: an arrow with their number.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.font = '900 16px Nunito, system-ui, sans-serif'
      g.textAlign = 'left'
      // Anyone off either edge: an arrow with their number, spaced out so labels never overlap (tap one to follow them).
      arrows = []
      g.font = '900 22px Nunito, system-ui, sans-serif'
      for (const side of [-1, 1]) {
        const off = town.riders
          .map((r, i) => ({ r, sy: Math.max(240, Math.min(h - 130, oy - poses[i].y * scale)), x: poses[i].x }))
          .filter((m) => (side < 0 ? m.x < x0 - 1 : m.x > x1 + 1))
          .sort((a, b) => a.sy - b.sy)
        off.forEach((m, i) => {
          if (i > 0) m.sy = Math.max(m.sy, off[i - 1].sy + 40)
          const label = side < 0 ? `◀ ${fmt(m.r.c.n)}` : `${fmt(m.r.c.n)} ▶`
          const tw = g.measureText(label).width + 20
          const bx = side < 0 ? 4 : w - 4 - tw
          g.fillStyle = 'rgba(255,255,255,0.8)'
          g.beginPath()
          g.roundRect(bx, m.sy - 26, tw, 36, 12)
          g.fill()
          g.fillStyle = '#0F172A'
          g.textAlign = 'left'
          g.fillText(label, bx + 10, m.sy)
          arrows.push({ x0: bx, y0: m.sy - 26, x1: bx + tw, y1: m.sy + 10, r: m.r })
        })
      }
      blowing(town.windAt(cam.x))
      if (now - lastBoard > 250) {
        lastBoard = now
        setBoard(town.riders.map((r) => ({ n: fmt(r.c.n), best: Math.max(0, Math.floor(r.best)) })).sort((a, b) => b.best - a.best))
      }
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      town = new Town(cast)
      townRef.current = town
      const xs = town.riders.map((r) => r.cur.x)
      cam = { x: (Math.min(...xs) + Math.max(...xs)) / 2 + 4, w: 40, top: 22 }
      last = performance.now()
      raf = requestAnimationFrame(frame)
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      silence()
      townRef.current = null
      ;(window as unknown as { __windy?: unknown }).__windy = undefined
    }
  }, [cast])

  // For a test harness to read.
  useEffect(() => {
    ;(window as unknown as { __windy?: () => Town | null }).__windy = () => townRef.current
  }, [])

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none bg-sky-200">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full touch-none" />
      <div className="absolute top-3 left-3 flex gap-2">
        <button type="button" onClick={onHome} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Home">
          ←
        </button>
        <button type="button" onClick={onLineup} className="h-12 px-4 rounded-full bg-white/90 shadow text-lg font-black" aria-label="Change the lineup">
          👥
        </button>
      </div>
      {/* How far each has gone, in blocks: the leader first. */}
      <div className="absolute top-3 right-3 bg-white/85 rounded-2xl shadow px-3 py-2 flex flex-col gap-0.5 pointer-events-none">
        {board.map((b, i) => (
          <div key={`${b.n}-${i}`} className="flex items-center gap-2 font-black tabular-nums text-slate-700">
            <span className="w-5 text-center">{i === 0 ? '👑' : ''}</span>
            <span className="text-lg">{b.n}</span>
            <span className="text-sm text-slate-500">{b.best} blocks</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation()
          wake()
          townRef.current?.gust()
          whoosh(0.6)
        }}
        className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-white/90 shadow-lg text-5xl active:scale-95 transition-transform"
        aria-label="Gust of wind"
      >
        🌬️
      </button>
    </div>
  )
}

export default App
