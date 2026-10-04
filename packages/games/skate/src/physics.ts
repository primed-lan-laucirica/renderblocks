/**
 * Fourteen on a halfpipe (Fingerboard-research.md). Like LavaBlocks: grab
 * him and fling him — down a wall, up the other side, or into the air —
 * and real physics takes it from there: gravity along the curve, momentum,
 * friction, true arcs, landings that keep the speed along the surface.
 * Assists where a toddler needs them: he always lands on his board, and
 * flips always finish. Pure, so it is unit tested directly.
 *
 * Units are Fourteen's blocks (he is 2 wide, 7 tall); y is up, the pipe's
 * flat bottom is y = 0, the copings are at y = R, the decks run out to ±EDGE.
 */

export const R = 10 // transition radius = coping height
export const F = 8 // flat bottom
export const Q = (Math.PI * R) / 2 // length of one transition
export const L = 2 * Q + F // the pipe's surface, coping to coping
export const COPE = F / 2 + R // x of the right coping (left is −COPE)
export const DECK = 4
export const EDGE = COPE + DECK

export const G = 30 // gravity, blocks/s²
export const FRICTION = 0.3
export const DECK_FRICTION = 3
export const DRAG = 0.01
/** The fastest fling, and the highest he can go above the coping (so he stays on screen). */
export const VMAX = 42
export const AIR_MAX = 14
/** Off a coping going straight up, he drifts this fast back over the pipe, so he lands on the wall. */
const DRIFT = 0.6
/** How close a touch must be to his middle to grab him (blocks). */
export const GRAB = 5

export interface Vec {
  x: number
  y: number
}

const CL = { x: -F / 2, y: R }
const CR = { x: F / 2, y: R }

/** A point on the pipe, `s` along it from the left coping. */
export function pointAt(s: number): Vec {
  if (s <= Q) {
    const a = Math.PI + s / R
    return { x: CL.x + R * Math.cos(a), y: R + R * Math.sin(a) }
  }
  if (s <= Q + F) return { x: -F / 2 + (s - Q), y: 0 }
  const a = (3 * Math.PI) / 2 + (s - Q - F) / R
  return { x: CR.x + R * Math.cos(a), y: R + R * Math.sin(a) }
}

/** The direction of increasing s (unit). Its normal (−t.y, t.x) points into the pipe. */
export function tangentAt(s: number): Vec {
  if (s <= Q) {
    const a = Math.PI + s / R
    return { x: -Math.sin(a), y: Math.cos(a) }
  }
  if (s <= Q + F) return { x: 1, y: 0 }
  const a = (3 * Math.PI) / 2 + (s - Q - F) / R
  return { x: -Math.sin(a), y: Math.cos(a) }
}

/** The nearest riding surface to a point: on the pipe (with its s) or a deck (with its x), and whether the point is inside the ramp. */
export interface Contact {
  on: 'pipe' | 'deck'
  s: number
  at: Vec
  tangent: Vec
  dist: number
  inside: boolean
}

export function nearest(p: Vec): Contact {
  const out: Contact[] = []
  // The two transitions (quarter circles), angles clamped to their arcs.
  for (const [c, lo, hi, s0, side] of [
    [CL, Math.PI, 1.5 * Math.PI, 0, -1],
    [CR, 1.5 * Math.PI, 2 * Math.PI, Q + F, 1],
  ] as const) {
    let a = Math.atan2(p.y - c.y, p.x - c.x)
    if (a < 0) a += 2 * Math.PI
    if (a < Math.PI / 2) a += 2 * Math.PI // just right of the right wall's top
    const ac = Math.max(lo, Math.min(hi, a))
    const s = s0 + (ac - lo) * R
    const at = pointAt(s)
    const r = Math.hypot(p.x - c.x, p.y - c.y)
    out.push({ on: 'pipe', s, at, tangent: tangentAt(s), dist: Math.hypot(p.x - at.x, p.y - at.y), inside: r > R && p.y < R && side * p.x > F / 2 && side * p.x <= COPE })
  }
  // The flat.
  const fx = Math.max(-F / 2, Math.min(F / 2, p.x))
  out.push({ on: 'pipe', s: Q + fx + F / 2, at: { x: fx, y: 0 }, tangent: { x: 1, y: 0 }, dist: Math.hypot(p.x - fx, p.y), inside: p.y < 0 && Math.abs(p.x) <= F / 2 })
  // The decks (the top of each ramp, coping out to the edge).
  for (const side of [-1, 1]) {
    const x = side < 0 ? Math.max(-EDGE, Math.min(-COPE, p.x)) : Math.max(COPE, Math.min(EDGE, p.x))
    out.push({ on: 'deck', s: x, at: { x, y: R }, tangent: { x: 1, y: 0 }, dist: Math.hypot(p.x - x, p.y - R), inside: p.y < R && Math.abs(p.x) > COPE })
  }
  // Inside the ramp: the surface he's inside, closest first; otherwise just the closest.
  out.sort((a, b) => Number(b.inside) - Number(a.inside) || a.dist - b.dist)
  return out[0]
}

export interface Skater {
  mode: 'pipe' | 'deck' | 'air' | 'held'
  /** On the pipe: s along it; on a deck: x. And speed along the surface (signed). */
  s: number
  v: number
  /** In the air or held: position, velocity, and how he's tilted. */
  pos: Vec
  vel: Vec
  angle: number
  /** Held: recent finger positions (with times, s) for the fling. */
  trail: { p: Vec; t: number }[]
  /** Flips asked for this air, and how far the board has turned (in flips). */
  flips: number
  turned: number
  /** Highest point this air. */
  peak: number
  /** This air: split into two Sevens. */
  split: boolean
  /** Totals. */
  tricks: number
  best: number
  /** Set on landing, for the screen to show and celebrate; cleared by the screen. */
  landed: { air: number; flips: number; lucky: boolean; doubleLucky: boolean } | null
  /** The next air splits (earned every 14 tricks). */
  splitNext: boolean
}

/** Waiting on the left deck, standing still. */
export const ready = (): Skater => ({
  mode: 'deck',
  s: -COPE - 2,
  v: 0,
  pos: { x: -COPE - 2, y: R },
  vel: { x: 0, y: 0 },
  angle: 0,
  trail: [],
  flips: 0,
  turned: 0,
  peak: 0,
  split: false,
  tricks: 0,
  best: 0,
  landed: null,
  splitNext: false,
})

/** Where the board is and which way is "up" for Fourteen. */
export function pose(k: Skater): { at: Vec; angle: number } {
  if (k.mode === 'pipe') {
    const t = tangentAt(k.s)
    return { at: pointAt(k.s), angle: Math.atan2(t.y, t.x) }
  }
  if (k.mode === 'deck') return { at: { x: k.s, y: R }, angle: 0 }
  return { at: k.pos, angle: k.angle }
}

/** His middle (for grabbing): halfway up his blocks, whichever way he's tilted. */
export function middle(k: Skater): Vec {
  const { at, angle } = pose(k)
  return { x: at.x - Math.sin(angle) * 4, y: at.y + Math.cos(angle) * 4 }
}

/** Energy per unit mass. */
export function energy(k: Skater) {
  const { at } = pose(k)
  const speed = k.mode === 'air' || k.mode === 'held' ? Math.hypot(k.vel.x, k.vel.y) : Math.abs(k.v)
  return speed ** 2 / 2 + G * at.y
}

/** Never faster than the highest air allows from where he is. */
function capSpeed(v: Vec, y: number): Vec {
  const max = Math.min(VMAX, Math.sqrt(Math.max(0, 2 * G * (R + AIR_MAX - y))))
  const sp = Math.hypot(v.x, v.y)
  return sp > max ? { x: (v.x * max) / sp, y: (v.y * max) / sp } : v
}

/** A touch: grabs him if it's on him (anywhere on his body, generously); otherwise null. */
export function grab(k: Skater, p: Vec, t: number): Skater | null {
  const m = middle(k)
  if (Math.hypot(p.x - m.x, p.y - m.y) > GRAB) return null
  const { at, angle } = pose(k)
  return { ...k, mode: 'held', pos: at, vel: { x: 0, y: 0 }, angle, trail: [{ p, t }], flips: 0, turned: 0, peak: 0, split: false }
}

/** Dragging: he moves with the finger (never into the ramp; pulled against it, he rides its surface). */
export function drag(k: Skater, p: Vec, t: number): Skater {
  if (k.mode !== 'held') return k
  const last = k.trail[k.trail.length - 1]
  // Within the park, and no higher than his highest air.
  let pos = { x: Math.max(-EDGE, Math.min(EDGE, k.pos.x + p.x - last.p.x)), y: Math.min(R + AIR_MAX, k.pos.y + p.y - last.p.y) }
  const c = nearest(pos)
  let angle = k.angle
  if (c.inside || c.dist < 0.25) {
    pos = c.at
    angle = Math.atan2(c.tangent.y, c.tangent.x)
  }
  const trail = [...k.trail, { p, t }].filter((q) => t - q.t <= 0.12)
  return { ...k, pos, angle, trail }
}

/** Let go: he keeps the finger's speed (over its last tenth of a second or so). */
export function fling(k: Skater): Skater {
  if (k.mode !== 'held') return k
  const a = k.trail[0]
  const b = k.trail[k.trail.length - 1]
  const dt = b.t - a.t
  const raw = dt > 0.01 ? { x: (b.p.x - a.p.x) / dt, y: (b.p.y - a.p.y) / dt } : { x: 0, y: 0 }
  const vel = capSpeed(raw, k.pos.y)
  // On the surface and not flung away from it: ride off along it. Otherwise: into the air.
  const c = nearest(k.pos)
  if (c.dist < 0.3) {
    const away = vel.x * -c.tangent.y + vel.y * c.tangent.x
    if (away < 2) return { ...k, mode: c.on, s: c.s, v: vel.x * c.tangent.x + vel.y * c.tangent.y, trail: [] }
  }
  return { ...k, mode: 'air', vel, trail: [], peak: k.pos.y, split: k.splitNext, splitNext: false }
}

/** A tap away from him while he's flying: one more flip. */
export const tapFlip = (k: Skater): Skater => (k.mode === 'air' ? { ...k, flips: Math.min(k.flips + 1, 5) } : k)

/** Seconds until he's back down to height y. */
function timeTo(pos: Vec, vel: Vec, y: number) {
  return (vel.y + Math.sqrt(Math.max(0, vel.y ** 2 + 2 * G * Math.max(0, pos.y - y)))) / G
}

/** Landing: always on his board; he keeps the speed along the surface. An air above the coping, and each flip, is a trick. */
function land(k: Skater, c: Contact, vel: Vec): Skater {
  const air = k.peak - R
  const counted = air >= 1 ? 1 : 0
  const tricks = k.tricks + counted + k.flips
  const lucky = Math.floor(tricks / 7) > Math.floor(k.tricks / 7)
  const doubleLucky = Math.floor(tricks / 14) > Math.floor(k.tricks / 14)
  const shown = Math.round(Math.max(0, air) * 10) / 10
  return {
    ...k,
    mode: c.on,
    s: c.s,
    v: vel.x * c.tangent.x + vel.y * c.tangent.y,
    vel,
    turned: k.flips,
    split: false,
    tricks,
    best: Math.max(k.best, counted ? shown : 0),
    landed: counted || k.flips ? { air: counted ? shown : 0, flips: k.flips, lucky, doubleLucky } : null,
    splitNext: k.splitNext || doubleLucky,
  }
}

/** Into the air from a surface, with this velocity. */
const takeOff = (k: Skater, pos: Vec, vel: Vec, angle: number): Skater => ({
  ...k,
  mode: 'air',
  pos,
  vel,
  angle,
  peak: pos.y,
  flips: 0,
  turned: 0,
  split: k.splitNext,
  splitNext: false,
})

export function step(k: Skater, dt: number): Skater {
  if (k.mode === 'held') return k
  if (k.mode === 'deck') {
    let v = k.v - Math.sign(k.v) * Math.min(Math.abs(k.v), DECK_FRICTION * dt)
    let x = k.s + v * dt
    // The outer end: bump back.
    if (Math.abs(x) > EDGE) {
      x = Math.sign(x) * EDGE
      v = -v * 0.4
    }
    // Over the coping, into the pipe: off the edge and down.
    if (Math.abs(x) < COPE) return takeOff(k, { x, y: R }, { x: v, y: 0 }, 0)
    return { ...k, s: x, v }
  }
  if (k.mode === 'pipe') {
    const t = tangentAt(k.s)
    const dir = Math.sign(k.v) || 1
    const v = k.v + (-G * t.y - FRICTION * dir - DRAG * k.v) * dt
    const s = k.s + v * dt
    // Over a coping: into the air, straight up the wall, drifting back over the pipe.
    if (s <= 0 && v < 0) return takeOff(k, pointAt(0), { x: DRIFT, y: -v }, -Math.PI / 2)
    if (s >= L && v > 0) return takeOff(k, pointAt(L), { x: -DRIFT, y: v }, Math.PI / 2)
    return { ...k, s: Math.max(0, Math.min(L, s)), v }
  }
  // In the air: a true arc.
  let vel = { x: k.vel.x, y: k.vel.y - G * dt }
  let pos = { x: k.pos.x + vel.x * dt, y: k.pos.y + vel.y * dt }
  // The outer ends of the decks: bounce back.
  if (Math.abs(pos.x) > EDGE) {
    pos = { ...pos, x: Math.sign(pos.x) * EDGE }
    vel = { ...vel, x: -vel.x * 0.5 }
  }
  const peak = Math.max(k.peak, pos.y)
  const c = nearest(pos)
  // Flips: spin fast enough to finish every flip asked for before landing (assisted).
  const left = k.flips - k.turned
  const rate = left > 0 ? Math.max(1.6, left / Math.max(0.05, timeTo(pos, vel, Math.min(R, c.at.y)) - 0.06)) : 0
  const turned = Math.min(k.flips, k.turned + rate * dt)
  // Lean: upright in open air, turning to match the surface as he comes down to it (so he lands on his board).
  const near = c.dist < 4
  const target = near ? Math.atan2(c.tangent.y, c.tangent.x) : 0
  let d = target - k.angle
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const angle = k.angle + d * Math.min(1, dt * (near ? 10 : 3))
  // Touching down (moving into the surface): land.
  const n = { x: -c.tangent.y, y: c.tangent.x }
  if ((c.inside || c.dist < 0.02) && vel.x * n.x + vel.y * n.y <= 0) return land({ ...k, peak, turned }, c, vel)
  return { ...k, pos, vel, peak, turned, angle }
}
