/**
 * A world wider than the screen, moved sideways with a finger: drag, fling
 * (it carries on and slows down), mouse wheel, and a glide to any point. The
 * camera is moved directly every frame; React hears about it only to choose
 * which part of the world to draw (`seen`, in steps of 400 px). A press that
 * hardly moves is a tap on whatever's under it.
 */
import { useRef, useState } from 'react'

interface Options {
  /** The whole world's width, and the screen's. */
  width: number
  viewW: number
  /** Not listening (something is open over it). */
  disabled?: boolean
  /** A press that didn't move: what it landed on. */
  onTap: (target: Element) => void
}

export function usePan({ width, viewW, disabled, onTap }: Options) {
  const maxCam = Math.max(0, width - viewW)
  const track = useRef<HTMLDivElement>(null)
  const cam = useRef(0)
  const [seen, setSeen] = useState({ from: 0, to: viewW })
  const anim = useRef(0)

  const place = (x: number) => {
    cam.current = Math.min(maxCam, Math.max(0, x))
    if (track.current) track.current.style.transform = `translateX(${-cam.current}px)`
    const from = Math.floor((cam.current - viewW * 0.5) / 400) * 400
    setSeen((s) => (s.from === from ? s : { from, to: from + viewW * 2 + 400 }))
  }
  const stop = () => cancelAnimationFrame(anim.current)
  const glide = (to: number) => {
    stop()
    const from = cam.current
    const t0 = performance.now()
    const dur = Math.min(1400, 400 + Math.abs(to - from) * 0.4)
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      place(from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2))
      if (k < 1) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }

  const press = useRef<{ id: number; x0: number; c0: number; moved: boolean; v: number; lx: number; lt: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    stop()
    press.current = { id: e.pointerId, x0: e.clientX, c0: cam.current, moved: false, v: 0, lx: e.clientX, lt: performance.now() }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!p.moved && Math.abs(e.clientX - p.x0) > 8) {
      p.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!p.moved) return
    const now = performance.now()
    p.v = (p.lx - e.clientX) / Math.max(1, now - p.lt)
    p.lx = e.clientX
    p.lt = now
    place(p.c0 - (e.clientX - p.x0))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    press.current = null
    if (!p.moved) return onTap(e.target as Element)
    // A fling carries on and slows down.
    let v = p.v * 16
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 16
      last = now
      v *= 0.95 ** dt
      place(cam.current + v * dt)
      if (Math.abs(v) > 0.3 && cam.current > 0 && cam.current < maxCam) anim.current = requestAnimationFrame(tick)
    }
    anim.current = requestAnimationFrame(tick)
  }
  const onPointerCancel = () => {
    press.current = null
  }
  const onWheel = (e: React.WheelEvent) => {
    stop()
    place(cam.current + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY))
  }

  return { track, cam, seen, place, glide, stop, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel } }
}
