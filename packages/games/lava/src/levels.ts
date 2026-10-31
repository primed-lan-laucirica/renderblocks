import RAPIER from '@dimforge/rapier2d-compat'
import { numberToClips } from '@renderblocks/kernel'
import { STEP, type Arena, type Block, type Sim, type StepEvents } from './sim'

/**
 * The Lava River's islands (LavaBlocks level selector: research and
 * proposal, Oct 31 2026). Each level is a battle with one physical rule
 * added that carries a maths idea: the lava rises to a numbered level, a
 * block clicks into the dock its size fits, a balance tips toward the
 * bigger sum, a black hole adds up what it swallows. No fail states:
 * outside the battles, a block that falls in the lava drops back in.
 */

export type LevelId = 'free' | 'rising' | 'lineup' | 'balance' | 'hole'

/** Something to show and say: "7 = 3 + 4". */
export interface Sentence {
  text: string
  clips: string[]
}

export interface Level {
  id: LevelId
  /** For Lan; he reads the sign. */
  name: string
  /** The island's sign: a number sentence, not a word. */
  sign: string
  /** A battle ends with a winner (last one out of the lava); a puzzle ends with its sentence. */
  kind: 'battle' | 'puzzle'
  /** The blocks, first play and every Again. */
  values: (first: boolean) => number[]
  arena: (values: number[]) => LevelArena | null
}

const pick = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const say = (...parts: Array<number | string>): string[] =>
  parts.flatMap((p) => (typeof p === 'number' ? numberToClips(p) : [p]))

/** "3 + 4" and its clips. */
const plus = (parts: number[]) => ({
  text: parts.length ? parts.join(' + ') : '0',
  clips: parts.length ? parts.flatMap((p, i) => (i ? say('plus', p) : say(p))) : say(0),
})

/** Half the rotated bounding box's height. */
const halfHeight = (b: Block) =>
  0.5 * (Math.abs(b.shape.w * Math.sin(b.cur.a)) + Math.abs(b.shape.h * Math.cos(b.cur.a)))

const speedOf = (b: Block) => {
  const v = b.body.linvel()
  return Math.hypot(v.x, v.y)
}

/** Screen-space text with the blocks' dark outline. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, fill = '#fff'): void {
  ctx.font = `800 ${px}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2, px * 0.2)
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

/**
 * A level's rules. Battle reads `finished` (the closing sentence) and takes
 * `news` (sentences to say right now) every frame.
 */
export abstract class LevelArena implements Arena {
  finished: Sentence | null = null
  news: Sentence[] = []
  /** Blocks that fall in come back; a battle's don't. */
  protected respawn = true
  /** Where each block started, to drop it back there. */
  protected home = new Map<Block, number>()
  /**
   * Air between the platform and the lava. A battle's long fall is for the
   * screams; a level wants its arena big on screen instead.
   */
  protected drop = 4

  setup(sim: Sim): void {
    for (const b of sim.blocks) this.home.set(b, b.cur.x)
    sim.setLava(-sim.platform.depth - this.drop)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the Arena signature
  step(sim: Sim, _out: StepEvents): void {
    if (!this.respawn) return
    for (const b of sim.blocks) {
      if (b.outAt !== null && !b.removed && !b.locked && sim.time - b.outAt > 0.7) {
        sim.revive(b, this.home.get(b) ?? 0, b.shape.h / 2 + 6)
      }
    }
  }

  /** Move a block, before play starts. */
  protected place(b: Block, x: number, y: number): void {
    b.body.setTranslation({ x, y }, true)
    b.cur = { x, y, a: 0 }
    b.prev = { ...b.cur }
    this.home.set(b, x)
  }
}

// ------------------------------------------------------------ rising lava

/**
 * The lava climbs a numbered gauge one step at a time and waits there: a
 * block it covers completely is out. Tall beats wide — 7 outlasts 9 — and
 * a little block lifted onto a tall one survives with it.
 */
class RisingArena extends LevelArena {
  protected respawn = false
  protected drop = 2
  /** The level the lava is rising to, or has reached and is waiting at. */
  level = 0
  private waitUntil = 2
  private top = 1

  setup(sim: Sim): void {
    super.setup(sim)
    this.top = Math.ceil(Math.max(...sim.blocks.map((b) => b.shape.h))) + 1
    sim.viewTop = this.top
  }

  isOut(sim: Sim, b: Block): boolean {
    return b.cur.y + halfHeight(b) <= sim.lavaY + 0.05
  }

  step(sim: Sim, out: StepEvents): void {
    super.step(sim, out)
    if (sim.alive().length <= 1 || sim.time < this.waitUntil) return
    // Up to the platform quickly, then a step at a time.
    const rate = this.level === 0 ? 3 : 0.5
    sim.lavaY = Math.min(this.level, sim.lavaY + rate * STEP)
    if (sim.lavaY >= this.level) {
      if (this.level > 0) this.news.push({ text: String(this.level), clips: say(this.level) })
      if (this.level >= this.top) {
        this.waitUntil = Infinity
        return
      }
      this.level++
      this.waitUntil = sim.time + (this.level === 1 ? 1 : 2)
    }
  }

  drawBack(ctx: CanvasRenderingContext2D, sim: Sim, zoom: number): void {
    // A stone gauge left of the platform, a tick per block height.
    const x = sim.platform.x0 - 1.2
    ctx.fillStyle = '#44403c'
    ctx.fillRect(x - 0.5, sim.lavaBase, 1, this.top - sim.lavaBase + 0.3)
    ctx.strokeStyle = '#e7e5e4'
    ctx.lineWidth = 2 / zoom
    ctx.beginPath()
    for (let i = 0; i <= this.top; i++) {
      ctx.moveTo(x - 0.5, i)
      ctx.lineTo(x + 0.5, i)
    }
    ctx.stroke()
  }

  drawFront(ctx: CanvasRenderingContext2D, sim: Sim, toScreen: (x: number, y: number) => [number, number], zoom: number): void {
    const px = Math.min(26, Math.max(11, zoom * 0.6))
    for (let i = 1; i <= this.top; i++) {
      const [sx, sy] = toScreen(sim.platform.x0 - 2.2, i)
      const reached = sim.lavaY >= i - 0.01
      label(ctx, String(i), sx - px * 0.3, sy, i === this.level || reached ? px * 1.25 : px, reached ? '#fdba74' : '#fff')
    }
  }
}

// ---------------------------------------------------------------- line up

interface Dock {
  value: number
  x: number
  filled: Block | null
}

interface Snap {
  b: Block
  from: { x: number; y: number; a: number }
  to: { x: number; y: number }
  t0: number
}

const SNAP_S = 0.3

/**
 * Outlines of the blocks stand in order of size on the right. A block let
 * go near its own outline clicks into it; when every one is home the row
 * reads smallest to largest.
 */
class LineUpArena extends LevelArena {
  private docks: Dock[] = []
  private snaps: Snap[] = []
  private sim!: Sim

  setup(sim: Sim): void {
    super.setup(sim)
    this.sim = sim
    const sorted = [...sim.blocks].sort((a, b) => a.value - b.value)
    let x = sim.platform.x1 + 2
    for (const b of sorted) {
      this.docks.push({ value: b.value, x: x + b.shape.w / 2, filled: null })
      x += b.shape.w + 1.4
    }
    sim.resizePlatform(sim.platform.x0, x + 1.6)
    sim.viewTop = Math.max(...sim.blocks.map((b) => b.shape.h)) + 1
  }

  step(sim: Sim, out: StepEvents): void {
    super.step(sim, out)
    for (const b of sim.loose()) {
      const dock = this.docks.find((d) => !d.filled && d.value === b.value)
      if (!dock) continue
      // Held anywhere over its outline is close enough: it clicks in without being dropped on its
      // neighbours, and shoves aside any block standing in its place.
      const held = sim.grabbed() === b
      const near = Math.abs(b.cur.x - dock.x) < b.shape.w / 2 + 0.7 && b.cur.y - halfHeight(b) < (held ? b.shape.h + 2 : 2.5)
      if (!near) continue
      dock.filled = b
      sim.lock(b)
      b.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
      b.body.setLinvel({ x: 0, y: 0 }, true)
      b.body.setAngvel(0, true)
      let a = b.cur.a % (2 * Math.PI)
      if (a > Math.PI) a -= 2 * Math.PI
      if (a < -Math.PI) a += 2 * Math.PI
      this.snaps.push({ b, from: { ...b.cur, a }, to: { x: dock.x, y: b.shape.h / 2 + 0.001 }, t0: sim.time })
      this.news.push({ text: String(b.value), clips: say(b.value) })
    }
    for (let i = this.snaps.length - 1; i >= 0; i--) {
      const s = this.snaps[i]
      const t = Math.min(1, (sim.time - s.t0) / SNAP_S)
      const e = 1 - (1 - t) * (1 - t)
      s.b.body.setNextKinematicTranslation({ x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e })
      s.b.body.setNextKinematicRotation(s.from.a * (1 - e))
      if (t >= 1) this.snaps.splice(i, 1)
    }
    if (!this.finished && this.snaps.length === 0 && this.docks.every((d) => d.filled)) {
      const vs = this.docks.map((d) => d.value)
      this.finished = { text: vs.join(' < '), clips: say(...vs) }
    }
  }

  drawBack(ctx: CanvasRenderingContext2D, _sim: Sim, zoom: number): void {
    for (const d of this.docks) {
      if (d.filled) continue
      const shape = this.sim.blocks.find((b) => b.value === d.value)!.shape
      ctx.save()
      ctx.translate(d.x, shape.h / 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.lineWidth = 3 / zoom
      ctx.setLineDash([8 / zoom, 6 / zoom])
      const path = new Path2D()
      if (shape.hull) shape.hull.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)))
      else for (const r of shape.rects) path.rect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h)
      ctx.fill(path)
      ctx.stroke(path)
      ctx.restore()
    }
  }
}

// ---------------------------------------------------------------- balance

const PAN_W = 6.5
const PAN_REST = 2.4
const PAN_SWING = 1.6
/**
 * Top speed of a pan, units/s. Slow, because a pan that stops rising
 * faster than gravity (4) can slow a block throws it into the air.
 */
const PAN_SPEED = 0.7

/** Left pan's drop for a difference of sums: any difference shows, a big one no more than the swing. */
const tiltFor = (d: number) => (d === 0 ? 0 : Math.sign(d) * Math.min(PAN_SWING, 0.5 + 0.25 * Math.abs(d)))

interface Pan {
  body: RAPIER.RigidBody
  x: number
  /** Blocks on it now, left to right. */
  on: Block[]
}

/**
 * A balance over the platform. Its pans move by the SUMS on them, not by
 * physics — 3 and 4 together weigh exactly 7 — and the sentence over the
 * post compares them live: 7 > 3, 7 < 3 + 5, 7 = 3 + 4.
 */
class BalanceArena extends LevelArena {
  private pans: Pan[] = []
  private post = 0
  /** Left pan's drop; the right one rises by the same. */
  private tilt = 0
  private evenFor = 0

  setup(sim: Sim): void {
    super.setup(sim)
    const [target, ...spares] = sim.blocks
    const lx = PAN_W / 2 + 0.5
    this.post = lx + PAN_W / 2 + 1.6
    const rx = this.post + PAN_W / 2 + 1.6
    // It starts already tipped by the block on the left pan.
    this.tilt = tiltFor(target.value)
    for (const [x, y] of [
      [lx, PAN_REST - this.tilt],
      [rx, PAN_REST + this.tilt],
    ]) {
      const body = sim.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y))
      const { friction, restitution } = sim.surface
      const parts: Array<[number, number, number, number]> = [
        [PAN_W / 2, 0.15, 0, 0],
        [0.15, 0.5, -PAN_W / 2 + 0.15, 0.6],
        [0.15, 0.5, PAN_W / 2 - 0.15, 0.6],
      ]
      for (const [hw, hh, cx, cy] of parts) {
        sim.world.createCollider(
          RAPIER.ColliderDesc.cuboid(hw, hh).setTranslation(cx, cy).setFriction(Math.max(friction, 0.8)).setRestitution(restitution),
          body,
        )
      }
      this.pans.push({ body, x, on: [] })
    }
    this.place(target, lx, PAN_REST - this.tilt + 0.15 + target.shape.h / 2 + 0.01)
    let x = rx + PAN_W / 2 + 2.5
    for (const b of spares) {
      this.place(b, x + b.shape.w / 2, b.shape.h / 2 + 0.002)
      x += b.shape.w + 1.2
    }
    sim.resizePlatform(-1, x + 1.5)
    sim.viewTop = PAN_REST + PAN_SWING + Math.max(...sim.blocks.map((b) => b.shape.h)) + 0.5
  }

  private sum(p: Pan): number {
    return p.on.reduce((s, b) => s + b.value, 0)
  }

  step(sim: Sim, out: StepEvents): void {
    super.step(sim, out)
    const held = sim.grabbed()
    for (const p of this.pans) {
      const top = p.body.translation().y + 0.15
      p.on = sim
        .loose()
        .filter((b) => b !== held && Math.abs(b.cur.x - p.x) < PAN_W / 2 && b.cur.y > top && speedOf(b) < 2)
        .sort((a, b) => a.cur.x - b.cur.x || a.cur.y - b.cur.y)
    }
    const [L, R] = this.pans.map((p) => this.sum(p))
    const d = L - R
    const move = (tiltFor(d) - this.tilt) * 3 * STEP
    this.tilt += Math.max(-PAN_SPEED * STEP, Math.min(PAN_SPEED * STEP, move))
    this.pans[0].body.setNextKinematicTranslation({ x: this.pans[0].x, y: PAN_REST - this.tilt })
    this.pans[1].body.setNextKinematicTranslation({ x: this.pans[1].x, y: PAN_REST + this.tilt })

    const even = d === 0 && L > 0 && Math.abs(this.tilt) < 0.05 && held === null
    this.evenFor = even ? this.evenFor + STEP : 0
    if (this.evenFor > 1 && !this.finished) {
      const [l, r] = this.pans.map((p) => plus(p.on.map((b) => b.value)))
      this.finished = { text: `${l.text} = ${r.text}`, clips: [...l.clips, 'equals', ...r.clips] }
    }
  }

  /** The live comparison: left parts, sign, right parts. */
  private sentence(): string {
    const [l, r] = this.pans.map((p) => plus(p.on.map((b) => b.value)).text)
    const [L, R] = this.pans.map((p) => this.sum(p))
    return `${l} ${L > R ? '>' : L < R ? '<' : '='} ${r}`
  }

  drawBack(ctx: CanvasRenderingContext2D, _sim: Sim, zoom: number): void {
    const [a, b] = this.pans.map((p) => ({ x: p.x, y: p.body.translation().y }))
    const pivot = { x: this.post, y: PAN_REST + 3.2 }
    // Post and beam.
    ctx.fillStyle = '#78716c'
    ctx.fillRect(this.post - 0.25, 0, 0.5, pivot.y)
    ctx.strokeStyle = '#a8a29e'
    ctx.lineWidth = 0.35
    ctx.lineCap = 'round'
    const slope = (b.y - a.y) / (b.x - a.x)
    const ends = [a, b].map((p) => ({ x: p.x, y: pivot.y + slope * (p.x - pivot.x) }))
    ctx.beginPath()
    ctx.moveTo(ends[0].x, ends[0].y)
    ctx.lineTo(ends[1].x, ends[1].y)
    ctx.stroke()
    // Hangers down to each pan's corners.
    ctx.lineWidth = 2 / zoom
    ctx.strokeStyle = '#d6d3d1'
    for (let i = 0; i < 2; i++) {
      const p = [a, b][i]
      const e = ends[i]
      ctx.beginPath()
      ctx.moveTo(p.x - PAN_W / 2 + 0.2, p.y + 0.15)
      ctx.lineTo(e.x, e.y)
      ctx.lineTo(p.x + PAN_W / 2 - 0.2, p.y + 0.15)
      ctx.stroke()
    }
    ctx.fillStyle = '#e7e5e4'
    ctx.beginPath()
    ctx.arc(pivot.x, pivot.y, 0.35, 0, Math.PI * 2)
    ctx.fill()
    // Pans.
    ctx.fillStyle = '#a16207'
    for (const p of [a, b]) {
      ctx.fillRect(p.x - PAN_W / 2, p.y - 0.15, PAN_W, 0.3)
      ctx.fillRect(p.x - PAN_W / 2, p.y - 0.15, 0.3, 1.25)
      ctx.fillRect(p.x + PAN_W / 2 - 0.3, p.y - 0.15, 0.3, 1.25)
    }
  }

  /** The sentence sits at the top of the screen, where nothing on the balance can cover it. */
  drawFront(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.clientWidth
    const even = this.finished !== null || (this.sum(this.pans[0]) === this.sum(this.pans[1]) && this.pans[0].on.length > 0)
    label(ctx, this.sentence(), w / 2, 36, Math.min(48, Math.max(26, w / 22)), even ? '#86efac' : '#fff')
  }
}

// ------------------------------------------------------------- black hole

interface Swallow {
  b: Block
  from: { x: number; y: number; a: number }
  t0: number
}

const SWALLOW_S = 0.5

/**
 * A black hole hangs over the end of the platform. Blocks that come near
 * are pulled in; it wears the running total and says each new sum.
 */
class HoleArena extends LevelArena {
  total = 0
  private order: number[] = []
  private x = 0
  private y = 0
  private swallows: Swallow[] = []
  private count = 0

  private get r(): number {
    return 1 + 0.22 * Math.sqrt(this.total)
  }

  setup(sim: Sim): void {
    super.setup(sim)
    this.count = sim.blocks.length
    this.x = sim.platform.x1 + 4
    this.y = 4.2
    sim.resizePlatform(sim.platform.x0, this.x + 6)
    sim.viewTop = Math.max(this.y + 3, ...sim.blocks.map((b) => b.shape.h + 1))
  }

  step(sim: Sim, out: StepEvents): void {
    super.step(sim, out)
    const reach = this.r + 3.5
    for (const b of sim.loose()) {
      const dx = this.x - b.cur.x
      const dy = this.y - b.cur.y
      const d = Math.hypot(dx, dy)
      if (d < this.r + 0.2 * b.shape.L) {
        sim.lock(b)
        for (let i = 0; i < b.body.numColliders(); i++) b.body.collider(i).setSensor(true)
        b.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
        this.swallows.push({ b, from: { ...b.cur }, t0: sim.time })
      } else if (d < reach && sim.grabbed() !== b) {
        // A pull that grows as it gets closer, strong enough to lift a block off the platform.
        const a = 6 + 14 * (1 - d / reach)
        const m = b.body.mass()
        b.body.applyImpulse({ x: (m * a * STEP * dx) / d, y: (m * a * STEP * dy) / d }, true)
      }
    }
    for (let i = this.swallows.length - 1; i >= 0; i--) {
      const s = this.swallows[i]
      const t = Math.min(1, (sim.time - s.t0) / SWALLOW_S)
      s.b.body.setNextKinematicTranslation({ x: s.from.x + (this.x - s.from.x) * t, y: s.from.y + (this.y - s.from.y) * t })
      s.b.body.setNextKinematicRotation(s.from.a + t * 6)
      s.b.scale = 1 - t
      if (t < 1) continue
      this.swallows.splice(i, 1)
      sim.world.removeRigidBody(s.b.body)
      s.b.removed = true
      s.b.outAt = sim.time
      const before = this.total
      this.total += s.b.value
      this.order.push(s.b.value)
      this.news.push(
        before === 0
          ? { text: String(this.total), clips: say(this.total) }
          : { text: `${before} + ${s.b.value} = ${this.total}`, clips: say(before, 'plus', s.b.value, 'equals', this.total) },
      )
      if (this.order.length === this.count) {
        this.finished = { text: `${this.order.join(' + ')} = ${this.total}`, clips: say(this.total) }
      }
    }
  }

  drawBack(ctx: CanvasRenderingContext2D, sim: Sim): void {
    const r = this.r
    const glow = ctx.createRadialGradient(this.x, this.y, r * 0.8, this.x, this.y, r + 3.5)
    glow.addColorStop(0, 'rgba(168, 85, 247, 0.55)')
    glow.addColorStop(1, 'rgba(168, 85, 247, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(this.x, this.y, r + 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#020617'
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
    // A swirl round the rim.
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.9)'
    ctx.lineWidth = r * 0.12
    for (let k = 0; k < 3; k++) {
      const a0 = sim.time * 2 + (k * 2 * Math.PI) / 3
      ctx.beginPath()
      ctx.arc(this.x, this.y, r * 1.08, a0, a0 + 1.3)
      ctx.stroke()
    }
  }

  drawFront(ctx: CanvasRenderingContext2D, _sim: Sim, toScreen: (x: number, y: number) => [number, number], zoom: number): void {
    const [sx, sy] = toScreen(this.x, this.y)
    const text = this.total.toLocaleString('en-US')
    label(ctx, text, sx, sy, Math.min(64, Math.max(14, (this.r * 1.3 * zoom) / Math.max(1, text.length * 0.6))))
  }
}

// ----------------------------------------------------------------- levels

const ONE_TO_TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function balanceValues(first: boolean): number[] {
  if (first) return [7, 2, 3, 4, 5]
  const t = pick(5, 12)
  const a = pick(1, t - 1)
  const spares = new Set([a, t - a])
  while (spares.size < 4) spares.add(pick(1, 9))
  return [t, ...shuffle([...spares])]
}

function lineUpValues(): number[] {
  const vs = new Set<number>()
  while (vs.size < 5) vs.add(pick(1, 20))
  return shuffle([...vs])
}

export const LEVELS: Level[] = [
  { id: 'free', name: 'Free Battle', sign: '1 2 3 …', kind: 'battle', values: () => [], arena: () => null },
  { id: 'rising', name: 'Rising Lava', sign: '7 > 6', kind: 'battle', values: () => ONE_TO_TEN, arena: () => new RisingArena() },
  { id: 'lineup', name: 'Line Up', sign: '3 < 8 < 15', kind: 'puzzle', values: lineUpValues, arena: () => new LineUpArena() },
  { id: 'balance', name: 'Balance', sign: '7 = 3 + 4', kind: 'puzzle', values: balanceValues, arena: () => new BalanceArena() },
  { id: 'hole', name: 'Black Hole', sign: '1 + 2 + 3 = 6', kind: 'puzzle', values: () => ONE_TO_TEN, arena: () => new HoleArena() },
]

export const levelById = (id: string): Level | undefined => LEVELS.find((l) => l.id === id)
