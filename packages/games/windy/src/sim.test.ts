import { beforeAll, describe, expect, it } from 'vitest'
import { standard } from './characters'
import { initPhysics, Town } from './sim'

beforeAll(async () => {
  await initPhysics()
})

/** A crowd: 1–25, tumbling over each other on the start rooftop. */
const crowd = () => new Town(Array.from({ length: 25 }, (_, i) => standard(BigInt(i + 1))))
const run = (t: Town, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) t.step()
}
const maxSpin = (t: Town) => Math.max(...t.riders.map((r) => Math.abs(r.rb.angvel())))
const maxTwist = (t: Town) => Math.max(...t.riders.map((r) => Math.abs((r.rb as unknown as { userTorque(): number }).userTorque())))

describe('the town physics', () => {
  it("never piles up twist from the wind (it spun them faster and faster, forever)", () => {
    const t = crowd()
    for (let s = 0; s < 6; s++) {
      run(t, 1)
      expect(maxTwist(t)).toBeLessThan(1000)
      expect(maxSpin(t)).toBeLessThan(15)
    }
    expect(Math.max(...t.riders.map((r) => r.best))).toBeGreaterThan(5)
  })
  it('with the wind turned off mid-tumble, spinning dies away', () => {
    const t = crowd()
    run(t, 3)
    t.setWind(false)
    run(t, 6)
    expect(maxTwist(t)).toBe(0)
    expect(maxSpin(t)).toBeLessThan(0.5)
  })
  it('with the wind off from the start, nobody moves', () => {
    const t = crowd()
    t.setWind(false)
    const before = t.riders.map((r) => r.cur.x)
    run(t, 3)
    t.riders.forEach((r, i) => expect(Math.abs(r.cur.x - before[i])).toBeLessThan(0.05))
  })
})
