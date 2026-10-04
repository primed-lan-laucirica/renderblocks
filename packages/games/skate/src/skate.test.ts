import { describe, expect, it } from 'vitest'
import { AIR_MAX, energy, F, L, pointAt, press, Q, R, ready, release, step, tangentAt, type Skater } from './physics'

const DT = 1 / 120
const run = (k: Skater, seconds: number, each?: (k: Skater) => Skater) => {
  for (let i = 0; i < seconds / DT; i++) {
    if (each) k = each(k)
    k = step(k, DT)
  }
  return k
}
/** A good pumper: crouch rolling downhill, stand going up. */
const pumpWell = (k: Skater) => {
  if (k.mode !== 'rolling') return k
  const downhill = tangentAt(k.s).y * Math.sign(k.v) < 0
  return downhill ? press(k) : release(k)
}

describe('the halfpipe', () => {
  it('is one smooth surface from coping to coping', () => {
    expect(pointAt(0).y).toBeCloseTo(R)
    expect(pointAt(L).y).toBeCloseTo(R)
    expect(pointAt(Q).y).toBeCloseTo(0)
    expect(pointAt(Q + F).y).toBeCloseTo(0)
    for (let s = 0; s < L; s += 0.25) {
      const a = pointAt(s)
      const b = pointAt(s + 0.25)
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(0.25, 1)
    }
    expect(tangentAt(0)).toMatchObject({ y: -1 })
    expect(tangentAt(L).y).toBeCloseTo(1)
  })
})

describe('riding', () => {
  it('drops in from the deck and rolls back and forth, losing a little to friction', () => {
    let k = release(press(ready()))
    const e0 = energy(k)
    k = run(k, 10)
    expect(k.mode).toBe('rolling')
    expect(energy(k)).toBeLessThan(e0)
    expect(energy(k)).toBeGreaterThan(e0 * 0.3)
  })
  it('flies once he pumps well, and higher than holding all the time', () => {
    const good = run(press(ready()), 30, pumpWell)
    const always = run(press(ready()), 30, (k) => (k.mode === 'rolling' && !k.crouch ? press(k) : k))
    const never = run(release(press(ready())), 30)
    expect(good.best).toBeGreaterThan(3)
    expect(good.best).toBeGreaterThan(always.best)
    expect(always.best).toBeGreaterThanOrEqual(never.best)
    expect(never.best).toBe(0)
  })
  it('never goes higher than the cap', () => {
    const k = run(press(ready()), 90, pumpWell)
    expect(k.best).toBeLessThanOrEqual(AIR_MAX + 0.2)
  })
})

describe('airs and flips', () => {
  /** Pump until he's in the air. */
  const toAir = () => {
    let k = press(ready())
    for (let i = 0; i < 120 * 60 && k.mode !== 'air'; i++) k = step(pumpWell(k), DT)
    return k
  }
  it('flies up off the coping and lands back on the same wall, rolling down it', () => {
    let k = toAir()
    expect(k.mode).toBe('air')
    const side = k.side
    while (k.mode === 'air') k = step(k, DT)
    expect(k.s).toBe(side < 0 ? 0 : L)
    expect(Math.sign(k.v)).toBe(side < 0 ? 1 : -1)
    expect(k.landed?.air).toBeGreaterThan(0)
    expect(k.tricks).toBe(1)
  })
  it('finishes every flip tapped for before landing, even late ones', () => {
    let k = toAir()
    k = release(press(release(press(release(press(k)))))) // three taps
    while (k.mode === 'air') k = step(k, DT)
    expect(k.landed?.flips).toBe(3)
    expect(k.turned).toBe(3)
    expect(k.tricks).toBe(4) // the air and three flips
  })
  it('splits into two Sevens on the air after every 14th trick', () => {
    let k: Skater = { ...toAir(), tricks: 12 }
    k = release(press(release(press(k))))
    while (k.mode === 'air') k = step(k, DT)
    expect(k.landed?.doubleLucky).toBe(true)
    expect(k.splitNext).toBe(true)
    for (let i = 0; i < 120 * 60 && k.mode !== 'air'; i++) k = step(pumpWell(k), DT)
    expect(k.split).toBe(true)
  })
})
