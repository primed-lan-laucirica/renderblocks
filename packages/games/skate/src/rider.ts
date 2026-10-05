/**
 * Fourteen in the skate town. Like LavaBlocks: touch him and fling him the
 * way he should go, and real physics takes it from there — rolling with
 * gravity along every ramp and pipe, flying in true arcs, grinding rails.
 * A tap while he flies is a flip.
 *
 * Where he can't skate on — he rolls back from something too steep, rides
 * into a wall, lands on stairs, or stops in front of an obstacle — he steps
 * off, board under his arm, and runs, vaults, climbs and leaps over it like
 * a parkour runner, hopping back on his board at the first stretch he can
 * skate. Assists where a toddler needs them: he always lands on his board,
 * and flips always finish.
 */
import { BACK_WALL, START, type Course, type Rail, type Seg } from './course'

export const G = 30
export const FRICTION = 0.35
export const DRAG = 0.01
/** The fastest fling. */
export const VMAX = 42
/** On foot: running speed (blocks/s) and stride length. */
export const RUN = 8
const STRIDE = 2.2
/** How close a touch must be to his middle to grab him (blocks). */
export const GRAB = 5
/** A step up bigger than this stops the board: a wall. */
const WALL = 0.4
/** On foot, steeper than this (rise over run) is vaulted or climbed, not walked. */
const STEEP = Math.tan((50 * Math.PI) / 180)
/** Off a near-vertical lip he drifts this fast onward, so he lands on the deck beyond it. */
const DRIFT = 1.5
/** A rise higher than this he climbs (a wall run) rather than vaults. */
const CLIMB_OVER = 6

export interface Vec {
  x: number
  y: number
}

export type Mode = 'ride' | 'air' | 'grind' | 'held' | 'foot'

/** One part of a parkour move: a jump (an arc) or a climb (straight up a wall). */
interface Leg {
  from: Vec
  to: Vec
  top: number
  dur: number
  kind: 'jump' | 'climb'
}

export type News =
  | { kind: 'land'; air: number; flips: number; lucky: boolean; doubleLucky: boolean }
  | { kind: 'grind'; blocks: number; lucky: boolean; doubleLucky: boolean }
  | { kind: 'takeoff' }
  | { kind: 'bump' }
  | { kind: 'step' }
  | { kind: 'off' }
  | { kind: 'on' }

export interface Rider {
  mode: Mode
  /** Where his board (or, on foot, his feet) is; in the air or held, where he is. */
  pos: Vec
  /** Rolling or grinding: speed along the surface (+ is to the right). */
  v: number
  /** In the air or held. */
  vel: Vec
  /** How he's tilted (radians). */
  angle: number
  rail: Rail | null
  /** On foot: the parkour move he's making, which part of it, and how far into it (s). */
  legs: Leg[]
  t: number
  /** On foot: strides run (for the running legs). */
  stride: number
  /** Held: recent finger positions (with times, s), for the fling. */
  trail: { p: Vec; t: number }[]
  /** Flips asked for this air, and how far the board has turned (in flips). */
  flips: number
  turned: number
  /** This air: where it took off (height), and its highest point. */
  from: number
  peak: number
  /** This air: split into two Sevens; the next air will (earned every 14 tricks). */
  split: boolean
  splitNext: boolean
  /** Grinding: where it started. */
  grindFrom: number
  /** Stopped on the board this long (s). */
  still: number
  tricks: number
  best: number
  /** The farthest he has got (blocks). */
  far: number
  /** What happened since the screen last looked (it clears this). */
  news: News[]
}

export const ready = (): Rider => ({
  mode: 'ride',
  pos: { x: START.x - 4, y: START.y },
  v: 0,
  vel: { x: 0, y: 0 },
  angle: 0,
  rail: null,
  legs: [],
  t: 0,
  stride: 0,
  trail: [],
  flips: 0,
  turned: 0,
  from: START.y,
  peak: START.y,
  split: false,
  splitNext: false,
  grindFrom: 0,
  still: 0,
  tricks: 0,
  best: 0,
  far: 0,
  news: [],
})

const unit = (s: { x0: number; y0: number; x1: number; y1: number }): Vec => {
  const l = Math.hypot(s.x1 - s.x0, s.y1 - s.y0)
  return { x: (s.x1 - s.x0) / l, y: (s.y1 - s.y0) / l }
}
const slope = (s: Seg) => (s.y1 - s.y0) / (s.x1 - s.x0)
const onSeg = (s: Seg, x: number) => s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0)
const railY = (r: Rail, x: number) => r.y0 + ((r.y1 - r.y0) * Math.max(0, Math.min(1, (x - r.x0) / (r.x1 - r.x0))))

/** His middle (for grabbing): halfway up him, whichever way he's tilted. */
export function middle(k: Rider): Vec {
  if (k.mode === 'foot') return { x: k.pos.x, y: k.pos.y + 4.5 }
  return { x: k.pos.x - Math.sin(k.angle) * 4, y: k.pos.y + Math.cos(k.angle) * 4 }
}

/** Starting a trick count: the totals, with every 7th lucky and every 14th double lucky. */
function count(k: Rider, add: number) {
  const tricks = k.tricks + add
  const lucky = Math.floor(tricks / 7) > Math.floor(k.tricks / 7)
  const doubleLucky = Math.floor(tricks / 14) > Math.floor(k.tricks / 14)
  k.tricks = tricks
  if (doubleLucky) k.splitNext = true
  return { lucky, doubleLucky }
}

// ——— touch ———

/** A touch: grabs him if it's on him (generously); otherwise false. */
export function grab(k: Rider, p: Vec, t: number): boolean {
  const m = middle(k)
  if (Math.hypot(p.x - m.x, p.y - m.y) > GRAB) return false
  if (k.mode === 'foot') k.angle = 0
  k.mode = 'held'
  k.vel = { x: 0, y: 0 }
  k.trail = [{ p, t }]
  k.legs = []
  k.flips = 0
  k.turned = 0
  k.split = false
  return true
}

/** Dragging: he moves with the finger (never into the ground; pulled against it, he sits on it). */
export function drag(k: Rider, c: Course, p: Vec, t: number) {
  if (k.mode !== 'held') return
  const last = k.trail[k.trail.length - 1]
  const x = Math.max(BACK_WALL + 1.5, k.pos.x + p.x - last.p.x)
  const h = c.heightAt(x)
  let y = Math.max(h, k.pos.y + p.y - last.p.y)
  if (y - h < 0.25) {
    y = h
    const u = unit(c.segAt(x))
    k.angle = Math.atan2(u.y, u.x)
  } else k.angle *= 0.8
  k.pos = { x, y }
  k.trail = [...k.trail, { p, t }].filter((q) => t - q.t <= 0.12)
}

/** Let go: he keeps the finger's speed (over its last tenth of a second or so). */
export function fling(k: Rider, c: Course) {
  if (k.mode !== 'held') return
  const a = k.trail[0]
  const b = k.trail[k.trail.length - 1]
  const dt = b.t - a.t
  let vel = dt > 0.01 ? { x: (b.p.x - a.p.x) / dt, y: (b.p.y - a.p.y) / dt } : { x: 0, y: 0 }
  const sp = Math.hypot(vel.x, vel.y)
  if (sp > VMAX) vel = { x: (vel.x * VMAX) / sp, y: (vel.y * VMAX) / sp }
  k.trail = []
  const s = c.segAt(k.pos.x)
  const u = unit(s)
  // On the ground and not flung up off it: rolling along it (or, where he can't skate, on foot).
  if (k.pos.y - c.heightAt(k.pos.x) < 0.3 && vel.x * -u.y + vel.y * u.x < 2) {
    k.pos.y = c.heightAt(k.pos.x)
    if (s.ride) {
      k.mode = 'ride'
      k.v = vel.x * u.x + vel.y * u.y
      k.still = 0
    } else toFoot(k)
    return
  }
  takeOff(k, k.pos, vel)
}

/** A tap that isn't on him, while he's flying: one more flip. */
export function tap(k: Rider) {
  if (k.mode === 'air') k.flips = Math.min(k.flips + 1, 5)
}

// ——— the physics ———

function takeOff(k: Rider, pos: Vec, vel: Vec) {
  k.mode = 'air'
  k.pos = { ...pos }
  k.vel = { ...vel }
  k.from = pos.y
  k.peak = pos.y
  k.flips = 0
  k.turned = 0
  k.split = k.splitNext
  k.splitNext = false
  k.news.push({ kind: 'takeoff' })
}

/** Would he fly off where the ground turns away from him (onto a segment heading `tn`)? */
function leaves(vel: Vec, tn: Vec): boolean {
  if (Math.abs(vel.x) < 1e-3) return vel.y > 0
  const d = 0.35
  const tau = (d * tn.x) / vel.x
  if (tau <= 0) return vel.y > 0
  return vel.y * tau - 0.5 * G * tau * tau > d * tn.y + 0.02
}

/** Is something in the way within `ahead` blocks to the right (a wall, or a climb)? */
function blocked(c: Course, x: number, ahead: number): boolean {
  for (let d = 0; d < ahead; d += 0.25) {
    const s = c.segAt(x + d)
    if (slope(s) > 0.14 || c.heightAt(x + d + 0.25) - c.heightAt(x + d) > WALL) return true
  }
  return false
}

/** Could he skate on from here: skateable ground, and nothing to climb, for the next few blocks? */
export function canSkate(c: Course, x: number): boolean {
  for (let d = 0; d <= 6; d += 0.5) {
    const s = c.segAt(x + d)
    const h = c.heightAt(x + d)
    // An edge ahead is fine (he'll fly off it); stop looking there.
    if (d > 0 && h < c.heightAt(x + d - 0.5) - 1) return true
    if (!s.ride || slope(s) > 0.14 || slope(s) < -1) return false
    if (c.heightAt(x + d + 0.5) - h > WALL) return false
  }
  return true
}

function toFoot(k: Rider) {
  k.mode = 'foot'
  k.angle = 0
  k.legs = []
  k.t = 0
  k.v = 0
  k.news.push({ kind: 'off' })
}

function rideStep(k: Rider, c: Course, dt: number) {
  const segs = c.segs
  let x = k.pos.x
  let i = c.indexAt(x)
  // Rolling left from the very start of a segment: he's on the one before.
  if (k.v < 0 && i > 0 && x <= segs[i].x0 + 1e-9) i--
  let u = unit(segs[i])
  const was = k.v
  let v = k.v + (-G * u.y - FRICTION * Math.sign(k.v) - DRAG * k.v) * dt
  // He couldn't make it up: rolling back, so off he hops to climb it on foot.
  if (was > 0 && v <= 0 && u.y > 0.08) {
    k.v = 0
    toFoot(k)
    return
  }
  // Coming to rest on level ground; standing in front of something he can't skate, off he hops.
  if (Math.abs(v) < 0.2 && Math.abs(u.y) < 0.05) v = 0
  k.still = v === 0 ? k.still + dt : 0
  if (k.still > 0.6 && blocked(c, x, 3)) {
    toFoot(k)
    return
  }
  let dist = v * dt
  while (dist !== 0) {
    const s = segs[i]
    u = unit(s)
    if (dist > 0) {
      const along = (s.x1 - x) / u.x
      if (dist < along) {
        x += dist * u.x
        break
      }
      x = s.x1
      dist -= along
      const n = segs[i + 1]
      if (!n) break
      if (n.y0 - s.y1 > WALL) {
        // Into a wall.
        k.pos = { x: s.x1 - 0.02, y: s.y1 }
        k.news.push({ kind: 'bump' })
        toFoot(k)
        return
      }
      const vel = { x: v * u.x, y: v * u.y }
      if (n.y0 < s.y1 - 0.01 || leaves(vel, unit(n))) {
        launch(k, { x, y: s.y1 }, vel)
        return
      }
      i++
    } else {
      const along = (x - s.x0) / u.x
      if (-dist < along) {
        x += dist * u.x
        break
      }
      x = s.x0
      dist += along
      const p = segs[i - 1]
      if (!p) {
        v = -v * 0.3
        break
      }
      if (p.y1 - s.y0 > WALL) {
        // Rolled back into a wall: bump off it.
        v = -v * 0.3
        x = s.x0 + 0.02
        k.news.push({ kind: 'bump' })
        break
      }
      const vel = { x: v * u.x, y: v * u.y }
      const back = unit(p)
      if (p.y1 < s.y0 - 0.01 || leaves(vel, { x: -back.x, y: -back.y })) {
        launch(k, { x, y: s.y0 }, vel)
        return
      }
      i--
    }
  }
  const s = segs[Math.min(i, segs.length - 1)]
  u = unit(s)
  k.v = Math.max(-VMAX, Math.min(VMAX, v))
  k.pos = { x, y: onSeg(s, Math.max(s.x0, Math.min(s.x1, x))) }
  k.angle = Math.atan2(u.y, u.x)
}

/** Off a lip: near-vertical ones drift him on over the deck beyond. */
function launch(k: Rider, at: Vec, vel: Vec) {
  const sp = Math.hypot(vel.x, vel.y)
  const v = { ...vel }
  if (sp > 0 && Math.abs(vel.y) / sp > 0.94 && vel.y > 0) v.x += DRIFT * (Math.sign(vel.x) || 1)
  takeOff(k, at, v)
}

/** Seconds until he's back down to height y. */
function timeTo(pos: Vec, vel: Vec, y: number) {
  return (vel.y + Math.sqrt(Math.max(0, vel.y ** 2 + 2 * G * Math.max(0, pos.y - y)))) / G
}

function airStep(k: Rider, c: Course, dt: number) {
  const prev = k.pos
  const vel = { x: k.vel.x, y: k.vel.y - G * dt }
  const pos = { x: prev.x + vel.x * dt, y: prev.y + vel.y * dt }
  if (pos.x < BACK_WALL + 1) {
    pos.x = BACK_WALL + 1
    vel.x = Math.abs(vel.x) * 0.4
  }
  k.peak = Math.max(k.peak, pos.y)
  // Flips: spin fast enough to finish every flip asked for before landing (assisted).
  const ground = c.heightAt(pos.x)
  const left = k.flips - k.turned
  const rate = left > 0 ? Math.max(1.6, left / Math.max(0.05, timeTo(pos, vel, ground) - 0.06)) : 0
  k.turned = Math.min(k.flips, k.turned + rate * dt)
  // Lean: upright in open air, turning to match the ground as he comes down to it (so he lands on his board).
  const u = unit(c.segAt(pos.x))
  const near = pos.y - ground < 4
  let d = (near ? Math.atan2(u.y, u.x) : 0) - k.angle
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  k.angle += d * Math.min(1, dt * (near ? 10 : 3))

  // Onto a rail: crossing it from above, coming down.
  for (const r of c.rails) {
    const lo = Math.min(r.x0, r.x1)
    const hi = Math.max(r.x0, r.x1)
    if (pos.x < lo || pos.x > hi || vel.y > 0) continue
    if (prev.y >= railY(r, prev.x) - 0.05 && pos.y <= railY(r, pos.x)) {
      const ru = unit(r)
      k.mode = 'grind'
      k.rail = r
      k.v = vel.x * ru.x + vel.y * ru.y
      k.pos = { x: pos.x, y: railY(r, pos.x) }
      k.angle = Math.atan2(ru.y, ru.x)
      k.turned = k.flips
      k.grindFrom = pos.x
      k.news.push({ kind: 'bump' })
      return
    }
  }

  if (pos.y <= ground) {
    // Into the side of a wall (its top higher than he was)? Then off it, still falling.
    const a = c.indexAt(Math.min(prev.x, pos.x))
    const b = c.indexAt(Math.max(prev.x, pos.x))
    for (let j = a; j < b; j++) {
      const s = c.segs[j]
      const n = c.segs[j + 1]
      const top = Math.max(s.y1, n.y0)
      if (Math.abs(n.y0 - s.y1) > WALL && top > prev.y) {
        const wx = s.x1
        k.pos = { x: wx + (vel.x > 0 ? -0.03 : 0.03), y: Math.max(pos.y, c.heightAt(wx + (vel.x > 0 ? -0.03 : 0.03))) }
        k.vel = { x: -vel.x * 0.25, y: Math.min(vel.y, 0) }
        k.news.push({ kind: 'bump' })
        return
      }
    }
    land(k, c, { x: pos.x, y: ground }, vel)
    return
  }
  k.pos = pos
  k.vel = vel
}

/** Landing: always on his board (or on his feet, where he can't skate). A height above where he took off, and each flip, is a trick. */
function land(k: Rider, c: Course, at: Vec, vel: Vec) {
  const s = c.segAt(at.x)
  const u = unit(s)
  const air = k.peak - k.from
  const counted = air >= 1 ? 1 : 0
  const { lucky, doubleLucky } = count(k, counted + k.flips)
  const shown = Math.round(Math.max(0, air) * 10) / 10
  if (counted) k.best = Math.max(k.best, shown)
  if (counted || k.flips) k.news.push({ kind: 'land', air: counted ? shown : 0, flips: k.flips, lucky, doubleLucky })
  else k.news.push({ kind: 'bump' })
  k.pos = at
  k.turned = k.flips
  k.split = false
  if (s.ride) {
    k.mode = 'ride'
    k.v = vel.x * u.x + vel.y * u.y
    k.angle = Math.atan2(u.y, u.x)
    k.still = 0
  } else toFoot(k)
}

function grindStep(k: Rider, dt: number) {
  const r = k.rail!
  const u = unit(r)
  k.v += (-G * u.y - 0.15 * Math.sign(k.v)) * dt
  const x = k.pos.x + k.v * u.x * dt
  const lo = Math.min(r.x0, r.x1)
  const hi = Math.max(r.x0, r.x1)
  // Off the end (or nearly stopped: he pops off it), the grind counts as a trick.
  if (x < lo || x > hi || Math.abs(k.v) < 0.5) {
    const blocks = Math.round(Math.abs(x - k.grindFrom))
    const { lucky, doubleLucky } = count(k, 1)
    k.news.push({ kind: 'grind', blocks, lucky, doubleLucky })
    k.rail = null
    const vel = Math.abs(k.v) < 0.5 ? { x: 3, y: 5 } : { x: k.v * u.x, y: k.v * u.y }
    takeOff(k, { x: Math.max(lo, Math.min(hi, x)), y: railY(r, x) }, vel)
    return
  }
  k.pos = { x, y: railY(r, x) }
}

// ——— on foot: parkour ———

const walkable = (c: Course, x: number) => Math.abs(slope(c.segAt(x))) < 1 && Math.abs(c.heightAt(x + 0.3) - c.heightAt(x)) < 0.5

/** The first place from x0 on (up to `range` blocks) where he could land on his feet, at least `minY` up. */
function landing(c: Course, x0: number, range: number, minY: number): Vec | null {
  for (let x = x0; x < x0 + range; x += 0.25) {
    const h = c.heightAt(x)
    if (h >= minY && walkable(c, x) && walkable(c, x + 0.5)) return { x: x + 0.4, y: c.heightAt(x + 0.4) }
  }
  return null
}

function jump(c: Course, from: Vec, to: Vec, lift = 1.2): Leg {
  const top = Math.max(c.highest(from.x, to.x), from.y, to.y) + lift
  const dist = Math.hypot(to.x - from.x, top - Math.min(from.y, to.y))
  return { from, to, top, dur: Math.max(0.35, Math.min(1.1, 0.25 + dist * 0.06)), kind: 'jump' }
}

/** Plan a way over what's ahead: up and over a wall (a vault, or a climb if it's tall), across a gap, or down off an edge. */
function plan(k: Rider, c: Course): Leg[] | null {
  const { x, y } = k.pos
  const ahead = x + 0.9
  const hA = c.heightAt(ahead)
  const steep = slope(c.segAt(ahead)) > STEEP || slope(c.segAt(x + 0.3)) > STEEP
  if (hA > y + 0.7 || steep) {
    // Where the climb starts, and where he can stand on top.
    let wx = x + 0.3
    while (wx < x + 2 && c.heightAt(wx) < y + 0.7 && slope(c.segAt(wx)) <= STEEP) wx += 0.1
    const top = landing(c, wx, 40, y + 0.3)
    if (!top) return null
    const peak = c.highest(wx, top.x)
    const edge = { x: wx - 0.9, y: peak + 0.4 }
    const first: Leg =
      peak - y > CLIMB_OVER
        ? { from: { x, y }, to: { x: wx - 0.9, y: peak - 1 }, top: peak - 1, dur: (peak - 1 - y) / 11, kind: 'climb' }
        : jump(c, { x, y }, edge, 0.6)
    return [first, jump(c, first.to, top, 0.8)]
  }
  if (hA < y - 1.3) {
    // An edge: across to something about as high, or down to whatever's below.
    const across = landing(c, x + 1.2, 9, y - 1)
    if (across) return [jump(c, { x, y }, across, 1.5)]
    const down = landing(c, x + 1, 30, -Infinity)
    if (down) return [jump(c, { x, y }, down, 0.8)]
  }
  return null
}

function footStep(k: Rider, c: Course, dt: number) {
  if (k.legs.length) {
    const leg = k.legs[0]
    k.t += dt
    const f = Math.min(1, k.t / leg.dur)
    if (leg.kind === 'climb') {
      k.pos = { x: leg.from.x + (leg.to.x - leg.from.x) * Math.min(1, f * 4), y: leg.from.y + (leg.to.y - leg.from.y) * f }
      k.stride += (dt * 11) / STRIDE
    } else {
      const mid = (leg.from.y + leg.to.y) / 2
      k.pos = { x: leg.from.x + (leg.to.x - leg.from.x) * f, y: leg.from.y + (leg.to.y - leg.from.y) * f + 4 * (leg.top - mid) * f * (1 - f) }
    }
    if (f >= 1) {
      k.pos = { ...leg.to }
      k.legs.shift()
      k.t = 0
      if (!k.legs.length) {
        k.pos.y = c.heightAt(k.pos.x)
        k.news.push({ kind: 'step' })
      }
    }
    return
  }
  if (canSkate(c, k.pos.x)) {
    // Back on his board, rolling at a run.
    k.mode = 'ride'
    k.v = RUN * 0.9
    k.still = 0
    k.news.push({ kind: 'on' })
    return
  }
  const legs = plan(k, c)
  if (legs) {
    k.legs = legs
    k.t = 0
    return
  }
  const before = Math.floor(k.stride * 2)
  const x = k.pos.x + RUN * dt
  k.pos = { x, y: c.heightAt(x) }
  k.stride += (RUN * dt) / STRIDE
  // A footstep each half stride.
  if (Math.floor(k.stride * 2) !== before) k.news.push({ kind: 'step' })
}

/** One step of the world for Fourteen (and building the town ahead of him). */
export function step(k: Rider, c: Course, dt: number) {
  if (k.mode === 'ride') rideStep(k, c, dt)
  else if (k.mode === 'air') airStep(k, c, dt)
  else if (k.mode === 'grind') grindStep(k, dt)
  else if (k.mode === 'foot') footStep(k, c, dt)
  k.far = Math.max(k.far, k.pos.x)
  c.ensure(k.pos.x + 200, k.pos.x)
}
