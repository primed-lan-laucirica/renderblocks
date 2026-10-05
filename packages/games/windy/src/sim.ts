import RAPIER from '@dimforge/rapier2d-compat'
import { body, mass, type Character } from './characters'
import { chunk, CHUNK, START, startRoof, type Piece, type Zone } from './course'
import { gustNow, push, windAt } from './wind'

let ready: Promise<void> | null = null
/** Load the physics engine (once). */
export const initPhysics = () => (ready ??= RAPIER.init())

export const STEP = 1 / 60
export const GRAVITY = 20
const FRICTION = 0.6

export interface Pose {
  x: number
  y: number
  a: number
}

export interface Rider {
  c: Character
  geo: ReturnType<typeof body>
  rb: RAPIER.RigidBody
  /** Where he started (x), and the farthest he has been. */
  start: number
  best: number
  prev: Pose
  cur: Pose
  lastThud: number
}

interface Built {
  pieces: Piece[]
  zones: Zone[]
  fixed: RAPIER.RigidBody
  seesaws: { piece: Extract<Piece, { kind: 'seesaw' }>; plank: RAPIER.RigidBody }[]
}

interface Grab {
  rider: Rider
  local: { x: number; y: number }
  target: { x: number; y: number }
}

/**
 * The town and everyone in it: a Rapier world. Chunks of town are built
 * ahead of the characters and removed far behind them; the wind pushes on
 * each character by how much it shows to the wind; a finger can grab any
 * character and fling it.
 */
export class Town {
  readonly world: RAPIER.World
  readonly riders: Rider[] = []
  readonly built = new Map<number, Built>()
  private readonly byCollider = new Map<number, Rider>()
  private readonly events = new RAPIER.EventQueue(true)
  private grab: Grab | null = null
  time = 0
  gustAt = -1e9
  /** The wind can be turned off, so they move only when flung. */
  windOn = true
  /** Gravity (blocks/s²), from the slider. */
  gravity = GRAVITY
  /**
   * How much wider the start rooftop is than usual, to fit everyone in the
   * lineup (no limit on how many); the rest of the town moves along by this.
   */
  readonly offset: number

  constructor(cast: Character[]) {
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY })
    this.world.timestep = STEP
    // The lineup decides how long the start rooftop is.
    const geos = cast.map((c) => body(c))
    const widths = geos.map((g) => (g.x1 - g.x0) * g.scale)
    const needed = widths.reduce((a, w) => a + w + Math.max(0.8, 0.2 * w), 0) + 4
    this.offset = Math.max(0, needed - START.w)
    // Behind the start and under the whole rooftop: a street, and a wall, so nobody is lost off the left.
    const behind = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    this.world.createCollider(RAPIER.ColliderDesc.cuboid((200 + this.offset) / 2, 0.5).setTranslation((this.offset - 200) / 2, -0.5).setFriction(FRICTION), behind)
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 60).setTranslation(-40, 60), behind)
    this.ensure(0)

    // The lineup: side by side on the start rooftop, in the order chosen.
    const roof = startRoof()
    let x = roof.x0
    cast.forEach((c, ci) => {
      const geo = geos[ci]
      const s = geo.scale
      const w = (geo.x1 - geo.x0) * s
      const ox = x - geo.x0 * s
      const oy = roof.y - geo.y0 * s + 0.01
      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(ox, oy).setCcdEnabled(true).setLinearDamping(0.05).setAngularDamping(0.15))
      // Many little steps collide as their outline; everything else as its rectangles.
      const area = geo.rects.reduce((a, r) => a + r.w * r.h, 0) * s * s
      const density = mass(c.n) / Math.max(0.01, area)
      const descs =
        geo.rects.length > 24
          ? [RAPIER.ColliderDesc.convexHull(new Float32Array(geo.rects.flatMap((r) => [r.x, r.y, r.x + r.w, r.y, r.x + r.w, r.y + r.h, r.x, r.y + r.h]).map((v) => v * s)))!]
          : geo.rects.map((r) => RAPIER.ColliderDesc.cuboid((r.w * s) / 2, (r.h * s) / 2).setTranslation((r.x + r.w / 2) * s, (r.y + r.h / 2) * s))
      const pose = { x: ox, y: oy, a: 0 }
      const rider: Rider = { c, geo, rb, start: ox, best: 0, prev: pose, cur: pose, lastThud: -1 }
      for (const d of descs) {
        const col = this.world.createCollider(d.setDensity(density).setFriction(FRICTION).setRestitution(0.15).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), rb)
        this.byCollider.set(col.handle, rider)
      }
      this.riders.push(rider)
      x += w + Math.max(0.8, 0.2 * w)
    })
  }

  /** Which chunk a world x is in (chunks start after the widened rooftop). */
  chunkAt(x: number): number {
    return Math.floor((x - this.offset) / CHUNK)
  }

  /** Every windy stretch built so far. */
  zones(): Zone[] {
    return [...this.built.values()].flatMap((b) => b.zones)
  }

  /** Build the town out to well ahead of x, and drop what's far behind everyone. */
  ensure(x: number): void {
    const behind = Math.min(x, ...this.riders.map((r) => r.cur.x)) - 160
    const ahead = Math.max(x, ...this.riders.map((r) => r.cur.x)) + 140
    for (let i = Math.max(0, this.chunkAt(behind)); i <= this.chunkAt(ahead); i++) if (!this.built.has(i)) this.build(i)
    for (const [i, b] of this.built) {
      if ((i + 1) * CHUNK + this.offset >= behind) continue
      for (const s of b.seesaws) this.world.removeRigidBody(s.plank)
      this.world.removeRigidBody(b.fixed)
      this.built.delete(i)
    }
  }

  private build(i: number): void {
    // The town moves along by the offset; the start rooftop (and its windy stretch) grows instead.
    const raw = chunk(i)
    const o = this.offset
    const pieces: Piece[] = raw.pieces.map((p) => (i === 0 && p.kind === 'building' && p.x === START.x ? { ...p, w: p.w + o } : { ...p, x: p.x + o }))
    const zones: Zone[] = raw.zones.map((z) => (i === 0 && z.x0 === START.x - 4 ? { ...z, x1: z.x1 + o } : { ...z, x0: z.x0 + o, x1: z.x1 + o }))
    const fixed = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    const add = (d: RAPIER.ColliderDesc) => this.world.createCollider(d.setFriction(FRICTION), fixed)
    // The street.
    add(RAPIER.ColliderDesc.cuboid(CHUNK / 2 + 0.5, 0.5).setTranslation(i * CHUNK + CHUNK / 2 + o, -0.5))
    const seesaws: Built['seesaws'] = []
    for (const p of pieces) {
      if (p.kind === 'building') add(RAPIER.ColliderDesc.cuboid(p.w / 2, p.h / 2).setTranslation(p.x + p.w / 2, p.h / 2))
      else if (p.kind === 'ramp') add(RAPIER.ColliderDesc.convexHull(new Float32Array([p.x, 0, p.x + p.w, 0, p.x + p.w, p.h]))!)
      else if (p.kind === 'pad')
        add(RAPIER.ColliderDesc.cuboid(p.w / 2, 0.15).setTranslation(p.x + p.w / 2, p.y + 0.15).setRestitution(0.9).setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max))
      else if (p.kind === 'seesaw') {
        add(RAPIER.ColliderDesc.convexHull(new Float32Array([p.x - 0.9, 0, p.x + 0.9, 0, p.x, p.y]))!)
        const plank = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y + 0.2).setAngularDamping(0.3))
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(p.len / 2, 0.2).setDensity(2).setFriction(FRICTION), plank)
        this.world.createImpulseJoint(RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: p.x, y: p.y + 0.2 }), plank, fixed, true)
        seesaws.push({ piece: p, plank })
      }
    }
    this.built.set(i, { pieces, zones, fixed, seesaws })
  }

  /** Buildings in the chunks around x. */
  private buildingsNear(x: number): Extract<Piece, { kind: 'building' }>[] {
    const i = this.chunkAt(x)
    const out: Extract<Piece, { kind: 'building' }>[] = []
    for (const k of [i - 1, i, i + 1]) for (const p of this.built.get(k)?.pieces ?? []) if (p.kind === 'building') out.push(p)
    return out
  }

  /** The gravity slider: changes how heavy everything falls, right away. */
  setGravity(g: number): void {
    this.gravity = g
    this.world.gravity = { x: 0, y: -g }
    for (const r of this.riders) r.rb.wakeUp()
  }

  setWind(on: boolean): void {
    this.windOn = on
    for (const r of this.riders) r.rb.wakeUp()
  }

  /** A big gust from the 🌬️ button. */
  gust(): void {
    this.gustAt = this.time
    for (const r of this.riders) r.rb.wakeUp()
  }

  /** The wind where x is, right now (none when it's turned off). */
  windAt(x: number): number {
    return this.windOn ? windAt(x, this.time, this.zones(), gustNow(this.time - this.gustAt)) : 0
  }

  /** Which character is at a world point (the one drawn on top: the last). */
  riderAt(x: number, y: number): Rider | null {
    let hit: Rider | null = null
    this.world.intersectionsWithPoint({ x, y }, (col) => {
      const r = this.byCollider.get(col.handle)
      if (r) hit = r
      return true
    })
    if (hit) return hit
    // Generous for small ones: within a block of one counts.
    let best: Rider | null = null
    let bestD = 1.2
    for (const r of this.riders) {
      const c = r.rb.worldCom()
      const d = Math.hypot(c.x - x, c.y - y) - Math.max(r.geo.x1 - r.geo.x0, r.geo.y1 - r.geo.y0) * r.geo.scale * 0.5
      if (d < bestD) {
        bestD = d
        best = r
      }
    }
    return best
  }

  startGrab(r: Rider, x: number, y: number): void {
    const t = r.rb.translation()
    const a = r.rb.rotation()
    const dx = x - t.x
    const dy = y - t.y
    this.grab = { rider: r, local: { x: dx * Math.cos(-a) - dy * Math.sin(-a), y: dx * Math.sin(-a) + dy * Math.cos(-a) }, target: { x, y } }
    r.rb.wakeUp()
  }

  moveGrab(x: number, y: number): void {
    if (this.grab) this.grab.target = { x, y }
  }

  /** Let go: flung with its speed (capped, so nobody leaves the screen in one throw). */
  endGrab(): Rider | null {
    const g = this.grab
    this.grab = null
    if (!g) return null
    const rb = g.rider.rb
    rb.resetForces(true)
    rb.resetTorques(true)
    const v = rb.linvel()
    const sp = Math.hypot(v.x, v.y)
    const max = 38
    if (sp > max) rb.setLinvel({ x: (v.x * max) / sp, y: (v.y * max) / sp }, true)
    rb.setAngvel(Math.max(-12, Math.min(12, rb.angvel())), true)
    return g.rider
  }

  grabbed(): Rider | null {
    return this.grab?.rider ?? null
  }

  /** One step: wind, the finger's pull, physics. Returns how hard anyone landed (for thuds). */
  step(): number[] {
    for (const r of this.riders) r.prev = r.cur
    const zones = this.zones()
    const boost = gustNow(this.time - this.gustAt)
    for (const r of this.riders) {
      if (this.grab?.rider === r) continue
      if (!this.windOn) {
        r.rb.resetForces(true)
        continue
      }
      // What it shows the wind: the height of its tilted outline, pushed at the middle of it.
      const t = r.rb.translation()
      const a = r.rb.rotation()
      const s = r.geo.scale
      let lo = Infinity
      let hi = -Infinity
      const corners = r.geo.rects.length > 24 ? [{ x: r.geo.x0, y: r.geo.y0, w: r.geo.x1 - r.geo.x0, h: r.geo.y1 - r.geo.y0 }] : r.geo.rects
      for (const q of corners)
        for (const [cx, cy] of [
          [q.x, q.y],
          [q.x + q.w, q.y],
          [q.x, q.y + q.h],
          [q.x + q.w, q.y + q.h],
        ]) {
          const y = t.y + (cx * s) * Math.sin(a) + (cy * s) * Math.cos(a)
          lo = Math.min(lo, y)
          hi = Math.max(hi, y)
        }
      const com = r.rb.worldCom()
      const wind = windAt(com.x, this.time, zones, boost)
      const f = push(wind, r.rb.linvel().x, hi - lo)
      r.rb.resetForces(true)
      if (f > 0) r.rb.addForceAtPoint({ x: f, y: 0 }, { x: com.x, y: (lo + hi) / 2 }, true)
      // Against a building's windward wall the wind turns upward: an updraft that can carry him up and over.
      const half = (r.geo.x1 - r.geo.x0) * r.geo.scale * 0.5
      for (const b of this.buildingsNear(com.x)) {
        const gap = b.x - com.x - half
        if (gap < -0.5 || gap > 2.5 || lo > b.h + 0.5) continue
        const lift = push(wind, 0, hi - lo) * 1.3
        r.rb.addForce({ x: 0, y: lift }, true)
      }
    }
    if (this.grab) this.pull(this.grab)
    this.world.step(this.events)
    this.time += STEP
    const thuds: number[] = []
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      for (const h of [h1, h2]) {
        const r = this.byCollider.get(h)
        if (!r || this.time - r.lastThud < 0.12) continue
        const v = r.rb.linvel()
        const strength = Math.min(1, Math.hypot(v.x, v.y) / 20)
        if (strength < 0.12) continue
        r.lastThud = this.time
        thuds.push(strength)
      }
    })
    for (const r of this.riders) {
      const t = r.rb.translation()
      r.cur = { x: t.x, y: t.y, a: r.rb.rotation() }
      r.best = Math.max(r.best, t.x - r.start)
    }
    this.ensure(Math.max(...this.riders.map((r) => r.cur.x)))
    return thuds
  }

  /** The finger's pull: a damped spring at the grab point, scaled by mass so even giants follow. */
  private pull(g: Grab): void {
    const rb = g.rider.rb
    const t = rb.translation()
    const a = rb.rotation()
    const p = { x: t.x + g.local.x * Math.cos(a) - g.local.y * Math.sin(a), y: t.y + g.local.x * Math.sin(a) + g.local.y * Math.cos(a) }
    const v = rb.velocityAtPoint(p)
    const w = 14
    const z = 0.8
    let ax = w * w * (g.target.x - p.x) - 2 * z * w * v.x
    let ay = w * w * (g.target.y - p.y) - 2 * z * w * v.y + this.gravity
    const mag = Math.hypot(ax, ay)
    if (mag > 400) {
      ax *= 400 / mag
      ay *= 400 / mag
    }
    const m = rb.mass()
    rb.resetForces(true)
    rb.resetTorques(true)
    rb.addForceAtPoint({ x: m * ax, y: m * ay }, p, true)
  }
}
