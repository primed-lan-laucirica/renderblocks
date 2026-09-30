import { useEffect, useRef, useState } from 'react'
import { speakNumber, type GameProps } from '@renderblocks/kernel'
import { Block } from './Block'
import {
  addSteps,
  colours,
  colourOf,
  columns,
  expanded,
  groupOf,
  groupsOf,
  PALETTE_PLACES,
  placeName,
  placeValue,
  power,
  powers,
  remove,
  shapeOf,
  value,
  words,
  type Mat,
} from './model'

const KEY = 'mat'
/** How long the ten blocks take to bundle, and the new block to land, ms. */
const MERGE_MS = 380
const LAND_MS = 260

function loadMat(raw: string | null): Mat {
  try {
    const m = JSON.parse(raw ?? '[]') as unknown
    return Array.isArray(m) && m.every((c) => Number.isInteger(c) && c >= 0 && c <= 9) ? m : []
  } catch {
    return []
  }
}

const sfx = new Map<string, HTMLAudioElement>()
function play(name: 'pop' | 'whoosh', volume = 0.7) {
  let a = sfx.get(name)
  if (!a) {
    a = new Audio(`/games/shared/sfx/${name}.mp3`)
    sfx.set(name, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}

/** What the mat shows while a carry plays: a column squeezing its ten together, or a block landing. */
interface Shown {
  mat: Mat
  merging?: number
  landed?: number
}

interface Drag {
  place: number
  /** From the palette (adds) or from the mat (takes away). */
  from: 'palette' | 'mat'
  x: number
  y: number
  x0: number
  y0: number
}

/**
 * Base 10 (Base10-MVP-spec.md): a place-value mat that keeps growing.
 * Drag blocks from the palette onto the mat; ten of a place bundle into one
 * of the next place, across commas and past a billion.
 */
function App({ services }: GameProps) {
  const { storage } = services
  const [mat, setMat] = useState<Mat>(() => loadMat(storage.get(KEY)))
  const [shown, setShown] = useState<Shown>(() => ({ mat }))
  const [drag, setDrag] = useState<Drag | null>(null)
  const timers = useRef<number[]>([])
  const matBox = useRef<HTMLDivElement>(null)

  useEffect(() => storage.set(KEY, JSON.stringify(mat)), [storage, mat])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const n = value(mat)
  // The photo's four columns, or up to the highest holding a block, or one past a carry in progress.
  const cols = Math.max(columns(shown.mat), shown.merging !== undefined ? shown.merging + 2 : 0)
  const places = Array.from({ length: cols }, (_, i) => i)
  // Wide columns while there are few, like the photo's mat; narrower as places are added.
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setWidth(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const colW = Math.max(96, Math.min(190, (width - 48) / cols - 8))

  /** Add a block, playing each carry in turn (spec: the regroup is animated). */
  const addBlock = (place: number) => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    const steps = addSteps(mat, place)
    const final = steps[steps.length - 1].mat
    setMat(final)
    play('pop', 0.6)
    setShown({ mat: steps[0].mat, landed: place })
    let t = LAND_MS
    for (let i = 1; i < steps.length; i++) {
      const before = steps[i - 1].mat
      const carry = steps[i].carry!
      const after = steps[i].mat
      timers.current.push(
        window.setTimeout(() => {
          setShown({ mat: before, merging: carry })
          play('whoosh', 0.5)
        }, t),
      )
      t += MERGE_MS
      timers.current.push(window.setTimeout(() => setShown({ mat: after, landed: carry + 1 }), t))
      t += LAND_MS
    }
    timers.current.push(window.setTimeout(() => setShown({ mat: final }), t))
  }

  const takeBlock = (place: number) => {
    timers.current.forEach(window.clearTimeout)
    const next = remove(mat, place)
    setMat(next)
    setShown({ mat: next })
    play('pop', 0.35)
  }

  const overMat = (x: number, y: number) => {
    const r = matBox.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  // One drag at a time, followed on the window so it can leave where it started.
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
    const up = (e: PointerEvent) => {
      const d = drag
      setDrag(null)
      const tap = Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10
      if (d.from === 'palette' && (tap || overMat(e.clientX, e.clientY))) addBlock(d.place)
      if (d.from === 'mat' && !tap && !overMat(e.clientX, e.clientY)) takeBlock(d.place)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  })

  const startDrag = (e: React.PointerEvent, place: number, from: Drag['from']) => {
    e.preventDefault()
    setDrag({ place, from, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY })
  }

  return (
    <div className="h-dvh flex flex-col bg-slate-100 text-slate-900 select-none overflow-hidden touch-none">
      {/* The number, each group of three in its colour. */}
      <div className="flex items-center gap-3 px-4 pt-3">
        <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Home">
          ←
        </button>
        <div className="flex-1 min-w-0 flex items-baseline justify-center flex-wrap font-black tabular-nums text-[clamp(2.5rem,7vw,5.5rem)] leading-tight">
          {groupsOf(n).map((g, i, all) => {
            const c = colours(all.length - 1 - i)
            return (
              <span key={i} className="flex items-baseline">
                <span className="rounded-2xl px-2" style={{ background: c.tint, color: c.ink }}>
                  {g}
                </span>
                {i < all.length - 1 && <span className="text-slate-400 mx-0.5">,</span>}
              </span>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => n <= 999_999_999_999_999n && speakNumber(Number(n))}
          className="w-14 h-14 rounded-full bg-white shadow text-3xl shrink-0"
          aria-label="Say the number"
        >
          🔊
        </button>
        <button type="button" onClick={() => (timers.current.forEach(window.clearTimeout), setMat([]), setShown({ mat: [] }))} className="h-12 px-4 rounded-2xl bg-white shadow font-extrabold shrink-0">
          Clear
        </button>
      </div>

      {/* Read it back (spec): words, expanded form, powers. */}
      <div className="px-6 py-2 flex flex-col gap-0.5 text-center">
        <div className="text-xl font-extrabold">{words(n)}</div>
        <div className="text-base font-bold text-slate-500 tabular-nums">{expanded(mat)}</div>
        <div className="text-base font-bold text-slate-500 tabular-nums">{powers(mat)}</div>
      </div>

      {/* The mat: ones on the right, growing to the left as the number needs. */}
      <div ref={matBox} className="flex-1 min-h-0 mx-3 rounded-3xl bg-[#2436A6] p-2 overflow-x-auto">
        {/* Ones first, laid out right to left: when the mat outgrows the screen it scrolls from the ones. */}
        <div className="h-full flex flex-row-reverse gap-2 min-w-max">
          {places.map((p) => {
            const c = colours(groupOf(p))
            const k = shown.mat[p] ?? 0
            const merging = shown.merging === p
            // Rods fill the width; flats and cubes sit two or three across, so nine always fit.
            const size = shapeOf(p) === 'rod' ? Math.min(colW - 24, 140) : shapeOf(p) === 'flat' ? Math.min((colW - 30) / 2, 52) : Math.min(colW * 0.28, 52)
            return (
              <div key={p} className="h-full flex flex-col rounded-2xl bg-white overflow-hidden" style={{ width: colW }}>
                <div className="px-2 pt-2 pb-1 text-center" style={{ background: c.tint }}>
                  <div className="text-sm font-black leading-tight" style={{ color: c.ink }}>
                    {placeName(p)}
                  </div>
                  <div className="font-bold text-slate-500 tabular-nums whitespace-nowrap leading-tight" style={{ fontSize: Math.min(12, (colW - 12) / (placeValue(p).length * 0.62)) }}>
                    {placeValue(p)}
                  </div>
                  <div className="text-xs font-bold text-slate-500">{power(p)}</div>
                  <div className="text-4xl font-black tabular-nums" style={{ color: colourOf(p) }}>
                    {Math.min(k, 10)}
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative overflow-hidden">
                  <div
                    className={`absolute inset-0 p-2 flex flex-wrap-reverse content-start justify-center items-end gap-1.5 transition-transform ${merging ? 'scale-50 opacity-60' : ''}`}
                    style={{ transitionDuration: `${MERGE_MS}ms` }}
                  >
                    {Array.from({ length: k }, (_, i) => (
                      <div
                        key={i}
                        onPointerDown={(e) => startDrag(e, p, 'mat')}
                        className={`cursor-grab ${shown.landed === p && i === k - 1 ? 'animate-[land_260ms_ease-out]' : ''}`}
                      >
                        <Block place={p} size={size} />
                      </div>
                    ))}
                  </div>
                  {merging && (
                    <div className="absolute inset-x-0 top-2 text-center text-sm font-black text-slate-700 tabular-nums">
                      10 × {placeValue(p)} = {placeValue(p + 1)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* The palette: 1 to 1,000,000 (10⁰ to 10⁶), in the mat's order — ones on the right. Drag onto the mat, or tap. */}
      <div className="flex flex-row-reverse justify-center gap-2 p-3 overflow-x-auto">
        {PALETTE_PLACES.map((p) => (
          <button
            key={p}
            type="button"
            onPointerDown={(e) => startDrag(e, p, 'palette')}
            className="shrink-0 w-[8.5rem] rounded-2xl bg-white shadow px-2 py-2 flex flex-col items-center gap-1 cursor-grab"
            aria-label={`${placeValue(p)} block`}
          >
            <div className="h-12 flex items-center justify-center">
              <Block place={p} size={shapeOf(p) === 'rod' ? 96 : 46} />
            </div>
            <div className="text-lg font-black tabular-nums leading-none" style={{ color: colours(groupOf(p)).ink }}>
              {placeValue(p)}
            </div>
            <div className="text-sm font-bold text-slate-500">{power(p)}</div>
          </button>
        ))}
      </div>

      {drag && (
        <div className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 drop-shadow-xl" style={{ left: drag.x, top: drag.y }}>
          <Block place={drag.place} size={shapeOf(drag.place) === 'rod' ? 110 : 64} />
        </div>
      )}

      <style>{`@keyframes land { from { transform: translateY(-24px) scale(1.25); opacity: 0.4 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  )
}

export default App
