import RAPIER from '@dimforge/rapier2d-compat'
import type { LavaConfig } from './config'
import { blockShape, type BlockShape } from './shapes'

let ready: Promise<void> | null = null
/** Rapier's WASM is inlined (compat build); this only instantiates it, once. */
export function initPhysics(): Promise<void> {
  return (ready ??= RAPIER.init())
}

export const STEP = 1 / 60
/** The shortest drop to the lava, in units, however small the blocks are. */
const MIN_DROP = 6
const SINK_S = 1.2

export interface Pose {
  x: number
  y: number
  a: number
}

export interface Block {
  id: number
  value: number
  shape: BlockShape
  body: RAPIER.RigidBody
  /** Pose before and after the last step — the renderer blends between them. */
  prev: Pose
  cur: Pose
  /** Sim time it went into the lava, or null while it is still in play. */
  outAt: number | null
  removed: boolean
  lastThud: number
}

export interface Thud {
  block: Block
  /** 0–1. */
  strength: number
}

export interface StepEvents {
  thuds: Thud[]
  sizzles: Block[]
}

interface Grab {
  block: Block
  /** Grab point in the block's own frame, so it swings around the finger. */
  local: { x: number; y: number }
  target: { x: number; y: number }
}

export class Sim {
  readonly world: RAPIER.World
  readonly blocks: Block[] = []
  /** Platform: top at y = 0, a slab `depth` thick, suspended in the air. */
  readonly platform: { x0: number; x1: number; depth: number }
  /**
   * Lava surface. Well below the platform — an air gap scaled to the
   * battle's tallest block — so a block knocked off has a long, visible fall.
   */
  readonly lavaY: number
  private readonly byCollider = new Map<number, Block>()
  private readonly events = new RAPIER.EventQueue(true)
  private grab: Grab | null = null
  private cfg: LavaConfig
  time = 0

  constructor(values: number[], cfg: LavaConfig) {
    this.cfg = cfg
    this.world = new RAPIER.World({ x: 0, y: -cfg.gravity })
    this.world.timestep = STEP

    // Smallest on the left, standing on the platform with size-relative gaps.
    let x = 0
    let prevW = 0
    values.forEach((value, id) => {
      const shape = blockShape(value)
      if (id > 0) x += Math.max(0.5, 0.15 * Math.max(prevW, shape.w))
      const pose = { x: x + shape.w / 2, y: shape.h / 2 + 0.002, a: 0 }
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(pose.x, pose.y)
          .setCcdEnabled(true)
          .setLinearDamping(cfg.linearDamping)
          .setAngularDamping(cfg.angularDamping),
      )
      const block: Block = { id, value, shape, body, prev: { ...pose }, cur: { ...pose }, outAt: null, removed: false, lastThud: -1 }
      for (const r of shape.rects) {
        const collider = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(r.w / 2, r.h / 2)
            .setTranslation(r.cx, r.cy)
            .setDensity(cfg.density)
            .setFriction(cfg.friction)
            .setRestitution(cfg.restitution)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
          body,
        )
        this.byCollider.set(collider.handle, block)
      }
      this.blocks.push(block)
      x += shape.w
      prevW = shape.w
    })

    const tallest = Math.max(1, ...this.blocks.map((b) => b.shape.h))
    const depth = Math.min(3, Math.max(1, 0.08 * tallest))
    this.platform = { x0: -3, x1: x + 3, depth }
    this.lavaY = -depth - Math.max(MIN_DROP, cfg.lavaDrop * tallest)
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid((this.platform.x1 - this.platform.x0) / 2, depth / 2)
        .setTranslation((this.platform.x0 + this.platform.x1) / 2, -depth / 2)
        .setFriction(cfg.friction)
        .setRestitution(cfg.restitution),
      ground,
    )
  }

  /** Apply edited tunables to the running world. */
  setConfig(cfg: LavaConfig): void {
    this.cfg = cfg
    this.world.gravity = { x: 0, y: -cfg.gravity }
    for (const b of this.blocks) {
      if (b.removed || b.outAt !== null) continue
      b.body.setLinearDamping(cfg.linearDamping)
      b.body.setAngularDamping(cfg.angularDamping)
      for (let i = 0; i < b.body.numColliders(); i++) {
        const c = b.body.collider(i)
        c.setFriction(cfg.friction)
        c.setRestitution(cfg.restitution)
      }
      b.body.wakeUp()
    }
  }

  alive(): Block[] {
    return this.blocks.filter((b) => b.outAt === null)
  }

  grabbed(): Block | null {
    return this.grab?.block ?? null
  }

  /** Grab `block` at a world point. */
  startGrab(block: Block, x: number, y: number): void {
    const t = block.body.translation()
    const a = block.body.rotation()
    const dx = x - t.x
    const dy = y - t.y
    const cos = Math.cos(-a)
    const sin = Math.sin(-a)
    this.grab = { block, local: { x: dx * cos - dy * sin, y: dx * sin + dy * cos }, target: { x, y } }
    block.body.wakeUp()
  }

  moveGrab(x: number, y: number): void {
    if (this.grab) this.grab.target = { x, y }
  }

  /** Let go: it keeps its velocity, capped relative to its own size (spec 14.2). */
  endGrab(): Block | null {
    const g = this.grab
    this.grab = null
    if (!g) return null
    const { body, shape } = g.block
    body.resetForces(true)
    body.resetTorques(true)
    const v = body.linvel()
    const maxUp = Math.sqrt(2 * this.cfg.gravity * this.cfg.flingApex * shape.L)
    let vx = v.x
    let vy = Math.min(v.y, maxUp)
    const maxSpeed = this.cfg.flingSpeed * shape.L
    const speed = Math.hypot(vx, vy)
    if (speed > maxSpeed) {
      vx *= maxSpeed / speed
      vy *= maxSpeed / speed
    }
    body.setLinvel({ x: vx, y: vy }, true)
    const w = body.angvel()
    body.setAngvel(Math.max(-this.cfg.maxSpin, Math.min(this.cfg.maxSpin, w)), true)
    return g.block
  }

  step(): StepEvents {
    const out: StepEvents = { thuds: [], sizzles: [] }
    for (const b of this.blocks) if (!b.removed) b.prev = b.cur

    if (this.grab) this.applyDrag(this.grab)
    this.world.step(this.events)
    this.time += STEP

    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      const b1 = this.byCollider.get(h1)
      const b2 = this.byCollider.get(h2)
      const v1 = b1 && !b1.removed ? b1.body.linvel() : { x: 0, y: 0 }
      const v2 = b2 && !b2.removed ? b2.body.linvel() : { x: 0, y: 0 }
      const rel = Math.hypot(v1.x - v2.x, v1.y - v2.y)
      for (const b of [b1, b2]) {
        if (!b || b.outAt !== null || this.time - b.lastThud < 0.06) continue
        const strength = Math.min(1, rel / (2 * Math.sqrt(b.shape.L)))
        if (strength < 0.08) continue
        b.lastThud = this.time
        out.thuds.push({ block: b, strength })
      }
    })

    const { x0, x1 } = this.platform
    for (const b of this.blocks) {
      if (b.removed) continue
      const t = b.body.translation()
      b.cur = { x: t.x, y: t.y, a: b.body.rotation() }
      if (b.outAt === null) {
        if (t.y < this.lavaY || t.x < x0 - 300 || t.x > x1 + 300) {
          this.sink(b)
          out.sizzles.push(b)
        }
      } else if (this.time - b.outAt > SINK_S) {
        this.world.removeRigidBody(b.body)
        b.removed = true
      }
    }
    return out
  }

  /**
   * Damped spring at the grab point, scaled by mass so any block follows the
   * finger, with the acceleration capped relative to its size (spec 14.3).
   */
  private applyDrag(g: Grab): void {
    const { body, shape } = g.block
    const t = body.translation()
    const a = body.rotation()
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const p = { x: t.x + g.local.x * cos - g.local.y * sin, y: t.y + g.local.x * sin + g.local.y * cos }
    const v = body.velocityAtPoint(p)
    const whip = this.cfg.dragStrength === 'whip'
    const w = whip ? this.cfg.whipOmega : this.cfg.gentleOmega
    const z = whip ? this.cfg.whipZeta : this.cfg.gentleZeta
    let ax = w * w * (g.target.x - p.x) - 2 * z * w * v.x
    let ay = w * w * (g.target.y - p.y) - 2 * z * w * v.y
    const cap = this.cfg.dragAccelMax * shape.L
    const mag = Math.hypot(ax, ay)
    if (mag > cap) {
      ax *= cap / mag
      ay *= cap / mag
    }
    const m = body.mass()
    body.resetForces(true)
    body.resetTorques(true)
    body.addForceAtPoint({ x: m * ax, y: m * ay }, p, true)
  }

  /** Into the lava: stop colliding, sink slowly, disappear after SINK_S. */
  private sink(b: Block): void {
    b.outAt = this.time
    if (this.grab?.block === b) this.endGrab()
    for (let i = 0; i < b.body.numColliders(); i++) b.body.collider(i).setSensor(true)
    b.body.setGravityScale(0.25, true)
    b.body.setLinearDamping(3)
    b.body.setAngularDamping(3)
  }

  speed(b: Block): number {
    const v = b.body.linvel()
    return Math.hypot(v.x, v.y) + Math.abs(b.body.angvel()) * b.shape.L * 0.5
  }

  free(): void {
    this.events.free()
    this.world.free()
  }
}
