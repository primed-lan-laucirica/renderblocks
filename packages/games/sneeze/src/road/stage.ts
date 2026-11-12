import RAPIER from '@dimforge/rapier2d-compat'
import { count, type Block, type Part } from './ops'

export const STEP = 1 / 60
/** The biggest shape is about this many physics units across, as the sneezer always is in Sneeze² (same floaty gravity). */
const SPAN = 10
const GRAVITY = 16
const LAUNCH = 1.25
const ANGLE = (55 * Math.PI) / 180
const FRICTION = 0.7
/** Nothing waits longer than this to count as landed (s). */
const FOREVER = 6

/**
 * A shape on the road's stage. `x`, `y` are the middle of its full rows, in
 * blocks, y up, the floor at 0. Shapes never turn: they fly and land upright
 * (the somersault is drawn, not simulated: `spin`).
 */
export interface RPiece {
  id: number
  block: Block
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

/** A shape's box in blocks (leftovers and all), from where its full rows' middle is. */
export function boxOf(b: Block, x: number, y: number) {
  return { x0: x - b.cols / 2, x1: x + b.cols / 2, y0: y - b.rows / 2, y1: y + b.rows / 2 + (b.left ? 1 : 0) }
}

/**
 * The road's stage: a floor, and towers and rectangles of blocks. Any of them
 * can sneeze (it is swapped for the parts it becomes, and the ones that fly
 * are launched), be carried, and be put back on another.
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
  constructor(start: Block[], span: number) {
    this.f = SPAN / Math.max(4, span)
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY })
    this.world.timestep = STEP
    this.world.lengthUnit = Math.max(0.5, this.f)
    const floor = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    this.world.createCollider(RAPIER.ColliderDesc.halfspace({ x: 0, y: 1 }).setFriction(FRICTION), floor)
    const gap = Math.max(1.5, span * 0.25)
    const width = start.reduce((w, b) => w + b.cols, 0) + gap * (start.length - 1)
    let x = -width / 2
    for (const b of start) {
      this.add(b, x + b.cols / 2, b.rows / 2).settled = true
      x += b.cols + gap
    }
  }

  private add(block: Block, x: number, y: number): RPiece {
    const f = this.f
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x * f, y * f).lockRotations().setCcdEnabled(true).setLinearDamping(0.05))
    const p: RPiece = { id: this.nextId++, block, rb, x, y, settled: false, still: 0, airborne: 0, spin: null, held: false, lastThud: -1 }
    const descs = [RAPIER.ColliderDesc.cuboid((block.cols * f) / 2, (block.rows * f) / 2)]
    // Leftover blocks sit on top, from the left.
    if (block.left) descs.push(RAPIER.ColliderDesc.cuboid((block.left * f) / 2, f / 2).setTranslation(((block.left - block.cols) * f) / 2, ((block.rows + 1) * f) / 2))
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
   * ones that fly go up and away to the right (the higher, the further), and
   * the one that stays jerks back. Returns the new pieces, in the parts' order.
   */
  sneeze(p: RPiece, parts: Part[]): RPiece[] {
    const { x0, y0 } = boxOf(p.block, p.x, p.y)
    this.remove(p)
    const f = this.f
    const size = Math.min(SPAN, Math.max(4, Math.max(p.block.cols, p.block.rows) * f))
    const base = LAUNCH * Math.sqrt(GRAVITY * size)
    // A little different each time, so a run of them doesn't land in one heap.
    const vary = 0.85 + 0.4 * ((this.sneezes * 0.618) % 1)
    let flying = 0
    const out = parts.map((part) => {
      const q = this.add(part.block, x0 + part.x + part.block.cols / 2, y0 + part.y + part.block.rows / 2)
      if (!part.fly) {
        q.rb.setLinvel({ x: -0.12 * base, y: 0 }, true)
        return q
      }
      const speed = base * vary * (1 + 0.22 * flying++)
      const vy = speed * Math.sin(ANGLE)
      q.rb.setLinvel({ x: speed * Math.cos(ANGLE), y: vy }, true)
      const drop = (q.y - part.block.rows / 2) * f
      q.spin = { at: this.time, flight: Math.max(0.3, (vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY) }
      return q
    })
    this.sneezes++
    return out
  }

  /** The same blocks in a new shape, standing where the old one stood, with a little hop (none when he is sliding it into shape). */
  reform(p: RPiece, block: Block, hop = true): RPiece {
    const { y0 } = boxOf(p.block, p.x, p.y)
    const x = p.x
    this.remove(p)
    const q = this.add(block, x, y0 + block.rows / 2 + 0.05)
    if (hop) {
      q.rb.setLinvel({ x: 0, y: Math.sqrt(2 * GRAVITY * 0.6 * this.f) }, true)
      this.sneezes++
    }
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
    if (this.holding) Object.assign(this.holding, { x, y: Math.max(y, this.holding.p.block.rows / 2) })
  }

  /** The shape under the one he holds that it's over (their boxes meet, a little generously): where it might go back. */
  under(ok: (q: RPiece) => boolean): RPiece | null {
    const h = this.holding
    if (!h) return null
    const a = boxOf(h.p.block, h.x, h.y)
    let best: RPiece | null = null
    let near = Infinity
    for (const q of this.pieces) {
      if (q === h.p || !ok(q)) continue
      const b = boxOf(q.block, q.x, q.y)
      const m = 0.6
      if (a.x1 < b.x0 - m || a.x0 > b.x1 + m || a.y1 < b.y0 - m || a.y0 > b.y1 + m) continue
      const d = Math.hypot(h.x - q.x, h.y - q.y)
      if (d < near) [best, near] = [q, d]
    }
    return best
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
        const a = boxOf(p.block, h.x, y)
        const b = boxOf(q.block, q.x, q.y)
        if (a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1) y = b.y1 + p.block.rows / 2 + 0.02
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

  /** The one he holds goes back on `q`: the two become `whole`, standing where q stands. */
  join(q: RPiece, whole: Block): RPiece | null {
    const p = this.holding?.p
    if (!p) return null
    const { x0, y0 } = boxOf(q.block, q.x, q.y)
    this.remove(p)
    this.remove(q)
    const w = this.add(whole, x0 + whole.cols / 2, y0 + whole.rows / 2)
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
        const strength = Math.min(1, Math.hypot(v.x, v.y) / (2 * Math.sqrt(GRAVITY * Math.max(1, Math.max(p.block.cols, p.block.rows) * this.f))))
        if (strength < 0.1) continue
        p.lastThud = this.time
        thuds.push({ strength, size: count(p.block) })
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
        if (Math.hypot(v.x, v.y) > 0.6 * this.f) Object.assign(p, { settled: false, still: 0, airborne: 0 })
        continue
      }
      const v = p.rb.linvel()
      p.airborne += STEP
      p.still = Math.hypot(v.x, v.y) < 0.15 * this.f ? p.still + STEP : 0
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
      const b = boxOf(p.block, p.x, p.y)
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
