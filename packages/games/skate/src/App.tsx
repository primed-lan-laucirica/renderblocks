import { useEffect, useRef } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { COPE, drag, fling, grab, pose, R, ready, step, tapFlip, type Skater, type Vec } from './physics'
import { drawFourteen, drawPipe, WORLD_W } from './draw'
import { clack, effect, rolling, wake } from './sounds'

const DT = 1 / 120

interface Shout {
  text: string
  sub?: string
  until: number
  big?: boolean
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  colour: string
  until: number
}

const RAINBOW = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#6366F1', '#A855F7']

/**
 * Skate (Fingerboard-research.md): Fourteen on a halfpipe. One finger: hold
 * to crouch and pump (best on the way down), tap in the air for a kickflip
 * each tap. Landings are always caught. The numbers: how many blocks high
 * each air goes, his best, and the trick count — every 7th is lucky, every
 * 14th splits him into two Sevens for an air.
 */
function App({ services }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const g = el.getContext('2d')
    if (!g) return
    let k: Skater = ready()
    // The finger holding him (one at a time), and the camera's mapping (world blocks → screen px), kept from the last frame.
    let holder = -1
    let view = { scale: 1, ox: 0, oy: 0 }
    let acc = 0
    let last = performance.now()
    let top = R + 10 // the camera's top edge (world y), eased toward what's needed
    let shout: Shout | null = null
    let sparks: Spark[] = []
    let raf = 0
    // For a test harness to read.
    const harness = window as unknown as { __skate?: () => Skater; __skateToScreen?: (p: Vec) => Vec }
    harness.__skate = () => k
    harness.__skateToScreen = (p) => ({ x: view.ox + p.x * view.scale, y: view.oy - p.y * view.scale })

    const toWorld = (e: PointerEvent): Vec => {
      const r = el.getBoundingClientRect()
      return { x: (e.clientX - r.left - view.ox) / view.scale, y: (view.oy - (e.clientY - r.top)) / view.scale }
    }
    const secs = () => performance.now() / 1000
    // A touch on him grabs him; anywhere else while he's flying asks for a flip.
    const down = (e: PointerEvent) => {
      e.preventDefault()
      wake()
      if (holder !== -1) return
      const held = grab(k, toWorld(e), secs())
      if (held) {
        k = held
        holder = e.pointerId
        el.setPointerCapture?.(e.pointerId)
      } else if (k.mode === 'air') {
        k = tapFlip(k)
        effect('whoosh', 0.35)
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId === holder) k = drag(k, toWorld(e), secs())
    }
    // Let go: flung with the finger's speed.
    const up = (e: PointerEvent) => {
      if (e.pointerId !== holder) return
      holder = -1
      k = fling(k)
      if (Math.hypot(k.vel.x, k.vel.y) > 12 || Math.abs(k.v) > 12) effect('whoosh', 0.3)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    const burst = (x: number, y: number, n: number, now: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 4 + Math.random() * 8
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 4, colour: RAINBOW[i % 7], until: now + 900 + Math.random() * 500 })
      }
    }

    const frame = (now: number) => {
      acc = Math.min(0.25, acc + (now - last) / 1000)
      last = now
      const before = k.mode
      while (acc >= DT) {
        k = step(k, DT)
        acc -= DT
      }
      // Sounds and shouts for what just happened.
      // The board on the coping, or landing.
      if (before !== 'air' && before !== 'held' && k.mode === 'air') clack(0.4)
      if (before === 'air' && (k.mode === 'pipe' || k.mode === 'deck')) clack(0.8)
      if (k.landed) {
        const l = k.landed
        const blocks = Math.max(1, Math.round(l.air))
        shout = {
          text: `${blocks} block${blocks === 1 ? '' : 's'} high!`,
          sub: l.flips ? `${l.flips} flip${l.flips === 1 ? '' : 's'}` : undefined,
          until: now + 1600,
        }
        const p = pose(k).at
        if (l.doubleLucky) {
          shout = { text: 'Double lucky!', sub: `${k.tricks} tricks`, until: now + 2600, big: true }
          effect('celebrate', 0.7)
          burst(p.x, p.y + 4, 42, now)
        } else if (l.lucky) {
          shout = { text: 'Lucky!', sub: `${k.tricks} tricks`, until: now + 2000, big: true }
          effect('pop', 0.7)
          burst(p.x, p.y + 4, 21, now)
        } else if (l.air >= 8) shout = { ...shout, text: 'Gnarly!', sub: `${blocks} blocks high` }
        k = { ...k, landed: null }
      }
      rolling(k.mode === 'pipe' || k.mode === 'deck' ? Math.abs(k.v) : 0)
      sparks = sparks.filter((s) => s.until > now)
      for (const s of sparks) {
        s.vy -= 30 / 60
        s.x += s.vx / 60
        s.y += s.vy / 60
      }

      // Camera: the whole pipe, rising to keep a high air in view.
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      const p = pose(k)
      // Room for all of him (board, seven blocks, helmet) above where he is.
      const want = Math.max(R + 10, p.at.y + 12)
      top += (want - top) * 0.15
      const bottom = -2.5
      const scale = Math.min(w / WORLD_W, h / (top - bottom))
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#BAE6FD')
      sky.addColorStop(1, '#F0F9FF')
      g.fillStyle = sky
      g.fillRect(0, 0, w, h)
      // World → screen: centred, y up, the pipe's bottom near the screen's foot.
      view = { scale, ox: w / 2, oy: h + bottom * scale }
      g.setTransform(scale * dpr, 0, 0, -scale * dpr, view.ox * dpr, view.oy * dpr)
      drawPipe(g)

      // The best air so far: a dashed line over both copings.
      if (k.best > 0.5) {
        g.setLineDash([0.4, 0.3])
        g.lineWidth = 0.08
        g.strokeStyle = '#F59E0B'
        for (const x of [-COPE, COPE]) {
          g.beginPath()
          g.moveTo(x - 2, R + k.best)
          g.lineTo(x + 2, R + k.best)
          g.stroke()
        }
        g.setLineDash([])
      }
      // In the air: a ruler from the coping up to him, a tick per block.
      if (k.mode === 'air' && k.pos.y > R) {
        const x = (k.pos.x < 0 ? -1 : 1) * (COPE + 1.2)
        const hgt = Math.max(0, k.pos.y - R)
        g.lineWidth = 0.1
        g.strokeStyle = '#0EA5E9'
        g.beginPath()
        g.moveTo(x, R)
        g.lineTo(x, R + hgt)
        g.stroke()
        for (let i = 1; i <= Math.floor(hgt); i++) {
          g.beginPath()
          g.moveTo(x - 0.35, R + i)
          g.lineTo(x + 0.35, R + i)
          g.stroke()
        }
      }

      // Fourteen.
      g.save()
      g.translate(p.at.x, p.at.y)
      g.rotate(p.angle)
      drawFourteen(g, k, k.mode === 'held', k.mode === 'pipe' || k.mode === 'deck' ? Math.sign(k.v) : 0)
      g.restore()

      for (const s of sparks) {
        g.fillStyle = s.colour
        g.fillRect(s.x - 0.15, s.y - 0.15, 0.3, 0.3)
      }

      // Screen-space numbers.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const unit = Math.min(w, h)
      g.textAlign = 'right'
      g.fillStyle = '#0F172A'
      g.font = `900 ${Math.round(unit * 0.05)}px Nunito, system-ui, sans-serif`
      g.fillText(`★ ${k.tricks}`, w - 20, 16 + unit * 0.05)
      if (k.best > 0) {
        g.fillStyle = '#B45309'
        g.font = `800 ${Math.round(unit * 0.032)}px Nunito, system-ui, sans-serif`
        g.fillText(`best ${Math.round(k.best)} block${Math.round(k.best) === 1 ? '' : 's'}`, w - 20, 16 + unit * 0.095)
      }
      g.textAlign = 'center'
      if (k.mode === 'air' && k.pos.y > R) {
        // The height in blocks, at the top of the ruler, on the outside of the coping.
        const hgt = Math.max(0, k.pos.y - R)
        const rx = (k.pos.x < 0 ? -1 : 1) * (COPE + 2.6) * scale + w / 2
        const ry = h - (R + hgt - bottom) * scale
        g.fillStyle = '#0369A1'
        g.font = `900 ${Math.round(unit * 0.07)}px Nunito, system-ui, sans-serif`
        g.fillText(String(Math.floor(hgt)), rx, Math.max(unit * 0.08, ry))
      }
      if (shout && shout.until > now) {
        const s = shout
        g.fillStyle = s.big ? '#7C3AED' : '#0F172A'
        g.font = `900 ${Math.round(Math.min(w, h) * (s.big ? 0.1 : 0.065))}px Nunito, system-ui, sans-serif`
        g.fillText(s.text, w / 2, h * 0.2)
        if (s.sub) {
          g.font = `800 ${Math.round(Math.min(w, h) * 0.045)}px Nunito, system-ui, sans-serif`
          g.fillStyle = '#334155'
          g.fillText(s.sub, w / 2, h * 0.2 + Math.min(w, h) * 0.065)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      rolling(0)
    }
  }, [])

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none bg-sky-100">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full touch-none" />
      <button
        type="button"
        onClick={services.exitToHome}
        className="absolute top-3 left-3 w-12 h-12 rounded-full bg-white/90 shadow text-2xl font-bold"
        aria-label="Home"
      >
        ←
      </button>
    </div>
  )
}

export default App
