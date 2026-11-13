import RAPIER from '@dimforge/rapier2d-compat'
import { cellOf, count, DEPTH, high, valueOf, type Outcome, type Part, type Shape } from './chains'

export const STEP = 1 / 60
/** The biggest shape is about this many physics units across, as the sneezer always is in Sneeze² (same floaty gravity). */
const SPAN = 10
const GRAVITY = 16
const LAUNCH = 1.25
const ANGLE = (55 * Math.PI) / 180
const FRICTION = 0.7
/** Nothing waits longer than this to count as landed (s). */
const FOREVER = 6

/** Where a piece that flew out came from: enough to put it back and have the whole again, exactly as it was. */
export interface Home {
  /** The pieces that stayed. */
  stays: number[]
  whole: Shape
  /** The decimal places the whole's cells are counted in. */
  k: number
  /** The whole's own id, home and path, given back to it. */
  id: number
  from: Home | null
  path: number[]
  /** The opposite sentence. */
  back: Outcome
  /** Where this piece, and the first that stayed, were in the whole (bottom-left corners, blocks). */
  outAt: { x: number; y: number }
  stayAt: { x: number; y: number }
}

/**
 * A shape on the stage. `x`, `y` are the middle of its box, in blocks, y up,
 * the floor at 0. Shapes never turn: they fly and land upright (the
 * somersault is drawn, not simulated: `spin`).
 */
export interface RPiece {
  id: number
  shape: Shape
  /** The decimal places its cells are counted in: each is 10^-k, and that much smaller. */
  k: number
  /** If it flew out of another: where it goes back. */
  from: Home | null
  /** What it has been divided by on the way here (factors, powers). */
  path: number[]
  rb: RAPIER.RigidBody
  x: number
  y: number
  settled: boolean
  still: number
  airborne: number
  /** Sneezed out at this time, to land after about this long (s): one somersault on the way. */
  spin: { at: number; flight: number } | null
  held: boolean
  lastThud: number
}

/** A piece's box in blocks, from its middle (or from where he holds it). */
export function boxOf(p: { shape: Shape; k: number; x: number; y: number }, x = p.x, y = p.y) {
  const u = cellOf(p.shape, p.k)
  const [w, h] = [p.shape.length * u, high(p.shape) * u]
  return { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 }
}

/** A piece's box as it is seen: a deep one's far side shows up and to the right of its front. */
export function seenBox(p: { shape: Shape; k: number; x: number; y: number }) {
  const b = boxOf(p)
  const far = p.shape.deep ? p.shape.length * DEPTH * cellOf(p.shape, p.k) : 0
  return { ...b, x1: b.x1 + far, y1: b.y1 + far }
}

/** The bigger of a piece's width and height, in blocks. */
const sizeOf = (p: { shape: Shape; k: number }) => Math.max(p.shape.length, high(p.shape)) * cellOf(p.shape, p.k)

/**
 * The chains' stage: a floor, and shapes of blocks. Any of them can sneeze
 * (it is swapped for the parts it becomes, and the one that flies is
 * launched), and the one that flew can be carried back where it came from.
 */
export class RoadStage {
  readonly world: RAPIER.World
  readonly pieces: RPiece[] = []
  time = 0
  sneezes = 0
  /** Physics units per block. */
  readonly f: number
  private nextId = 1
  private events = new RAPIER.EventQueue(true)
  private byCollider = new Map<number, RPiece>()
  private holding: { p: RPiece; x: number; y: number } | null = null

  /** `span`: the most blocks across or up any shape here will be. The start shapes stand in a row on the floor. */
  constructor(start: Shape[], span: number) {
    this.f = SPAN / Math.max(4, span)
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY })
    this.world.timestep = STEP
    this.world.lengthUnit = Math.max(0.5, this.f)
    const floor = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    this.world.createCollider(RAPIER.ColliderDesc.halfspace({ x: 0, y: 1 }).setFriction(FRICTION), floor)
    const gap = Math.max(1.5, span * 0.25)
    const width = start.reduce((w, b) => w + b.length, 0) + gap * (start.length - 1)
    let x = -width / 2
    for (const b of start) {
      this.add(b, 0, x + b.length / 2, high(b) / 2).settled = true
      x += b.length + gap
    }
  }

  piece(id: number): RPiece | undefined {
    return this.pieces.find((p) => p.id === id)
  }

  private add(shape: Shape, k: number, x: number, y: number, id = this.nextId++): RPiece {
    const f = this.f * cellOf(shape, k)
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x * this.f, y * this.f).lockRotations().setCcdEnabled(true).setLinearDamping(0.05))
    const p: RPiece = { id, shape, k, from: null, path: [], rb, x, y, settled: false, still: 0, airborne: 0, spin: null, held: false, lastThud: -1 }
    // A box for each run of columns of one height.
    const top = high(shape)
    const descs: RAPIER.ColliderDesc[] = []
    for (let i = 0; i < shape.length; ) {
      let j = i
      while (shape[j + 1] === shape[i]) j++
      descs.push(RAPIER.ColliderDesc.cuboid(((j - i + 1) * f) / 2, (shape[i] * f) / 2).setTranslation(((i + j + 1 - shape.length) * f) / 2, ((shape[i] - top) * f) / 2))
      i = j + 1
    }
    for (const d of descs) {
      const col = this.world.createCollider(d.setDensity(1).setFriction(FRICTION).setRestitution(0.05).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), rb)
      this.byCollider.set(col.handle, p)
    }
    this.pieces.push(p)
    return p
  }

  private remove(p: RPiece) {
    for (let i = 0; i < p.rb.numColliders(); i++) this.byCollider.delete(p.rb.collider(i).handle)
    this.world.removeRigidBody(p.rb)
    this.pieces.splice(this.pieces.indexOf(p), 1)
    if (this.holding?.p === p) this.holding = null
  }

  /**
   * AH-CHOO: the shape becomes its parts, each where it was in the shape. The
   * one that flies goes up and away to the right, remembering where it came
   * from; the ones that stay jerk back. Returns the new pieces, in the parts' order.
   */
  sneeze(p: RPiece, parts: Part[], back: Outcome, factor?: number): RPiece[] {
    const { x0, y0 } = boxOf(p)
    this.remove(p)
    const f = this.f
    const u = cellOf(p.shape, p.k)
    // A little one hops as far for its size as a big one does (a hundredth doesn't fly off the stage).
    const size = Math.min(SPAN, Math.max(4 * u, sizeOf(p)) * f)
    const base = LAUNCH * Math.sqrt(GRAVITY * size)
    // A little different each time, so a run of them doesn't land in one heap.
    const vary = 0.85 + 0.4 * ((this.sneezes * 0.618) % 1)
    let flying = 0
    const path = factor ? [...p.path, factor] : p.path
    const out = parts.map((part) => {
      const q = this.add(part.shape, p.k, x0 + (part.x + part.shape.length / 2) * u, y0 + (part.y + high(part.shape) / 2) * u)
      q.path = path
      if (!part.fly) {
        q.rb.setLinvel({ x: -0.12 * base, y: 0 }, true)
        return q
      }
      const speed = base * vary * (1 + 0.22 * flying++)
      const vy = speed * Math.sin(ANGLE)
      q.rb.setLinvel({ x: speed * Math.cos(ANGLE), y: vy }, true)
      const drop = (q.y - (high(part.shape) * u) / 2) * f
      q.spin = { at: this.time, flight: Math.max(0.3, (vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY) }
      return q
    })
    const stay = parts.findIndex((x) => !x.fly)
    parts.forEach((part, i) => {
      if (!part.fly || stay < 0) return
      out[i].from = { stays: out.filter((_, j) => !parts[j].fly).map((q) => q.id), whole: p.shape, k: p.k, id: p.id, from: p.from, path: p.path, back, outAt: { x: part.x, y: part.y }, stayAt: { x: parts[stay].x, y: parts[stay].y } }
    })
    this.sneezes++
    return out
  }

  /** The same piece in a new shape (its copies stood another way, or counted in smaller cells), where it stood. */
  reform(p: RPiece, shape: Shape, k = p.k): RPiece {
    const { y0 } = boxOf(p)
    const x = p.x
    this.remove(p)
    const q = this.add(shape, k, x, y0 + (high(shape) * cellOf(shape, k)) / 2 + 0.05 * cellOf(shape, k), p.id)
    Object.assign(q, { from: p.from, path: p.path })
    return q
  }

  /** He picks one up: it goes where his finger does, through everything. */
  grab(p: RPiece): boolean {
    if (this.holding) return false
    p.rb.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
    for (let i = 0; i < p.rb.numColliders(); i++) p.rb.collider(i).setCollisionGroups(0)
    p.held = true
    p.settled = false
    p.spin = null
    this.holding = { p, x: p.x, y: p.y }
    return true
  }

  get held(): RPiece | null {
    return this.holding?.p ?? null
  }

  /** Where he's holding it (blocks; never below the floor). */
  holdAt(x: number, y: number) {
    if (this.holding) Object.assign(this.holding, { x, y: Math.max(y, (high(this.holding.p.shape) * cellOf(this.holding.p.shape, this.holding.p.k)) / 2) })
  }

  /** Where the whole that `p` flew out of stands (its bottom-left corner), if every piece that stayed is still there and at rest. */
  homeOf(p: RPiece): { x0: number; y0: number } | null {
    if (!p.from) return null
    const stays = p.from.stays.map((id) => this.piece(id))
    if (stays.some((q) => !q || !q.settled || q.held)) return null
    const b = boxOf(stays[0]!)
    const u = cellOf(p.from.whole, p.from.k)
    return { x0: b.x0 - p.from.stayAt.x * u, y0: b.y0 - p.from.stayAt.y * u }
  }

  /** Is the one he holds over the whole it came out of (a little generously)? */
  overHome(): boolean {
    const h = this.holding
    const home = h && this.homeOf(h.p)
    if (!h || !home) return false
    const a = boxOf(h.p, h.x, h.y)
    const u = cellOf(h.p.from!.whole, h.p.from!.k)
    const [w, t] = [h.p.from!.whole.length * u, high(h.p.from!.whole) * u]
    const m = 0.6 * u
    return !(a.x1 < home.x0 - m || a.x0 > home.x0 + w + m || a.y1 < home.y0 - m || a.y0 > home.y0 + t + m)
  }

  /** He lets go: it drops from where it is (lifted clear of anything it was over), flung as his finger was moving (blocks/s). */
  release(v = { x: 0, y: 0 }) {
    const h = this.holding
    this.holding = null
    if (!h) return
    const p = h.p
    let y = h.y
    for (let pass = 0; pass < 4; pass++)
      for (const q of this.pieces) {
        if (q === p) continue
        const a = boxOf(p, h.x, y)
        const b = boxOf(q)
        if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) y = b.y1 + (a.y1 - a.y0) / 2 + 0.02 * cellOf(p.shape, p.k)
      }
    p.rb.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    for (let i = 0; i < p.rb.numColliders(); i++) p.rb.collider(i).setCollisionGroups(0xffffffff)
    p.rb.setTranslation({ x: h.x * this.f, y: y * this.f }, true)
    const cap = (2 * Math.sqrt(GRAVITY * SPAN)) / this.f
    const speed = Math.hypot(v.x, v.y)
    const k = speed > cap ? cap / speed : 1
    p.rb.setLinvel({ x: v.x * k * this.f, y: v.y * k * this.f }, true)
    Object.assign(p, { held: false, settled: false, still: 0, airborne: 0, x: h.x, y })
  }

  /** The one he holds goes back where it came from: it and the ones that stayed are the whole again, as it was. */
  joinBack(): RPiece | null {
    const p = this.holding?.p
    const home = p && this.homeOf(p)
    if (!p || !p.from || !home) return null
    const from = p.from
    for (const id of from.stays) this.remove(this.piece(id)!)
    this.remove(p)
    const u = cellOf(from.whole, from.k)
    const w = this.add(from.whole, from.k, home.x0 + (from.whole.length * u) / 2, home.y0 + (high(from.whole) * u) / 2, from.id)
    Object.assign(w, { from: from.from, path: from.path })
    this.sneezes = Math.max(0, this.sneezes - 1)
    return w
  }

  /** One step. Returns how hard anything landed (0–1 each). */
  step(): { strength: number; size: number }[] {
    const h = this.holding
    if (h) h.p.rb.setNextKinematicTranslation({ x: h.x * this.f, y: h.y * this.f })
    this.world.step(this.events)
    this.time += STEP
    const thuds: { strength: number; size: number }[] = []
    const touched = new Set<RPiece>()
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      for (const c of [h1, h2]) {
        const p = this.byCollider.get(c)
        if (!p || p.held) continue
        touched.add(p)
        if (this.time - p.lastThud < 0.15) continue
        const v = p.rb.linvel()
        const strength = Math.min(1, Math.hypot(v.x, v.y) / (2 * Math.sqrt(GRAVITY * Math.max(cellOf(p.shape, p.k), sizeOf(p) * this.f))))
        if (strength < 0.1) continue
        p.lastThud = this.time
        thuds.push({ strength, size: valueOf(count(p.shape), p.k) })
      }
    })
    for (const p of this.pieces) {
      const t = p.rb.translation()
      p.x = t.x / this.f
      p.y = t.y / this.f
      if (p.held) continue
      // Down: the somersault is over.
      if (touched.has(p) && p.spin && this.time - p.spin.at > 0.1) p.spin = null
      if (p.settled) {
        // Knocked by another: it has to come to rest again.
        const v = p.rb.linvel()
        if (Math.hypot(v.x, v.y) > 0.6 * this.f * Math.sqrt(cellOf(p.shape, p.k))) Object.assign(p, { settled: false, still: 0, airborne: 0 })
        continue
      }
      const v = p.rb.linvel()
      p.airborne += STEP
      p.still = Math.hypot(v.x, v.y) < 0.15 * this.f * Math.sqrt(cellOf(p.shape, p.k)) ? p.still + STEP : 0
      if (p.still > 0.25 || p.airborne > FOREVER) {
        p.settled = true
        p.spin = null
      }
    }
    return thuds
  }

  /** How far round its somersault a flying shape is (rad, clockwise as drawn). */
  angleOf(p: RPiece): number {
    if (!p.spin) return 0
    const u = Math.min(1, (this.time - p.spin.at) / p.spin.flight)
    return -2 * Math.PI * u
  }

  bounds(): { x0: number; x1: number; y1: number } {
    let x0 = Infinity
    let x1 = -Infinity
    let y1 = 0
    for (const p of this.pieces) {
      const b = seenBox(p)
      x0 = Math.min(x0, b.x0)
      x1 = Math.max(x1, b.x1)
      y1 = Math.max(y1, b.y1)
    }
    return { x0, x1, y1 }
  }

  free() {
    this.world.free()
    this.events.free()
  }
}
