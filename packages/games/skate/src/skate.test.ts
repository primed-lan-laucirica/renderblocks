import { describe, expect, it } from 'vitest'
import { COPE, drag, EDGE, energy, F, fling, grab, L, middle, nearest, pointAt, pose, Q, R, ready, step, tangentAt, tapFlip, type Skater, type Vec } from './physics'

const DT = 1 / 120
const run = (k: Skater, seconds: number) => {
  for (let i = 0; i < seconds / DT; i++) k = step(k, DT)
  return k
}
/** Grab him and swipe: from his middle, by `d` over `ms` milliseconds, then let go. */
const swipe = (k: Skater, d: Vec, ms = 100) => {
  const m = middle(k)
  let h = grab(k, m, 0)!
  for (let i = 1; i <= 10; i++) h = drag(h, { x: m.x + (d.x * i) / 10, y: m.y + (d.y * i) / 10 }, (ms / 1000) * (i / 10))
  return fling(h)
}
const untilLanded = (k: Skater) => {
  for (let i = 0; i < 120 * 20 && k.mode === 'air'; i++) k = step(k, DT)
  return k
}

describe('the halfpipe', () => {
  it('is one smooth surface from coping to coping', () => {
    expect(pointAt(0).y).toBeCloseTo(R)
    expect(pointAt(L).y).toBeCloseTo(R)
    expect(pointAt(Q).y).toBeCloseTo(0)
    for (let s = 0; s < L; s += 0.25) {
      const a = pointAt(s)
      const b = pointAt(s + 0.25)
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(0.25, 1)
    }
  })
  it('finds the nearest surface, and knows the inside of the ramp', () => {
    expect(nearest({ x: 0, y: 3 })).toMatchObject({ on: 'pipe', inside: false })
    expect(nearest({ x: 0, y: -0.5 })).toMatchObject({ on: 'pipe', inside: true })
    expect(nearest({ x: -COPE - 2, y: R + 1 })).toMatchObject({ on: 'deck', inside: false })
    const wall = nearest({ x: -COPE + 0.5, y: R - 1 }) // just inside the left wall
    expect(wall.on).toBe('pipe')
    expect(wall.s).toBeLessThan(2)
    const inRamp = nearest({ x: -COPE - 0.3, y: R - 2 })
    expect(inRamp.inside).toBe(true)
  })
})

describe('flinging', () => {
  it('grabs him only by his body', () => {
    const k = ready()
    expect(grab(k, middle(k), 0)).not.toBeNull()
    expect(grab(k, { x: 0, y: 0 }, 0)).toBeNull()
  })
  it('flung off the deck into the pipe: down the wall, across, and up the other side', () => {
    let k = swipe(ready(), { x: 3, y: 0 }) // a gentle push toward the pipe
    k = run(k, 0.6)
    expect(['air', 'pipe']).toContain(k.mode)
    k = untilLanded(k)
    expect(k.mode).toBe('pipe')
    // He rolls back and forth after that, never below the surface.
    for (let i = 0; i < 120 * 8; i++) {
      k = step(k, DT)
      expect(pose(k).at.y).toBeGreaterThan(-0.01)
    }
  })
  it('a harder fling gives more speed', () => {
    const onWall = (): Skater => ({ ...ready(), mode: 'pipe', s: Q / 2, v: 0 })
    const soft = swipe(onWall(), { x: 2, y: -2 })
    const hard = swipe(onWall(), { x: 4, y: -4 })
    expect(Math.abs(hard.v)).toBeGreaterThan(Math.abs(soft.v))
    expect(energy(hard)).toBeGreaterThan(energy(soft))
  })
  it('flung hard down a wall, he flies off the far coping and lands back on that wall', () => {
    let k: Skater = { ...ready(), mode: 'pipe', s: 2, v: 0 }
    k = swipe(k, { x: 3, y: -5 }, 80)
    let flew = false
    for (let i = 0; i < 120 * 4; i++) {
      k = step(k, DT)
      if (k.mode === 'air' && k.pos.x > 0) flew = true
      if (flew && k.mode !== 'air') break
    }
    expect(flew).toBe(true)
    expect(k.mode).toBe('pipe')
    expect(k.landed?.air).toBeGreaterThan(1)
    expect(k.tricks).toBe(1)
  })
  it('thrown into the air, he lands on his board wherever he comes down, keeping the speed along the surface', () => {
    let k: Skater = { ...ready(), mode: 'pipe', s: Q + F / 2, v: 0 }
    k = swipe(k, { x: -3, y: 4 }) // up and left
    expect(k.mode).toBe('air')
    k = untilLanded(k)
    expect(['pipe', 'deck']).toContain(k.mode)
    const p = pose(k)
    expect(Math.abs(p.angle - Math.atan2(tangentAt(k.s).y, tangentAt(k.s).x))).toBeLessThan(0.01)
  })
  it('never gets faster than the cap, however hard he is flung', () => {
    const k = swipe(ready(), { x: 40, y: 40 }, 20)
    expect(Math.hypot(k.vel.x, k.vel.y)).toBeLessThanOrEqual(42.01)
    const top = untilLanded(k)
    expect(top.peak).toBeLessThanOrEqual(R + 14 + 0.1)
  })
  it('stays inside the park: bumps back off the ends of the decks', () => {
    let k = swipe(ready(), { x: -6, y: 1 }) // away from the pipe
    k = run(k, 4)
    expect(Math.abs(pose(k).at.x)).toBeLessThanOrEqual(EDGE + 0.01)
  })
})

describe('flips and lucky tricks', () => {
  const lipAir = () => {
    let k: Skater = { ...ready(), mode: 'pipe', s: Q + F, v: 28 }
    for (let i = 0; i < 120 * 3 && k.mode !== 'air'; i++) k = step(k, DT)
    return k
  }
  it('finishes every flip tapped for before landing', () => {
    let k = lipAir()
    expect(k.mode).toBe('air')
    k = tapFlip(tapFlip(tapFlip(k)))
    k = untilLanded(k)
    expect(k.landed?.flips).toBe(3)
    expect(k.turned).toBe(3)
    expect(k.tricks).toBe(4)
  })
  it('splits into two Sevens on the air after every 14th trick', () => {
    let k: Skater = { ...lipAir(), tricks: 12 }
    k = untilLanded(tapFlip(k))
    expect(k.landed?.doubleLucky).toBe(true)
    k = { ...k, mode: 'pipe', s: Q + F, v: 28 }
    for (let i = 0; i < 120 * 3 && k.mode !== 'air'; i++) k = step(k, DT)
    expect(k.split).toBe(true)
  })
})
