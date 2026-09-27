import { play } from './audio'
import {
  apply,
  axisAngle,
  cross,
  dot,
  HOME,
  mul,
  orthonormalize,
  project,
  ray,
  rayCube,
  rotation,
  sub,
  transpose,
  type Camera,
  type Mat3,
  type Vec3,
} from './camera'
import { cubeSprite, depthOf, drawCube, drawOrb, drawTable, ringPoint, RINGS } from './render'
import { World, type Colour, type Cube, type Piece } from './world'

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
  /** Tap-turn animation, ms. */
  turnMs: 200,
  /** Gliding back to the home view, ms. */
  homeMs: 600,
  /** A flicked orb keeps spinning, slowing with this time constant, ms. */
  spinDecayMs: 350,
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
  z: number
  /** The magnets catch: it lands against or on other cubes. */
  touch: boolean
}

/** A turning speed: about a world axis (a ring) or a view axis (free spin). */
interface Spin {
  space: 'world' | 'view'
  axis: Vec3
  /** rad per ms */
  rate: number
  t: number
}

type Grip =
  /** Finger down on a cube; slow or quick is not decided yet. */
  | { kind: 'press'; cube: Cube; samples: Sample[] }
  /**
   * A piece in hand. (offX, offY): from the finger to the aim point — the
   * screen spot under the grabbed cube's bottom centre, which decides
   * where it goes. (ax, ay): the aim point as drawn (with the magnets' lean).
   */
  | { kind: 'held'; piece: Piece; offX: number; offY: number; ax: number; ay: number; sx: number; sy: number; land: Land }
  /** Finger on empty table: two of these pinch the view. */
  | { kind: 'pan'; x: number; y: number }
  /** Finger on the orb: along a ring (its index) or free (null). Positions are from the orb's centre, in radii. */
  | { kind: 'orb'; ring: number | null; x0: number; y0: number; x: number; y: number; moved: boolean; spin: Spin | null }

interface Anim {
  t0: number
  ms: number
  /** Screen offset to ease out of, px. */
  dx?: number
  dy?: number
  /** Height to ease down from, cubes. */
  dz?: number
  /** A tap-turn: swing the last quarter turn about this column. */
  turn?: { px: number; py: number }
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
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export class Board {
  readonly cam: Camera = { R: HOME, T: [0.5, 0.5, 0], ox: 0, oy: 0, zoom: 64, w: 1, h: 1 }
  readonly world: World
  private grips = new Map<number, Grip>()
  private anims = new Map<Cube, Anim>()
  private rect = { left: 0, top: 0 }
  private orbRect = { left: 0, top: 0, size: 1 }
  private dpr = 1
  private dirty = true
  private raf = 0
  private last = 0
  private overTray = false
  /** Spin left over from a flick of the orb. */
  private spin: Spin | null = null
  /** Gliding home: from R0 by `angle` about `axis`. */
  private homing: { R0: Mat3; axis: Vec3; angle: number; t0: number } | null = null
  /** The last slow/quick call, for tuning from devtools. */
  lastDecision: { speed: number; tear: boolean; samples: number[][] } | null = null
  private readonly canvas: HTMLCanvasElement
  private readonly orb: HTMLCanvasElement
  private readonly hooks: BoardHooks

  constructor(canvas: HTMLCanvasElement, orb: HTMLCanvasElement, world: World, hooks: BoardHooks) {
    this.canvas = canvas
    this.orb = orb
    this.world = world
    this.hooks = hooks
    this.resize()
    this.fit()
    const loop = (t: number) => {
      this.frame(t)
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
    this.cam.w = r.width
    this.cam.h = r.height
    const o = this.orb.getBoundingClientRect()
    this.orbRect = { left: o.left, top: o.top, size: o.width }
    this.orb.width = Math.round(o.width * this.dpr)
    this.orb.height = Math.round(o.height * this.dpr)
    this.dirty = true
  }

  /** The free area of the canvas, clear of the tray. */
  private freeArea() {
    let right = this.cam.w
    let bottom = this.cam.h
    const tray = this.hooks.trayRect()
    if (tray) {
      if (tray.height > tray.width) right = Math.min(right, tray.left - this.rect.left - 8)
      else bottom = Math.min(bottom, tray.top - this.rect.top - 8)
    }
    return { right, bottom }
  }

  private bounds(): { min: Vec3; max: Vec3 } | null {
    const cubes = this.world.all()
    if (!cubes.length) return null
    const min: Vec3 = [Infinity, Infinity, Infinity]
    const max: Vec3 = [-Infinity, -Infinity, -Infinity]
    for (const c of cubes) {
      const p = [c.x, c.y, c.z]
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i])
        max[i] = Math.max(max[i], p[i] + 1)
      }
    }
    return { min, max }
  }

  /** Bring the whole build into view, clear of the tray (spec: fit button). The angle stays. */
  fit(): void {
    const c = this.cam
    const { right, bottom } = this.freeArea()
    const b = this.bounds()
    if (!b) {
      c.T = [0.5, 0.5, 0]
      c.zoom = clamp(Math.min(right, bottom) / 9, 40, 80)
      c.ox = right / 2 - c.w / 2
      c.oy = bottom / 2 - c.h / 2
      this.dirty = true
      return
    }
    const C: Vec3 = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2) as Vec3
    const xs: number[] = []
    const ys: number[] = []
    for (const x of [b.min[0], b.max[0]])
      for (const y of [b.min[1], b.max[1]])
        for (const z of [b.min[2], b.max[2]]) {
          const v = apply(c.R, sub([x, y, z], C))
          xs.push(v[0])
          ys.push(v[1])
        }
    const w = Math.max(...xs) - Math.min(...xs)
    const h = Math.max(...ys) - Math.min(...ys)
    c.zoom = clamp(Math.min(right / (w + 3), bottom / (h + 3)), TUNING.minZoom, 90)
    c.T = C
    c.ox = right / 2 - c.w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * c.zoom
    c.oy = bottom / 2 - c.h / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * c.zoom
    this.dirty = true
  }

  private local(e: PointerEvent | WheelEvent) {
    return { x: e.clientX - this.rect.left, y: e.clientY - this.rect.top }
  }

  /** The front-most cube along the line of sight through a screen point, and the face it enters by. */
  private pick(sx: number, sy: number): { cube: Cube; normal: Vec3 } | null {
    const r = ray(this.cam, sx, sy)
    let best: { cube: Cube; normal: Vec3; t: number } | null = null
    for (const c of this.world.all()) {
      const h = rayCube(r.o, r.d, [c.x, c.y, c.z])
      if (h && (!best || h.t < best.t)) best = { cube: c, normal: h.normal, t: h.t }
    }
    return best
  }

  /** Screen offset of a cube's centre from its bottom centre, in this view. */
  private upOffset() {
    const u = apply(this.cam.R, [0, 0, 0.5])
    return { x: u[0] * this.cam.zoom, y: u[1] * this.cam.zoom }
  }

  /** A finger lands on the canvas. */
  down(e: PointerEvent): void {
    const { x, y } = this.local(e)
    const hit = this.pick(x, y)
    this.grips.set(e.pointerId, hit ? { kind: 'press', cube: hit.cube, samples: [{ t: e.timeStamp, x, y }] } : { kind: 'pan', x, y })
  }

  /** A finger drags a new cube out of the tray. */
  spawn(colour: Colour, e: PointerEvent): void {
    const { x, y } = this.local(e)
    const up = this.upOffset() // the cube's centre under the finger
    this.hold(e.pointerId, { cells: [{ dx: 0, dy: 0, dz: 0, c: colour }] }, up.x, up.y, x, y)
  }

  private hold(id: number, piece: Piece, offX: number, offY: number, sx: number, sy: number): void {
    const grip: Grip = { kind: 'held', piece, offX, offY, ax: 0, ay: 0, sx, sy, land: { x: 0, y: 0, z: 0, touch: false } }
    this.grips.set(id, grip)
    this.aim(grip, sx, sy)
  }

  /**
   * Where a held piece will go (spec: magnets): the grabbed cube goes where
   * its aim point looks — against the face of the cube seen there, or onto
   * the table — then rests (lifted out of cubes, dropped if nothing holds it).
   */
  private aim(g: Extract<Grip, { kind: 'held' }>, sx: number, sy: number): void {
    const a = { x: sx - g.offX, y: sy - g.offY }
    const hit = this.pick(a.x, a.y)
    let target: Vec3
    if (hit) target = [hit.cube.x + hit.normal[0], hit.cube.y + hit.normal[1], hit.cube.z + hit.normal[2]]
    else {
      const r = ray(this.cam, a.x, a.y)
      // Onto the table — or, seen edge-on, at the height of the view's centre.
      const t = Math.abs(r.d[2]) > 0.02 ? -r.o[2] / r.d[2] : dot(sub(this.cam.T, r.o), r.d)
      const p = [0, 1, 2].map((i) => r.o[i] + r.d[i] * t)
      target = [Math.floor(p[0]), Math.floor(p[1]), Math.max(0, Math.floor(p[2] + 1e-6))]
    }
    const s = this.world.spot(g.piece, target[0], target[1], target[2])
    g.land = { ...s, touch: this.world.touches(g.piece, s.x, s.y, s.z) }
    // The magnets' pull: lean toward the spot it will snap to.
    const k = g.land.touch ? TUNING.pull : 0
    const L = project(this.cam, [s.x + 0.5, s.y + 0.5, s.z])
    g.ax = a.x + (L.x - a.x) * k
    g.ay = a.y + (L.y - a.y) * k
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
    if (g.kind === 'orb') {
      this.orbMove(g, e)
      return
    }
    const { x, y } = this.local(e)
    if (g.kind === 'press') this.decide(e.pointerId, g, x, y, e.timeStamp)
    else if (g.kind === 'held') this.aim(g, x, y)
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
    const foot = project(this.cam, [cube.x + 0.5, cube.y + 0.5, cube.z])
    const piece = this.world.pickUp(tear ? [cube] : group, cube)
    if (tear) {
      play('tear', 0.8)
      this.animateFalls(this.world.settle())
    }
    this.hold(id, piece, s0.x - foot.x, s0.y - foot.y, x, y)
  }

  /** Two fingers on empty table pinch and pan; one alone does nothing (spec: camera). */
  private pan(g: Extract<Grip, { kind: 'pan' }>, x: number, y: number): void {
    const other = [...this.grips.values()].find((o): o is Extract<Grip, { kind: 'pan' }> => o !== g && o.kind === 'pan')
    if (other) {
      const oldMid = { x: (g.x + other.x) / 2, y: (g.y + other.y) / 2 }
      const newMid = { x: (x + other.x) / 2, y: (y + other.y) / 2 }
      const oldDist = Math.hypot(g.x - other.x, g.y - other.y)
      const newDist = Math.hypot(x - other.x, y - other.y)
      this.zoomAbout(oldMid, newMid, oldDist > 10 ? newDist / oldDist : 1)
    }
    g.x = x
    g.y = y
  }

  /** Scale the view by `k` about screen point `from`, which ends up at `to`. */
  private zoomAbout(from: { x: number; y: number }, to: { x: number; y: number }, k: number): void {
    const c = this.cam
    const vx = (from.x - c.w / 2 - c.ox) / c.zoom
    const vy = (from.y - c.h / 2 - c.oy) / c.zoom
    c.zoom = clamp(c.zoom * k, TUNING.minZoom, TUNING.maxZoom)
    c.ox = to.x - c.w / 2 - vx * c.zoom
    c.oy = to.y - c.h / 2 - vy * c.zoom
    this.refreshHeld()
  }

  /** Mouse wheel zoom, for testing at a desk. */
  wheel(e: WheelEvent): void {
    const p = this.local(e)
    this.zoomAbout(p, p, Math.exp(-e.deltaY * 0.0015))
  }

  private refreshHeld(): void {
    for (const g of this.grips.values()) if (g.kind === 'held') this.aim(g, g.sx, g.sy)
    this.dirty = true
  }

  // ------------------------------------------------------------ the orb

  /** Orb-local position: from the orb's centre, in units of its radius. */
  private orbLocal(e: PointerEvent) {
    const r = this.orbRect.size * 0.42
    return { x: (e.clientX - this.orbRect.left - this.orbRect.size / 2) / r, y: (e.clientY - this.orbRect.top - this.orbRect.size / 2) / r }
  }

  /**
   * A finger on the orb (spec: the view orb). On the little cube in the
   * middle it spins freely, the ball following the finger; out on a ring it
   * turns the world about that ring's axis only. (Rings cross the middle
   * too, so the middle is kept for the cube.)
   */
  orbDown(e: PointerEvent): void {
    const { x, y } = this.orbLocal(e)
    let ring: number | null = null
    let best = Math.hypot(x, y) < 0.4 ? 0 : 0.2 // how close counts as on a ring, in radii
    for (let i = 0; i < 3; i++) {
      for (let s = 0; s < 72; s++) {
        const p = apply(this.cam.R, ringPoint(i, (s / 72) * 2 * Math.PI))
        if (p[2] < -0.15) continue // round the back
        const d = Math.hypot(p[0] - x, p[1] - y)
        if (d < best) {
          best = d
          ring = i
        }
      }
    }
    this.spin = null
    this.homing = null
    this.grips.set(e.pointerId, { kind: 'orb', ring, x0: x, y0: y, x, y, moved: false, spin: null })
    this.dirty = true
  }

  /** Turn so the world spins about the build, not about wherever the view is centred. */
  private pivotOnBuild(): void {
    const b = this.bounds()
    if (!b) return
    const c = this.cam
    const C: Vec3 = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2) as Vec3
    const v = apply(c.R, sub(C, c.T))
    c.ox += v[0] * c.zoom
    c.oy += v[1] * c.zoom
    c.T = C
  }

  private orbMove(g: Extract<Grip, { kind: 'orb' }>, e: PointerEvent): void {
    const { x, y } = this.orbLocal(e)
    const r = this.orbRect.size * 0.42
    if (!g.moved) {
      if (Math.hypot(x - g.x0, y - g.y0) * r < TUNING.slop) return
      g.moved = true
      this.pivotOnBuild()
    }
    const c = this.cam
    const dt = Math.max(1, e.timeStamp - (g.spin?.t ?? e.timeStamp - 16))
    if (g.ring !== null) {
      // Along the ring: the grabbed point of the ring follows the finger.
      const axis = RINGS[g.ring].axis
      let near: Vec3 = ringPoint(g.ring, 0)
      let nd = Infinity
      for (let s = 0; s < 72; s++) {
        const p = ringPoint(g.ring, (s / 72) * 2 * Math.PI)
        const v = apply(c.R, p)
        const d = Math.hypot(v[0] - g.x, v[1] - g.y) - v[2] * 0.01 // the front one, where it overlaps
        if (d < nd) {
          nd = d
          near = p
        }
      }
      const T = apply(c.R, cross(axis, near))
      const along = (x - g.x) * T[0] + (y - g.y) * T[1]
      // Seen edge-on the ring barely moves across the screen: cap how fast that turns it.
      const angle = along / Math.max(T[0] * T[0] + T[1] * T[1], 0.09)
      c.R = orthonormalize(mul(c.R, rotation(axis, angle)))
      g.spin = { space: 'world', axis, rate: angle / dt, t: e.timeStamp }
    } else {
      // Free: the point of the ball under the finger follows it.
      const onBall = (px: number, py: number): Vec3 => {
        const d2 = px * px + py * py
        return d2 < 1 ? [px, py, Math.sqrt(1 - d2)] : [px / Math.sqrt(d2), py / Math.sqrt(d2), 0]
      }
      const a = onBall(g.x, g.y)
      const b = onBall(x, y)
      const angle = Math.acos(clamp(dot(a, b), -1, 1))
      if (angle > 1e-5) {
        const axis = cross(a, b)
        c.R = orthonormalize(mul(rotation(axis, angle), c.R))
        g.spin = { space: 'view', axis, rate: angle / dt, t: e.timeStamp }
      }
    }
    g.x = x
    g.y = y
    this.refreshHeld()
  }

  private orbUp(g: Extract<Grip, { kind: 'orb' }>, e: PointerEvent): void {
    if (!g.moved) {
      // A tap: glide back home.
      const R0 = this.cam.R
      const rel = axisAngle(mul(HOME, transpose(R0)))
      if (rel.angle > 1e-3) {
        this.pivotOnBuild()
        this.homing = { R0, axis: rel.axis, angle: rel.angle, t0: performance.now() }
      }
      return
    }
    // A flick keeps it spinning for a moment.
    if (g.spin && e.timeStamp - g.spin.t < 60) this.spin = { ...g.spin, rate: Math.min(g.spin.rate, 0.02) }
  }

  // ------------------------------------------------------------ release

  /** A finger lifts (or the system cancels it). */
  up(e: PointerEvent): void {
    const g = this.grips.get(e.pointerId)
    if (!g) return
    this.grips.delete(e.pointerId)
    this.dirty = true
    if (g.kind === 'orb') {
      this.orbUp(g, e)
      return
    }
    // A press that never became a drag is a tap: turn the group (spec: turning).
    if (g.kind === 'press') {
      this.turn(g.cube)
      return
    }
    if (g.kind !== 'held') return
    const { x, y } = this.local(e)
    if (this.overTrayAt(x, y)) {
      play('away', 0.5)
    } else {
      this.aim(g, x, y)
      const drawn = this.cellCentres(g)
      const placed = this.world.place(g.piece, g.land.x, g.land.y, g.land.z)
      // Ease each cube from where it was drawn in hand into its spot.
      const now = performance.now()
      placed.forEach((c, i) => {
        const to = project(this.cam, [c.x + 0.5, c.y + 0.5, c.z + 0.5])
        this.anims.set(c, { t0: now, ms: TUNING.snapMs, dx: drawn[i].x - to.x, dy: drawn[i].y - to.y })
      })
      play('click', g.land.touch ? 0.9 : 0.35)
    }
    this.updateTrayHover()
    this.hooks.onChange(this.world)
  }

  /** Where each cell of a held piece is drawn: screen centres, in piece order. */
  private cellCentres(g: Extract<Grip, { kind: 'held' }>): Array<{ x: number; y: number }> {
    const up = this.upOffset()
    return g.piece.cells.map((p) => {
      const v = apply(this.cam.R, [p.dx, p.dy, p.dz])
      return { x: g.ax + up.x + v[0] * this.cam.zoom, y: g.ay + up.y + v[1] * this.cam.zoom }
    })
  }

  /**
   * Tap to turn: a quarter turn clockwise about the tapped cube. Tap is the
   * gesture young children manage most reliably, and turning by tapping is
   * the usual convention; four taps bring a group back.
   */
  private turn(pivot: Cube): void {
    if (!this.world.at(pivot.x, pivot.y, pivot.z)) return // picked up by another finger meanwhile
    const now = performance.now()
    for (const { cube, from } of this.world.turn(pivot)) {
      this.anims.set(cube, { t0: now, ms: TUNING.turnMs, dz: from.z - cube.z, turn: { px: pivot.x, py: pivot.y } })
    }
    play('click', 0.7)
    this.hooks.onChange(this.world)
    this.dirty = true
  }

  private animateFalls(fell: Array<{ cube: Cube; fell: number }>): void {
    const now = performance.now()
    for (const { cube, fell: d } of fell) this.anims.set(cube, { t0: now, ms: TUNING.snapMs, dz: d })
  }

  // ------------------------------------------------------------ frames

  private frame(t: number): void {
    const dt = this.last ? Math.min(50, t - this.last) : 16
    this.last = t
    const c = this.cam
    if (this.homing) {
      const k = Math.min(1, (performance.now() - this.homing.t0) / TUNING.homeMs)
      c.R = k >= 1 ? HOME : mul(rotation(this.homing.axis, this.homing.angle * easeInOut(k)), this.homing.R0)
      if (k >= 1) this.homing = null
      this.refreshHeld()
    } else if (this.spin) {
      const s = this.spin
      const turn = rotation(s.axis, s.rate * dt)
      c.R = orthonormalize(s.space === 'world' ? mul(c.R, turn) : mul(turn, c.R))
      s.rate *= Math.exp(-dt / TUNING.spinDecayMs)
      if (s.rate < 5e-5) this.spin = null
      this.refreshHeld()
    }
    if (!this.dirty && !this.anims.size) return
    this.dirty = false
    this.draw()
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')
    const octx = this.orb.getContext('2d')
    if (!ctx) return
    const c = this.cam
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    drawTable(ctx, c)
    const sprite = cubeSprite(c.R, c.zoom)

    const now = performance.now()
    const world = this.world
    for (const cube of world.all().sort((a, b) => depthOf(c.R, a) - depthOf(c.R, b))) {
      let centre: Vec3 = [cube.x + 0.5, cube.y + 0.5, cube.z + 0.5]
      let dx = 0
      let dy = 0
      const a = this.anims.get(cube)
      if (a) {
        const t = (now - a.t0) / a.ms
        if (t >= 1) this.anims.delete(cube)
        else {
          const k = 1 - ease(t)
          if (a.turn) {
            // Back along the quarter turn about the pivot's column: at k = 1 it sits where it was.
            const th = (-k * Math.PI) / 2
            const rx = cube.x - a.turn.px
            const ry = cube.y - a.turn.py
            centre = [a.turn.px + rx * Math.cos(th) - ry * Math.sin(th) + 0.5, a.turn.py + rx * Math.sin(th) + ry * Math.cos(th) + 0.5, centre[2]]
          }
          centre = [centre[0], centre[1], centre[2] + (a.dz ?? 0) * k]
          dx = (a.dx ?? 0) * k
          dy = (a.dy ?? 0) * k
        }
      }
      const s = project(c, centre)
      drawCube(ctx, sprite, s.x + dx, s.y + dy, cube.c, (n) => !!world.at(cube.x + n[0], cube.y + n[1], cube.z + n[2]))
    }

    for (const g of this.grips.values()) {
      if (g.kind !== 'held') continue
      const own = new Set(g.piece.cells.map((p) => `${p.dx},${p.dy},${p.dz}`))
      const inPiece = (p: { dx: number; dy: number; dz: number }) => (n: Vec3) => own.has(`${p.dx + n[0]},${p.dy + n[1]},${p.dz + n[2]}`)
      const order = g.piece.cells.map((p, i) => ({ p, i, z: apply(c.R, [p.dx, p.dy, p.dz])[2] })).sort((a, b) => a.z - b.z)
      // Where the magnets will put it.
      if (g.land.touch) {
        for (const { p } of order) {
          const s = project(c, [g.land.x + p.dx + 0.5, g.land.y + p.dy + 0.5, g.land.z + p.dz + 0.5])
          drawCube(ctx, sprite, s.x, s.y, p.c, inPiece(p), 0.3)
        }
      }
      // In hand: above everything, with a soft shadow.
      const centres = this.cellCentres(g)
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = c.zoom * 0.35
      ctx.shadowOffsetY = c.zoom * 0.2
      for (const { p, i } of order) drawCube(ctx, sprite, centres[i].x, centres[i].y, p.c, inPiece(p))
      ctx.restore()
    }

    if (octx) {
      octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      const active = [...this.grips.values()].find((g): g is Extract<Grip, { kind: 'orb' }> => g.kind === 'orb')
      drawOrb(octx, c.R, this.orbRect.size, active?.ring ?? null)
    }
  }
}
