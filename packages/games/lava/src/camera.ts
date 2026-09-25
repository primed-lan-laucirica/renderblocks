import type { LavaConfig } from './config'
import type { Block, Sim } from './sim'

/** The platform top sits at this share of the screen height (spec 7). */
export const HORIZON = 0.6

type Mode = 'auto' | 'fit' | 'manual' | 'action' | 'frozen' | 'winner'

/** Never zoom in closer than this share of a moving block's normal close-up. */
const ACTION_CLOSEST = 0.8
/** A block falling off the edge is framed with the lava only while it stays at least this tall. */
const DROP_MIN_PX = 28

/** Half extents of a block's rotated bounding box. */
function extents(b: Block): [number, number] {
  const c = Math.abs(Math.cos(b.cur.a))
  const s = Math.abs(Math.sin(b.cur.a))
  return [0.5 * (b.shape.w * c + b.shape.h * s), 0.5 * (b.shape.w * s + b.shape.h * c)]
}

/**
 * Horizontal scroll + zoom over the platform. Zoom is px per world unit.
 * Vertically the platform top sits at HORIZON unless the action needs the
 * view to move: `y` is the world height drawn at HORIZON.
 *
 * While blocks are in motion (thrown, knocked, tumbling, falling to the
 * lava) the camera frames ALL of them, zooming out as far as needed and
 * for as long as they move. Only when everything has settled does it go
 * back to the usual auto-zoom.
 */
export class Camera {
  x = 0
  y = 0
  zoom = 40
  vw = 1
  vh = 1
  mode: Mode = 'auto'
  /** Pan momentum, world units / s. */
  vx = 0
  /** Blocks in motion, supplied each frame by the battle loop. */
  private moving: Block[] = []
  /** The user panned during the action: stop framing it until it settles. */
  private override = false
  private winnerBlock: Block | null = null
  private manualUntil = 0
  /** Where the view was before the action; restored if it ends somewhere empty. */
  private homeX: number | null = null
  private returning = false

  resize(vw: number, vh: number): void {
    this.vw = vw
    this.vh = vh
  }

  toScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x) * this.zoom + this.vw / 2, this.vh * HORIZON - (wy - this.y) * this.zoom]
  }

  toWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.vw / 2) / this.zoom + this.x, (this.vh * HORIZON - sy) / this.zoom + this.y]
  }

  /** Is any part of this block on screen? */
  onScreen(b: Block): boolean {
    const [ex, ey] = extents(b)
    const [l, t] = this.toScreen(b.cur.x - ex, b.cur.y + ey)
    const [r, bot] = this.toScreen(b.cur.x + ex, b.cur.y - ey)
    return r > 0 && l < this.vw && bot > 0 && t < this.vh
  }

  /** Zoom that fits the whole platform and its tallest block. */
  fitZoom(sim: Sim): number {
    const tallest = Math.max(1, ...sim.alive().map((b) => b.shape.h))
    return Math.min(
      (0.96 * this.vw) / (sim.platform.x1 - sim.platform.x0),
      (0.5 * this.vh) / tallest,
      // Show the lava too.
      ((1 - HORIZON) * this.vh * 0.85) / -sim.lavaY,
    )
  }

  private zoomLimits(sim: Sim): [number, number] {
    const smallest = Math.min(...sim.blocks.map((b) => b.shape.h))
    // In the action the camera may pull out further, to keep a long throw in view.
    const out = this.mode === 'action' ? 0.25 : 0.8
    return [this.fitZoom(sim) * out, (0.6 * this.vh) / smallest]
  }

  /** Target zoom for one block: its height fills cameraFill of the screen, its width stays on screen. */
  private blockZoom(b: Block, cfg: LavaConfig): number {
    return Math.min((cfg.cameraFill * this.vh) / b.shape.h, (0.8 * this.vw) / b.shape.w)
  }

  /** Blend of the two blocks either side of the screen centre, in log space (spec 7). */
  private autoZoom(sim: Sim, cfg: LavaConfig): number {
    const alive = sim.alive().sort((a, b) => a.cur.x - b.cur.x)
    if (alive.length === 0) return this.zoom
    const right = alive.findIndex((b) => b.cur.x > this.x)
    if (right === -1) return this.blockZoom(alive[alive.length - 1], cfg)
    if (right === 0) return this.blockZoom(alive[0], cfg)
    const A = alive[right - 1]
    const B = alive[right]
    const t = (this.x - A.cur.x) / (B.cur.x - A.cur.x)
    return Math.exp((1 - t) * Math.log(this.blockZoom(A, cfg)) + t * Math.log(this.blockZoom(B, cfg)))
  }

  /** Hold still under a grab so the block stays under the finger. */
  freeze(): void {
    this.mode = 'frozen'
    this.homeX = this.x
    this.vx = 0
  }

  /** The grab ended: the thrown block (and anything it hits) takes over from here. */
  release(): void {
    if (this.mode === 'frozen') this.mode = 'auto'
  }

  /** The blocks currently in motion that the camera should keep in view. */
  setMoving(blocks: Block[]): void {
    this.moving = blocks
  }

  panBy(dxScreen: number): void {
    this.returning = false
    this.x -= dxScreen / this.zoom
    if (this.mode === 'action') this.override = true
    if (this.mode === 'fit' || this.mode === 'action') this.mode = 'auto'
  }

  fit(): void {
    this.mode = 'fit'
    this.vx = 0
  }

  showWinner(b: Block): void {
    this.mode = 'winner'
    this.winnerBlock = b
  }

  /** Pinch: scale about a screen x, keeping the world point under it fixed. */
  pinch(factor: number, aboutX: number, sim: Sim, now: number): void {
    const [wx] = this.toWorld(aboutX, 0)
    const [lo, hi] = this.zoomLimits(sim)
    this.zoom = Math.min(hi, Math.max(lo, this.zoom * factor))
    this.x = wx - (aboutX - this.vw / 2) / this.zoom
    this.mode = 'manual'
    this.manualUntil = now + 4
  }

  holdManual(now: number): void {
    this.manualUntil = now + 4
  }

  /**
   * Zoom, centre and height that keep every block in `blocks` on screen.
   * Blocks going over the edge are framed together with the lava below
   * while they stay big enough to see — the whole drop in one view.
   */
  private frame(blocks: Block[], sim: Sim, cfg: LavaConfig): { zoom: number; x: number; y: number } {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const b of blocks) {
      const [ex, ey] = extents(b)
      minX = Math.min(minX, b.cur.x - ex)
      maxX = Math.max(maxX, b.cur.x + ex)
      minY = Math.min(minY, b.cur.y - ey)
      maxY = Math.max(maxY, b.cur.y + ey)
    }
    const closest = Math.min(...blocks.map((b) => this.blockZoom(b, cfg))) * ACTION_CLOSEST
    const fitW = (0.85 * this.vw) / Math.max(1e-3, maxX - minX)
    const fitH = (lo: number, hi: number) => (0.8 * this.vh) / Math.max(1e-3, hi - lo)
    let zoom = Math.min(closest, fitW, fitH(minY, maxY))

    const falling = blocks.filter((b) => b.outAt === null && (b.cur.x < sim.platform.x0 || b.cur.x > sim.platform.x1))
    if (falling.length) {
      const withLava = Math.min(closest, fitW, fitH(Math.min(minY, sim.lavaY), maxY))
      if (withLava * Math.min(...falling.map((b) => b.shape.h)) >= DROP_MIN_PX) {
        zoom = withLava
        minY = Math.min(minY, sim.lavaY)
      }
    }

    // Vertically: keep the platform where it usually sits if everything fits
    // that way; otherwise centre the action — but never look far below the lava.
    const above = ((HORIZON - 0.06) * this.vh) / zoom
    const below = ((1 - HORIZON - 0.06) * this.vh) / zoom
    let y = maxY <= above && minY >= -below ? 0 : (minY + maxY) / 2 - ((HORIZON - 0.5) * this.vh) / zoom
    y = Math.max(y, sim.lavaY + ((0.92 - HORIZON) * this.vh) / zoom)
    return { zoom, x: (minX + maxX) / 2, y }
  }

  update(dt: number, sim: Sim, cfg: LavaConfig, now: number): void {
    const ease = 1 - Math.exp(-dt / cfg.cameraTau)
    let target: number | null = null
    let targetY = 0
    let margin = 3

    const moving = this.moving.filter((b) => !b.removed)
    if (moving.length === 0) this.override = false
    if (this.mode === 'auto' && moving.length > 0 && !this.override) {
      if (!this.returning) this.homeX ??= this.x
      this.returning = false
      this.mode = 'action'
    }

    switch (this.mode) {
      case 'frozen':
        break
      case 'manual':
        if (now > this.manualUntil) this.mode = 'auto'
        break
      case 'fit':
        target = this.fitZoom(sim)
        this.x += ((sim.platform.x0 + sim.platform.x1) / 2 - this.x) * ease
        break
      case 'action': {
        if (moving.length === 0) {
          // Everything has settled. If the view ended up over empty lava
          // (the last mover went in), go back to where the battle was.
          this.mode = 'auto'
          this.returning = this.homeX !== null && !sim.alive().some((b) => this.onScreen(b))
          if (!this.returning) this.homeX = null
          break
        }
        const f = this.frame(moving, sim, cfg)
        target = f.zoom
        targetY = f.y
        this.x += (f.x - this.x) * ease
        margin = Infinity // go wherever the action goes
        break
      }
      case 'winner': {
        const b = this.winnerBlock
        // A winner that went into the lava: hold the view where it sank.
        if (!b || b.removed) {
          targetY = this.y
          break
        }
        const f = this.frame([b], sim, cfg)
        target = f.zoom
        targetY = f.y
        this.x += (f.x - this.x) * ease
        margin = Infinity
        break
      }
      case 'auto':
        if (this.returning && this.homeX !== null) {
          this.x += (this.homeX - this.x) * ease
          if (Math.abs(this.homeX - this.x) * this.zoom < 2) {
            this.returning = false
            this.homeX = null
          }
        }
        this.x += this.vx * dt
        this.vx *= Math.exp(-dt * 3)
        target = this.autoZoom(sim, cfg)
        break
    }

    if (target !== null) this.zoom = Math.exp(Math.log(this.zoom) + (Math.log(target) - Math.log(this.zoom)) * ease)
    const [lo, hi] = this.zoomLimits(sim)
    this.zoom = Math.min(hi, Math.max(lo, this.zoom))
    if (this.mode !== 'frozen') this.y += (targetY - this.y) * ease
    this.x = Math.min(sim.platform.x1 + margin, Math.max(sim.platform.x0 - margin, this.x))
  }
}
