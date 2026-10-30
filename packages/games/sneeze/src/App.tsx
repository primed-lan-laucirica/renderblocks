import { useEffect, useMemo, useRef, useState } from 'react'
import { numberToClips, playClips, type GameProps } from '@renderblocks/kernel'
import { bounds } from '@renderblocks/designer/draw'
import { DEFAULT_LOOK, fromDesign, type Design, type Look } from '@renderblocks/designer/look'
import { drawPiece, LIMB, squareShape } from './draw'
import { choices, fmt, ROUNDS, show, sneeze, sqrt, squaresAround, value, wears, type Rule, type Sneeze } from './rules'
import { initPhysics, Stage, STEP, type Piece } from './sim'
import { choo, correct, pop, sniff, squarePower, thud, wake, windup, wrong } from './sound'

/** His Designer looks, by number (from the shared "designs" record): a square or ring wears the look he made for its number. */
function looksFrom(raw: string | null): Map<string, Look> {
  const out = new Map<string, Look>()
  try {
    for (const d of Object.values(JSON.parse(raw ?? '{}') as Record<string, Design>)) {
      const x = fromDesign(d)
      if (x) out.set(x.n.toString(), x.look)
    }
  } catch {
    /* no designs */
  }
  return out
}

/** How far a look's legs reach below the body, as a share of its side (it stands on them; legs are in proportion at every size). */
function legsShare(look: Look): number {
  if (look.legs === 'none') return 0
  return ((look.legs === 'long' ? 0.85 : 0.45) + 0.14) * LIMB
}

/** A number of cells (100^-k blocks) as number-voice clips: 0.0036 is "zero point zero zero three six". */
const clipsOf = (cells: bigint, k: number) => numberToClips(value(cells, k), 2 * k)

/** The Square Club starts: 4 to 400. */
const SQUARES = Array.from({ length: 19 }, (_, i) => BigInt(i + 2))

/** A square drawn to fit a box (start cards). */
function Portrait({ side, look }: { side: bigint; look: Look }) {
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
    const b = bounds(squareShape(side))
    const scale = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * 0.95
    g.setTransform(scale * dpr, 0, 0, -scale * dpr, (w / 2 - ((b.x0 + b.x1) / 2) * scale) * dpr, (h / 2 + ((b.y0 + b.y1) / 2) * scale) * dpr)
    drawPiece(g, side * side, side, 0n, look, scale)
  }, [side, look])
  return <canvas ref={ref} className="w-full h-full" />
}

/**
 * Sneeze² ("sneeze squared"; Lan, Oct 13 2026; research report in Drive SneezeBlocks/):
 * a square sneezes out the square from its middle and keeps a ring, and the
 * square that flew out sneezes in turn, all the way down (below 4, in tenths
 * and hundredths, to 0.0001). Two rules — the show's ring (100 → 36 + 64) and
 * the big sneeze, half the side at every size (64 → 48 + 16).
 */
function App({ services }: GameProps) {
  const looks = useMemo(() => looksFrom(services.shared.get('designs')), [services])
  const storage = services.storage
  // Big sneeze by default (Lan, Oct 13). A new key, so the ring that v1.78 saved as its default doesn't stick.
  const [rule, setRule] = useState<Rule>(() => (storage.get('rule2') === 'ring' ? 'ring' : 'big'))
  const [guess, setGuess] = useState(() => storage.get('guess') === 'on')
  const [start, setStart] = useState<{ side: bigint; key: number } | null>(null)
  const [keypad, setKeypad] = useState(false)
  useEffect(() => storage.set('rule2', rule), [storage, rule])
  useEffect(() => storage.set('guess', guess ? 'on' : 'off'), [storage, guess])
  const lookFor = (n: bigint) => looks.get(n.toString()) ?? DEFAULT_LOOK
  const go = (side: bigint) => {
    wake()
    setStart((s) => ({ side, key: (s?.key ?? 0) + 1 }))
  }

  if (start)
    return (
      <Play
        key={start.key}
        side={start.side}
        rule={rule}
        onRule={setRule}
        guess={guess}
        lookFor={lookFor}
        onAgain={() => go(start.side)}
        onBack={() => setStart(null)}
      />
    )

  const card = (side: bigint, top?: string) => (
    <button key={`${top ?? ''}${side}`} type="button" onClick={() => go(side)} className="relative h-36 rounded-2xl shadow p-2 flex flex-col items-center bg-white text-slate-700 active:scale-95 transition-transform">
      {top && <span className="text-xs font-black text-orange-600 leading-none">{top}</span>}
      <div className="flex-1 w-full min-h-0">
        <Portrait side={side} look={lookFor(side * side)} />
      </div>
      <span className="font-black tabular-nums text-lg leading-tight truncate max-w-full">{fmt(side * side)}</span>
      <span className="text-xs font-bold tabular-nums text-slate-400 leading-none">
        {fmt(side)} × {fmt(side)}
      </span>
    </button>
  )
  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-orange-100 to-amber-50 text-slate-900 select-none">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Home">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-700" aria-label="Sneeze squared">
          Sneeze² 🤧
        </div>
      </div>
      <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
        <RulePicker rule={rule} onRule={setRule} />
        <button
          type="button"
          onClick={() => setGuess((g) => !g)}
          className={`h-14 px-4 rounded-2xl shadow font-black text-lg ${guess ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}
          aria-label={guess ? 'Guess first: on' : 'Guess first: off'}
        >
          🤔 = ? {guess ? 'On' : 'Off'}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 flex flex-col gap-4">
        <section>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">{SQUARES.map((s) => card(s))}</div>
        </section>
        <section>
          <h2 className="font-black text-slate-600 text-lg px-1 pb-2">Rounds</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">{ROUNDS.map((r) => card(r.side, `Round ${r.round}`))}</div>
        </section>
        <div>
          <button type="button" onClick={() => setKeypad(true)} className="h-14 px-5 rounded-2xl bg-white shadow font-black text-lg text-orange-700 active:scale-95 transition-transform">
            any square 🔢
          </button>
        </div>
      </div>
      {keypad && (
        <Keypad
          onDone={(side) => {
            setKeypad(false)
            if (side) go(side)
          }}
        />
      )}
    </div>
  )
}

/** The two rules, each shown by what it does to 64. */
function RulePicker({ rule, onRule, small }: { rule: Rule; onRule: (r: Rule) => void; small?: boolean }) {
  const b = (r: Rule, label: string, eq: string) => (
    <button
      type="button"
      onClick={() => onRule(r)}
      aria-pressed={rule === r}
      className={`${small ? 'h-12 px-3' : 'h-14 px-4'} rounded-2xl shadow flex flex-col items-center justify-center leading-tight transition-colors ${rule === r ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}`}
    >
      <span className={`font-black ${small ? 'text-sm' : 'text-base'}`}>{label}</span>
      <span className="text-xs font-bold tabular-nums opacity-90">{eq}</span>
    </button>
  )
  return (
    <div className="flex gap-2">
      {b('ring', '⬜ Ring', '64 − 28 = 36')}
      {b('big', '🔲 Big sneeze', '64 − 48 = 16')}
    </div>
  )
}

/** Type any square (any size): the two squares either side are offered if it isn't one. */
function Keypad({ onDone }: { onDone: (side: bigint | null) => void }) {
  const [typed, setTyped] = useState('')
  const n = typed ? BigInt(typed) : 0n
  const root = n > 0n ? sqrt(n) : null
  const around = n > 1n && !root ? squaresAround(n) : null
  const key = (k: string, cls = 'bg-white') => (
    <button
      key={k}
      type="button"
      disabled={k === '✓' && !root}
      onClick={() => (k === '⌫' ? setTyped((t) => t.slice(0, -1)) : k === '✓' ? onDone(root) : setTyped((t) => (t.length >= 15 ? t : t === '0' ? k : t + k)))}
      className={`h-16 [@media(max-height:560px)]:h-11 rounded-2xl shadow text-3xl [@media(max-height:560px)]:text-2xl font-black active:scale-95 transition-transform disabled:opacity-30 ${cls}`}
    >
      {k}
    </button>
  )
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 [@media(max-height:560px)]:p-1 overflow-y-auto" onClick={() => onDone(null)}>
      <div className="w-full max-w-sm bg-orange-50 rounded-3xl p-4 [@media(max-height:560px)]:p-2 flex flex-col gap-3 [@media(max-height:560px)]:gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-16 [@media(max-height:560px)]:min-h-11 px-3 py-2 [@media(max-height:560px)]:py-1 rounded-2xl bg-white shadow font-black tabular-nums text-orange-700 text-3xl break-all text-center">{typed ? fmt(n) : ' '}</div>
        <div className="min-h-12 [@media(max-height:560px)]:min-h-9 flex items-center justify-center gap-2 font-black tabular-nums text-slate-600">
          {root && (
            <span className="text-xl">
              = {fmt(root)} × {fmt(root)} ✓
            </span>
          )}
          {around &&
            around
              .filter((s) => s >= 2n)
              .map((s) => (
                <button key={String(s)} type="button" onClick={() => onDone(s)} className="h-12 px-3 rounded-xl bg-white shadow text-lg active:scale-95">
                  {fmt(s * s)} <span className="text-sm text-slate-400">= {fmt(s)}²</span>
                </button>
              ))}
        </div>
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

/** How long the "ah… ah…" lasts before the CHOO (s). */
const WINDUP = 0.75
/** A shorter one when he tapped ahead (while the last was still flying). */
const WINDUP_SOON = 0.3

/** How long a square put back takes to slide into its hole (s). */
const SNAP = 0.3
/** A press that moves this far (px) is a drag, not a tap. */
const DRAG_PX = 10

/** `held`: he's carrying the square; `snapping`: it's going back into its ring (an unsneeze). */
type Phase = 'ready' | 'windup' | 'guessing' | 'choo' | 'flying' | 'done' | 'held' | 'snapping'

interface Camera {
  x: number
  /** Share of the screen below the floor (more while the guesses are up, so they don't hide the sneezer). */
  low: number
  /** Pixels per stage unit, as a log, so zooming between sizes is smooth. */
  logScale: number
}

/**
 * The stage: tap to tickle the square; it sneezes; the one that flies out
 * sneezes next. Drag it back into the ring it came out of to unsneeze (Render's
 * idea, Oct 16): the ring closes up round it, the whole square again.
 */
function Play({
  side,
  rule,
  onRule,
  guess,
  lookFor,
  onAgain,
  onBack,
}: {
  side: bigint
  rule: Rule
  onRule: (r: Rule) => void
  guess: boolean
  lookFor: (n: bigint) => Look
  onAgain: () => void
  onBack: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Stage | null>(null)
  // What's on screen, mirrored from the animation loop.
  const [phase, setPhase] = useState<Phase>('ready')
  const [last, setLast] = useState<(Sneeze & { picked?: bigint; missed?: boolean; back?: boolean }) | null>(null)
  const [flip, setFlip] = useState(false)
  const [options, setOptions] = useState<bigint[]>([])
  // Guesses he's tried that were wrong: greyed out until the sneeze.
  const [ruledOut, setRuledOut] = useState<bigint[]>([])
  const [seeAll, setSeeAll] = useState(false)
  const [rings, setRings] = useState<{ n: bigint; k: number }[]>([])
  // The square that sneezes next.
  const [sneezer, setSneezer] = useState({ n: side * side, side, k: 0 })
  // The loop reads these through a ref (they change without restarting it).
  const live = useRef({ rule, guess, seeAll, lookFor })
  useEffect(() => {
    live.current = { rule, guess, seeAll, lookFor }
  }, [rule, guess, seeAll, lookFor])
  // Commands from the buttons to the loop.
  const cmd = useRef<{ tickle: (soon?: boolean) => void; pick: (n: bigint) => void; ruleChanged: () => void } | null>(null)

  useEffect(() => {
    cmd.current?.ruleChanged()
  }, [rule])

  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    let raf = 0
    let alive = true
    let stage: Stage | null = null
    let acc = 0
    let prevNow = performance.now()
    let cam: Camera | null = null
    let ph: Phase = 'ready'
    let phaseAt = 0
    let punch = 0
    // A tap made while the last one was still flying.
    let queued = false
    // "Square power!" every so often: after a random 1–10 sneezes, then another random count.
    const roll = () => 1 + Math.floor(Math.random() * 10)
    let untilPower = roll()
    let picked: bigint | undefined
    let missed = false
    // A landing after he dropped it somewhere (not a sneeze): no "Square power!".
    let dropped = false
    // A press on the square: a tap (sneeze) unless it moves, then a drag.
    let press: { id: number; x: number; y: number; dx: number; dy: number; drag: boolean; v: { x: number; y: number }; at: number; sx: number; sy: number } | null = null
    // Sliding into its hole: from where he let go, over SNAP seconds.
    let snap: { at: number; from: { x: number; y: number; a: number } } | null = null
    // Screen ↔ stage, as drawn last frame.
    const view = { scale: 1, x: 0, w: 1, floorY: 0 }
    const toStage = (px: number, py: number) => ({ x: view.x + (px - view.w / 2) / view.scale, y: (view.floorY - py) / view.scale })
    const timers: number[] = []
    // Faces: squeezed during the wind-up, mid-sneeze on the ring for a moment after.
    let sneezedRing: Piece | null = null
    let sneezedAt = -10
    let wiggleUntil = 0
    const later = (s: number, f: () => void) => timers.push(window.setTimeout(() => alive && f(), s * 1000))
    const setP = (p: Phase) => {
      ph = p
      phaseAt = performance.now() / 1000
      setPhase(p)
      if (stage) setSneezer({ n: stage.current.n, side: stage.current.side, k: stage.current.k })
    }
    const canSneeze = () => !!stage?.peek(live.current.rule)

    const doChoo = () => {
      if (!stage) return
      const cur = stage.current
      setP('choo')
      const d = choo(cur.n)
      punch = 1
      later(d, () => {
        if (!stage) return
        const r = stage.sneeze(live.current.rule)
        if (!r) return setP('ready')
        sneezedRing = r.ring
        sneezedAt = performance.now() / 1000
        setLast({ ...r.s, picked, missed })
        setFlip(false)
        setRings((x) => [...x, { n: r.s.ring, k: r.s.k }])
        if (picked !== undefined && picked === r.s.out) correct()
        setOptions([])
        setRuledOut([])
        setP('flying')
      })
    }

    cmd.current = {
      tickle: (soon = false) => {
        wake()
        if (!stage) return
        // He taps fast: a tap while one is on its way is kept, and it sneezes the moment it lands.
        if (ph === 'flying' || ph === 'windup' || ph === 'choo') {
          queued = true
          return
        }
        if (ph === 'ready' || ph === 'done') {
          if (!canSneeze()) {
            // Nothing left to sneeze: a little shake.
            wiggleUntil = performance.now() / 1000 + 0.5
            thud(0.3, 0)
            setP('done')
            return
          }
          picked = undefined
          missed = false
          setRuledOut([])
          windup(stage.current.n)
          if (live.current.guess) {
            setOptions(choices(stage.current.side, live.current.rule, stage.sneezes + Number(stage.current.side % 97n), stage.current.k))
            setP('guessing')
          } else {
            setP('windup')
            later(soon ? WINDUP_SOON : WINDUP, doChoo)
          }
        }
      },
      pick: (n) => {
        if (ph !== 'guessing' || !stage) return
        // A wrong guess won't make it sneeze: a buzz, a shake of the head, and he guesses again.
        if (n !== sneeze(stage.current.side, live.current.rule, stage.current.k)?.out) {
          wrong()
          missed = true
          wiggleUntil = performance.now() / 1000 + 0.5
          setRuledOut((x) => [...x, n])
          return
        }
        picked = n
        doChoo()
      },
      ruleChanged: () => {
        if (!stage) return
        if (ph === 'done' && canSneeze()) setP('ready')
        else if (ph === 'ready' && !canSneeze() && stage.current.settled) setP('done')
        else if (ph === 'guessing') {
          setOptions(choices(stage.current.side, live.current.rule, stage.sneezes, stage.current.k))
          setRuledOut([])
        }
      },
    }

    // Where each number is drawn (screen px), so a tap on one says it.
    let hits: { x0: number; y0: number; x1: number; y1: number; n: bigint; k: number }[] = []
    const down = (e: PointerEvent) => {
      const box = el.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      // Smallest (topmost-drawn last) first, so a little one's number wins over a big one's.
      const hit = [...hits].reverse().find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
      if (hit) {
        wake()
        playClips(clipsOf(hit.n, hit.k))
        return
      }
      // On the square that's waiting (or one he dropped, even still falling): it might be picked up (to put back in its ring).
      const cur = stage?.current
      if (cur && (((ph === 'ready' || ph === 'done') && cur.settled) || (ph === 'flying' && cur.dropped))) {
        const at = toStage(x, y)
        const c = Math.cos(-cur.cur.a)
        const sn = Math.sin(-cur.cur.a)
        const lx = (at.x - cur.cur.x) * c - (at.y - cur.cur.y) * sn
        const ly = (at.x - cur.cur.x) * sn + (at.y - cur.cur.y) * c
        // Generous: a little more than the square, and never less than a fingertip.
        const reach = Math.max((cur.size / 2) * 1.15, 32 / view.scale)
        if (Math.abs(lx) < reach && Math.abs(ly) < reach) {
          wake()
          el.setPointerCapture(e.pointerId)
          press = { id: e.pointerId, x, y, dx: cur.cur.x - at.x, dy: cur.cur.y - at.y, drag: false, v: { x: 0, y: 0 }, at: performance.now(), sx: at.x, sy: at.y }
          return
        }
      }
      cmd.current?.tickle()
    }
    const move = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id || !stage) return
      const box = el.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      if (!press.drag) {
        if (Math.hypot(x - press.x, y - press.y) < DRAG_PX) return
        if (!stage.grab()) return
        press.drag = true
        setP('held')
      }
      const at = toStage(x, y)
      // His finger's speed (stage units/s, smoothed), for a fling when he lets go.
      const now = performance.now()
      const dt = Math.max(1, now - press.at) / 1000
      const k = Math.min(1, dt / 0.08)
      press.v = { x: press.v.x + ((at.x - press.sx) / dt - press.v.x) * k, y: press.v.y + ((at.y - press.sy) / dt - press.v.y) * k }
      press.at = now
      press.sx = at.x
      press.sy = at.y
      stage.holdAt(at.x + press.dx, at.y + press.dy, 0)
    }
    const up = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id || !stage) return
      const p = press
      press = null
      if (!p.drag) return cmd.current?.tickle()
      // Let go over its ring: sniffed back in. Anywhere else: it drops and lands.
      if (e.type === 'pointerup' && stage.fits()) {
        sniff(stage.current.n)
        snap = { at: performance.now() / 1000, from: { ...stage.current.cur } }
        setP('snapping')
      } else {
        stage.release(performance.now() - p.at < 100 ? p.v : { x: 0, y: 0 })
        dropped = true
        setP('flying')
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)

    const frame = (now: number) => {
      if (!alive || !stage) return
      const t = now / 1000
      acc = Math.min(0.1, acc + (now - prevNow) / 1000)
      prevNow = now
      while (acc >= STEP) {
        for (const th of stage.step()) thud(th.strength, Math.min(1, Math.log10(1 + th.size)))
        acc -= STEP
      }
      // Landed: on to the next sneeze (or the end). Nothing is said unless he taps a number or the sum.
      if (ph === 'flying' && stage.current.settled) {
        if (dropped) dropped = false
        else if (--untilPower <= 0) {
          untilPower = roll()
          squarePower()
        }
        setP(canSneeze() ? 'ready' : 'done')
        if (queued) {
          queued = false
          cmd.current?.tickle(true)
        }
      }

      // Going back in: it slides into the middle of its ring, turned to match it; then the ring closes up.
      if (ph === 'snapping' && snap && stage.current.from) {
        const ring = stage.current.from
        const f = Math.min(1, (t - snap.at) / SNAP)
        const e = 1 - (1 - f) ** 3
        // The nearest way round to the ring's angle (a square looks the same every quarter turn).
        const q = Math.PI / 2
        const target = ring.cur.a + Math.round((snap.from.a - ring.cur.a) / q) * q
        stage.holdAt(snap.from.x + (ring.cur.x - snap.from.x) * e, snap.from.y + (ring.cur.y - snap.from.y) * e, snap.from.a + (target - snap.from.a) * e)
        if (f >= 1) {
          const whole = stage.unsneeze()
          snap = null
          if (whole) {
            pop(Math.min(1, Math.log10(1 + whole.size) / 2))
            setLast({ whole: ring.side * ring.side, out: ring.hole * ring.hole, ring: ring.n, side: ring.side, outSide: ring.hole, k: ring.k, back: true })
            setFlip(true)
            setRings((x) => x.slice(0, -1))
            sneezedRing = whole
            sneezedAt = t
          } else stage.release()
          setP(canSneeze() ? 'ready' : 'done')
        }
      }

      const w = el.clientWidth
      const h = el.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      // Camera: the square about to sneeze and the ring it came out of (or everything).
      let x0 = Infinity
      let x1 = -Infinity
      let top = 0
      const focus = live.current.seeAll ? stage.pieces : [stage.current, ...(stage.current.from ? [stage.current.from] : [])]
      for (const p of focus) {
        const r = (p.size / 2) * 1.3
        x0 = Math.min(x0, p.cur.x - r)
        x1 = Math.max(x1, p.cur.x + r)
        top = Math.max(top, p.cur.y + r)
      }
      const needW = (x1 - x0) * 1.25
      const needH = top * 1.5
      // Room at the top for the buttons and the sum, at the bottom for the floor.
      const low = ph === 'guessing' ? Math.min(0.42, 190 / h) : 0.12
      const want: Camera = { x: (x0 + x1) / 2, low, logScale: Math.log(Math.min(w / needW, (h * (0.92 - low)) / needH)) }
      if (!cam) cam = want
      else if (ph === 'held' || ph === 'snapping') {
        // Still while he carries it, so the ring doesn't move away from his finger.
      } else {
        const k = 1 - Math.exp(-STEP * 60 * 0.06)
        cam = { x: cam.x + (want.x - cam.x) * k, low: cam.low + (want.low - cam.low) * k, logScale: cam.logScale + (want.logScale - cam.logScale) * k }
      }
      punch *= 0.9
      const scale = Math.exp(cam.logScale) * (1 + 0.06 * punch)
      // Screen from stage (computed in doubles, so a ten-billionth of the screen is still exact).
      const sx = (x: number) => w / 2 + (x - cam!.x) * scale
      const floorY = h - cam.low * h
      Object.assign(view, { scale, x: cam.x, w, floorY })
      ;(window as unknown as { __sneezeView?: typeof view }).__sneezeView = view
      const sy = (y: number) => floorY - y * scale

      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#FFF7ED')
      sky.addColorStop(1, '#FFEDD5')
      g.fillStyle = sky
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#E7D3B5'
      g.fillRect(0, floorY, w, h - floorY)
      g.fillStyle = '#C9AE88'
      g.fillRect(0, floorY, w, 3)

      const labels: { x: number; y: number; size: number; text: string; n: bigint; k: number }[] = []
      for (const p of stage.pieces) {
        const px = p.size * scale
        const cx = sx(p.cur.x)
        const cy = sy(p.cur.y)
        if (px < 0.4 || cx + px < -50 || cx - px > w + 50 || cy + px < -50 || cy - px > h + 50) continue
        let angle = p.cur.a
        const side = Number(p.side)
        const perBlock = px / side
        const isCur = p === stage.current
        // The wind-up: squashing down, ready to sneeze; a tickly wiggle while it waits.
        const since = t - phaseAt
        let squash = 0
        if (isCur && (ph === 'windup' || ph === 'guessing')) squash = Math.min(1, since / WINDUP) * (ph === 'guessing' ? 0.8 + 0.1 * Math.sin(t * 18) : 1)
        if (isCur && ph === 'choo') squash = 1
        if (isCur && t < wiggleUntil) angle += Math.sin(t * 40) * 0.05
        if (isCur && ph === 'ready' && p.settled && since > 2.5) angle += Math.sin(t * 9) * 0.015 * Math.max(0, Math.sin(t * 1.3))
        // A decimal wears the look of the number with its digits (0.36: 36's).
        const like = wears(p.n, p.k)
        const base = live.current.lookFor(like.n)
        const look: Look =
          isCur && (ph === 'windup' || ph === 'guessing' || ph === 'choo')
            ? { ...base, eyes: 'sleepy', mouth: 'o' }
            : p === sneezedRing && t - sneezedAt < 0.8
              ? { ...base, eyes: 'sleepy', mouth: 'grin' }
              : base
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(cx, cy)
        g.rotate(-angle)
        // Squash about the bottom edge.
        g.translate(0, px / 2)
        g.scale(1 + 0.07 * squash, 1 - 0.12 * squash)
        g.translate(0, -px / 2)
        g.scale(perBlock, -perBlock)
        g.translate(-side / 2, -side / 2)
        drawPiece(g, p.n, p.side, p.hole, look, perBlock, 0, p.k, like)
        if (px >= 14) labels.push({ x: cx, y: cy - px * 0.5 * (1 - 0.12 * squash) - (look.hat !== 'none' ? px * 0.25 : 0), size: Math.max(16, Math.min(48, 0.16 * px)), text: show(p.n, p.k), n: p.n, k: p.k })
      }
      // Numberlings: plain bold black, upright, above each one.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.textAlign = 'center'
      g.fillStyle = '#000'
      hits = []
      ;(window as unknown as { __sneezeHits?: typeof hits }).__sneezeHits = hits
      for (const l of labels) {
        g.font = `800 ${Math.round(l.size)}px Nunito, system-ui, sans-serif`
        const y = l.y - l.size * 0.35
        g.fillText(l.text, l.x, y)
        // A generous target round the number.
        const half = g.measureText(l.text).width / 2 + 12
        hits.push({ x0: l.x - half, x1: l.x + half, y0: y - l.size - 8, y1: y + 10, n: l.n, k: l.k })
      }
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      // Each one stands on the legs of the look it wears.
      stage = new Stage(side, (n, _side, k) => legsShare(live.current.lookFor(wears(n, k).n)))
      stageRef.current = stage
      ;(window as unknown as { __sneeze?: () => Stage | null }).__sneeze = () => stageRef.current
      prevNow = performance.now()
      if (!stage.peek(live.current.rule)) setP('done')
      raf = requestAnimationFrame(frame)
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      for (const id of timers) clearTimeout(id)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      stage?.free()
      stageRef.current = null
      cmd.current = null
    }
  }, [side])

  const whole = side * side
  // What the sneezer would sneeze now (for the guesses).
  const next = sneeze(sneezer.side, rule, sneezer.k)
  const parts = [...rings, sneezer].map((p) => show(p.n, p.k))
  const sum = parts.length > 7 ? `${parts.slice(0, 4).join(' + ')} + … + ${parts.slice(-2).join(' + ')}` : parts.join(' + ')
  // Right first time gets the tick.
  const right = last && last.picked !== undefined && last.picked === last.out && !last.missed
  // Decimal sums are long (0.0036 − 0.0016 = 0.0020): smaller, so a phone shows it all.
  const long = !!last && (show(last.whole, last.k) + show(last.out, last.k) + show(last.ring, last.k)).length > 15
  // The sum as shown, as number-voice clips (said only when he taps it).
  const sumClips = !last
    ? [...numberToClips(whole), 'equals', ...numberToClips(side), 'times', ...numberToClips(side)]
    : flip
      ? [...clipsOf(last.out, last.k), 'plus', ...clipsOf(last.ring, last.k), 'equals', ...clipsOf(last.whole, last.k)]
      : [...clipsOf(last.whole, last.k), 'minus', ...clipsOf(last.ring, last.k), 'equals', ...clipsOf(last.out, last.k)]

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none bg-orange-50">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full touch-none" />
      <div className="absolute top-3 left-3 flex gap-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={() => setSeeAll((s) => !s)}
          className={`w-12 h-12 rounded-full shadow text-2xl ${seeAll ? 'bg-orange-500' : 'bg-white/90'}`}
          aria-label={seeAll ? 'Follow the sneezer' : 'See them all'}
        >
          🔭
        </button>
        <button type="button" onClick={onAgain} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Start again">
          ↺
        </button>
      </div>
      {/* The sum: the last sneeze. A tap says it; ⇄ turns it round (100 − 36 = 64 ⇄ 64 + 36 = 100: it lands on the square that came out). */}
      <div className="absolute top-[4.25rem] inset-x-3 sm:inset-x-auto sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[calc(100%-8.5rem)] flex gap-2">
      <button
        type="button"
        onClick={() => {
          wake()
          playClips(sumClips)
        }}
        className={`flex-1 min-w-0 h-14 rounded-2xl bg-white/90 shadow font-black tabular-nums sm:text-3xl ${long ? 'px-2 text-lg' : 'px-4 text-2xl'} text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis active:scale-95 transition-transform`}
        aria-label="The sum"
      >
        {!last ? (
          <>
            {fmt(whole)} = {fmt(side)} × {fmt(side)}
          </>
        ) : flip ? (
          <>
            <span className={right ? 'text-emerald-600' : ''}>{show(last.out, last.k)}</span> + {show(last.ring, last.k)} = {show(last.whole, last.k)}
          </>
        ) : (
          <>
            {show(last.whole, last.k)} − {show(last.ring, last.k)} = <span className={right ? 'text-emerald-600' : ''}>{show(last.out, last.k)}</span>
            {right && ' ✓'}
          </>
        )}
      </button>
      {last && (
        <button type="button" onClick={() => setFlip((f) => !f)} className="shrink-0 w-14 h-14 rounded-2xl bg-white/90 shadow text-2xl font-black text-slate-600 active:scale-95 transition-transform" aria-label="Turn the sum round">
          ⇄
        </button>
      )}
      </div>
      {/* Guess first: what comes out? Only the right answer sneezes (with a chime); a wrong one buzzes and greys out. */}
      {phase === 'guessing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] flex flex-col items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="px-4 py-1 rounded-2xl bg-white/90 shadow font-black tabular-nums text-xl sm:text-2xl text-slate-700 whitespace-nowrap">
            {show(sneezer.n, sneezer.k)} − {next ? show(next.ring, next.k) : ''} = ?
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {options.map((o) => (
              <button
                key={String(o)}
                type="button"
                disabled={ruledOut.includes(o)}
                onClick={() => cmd.current?.pick(o)}
                className="min-w-24 h-16 sm:h-20 px-3 sm:px-4 rounded-2xl bg-orange-500 text-white shadow-lg font-black tabular-nums text-2xl sm:text-3xl active:scale-95 transition-transform disabled:bg-slate-300 disabled:text-slate-400 disabled:shadow-none"
              >
                {show(o, next?.k ?? 0)}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* All sneezed out: the whole number, as every piece it became. */}
      {phase === 'done' && rings.length > 0 && (
        <div className="absolute top-36 sm:top-20 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-2rem)] px-4 py-2 rounded-2xl bg-white/90 shadow font-black tabular-nums text-xl sm:text-2xl text-slate-800 text-center" onPointerDown={(e) => e.stopPropagation()}>
          {fmt(whole)} = {sum}
          {parts.length > 7 && <span className="block text-sm text-slate-400">{parts.length} numbers</span>}
        </div>
      )}
      <div className={`absolute left-3 ${phase === 'guessing' ? 'top-36 sm:top-20' : 'bottom-4'}`} onPointerDown={(e) => e.stopPropagation()}>
        <RulePicker rule={rule} onRule={onRule} small />
      </div>
    </div>
  )
}

export default App
