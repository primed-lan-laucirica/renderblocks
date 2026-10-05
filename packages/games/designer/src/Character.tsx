import { useEffect, useRef } from 'react'
import { blockCells, bounds, drawBlocksAt, drawBody, drawFeatures } from './draw'
import { draggable, nearestSlot, slots, type Shape } from './shapes'
import type { Look } from './look'

interface Props {
  n: bigint
  shape: Shape
  leftovers: number[]
  look: Look
  /** A leftover block dropped in a new spot. */
  onMove: (index: number, slot: number) => void
  /** A tap on the character. */
  onTap: () => void
  /** Bumped on each tap, to play the jump. */
  jump: number
}

type Pt = { x: number; y: number }

const SLIDE_MS = 380

/**
 * The character, drawn to fit. Drag a leftover block (it snaps to the
 * nearest open spot); tap anywhere else on him and he jumps and waves. When
 * the shape changes, small characters' blocks slide into place.
 */
export function Character({ n, shape, leftovers, look, onMove, onTap, jump }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // Drawing state for the animation loop (only touched in effects and handlers).
  const live = useRef({
    n,
    shape,
    leftovers,
    look,
    target: null as Pt[] | null,
    from: null as Pt[] | null,
    shown: null as Pt[] | null,
    t0: 0,
    jump0: -1e9,
    view: { scale: 1, ox: 0, oy: 0 },
    held: null as { index: number; x: number; y: number; pointer: number } | null,
  })

  // New character: slide the blocks from where they were (same number, drawn block by block).
  useEffect(() => {
    const l = live.current
    const target = blockCells(n, shape, leftovers)
    l.from = l.shown && target && l.shown.length === target.length ? l.shown : null
    l.target = target
    l.t0 = performance.now()
    Object.assign(l, { n, shape, leftovers, look })
  }, [n, shape, leftovers, look])

  useEffect(() => {
    if (jump) live.current.jump0 = performance.now()
  }, [jump])

  // One drawing loop for as long as the character is on screen.
  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    let raf = 0
    const frame = (now: number) => {
      const l = live.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const b = bounds(l.shape)
      const scale = (Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) || 1) * 0.94
      const ox = w / 2 - ((b.x0 + b.x1) / 2) * scale
      const oy = h / 2 + ((b.y0 + b.y1) / 2) * scale
      l.view = { scale, ox, oy }
      const jt = (now - l.jump0) / 700
      const hop = jt >= 0 && jt < 1 ? Math.sin(jt * Math.PI) : 0
      const lift = hop * Math.min(2.5, (b.y1 - b.y0) * 0.1)
      g.setTransform(scale * dpr, 0, 0, -scale * dpr, ox * dpr, (oy - lift * scale) * dpr)
      const held = l.held ?? undefined
      if (l.target) {
        const t = Math.min(1, (now - l.t0) / SLIDE_MS)
        const ease = 1 - (1 - t) ** 3
        const from = l.from
        const cells = from ? l.target.map((c, i) => ({ x: from[i].x + (c.x - from[i].x) * ease, y: from[i].y + (c.y - from[i].y) * ease })) : l.target
        l.shown = cells
        const main = cells.length - l.leftovers.length
        drawBlocksAt(g, l.n, cells, scale, held ? main + held.index : -1)
        drawFeatures(g, l.n, l.shape, l.leftovers, l.look, hop)
        if (held) {
          g.save()
          g.shadowColor = 'rgba(0,0,0,0.35)'
          g.shadowBlur = 14
          drawBlocksAt(g, l.n, cells.map((_, i) => (i === main + held.index ? { x: held.x - 0.5, y: held.y - 0.5 } : { x: 1e9, y: 1e9 })), scale)
          g.restore()
        }
      } else {
        drawBody(g, l.n, l.shape, l.leftovers, scale, held)
        drawFeatures(g, l.n, l.shape, l.leftovers, l.look, hop)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toCells = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = live.current.view
    return { x: (e.clientX - r.left - v.ox) / v.scale, y: (v.oy - (e.clientY - r.top)) / v.scale }
  }

  const onDown = (e: React.PointerEvent) => {
    const p = toCells(e)
    if (draggable(shape)) {
      const cells = slots(shape)
      // Generous: a leftover block counts as touched a quarter-block around it.
      const k = leftovers.findIndex((slot) => {
        const c = cells[slot]
        return c && p.x >= c.col - 0.3 && p.x <= c.col + 1.3 && p.y >= c.row - 0.3 && p.y <= c.row + 1.3
      })
      if (k >= 0) {
        live.current.held = { index: k, x: p.x, y: p.y, pointer: e.pointerId }
        e.currentTarget.setPointerCapture?.(e.pointerId)
        return
      }
    }
    onTap()
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const l = live.current
    if (!l.held || l.held.pointer !== e.pointerId) return
    const p = toCells(e)
    l.held = { ...l.held, x: p.x, y: p.y }
  }
  const onUp = (e: React.PointerEvent) => {
    const l = live.current
    if (!l.held || l.held.pointer !== e.pointerId) return
    const { index, x, y } = l.held
    l.held = null
    onMove(index, nearestSlot(shape, leftovers, x, y, leftovers[index]))
  }

  return <canvas ref={canvas} className="w-full h-full touch-none" onPointerDown={onDown} onPointerMove={onPointerMove} onPointerUp={onUp} onPointerCancel={onUp} />
}
