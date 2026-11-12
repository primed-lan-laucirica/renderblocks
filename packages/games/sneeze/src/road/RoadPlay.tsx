import { useEffect, useRef, useState } from 'react'
import { numberToClips, playClips } from '@renderblocks/kernel'
import type { Look } from '@renderblocks/designer/look'
import { choo, correct, pop, sniff, thud, wake, windup, wrong } from '../sound'
import { drawShape, outline } from './draw'
import { cellOf, choicesFor, count, DEPTH, high, labelOf, same, sidesOf, sliderOf, sneezeOf, spanOf, startOf, sumOf, trailOf, valueOf, written, type ChainId, type Fact, type Outcome, type Says, type Shape, type Sneezed, type Slider } from './chains'
import { boxOf, RoadStage, STEP, type RPiece } from './stage'
import { initPhysics } from '../sim'

/** How long the "ah… ah…" lasts before the CHOO (s); shorter when he tapped ahead. */
const WINDUP = 0.75
const WINDUP_SOON = 0.3
/** How long a shape put back takes to slide into place (s). */
const SNAP = 0.3
/** A press that moves this far (px) is a drag, not a tap. */
const DRAG_PX = 10

const WORDS: Record<string, string> = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'dividedBy', '=': 'equals' }
/** A sentence as number-voice clips. */
const clipsOf = (s: Says) => s.flatMap((t) => (typeof t === 'number' ? numberToClips(t, (String(t).split('.')[1] ?? '').length) : WORDS[t] ? [WORDS[t]] : []))

type Phase = 'ready' | 'windup' | 'guessing' | 'choo' | 'held' | 'snapping'
type Pending = { kind: 'sneeze'; p: RPiece; res: Sneezed } | { kind: 'join'; res: Outcome }

/**
 * The slider, as in Sneeze²: what the shape whose turn it is will pop out.
 * The stops are evenly spaced whatever their values; ‹ and › step one at a
 * time; the thumb rests on what a tap would do now.
 */
function RoadSlider({ slider, pick, onPick, onSliding }: { slider: Slider; pick: number | null; onPick: (v: number) => void; onSliding: (on: boolean) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const { values, labels } = slider
  const last = values.length - 1
  const on = values.indexOf(pick ?? slider.at)
  const left = (i: number) => `${last ? (i / last) * 100 : 50}%`
  const nearest = (e: React.PointerEvent) => {
    const box = track.current!.getBoundingClientRect()
    return values[Math.min(last, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * last)))]
  }
  // Every label if they fit; else every second or third (and always the one he's on).
  const every = Math.ceil(values.length / 12)
  const step = (d: number) => {
    const i = on < 0 ? (d > 0 ? 0 : last) : on + d
    if (i >= 0 && i <= last) onPick(values[i])
  }
  const end = 'shrink-0 w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-black text-slate-600 disabled:opacity-30'
  return (
    <div className="flex items-start gap-3 w-full max-w-3xl" aria-label="Slider">
      <button type="button" onClick={() => step(-1)} disabled={on === 0} className={end} aria-label="One to the left">
        ‹
      </button>
      <div className="relative flex-1 h-[4.5rem] mx-5">
        <div
          ref={track}
          className="absolute inset-x-0 top-0 h-12 touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            onSliding(true)
            onPick(nearest(e))
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
            const v = nearest(e)
            if (v !== values[on]) onPick(v)
          }}
          onPointerUp={() => onSliding(false)}
          onPointerCancel={() => onSliding(false)}
        >
          <div className="absolute inset-x-0 top-5 h-2 rounded-full bg-orange-200" />
          {values.map((v, i) => (
            <div key={v} className="absolute top-4 w-1 h-4 -ml-0.5 rounded bg-orange-300" style={{ left: left(i) }} />
          ))}
          {on >= 0 && <div className="absolute top-0 w-12 h-12 -ml-6 rounded-xl bg-orange-500 shadow-lg border-4 border-white" style={{ left: left(on) }} data-thumb={values[on]} />}
        </div>
        {values.map((v, i) =>
          i === on || (i % every === 0 && (on < 0 || Math.abs(i - on) >= every)) ? (
            <span key={v} className={`absolute top-12 -translate-x-1/2 text-sm sm:text-base font-black tabular-nums whitespace-nowrap ${i === on ? 'text-orange-600' : 'text-slate-500'}`} style={{ left: left(i) }}>
              {labels[i]}
            </span>
          ) : null,
        )}
      </div>
      <button type="button" onClick={() => step(1)} disabled={on === last} className={end} aria-label="One to the right">
        ›
      </button>
    </div>
  )
}

export interface Guess {
  stop: ChainId
  fact?: Fact
  /** Right first time. */
  ok: boolean
  ms: number
}

/**
 * A chain: tap, and the shape whose turn it is sneezes out a smaller one of
 * its own kind, which sneezes next, all the way down; carry the one that flew
 * back where it came from and the sneeze is undone (the opposite operation).
 * The slider picks what pops out. Taps made too soon are kept, as in Sneeze²:
 * he sneezes them fast.
 */
export function RoadPlay({
  stop,
  n,
  guess,
  starred,
  lookFor,
  onStart,
  onGuess,
  onBack,
}: {
  stop: ChainId
  /** Which of the chain's starts. */
  n: number
  guess: boolean
  starred: boolean
  lookFor: (n: bigint) => Look
  onStart: (n: number) => void
  onGuess: (g: Guess) => void
  onBack: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  // The last sentence made (✓: guessed right first time).
  const [said, setSaid] = useState<{ says: Says; right: boolean } | null>(null)
  const [asking, setAsking] = useState<{ says: Says; options: number[] } | null>(null)
  const [ruledOut, setRuledOut] = useState<number[]>([])
  // What's on the stage, for the line that adds it all up.
  const [blocks, setBlocks] = useState<number[]>([])
  // The shape whose turn it is (the slider is about that one), and what he has picked on the slider for its next sneeze.
  const [turn, setTurn] = useState<{ shape: Shape; k: number; path: number[] } | null>(null)
  const [pick, setPick] = useState<number | null>(null)
  const [sliding, setSliding] = useState(false)
  // The camera follows the one whose turn it is once it is smaller than a block (as Sneeze² does); 🔭 shows them all.
  const [seeAll, setSeeAll] = useState(false)
  const live = useRef({ guess, lookFor, onGuess, pick, sliding, seeAll })
  useEffect(() => {
    live.current = { guess, lookFor, onGuess, pick, sliding, seeAll }
  }, [guess, lookFor, onGuess, pick, sliding, seeAll])
  const cmd = useRef<{ pick: (n: number) => void; form: (v: number) => void } | null>(null)
  const start = startOf(stop, n)

  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    let raf = 0
    let alive = true
    let stage: RoadStage | null = null
    let acc = 0
    let prevNow = performance.now()
    let cam: { x: number; low: number; logScale: number } | null = null
    let ph: Phase = 'ready'
    let phaseAt = 0
    let punch = 0
    let queued = false
    let pending: Pending | null = null
    // Whose turn it is when he taps beside them.
    let currentId = 0
    let askedAt = 0
    let first = true
    let missed = false
    let wiggle = { id: 0, until: 0 }
    let sneezed = { id: 0, at: -10 }
    let press: { id: number; x: number; y: number; p: RPiece | null; dx: number; dy: number; drag: boolean; v: { x: number; y: number }; at: number; sx: number; sy: number } | null = null
    let snap: { at: number; from: { x: number; y: number }; to: { x: number; y: number } } | null = null
    const view = { scale: 1, x: 0, w: 1, floorY: 0 }
    const toStage = (px: number, py: number) => ({ x: view.x + (px - view.w / 2) / view.scale, y: (view.floorY - py) / view.scale })
    const timers: number[] = []
    const later = (s: number, f: () => void) => timers.push(window.setTimeout(() => alive && f(), s * 1000))
    const setP = (p: Phase) => {
      ph = p
      phaseAt = performance.now() / 1000
      setPhase(p)
    }
    /** What a piece would sneeze now (`pick`: what he chose on the slider). Below one, powers go on dividing by what they were divided by. */
    const plan = (p: RPiece, pick?: number) => sneezeOf(stop, p.shape, pick, p.k, p.path[p.path.length - 1])
    const can = (p: RPiece) => !!plan(p)
    const amount = (p: RPiece) => valueOf(count(p.shape), p.k)
    // Whose turn: the one that flew out last (even when it can sneeze no more: a prime, a one), as in Sneeze².
    const current = () => {
      if (!stage) return null
      return stage.piece(currentId) ?? stage.pieces.filter(can).sort((a, b) => amount(b) - amount(a))[0] ?? stage.pieces[0] ?? null
    }
    const sync = () => {
      if (!stage) return
      setBlocks(stage.pieces.map(amount))
      const p = current()
      setTurn(p ? { shape: p.shape, k: p.k, path: p.path } : null)
    }
    // A pick on the slider is for one sneeze of the shape it was made for.
    const unpick = () => {
      live.current = { ...live.current, pick: null }
      setPick(null)
    }
    const ask = (res: Outcome) => {
      askedAt = performance.now()
      first = true
      missed = false
      setRuledOut([])
      setAsking({ says: res.ask, options: choicesFor(res.answer, res.k, Math.round(res.answer * 10 ** res.k) * 7 + (stage?.sneezes ?? 0)) })
      setP('guessing')
    }

    const apply = () => {
      const job = pending
      pending = null
      if (!stage || job?.kind !== 'sneeze' || !stage.pieces.includes(job.p)) return setP('ready')
      const { p, res } = job
      const right = live.current.guess && !missed
      const made = stage.sneeze(p, res.parts, res.back, res.factor)
      // The one that flew sneezes next.
      currentId = made[res.parts.findIndex((x) => x.fly)].id
      sneezed = { id: made[0].id, at: performance.now() / 1000 }
      setSaid({ says: res.says, right })
      unpick()
      sync()
      setP('ready')
    }
    const doChoo = () => {
      if (!stage || pending?.kind !== 'sneeze') return setP('ready')
      setP('choo')
      punch = 1
      later(choo(BigInt(Math.max(1, Math.round(amount(pending.p))))), apply)
    }
    const doJoin = () => {
      const h = stage?.held
      const home = h && stage?.homeOf(h)
      if (!stage || !h || !h.from || !home || pending?.kind !== 'join') {
        stage?.release()
        pending = null
        return setP('ready')
      }
      sniff(BigInt(Math.max(1, Math.round(valueOf(count(h.from.whole), h.from.k)))))
      // Back to where it was in the whole.
      const [u, mine] = [cellOf(h.from.whole, h.from.k), cellOf(h.shape, h.k)]
      snap = { at: performance.now() / 1000, from: { x: h.x, y: h.y }, to: { x: home.x0 + h.from.outAt.x * u + (h.shape.length * mine) / 2, y: home.y0 + h.from.outAt.y * u + (high(h.shape) * mine) / 2 } }
      setP('snapping')
    }
    const tickle = (target: RPiece | null = null, soon = false) => {
      wake()
      if (!stage) return
      if (ph === 'windup' || ph === 'choo' || ph === 'snapping') return void (queued = true)
      if (ph !== 'ready') return
      let p = target ?? current()
      if (!p) return thud(0.3, 0)
      if (!p.settled) return void (queued = true)
      // What he picked on the slider is about the shape whose turn it is.
      const res = plan(p, p === current() ? (live.current.pick ?? undefined) : undefined)
      if (!res) {
        // It can't sneeze (a prime, a ten-thousandth, a square with nothing left over): a little shake.
        wiggle = { id: p.id, until: performance.now() / 1000 + 0.5 }
        return thud(0.3, 0)
      }
      // It stands as its copies (or its smaller cells) first, so he sees what is about to come apart.
      if (res.as) {
        p = stage.reform(p, res.as, res.k)
        p.settled = true
        sync()
      }
      pending = { kind: 'sneeze', p, res }
      missed = false
      windup(BigInt(Math.max(1, Math.round(amount(p)))))
      if (live.current.guess) return ask(res)
      setP('windup')
      later(soon ? WINDUP_SOON : WINDUP, doChoo)
    }
    cmd.current = {
      // Dividing: as he slides, the shape whose turn it is stands as that many copies, there and then.
      form: (v) => {
        const p = current()
        if (!stage || ph !== 'ready' || !p || !p.settled) return
        const to = plan(p, v)
        if (!to?.as || (to.k === p.k && same(to.as, p.shape))) return
        stage.reform(p, to.as, to.k).settled = true
        pop(0.3)
        sync()
      },
      pick: (x) => {
        if (ph !== 'guessing' || !pending) return
        const ok = x === pending.res.answer
        if (first) {
          first = false
          live.current.onGuess({ stop, fact: pending.res.fact, ok, ms: performance.now() - askedAt })
        }
        // A wrong guess does nothing but buzz and grey out: only the right one sneezes.
        if (!ok) {
          wrong()
          missed = true
          wiggle = { id: pending.kind === 'sneeze' ? pending.p.id : (stage?.held?.id ?? 0), until: performance.now() / 1000 + 0.5 }
          return setRuledOut((r) => [...r, x])
        }
        correct()
        setAsking(null)
        if (pending.kind === 'sneeze') doChoo()
        else doJoin()
      },
    }

    // Where each number is drawn (screen px), so a tap on one says it.
    let hits: { x0: number; y0: number; x1: number; y1: number; says: Says }[] = []
    const at = (e: PointerEvent) => {
      const box = el.getBoundingClientRect()
      return { x: e.clientX - box.left, y: e.clientY - box.top }
    }
    const down = (e: PointerEvent) => {
      const { x, y } = at(e)
      const hit = [...hits].reverse().find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
      if (hit) {
        wake()
        return playClips(clipsOf(hit.says))
      }
      if (!stage || ph !== 'ready') return tickle()
      // On a shape (a little generously, the smallest first): a tap sneezes it, a drag carries it.
      const s = toStage(x, y)
      const m = 14 / view.scale
      const within = (grace: number) =>
        stage!.pieces
          .filter((p) => {
            const b = boxOf(p)
            return s.x > b.x0 - grace && s.x < b.x1 + grace && s.y > b.y0 - grace && s.y < b.y1 + grace
          })
          .sort((a, b) => amount(a) - amount(b))[0]
      // The one his finger is on; failing that, one a fingertip away.
      const on = within(0) ?? within(m)
      if (!on) return tickle()
      wake()
      el.setPointerCapture(e.pointerId)
      press = { id: e.pointerId, x, y, p: on, dx: on.x - s.x, dy: on.y - s.y, drag: false, v: { x: 0, y: 0 }, at: performance.now(), sx: s.x, sy: s.y }
    }
    const move = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id || !stage || !press.p) return
      const { x, y } = at(e)
      if (!press.drag) {
        if (Math.hypot(x - press.x, y - press.y) < DRAG_PX) return
        if (ph !== 'ready' || !press.p.settled || !stage.pieces.includes(press.p) || !stage.grab(press.p)) return
        press.drag = true
        setP('held')
      }
      const s = toStage(x, y)
      const now = performance.now()
      const dt = Math.max(1, now - press.at) / 1000
      const k = Math.min(1, dt / 0.08)
      press.v = { x: press.v.x + ((s.x - press.sx) / dt - press.v.x) * k, y: press.v.y + ((s.y - press.sy) / dt - press.v.y) * k }
      Object.assign(press, { at: now, sx: s.x, sy: s.y })
      stage.holdAt(s.x + press.dx, s.y + press.dy)
    }
    const up = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id || !stage) return
      const p = press
      press = null
      if (!p.drag) {
        // A tap on one that can sneeze makes it that one's turn; on any other (a ring, an L) it is a tap for whoever's turn it is.
        if (p.p && can(p.p)) {
          turnTo(p.p)
          return tickle(p.p)
        }
        return tickle()
      }
      const held = stage.held
      const res = held?.from && e.type === 'pointerup' && stage.overHome() ? held.from.back : null
      if (res) {
        pending = { kind: 'join', res }
        missed = false
        if (live.current.guess) ask(res)
        else doJoin()
      } else {
        stage.release(performance.now() - p.at < 100 ? p.v : { x: 0, y: 0 })
        setP('ready')
      }
    }
    // A tap on a shape other than the one whose turn it was makes it that shape's turn (the slider follows).
    const turnTo = (p: RPiece) => {
      if (p.id === current()?.id) return
      currentId = p.id
      unpick()
      sync()
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
        for (const th of stage.step()) thud(th.strength, Math.min(1, Math.log10(1 + th.size) / 2))
        acc -= STEP
      }
      // A tap made too soon: it sneezes the moment its shape has landed.
      if (queued && ph === 'ready') {
        const p = current()
        if (!p) queued = false
        else if (p.settled) {
          queued = false
          tickle(p, true)
        }
      }
      // Going back: it slides onto the other; then the two are one.
      if (ph === 'snapping' && snap && pending?.kind === 'join') {
        const f = Math.min(1, (t - snap.at) / SNAP)
        const e = 1 - (1 - f) ** 3
        stage.holdAt(snap.from.x + (snap.to.x - snap.from.x) * e, snap.from.y + (snap.to.y - snap.from.y) * e)
        if (f >= 1) {
          const { res } = pending
          const right = live.current.guess && !missed
          pending = null
          snap = null
          const whole = stage.joinBack()
          if (whole) {
            pop(Math.min(1, Math.log10(1 + amount(whole)) / 2))
            currentId = whole.id
            sneezed = { id: whole.id, at: t }
            setSaid({ says: res.says, right })
          } else stage.release()
          unpick()
          sync()
          setP('ready')
        }
      }

      const w = el.clientWidth
      const h = el.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      // Camera: everything on the stage, with room above for the sentence and below for the floor and the slider.
      // Once the one whose turn it is is smaller than a block, it follows that one and what it came out of.
      const cur = current()
      const small = cur && cur.k > 0 && !live.current.seeAll ? cur : null
      let b = stage.bounds()
      let room = 1
      if (small) {
        const near = [small, ...(small.from?.stays.map((id) => stage!.piece(id)).filter((q): q is RPiece => !!q) ?? [])].map((q) => boxOf(q))
        b = { x0: Math.min(...near.map((q) => q.x0)), x1: Math.max(...near.map((q) => q.x1)), y1: Math.max(...near.map((q) => q.y1)) }
        room = Math.max(b.x1 - b.x0, b.y1) / 5
      }
      const low = ph === 'guessing' ? Math.min(0.42, 190 / h) : Math.min(0.42, 200 / h)
      const top = Math.min(0.3 * h, 150)
      const fit = Math.min(w / (b.x1 - b.x0 + 4 * room), (h - low * h - top) / (b.y1 + 2 * room), 90 / Math.min(1, room))
      const want = { x: (b.x0 + b.x1) / 2, low, logScale: Math.log(Math.max(2, fit)) }
      if (!cam) cam = want
      else if (ph !== 'held' && ph !== 'snapping' && !(ph === 'guessing' && pending?.kind === 'join')) {
        const k = 1 - Math.exp(-STEP * 60 * 0.06)
        cam = { x: cam.x + (want.x - cam.x) * k, low: cam.low + (want.low - cam.low) * k, logScale: cam.logScale + (want.logScale - cam.logScale) * k }
      }
      punch *= 0.9
      const scale = Math.exp(cam.logScale) * (1 + 0.05 * punch)
      const floorY = h - cam.low * h
      Object.assign(view, { scale, x: cam.x, w, floorY })
      const sx = (x: number) => w / 2 + (x - cam!.x) * scale
      const sy = (y: number) => floorY - y * scale
      ;(window as unknown as { __road?: unknown }).__road = { stage, view, phase: ph }

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

      const labels: { x: number; y: number; size: number; says: Says; sides: Says | null }[] = []
      const crowd = stage.pieces.length > 20
      const held = stage.held
      const home = held && ph === 'held' && stage.overHome() ? stage.homeOf(held) : null
      const target = pending?.kind === 'sneeze' ? pending.p : null
      // What he has picked on the slider, shown on the shape whose turn it is: the part that will fly.
      // On a dividing chain its copies are always marked off, so he sees what it is made of before it comes apart.
      const dividing = stop === 'factors' || stop === 'powers'
      const chosen = (live.current.pick !== null || live.current.sliding || dividing) && ph === 'ready' ? current() : null
      const next = chosen ? plan(chosen, live.current.pick ?? undefined) : null
      const marked = live.current.pick !== null || live.current.sliding
      const willFly = next && !next.as && marked ? next.parts.filter((x) => x.fly) : []
      const copies = next && !next.as && dividing ? next.parts : []
      // The one he carries is drawn last, over the rest.
      for (const p of [...stage.pieces].sort((a, c) => Number(a.held) - Number(c.held))) {
        const cx = sx(p.x)
        const cy = sy(p.y)
        // Pixels per cell of this piece.
        const cell = scale * cellOf(p.shape, p.k)
        const pw = p.shape.length * cell
        const phh = high(p.shape) * cell
        if (cx + pw < -80 || cx - pw > w + 80 || Math.max(pw, phh) < 0.5) continue
        const since = t - phaseAt
        const mine = p === target
        let squash = 0
        if (mine && (ph === 'windup' || ph === 'guessing')) squash = Math.min(1, since / WINDUP) * (ph === 'guessing' ? 0.8 + 0.1 * Math.sin(t * 18) : 1)
        if (mine && ph === 'choo') squash = 1
        let angle = stage.angleOf(p)
        if (p.id === wiggle.id && t < wiggle.until) angle += Math.sin(t * 40) * 0.05
        // Below one it wears the look of the number of its cells (0.81 is a small 81), as in Sneeze².
        const base = live.current.lookFor(BigInt(count(p.shape)))
        const look: Look = mine && ph !== 'ready' ? { ...base, eyes: 'sleepy', mouth: 'o' } : p.id === sneezed.id && t - sneezed.at < 0.8 ? { ...base, eyes: 'sleepy', mouth: 'grin' } : base
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(cx, cy)
        g.rotate(-angle)
        g.translate(0, phh / 2)
        g.scale(1 + 0.07 * squash, 1 - 0.12 * squash)
        g.translate(0, -phh / 2)
        g.scale(cell, -cell)
        g.translate(-p.shape.length / 2, -high(p.shape) / 2)
        drawShape(g, p.shape, look, cell)
        if (p === chosen) {
          g.lineWidth = 3.5 / cell
          g.strokeStyle = 'rgba(30,41,59,0.75)'
          for (const part of copies) {
            outline(g, part.shape, part.x, part.y)
            g.stroke()
          }
        }
        if (p === chosen)
          for (const part of willFly) {
            g.lineWidth = 4 / cell
            g.setLineDash([10 / cell, 7 / cell])
            outline(g, part.shape, part.x, part.y)
            g.fillStyle = 'rgba(249,115,22,0.18)'
            g.fill()
            g.strokeStyle = '#ea580c'
            g.stroke()
            g.setLineDash([])
          }
        // A number over each, unless it is too small to see or one of a crowd of ones.
        const nn = count(p.shape)
        if (!p.spin && !(crowd && nn === 1) && (Math.max(pw, phh) >= 12 || p === cur)) labels.push({ x: cx, y: sy(boxOf(p).y1) + phh * 0.12 * squash - (base.hat !== 'none' ? 0.4 * cell : 0) - (p.shape.deep ? p.shape.length * DEPTH * cell : 0), size: Math.max(16, Math.min(40, 0.55 * scale, 0.9 * Math.max(pw, phh))), says: labelOf(stop, p.shape, p.k), sides: sidesOf(stop, p.shape, p.k) })
      }
      if (home && held?.from) {
        // Where the one he carries goes back: the whole it came out of.
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(sx(home.x0), sy(home.y0))
        const cell = scale * cellOf(held.from.whole, held.from.k)
        g.scale(cell, -cell)
        g.lineWidth = 5 / cell
        g.setLineDash([10 / cell, 7 / cell])
        g.strokeStyle = '#16a34a'
        outline(g, held.from.whole, 0, 0)
        g.stroke()
        g.setLineDash([])
      }
      // Numberlings: plain bold black, above each one.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.textAlign = 'center'
      g.fillStyle = '#000'
      hits = []
      for (const l of labels) {
        g.font = `800 ${Math.round(l.size)}px Nunito, system-ui, sans-serif`
        const y = l.y - l.size * 0.35
        const text = written(l.says)
        g.fillText(text, l.x, y)
        const half = g.measureText(text).width / 2 + 12
        if (l.sides) {
          // Its sides, small, over its number.
          g.font = `800 ${Math.round(Math.max(13, l.size * 0.55))}px Nunito, system-ui, sans-serif`
          g.fillStyle = '#475569'
          g.fillText(written(l.sides), l.x, y - l.size * 0.95)
          g.fillStyle = '#000'
        }
        hits.push({ x0: l.x - half, x1: l.x + half, y0: y - l.size - 8, y1: y + 10, says: l.says })
      }
      ;(window as unknown as { __roadHits?: typeof hits }).__roadHits = hits
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      const first = startOf(stop, n).shape
      stage = new RoadStage([first], spanOf(stop, first))
      currentId = 0
      sync()
      prevNow = performance.now()
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
      cmd.current = null
    }
  }, [stop, n])

  const sides = sidesOf(stop, start.shape)
  const opening: Says = sides ? [...sides, '=', ...labelOf(stop, start.shape)] : labelOf(stop, start.shape)
  const line = said?.says ?? opening
  // Everything there is, as one sentence: what it has been divided by on the way (60 = 2 × 2 × 15), or the pieces added up.
  const sum = (turn && trailOf(turn.path, valueOf(count(turn.shape), turn.k))) ?? sumOf(blocks)
  const last = turn?.path[turn.path.length - 1]
  const slider = turn ? sliderOf(stop, turn.shape, turn.k, last) : null
  // While he slides, the sentence it would make.
  const preview = slider && pick !== null && turn ? sneezeOf(stop, turn.shape, pick, turn.k, last) : null
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none bg-orange-50">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full touch-none" />
      <div className="absolute top-3 left-3 flex gap-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
      </div>
      <div className="absolute top-3 right-3 flex gap-2 items-center">
        {starred && (
          <span className="text-3xl" role="img" aria-label="Star earned">
            ⭐
          </span>
        )}
        <button
          type="button"
          onClick={() => setSeeAll((v) => !v)}
          className={`w-12 h-12 rounded-full shadow text-2xl ${seeAll ? 'bg-orange-500' : 'bg-white/90'}`}
          aria-label={seeAll ? 'Follow the sneezer' : 'See them all'}
        >
          🔭
        </button>
        <button type="button" onClick={() => onStart(start.key)} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Start again">
          ↺
        </button>
      </div>
      {/* The sentence the last sneeze made. A tap says it. */}
      <div className="absolute top-[4.25rem] inset-x-3 sm:inset-x-auto sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-[calc(100%-9rem)] flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            wake()
            playClips(clipsOf(line))
          }}
          className="max-w-full h-14 px-4 rounded-2xl bg-white/90 shadow font-black tabular-nums text-2xl sm:text-3xl text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis active:scale-95 transition-transform"
          aria-label="The sum"
        >
          {preview ? (
            <span className="text-orange-600">{written(guess ? preview.ask : preview.says)}</span>
          ) : (
            <>
              <span className={said?.right ? 'text-emerald-600' : ''}>{written(line)}</span>
              {said?.right && ' ✓'}
            </>
          )}
        </button>
        {/* Everything on the stage, added up: the blocks are all still there. */}
        {sum && written(sum) !== written(line) && (
          <button
            type="button"
            onClick={() => {
              wake()
              playClips(clipsOf(sum))
            }}
            className="max-w-full h-10 px-3 rounded-xl bg-white/70 shadow-sm font-black tabular-nums text-lg text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis"
            aria-label="All of them"
          >
            {written(sum)}
          </button>
        )}
      </div>
      {/* Guess first: only the right answer makes it happen; a wrong one buzzes and greys out. */}
      {phase === 'guessing' && asking ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] flex flex-col items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="px-4 py-1 rounded-2xl bg-white/90 shadow font-black tabular-nums text-xl sm:text-2xl text-slate-700 whitespace-nowrap">{written(asking.says)}</div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {asking.options.map((o) => (
              <button
                key={o}
                type="button"
                disabled={ruledOut.includes(o)}
                onClick={() => cmd.current?.pick(o)}
                className="min-w-24 h-16 sm:h-20 px-3 sm:px-4 rounded-2xl bg-orange-500 text-white shadow-lg font-black tabular-nums text-2xl sm:text-3xl active:scale-95 transition-transform disabled:bg-slate-300 disabled:text-slate-400 disabled:shadow-none"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* The slider. What to start from is chosen on the chain's own page, before play (Lan, Nov 12). */
        <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {slider && (phase === 'ready' || phase === 'windup' || phase === 'choo') && (
            <RoadSlider
              slider={slider}
              pick={pick}
              onPick={(v) => {
                wake()
                setPick(v)
                cmd.current?.form(v)
              }}
              onSliding={setSliding}
            />
          )}
        </div>
      )}
    </div>
  )
}
