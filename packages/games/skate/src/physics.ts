/**
 * Fourteen on a halfpipe (Fingerboard-research.md: proposed design). Real
 * physics where it shows — gravity along the curve, momentum, friction,
 * airs that follow a true arc — and assists where a toddler needs them:
 * landings are always caught and flips always finish. Pure, so it is unit
 * tested directly.
 *
 * Units are Fourteen's blocks (he is 2 wide, 7 tall); y is up, the pipe's
 * flat bottom is y = 0, the copings are at y = R.
 */

export const R = 10 // transition radius = coping height
export const F = 8 // flat bottom
export const Q = (Math.PI * R) / 2 // length of one transition
export const L = 2 * Q + F // the whole surface, coping to coping

export const G = 30 // gravity, blocks/s²
/** Pumping: extra push while crouched and rolling downhill; a little drag if crouched uphill. */
export const PUMP = 3
export const PUMP_UPHILL = 0.15
/** How long a tap keeps him crouched (s). */
export const TAP_CROUCH = 0.35
export const FRICTION = 0.3
export const DRAG = 0.01
/** The highest air (blocks above the coping), so he stays on screen. */
export const AIR_MAX = 12
/** Each lip air drifts this fast back over the pipe, so he comes down on the wall. */
const DRIFT = 0.6

export interface Vec {
  x: number
  y: number
}

/** A point on the surface, `s` along it from the left coping. */
export function pointAt(s: number): Vec {
  if (s <= Q) {
    const a = Math.PI + s / R
    return { x: -F / 2 + R * Math.cos(a), y: R + R * Math.sin(a) }
  }
  if (s <= Q + F) return { x: -F / 2 + (s - Q), y: 0 }
  const a = (3 * Math.PI) / 2 + (s - Q - F) / R
  return { x: F / 2 + R * Math.cos(a), y: R + R * Math.sin(a) }
}

/** The direction of increasing s (unit). Its normal (−t.y, t.x) always points into the pipe. */
export function tangentAt(s: number): Vec {
  if (s <= Q) {
    const a = Math.PI + s / R
    return { x: -Math.sin(a), y: Math.cos(a) }
  }
  if (s <= Q + F) return { x: 1, y: 0 }
  const a = (3 * Math.PI) / 2 + (s - Q - F) / R
  return { x: -Math.sin(a), y: Math.cos(a) }
}

export interface Skater {
  mode: 'ready' | 'rolling' | 'air'
  /** Rolling: where along the surface, and how fast (signed along s). */
  s: number
  v: number
  /** In the air: position and velocity. */
  pos: Vec
  vel: Vec
  /** Which coping he flew from (−1 left, +1 right). */
  side: -1 | 1
  /** Holding a finger down: crouched. */
  crouch: boolean
  /** A tap crouches for a moment even if the finger lifts straight away, so tapping pumps too. */
  crouchT: number
  /** Flips asked for this air, and how far the board has turned (in flips). */
  flips: number
  turned: number
  /** Highest point this air (blocks above the coping). */
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

export const ready = (): Skater => ({
  mode: 'ready',
  s: 0,
  v: 0,
  pos: pointAt(0),
  vel: { x: 0, y: 0 },
  side: -1,
  crouch: false,
  crouchT: 0,
  flips: 0,
  turned: 0,
  peak: 0,
  split: false,
  tricks: 0,
  best: 0,
  landed: null,
  splitNext: false,
})

/** Energy per unit mass: what pumping adds and friction takes away. */
export const energy = (k: Skater) =>
  k.mode === 'air' ? (k.vel.x ** 2 + k.vel.y ** 2) / 2 + G * k.pos.y : k.v ** 2 / 2 + G * pointAt(k.s).y

/** A touch: drops in from the deck, crouches to pump, or (in the air) asks for another flip. */
export function press(k: Skater): Skater {
  if (k.mode === 'ready') return { ...k, mode: 'rolling', s: 0.05, v: 0.5, crouch: true, crouchT: TAP_CROUCH }
  if (k.mode === 'air') return { ...k, crouch: true, flips: Math.min(k.flips + 1, 5) }
  return { ...k, crouch: true, crouchT: TAP_CROUCH }
}

export const release = (k: Skater): Skater => ({ ...k, crouch: false })

/** Seconds until he's back down to the coping. */
function timeToLand(k: Skater) {
  const h = k.pos.y - R
  return (k.vel.y + Math.sqrt(Math.max(0, k.vel.y ** 2 + 2 * G * h))) / G
}

export function step(k: Skater, dt: number): Skater {
  if (k.mode === 'ready') return k
  if (k.mode === 'rolling') {
    const t = tangentAt(k.s)
    const dir = Math.sign(k.v) || 1
    let a = -G * t.y
    const crouchT = Math.max(0, k.crouchT - dt)
    if (k.crouch || k.crouchT > 0) {
      const downhill = t.y * dir < -0.05
      const uphill = t.y * dir > 0.05
      if (downhill) a += PUMP * dir
      else if (uphill) a -= PUMP * PUMP_UPHILL * dir
    }
    a -= FRICTION * dir + DRAG * k.v
    let v = k.v + a * dt
    // Never more than the highest air allows.
    const y = pointAt(k.s).y
    const maxV = Math.sqrt(Math.max(0, 2 * G * (R + AIR_MAX - y)))
    v = Math.max(-maxV, Math.min(maxV, v))
    const s = k.s + v * dt
    // Over a coping: into the air, straight up the wall, drifting back over the pipe.
    if (s <= 0 && v < 0) return { ...k, mode: 'air', pos: pointAt(0), vel: { x: DRIFT, y: -v }, side: -1, flips: 0, turned: 0, peak: 0, split: k.splitNext, splitNext: false }
    if (s >= L && v > 0) return { ...k, mode: 'air', pos: pointAt(L), vel: { x: -DRIFT, y: v }, side: 1, flips: 0, turned: 0, peak: 0, split: k.splitNext, splitNext: false }
    return { ...k, s: Math.max(0, Math.min(L, s)), v, crouchT }
  }
  // In the air: a true arc.
  const vel = { x: k.vel.x, y: k.vel.y - G * dt }
  const pos = { x: k.pos.x + vel.x * dt, y: k.pos.y + vel.y * dt }
  const peak = Math.max(k.peak, pos.y - R)
  // Flips: spin fast enough to finish every flip asked for before landing (assisted).
  const left = k.flips - k.turned
  const rate = left > 0 ? Math.max(1.6, left / Math.max(0.05, timeToLand({ ...k, pos, vel }) - 0.06)) : 0
  const turned = Math.min(k.flips, k.turned + rate * dt)
  if (vel.y < 0 && pos.y <= R) {
    // Caught: back onto the wall he left, rolling down it, the flips finished.
    const tricks = k.tricks + 1 + k.flips
    const lucky = Math.floor(tricks / 7) > Math.floor(k.tricks / 7)
    const doubleLucky = Math.floor(tricks / 14) > Math.floor(k.tricks / 14)
    const air = Math.round(peak * 10) / 10
    return {
      ...k,
      mode: 'rolling',
      s: k.side < 0 ? 0 : L,
      v: k.side < 0 ? Math.abs(vel.y) : -Math.abs(vel.y),
      pos,
      vel,
      turned: k.flips,
      peak,
      split: false,
      tricks,
      best: Math.max(k.best, air),
      landed: { air, flips: k.flips, lucky, doubleLucky },
      splitNext: k.splitNext || doubleLucky,
    }
  }
  return { ...k, pos, vel, peak, turned }
}

/** Crouched now (holding, or just tapped). */
export const crouched = (k: Skater) => k.crouch || k.crouchT > 0

/** Where the board is and which way is "up" for Fourteen (the surface normal, or straight up the wall in the air). */
export function pose(k: Skater): { at: Vec; angle: number } {
  // Waiting on the deck: standing up, tail at the coping.
  if (k.mode === 'ready') return { at: { x: pointAt(0).x - 1.9, y: R }, angle: 0 }
  if (k.mode === 'air') {
    // Off the wall at the wall's angle, straightening up at the top of the air, back to it for the landing.
    const wall = k.side < 0 ? -Math.PI / 2 : Math.PI / 2
    const v0 = Math.sqrt(k.vel.y ** 2 + 2 * G * Math.max(0, k.pos.y - R))
    return { at: k.pos, angle: wall * Math.min(1, Math.abs(k.vel.y) / Math.max(0.01, v0)) }
  }
  const t = tangentAt(k.s)
  return { at: pointAt(k.s), angle: Math.atan2(t.y, t.x) }
}
