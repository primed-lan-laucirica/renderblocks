import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { bounds, drawBody, drawFeatures } from '@renderblocks/designer/draw'
import { fmt } from '@renderblocks/designer/shapes'
import { fromKey, fromShared, standard, type Character } from './characters'
import { ALL_SETS, defaultRange, lineupFor, rangeLabel, RANGES, type NumberRange, type SetId } from './sets'
import { GRAVITY, initPhysics, STEP, Town, type Rider } from './sim'
import { blowLeaves, drawLeaves, drawSkyline, drawTown, type Leaf } from './scene'
import { blowing, silence, thud, wake, whoosh } from './sound'

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
  // The lineup: keys in order, repeats allowed, no limit ("n-7" any number, "mine-14" his design).
  const [cast, setCast] = useState<string[]>(() => {
    try {
      // A first visit starts with a few; a cleared lineup stays cleared.
      const raw = services.storage.get('lineup')
      if (raw === null) return ['n-1', 'n-4', 'n-7', 'n-9', 'n-10']
      const saved = (JSON.parse(raw) as string[]).map((k) => k.replace(/^std-/, 'n-'))
      return Array.isArray(saved) ? saved : []
    } catch {
      return ['n-1', 'n-4', 'n-7', 'n-9', 'n-10']
    }
  })
  const [playing, setPlaying] = useState(false)
  const [keypad, setKeypad] = useState(false)
  // The wheels: which set and how far. The cards show exactly that.
  const [set, setSet] = useState<SetId>('integers')
  const [range, setRange] = useState<NumberRange>({ from: 1, to: 25 })
  const members = useMemo(() => lineupFor(set, range), [set, range])
  useEffect(() => services.storage.set('lineup', JSON.stringify(cast)), [services, cast])

  const chosen = useMemo(() => cast.map((k) => fromKey(k, mine)).filter((c): c is Character => !!c), [cast, mine])
  // A card for every number the wheels have picked (e.g. Odds 1–100: all fifty).
  const cards = useMemo(() => members.map((n) => standard(BigInt(n))), [members])
  const setName = ALL_SETS.find((x) => x.id === set)?.name ?? ''

  if (playing) return <Play cast={chosen} storage={services.storage} onLineup={() => setPlaying(false)} onHome={services.exitToHome} />

  const add = (...keys: string[]) => setCast((c) => [...c, ...keys])
  const count = (k: string) => cast.filter((x) => x === k).length
  const card = (c: Character) => (
    <button key={c.key} type="button" onClick={() => add(c.key)} className="relative h-32 rounded-2xl shadow p-2 flex flex-col items-center bg-white text-slate-600 active:scale-95 transition-transform">
      <div className="flex-1 w-full min-h-0">
        <Portrait c={c} />
      </div>
      <span className="font-black tabular-nums text-lg truncate max-w-full">{fmt(c.n)}</span>
      {count(c.key) > 0 && <span className="absolute top-1 right-1 min-w-7 h-7 px-1.5 rounded-full bg-sky-500 text-white text-sm font-black flex items-center justify-center">{count(c.key)}</span>}
    </button>
  )
  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-sky-200 to-sky-50 text-slate-900 select-none">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Home">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-700">Who goes?</div>
        <button type="button" disabled={!chosen.length} onClick={() => setPlaying(true)} className="h-14 px-7 rounded-2xl bg-emerald-500 text-white text-2xl font-black shadow disabled:opacity-30 active:scale-95 transition-transform shrink-0">
          Go! 🌬️
        </button>
      </div>
      {/* The lineup so far: tap one to take it out. */}
      <div className="mx-3 mb-2 p-2 rounded-2xl bg-white/70 shadow flex items-center gap-2">
        <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto">
          {cast.length === 0 && <span className="text-slate-400 font-bold px-2 py-1">Tap characters to line them up</span>}
          {cast.map((k, i) => (
            <button key={`${k}-${i}`} type="button" onClick={() => setCast((c) => c.filter((_, j) => j !== i))} className={`shrink-0 h-9 px-3 rounded-xl font-black tabular-nums ${k.startsWith('mine') ? 'bg-amber-200' : 'bg-sky-100'} text-slate-700`}>
              {fmt(BigInt(k.split('-')[1]))} ✕
            </button>
          ))}
        </div>
        <span className="shrink-0 font-black text-slate-500 tabular-nums">{cast.length}</span>
        <button type="button" onClick={() => setCast([])} className="shrink-0 h-9 px-3 rounded-xl bg-white shadow font-bold text-rose-600">
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 flex flex-col gap-4">
        <SetPicker set={set} range={range} numbers={members} onSet={setSet} onRange={setRange} onAdd={(ns) => add(...ns.map((n) => `n-${n}`))} />
        <div>
          <button type="button" onClick={() => setKeypad(true)} className="h-12 px-4 rounded-2xl bg-white shadow font-black text-sky-700 active:scale-95 transition-transform">
            + any number 🔢
          </button>
        </div>
        {mine.length > 0 && (
          <section>
            <h2 className="font-black text-slate-600 text-lg px-1 pb-2">Mine (from Designer)</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">{mine.map(card)}</div>
          </section>
        )}
        <section>
          <h2 className="font-black text-slate-600 text-lg px-1 pb-2">
            {setName} {rangeLabel(range)} <span className="text-slate-400 text-base">· {cards.length}</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">{cards.map(card)}</div>
        </section>
      </div>
      {keypad && (
        <Keypad
          onDone={(n) => {
            setKeypad(false)
            if (n) add(`n-${n}`)
          }}
        />
      )}
    </div>
  )
}

/**
 * LavaBlocks' sets in two sliding wheels — which set, and how far — and one
 * button to add them all. Compact: one row each, swiped sideways.
 */
function SetPicker({ set, range, numbers, onSet, onRange, onAdd }: { set: SetId; range: NumberRange; numbers: number[]; onSet: (s: SetId) => void; onRange: (r: NumberRange) => void; onAdd: (ns: number[]) => void }) {
  const preview = numbers.length <= 4 ? numbers.join(' ') : `${numbers.slice(0, 3).join(' ')} … ${numbers[numbers.length - 1].toLocaleString('en-US')}`
  const chip = (on: boolean) => `snap-center shrink-0 rounded-2xl shadow px-3 py-1.5 flex flex-col items-center transition-colors ${on ? 'bg-sky-500 text-white' : 'bg-white text-slate-600'}`
  return (
    <div className="rounded-3xl bg-white/60 shadow p-2 flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
        {ALL_SETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onSet(s.id)
              const d = defaultRange(s.id)
              if (d) onRange({ from: Math.max(1, d.from), to: d.to })
            }}
            className={chip(s.id === set)}
          >
            <span className="font-black tabular-nums whitespace-nowrap">{s.sample}</span>
            <span className="text-xs font-bold opacity-80 whitespace-nowrap">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
          {RANGES.map((r) => (
            <button key={`${r.from}-${r.to}`} type="button" onClick={() => onRange(r)} className={chip(r.from === range.from && r.to === range.to)}>
              <span className="font-black tabular-nums whitespace-nowrap">{rangeLabel(r)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!numbers.length}
          onClick={() => onAdd(numbers)}
          className="shrink-0 h-14 px-4 rounded-2xl bg-emerald-500 text-white font-black shadow disabled:opacity-30 active:scale-95 transition-transform flex flex-col items-center justify-center leading-tight"
        >
          <span className="text-lg">+ {numbers.length}</span>
          <span className="text-xs opacity-90 tabular-nums max-w-40 truncate">{preview}</span>
        </button>
      </div>
    </div>
  )
}

/** Type any number at all. */
function Keypad({ onDone }: { onDone: (n: string | null) => void }) {
  const [typed, setTyped] = useState('')
  const key = (k: string, cls = 'bg-white') => (
    <button
      key={k}
      type="button"
      onClick={() => (k === '⌫' ? setTyped((t) => t.slice(0, -1)) : k === '✓' ? onDone(typed && BigInt(typed) > 0n ? BigInt(typed).toString() : null) : setTyped((t) => (t === '0' ? k : t + k)))}
      className={`h-16 rounded-2xl shadow text-3xl font-black active:scale-95 transition-transform ${cls}`}
    >
      {k}
    </button>
  )
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => onDone(null)}>
      <div className="w-full max-w-sm bg-sky-50 rounded-3xl p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-16 px-3 py-2 rounded-2xl bg-white shadow font-black tabular-nums text-sky-700 text-3xl break-all text-center">{typed ? fmt(BigInt(typed)) : ' '}</div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => key(k))}
          {key('⌫')}
          {key('0')}
          {key('✓', 'bg-emerald-500 text-white')}
        </div>
      </div>
    </div>
  )
}

/** The town: everyone blown along, the camera following, a finger to fling with. */
function Play({ cast, storage, onLineup, onHome }: { cast: Character[]; storage: GameProps['services']['storage']; onLineup: () => void; onHome: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const townRef = useRef<Town | null>(null)
  // Wind on or off (off: they move only when flung), and gravity from a slider; both remembered.
  const [windOn, setWindOn] = useState(() => storage.get('wind') !== 'off')
  const [gravity, setGravity] = useState(() => {
    const g = Number(storage.get('gravity'))
    return Number.isFinite(g) && storage.get('gravity') !== null ? Math.max(0, Math.min(40, g)) : GRAVITY
  })
  useEffect(() => {
    storage.set('wind', windOn ? 'on' : 'off')
    townRef.current?.setWind(windOn)
  }, [storage, windOn])
  useEffect(() => {
    storage.set('gravity', String(gravity))
    townRef.current?.setGravity(gravity)
  }, [storage, gravity])
  // The town reads the settings when it starts (kept in a ref for the start-up code).
  const settings = useRef({ windOn, gravity })
  useEffect(() => {
    settings.current = { windOn, gravity }
  }, [windOn, gravity])
  const [board, setBoard] = useState<{ n: string; best: number; rank: number }[]>([])

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
          .map((r, i) => ({ r, sy: Math.max(240, Math.min(h - 200, oy - poses[i].y * scale)), x: poses[i].x }))
          .filter((m) => (side < 0 ? m.x < x0 - 1 : m.x > x1 + 1))
          // The nearest four (lots more would cover the screen); the rest are counted below them.
          .sort((a, b) => (side < 0 ? b.x - a.x : a.x - b.x))
        const more = Math.max(0, off.length - 4)
        off.splice(4)
        off.sort((a, b) => a.sy - b.sy)
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
        if (more && off.length) {
          g.fillStyle = 'rgba(15,23,42,0.6)'
          g.textAlign = side < 0 ? 'left' : 'right'
          g.fillText(`+${more}`, side < 0 ? 12 : w - 12, off[off.length - 1].sy + 40)
        }
      }
      blowing(town.windAt(cam.x))
      if (now - lastBoard > 250) {
        lastBoard = now
        // The top five, plus whoever the camera is following.
        const all = town.riders.map((r) => ({ n: fmt(r.c.n), best: Math.max(0, Math.floor(r.best)), r })).sort((a, b) => b.best - a.best)
        const top = all.slice(0, 5)
        const f = all.find((x) => x.r === focus)
        if (f && !top.includes(f)) top.push(f)
        setBoard(top.map(({ n, best }) => ({ n, best, rank: all.findIndex((x) => x.n === n && x.best === best) + 1 })))
      }
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      town = new Town(cast)
      town.setWind(settings.current.windOn)
      town.setGravity(settings.current.gravity)
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
            <span className="w-7 text-center text-sm text-slate-400">{b.rank === 1 ? '👑' : i === 5 ? `${b.rank}.` : ''}</span>
            <span className="text-lg">{b.n}</span>
            <span className="text-sm text-slate-500">{b.best} blocks</span>
          </div>
        ))}
      </div>
      {windOn && (
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
      )}
      {/* The wind, on or off; and gravity. */}
      <div className="absolute bottom-4 left-4 bg-white/85 rounded-2xl shadow px-3 py-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWindOn((w) => !w)}
          aria-label={windOn ? 'Turn the wind off' : 'Turn the wind on'}
          className={`h-12 px-3 rounded-xl font-black text-lg shadow ${windOn ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}
        >
          🌬️ {windOn ? 'On' : 'Off'}
        </button>
        <label className="flex items-center gap-2 font-black text-slate-600">
          <span className="text-xl" aria-hidden>
            🪶
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={gravity}
            onChange={(e) => setGravity(Number(e.target.value))}
            aria-label="Gravity"
            className="w-32 sm:w-44 h-10 accent-sky-500"
          />
          <span className="text-xl" aria-hidden>
            🪨
          </span>
          <span className="w-20 text-sm tabular-nums">gravity {gravity}</span>
        </label>
      </div>
    </div>
  )
}

export default App
