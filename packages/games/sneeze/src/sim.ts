import RAPIER from '@dimforge/rapier2d-compat'
import { norm, sneeze, type Rule, type Sneeze } from './rules'

let ready: Promise<void> | null = null
/** Load the physics engine (once). */
export const initPhysics = () => (ready ??= RAPIER.init())

export const STEP = 1 / 60
/** The first square's side, in stage units; everything else is to scale with it. */
export const START = 10
/** Gravity in the physics world, where the square about to sneeze is always START across (moon-floaty). */
const GRAVITY = 16
/** How fast the sneezed-out square flies, per √(g × size). */
const LAUNCH = 1.25
const ANGLE = (55 * Math.PI) / 180
/** A ring's walls collide at least this thick (a share of its side); they're drawn exactly. */
const MIN_WALL = 0.04
const FRICTION = 0.7
const ANGULAR_DAMPING = 0.3
/** Touching down within this tilt (rad), it lands on its feet. */
const STICK = 0.7
/** Pieces this many times bigger than the sneezer, or this many of its sizes away, are done moving: they leave the physics. */
const TOO_BIG = 8
const TOO_FAR = 60
/** Nothing waits longer than this to count as landed (s), so a square wedged somewhere never holds up the game. */
const FOREVER = 6

export interface Pose {
  x: number
  y: number
  a: number
}

/** A square, or a square with a hole (a ring). Poses are in stage units, y up, the floor at 0. */
export interface Piece {
  id: number
  /** Its number, in cells (100^-k blocks). */
  n: bigint
  /** Its side and its hole's side, in 10^-k blocks (hole 0: a solid square). */
  side: bigint
  hole: bigint
  /** Counted in tenths (1) or hundredths (2) of a block, or whole blocks (0). */
  k: number
  /** Its side in stage units. */
  size: number
  /** How far its legs reach below it (stage units): it stands on them. */
  legs: number
  /** Its physics body, while it can still move (null once it's done). */
  rb: RAPIER.RigidBody | null
  prev: Pose
  cur: Pose
  /**
   * The ring it was sneezed out of (it passes through that ring until it's
   * clear of it). A ring keeps its square's: where it goes back to when it's
   * whole again.
   */
  from: Piece | null
  ghost: boolean
  /** Come to rest after its flight, standing the right way up. */
  settled: boolean
  still: number
  /** Hops it has made to stand up. */
  hops: number
  /** Dropped by him (not sneezed): it may come to rest still partly in its ring. */
  dropped: boolean
  /** How long it has been moving since it was let go (s): after FOREVER it counts as landed, wherever it is. */
  airborne: number
  /** Touched down after its flight. */
  landed: boolean
  lastThud: number
  /** Its motion in stage units, kept across a rebuild of the physics world. */
  vel: { x: number; y: number; w: number }
}

/** Do two squares (centre, side, angle) overlap? Separating axes. */
export function overlap(p: Pose, s: number, q: Pose, t: number): boolean {
  const corners = (c: Pose, size: number) => {
    const h = size / 2
    const cos = Math.cos(c.a)
    const sin = Math.sin(c.a)
    return [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ].map(([x, y]) => ({ x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos }))
  }
  const A = corners(p, s)
  const B = corners(q, t)
  const eps = 1e-9 * (s + t)
  for (const c of [p, q])
    for (const ax of [
      { x: Math.cos(c.a), y: Math.sin(c.a) },
      { x: -Math.sin(c.a), y: Math.cos(c.a) },
    ]) {
      const pa = A.map((v) => v.x * ax.x + v.y * ax.y)
      const pb = B.map((v) => v.x * ax.x + v.y * ax.y)
      if (Math.max(...pa) < Math.min(...pb) - eps || Math.max(...pb) < Math.min(...pa) - eps) return false
    }
  return true
}

/**
 * The stage: a floor and every square and ring so far. A sneeze swaps the
 * square for a ring and a smaller square in its middle, launches the small
 * one up and away to the right, and kicks the ring back.
 *
 * Chains run from ten billion down to 0.0001, a size range no physics engine
 * holds at once. So at each sneeze the physics world is rebuilt around the
 * sneezer, scaled so it is always START across: every sneeze is the same
 * sneeze to the engine. The poses kept here are in stage units (doubles).
 */
export class Stage {
  world: RAPIER.World
  readonly pieces: Piece[] = []
  /** The square that sneezes next. */
  current: Piece
  time = 0
  sneezes = 0
  /** Physics units per stage unit, and where the physics origin sits on the stage. */
  private f = 1
  private ox = 0
  private nextId = 1
  private readonly startSide: bigint
  private readonly legsFor: (n: bigint, side: bigint, k: number) => number
  private byBody = new Map<number, Piece>()
  private byCollider = new Map<number, Piece>()
  private events = new RAPIER.EventQueue(true)
  private readonly hooks: RAPIER.PhysicsHooks
  /** Where the square he's holding is to be (stage units). */
  private held: { to: Pose } | null = null

  /** `legs`: how long a piece's legs are, as a share of its side (from the look it wears). */
  constructor(side: bigint, legsFor: (n: bigint, side: bigint, k: number) => number = () => 0) {
    this.startSide = side
    this.legsFor = legsFor
    // A sneezed-out square passes through the ring it came from until it's out.
    this.hooks = {
      filterContactPair: (_c1, _c2, b1, b2) => {
        const p = this.byBody.get(b1)
        const q = this.byBody.get(b2)
        if (p && q && ((p.ghost && p.from === q) || (q.ghost && q.from === p))) return null
        return RAPIER.SolverFlags.COMPUTE_IMPULSE
      },
      filterIntersectionPair: () => true,
    }
    this.current = this.piece(side, 0n, 0, { x: 0, y: START / 2, a: 0 })
    this.current.cur = this.current.prev = { x: 0, y: START / 2 + this.current.legs, a: 0 }
    this.world = this.rebuild()
  }

  /** A side in 10^-k blocks, in stage units. */
  sizeOf(side: bigint, k = 0): number {
    return (START * Number(side)) / 10 ** k / Number(this.startSide)
  }

  private piece(side: bigint, hole: bigint, k: number, pose: Pose, from: Piece | null = null): Piece {
    const n = side * side - hole * hole
    const p: Piece = {
      id: this.nextId++,
      n,
      side,
      hole,
      k,
      size: this.sizeOf(side, k),
      legs: this.legsFor(n, side, k) * this.sizeOf(side, k),
      rb: null,
      prev: pose,
      cur: pose,
      from,
      ghost: !!from,
      settled: !from,
      still: 0,
      hops: 0,
      dropped: false,
      airborne: 0,
      landed: !from,
      lastThud: -1,
      vel: { x: 0, y: 0, w: 0 },
    }
    this.pieces.push(p)
    return p
  }

  /** A fresh physics world around the current square, at its scale. */
  private rebuild(): RAPIER.World {
    // Keep everyone's motion (in stage units) from the old world.
    for (const p of this.pieces)
      if (p.rb) {
        const v = p.rb.linvel()
        p.vel = { x: v.x / this.f, y: v.y / this.f, w: p.rb.angvel() }
        p.rb = null
      }
    this.world?.free()
    this.events.free()
    this.events = new RAPIER.EventQueue(true)
    this.byBody = new Map()
    this.byCollider = new Map()
    const c = this.current
    this.f = START / c.size
    this.ox = c.cur.x
    const world = new RAPIER.World({ x: 0, y: -GRAVITY })
    world.timestep = STEP
    world.lengthUnit = START / 8
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    world.createCollider(RAPIER.ColliderDesc.halfspace({ x: 0, y: 1 }).setFriction(FRICTION), floor)
    for (const p of this.pieces) {
      if (p !== c && (p.size > TOO_BIG * c.size || Math.abs(p.cur.x - c.cur.x) > TOO_FAR * c.size)) continue
      const s = p.size * this.f
      const rb = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation((p.cur.x - this.ox) * this.f, p.cur.y * this.f)
          .setRotation(p.cur.a)
          .setLinvel(p.vel.x * this.f, p.vel.y * this.f)
          .setAngvel(p.vel.w)
          .setCcdEnabled(true)
          .setLinearDamping(0.05)
          .setAngularDamping(ANGULAR_DAMPING),
      )
      const h = s / 2
      const descs: RAPIER.ColliderDesc[] = []
      if (p.hole === 0n) descs.push(RAPIER.ColliderDesc.cuboid(h, h))
      else {
        const t = Math.max((Number(p.side - p.hole) / 2 / Number(p.side)) * s, MIN_WALL * s)
        descs.push(
          RAPIER.ColliderDesc.cuboid(h, t / 2).setTranslation(0, h - t / 2),
          RAPIER.ColliderDesc.cuboid(h, t / 2).setTranslation(0, -h + t / 2),
          RAPIER.ColliderDesc.cuboid(t / 2, h - t).setTranslation(-h + t / 2, 0),
          RAPIER.ColliderDesc.cuboid(t / 2, h - t).setTranslation(h - t / 2, 0),
        )
      }
      // Feet: it stands on its legs.
      const legs = p.legs * this.f
      if (legs > 0) descs.push(RAPIER.ColliderDesc.cuboid(0.32 * s, legs / 2).setTranslation(0, -h - legs / 2))
      for (const d of descs) {
        const col = world.createCollider(
          d.setDensity(1).setFriction(FRICTION).setRestitution(0.08).setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
          rb,
        )
        this.byCollider.set(col.handle, p)
      }
      this.byBody.set(rb.handle, p)
      p.rb = rb
    }
    return world
  }

  /** What the current square would sneeze, under a rule (null: it can't). */
  peek(rule: Rule): Sneeze | null {
    return this.current.hole === 0n ? sneeze(this.current.side, rule, this.current.k) : null
  }

  /** AH-CHOO: the current square becomes a ring, and the square from its middle flies out. */
  sneeze(rule: Rule): { s: Sneeze; ring: Piece; out: Piece } | null {
    const p = this.current
    const s = this.peek(rule)
    if (!s) return null
    // Rebuild the world at the sneezer's scale, with the sneezer swapped for a ring and the square from its middle.
    if (p.rb) {
      const v = p.rb.linvel()
      p.vel = { x: v.x / this.f, y: v.y / this.f, w: p.rb.angvel() }
    }
    this.pieces.splice(this.pieces.indexOf(p), 1)
    const ring = this.piece(s.side, s.outSide, s.k, { ...p.cur })
    ring.from = p.from
    // (Ten tenths flies out as one whole block.)
    const o = norm(s.outSide, s.k)
    const out = this.piece(o.side, 0n, o.k, { ...p.cur }, ring)
    ring.vel = { ...p.vel }
    out.vel = { ...p.vel }
    // Stage units around the sneezer that is now `ring` (same size as p).
    this.current = ring
    this.world = this.rebuild()
    this.current = out
    const speed = LAUNCH * Math.sqrt(GRAVITY * START)
    const orb = out.rb!
    const rrb = ring.rb!
    const vy = orb.linvel().y + speed * Math.sin(ANGLE)
    orb.setLinvel({ x: orb.linvel().x + speed * Math.cos(ANGLE), y: vy }, true)
    // One somersault, timed to land on its feet: the flight time from here down to standing height.
    const drop = orb.translation().y - (out.size / 2 + out.legs) * this.f
    const flight = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * GRAVITY * drop))) / GRAVITY
    // (Spin dies away in the air with the angular damping: start it faster to make up for it.)
    const T = Math.max(0.3, flight)
    orb.setAngvel(((-2 * Math.PI - out.cur.a) * ANGULAR_DAMPING) / (1 - Math.exp(-ANGULAR_DAMPING * T)), true)
    // The ring jerks back, as a head does.
    // (A thin ring is light: it can't be kicked further than a heavy one.)
    const kick = Math.min(0.25, (0.35 * orb.mass()) / Math.max(1e-9, rrb.mass())) * speed
    rrb.setLinvel({ x: rrb.linvel().x - kick * Math.cos(ANGLE), y: rrb.linvel().y }, true)
    rrb.setAngvel(rrb.angvel() + 0.8, true)
    this.sneezes++
    return { s, ring, out }
  }

  /** He picks up the current square: it goes where his finger does, through its own ring. */
  grab(): boolean {
    const p = this.current
    if (!p.rb || p.hole !== 0n) return false
    p.rb.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
    p.ghost = !!p.from
    p.settled = false
    this.held = { to: { ...p.cur } }
    return true
  }

  get holding(): boolean {
    return !!this.held
  }

  /** Where he's holding it (stage units; never below standing on the floor). */
  holdAt(x: number, y: number, a = this.held?.to.a ?? 0): void {
    if (!this.held) return
    const p = this.current
    this.held.to = { x, y: Math.max(y, p.size / 2 + p.legs), a }
  }

  /**
   * Is it over its ring, to go back in? Generously: its middle anywhere over
   * the ring's whole square (turned as the ring is), or a little outside it.
   */
  fits(): boolean {
    const p = this.current
    const r = p.from
    if (!r || r.hole === 0n) return false
    const c = Math.cos(-r.cur.a)
    const s = Math.sin(-r.cur.a)
    const dx = p.cur.x - r.cur.x
    const dy = p.cur.y - r.cur.y
    const reach = r.size / 2 + 0.25 * p.size
    return Math.abs(dx * c - dy * s) < reach && Math.abs(dx * s + dy * c) < reach
  }

  /** He lets go: it drops (flung as his finger was moving, stage units/s) and lands as after a sneeze. */
  release(v = { x: 0, y: 0 }): void {
    const p = this.current
    const h = this.held
    this.held = null
    if (!p.rb || !h) return
    p.rb.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    // (No faster than three sneezes' worth.)
    const cap = (3 * Math.sqrt(GRAVITY * START)) / this.f
    const speed = Math.hypot(v.x, v.y)
    const k = speed > cap ? cap / speed : 1
    p.rb.setLinvel({ x: v.x * k * this.f, y: v.y * k * this.f }, true)
    p.rb.setAngvel(0, true)
    Object.assign(p, { settled: false, landed: false, still: 0, hops: 0, dropped: true, airborne: 0 })
  }

  /**
   * Unsneeze: the square he put back in its ring and the ring become the
   * whole square again, where the ring is. It's the one to sneeze next (or to
   * go back into its own ring).
   */
  unsneeze(): Piece | null {
    const p = this.current
    const ring = p.from
    if (!ring || ring.hole === 0n || p.hole !== 0n) return null
    this.held = null
    const at = this.pieces.indexOf(ring)
    this.pieces.splice(this.pieces.indexOf(p), 1)
    this.pieces.splice(this.pieces.indexOf(ring), 1)
    const o = norm(ring.side, ring.k)
    const whole = this.piece(o.side, 0n, o.k, { ...ring.cur })
    // Drawn where the ring was, behind anything that came later.
    this.pieces.splice(this.pieces.indexOf(whole), 1)
    this.pieces.splice(at, 0, whole)
    whole.from = ring.from
    // It rights itself if the ring had tipped over.
    Object.assign(whole, { ghost: false, settled: false, landed: true })
    this.current = whole
    this.world = this.rebuild()
    this.sneezes = Math.max(0, this.sneezes - 1)
    return whole
  }

  /** One step. Returns how hard anything landed (0–1 each, for thuds), with the size that landed. */
  step(): { strength: number; size: number }[] {
    for (const p of this.pieces) p.prev = p.cur
    const held = this.held
    if (held && this.current.rb) {
      const rb = this.current.rb
      rb.setNextKinematicTranslation({ x: (held.to.x - this.ox) * this.f, y: held.to.y * this.f })
      rb.setNextKinematicRotation(held.to.a)
    }
    this.world.step(this.events, this.hooks)
    this.time += STEP
    const thuds: { strength: number; size: number }[] = []
    const touched = new Set<Piece>()
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      for (const h of [h1, h2]) {
        const p = this.byCollider.get(h)
        if (p && !p.landed && !p.ghost) touched.add(p)
        if (!p?.rb || this.time - p.lastThud < 0.15) continue
        const v = p.rb.linvel()
        const strength = Math.min(1, Math.hypot(v.x, v.y) / (2 * Math.sqrt(GRAVITY * p.size * this.f)))
        if (strength < 0.1) continue
        p.lastThud = this.time
        thuds.push({ strength, size: p.size })
      }
    })
    for (const p of this.pieces) {
      if (!p.rb) continue
      const t = p.rb.translation()
      p.cur = { x: this.ox + t.x / this.f, y: t.y / this.f, a: p.rb.rotation() }
      // Out of its ring (legs and all); while he's holding it, it can always go through.
      if (p.ghost && p.from && !(held && p === this.current) && !overlap(p.cur, p.size + 2 * p.legs, p.from.cur, p.from.size + 2 * p.from.legs)) p.ghost = false
      // Touching down nearly upright, it sticks the landing, as a gymnast does.
      if (touched.has(p) && !(held && p === this.current)) {
        p.landed = true
        const tilt = Math.atan2(Math.sin(p.cur.a), Math.cos(p.cur.a))
        if (Math.abs(tilt) < STICK) {
          const v = p.rb.linvel()
          p.rb.setRotation(p.cur.a - tilt, true)
          p.rb.setAngvel(0, true)
          p.rb.setLinvel({ x: v.x * 0.15, y: Math.min(0, v.y) * 0.2 }, true)
          p.cur = { ...p.cur, a: p.cur.a - tilt }
        }
      }
      if (!p.settled && !(held && p === this.current)) {
        const v = p.rb.linvel()
        p.airborne += STEP
        // (A sneezed-out square isn't down till it's out of its ring; one he dropped may rest half in it.)
        const resting = (!p.ghost || p.dropped) && Math.hypot(v.x, v.y) < 0.15 * p.size * this.f && Math.abs(p.rb.angvel()) < 0.6
        p.still = resting ? p.still + STEP : 0
        if (p.airborne > FOREVER) p.settled = true
        else if (p.still > 0.25) {
          // Landed on its side or its head: it hops up and turns itself the right way up, onto its feet.
          const tilt = Math.atan2(Math.sin(p.cur.a), Math.cos(p.cur.a))
          if (Math.abs(tilt) < 0.3 || p.hops >= 3) {
            // Near enough: it straightens up where it stands.
            if (Math.abs(tilt) < 0.3) {
              p.rb.setRotation(p.cur.a - tilt, true)
              p.rb.setAngvel(0, true)
              p.cur = { ...p.cur, a: p.cur.a - tilt }
            }
            p.settled = true
          } else {
            const s = p.size * this.f
            const up = Math.sqrt(2 * GRAVITY * 0.5 * s)
            p.rb.setLinvel({ x: 0, y: up }, true)
            p.rb.setAngvel(-tilt / ((2 * up) / GRAVITY), true)
            p.hops++
            p.still = 0
          }
        }
      }
    }
    return thuds
  }

  /** Everything's extent (for the camera's "see it all"). */
  bounds(): { x0: number; x1: number; y0: number; y1: number } {
    let x0 = Infinity
    let x1 = -Infinity
    let y1 = 0
    for (const p of this.pieces) {
      const r = (p.size / 2) * Math.SQRT2
      x0 = Math.min(x0, p.cur.x - r)
      x1 = Math.max(x1, p.cur.x + r)
      y1 = Math.max(y1, p.cur.y + r)
    }
    return { x0, x1, y0: 0, y1 }
  }

  free(): void {
    this.world.free()
    this.events.free()
  }
}
