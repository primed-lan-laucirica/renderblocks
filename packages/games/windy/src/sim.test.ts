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
    // Everyone come to rest has stopped spinning (one still flying from an updraft's throw may tumble on).
    const resting = t.riders.filter((r) => Math.hypot(r.rb.linvel().x, r.rb.linvel().y) < 3)
    expect(resting.length).toBeGreaterThan(20)
    expect(Math.max(...resting.map((r) => Math.abs(r.rb.angvel())))).toBeLessThan(0.5)
  })
  it('with the wind off from the start, nobody moves', () => {
    const t = crowd()
    t.setWind(false)
    const before = t.riders.map((r) => r.cur.x)
    run(t, 3)
    t.riders.forEach((r, i) => expect(Math.abs(r.cur.x - before[i])).toBeLessThan(0.05))
  })
  // Everyone queued against a building's wall (upright), and big ones alone, upright or lying down.
  const cases: [number[], boolean][] = [[[1, 4, 7, 9, 14], false], [[7], true], [[14], true], [[100], false], [[100], true]]
  for (const gravity of [0, 20])
    for (const [cast, lying] of cases)
      it(`pinned against a building by the wind, the updraft carries them up and over (${cast.join(', ')}${lying ? ' lying down' : ''}, gravity ${gravity})`, () => {
        const t = new Town(cast.map((n) => standard(BigInt(n))))
        t.setGravity(gravity)
        run(t, 0.5)
        t.ensure(1200)
        // A building with open street in front of it.
        const all = [...t.built.values()].flatMap((b) => b.pieces) as { kind: string; x: number; w?: number; len?: number; h?: number }[]
        const wall = all.find((w) => w.kind === 'building' && w.x > 25 && !all.some((p) => p.x < w.x && p.x + (p.w ?? p.len ?? 2) > w.x - 25)) as { x: number; w: number; h: number }
        let edge = wall.x - 0.2
        for (const r of t.riders) {
          const s = r.geo.scale
          const w = (r.geo.x1 - r.geo.x0) * s
          const h = (r.geo.y1 - r.geo.y0) * s
          r.rb.setTranslation(lying ? { x: edge, y: 0.05 } : { x: edge - w, y: 0.05 }, true)
          r.rb.setRotation(lying ? Math.PI / 2 : 0, true)
          r.rb.setLinvel({ x: 0, y: 0 }, true)
          r.rb.setAngvel(0, true)
          edge -= (lying ? h : w) + 0.3
        }
        run(t, 15)
        const trapped = t.riders.filter((r) => {
          const p = r.rb.worldCom()
          return p.x < wall.x && p.y < wall.h
        })
        expect(trapped.map((r) => String(r.c.n))).toEqual([])
      })
  it('dragged into a wall and stuck there, a character pops up over it', () => {
    const t = crowd()
    t.setWind(false)
    run(t, 0.5)
    // The first building after the start rooftop.
    const wall = [...t.built.values()].flatMap((b) => b.pieces).filter((p) => p.kind === 'building').sort((a, b) => a.x - b.x)[1] as { x: number; w: number; h: number }
    const r = t.riders[0]
    // Put One on the street just before that building, and pull it into the wall, low down.
    r.rb.setTranslation({ x: wall.x - 2, y: 0.05 }, true)
    r.rb.setLinvel({ x: 0, y: 0 }, true)
    run(t, 0.3)
    const p = r.rb.translation()
    t.startGrab(r, p.x + 0.5, p.y + 0.5)
    t.moveGrab(wall.x + 4, 1)
    const before = t.popped
    run(t, 2.5)
    expect(t.popped).toBeGreaterThan(before)
    expect(r.rb.translation().y).toBeGreaterThan(wall.h - 0.5) // up on (or over) the building
  })
  it("doesn't pop anyone who's just being flown about freely", () => {
    const t = crowd()
    t.setWind(false)
    const r = t.riders[9]
    const p = r.rb.translation()
    t.startGrab(r, p.x, p.y + 1)
    t.moveGrab(p.x, p.y + 12) // straight up into open sky
    run(t, 2)
    expect(t.popped).toBe(0)
  })
})
