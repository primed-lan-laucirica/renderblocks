import type { LavaConfig } from './config'
import type { Block, Sim } from './sim'

/** The platform top sits at this share of the screen height (spec 7). */
export const HORIZON = 0.6

type Mode = 'auto' | 'fit' | 'manual' | 'follow' | 'frozen' | 'winner'

/**
 * Horizontal scroll + zoom over the platform. Zoom is px per world unit.
 * Vertically the platform top sits at HORIZON, except while a block falls
 * toward the lava: then `y` (the world height drawn at HORIZON) rides down
 * with it so the fall is seen, and eases back to 0 afterwards.
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
  private followBlock: Block | null = null
  private followUntil = 0
  private manualUntil = 0
  /** Where the view was when a grab began; restored if that block goes into the lava. */
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
    return [this.fitZoom(sim) * 0.8, (0.6 * this.vh) / smallest]
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

  panBy(dxScreen: number): void {
    this.returning = false
    this.x -= dxScreen / this.zoom
    if (this.mode === 'fit' || this.mode === 'follow') this.mode = 'auto'
  }

  fit(): void {
    this.mode = 'fit'
    this.vx = 0
  }

  follow(b: Block, now: number): void {
    this.mode = 'follow'
    this.followBlock = b
    this.followUntil = now + 3
  }

  showWinner(b: Block): void {
    this.mode = 'winner'
    this.followBlock = b
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

  update(dt: number, sim: Sim, cfg: LavaConfig, now: number): void {
    const ease = 1 - Math.exp(-dt / cfg.cameraTau)
    let target: number | null = null
    let targetY = 0
    let margin = 3

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
      case 'follow':
      case 'winner': {
        const b = this.followBlock
        // A block falling toward the lava is followed all the way down, however long that takes.
        const falling = !!b && b.outAt === null && b.cur.y < 0 && b.cur.x > sim.platform.x0 - 1e3
        const offPlatform = !!b && (b.cur.x < sim.platform.x0 || b.cur.x > sim.platform.x1)
        if (!b || b.removed || (this.mode === 'follow' && (b.outAt !== null || (now > this.followUntil && !(falling && offPlatform))))) {
          // It went into the lava: come back to where the battle was.
          this.returning = !!b && b.outAt !== null && this.homeX !== null
          this.mode = 'auto'
          break
        }
        if (this.mode === 'follow' && !offPlatform && now > this.followUntil - 2.5 && sim.speed(b) < 0.3 * Math.sqrt(b.shape.L)) {
          this.mode = 'auto'
          break
        }
        this.x += (b.cur.x - this.x) * ease
        margin = Infinity // go wherever the block goes
        const reach = b.shape.L * 0.75
        if (this.mode === 'follow' && offPlatform && b.outAt === null && b.cur.y < b.shape.h) {
          // Falling off the edge. Frame the whole drop — platform above, lava
          // below — if the block stays big enough to see; otherwise ride down
          // with it until the lava comes up into view.
          const drop = -sim.lavaY
          const frame = (0.8 * this.vh) / (drop + 2)
          if (frame * b.shape.h >= 28) {
            target = Math.min(this.blockZoom(b, cfg), frame)
            // Lava surface at 90% of the screen height.
            targetY = Math.min(0, sim.lavaY + ((0.9 - HORIZON) * this.vh) / target)
          } else {
            target = this.blockZoom(b, cfg) * 0.6
            // Keep the block a little above centre, but stop once the lava is near the bottom edge.
            targetY = Math.min(0, Math.max(b.cur.y - (0.15 * this.vh) / target, sim.lavaY + ((0.92 - HORIZON) * this.vh) / target))
          }
          break
        }
        // Otherwise zoom out as far as needed to keep it between the lava and the top edge.
        target = this.blockZoom(b, cfg)
        if (b.cur.y + reach > 0) target = Math.min(target, (HORIZON * this.vh * 0.9) / (b.cur.y + reach))
        if (b.cur.y - reach < 0) target = Math.min(target, ((1 - HORIZON) * this.vh * 0.8) / (reach - b.cur.y))
        break
      }
      case 'auto':
        if (this.returning && this.homeX !== null) {
          this.x += (this.homeX - this.x) * ease
          if (Math.abs(this.homeX - this.x) * this.zoom < 2) this.returning = false
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
