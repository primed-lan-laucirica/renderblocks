import { useEffect, useRef, useState } from 'react'
import type { GameProps, GameServices } from '@renderblocks/kernel'
import { drawAll, drawThing } from './brushes'
import { savePicture } from './files'
import {
  bounds,
  fillTarget,
  History,
  moved,
  newDrawing,
  newId,
  newSeed,
  PAPER,
  paperBase,
  scaled,
  SHAPES,
  topAt,
  TOOLS,
  union,
  WIDTHS,
  type Box,
  type Drawing,
  type Fill,
  type Page,
  type Shape,
  type ShapeKind,
  type Stroke,
  type Thing,
  type Tool,
  type View,
} from './model'
import { deleteDrawing, listDrawings, saveDrawing } from './store'
import { addDab, mixed, remember, type Dabs } from './mix'
import { COLOURS } from './palette'
import { Blob, Dish, Doodle, FillChip, ICONS, Knob, PaletteKnob, Recipe, ShapeChip, Supply, Width, type Holding, type Landing } from './supplies'

const NAMES: Record<Holding, string> = {
  brush: 'Paintbrush',
  pencil: 'Pencil',
  crayon: 'Crayon',
  marker: 'Marker',
  water: 'Watercolour',
  spray: 'Spray paint',
  highlighter: 'Highlighter',
  bucket: 'Paint pot',
  shape: 'Shapes',
  eraser: 'Eraser',
  hand: 'Move',
}
/** The tray, left to right: painting first, then the pot, shapes, eraser and hand. */
const TRAY: Holding[] = ['brush', 'pencil', 'crayon', 'marker', 'water', 'spray', 'highlighter', 'bucket', 'shape', 'eraser', 'hand']

interface Prefs {
  tool: Holding
  colour: string
  width: number
  shape: ShapeKind
  fill: Fill
  shapeFill: Fill | 'none'
  /** What's in the mixing dish. */
  cup: Dabs
  /** The mixing shelf is out. */
  mixer: boolean
  /** Colours he's mixed, newest first. */
  mine: string[]
}
const PREFS: Prefs = { tool: 'brush', colour: COLOURS[0], width: 1, shape: 'rect', fill: 'scribble', shapeFill: 'none', cup: [], mixer: false, mine: [] }
/** How many of his own colours the palette keeps. */
const MINE = 6

const isTool = (h: Holding): h is Tool => (TOOLS as readonly string[]).includes(h)

/**
 * Paint (Lan, Oct 16: "a touch version of Excalidraw, for kids", with
 * hand-drawn controls that feel like really painting): a gallery of his
 * paintings, and the easel. One finger paints, two pinch and pan.
 */
export default function App({ services }: GameProps) {
  const [open, setOpen] = useState<Drawing | null>(null)
  if (open) return <Easel key={open.id} drawing={open} services={services} onClose={() => setOpen(null)} />
  return <Gallery onOpen={setOpen} onHome={services.exitToHome} />
}

function Gallery({ onOpen, onHome }: { onOpen: (d: Drawing) => void; onHome: () => void }) {
  const [list, setList] = useState<Drawing[] | null>(null)
  const [doomed, setDoomed] = useState<string | null>(null)
  useEffect(() => {
    listDrawings().then(setList)
  }, [])

  return (
    <div className="h-dvh w-full overflow-y-auto select-none" style={{ background: '#EADBC8' }}>
      <div className="flex items-center gap-3 p-3">
        <Knob label="Home" parts={ICONS.home} onPress={onHome} />
        <h1 className="text-3xl font-black text-stone-800 tracking-wide">
          Paint
        </h1>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-4 pb-8">
        <button type="button" onClick={() => onOpen(newDrawing())} aria-label="New painting" className="relative aspect-[4/3] bg-[#FFFDF7] shadow-md rotate-[-1deg]">
          <Doodle parts={[{ d: 'M2 2 L118 2 L118 88 L2 88 Z' }, { d: 'M60 26 L60 64 M41 45 L79 45' }]} box="0 0 120 90" width={1.1} className="absolute inset-0 w-full h-full" />
        </button>
        {list?.map((d, i) => (
          <div key={d.id} className="relative aspect-[4/3]" style={{ transform: `rotate(${(i % 3) - 1}deg)` }}>
            <button type="button" onClick={() => onOpen(d)} aria-label="Open painting" className="absolute inset-0 shadow-md overflow-hidden" style={{ background: paperBase(d) }}>
              {d.thumb && <img src={d.thumb} alt="" className="w-full h-full object-contain" draggable={false} />}
              <Doodle parts={[{ d: 'M2 2 L118 2 L118 88 L2 88 Z' }]} box="0 0 120 90" width={0.9} seed={i + 5} className="absolute inset-0 w-full h-full" />
            </button>
            <div className="absolute -top-2 -right-2 scale-75">
              <Knob label="Throw away" parts={ICONS.bin} onPress={() => setDoomed(d.id)} />
            </div>
            {doomed === d.id && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-4">
                <Knob
                  label="Yes, throw it away"
                  parts={ICONS.yes}
                  onPress={() => {
                    deleteDrawing(d.id)
                    setList((l) => l?.filter((x) => x.id !== d.id) ?? null)
                    setDoomed(null)
                  }}
                />
                <Knob label="No, keep it" parts={ICONS.no} onPress={() => setDoomed(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** What his finger is doing on the paper. */
type Action =
  | { kind: 'paint'; id: number; thing: Stroke; t0: number; last: number }
  | { kind: 'shape'; id: number; thing: Shape }
  | { kind: 'erase'; id: number; gone: Set<string>; wx: number; wy: number }
  | { kind: 'move'; id: number; orig: Thing; thing: Thing; wx: number; wy: number }
  | { kind: 'resize'; id: number; orig: Thing; thing: Thing; ax: number; ay: number; d0: number }
  | { kind: 'pan'; id: number; sx: number; sy: number; v0: View }
  | { kind: 'tap'; id: number; sx: number; sy: number }

const MIN_Z = 0.15
const MAX_Z = 6

function loadPrefs(services: GameServices): Prefs {
  try {
    return { ...PREFS, ...JSON.parse(services.storage.get('prefs') ?? '{}') }
  } catch {
    return PREFS
  }
}

/** A picture of the painting, `w` × `h` at most, everything in it (or the empty paper). */
function picture(page: Page, w: number, h: number, maxScale: number, fallback: Box): HTMLCanvasElement {
  const box = union(page.things.map(bounds)) ?? fallback
  const pad = 24
  const k = Math.min(maxScale, w / (box.w + 2 * pad), h / (box.h + 2 * pad))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round((box.w + 2 * pad) * k))
  c.height = Math.max(1, Math.round((box.h + 2 * pad) * k))
  const g = c.getContext('2d')!
  g.setTransform(k, 0, 0, k, -(box.x - pad) * k, -(box.y - pad) * k)
  drawAll(g, page, page.things, { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad })
  return c
}

function Easel({ drawing, services, onClose }: { drawing: Drawing; services: GameServices; onClose: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(services))
  const [selected, setSelected] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hist = useRef(new History<Page>({ paper: drawing.paper, paperFill: drawing.paperFill, things: drawing.things }))
  const view = useRef<View>(drawing.view ?? { x: 0, y: 0, z: 1 })
  // What the event handlers (set up once) read: the latest choices.
  const cfg = useRef({ prefs, selected })
  cfg.current = { prefs, selected }
  const engine = useRef<{ redraw: (full: boolean) => void; visible: () => Box } | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const dishRef = useRef<HTMLButtonElement>(null)
  // A blob of paint being dragged towards the dish.
  const press = useRef<{ colour: string; id: number; x0: number; y0: number; on: boolean } | null>(null)
  const dragged = useRef(false)
  const [carried, setCarried] = useState<{ colour: string; x: number; y: number; hot: boolean } | null>(null)
  const [landing, setLanding] = useState<Landing | null>(null)
  const dabRef = useRef<(c: string, x: number, y: number) => void>(() => {})

  const set = (p: Partial<Prefs>) =>
    setPrefs((old) => {
      const next = { ...old, ...p }
      services.storage.set('prefs', JSON.stringify(next))
      return next
    })

  const save = () => {
    window.clearTimeout(saveTimer.current)
    const page = hist.current.now
    if (!page.things.length && paperBase(page) === PAPER && !page.paperFill) return deleteDrawing(drawing.id)
    const thumb = picture(page, 360, 270, 1, engine.current?.visible() ?? { x: 0, y: 0, w: 400, h: 300 }).toDataURL('image/jpeg', 0.8)
    return saveDrawing({ ...drawing, paper: page.paper, paperFill: page.paperFill, things: page.things, view: { ...view.current }, updated: Date.now(), thumb })
  }

  /** After every change: redraw, keep the buttons right, and save a moment later. */
  const changed = (full = true) => {
    engine.current?.redraw(full)
    setTick((t) => t + 1)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(save, 800)
  }
  const commit = (page: Page, full = true) => {
    hist.current.push(page)
    changed(full)
  }
  const changedRef = useRef({ commit, setSelected })
  changedRef.current = { commit, setSelected }

  const close = async () => {
    await save()
    onClose()
  }
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(
    () =>
      services.onBack(() => {
        void closeRef.current()
        return true
      }),
    [services],
  )

  useEffect(() => {
    const el = canvas.current!
    const g = el.getContext('2d')!
    const base = document.createElement('canvas')
    const bg = base.getContext('2d')!
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0
    let H = 0
    let baseView: View | null = null
    let baseFresh = false
    let dirty = true
    /** Pinching or panning: the base picture is moved about, not redrawn, until it ends. */
    let gesture = false
    let wheelTimer: number | undefined
    let action: Action | null = null
    let pinch: { a: number; b: number; d0: number; mx: number; my: number; v0: View } | null = null
    const fingers = new Map<number, { x: number; y: number }>()
    const page = () => hist.current.now

    const visible = (): Box => ({ x: view.current.x, y: view.current.y, w: W / view.current.z, h: H / view.current.z })
    const world = (sx: number, sy: number) => ({ x: view.current.x + sx / view.current.z, y: view.current.y + sy / view.current.z })
    const toWorld = (c: CanvasRenderingContext2D) => {
      const v = view.current
      c.setTransform(dpr * v.z, 0, 0, dpr * v.z, -v.x * v.z * dpr, -v.y * v.z * dpr)
    }
    /** Things not on the base picture because his finger has them (being moved, or rubbed out). */
    const hidden = (): Set<string> => {
      if (action?.kind === 'move' || action?.kind === 'resize') return new Set([action.orig.id])
      if (action?.kind === 'erase') return action.gone
      return new Set()
    }

    function renderBase() {
      if (base.width !== el.width || base.height !== el.height) {
        base.width = el.width
        base.height = el.height
      }
      toWorld(bg)
      const hide = hidden()
      drawAll(bg, page(), hide.size ? page().things.filter((t) => !hide.has(t.id)) : page().things, visible())
      baseView = { ...view.current }
      baseFresh = true
    }

    engine.current = {
      redraw(full) {
        if (full) baseFresh = false
        dirty = true
      },
      visible,
    }

    /** Lay a just-finished thing straight onto the base picture (no need to draw everything again). */
    function addToBase(t: Thing) {
      if (!baseFresh || gesture) return
      toWorld(bg)
      drawThing(bg, t)
    }

    let raf = 0
    function frame() {
      raf = requestAnimationFrame(frame)
      const w = el.clientWidth
      const h = el.clientHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      if (w !== W || h !== H || el.width !== Math.round(w * dpr)) {
        W = w
        H = h
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
        baseFresh = false
        dirty = true
      }
      // Spray held still keeps spraying.
      if (action?.kind === 'paint' && action.thing.tool === 'spray') {
        const now = performance.now()
        if (now - action.last > 30) {
          const p = action.thing.pts
          action.thing = { ...action.thing, pts: [...p, p[p.length - 4], p[p.length - 3], p[p.length - 2], now - action.t0] }
          action.last = now
          dirty = true
        }
      }
      if (!dirty || !W || !H) return
      dirty = false
      if (!baseFresh && !gesture) renderBase()
      g.setTransform(1, 0, 0, 1, 0, 0)
      const v = view.current
      if (baseFresh && baseView && baseView.x === v.x && baseView.y === v.y && baseView.z === v.z) {
        g.clearRect(0, 0, el.width, el.height)
        g.drawImage(base, 0, 0)
      } else {
        // Mid-gesture: the last picture, moved and zoomed to follow his fingers.
        g.fillStyle = paperBase(page())
        g.fillRect(0, 0, el.width, el.height)
        if (baseView) {
          const k = v.z / baseView.z
          g.drawImage(base, (baseView.x - v.x) * v.z * dpr, (baseView.y - v.y) * v.z * dpr, base.width * k, base.height * k)
        }
      }
      // What his finger is painting (or carrying) now.
      toWorld(g)
      if (action && 'thing' in action) drawThing(g, action.thing, action.kind !== 'paint')
      // The thing he's picked up with the hand: a dashed box, and a handle to make it bigger or smaller.
      const sel = cfg.current.selected
      if (sel && cfg.current.prefs.tool === 'hand') {
        const t = action && 'thing' in action && action.thing.id === sel ? action.thing : page().things.find((x) => x.id === sel)
        if (t) {
          const b = bounds(t)
          g.setTransform(dpr, 0, 0, dpr, 0, 0)
          const x = (b.x - v.x) * v.z - 6
          const y = (b.y - v.y) * v.z - 6
          const bw = b.w * v.z + 12
          const bh = b.h * v.z + 12
          g.strokeStyle = '#3B3030'
          g.lineWidth = 1.5
          g.setLineDash([7, 6])
          g.strokeRect(x, y, bw, bh)
          g.setLineDash([])
          g.beginPath()
          g.arc(x + bw, y + bh, 11, 0, Math.PI * 2)
          g.fillStyle = '#FFFDF7'
          g.fill()
          g.stroke()
          g.beginPath()
          g.moveTo(x + bw - 5, y + bh - 5)
          g.lineTo(x + bw + 5, y + bh + 5)
          g.stroke()
        }
      }
    }
    raf = requestAnimationFrame(frame)

    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    /** The selection's resize handle, in screen pixels (its bottom-right corner). */
    function handle(): { x: number; y: number; t: Thing } | null {
      const sel = cfg.current.selected
      const t = sel ? page().things.find((x) => x.id === sel) : null
      if (!t) return null
      const b = bounds(t)
      const v = view.current
      return { x: (b.x + b.w - v.x) * v.z + 6, y: (b.y + b.h - v.y) * v.z + 6, t }
    }

    function eraseAt(a: Extract<Action, { kind: 'erase' }>, wx: number, wy: number) {
      // Along the way from the last point, so a fast swipe doesn't jump over anything.
      const steps = Math.max(1, Math.ceil(Math.hypot(wx - a.wx, wy - a.wy) / (8 / view.current.z)))
      const before = a.gone.size
      for (let i = 1; i <= steps; i++) {
        const x = a.wx + ((wx - a.wx) * i) / steps
        const y = a.wy + ((wy - a.wy) * i) / steps
        const t = topAt(page().things.filter((q) => !a.gone.has(q.id)), x, y, 10 / view.current.z)
        if (t) a.gone.add(t.id)
      }
      a.wx = wx
      a.wy = wy
      if (a.gone.size !== before) baseFresh = false
    }

    function begin(e: PointerEvent) {
      const { prefs, selected } = cfg.current
      const s = at(e)
      const w = world(s.x, s.y)
      const tool = prefs.tool
      if (isTool(tool)) {
        const now = performance.now()
        action = {
          kind: 'paint',
          id: e.pointerId,
          t0: now,
          last: now,
          thing: { id: newId(), type: 'stroke', tool, colour: prefs.colour, size: WIDTHS[tool][prefs.width], seed: newSeed(), pts: [w.x, w.y, e.pointerType === 'pen' ? e.pressure : 0, 0] },
        }
      } else if (tool === 'shape') {
        action = {
          kind: 'shape',
          id: e.pointerId,
          thing: {
            id: newId(),
            type: 'shape',
            kind: prefs.shape,
            colour: prefs.colour,
            size: WIDTHS.shape[prefs.width],
            seed: newSeed(),
            x1: w.x,
            y1: w.y,
            x2: w.x,
            y2: w.y,
            ...(prefs.shapeFill !== 'none' && prefs.shape !== 'line' && prefs.shape !== 'arrow' ? { fill: { style: prefs.shapeFill, colour: prefs.colour } } : {}),
          },
        }
      } else if (tool === 'eraser') {
        const a: Action = { kind: 'erase', id: e.pointerId, gone: new Set(), wx: w.x, wy: w.y }
        action = a
        eraseAt(a, w.x, w.y)
      } else if (tool === 'bucket') {
        action = { kind: 'tap', id: e.pointerId, sx: s.x, sy: s.y }
      } else {
        // The hand: the handle resizes, a thing is picked up, empty paper slides.
        const hd = handle()
        if (selected && hd && Math.hypot(s.x - hd.x, s.y - hd.y) < 28) {
          const b = bounds(hd.t)
          action = { kind: 'resize', id: e.pointerId, orig: hd.t, thing: hd.t, ax: b.x, ay: b.y, d0: Math.max(10, Math.hypot(w.x - b.x, w.y - b.y)) }
        } else {
          const t = topAt(page().things, w.x, w.y, 12 / view.current.z)
          if (t) {
            changedRef.current.setSelected(t.id)
            cfg.current.selected = t.id
            action = { kind: 'move', id: e.pointerId, orig: t, thing: t, wx: w.x, wy: w.y }
          } else {
            changedRef.current.setSelected(null)
            cfg.current.selected = null
            action = { kind: 'pan', id: e.pointerId, sx: s.x, sy: s.y, v0: { ...view.current } }
          }
        }
        baseFresh = false
      }
      dirty = true
    }

    function carry(e: PointerEvent) {
      const a = action
      if (!a || a.id !== e.pointerId) return
      const events = (e.getCoalescedEvents?.() ?? []).length ? e.getCoalescedEvents() : [e]
      for (const ev of events) {
        const s = at(ev)
        const w = world(s.x, s.y)
        if (a.kind === 'paint') {
          const p = a.thing.pts
          const lx = p[p.length - 4]
          const ly = p[p.length - 3]
          if (a.thing.tool !== 'spray' && Math.hypot(w.x - lx, w.y - ly) < 0.7 / view.current.z) continue
          const now = performance.now()
          a.thing = { ...a.thing, pts: [...p, w.x, w.y, ev.pointerType === 'pen' ? ev.pressure : 0, now - a.t0] }
          a.last = now
        } else if (a.kind === 'shape') a.thing = { ...a.thing, x2: w.x, y2: w.y }
        else if (a.kind === 'erase') eraseAt(a, w.x, w.y)
        else if (a.kind === 'move') a.thing = moved(a.orig, w.x - a.wx, w.y - a.wy)
        else if (a.kind === 'resize') a.thing = scaled(a.orig, Math.max(0.1, Math.min(10, Math.hypot(w.x - a.ax, w.y - a.ay) / a.d0)), a.ax, a.ay)
        else if (a.kind === 'pan') {
          view.current = { ...a.v0, x: a.v0.x - (s.x - a.sx) / a.v0.z, y: a.v0.y - (s.y - a.sy) / a.v0.z }
          gesture = true
        } else if (a.kind === 'tap' && Math.hypot(s.x - a.sx, s.y - a.sy) > 10) action = null
      }
      dirty = true
    }

    function finish(a: Action) {
      const { commit } = changedRef.current
      const p = page()
      action = null
      if (a.kind === 'paint') {
        const t = a.thing.pts.length === 4 ? { ...a.thing, pts: [...a.thing.pts, a.thing.pts[0] + 0.3, a.thing.pts[1], a.thing.pts[2], 16] } : a.thing
        commit({ ...p, things: [...p.things, t] }, false)
        addToBase(t)
      } else if (a.kind === 'shape') {
        const t = a.thing
        if (Math.hypot(t.x2 - t.x1, t.y2 - t.y1) * view.current.z < 8) return void (dirty = true)
        commit({ ...p, things: [...p.things, t] }, false)
        addToBase(t)
      } else if (a.kind === 'erase') {
        if (a.gone.size) commit({ ...p, things: p.things.filter((t) => !a.gone.has(t.id)) })
      } else if (a.kind === 'move' || a.kind === 'resize') {
        if (a.thing !== a.orig) commit({ ...p, things: p.things.map((t) => (t.id === a.orig.id ? a.thing : t)) })
        else baseFresh = false
      } else if (a.kind === 'pan') {
        gesture = false
        baseFresh = false
      } else if (a.kind === 'tap') {
        // The paint pot: fill what's closed round the tap, or paint the paper.
        const w = world(a.sx, a.sy)
        const { prefs } = cfg.current
        const t = fillTarget(p.things, w.x, w.y)
        if (t) commit({ ...p, things: p.things.map((x) => (x === t ? { ...t, fill: { style: prefs.fill, colour: prefs.colour } } : x)) })
        else if (p.paper !== prefs.colour || (p.paperFill ?? 'solid') !== prefs.fill) commit({ ...p, paper: prefs.colour, paperFill: prefs.fill })
      }
      dirty = true
    }

    function down(e: PointerEvent) {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      el.setPointerCapture(e.pointerId)
      fingers.set(e.pointerId, at(e))
      if (fingers.size === 2 && !pinch) {
        // A second finger: pinch and pan. A stroke only just begun was the first finger landing, and is dropped.
        if (action) {
          if (action.kind === 'paint' && performance.now() - action.t0 < 250) action = null
          else if (action.kind === 'pan') action = null
          else finish(action)
        }
        const [a, b] = [...fingers.keys()]
        const pa = fingers.get(a)!
        const pb = fingers.get(b)!
        pinch = { a, b, d0: Math.max(10, Math.hypot(pa.x - pb.x, pa.y - pb.y)), mx: (pa.x + pb.x) / 2, my: (pa.y + pb.y) / 2, v0: { ...view.current } }
        gesture = true
        baseFresh = baseFresh && !!baseView
        dirty = true
        return
      }
      if (fingers.size === 1 && !pinch) begin(e)
    }

    function move(e: PointerEvent) {
      if (!fingers.has(e.pointerId)) return
      fingers.set(e.pointerId, at(e))
      if (pinch) {
        const pa = fingers.get(pinch.a)
        const pb = fingers.get(pinch.b)
        if (!pa || !pb) return
        const { v0, d0, mx, my } = pinch
        const z = Math.max(MIN_Z, Math.min(MAX_Z, (v0.z * Math.hypot(pa.x - pb.x, pa.y - pb.y)) / d0))
        // The paper under where his fingers began stays under them.
        const wx = v0.x + mx / v0.z
        const wy = v0.y + my / v0.z
        view.current = { x: wx - (pa.x + pb.x) / 2 / z, y: wy - (pa.y + pb.y) / 2 / z, z }
        dirty = true
        return
      }
      carry(e)
    }

    function up(e: PointerEvent) {
      if (!fingers.delete(e.pointerId)) return
      if (pinch) {
        if (fingers.size === 0) {
          pinch = null
          gesture = false
          baseFresh = false
          dirty = true
        }
        return
      }
      if (action && action.id === e.pointerId) {
        if (e.type === 'pointercancel' && action.kind === 'paint') action = null
        else finish(action)
      }
    }

    function wheel(e: WheelEvent) {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const sx = e.clientX - r.left
      const sy = e.clientY - r.top
      const v = view.current
      if (e.ctrlKey || !e.shiftKey) {
        const z = Math.max(MIN_Z, Math.min(MAX_Z, v.z * Math.exp(-e.deltaY * 0.0015)))
        const w = world(sx, sy)
        view.current = { x: w.x - sx / z, y: w.y - sy / z, z }
      } else view.current = { ...v, x: v.x + e.deltaY / v.z }
      gesture = true
      dirty = true
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        gesture = false
        baseFresh = false
        dirty = true
      }, 160)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    ;(window as unknown as { __paint?: unknown }).__paint = { page, view: () => view.current }
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(wheelTimer)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      engine.current = null
    }
  }, [])

  // Dragging a blob of paint into the dish. A press that doesn't move is a tap.
  useEffect(() => {
    // Where (x, y) is in the dish, as fractions of it, if it's over it.
    const over = (x: number, y: number) => {
      const r = dishRef.current?.getBoundingClientRect()
      if (!r || x < r.left - 16 || x > r.right + 16 || y < r.top - 24 || y > r.bottom + 16) return null
      const f = (v: number) => Math.min(1, Math.max(0, v))
      return { x: f((x - r.left) / r.width), y: f((y - r.top) / r.height) }
    }
    const move = (e: PointerEvent) => {
      const p = press.current
      if (!p || e.pointerId !== p.id) return
      if (!p.on && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 10) p.on = true
      if (p.on) setCarried({ colour: p.colour, x: e.clientX, y: e.clientY, hot: !!over(e.clientX, e.clientY) })
    }
    const up = (e: PointerEvent) => {
      const p = press.current
      if (!p || e.pointerId !== p.id) return
      press.current = null
      if (!p.on) return
      setCarried(null)
      // The click that follows a drag isn't a tap.
      dragged.current = true
      window.setTimeout(() => (dragged.current = false))
      const at = e.type === 'pointerup' && over(e.clientX, e.clientY)
      if (at) dabRef.current(p.colour, at.x, at.y)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  // Redraw when the selection box or the tool changes.
  useEffect(() => {
    engine.current?.redraw(false)
  }, [selected, prefs.tool])

  const h = hist.current
  const sel = selected && prefs.tool === 'hand' ? h.now.things.find((t) => t.id === selected) : undefined

  const pickColour = (c: string) => {
    set({ colour: c })
    // With the hand: the thing he's holding takes the new colour.
    if (sel) commit({ ...h.now, things: h.now.things.map((t) => (t === sel ? { ...t, colour: c, ...(t.fill ? { fill: { ...t.fill, colour: c } } : {}) } : t)) })
  }

  // The mixing dish, on a shelf above the colours. He drags colours into it a
  // dab at a time, and paints with whatever's in it.
  const mix = mixed(prefs.cup)
  const dab = (c: string, x: number, y: number) => {
    const cup = addDab(prefs.cup, c)
    set({ cup })
    setLanding((l) => ({ colour: c, x, y, n: (l?.n ?? 0) + 1 }))
    pickColour(mixed(cup)!)
  }
  const tapColour = (c: string) => {
    if (dragged.current) return
    pickColour(c)
  }
  // Painting with the mix makes it one of his colours.
  const keepMix = () => (mix ? { mine: remember(prefs.mine, mix, MINE) } : {})
  const tapDish = () => {
    if (!mix) return
    set(keepMix())
    pickColour(mix)
  }
  const toggleMixer = () => set({ mixer: !prefs.mixer, ...(prefs.mixer && prefs.colour === mix ? keepMix() : {}) })
  const rinse = () => {
    set({ cup: [], ...keepMix() })
    setLanding(null)
  }
  const keep = () => {
    const page = h.now
    const box = engine.current?.visible() ?? { x: 0, y: 0, w: 800, h: 600 }
    const c = picture(page, 4096, 4096, 2, box)
    const d = new Date()
    void savePicture(c, `painting-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getHours()}${String(d.getMinutes()).padStart(2, '0')}.png`)
  }

  dabRef.current = dab
  const pressColour = (c: string) => (e: React.PointerEvent) => {
    press.current = { colour: c, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false }
  }

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none" style={{ background: paperBase(h.now) }}>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full touch-none" />
      <div className="absolute top-3 left-3 flex gap-2">
        <Knob label="Back to my paintings" parts={ICONS.home} onPress={() => void close()} />
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        {sel && (
          <Knob
            label="Throw it away"
            parts={ICONS.bin}
            onPress={() => {
              commit({ ...h.now, things: h.now.things.filter((t) => t !== sel) })
              setSelected(null)
            }}
          />
        )}
        <Knob label="Undo" parts={ICONS.undo} disabled={!h.canUndo} onPress={() => h.undo() && changed()} />
        <Knob label="Redo" parts={ICONS.redo} disabled={!h.canRedo} onPress={() => h.redo() && changed()} />
        <Knob label="Keep as a picture" parts={ICONS.keep} onPress={keep} />
      </div>
      {carried && (
        <div className="fixed z-50 w-12 h-12 -ml-6 -mt-6 pointer-events-none drop-shadow-lg transition-transform" style={{ left: carried.x, top: carried.y, transform: carried.hot ? 'scale(1.3)' : undefined }}>
          <Blob colour={carried.colour} seed={5} picked={false} onPick={() => {}} />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pointer-events-none">
        {(prefs.tool === 'shape' || prefs.tool === 'bucket') && (
          <div className="pointer-events-auto mb-2 mx-3 max-w-[calc(100%-1.5rem)] rounded-2xl bg-[#FFFDF7]/95 shadow px-2 py-1 flex flex-wrap justify-center gap-1">
            {prefs.tool === 'shape' && SHAPES.map((k) => <ShapeChip key={k} kind={k} colour={prefs.colour} picked={prefs.shape === k} onPick={() => set({ shape: k })} />)}
            {prefs.tool === 'shape' && <div className="w-px bg-stone-300 mx-1 shrink-0 hidden sm:block" />}
            {(prefs.tool === 'shape' ? (['none', 'scribble', 'solid', 'wash'] as const) : (['scribble', 'solid', 'wash'] as const)).map((f) => (
              <FillChip
                key={f}
                fill={f}
                colour={prefs.colour}
                picked={prefs.tool === 'shape' ? prefs.shapeFill === f : prefs.fill === f}
                onPick={() => (prefs.tool === 'shape' ? set({ shapeFill: f }) : f !== 'none' && set({ fill: f }))}
              />
            ))}
          </div>
        )}
        {prefs.mixer && (
          <div className="pointer-events-auto mb-1 mx-3 max-w-[calc(100%-1.5rem)] rounded-3xl shadow px-3 py-1.5 flex justify-center items-center gap-3" style={{ background: '#E8D2A8' }}>
            <Dish colour={mix} dabs={prefs.cup} picked={!!mix && prefs.colour === mix} hot={!!carried?.hot} landing={landing} onPick={tapDish} dishRef={dishRef} />
            {prefs.cup.length > 0 && <Recipe dabs={prefs.cup} />}
            {prefs.cup.length > 0 && (
              <button type="button" onClick={rinse} aria-label="Rinse the dish" className="shrink-0 w-10 h-10">
                <Doodle parts={ICONS.rinse} box="0 0 40 40" seed={21} className="w-full h-full" />
              </button>
            )}
          </div>
        )}
        <div className="pointer-events-auto mb-1 mx-3 max-w-[calc(100%-1.5rem)] rounded-3xl shadow px-3 py-1 flex flex-wrap justify-center items-center gap-x-1" style={{ background: '#F3E3C3' }}>
          {COLOURS.map((c, i) => (
            <Blob key={c} colour={c} seed={i * 13 + 1} picked={prefs.colour === c} onPick={() => tapColour(c)} onPress={pressColour(c)} />
          ))}
          {prefs.mine.length > 0 && <div className="w-px h-8 bg-stone-400/60 mx-1 shrink-0 hidden sm:block" />}
          {prefs.mine.map((c, i) => (
            <Blob key={c} colour={c} seed={i * 7 + 90} picked={prefs.colour === c} onPick={() => tapColour(c)} onPress={pressColour(c)} />
          ))}
          <div className="w-px h-8 bg-stone-400/60 mx-1 shrink-0 hidden sm:block" />
          <PaletteKnob open={prefs.mixer} colour={mix} onPick={toggleMixer} />
          <div className="w-px h-8 bg-stone-400/60 mx-1 shrink-0 hidden sm:block" />
          {[0, 1, 2].map((i) => (
            <Width key={i} i={i} colour={prefs.colour === '#FFFFFF' ? '#DDDDDD' : prefs.colour} picked={prefs.width === i} onPick={() => set({ width: i })} />
          ))}
        </div>
        <div className="pointer-events-auto w-full overflow-x-auto overflow-y-hidden" style={{ background: 'linear-gradient(#C99863, #A9763F)', boxShadow: 'inset 0 3px 0 #DDB27E', scrollbarWidth: 'none' }}>
          <div className="flex sm:gap-1 px-2 pt-4 w-max mx-auto">
            {TRAY.map((t) => (
              <Supply
                key={t}
                tool={t}
                colour={prefs.colour}
                held={prefs.tool === t}
                label={NAMES[t]}
                onPick={() => {
                  set({ tool: t })
                  if (t !== 'hand') setSelected(null)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
