import { useEffect, useRef, useState } from 'react'
import { numberToClips, playClips } from '@renderblocks/kernel'
import type { Look } from '@renderblocks/designer/look'
import { choo, correct, pop, sniff, thud, wake, windup, wrong } from '../sound'
import { drawBlock } from './draw'
import { count, joinOf, optionsFor, sneezeOf, spanOf, spoken, startOf, STARTS, sumOf, written, type Block, type Fact, type Joined, type Says, type Sneezed, type StopId } from './ops'
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
const clipsOf = (s: Says) => spoken(s).flatMap((t) => (typeof t === 'number' ? numberToClips(t) : WORDS[t] ? [WORDS[t]] : []))

type Phase = 'ready' | 'windup' | 'guessing' | 'choo' | 'held' | 'snapping'
type Pending = { kind: 'sneeze'; p: RPiece; res: Sneezed } | { kind: 'join'; q: RPiece; res: Joined }

export interface Guess {
  stop: StopId
  fact?: Fact
  /** Right first time. */
  ok: boolean
  ms: number
}

/**
 * A stop on the road: tap a shape and it sneezes, the way this stop's shapes
 * do; carry a piece back onto another and they go together again (the
 * opposite operation). A tap beside them sneezes the one whose turn it is,
 * and taps made too soon are kept, as in Sneeze²: he sneezes them fast.
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
  stop: StopId
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
  const [blocks, setBlocks] = useState<Block[]>([])
  const live = useRef({ guess, lookFor, onGuess })
  useEffect(() => {
    live.current = { guess, lookFor, onGuess }
  }, [guess, lookFor, onGuess])
  const cmd = useRef<{ pick: (n: number) => void } | null>(null)

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
    // Chain sneeze: every piece that lands sneezes again.
    let cascade = false
    let lastChoo = -1
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
    const sync = () => stage && setBlocks(stage.pieces.map((p) => p.block))
    const can = (p: RPiece) => !!sneezeOf(stop, p.block)
    const current = () => {
      if (!stage) return null
      const mine = stage.pieces.find((p) => p.id === currentId)
      if (mine && can(mine)) return mine
      return stage.pieces.filter(can).sort((a, b) => count(b.block) - count(a.block))[0] ?? null
    }
    const ask = (res: Sneezed | Joined) => {
      askedAt = performance.now()
      first = true
      missed = false
      setRuledOut([])
      setAsking({ says: res.ask, options: optionsFor(res.answer, res.answer * 7 + (stage?.sneezes ?? 0)) })
      setP('guessing')
    }

    const apply = () => {
      const job = pending
      pending = null
      if (!stage || job?.kind !== 'sneeze' || !stage.pieces.includes(job.p)) return setP('ready')
      const { p, res } = job
      const right = live.current.guess && !missed
      if (res.reform) {
        const q = stage.reform(p, res.parts[0].block)
        currentId = q.id
        sneezed = { id: q.id, at: performance.now() / 1000 }
      } else {
        const made = stage.sneeze(p, res.parts)
        // Twins and chains go on with the piece that flew; the rest with the one that stayed.
        const order = stop === 'twins' || stop === 'chain' ? [...made].reverse() : made
        currentId = order.find(can)?.id ?? 0
        sneezed = { id: made[0].id, at: performance.now() / 1000 }
        if (res.again) cascade = true
      }
      setSaid({ says: res.says, right })
      sync()
      setP('ready')
    }
    const doChoo = () => {
      if (!stage || pending?.kind !== 'sneeze') return setP('ready')
      setP('choo')
      punch = 1
      later(choo(BigInt(count(pending.p.block))), apply)
    }
    const doJoin = () => {
      const h = stage?.held
      if (!stage || !h || pending?.kind !== 'join') return setP('ready')
      const { q, res } = pending
      sniff(BigInt(count(res.whole)))
      const b = boxOf(q.block, q.x, q.y)
      // On top of it; a few leftover blocks go beside the ones already there.
      const leftover = res.whole.left > 0
      snap = {
        at: performance.now() / 1000,
        from: { x: h.x, y: h.y },
        to: { x: b.x0 + (leftover ? q.block.left : 0) + h.block.cols / 2, y: q.y + q.block.rows / 2 + h.block.rows / 2 },
      }
      setP('snapping')
    }
    const tickle = (target: RPiece | null = null, row?: number, soon = false) => {
      wake()
      if (!stage) return
      if (ph === 'windup' || ph === 'choo' || ph === 'snapping') return void (queued = true)
      if (ph !== 'ready') return
      const p = target ?? current()
      if (!p) return thud(0.3, 0)
      if (!p.settled) return void (queued = true)
      const res = sneezeOf(stop, p.block, row, stage.sneezes * 7 + count(p.block))
      if (!res) {
        // It can't sneeze: a little shake.
        wiggle = { id: p.id, until: performance.now() / 1000 + 0.5 }
        return thud(0.3, 0)
      }
      pending = { kind: 'sneeze', p, res }
      missed = false
      windup(BigInt(count(p.block)))
      if (live.current.guess) return ask(res)
      setP('windup')
      later(soon ? WINDUP_SOON : WINDUP, doChoo)
    }
    cmd.current = {
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
          wiggle = { id: pending.kind === 'sneeze' ? pending.p.id : pending.q.id, until: performance.now() / 1000 + 0.5 }
          return setRuledOut((r) => [...r, x])
        }
        correct()
        setAsking(null)
        if (pending.kind === 'sneeze') doChoo()
        else doJoin()
      },
    }

    // Where each number is drawn (screen px), so a tap on one says it.
    let hits: { x0: number; y0: number; x1: number; y1: number; n: number }[] = []
    const at = (e: PointerEvent) => {
      const box = el.getBoundingClientRect()
      return { x: e.clientX - box.left, y: e.clientY - box.top }
    }
    const down = (e: PointerEvent) => {
      const { x, y } = at(e)
      const hit = [...hits].reverse().find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
      if (hit) {
        wake()
        return playClips(numberToClips(hit.n))
      }
      if (!stage || ph !== 'ready') return tickle()
      // On a shape (a little generously, the smallest first): a tap sneezes it, a drag carries it.
      const s = toStage(x, y)
      const m = Math.max(0.15, 14 / view.scale)
      const on = stage.pieces
        .filter((p) => {
          const b = boxOf(p.block, p.x, p.y)
          return s.x > b.x0 - m && s.x < b.x1 + m && s.y > b.y0 - m && s.y < b.y1 + m
        })
        .sort((a, b) => count(a.block) - count(b.block))[0]
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
        // The row he tapped, from the bottom (Split: that block and all above it).
        const s = toStage(p.x, p.y)
        return tickle(p.p, p.p ? s.y - boxOf(p.p.block, p.p.x, p.p.y).y0 : undefined)
      }
      const held = stage.held
      const q = held && e.type === 'pointerup' ? stage.under((o) => o.settled && !!joinOf(stop, o.block, held.block)) : null
      const res = q && held ? joinOf(stop, q.block, held.block) : null
      if (q && res) {
        pending = { kind: 'join', q, res }
        missed = false
        if (live.current.guess) ask(res)
        else doJoin()
      } else {
        stage.release(performance.now() - p.at < 100 ? p.v : { x: 0, y: 0 })
        setP('ready')
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
        for (const th of stage.step()) thud(th.strength, Math.min(1, Math.log10(1 + th.size) / 2))
        acc -= STEP
      }
      // A tap made too soon: it sneezes the moment its shape has landed.
      if (queued && ph === 'ready') {
        const p = current()
        if (!p) queued = false
        else if (p.settled) {
          queued = false
          tickle(p, undefined, true)
        }
      }
      // Chain sneeze: whatever has landed and can still be halved, is.
      if (cascade && ph === 'ready') {
        let done = 0
        for (const p of [...stage.pieces]) {
          if (done >= 4 || !p.settled) continue
          const res = sneezeOf(stop, p.block)
          if (!res) continue
          stage.sneeze(p, res.parts)
          done++
          if (t - lastChoo > 0.18) {
            lastChoo = t
            choo(BigInt(count(p.block)))
          }
        }
        if (done) {
          sync()
          const sum = sumOf(stage.pieces.map((p) => p.block))
          if (sum && sum[3] === '×') setSaid({ says: sum, right: false })
        } else if (stage.pieces.every((p) => p.settled)) cascade = false
      }
      // Going back: it slides onto the other; then the two are one.
      if (ph === 'snapping' && snap && pending?.kind === 'join') {
        const f = Math.min(1, (t - snap.at) / SNAP)
        const e = 1 - (1 - f) ** 3
        stage.holdAt(snap.from.x + (snap.to.x - snap.from.x) * e, snap.from.y + (snap.to.y - snap.from.y) * e)
        if (f >= 1) {
          const { q, res } = pending
          const right = live.current.guess && !missed
          pending = null
          snap = null
          const whole = stage.pieces.includes(q) ? stage.join(q, res.whole) : null
          if (whole) {
            pop(Math.min(1, Math.log10(1 + count(whole.block)) / 2))
            currentId = whole.id
            sneezed = { id: whole.id, at: t }
            setSaid({ says: res.says, right })
          } else stage.release()
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
      // Camera: everything on the stage, with room above for the sentence and below for the floor and the numbers.
      const b = stage.bounds()
      const low = ph === 'guessing' ? Math.min(0.42, 190 / h) : Math.max(0.16, Math.min(0.3, 120 / h))
      const top = Math.min(0.3 * h, 150)
      const fit = Math.min(w / (b.x1 - b.x0 + 4), (h - low * h - top) / (b.y1 + 2), 90)
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

      const labels: { x: number; y: number; size: number; n: number }[] = []
      const crowd = stage.pieces.length > 20
      const held = stage.held
      const over = held && ph === 'held' ? stage.under((o) => o.settled && !!joinOf(stop, o.block, held.block)) : null
      const target = pending?.kind === 'sneeze' ? pending.p : null
      // The one he carries is drawn last, over the rest.
      for (const p of [...stage.pieces].sort((a, c) => Number(a.held) - Number(c.held))) {
        const cx = sx(p.x)
        const cy = sy(p.y)
        const pw = p.block.cols * scale
        const phh = p.block.rows * scale
        if (cx + pw < -80 || cx - pw > w + 80) continue
        const since = t - phaseAt
        const mine = p === target
        let squash = 0
        if (mine && (ph === 'windup' || ph === 'guessing')) squash = Math.min(1, since / WINDUP) * (ph === 'guessing' ? 0.8 + 0.1 * Math.sin(t * 18) : 1)
        if (mine && ph === 'choo') squash = 1
        let angle = stage.angleOf(p)
        if (p.id === wiggle.id && t < wiggle.until) angle += Math.sin(t * 40) * 0.05
        const base = live.current.lookFor(BigInt(count(p.block)))
        const look: Look = mine && ph !== 'ready' ? { ...base, eyes: 'sleepy', mouth: 'o' } : p.id === sneezed.id && t - sneezed.at < 0.8 ? { ...base, eyes: 'sleepy', mouth: 'grin' } : base
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(cx, cy)
        g.rotate(-angle)
        g.translate(0, phh / 2)
        g.scale(1 + 0.07 * squash, 1 - 0.12 * squash)
        g.translate(0, -phh / 2)
        g.scale(scale, -scale)
        g.translate(-p.block.cols / 2, -p.block.rows / 2)
        drawBlock(g, p.block, look, scale)
        if (p === over) {
          // Where the one he carries can go back.
          g.lineWidth = 5 / scale
          g.setLineDash([10 / scale, 7 / scale])
          g.strokeStyle = '#16a34a'
          g.strokeRect(-0.1, -0.1, p.block.cols + 0.2, p.block.rows + (p.block.left ? 1 : 0) + 0.2)
          g.setLineDash([])
        }
        const nn = count(p.block)
        if (!p.spin && !(crowd && nn === 1)) labels.push({ x: cx, y: sy(boxOf(p.block, p.x, p.y).y1) + phh * 0.12 * squash - (base.hat !== 'none' ? 0.4 * scale : 0), size: Math.max(16, Math.min(40, 0.55 * scale)), n: nn })
      }
      // Numberlings: plain bold black, above each one.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.textAlign = 'center'
      g.fillStyle = '#000'
      hits = []
      for (const l of labels) {
        g.font = `800 ${Math.round(l.size)}px Nunito, system-ui, sans-serif`
        const y = l.y - l.size * 0.35
        g.fillText(String(l.n), l.x, y)
        const half = g.measureText(String(l.n)).width / 2 + 12
        hits.push({ x0: l.x - half, x1: l.x + half, y0: y - l.size - 8, y1: y + 10, n: l.n })
      }
      ;(window as unknown as { __roadHits?: typeof hits }).__roadHits = hits
      raf = requestAnimationFrame(frame)
    }

    void initPhysics().then(() => {
      if (!alive) return
      stage = new RoadStage(startOf(stop, n), spanOf(stop, n))
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

  const opening: Says = [n]
  const line = said?.says ?? opening
  const sum = sumOf(blocks)
  const starts = STARTS[stop].all
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
        <button type="button" onClick={() => onStart(n)} className="w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold" aria-label="Start again">
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
          <span className={said?.right ? 'text-emerald-600' : ''}>{written(line)}</span>
          {said?.right && ' ✓'}
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
        /* The numbers this stop can start from. */
        <div className="absolute bottom-3 inset-x-3 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex gap-2 overflow-x-auto max-w-full px-1 py-1">
            {starts.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStart(s)}
                aria-pressed={s === n}
                className={`shrink-0 min-w-12 h-12 px-3 rounded-2xl shadow font-black tabular-nums text-xl active:scale-95 transition-transform ${s === n ? 'bg-orange-500 text-white' : 'bg-white/90 text-slate-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
