import { useEffect, useMemo, useRef, useState } from 'react'
import { numberToClips, playClips, type GameProps } from '@renderblocks/kernel'
import { bounds, featureUnit } from '@renderblocks/designer/draw'
import { DEFAULT_LOOK, fromDesign, type Design, type Look } from '@renderblocks/designer/look'
import { drawPiece, squareShape } from './draw'
import { choices, fmt, ROUNDS, sneeze, sqrt, squaresAround, type Rule, type Sneeze } from './rules'
import { initPhysics, Stage, STEP, type Piece } from './sim'
import { blessYou, choo, correct, thud, wake, windup } from './sound'

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

/** How far a look's legs reach below the body, as a share of its side (it stands on them). */
function legsShare(side: bigint, look: Look): number {
  if (look.legs === 'none') return 0
  const u = featureUnit(squareShape(side))
  return ((look.legs === 'long' ? 0.85 : 0.45) * u + 0.14 * u) / Number(side)
}

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
 * SneezeBlocks (Lan, Oct 13 2026; research report in Drive SneezeBlocks/):
 * a square sneezes out the square from its middle and keeps a ring, and the
 * square that flew out sneezes in turn, all the way down. Two rules — the
 * show's ring (100 → 36 + 64) and RATOT's big sneeze (64 → 48 + 16).
 */
function App({ services }: GameProps) {
  const looks = useMemo(() => looksFrom(services.shared.get('designs')), [services])
  const storage = services.storage
  const [rule, setRule] = useState<Rule>(() => (storage.get('rule') === 'big' ? 'big' : 'ring'))
  const [guess, setGuess] = useState(() => storage.get('guess') === 'on')
  const [start, setStart] = useState<{ side: bigint; key: number } | null>(null)
  const [keypad, setKeypad] = useState(false)
  useEffect(() => storage.set('rule', rule), [storage, rule])
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
        <div className="flex-1 text-center text-2xl font-black text-slate-700">SneezeBlocks 🤧</div>
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
      {b('ring', '⬜ Ring', '64 − 36 = 28')}
      {b('big', '🔲 Big sneeze', '64 − 16 = 48')}
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

type Phase = 'ready' | 'windup' | 'guessing' | 'choo' | 'flying' | 'done'

interface Camera {
  x: number
  /** Share of the screen below the floor (more while the guesses are up, so they don't hide the sneezer). */
  low: number
  /** Pixels per stage unit, as a log, so zooming between sizes is smooth. */
  logScale: number
}

/** The stage: tap to tickle the square; it sneezes; the one that flies out sneezes next. */
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
  const [last, setLast] = useState<(Sneeze & { picked?: bigint }) | null>(null)
  const [flip, setFlip] = useState(false)
  const [options, setOptions] = useState<bigint[]>([])
  const [seeAll, setSeeAll] = useState(false)
  const [rings, setRings] = useState<bigint[]>([])
  // The square that sneezes next.
  const [sneezer, setSneezer] = useState({ n: side * side, side })
  // The loop reads these through a ref (they change without restarting it).
  const live = useRef({ rule, guess, seeAll, lookFor })
  useEffect(() => {
    live.current = { rule, guess, seeAll, lookFor }
  }, [rule, guess, seeAll, lookFor])
  // The last sneeze, for the loop's "say it when it lands".
  const lastRef = useRef(last)
  useEffect(() => {
    lastRef.current = last
  }, [last])
  // Commands from the buttons to the loop.
  const cmd = useRef<{ tickle: () => void; pick: (n: bigint) => void; ruleChanged: () => void } | null>(null)

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
    let picked: bigint | undefined
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
      if (stage) setSneezer({ n: stage.current.n, side: stage.current.side })
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
        setLast({ ...r.s, picked })
        setFlip(false)
        setRings((x) => [...x, r.s.ring])
        if (picked !== undefined && picked === r.s.ring) correct()
        setOptions([])
        setP('flying')
        later(0.6, blessYou)
      })
    }

    cmd.current = {
      tickle: () => {
        wake()
        if (!stage) return
        if (ph === 'ready' || ph === 'done') {
          if (!canSneeze()) {
            // Nothing left to sneeze: a little shake.
            wiggleUntil = performance.now() / 1000 + 0.5
            thud(0.3, 0)
            setP('done')
            return
          }
          picked = undefined
          windup(stage.current.n)
          if (live.current.guess) {
            setOptions(choices(stage.current.side, live.current.rule, stage.sneezes + Number(stage.current.side % 97n)))
            setP('guessing')
          } else {
            setP('windup')
            later(WINDUP, doChoo)
          }
        }
      },
      pick: (n) => {
        if (ph !== 'guessing') return
        picked = n
        doChoo()
      },
      ruleChanged: () => {
        if (!stage) return
        if (ph === 'done' && canSneeze()) setP('ready')
        else if (ph === 'ready' && !canSneeze() && stage.current.settled) setP('done')
        else if (ph === 'guessing') setOptions(choices(stage.current.side, live.current.rule, stage.sneezes))
      },
    }

    const down = () => cmd.current?.tickle()
    el.addEventListener('pointerdown', down)

    const frame = (now: number) => {
      if (!alive || !stage) return
      const t = now / 1000
      acc = Math.min(0.1, acc + (now - prevNow) / 1000)
      prevNow = now
      while (acc >= STEP) {
        for (const th of stage.step()) thud(th.strength, Math.min(1, Math.log10(1 + th.size)))
        acc -= STEP
      }
      // Landed: say the sum, then on to the next sneeze (or the end).
      if (ph === 'flying' && stage.current.settled) {
        const said = lastRef.current
        if (said) playClips([...numberToClips(said.whole), 'minus', ...numberToClips(said.out), 'equals', ...numberToClips(said.ring)])
        setP(canSneeze() ? 'ready' : 'done')
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
      else {
        const k = 1 - Math.exp(-STEP * 60 * 0.06)
        cam = { x: cam.x + (want.x - cam.x) * k, low: cam.low + (want.low - cam.low) * k, logScale: cam.logScale + (want.logScale - cam.logScale) * k }
      }
      punch *= 0.9
      const scale = Math.exp(cam.logScale) * (1 + 0.06 * punch)
      // Screen from stage (computed in doubles, so a ten-billionth of the screen is still exact).
      const sx = (x: number) => w / 2 + (x - cam!.x) * scale
      const floorY = h - cam.low * h
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

      const labels: { x: number; y: number; size: number; text: string }[] = []
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
        const base = live.current.lookFor(p.n)
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
        drawPiece(g, p.n, p.side, p.hole, look, perBlock)
        if (px >= 14) labels.push({ x: cx, y: cy - px * 0.5 * (1 - 0.12 * squash) - (look.hat !== 'none' ? px * 0.25 : 0), size: Math.max(16, Math.min(48, 0.16 * px)), text: fmt(p.n) })
      }
      // Numberlings: plain bold black, upright, above each one.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.textAlign = 'center'
      g.fillStyle = '#000'
      for (const l of labels) {
        g.font = `800 ${Math.round(l.size)}px Nunito, system-ui, sans-serif`
        g.fillText(l.text, l.x, l.y - l.size * 0.35)
      }
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      // Each one stands on the legs of the look it wears.
      stage = new Stage(side, (n, of) => legsShare(of, live.current.lookFor(n)))
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
      stage?.free()
      stageRef.current = null
      cmd.current = null
    }
  }, [side])

  const whole = side * side
  const parts = [...rings, sneezer.n]
  const sum = parts.length > 7 ? `${parts.slice(0, 4).map(fmt).join(' + ')} + … + ${parts.slice(-2).map(fmt).join(' + ')}` : parts.map(fmt).join(' + ')
  const right = last && last.picked !== undefined && last.picked === last.ring

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
      {/* The sum: the last sneeze, which a tap turns round (100 − 64 = 36 ⇄ 36 + 64 = 100). */}
      <button
        type="button"
        onClick={() => last && setFlip((f) => !f)}
        className="absolute top-[4.25rem] inset-x-3 sm:inset-x-auto sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[calc(100%-8.5rem)] px-4 h-14 rounded-2xl bg-white/90 shadow font-black tabular-nums text-2xl sm:text-3xl text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis"
        aria-label="The sum"
      >
        {!last ? (
          <>
            {fmt(whole)} = {fmt(side)} × {fmt(side)}
          </>
        ) : flip ? (
          <>
            <span className={right ? 'text-emerald-600' : ''}>{fmt(last.ring)}</span> + {fmt(last.out)} = {fmt(last.whole)}
          </>
        ) : (
          <>
            {fmt(last.whole)} − {fmt(last.out)} = <span className={right ? 'text-emerald-600' : ''}>{fmt(last.ring)}</span>
            {right && ' ✓'}
          </>
        )}
      </button>
      {/* Guess first: what's left? Any answer plays the sneeze; the right one gets a chime. */}
      {phase === 'guessing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] flex flex-col items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="px-4 py-1 rounded-2xl bg-white/90 shadow font-black tabular-nums text-xl sm:text-2xl text-slate-700 whitespace-nowrap">
            {fmt(sneezer.n)} − {fmt(sneeze(sneezer.side, rule)?.out ?? 0n)} = ?
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {options.map((o) => (
              <button key={String(o)} type="button" onClick={() => cmd.current?.pick(o)} className="min-w-24 h-16 sm:h-20 px-3 sm:px-4 rounded-2xl bg-orange-500 text-white shadow-lg font-black tabular-nums text-2xl sm:text-3xl active:scale-95 transition-transform">
                {fmt(o)}
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
