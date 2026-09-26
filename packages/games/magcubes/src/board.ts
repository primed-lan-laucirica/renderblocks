import { play } from './audio'
import { drawCube, drawOrder, drawTable, fromScreen, LAYER, onCube, SHEAR, topX, topY, type View } from './render'
import { landing, World, type Colour, type Cube, type Piece } from './world'

/** Tunables (spec: Tuning) — to be adjusted from play testing. */
export const TUNING = {
  /** Finger movement, CSS px, before a press becomes a drag. */
  slop: 10,
  /** A drag starting faster than this (CSS px per ms) tears the touched cube off alone. */
  tearSpeed: 1.1,
  /** How far a held piece leans toward where its magnets will pull it (0–1). */
  pull: 0.3,
  /** Snap and fall animation, ms. */
  snapMs: 110,
  minZoom: 18,
  maxZoom: 140,
}

interface Sample {
  t: number
  x: number
  y: number
}

interface Land {
  x: number
  y: number
  base: number
  /** The magnets catch: it lands against or on other cubes. */
  touch: boolean
}

type Grip =
  /** Finger down on a cube; slow or quick is not decided yet. */
  | { kind: 'press'; cube: Cube; samples: Sample[] }
  /**
   * A piece in hand. (offX, offY): the finger's offset from the grabbed
   * cube's top-face corner. (hx, hy): that corner as drawn, world-screen.
   */
  | { kind: 'held'; piece: Piece; anchorDz: number; offX: number; offY: number; hx: number; hy: number; land: Land; sx: number; sy: number }
  /** Finger on empty table: two of these pinch the view. */
  | { kind: 'pan'; x: number; y: number }

interface Anim {
  dx: number
  dy: number
  t0: number
}

export interface BoardHooks {
  /** The tray, in viewport pixels: a piece dropped on it is put away. */
  trayRect: () => DOMRect | null
  /** A held piece is over the tray (for its highlight). */
  onTrayHover: (over: boolean) => void
  onChange: (world: World) => void
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ease = (t: number) => 1 - (1 - t) ** 3

export class Board {
  readonly view: View = { cx: 0, cy: 0, zoom: 64, w: 1, h: 1 }
  private grips = new Map<number, Grip>()
  private anims = new Map<Cube, Anim>()
  private rect = { left: 0, top: 0 }
  private dpr = 1
  private dirty = true
  private raf = 0
  private overTray = false
  /** The last slow/quick call, for tuning from devtools. */
  lastDecision: { speed: number; tear: boolean; samples: number[][] } | null = null
  readonly world: World
  private readonly canvas: HTMLCanvasElement
  private readonly hooks: BoardHooks

  constructor(canvas: HTMLCanvasElement, world: World, hooks: BoardHooks) {
    this.canvas = canvas
    this.world = world
    this.hooks = hooks
    this.resize()
    this.fit()
    const loop = () => {
      this.frame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect()
    this.rect = { left: r.left, top: r.top }
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.round(r.width * this.dpr)
    this.canvas.height = Math.round(r.height * this.dpr)
    this.view.w = r.width
    this.view.h = r.height
    this.dirty = true
  }

  /** Bring the whole build into view, clear of the tray (spec: fit button). */
  fit(): void {
    const v = this.view
    let right = v.w
    let bottom = v.h
    const tray = this.hooks.trayRect()
    if (tray) {
      if (tray.height > tray.width) right = Math.min(right, tray.left - this.rect.left - 8)
      else bottom = Math.min(bottom, tray.top - this.rect.top - 8)
    }
    const cubes = this.world.all()
    let x0 = 0
    let x1 = 1
    let y0 = topY(0, 0)
    let y1 = 1
    if (cubes.length) {
      x0 = Math.min(...cubes.map((c) => topX(c.x, c.z)))
      x1 = Math.max(...cubes.map((c) => c.x + 1 - c.z * SHEAR))
      y0 = Math.min(...cubes.map((c) => topY(c.y, c.z)))
      y1 = Math.max(...cubes.map((c) => c.y + 1 - c.z * LAYER))
    }
    // An empty table starts at a friendly thumb-sized cube.
    v.zoom = cubes.length
      ? clamp(Math.min(right / (x1 - x0 + 3), bottom / (y1 - y0 + 3)), TUNING.minZoom, 90)
      : clamp(Math.min(right, bottom) / 9, 40, 80)
    v.cx = (x0 + x1) / 2 - (right / 2 - v.w / 2) / v.zoom
    v.cy = (y0 + y1) / 2 - (bottom / 2 - v.h / 2) / v.zoom
    this.dirty = true
  }

  private local(e: PointerEvent | WheelEvent) {
    return { x: e.clientX - this.rect.left, y: e.clientY - this.rect.top }
  }

  /** The cube drawn under a screen point: the front- and top-most one. */
  private hit(sx: number, sy: number): Cube | null {
    const p = fromScreen(this.view, sx, sy)
    const cubes = this.world.all().sort(drawOrder)
    for (let i = cubes.length - 1; i >= 0; i--) {
      const c = cubes[i]
      if (onCube(p.x, p.y, topX(c.x, c.z), topY(c.y, c.z))) return c
    }
    return null
  }

  /** A finger lands on the canvas. */
  down(e: PointerEvent): void {
    const { x, y } = this.local(e)
    const cube = this.hit(x, y)
    this.grips.set(e.pointerId, cube ? { kind: 'press', cube, samples: [{ t: e.timeStamp, x, y }] } : { kind: 'pan', x, y })
  }

  /** A finger drags a new cube out of the tray. */
  spawn(colour: Colour, e: PointerEvent): void {
    const { x, y } = this.local(e)
    this.hold(e.pointerId, { cells: [{ dx: 0, dy: 0, dz: 0, c: colour }] }, 0, 0.5, 0.5, x, y)
  }

  private hold(id: number, piece: Piece, anchorDz: number, offX: number, offY: number, sx: number, sy: number): void {
    const grip: Grip = { kind: 'held', piece, anchorDz, offX, offY, hx: 0, hy: 0, land: { x: 0, y: 0, base: 0, touch: false }, sx, sy }
    this.grips.set(id, grip)
    this.moveHeld(grip, sx, sy)
  }

  private moveHeld(g: Extract<Grip, { kind: 'held' }>, sx: number, sy: number): void {
    const f = fromScreen(this.view, sx, sy)
    const rx = f.x - g.offX
    const ry = f.y - g.offY
    const l = landing(this.world, g.piece, rx, ry, LAYER, SHEAR)
    g.land = { ...l, touch: this.world.touches(g.piece, l.x, l.y, l.base) }
    // The magnets' pull: lean toward the spot it will snap to.
    const k = g.land.touch ? TUNING.pull : 0
    g.hx = rx + (topX(l.x, l.base + g.anchorDz) - rx) * k
    g.hy = ry + (topY(l.y, l.base + g.anchorDz) - ry) * k
    g.sx = sx
    g.sy = sy
    this.updateTrayHover()
    this.dirty = true
  }

  private overTrayAt(sx: number, sy: number): boolean {
    const t = this.hooks.trayRect()
    if (!t) return false
    const x = sx + this.rect.left
    const y = sy + this.rect.top
    return x >= t.left && x <= t.right && y >= t.top && y <= t.bottom
  }

  private updateTrayHover(): void {
    const over = [...this.grips.values()].some((g) => g.kind === 'held' && this.overTrayAt(g.sx, g.sy))
    if (over !== this.overTray) {
      this.overTray = over
      this.hooks.onTrayHover(over)
    }
  }

  move(e: PointerEvent): void {
    const g = this.grips.get(e.pointerId)
    if (!g) return
    const { x, y } = this.local(e)
    if (g.kind === 'press') this.decide(e.pointerId, g, x, y, e.timeStamp)
    else if (g.kind === 'held') this.moveHeld(g, x, y)
    else this.pan(g, x, y)
  }

  /**
   * Slow or quick (spec: Magnets): once the finger has clearly moved, a
   * quick start tears the touched cube off alone; a slow one takes the
   * whole group.
   */
  private decide(id: number, g: Extract<Grip, { kind: 'press' }>, x: number, y: number, t: number): void {
    g.samples.push({ t, x, y })
    const s0 = g.samples[0]
    const dist = Math.hypot(x - s0.x, y - s0.y)
    if (dist < TUNING.slop) return
    // Time the motion from when the finger last sat still, not from the
    // press (it may have rested first), and over long enough to be a real
    // speed, not one jittery event pair — unless it is already far off.
    const still = g.samples.filter((s) => Math.hypot(s.x - s0.x, s.y - s0.y) <= 2)
    const start = still[still.length - 1]
    const span = t - start.t
    if (span < 25 && dist < 4 * TUNING.slop) return
    const speed = Math.hypot(x - start.x, y - start.y) / Math.max(1, span)
    const group = this.world.group(g.cube)
    const tear = group.length > 1 && speed >= TUNING.tearSpeed
    this.lastDecision = { speed, tear, samples: g.samples.map((s) => [s.t, s.x, s.y]) }
    const cube = g.cube
    const p0 = fromScreen(this.view, s0.x, s0.y)
    const piece = this.world.pickUp(tear ? [cube] : group, cube)
    const anchorDz = piece.cells.find((c) => c.dx === 0 && c.dy === 0)!.dz
    if (tear) {
      play('tear', 0.8)
      this.animateFalls(this.world.settle())
    }
    this.hold(id, piece, anchorDz, p0.x - topX(cube.x, cube.z), p0.y - topY(cube.y, cube.z), x, y)
  }

  /** Two fingers on empty table pinch and pan; one alone does nothing (spec: camera). */
  private pan(g: Extract<Grip, { kind: 'pan' }>, x: number, y: number): void {
    const other = [...this.grips.values()].find((o): o is Extract<Grip, { kind: 'pan' }> => o !== g && o.kind === 'pan')
    if (other) {
      const v = this.view
      const oldMid = { x: (g.x + other.x) / 2, y: (g.y + other.y) / 2 }
      const newMid = { x: (x + other.x) / 2, y: (y + other.y) / 2 }
      const oldDist = Math.hypot(g.x - other.x, g.y - other.y)
      const newDist = Math.hypot(x - other.x, y - other.y)
      const anchor = fromScreen(v, oldMid.x, oldMid.y)
      if (oldDist > 10) v.zoom = clamp((v.zoom * newDist) / oldDist, TUNING.minZoom, TUNING.maxZoom)
      v.cx = anchor.x - (newMid.x - v.w / 2) / v.zoom
      v.cy = anchor.y - (newMid.y - v.h / 2) / v.zoom
      this.refreshHeld()
    }
    g.x = x
    g.y = y
  }

  /** Mouse wheel zoom, for testing at a desk. */
  wheel(e: WheelEvent): void {
    const v = this.view
    const { x, y } = this.local(e)
    const anchor = fromScreen(v, x, y)
    v.zoom = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), TUNING.minZoom, TUNING.maxZoom)
    v.cx = anchor.x - (x - v.w / 2) / v.zoom
    v.cy = anchor.y - (y - v.h / 2) / v.zoom
    this.refreshHeld()
  }

  private refreshHeld(): void {
    for (const g of this.grips.values()) if (g.kind === 'held') this.moveHeld(g, g.sx, g.sy)
    this.dirty = true
  }

  /** A finger lifts (or the system cancels it). */
  up(e: PointerEvent): void {
    const g = this.grips.get(e.pointerId)
    if (!g) return
    this.grips.delete(e.pointerId)
    if (g.kind !== 'held') return
    const { x, y } = this.local(e)
    if (this.overTrayAt(x, y)) {
      play('away', 0.5)
    } else {
      this.moveHeld(g, x, y)
      const placed = this.world.place(g.piece, g.land.x, g.land.y)
      // Ease each cube from where it was drawn in hand into its spot.
      const now = performance.now()
      placed.forEach((c, i) => {
        const cell = g.piece.cells[i]
        this.anims.set(c, {
          dx: g.hx + cell.dx - (cell.dz - g.anchorDz) * SHEAR - topX(c.x, c.z),
          dy: g.hy + cell.dy - (cell.dz - g.anchorDz) * LAYER - topY(c.y, c.z),
          t0: now,
        })
      })
      play('click', g.land.touch ? 0.9 : 0.35)
    }
    this.updateTrayHover()
    this.hooks.onChange(this.world)
    this.dirty = true
  }

  private animateFalls(fell: Array<{ cube: Cube; fell: number }>): void {
    const now = performance.now()
    for (const { cube, fell: d } of fell) this.anims.set(cube, { dx: -d * SHEAR, dy: -d * LAYER, t0: now })
  }

  private frame(): void {
    if (!this.dirty && !this.anims.size) return
    this.dirty = false
    this.draw()
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    const v = this.view
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    drawTable(ctx, v)

    const now = performance.now()
    for (const c of this.world.all().sort(drawOrder)) {
      let dx = 0
      let dy = 0
      const a = this.anims.get(c)
      if (a) {
        const t = (now - a.t0) / TUNING.snapMs
        if (t >= 1) this.anims.delete(c)
        else {
          const k = 1 - ease(t)
          dx = a.dx * k
          dy = a.dy * k
        }
      }
      drawCube(ctx, v, topX(c.x, c.z) + dx, topY(c.y, c.z) + dy, c.c)
    }

    for (const g of this.grips.values()) {
      if (g.kind !== 'held') continue
      const cells = [...g.piece.cells].sort((a, b) => a.dy - b.dy || a.dz - b.dz || a.dx - b.dx)
      // Where the magnets will put it.
      if (g.land.touch) {
        for (const p of cells) drawCube(ctx, v, topX(g.land.x + p.dx, g.land.base + p.dz), topY(g.land.y + p.dy, g.land.base + p.dz), p.c, 0.3)
      }
      // In hand: above everything, with a soft shadow.
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = v.zoom * 0.35
      ctx.shadowOffsetY = v.zoom * 0.2
      for (const p of cells) drawCube(ctx, v, g.hx + p.dx - (p.dz - g.anchorDz) * SHEAR, g.hy + p.dy - (p.dz - g.anchorDz) * LAYER, p.c)
      ctx.restore()
    }
  }
}
