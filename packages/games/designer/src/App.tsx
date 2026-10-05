import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { Character } from './Character'
import { bounds, drawBody } from './draw'
import { DEFAULT_LOOK, fromDesign, next, surprise, toDesign, type Design, type Look } from './look'
import { fmt, readout, shapesFor, startSlots, type Shape } from './shapes'

const sfx = new Map<string, HTMLAudioElement>()
function play(name: 'pop' | 'whoosh' | 'celebrate', volume = 0.6) {
  let a = sfx.get(name)
  if (!a) {
    a = new Audio(`/games/shared/sfx/${name}.mp3`)
    sfx.set(name, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}

const PARTS: { part: keyof Look; emoji: string; label: string }[] = [
  { part: 'eyes', emoji: '👀', label: 'Eyes' },
  { part: 'mouth', emoji: '👄', label: 'Mouth' },
  { part: 'arms', emoji: '💪', label: 'Arms' },
  { part: 'legs', emoji: '🦵', label: 'Legs' },
  { part: 'hat', emoji: '🎩', label: 'Hat' },
]

const sameShape = (a: Shape, b: Shape) => a.kind === b.kind && a.cols === b.cols && a.rows === b.rows && a.left === b.left

/** The saved state: the number on show, the look, and every number he has designed (the format LavaBlocks can read). */
interface Saved {
  n: string
  look: Look
  designs: Record<string, Design>
}

function load(raw: string | null): Saved {
  try {
    const s = JSON.parse(raw ?? '') as Saved
    if (typeof s.n === 'string' && /^\d+$/.test(s.n)) return { n: s.n, look: { ...DEFAULT_LOOK, ...s.look }, designs: s.designs ?? {} }
  } catch {
    /* a fresh start */
  }
  return { n: '7', look: DEFAULT_LOOK, designs: {} }
}

/**
 * Designer (Character-Designer-research.md): make your own Numberblock for
 * any number — boundless. Pick a number, tap a shape, drag the leftover
 * blocks, and tap the part buttons to change eyes, mouth, arms, legs and hat.
 */
function App({ services }: GameProps) {
  const [saved] = useState(() => load(services.storage.get('designer')))
  const [designs, setDesigns] = useState<Record<string, Design>>(saved.designs)
  const [n, setN] = useState<bigint>(() => BigInt(saved.n))
  const [look, setLook] = useState<Look>(saved.look)
  const shapes = useMemo(() => shapesFor(n), [n])
  // The shape and leftovers: from his saved design for this number, else the almost-square.
  const [pick, setPick] = useState<{ n: bigint; shape: Shape; leftovers: number[] }>(() => {
    const d = saved.designs[saved.n] ? fromDesign(saved.designs[saved.n]) : null
    const sh = shapesFor(BigInt(saved.n))
    const shape = d && sh.some((s) => sameShape(s, d.shape)) ? d.shape : sh[0]
    return { n: BigInt(saved.n), shape, leftovers: d && sameShape(shape, d.shape) ? d.leftovers : startSlots(shape) }
  })
  const [jump, setJump] = useState(0)
  const [keypad, setKeypad] = useState(false)

  useEffect(() => services.storage.set('designer', JSON.stringify({ n: n.toString(), look, designs } satisfies Saved)), [services, n, look, designs])

  const keep = (shape: Shape, leftovers: number[], lk = look) => setDesigns((d) => ({ ...d, [n.toString()]: toDesign(n, shape, leftovers, lk) }))

  /** A new number: his design for it if he made one; otherwise the same kind of shape if it has one, keeping his look. */
  const goTo = (m: bigint) => {
    if (m < 1n) return
    const sh = shapesFor(m)
    const d = designs[m.toString()] ? fromDesign(designs[m.toString()]) : null
    let shape = sh.find((s) => s.kind === pick.shape.kind) ?? sh[0]
    if (d && sh.some((s) => sameShape(s, d.shape))) shape = d.shape
    setN(m)
    setPick({ n: m, shape, leftovers: d && sameShape(shape, d.shape) ? d.leftovers : startSlots(shape) })
    if (d) setLook(d.look)
    play('pop', 0.4)
  }

  const choose = (shape: Shape) => {
    const leftovers = startSlots(shape)
    setPick({ n, shape, leftovers })
    keep(shape, leftovers)
    play('whoosh', 0.4)
  }

  const restyle = (lk: Look) => {
    setLook(lk)
    keep(pick.shape, pick.leftovers, lk)
    play('pop', 0.5)
  }

  const current = pick.n === n ? pick : { n, shape: shapes[0], leftovers: startSlots(shapes[0]) }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-sky-100 to-amber-50 text-slate-900 select-none overflow-hidden">
      {/* The number: − and + to step, the keypad for any number at all. */}
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Home">
          ←
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
          <BigButton onClick={() => goTo(n - 1n)} label="One less" disabled={n <= 1n}>
            −
          </BigButton>
          <button type="button" onClick={() => setKeypad(true)} className="min-w-0 px-4 py-1 rounded-2xl bg-white shadow font-black tabular-nums text-sky-700 break-all leading-tight" style={{ fontSize: `clamp(1.6rem, ${Math.max(2.5, 9 - fmt(n).length * 0.25)}vw, 3.75rem)` }} aria-label="Type a number">
            {fmt(n)}
          </button>
          <BigButton onClick={() => goTo(n + 1n)} label="One more">
            +
          </BigButton>
        </div>
        <div className="w-12 shrink-0" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-2 px-2">
        {/* The character and what he's made of. */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <Character
              n={current.n}
              shape={current.shape}
              leftovers={current.leftovers}
              look={look}
              jump={jump}
              onTap={() => {
                setJump((j) => j + 1)
                play('celebrate', 0.35)
              }}
              onMove={(index, slot) => {
                const leftovers = current.leftovers.map((s, i) => (i === index ? slot : s))
                setPick({ ...current, leftovers })
                keep(current.shape, leftovers)
                play('pop', 0.5)
              }}
            />
          </div>
          <div className="text-center font-black text-slate-700 tabular-nums break-all py-1" style={{ fontSize: 'clamp(1.1rem, 3.2vw, 2.2rem)' }}>
            {readout(current.n, current.shape)}
          </div>
        </div>

        {/* Shapes he can make. */}
        <div className="flex landscape:flex-col gap-2 justify-start landscape:justify-center overflow-x-auto landscape:overflow-y-auto shrink-0 landscape:w-36 pb-1">
          {shapes.map((s) => (
            <ShapeCard key={`${s.kind}-${s.cols}-${s.rows}-${s.left}`} n={n} shape={s} on={sameShape(s, current.shape)} onClick={() => choose(s)} />
          ))}
        </div>
      </div>

      {/* Dress him up: each tap is the next style. */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 p-2">
        {PARTS.map((p) => (
          <button key={p.part} type="button" onClick={() => restyle(next(look, p.part))} aria-label={p.label} className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow text-3xl sm:text-4xl active:scale-95 transition-transform">
            {p.emoji}
          </button>
        ))}
        <button type="button" onClick={() => restyle(surprise())} aria-label="Surprise" className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-300 shadow text-3xl sm:text-4xl active:scale-95 transition-transform">
          🎲
        </button>
      </div>

      {keypad && (
        <Keypad
          start={n}
          onDone={(m) => {
            setKeypad(false)
            if (m !== null && m >= 1n) goTo(m)
          }}
        />
      )}
    </div>
  )
}

function BigButton({ onClick, label, disabled, children }: { onClick: () => void; label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-400 text-white text-4xl font-black shadow shrink-0 disabled:opacity-30 active:scale-95 transition-transform">
      {children}
    </button>
  )
}

/** A shape to pick: a little picture of it, and its sum. */
function ShapeCard({ n, shape, on, onClick }: { n: bigint; shape: Shape; on: boolean; onClick: () => void }) {
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
    const b = bounds(shape)
    // Just the blocks (the body's own extent).
    const bw = b.x1 - b.x0
    const bh = b.y1 - b.y0
    const scale = Math.min(w / bw, h / bh) * 0.95
    g.setTransform(scale * dpr, 0, 0, -scale * dpr, (w / 2 - ((b.x0 + b.x1) / 2) * scale) * dpr, (h / 2 + ((b.y0 + b.y1) / 2) * scale) * dpr)
    drawBody(g, n, shape, startSlots(shape), scale)
  }, [n, shape])
  const label = shape.kind === 'steps' ? 'steps' : `${fmt(shape.cols)} × ${fmt(shape.rows)}${shape.left ? ` + ${fmt(shape.left)}` : ''}`
  return (
    <button type="button" onClick={onClick} className={`shrink-0 w-28 landscape:w-full rounded-2xl p-1.5 flex flex-col items-center gap-1 shadow transition-colors ${on ? 'bg-sky-500 text-white' : 'bg-white text-slate-600'}`}>
      <canvas ref={ref} className="w-full h-16 landscape:h-20" />
      <span className="text-sm font-black tabular-nums truncate max-w-full">{label}</span>
    </button>
  )
}

/** Type any number at all. */
function Keypad({ start, onDone }: { start: bigint; onDone: (n: bigint | null) => void }) {
  const [typed, setTyped] = useState(start.toString())
  const key = (k: string, cls = 'bg-white') => (
    <button
      key={k}
      type="button"
      onClick={() => (k === '⌫' ? setTyped((t) => t.slice(0, -1)) : k === '✓' ? onDone(typed ? BigInt(typed) : null) : setTyped((t) => (t === '0' ? k : t + k)))}
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

export default App
