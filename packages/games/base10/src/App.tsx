import { useEffect, useRef, useState } from 'react'
import { speakNumber, type GameProps } from '@renderblocks/kernel'
import { Block } from './Block'
import {
  addSteps,
  blockSize,
  colours,
  colourOf,
  columns,
  expanded,
  groupOf,
  groupsOf,
  palettePlaces,
  PALETTE_MAX_TOP,
  placeName,
  placeShort,
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
  playFile(`/games/shared/sfx/${name}.mp3`, volume)
}
/** Block names, one clip per place (tools/audio/manifest.json), so there's no stitching pause. */
const sayPlace = (place: number) => {
  if (place <= PALETTE_MAX_TOP) playFile(`/games/base10/place/${place}.mp3`, 1)
}
/** Say a whole number (the number voice reaches the hundreds of trillions). */
function say(n: bigint) {
  if (n <= 999_999_999_999_999n) speakNumber(Number(n))
}
function playFile(src: string, volume: number) {
  let a = sfx.get(src)
  if (!a) {
    a = new Audio(src)
    sfx.set(src, a)
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
  /** A mat block held over the palette, where letting go takes it away. */
  overPalette?: boolean
}

/** A palette block's value: all its digits if they fit (at `min` px or more), else short ("100 trillion"). */
function PaletteValue({ place, width, max, min, colour }: { place: number; width: number; max: number; min: number; colour: string }) {
  const fit = (text: string) => Math.min(max, width / (text.length * 0.6))
  const digits = placeValue(place)
  const text = fit(digits) >= min ? digits : placeShort(place)
  const words = text !== digits
  return (
    <div
      className={`font-black tabular-nums leading-none text-center ${words ? '' : 'whitespace-nowrap'}`}
      style={{ color: colour, fontSize: words ? Math.max(min, Math.min(max, fit(text.split(' ').reduce((a, b) => (a.length > b.length ? a : b))))) : fit(digits) }}
    >
      {text}
    </div>
  )
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
  const paletteBox = useRef<HTMLDivElement>(null)

  useEffect(() => storage.set(KEY, JSON.stringify(mat)), [storage, mat])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const n = value(mat)
  // The photo's four columns, or up to the highest holding a block, or one past a carry in progress.
  const cols = Math.max(columns(shown.mat), shown.merging !== undefined ? shown.merging + 2 : 0)
  const places = Array.from({ length: cols }, (_, i) => i)
  // The columns share the mat's whole width, however many there are; past a
  // dozen or so they stop narrowing and the mat scrolls instead. On a phone
  // (either way up) everything is compact.
  const [box, setBox] = useState(() => ({ w: window.innerWidth - 24, h: 400 }))
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const el = matBox.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setBox({ w: el.clientWidth, h: el.clientHeight })
      setView({ w: window.innerWidth, h: window.innerHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const compact = view.w < 700 || view.h < 560
  const GAP = compact ? 4 : 8
  const colW = Math.max(compact ? 70 : 96, (box.w - 16 - GAP * (cols - 1)) / cols)
  /** Column headers have a fixed height, so every column's block area is the same. */
  const HEADER = compact ? (colW < 120 ? 76 : 62) : colW < 150 ? 120 : 104 // narrow columns wrap "hundred thousands" to two lines
  const blockArea = { w: colW - 16, h: box.h - 16 - HEADER - 16 }

  // The palette grows with the mat (palettePlaces). Its blocks share the width
  // until they'd be too small to read, then it scrolls sideways; a swipe
  // along it scrolls, a drag up onto the mat still carries a block.
  const palette = palettePlaces(mat)
  const PAL_GAP = compact ? 4 : 8
  const palW = Math.min(136, (view.w - (compact ? 12 : 24) - PAL_GAP * (palette.length - 1)) / palette.length)
  const palMin = compact ? 46 : 76
  const palScrolls = palW < palMin
  const itemW = palScrolls ? palMin : palW
  const top = palette[palette.length - 1]
  // A new block (a column just reached a new place) scrolls into view.
  useEffect(() => {
    paletteBox.current?.lastElementChild?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [top])

  /** Add a block, playing each carry in turn (spec: the regroup is animated). */
  const addBlock = (place: number) => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    const steps = addSteps(mat, place)
    const final = steps[steps.length - 1].mat
    setMat(final)
    play('pop', 0.4)
    say(value(final)) // the new total, carries and all
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

  const over = (el: HTMLElement | null, x: number, y: number) => {
    const r = el?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  // One drag at a time, followed on the window so it can leave where it started.
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, overPalette: over(paletteBox.current, e.clientX, e.clientY) } : d))
    const up = (e: PointerEvent) => {
      const d = drag
      setDrag(null)
      // A cancelled touch (the system took it over) does nothing.
      if (e.type === 'pointercancel') return
      const tap = Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 10
      if (d.from === 'palette' && (tap || over(matBox.current, e.clientX, e.clientY))) addBlock(d.place)
      // Taking away is deliberate: only a block dropped back on the palette goes.
      if (d.from === 'mat' && over(paletteBox.current, e.clientX, e.clientY)) takeBlock(d.place)
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
      <div className={`flex items-center ${compact ? 'gap-2 px-2 pt-1' : 'gap-3 px-4 pt-3'}`}>
        <button type="button" onClick={services.exitToHome} className={`${compact ? 'w-10 h-10 text-xl' : 'w-12 h-12 text-2xl'} rounded-full bg-white shadow font-bold shrink-0`} aria-label="Home">
          ←
        </button>
        {/* Tapping the number says it, like 🔊. */}
        <button
          type="button"
          onClick={() => say(n)}
          aria-label="Say the number"
          className="flex-1 min-w-0 flex items-baseline justify-center flex-wrap font-black tabular-nums leading-tight transition-transform active:scale-95"
          style={{ fontSize: 'clamp(1.5rem, min(7vw, 11vh), 5.5rem)' }}
        >
          {groupsOf(n).map((g, i, all) => {
            const c = colours(all.length - 1 - i)
            return (
              <span key={i} className="flex items-baseline">
                <span className="rounded-xl px-1.5" style={{ background: c.tint, color: c.ink }}>
                  {g}
                </span>
                {i < all.length - 1 && <span className="text-slate-400 mx-0.5">,</span>}
              </span>
            )
          })}
        </button>
        <button
          type="button"
          onClick={() => say(n)}
          className={`${compact ? 'w-10 h-10 text-xl' : 'w-14 h-14 text-3xl'} rounded-full bg-white shadow shrink-0`}
          aria-label="Say the number"
        >
          🔊
        </button>
        <button type="button" onClick={() => (timers.current.forEach(window.clearTimeout), setMat([]), setShown({ mat: [] }))} className={`${compact ? 'h-10 px-3 text-sm' : 'h-12 px-4'} rounded-2xl bg-white shadow font-extrabold shrink-0`}>
          Clear
        </button>
      </div>

      {/* Read it back (spec): words, expanded form, powers. */}
      <div className={`flex flex-col gap-0.5 text-center ${compact ? 'px-2 py-1' : 'px-6 py-2'}`}>
        <div className={`${compact ? 'text-sm' : 'text-xl'} font-extrabold leading-snug`}>{words(n)}</div>
        <div className={`${compact ? 'text-xs' : 'text-base'} font-bold text-slate-500 tabular-nums`}>{expanded(mat)}</div>
        <div className={`${compact ? 'text-xs' : 'text-base'} font-bold text-slate-500 tabular-nums`}>{powers(mat)}</div>
      </div>

      {/* The mat: ones on the right, growing to the left as the number needs. */}
      <div ref={matBox} className={`flex-1 min-h-0 bg-[#2436A6] p-2 overflow-x-auto ${compact ? 'mx-1 rounded-2xl' : 'mx-3 rounded-3xl'}`}>
        {/* Ones first, laid out right to left: when the mat outgrows the screen it scrolls from the ones. */}
        <div className="h-full flex flex-row-reverse min-w-max" style={{ gap: GAP }}>
          {places.map((p) => {
            const c = colours(groupOf(p))
            const k = shown.mat[p] ?? 0
            const merging = shown.merging === p
            const size = blockSize(shapeOf(p), blockArea.w, blockArea.h)
            return (
              <div key={p} className={`h-full flex flex-col bg-white overflow-hidden ${compact ? 'rounded-xl' : 'rounded-2xl'}`} style={{ width: colW }}>
                {/* Tapping the header says the block's name ("one hundred thousand"). */}
                <button
                  type="button"
                  onClick={() => sayPlace(p)}
                  aria-label={`Say ${placeName(p)}`}
                  className="w-full px-1 pt-1 text-center overflow-hidden flex flex-col items-center justify-end active:brightness-95"
                  style={{ background: c.tint, height: HEADER }}
                >
                  <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black leading-tight`} style={{ color: c.ink }}>
                    {placeName(p)}
                  </div>
                  {!compact && (
                    <div className="font-bold text-slate-500 tabular-nums whitespace-nowrap leading-tight" style={{ fontSize: Math.min(12, (colW - 12) / (placeValue(p).length * 0.62)) }}>
                      {placeValue(p)}
                    </div>
                  )}
                  <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-slate-500 leading-tight`}>{power(p)}</div>
                  <div className={`${compact ? 'text-2xl' : 'text-4xl'} font-black tabular-nums leading-tight`} style={{ color: colourOf(p) }}>
                    {Math.min(k, 10)}
                  </div>
                </button>
                <div className="flex-1 min-h-0 relative overflow-hidden">
                  <div
                    className={`absolute inset-0 p-2 flex flex-wrap-reverse content-start justify-center items-end gap-1.5 transition-transform ${merging ? 'scale-50 opacity-60' : ''}`}
                    style={{ transitionDuration: `${MERGE_MS}ms` }}
                  >
                    {Array.from({ length: k }, (_, i) => (
                      <div
                        key={i}
                        onPointerDown={(e) => startDrag(e, p, 'mat')}
                        // touch-none: a finger on a block drags it; without this the mat's sideways scroll claims the touch and cancels the drag.
                        className={`cursor-grab touch-none ${shown.landed === p && i === k - 1 ? 'animate-[land_260ms_ease-out]' : ''}`}
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

      {/* The palette: 1 to 1,000,000 (10⁰ to 10⁶), growing with the mat, in the mat's order — ones on the right. Drag onto the mat, or tap. */}
      <div
        ref={paletteBox}
        className={`flex flex-row-reverse transition-colors ${palScrolls ? 'justify-start overflow-x-auto' : 'justify-center'} ${compact ? 'p-1.5' : 'p-3'} ${drag?.from === 'mat' ? (drag.overPalette ? 'bg-rose-200' : 'bg-rose-100') : ''}`}
        style={{ gap: PAL_GAP }}
      >
        {palette.map((p) => (
          <button
            key={p}
            type="button"
            onPointerDown={(e) => startDrag(e, p, 'palette')}
            className={`shrink-0 bg-white shadow flex flex-col items-center cursor-grab ${palScrolls ? 'touch-pan-x' : 'touch-none'} ${compact ? 'rounded-xl px-0.5 py-1 gap-0.5' : 'rounded-2xl px-2 py-2 gap-1'}`}
            style={{ width: itemW }}
            aria-label={`${placeValue(p)} block`}
          >
            <div className={`${compact ? 'h-7' : 'h-12'} flex items-center justify-center`}>
              <Block place={p} size={shapeOf(p) === 'rod' ? Math.min(compact ? 44 : 96, itemW - 10) : compact ? 26 : 46} />
            </div>
            <PaletteValue place={p} width={itemW - (compact ? 4 : 16)} max={compact ? 10 : 18} min={compact ? 7 : 10} colour={colours(groupOf(p)).ink} />
            <div className={`${compact ? 'text-[10px]' : 'text-sm'} font-bold text-slate-500 leading-none`}>{power(p)}</div>
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
