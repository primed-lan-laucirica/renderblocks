import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { Course } from './course'
import { drag, fling, grab, ready, step, tap, type Rider, type Vec } from './rider'
import { drawFourteen, drawRunner, RAINBOW } from './draw'
import { drawNumberlings, drawSkyline, drawTown } from './scene'
import { clack, effect, rolling, setMusic, stopMusic, wake } from './sounds'

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

/**
 * Skate 14: Fourteen skating through an endless town of ramps, pipes,
 * rails, stairs and parkour blocks. Touch him and fling him the way he
 * should go; tap while he flies for flips. Where he can't skate
 * over something he runs, vaults and climbs it, board under his arm, and
 * skates on as soon as he can. The numbers: how far he's got (in blocks),
 * how high each air goes, his best, and the trick count — every 7th is
 * lucky, every 14th splits him into two Sevens for an air.
 */
function App({ services }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // The song: on unless he's turned it off (remembered).
  const [music, setMusicOn] = useState(() => services.storage.get('music') !== 'off')
  const musicOn = useRef(music)
  const toggleMusic = () => {
    const on = !music
    setMusicOn(on)
    musicOn.current = on
    services.storage.set('music', on ? 'on' : 'off')
    setMusic(on)
  }

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const g = el.getContext('2d')
    if (!g) return
    const course = new Course(Math.floor(Math.random() * 1e9))
    const k: Rider = ready()
    // The finger holding him (one at a time), and the camera's mapping (world blocks → screen px), kept from the last frame.
    let holder = -1
    let view = { scale: 1, ox: 0, oy: 0 }
    let acc = 0
    let last = performance.now()
    let cam = { x: k.pos.x + 8, bottom: -4 }
    let shout: Shout | null = null
    let sparks: Spark[] = []
    let raf = 0
    // For a test harness to read.
    const harness = window as unknown as { __skate?: () => Rider; __skateCourse?: Course; __skateToScreen?: (p: Vec) => Vec }
    harness.__skate = () => k
    harness.__skateCourse = course
    harness.__skateToScreen = (p) => ({ x: view.ox + p.x * view.scale, y: view.oy - p.y * view.scale })

    const toWorld = (e: PointerEvent): Vec => {
      const r = el.getBoundingClientRect()
      return { x: (e.clientX - r.left - view.ox) / view.scale, y: (view.oy - (e.clientY - r.top)) / view.scale }
    }
    const secs = () => performance.now() / 1000
    // A touch on him grabs him (to fling him); anywhere else, while he's flying, is a flip.
    const down = (e: PointerEvent) => {
      e.preventDefault()
      wake()
      // Sound is allowed from the first touch: the song starts.
      if (musicOn.current) setMusic(true)
      if (holder !== -1) return
      const p = toWorld(e)
      if (grab(k, p, secs())) {
        holder = e.pointerId
        el.setPointerCapture?.(e.pointerId)
      } else if (k.mode === 'air') {
        tap(k)
        effect('whoosh', 0.35)
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId === holder) drag(k, course, toWorld(e), secs())
    }
    // Let go: flung with the finger's speed.
    const up = (e: PointerEvent) => {
      if (e.pointerId !== holder) return
      holder = -1
      fling(k, course)
      if (Math.hypot(k.vel.x, k.vel.y) > 12 || Math.abs(k.v) > 12) effect('whoosh', 0.3)
    }
    // Away from the app (another app, the screen off): the song pauses.
    const hidden = () => setMusic(!document.hidden && musicOn.current)
    document.addEventListener('visibilitychange', hidden)
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
    const celebrate = (lucky: boolean, doubleLucky: boolean, now: number) => {
      if (doubleLucky) {
        shout = { text: 'Double lucky!', sub: `${k.tricks} tricks`, until: now + 2600, big: true }
        effect('celebrate', 0.7)
        burst(k.pos.x, k.pos.y + 4, 42, now)
      } else if (lucky) {
        shout = { text: 'Lucky!', sub: `${k.tricks} tricks`, until: now + 2000, big: true }
        effect('pop', 0.7)
        burst(k.pos.x, k.pos.y + 4, 21, now)
      }
    }

    const frame = (now: number) => {
      acc = Math.min(0.25, acc + (now - last) / 1000)
      last = now
      while (acc >= DT) {
        if (k.mode !== 'held') step(k, course, DT)
        acc -= DT
      }
      // Sounds and shouts for what just happened.
      for (const n of k.news) {
        if (n.kind === 'takeoff') clack(0.4)
        else if (n.kind === 'ollie') clack(0.7)
        else if (n.kind === 'bump' || n.kind === 'touchdown' || n.kind === 'on') clack(0.6)
        else if (n.kind === 'step') clack(0.12)
        else if (n.kind === 'land') {
          clack(0.8)
          const blocks = Math.max(1, Math.round(n.air))
          if (n.air > 0 || n.flips) {
            shout = {
              text: n.air > 0 ? `${blocks} block${blocks === 1 ? '' : 's'} high!` : `${n.flips} flip${n.flips === 1 ? '' : 's'}!`,
              sub: n.air > 0 && n.flips ? `${n.flips} flip${n.flips === 1 ? '' : 's'}` : undefined,
              until: now + 1600,
            }
            if (n.air >= 8) shout = { ...shout, text: 'Gnarly!', sub: `${blocks} blocks high` }
          }
          celebrate(n.lucky, n.doubleLucky, now)
        } else if (n.kind === 'grind') {
          shout = { text: 'Grind!', sub: `${n.blocks} block${n.blocks === 1 ? '' : 's'}`, until: now + 1600 }
          celebrate(n.lucky, n.doubleLucky, now)
        }
      }
      k.news = []
      rolling(k.mode === 'ride' || k.mode === 'grind' ? Math.abs(k.v) : 0, k.mode === 'grind')
      sparks = sparks.filter((s) => s.until > now)
      for (const s of sparks) {
        s.vy -= 30 / 60
        s.x += s.vx / 60
        s.y += s.vy / 60
      }
      // Grinding throws sparks off the rail.
      if (k.mode === 'grind' && Math.random() < 0.6)
        sparks.push({ x: k.pos.x, y: k.pos.y, vx: -Math.sign(k.v) * (2 + Math.random() * 4), vy: 2 + Math.random() * 4, colour: Math.random() < 0.5 ? '#FDE047' : '#FB923C', until: now + 350 })

      // Camera: following him, looking ahead; the ground below him and room above him in view.
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      const scale = Math.min(h / 28, w / 22)
      const viewW = w / scale
      const viewH = h / scale
      const ground = course.heightAt(k.pos.x)
      // The ground 5 blocks up from the foot of the screen; up high, him in the middle (below the shouts).
      const wantBottom = Math.max(Math.min(ground, k.pos.y) - 5, k.pos.y + 18 - viewH)
      cam = { x: cam.x + (k.pos.x + viewW * 0.15 - cam.x) * 0.12, bottom: cam.bottom + (wantBottom - cam.bottom) * 0.1 }
      // However fast he's flung, never off screen: his head below the top, his board above the bottom, him across the middle.
      cam.bottom = Math.min(k.pos.y - 1.5, Math.max(cam.bottom, k.pos.y + 13 - viewH))
      cam.x = Math.max(k.pos.x - viewW * 0.4, Math.min(k.pos.x + viewW * 0.4, cam.x))
      view = { scale, ox: w / 2 - cam.x * scale, oy: h + cam.bottom * scale }
      const x0 = cam.x - viewW / 2
      const x1 = cam.x + viewW / 2

      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = g.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#BAE6FD')
      sky.addColorStop(1, '#F0F9FF')
      g.fillStyle = sky
      g.fillRect(0, 0, w, h)
      g.setTransform(scale * dpr, 0, 0, -scale * dpr, view.ox * dpr, view.oy * dpr)
      drawSkyline(g, x0, x1, cam.x, Math.min(0, cam.bottom + 2))
      drawTown(g, course, x0, x1, cam.bottom - 1)

      // Fourteen.
      g.save()
      g.translate(k.pos.x, k.pos.y)
      if (k.mode === 'foot') drawRunner(g, k)
      else {
        g.rotate(k.angle)
        drawFourteen(g, k, k.mode === 'held', k.mode === 'ride' ? Math.sign(k.v) : 0)
      }
      g.restore()

      for (const s of sparks) {
        g.fillStyle = s.colour
        g.fillRect(s.x - 0.15, s.y - 0.15, 0.3, 0.3)
      }

      // Screen-space numbers: the blocks' numberlings, his, and in the air, how high he is.
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const toScreen = (x: number, y: number) => ({ x: view.ox + x * scale, y: view.oy - y * scale })
      drawNumberlings(g, course, x0, x1, toScreen, Math.max(16, Math.min(40, scale * 1.4)))
      const head = toScreen(k.pos.x - Math.sin(k.mode === 'foot' ? 0 : k.angle) * 9.3, k.pos.y + Math.cos(k.mode === 'foot' ? 0 : k.angle) * 9.3)
      g.fillText('14', head.x, head.y)
      const unit = Math.min(w, h)
      if (k.mode === 'air' && k.pos.y - k.from >= 1) {
        const p = toScreen(k.pos.x + 3.2, k.pos.y + 4)
        g.fillStyle = '#0369A1'
        g.font = `900 ${Math.round(unit * 0.07)}px Nunito, system-ui, sans-serif`
        g.fillText(String(Math.floor(k.pos.y - k.from)), p.x, p.y)
      }
      g.textAlign = 'right'
      g.fillStyle = '#0F172A'
      g.font = `900 ${Math.round(unit * 0.06)}px Nunito, system-ui, sans-serif`
      const far = Math.max(0, Math.round(k.far))
      g.fillText(`${far.toLocaleString()} block${far === 1 ? '' : 's'}`, w - 20, 16 + unit * 0.06)
      g.font = `800 ${Math.round(unit * 0.036)}px Nunito, system-ui, sans-serif`
      g.fillText(`★ ${k.tricks}${k.best > 0 ? `   best ${Math.round(k.best)} high` : ''}`, w - 20, 16 + unit * 0.11)
      g.textAlign = 'center'
      if (shout && shout.until > now) {
        const s = shout
        g.fillStyle = s.big ? '#7C3AED' : '#0F172A'
        g.font = `900 ${Math.round(unit * (s.big ? 0.1 : 0.065))}px Nunito, system-ui, sans-serif`
        g.fillText(s.text, w / 2, h * 0.2)
        if (s.sub) {
          g.font = `800 ${Math.round(unit * 0.045)}px Nunito, system-ui, sans-serif`
          g.fillStyle = '#334155'
          g.fillText(s.sub, w / 2, h * 0.2 + unit * 0.065)
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
      document.removeEventListener('visibilitychange', hidden)
      rolling(0)
      stopMusic()
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
      <button
        type="button"
        onClick={toggleMusic}
        className={`absolute top-3 left-[4.25rem] w-12 h-12 rounded-full shadow text-2xl ${music ? 'bg-white/90' : 'bg-white/50 opacity-60'}`}
        aria-label={music ? 'Music off' : 'Music on'}
      >
        {music ? '🎵' : '🔇'}
      </button>
    </div>
  )
}

export default App
