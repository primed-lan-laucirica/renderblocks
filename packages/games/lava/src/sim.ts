import RAPIER from '@dimforge/rapier2d-compat'
import type { LavaConfig } from './config'
import type { Notation } from './sets'
import { blockShape, type BlockShape, type ShapeStyle } from './shapes'

let ready: Promise<void> | null = null
/** Rapier's WASM is inlined (compat build); this only instantiates it, once. */
export function initPhysics(): Promise<void> {
  return (ready ??= RAPIER.init())
}

export const STEP = 1 / 60
/** The shortest drop to the lava, in units, however small the blocks are. */
const MIN_DROP = 6
const SINK_S = 1.2
/** Empty platform kept beyond the outermost block before the edge crumbles (spec 5.3's margin). */
const EDGE_MARGIN = 3
/** Pause between one slab breaking off and the next — a visible cascade. */
const CRUMBLE_EVERY_S = 0.1

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
  /** Symbolic form drawn in its centre (Square Club, Step Squad, Powers), if any. */
  notation: Notation | null
}

export interface Thud {
  block: Block
  /** 0–1. */
  strength: number
}

export interface StepEvents {
  thuds: Thud[]
  sizzles: Block[]
  /** Platform slabs that broke off this step (their widths). */
  crumbles: number[]
}

/** A slab broken off the platform: scenery only, tumbling into the lava. */
export interface Rubble {
  x: number
  y: number
  w: number
  vy: number
  a: number
  spin: number
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
  /**
   * Platform: top at y = 0, a slab `depth` thick, suspended in the air.
   * x0 / x1 move inward as empty ends crumble away.
   */
  readonly platform: { x0: number; x1: number; depth: number }
  /** Slab boundaries along the platform; [left, right] index the remaining ends. */
  readonly cuts: number[] = []
  private left = 0
  private right = 0
  private nextCrumble = 0
  readonly rubble: Rubble[] = []
  private ground!: RAPIER.RigidBody
  private groundCollider!: RAPIER.Collider
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

  constructor(values: number[], cfg: LavaConfig, style: ShapeStyle = 'blocks') {
    this.cfg = cfg
    this.world = new RAPIER.World({ x: 0, y: -cfg.gravity })
    this.world.timestep = STEP

    // Smallest on the left, standing on the platform with size-relative gaps.
    let x = 0
    let prevW = 0
    values.forEach((value, id) => {
      const shape = blockShape(value, style)
      if (id > 0) x += Math.max(0.5, 0.15 * Math.max(prevW, shape.w))
      const pose = { x: x + shape.w / 2, y: shape.h / 2 + 0.002, a: 0 }
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(pose.x, pose.y)
          .setCcdEnabled(true)
          .setLinearDamping(cfg.linearDamping)
          .setAngularDamping(cfg.angularDamping),
      )
      const block: Block = { id, value, shape, body, prev: { ...pose }, cur: { ...pose }, outAt: null, removed: false, lastThud: -1, notation: null }
      // Cube Club blocks collide as their drawn outline; everything else as its rectangles.
      const descs = shape.hull
        ? [RAPIER.ColliderDesc.convexHull(new Float32Array(shape.hull.flatMap((p) => [p.x, p.y])))!]
        : shape.rects.map((r) => RAPIER.ColliderDesc.cuboid(r.w / 2, r.h / 2).setTranslation(r.cx, r.cy))
      for (const desc of descs) {
        const collider = this.world.createCollider(
          desc
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

    // Slabs: small under small blocks, bigger under big ones (a quarter of the
    // nearest block's width, 1–8 units), so crumbling looks right at any scale.
    const widthNear = (px: number) => {
      let best = this.blocks[0]?.shape.w ?? 1
      let bestD = Infinity
      for (const b of this.blocks) {
        const d = Math.abs(b.cur.x - px)
        if (d < bestD) {
          bestD = d
          best = b.shape.w
        }
      }
      return best
    }
    for (let c = this.platform.x0; c < this.platform.x1 - 0.5; c += Math.min(8, Math.max(1, widthNear(c) / 4))) {
      this.cuts.push(c)
    }
    this.cuts.push(this.platform.x1)
    this.right = this.cuts.length - 1

    this.ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    this.buildGround()
  }

  /** (Re)build the platform collider over what is left of it. */
  private buildGround(): void {
    if (this.groundCollider) this.world.removeCollider(this.groundCollider, true)
    const { x0, x1, depth } = this.platform
    this.groundCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, depth / 2)
        .setTranslation((x0 + x1) / 2, -depth / 2)
        .setFriction(this.cfg.friction)
        .setRestitution(this.cfg.restitution),
      this.ground,
    )
  }

  /**
   * Empty platform beyond the outermost blocks breaks off, one slab at a
   * time from the end, so there is never a long scroll to find the edge.
   */
  private crumble(out: StepEvents): void {
    if (this.time < this.nextCrumble) return
    const alive = this.alive()
    if (alive.length === 0) return
    let minX = Infinity
    let maxX = -Infinity
    for (const b of alive) {
      const ext = 0.5 * (Math.abs(b.shape.w * Math.cos(b.cur.a)) + Math.abs(b.shape.h * Math.sin(b.cur.a)))
      minX = Math.min(minX, b.cur.x - ext)
      maxX = Math.max(maxX, b.cur.x + ext)
    }
    const breakOff = (from: number, to: number) => {
      this.rubble.push({ x: from, y: 0, w: to - from, vy: -0.5, a: 0, spin: (Math.random() - 0.5) * 1.5 })
      out.crumbles.push(to - from)
      this.nextCrumble = this.time + CRUMBLE_EVERY_S
    }
    let changed = false
    if (this.right - this.left > 1 && this.cuts[this.left + 1] < minX - EDGE_MARGIN) {
      breakOff(this.cuts[this.left], this.cuts[this.left + 1])
      this.left++
      changed = true
    }
    if (this.right - this.left > 1 && this.cuts[this.right - 1] > maxX + EDGE_MARGIN) {
      breakOff(this.cuts[this.right - 1], this.cuts[this.right])
      this.right--
      changed = true
    }
    if (changed) {
      this.platform.x0 = this.cuts[this.left]
      this.platform.x1 = this.cuts[this.right]
      this.buildGround()
    }
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

  /**
   * The block that went into the lava last — the winner when every block
   * falls. Two in the same step: the one that sank least deep.
   */
  lastOut(): Block | null {
    let last: Block | null = null
    for (const b of this.blocks) {
      if (b.outAt === null) continue
      if (!last || b.outAt > last.outAt! || (b.outAt === last.outAt && b.cur.y > last.cur.y)) last = b
    }
    return last
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
    const out: StepEvents = { thuds: [], sizzles: [], crumbles: [] }
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

    this.crumble(out)
    for (let i = this.rubble.length - 1; i >= 0; i--) {
      const r = this.rubble[i]
      r.vy -= this.cfg.gravity * STEP
      r.y += r.vy * STEP
      r.a += r.spin * STEP
      if (r.y < this.lavaY - this.platform.depth * 3) this.rubble.splice(i, 1)
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
