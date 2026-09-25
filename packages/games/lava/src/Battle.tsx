import { useEffect, useRef, useState } from 'react'
import { speakNumber, stopSpeech } from '@renderblocks/kernel'
import { announceWinner, celebrate, cutScream, scream, sizzle, stopAudio, thud, unlockAudio } from './audio'
import { Camera } from './camera'
import type { LavaConfig } from './config'
import { draw } from './render'
import type { ShapeStyle } from './shapes'
import { fallSeconds } from './screams'
import { initPhysics, Sim, STEP, type Block } from './sim'

interface BattleProps {
  values: number[]
  /** Square Club battles are squares, Step Squad battles staircases. */
  style: ShapeStyle
  config: LavaConfig
  onAgain: () => void
  onNewBattle: () => void
  onOpenPanel: () => void
}

/** Touches this close to a block (in screen px) still grab it (spec 8). */
const GRAB_SLOP_PX = 24

type End = { winner: number | null } | null

export function Battle({ values, style, config, onAgain, onNewBattle, onOpenPanel }: BattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Sim | null>(null)
  const configRef = useRef(config)
  const [left, setLeft] = useState(values.length)
  const [end, setEnd] = useState<End>(null)

  // Live tuning: the loop reads configRef, the world gets the new physics.
  useEffect(() => {
    configRef.current = config
    simRef.current?.setConfig(config)
  }, [config])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: false })!
    const cam = new Camera()
    let sim: Sim | null = null
    let raf = 0
    let disposed = false
    let dpr = 1

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const { clientWidth: w, clientHeight: h } = canvas
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      cam.resize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // Keep the screen on during a battle (spec 8). Unsupported → no-op.
    let wakeLock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => {
        if (disposed) void l.release()
        else wakeLock = l
      })
      .catch(() => {})

    // ------------------------------------------------------------ input
    const pointers = new Map<number, { x: number; y: number }>()
    let grabPointer: number | null = null
    let panPointer: number | null = null
    let pinchDist = 0
    let lastTap = { t: -1, x: 0, y: 0 }
    let panSamples: Array<{ t: number; x: number }> = []

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    /** The block under a touch: inside its (rotated) box grown by the slop; nearest wins, then smallest. */
    const hitTest = (sx: number, sy: number): Block | null => {
      if (!sim) return null
      const [wx, wy] = cam.toWorld(sx, sy)
      const slop = GRAB_SLOP_PX / cam.zoom
      let best: Block | null = null
      let bestD = Infinity
      for (const b of sim.alive()) {
        const dx = wx - b.cur.x
        const dy = wy - b.cur.y
        const c = Math.cos(-b.cur.a)
        const s = Math.sin(-b.cur.a)
        const lx = Math.abs(dx * c - dy * s) - b.shape.w / 2
        const ly = Math.abs(dx * s + dy * c) - b.shape.h / 2
        const d = Math.hypot(Math.max(0, lx), Math.max(0, ly))
        if (d > slop) continue
        if (d < bestD - 1e-6 || (Math.abs(d - bestD) < 1e-6 && best && b.shape.L < best.shape.L)) {
          best = b
          bestD = d
        }
      }
      return best
    }

    const down = (e: PointerEvent) => {
      unlockAudio()
      if (!sim || cam.mode === 'winner') return
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      pointers.set(e.pointerId, p)
      if (grabPointer !== null) return // one grab at a time; other fingers ignored

      if (pointers.size === 1) {
        const hit = hitTest(p.x, p.y)
        if (hit) {
          grabPointer = e.pointerId
          const [wx, wy] = cam.toWorld(p.x, p.y)
          sim.startGrab(hit, wx, wy)
          cam.freeze()
          return
        }
        // Empty space: pan, or fit-all on a double tap.
        const now = performance.now() / 1000
        if (now - lastTap.t < 0.3 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40) {
          cam.fit()
          lastTap.t = -1
        } else {
          lastTap = { t: now, x: p.x, y: p.y }
        }
        panPointer = e.pointerId
        cam.vx = 0
        panSamples = [{ t: now, x: p.x }]
      } else if (pointers.size === 2) {
        panPointer = null
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const move = (e: PointerEvent) => {
      if (!sim || !pointers.has(e.pointerId)) return
      const p = local(e)
      const prev = pointers.get(e.pointerId)!
      pointers.set(e.pointerId, p)
      if (e.pointerId === grabPointer) {
        const [wx, wy] = cam.toWorld(p.x, p.y)
        sim.moveGrab(wx, wy)
      } else if (grabPointer === null && pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0 && d > 0) cam.pinch(d / pinchDist, (a.x + b.x) / 2, sim, sim.time)
        pinchDist = d
      } else if (e.pointerId === panPointer) {
        cam.panBy(p.x - prev.x)
        const now = performance.now() / 1000
        panSamples.push({ t: now, x: p.x })
        panSamples = panSamples.filter((s) => now - s.t < 0.1)
      }
    }

    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (e.pointerId === grabPointer && sim) {
        grabPointer = null
        sim.endGrab()
        cam.release()
      } else if (e.pointerId === panPointer) {
        panPointer = null
        // Momentum from the last 100 ms of the drag.
        if (panSamples.length > 1 && cam.mode === 'auto') {
          const a = panSamples[0]
          const b = panSamples[panSamples.length - 1]
          if (b.t > a.t) cam.vx = -(b.x - a.x) / (b.t - a.t) / cam.zoom
        }
      }
      if (pointers.size < 2) pinchDist = 0
      if (cam.mode === 'manual' && sim) cam.holdManual(sim.time)
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    // ------------------------------------------------------------- loop
    let last = performance.now()
    let acc = 0
    let settledFor = 0
    let ended = false
    let fps = 60
    let shownLeft = values.length
    /** Screams in progress, per block. */
    const screams = new Map<Block, ReturnType<typeof scream>>()
    /**
     * Blocks in motion that the camera keeps in view: picked up while on
     * screen, kept (however far they go) until they have been still for
     * STILL_S or have gone into the lava.
     */
    const inMotion = new Set<Block>()
    const stillFor = new Map<Block, number>()
    const STILL_S = 0.3

    /** Over the edge and dropping: past the platform's end, not held, not yet in the lava. */
    const goingOver = (b: Block) =>
      !!sim &&
      b.outAt === null &&
      sim.grabbed() !== b &&
      (b.cur.x < sim.platform.x0 || b.cur.x > sim.platform.x1)

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      if (!sim) return
      const cfg = configRef.current
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      fps = fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05

      // While grabbing, a finger near the screen edge pans that way.
      if (grabPointer !== null) {
        const p = pointers.get(grabPointer)
        if (p) {
          const edge = cam.vw * 0.1
          const dir = p.x < edge ? -1 : p.x > cam.vw - edge ? 1 : 0
          if (dir) {
            cam.x += (dir * 0.5 * cam.vw * dt) / cam.zoom
            const [wx, wy] = cam.toWorld(p.x, p.y)
            sim.moveGrab(wx, wy)
          }
        }
      }

      // Fixed 60 Hz physics; at most 4 steps a frame so a slow frame can't snowball.
      acc += dt
      let steps = 0
      while (acc >= STEP && steps < 4) {
        const ev = sim.step()
        for (const th of ev.thuds) thud(th.strength, th.block.shape.L)
        if (ev.sizzles.length) sizzle()
        // A low, soft rumble per slab that breaks off.
        for (const w of ev.crumbles) thud(0.35, Math.max(4, w * 2))
        for (const b of ev.sizzles) {
          cutScream(screams.get(b) ?? null)
          screams.delete(b)
        }
        acc -= STEP
        steps++
      }
      if (steps === 4) acc = 0

      // Falling off the edge: scream. Anything moving: keep it in view.
      for (const b of sim.blocks) {
        if (b.removed) {
          inMotion.delete(b)
          continue
        }
        const over = goingOver(b)
        if (over && !screams.has(b) && b.cur.y < b.prev.y) {
          // Sized to the fall: from here, at this speed, down to the lava.
          const fall = fallSeconds(b.cur.y, b.body.linvel().y, sim.lavaY, cfg.gravity)
          screams.set(b, scream(b.shape.L, fall))
        }
        if (!over && screams.has(b)) {
          // Rescued (grabbed) or somehow back on the platform: stop screaming.
          cutScream(screams.get(b) ?? null, 0.25)
          screams.delete(b)
        }

        if (b.outAt !== null) {
          // Seen hitting the lava; then the camera lets it go.
          if (sim.time - b.outAt > 0.5) inMotion.delete(b)
        } else if (sim.grabbed() === b) {
          inMotion.delete(b)
        } else if (over || sim.speed(b) > 0.35 * Math.sqrt(b.shape.L)) {
          stillFor.set(b, 0)
          if (inMotion.has(b) || cam.onScreen(b)) inMotion.add(b)
        } else {
          const still = (stillFor.get(b) ?? 0) + dt
          stillFor.set(b, still)
          if (still >= STILL_S) inMotion.delete(b)
        }
      }
      cam.setMoving([...inMotion])

      cam.update(dt, sim, cfg, sim.time)
      draw(ctx, sim, cam, { alpha: acc / STEP, now: sim.time, debug: cfg.debug, fps, dpr })

      const alive = sim.alive()
      if (alive.length !== shownLeft) {
        shownLeft = alive.length
        setLeft(shownLeft)
      }

      const declareWinner = (w: Block) => {
        ended = true
        cam.showWinner(w)
        celebrate()
        // "Winner!" … then the number.
        window.setTimeout(() => !disposed && announceWinner(() => !disposed && speakNumber(w.value)), 900)
        setEnd({ winner: w.value })
      }

      // End (spec 4.3): one block left and settled for 1 s — or, if every
      // block ends up in the lava, the last one to hit it wins.
      if (!ended) {
        if (alive.length === 1 && sim.grabbed() === null) {
          const w = alive[0]
          settledFor = sim.speed(w) < 0.15 * Math.sqrt(w.shape.L) ? settledFor + dt : 0
          if (settledFor >= 1) declareWinner(w)
        } else if (alive.length === 0) {
          const last = sim.lastOut()
          if (last) declareWinner(last)
          else {
            ended = true
            setEnd({ winner: null })
          }
        }
      }
    }

    void initPhysics().then(() => {
      if (disposed) return
      sim = new Sim(values, configRef.current, style)
      simRef.current = sim
      // Debug builds of a battle expose their state for inspection from devtools.
      if (configRef.current.debug) Object.assign(window, { __lava: { sim, cam } })
      // Start on the smallest block, zoomed to it.
      const first = sim.blocks[0]
      cam.x = first ? first.cur.x : 0
      cam.zoom = first ? (configRef.current.cameraFill * cam.vh) / first.shape.h : 40
      last = performance.now()
      raf = requestAnimationFrame(frame)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      stopAudio()
      stopSpeech()
      void wakeLock?.release()
      simRef.current = null
      sim?.free()
    }
  }, [values, style])

  // Hidden parent panel: a 2-second press on the top-left corner (spec 9).
  const holdTimer = useRef<number | null>(null)
  const startHold = () => {
    holdTimer.current = window.setTimeout(onOpenPanel, 2000)
  }
  const cancelHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-900 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      <div
        className="absolute top-0 left-0 w-16 h-16"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        type="button"
        onClick={onNewBattle}
        className="absolute top-3 left-16 w-11 h-11 rounded-full bg-black/40 text-white text-xl font-bold"
        aria-label="Back"
      >
        ←
      </button>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/40 text-white text-lg font-extrabold tabular-nums pointer-events-none">
        {left} left
      </div>

      {end && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 pb-8 pt-6 bg-linear-to-t from-black/70 to-transparent">
          {end.winner !== null && (
            <div className="text-white font-black tabular-nums text-center leading-none drop-shadow-lg text-[clamp(2.5rem,10vw,6rem)] px-4 break-all">
              {end.winner.toLocaleString('en-US')}
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onAgain}
              className="px-8 py-4 rounded-2xl bg-orange-500 active:bg-orange-600 text-white text-2xl font-extrabold shadow-lg"
            >
              Again
            </button>
            <button
              type="button"
              onClick={onNewBattle}
              className="px-8 py-4 rounded-2xl bg-white/90 active:bg-white text-slate-800 text-2xl font-extrabold shadow-lg"
            >
              New battle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
