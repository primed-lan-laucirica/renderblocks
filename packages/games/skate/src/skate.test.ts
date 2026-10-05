import { describe, expect, it } from 'vitest'
import { Course } from './course'
import { canSkate, drag, fling, grab, middle, ready, step, tap, type Rider } from './rider'

const DT = 1 / 120

/** A finger flinging him to the right along the ground: touch his middle, drag, let go. */
function flick(k: Rider, c: Course, speed = 14) {
  const m = middle(k)
  expect(grab(k, m, 0)).toBe(true)
  for (let i = 1; i <= 5; i++) drag(k, c, { x: m.x + (speed * 0.1 * i) / 5, y: m.y }, (0.1 * i) / 5)
  fling(k, c)
}

/** Run him for `seconds`, flinging him on whenever he's stopped on his board (like a toddler would). */
function run(k: Rider, c: Course, seconds: number, each?: (k: Rider) => void) {
  for (let i = 0; i < seconds / DT; i++) {
    if (k.mode === 'ride' && k.still > 0.4) flick(k, c)
    step(k, c, DT)
    each?.(k)
  }
}

/** Put him on the street just before the first piece of a kind, rolling right at `v`. */
function before(c: Course, kind: string, v: number): { k: Rider; x: number } {
  c.ensure(800)
  const piece = c.pieces.find((p) => p.kind === kind)!
  const k = ready()
  k.pos = { x: piece.x - 4, y: c.heightAt(piece.x - 4) }
  k.v = v
  return { k, x: piece.x }
}

describe('the course', () => {
  it('is one unbroken profile, the same every time for a seed', () => {
    const a = new Course(5)
    const b = new Course(5)
    a.ensure(2000)
    b.ensure(2000)
    expect(a.segs.length).toBe(b.segs.length)
    for (let i = 1; i < a.segs.length; i++) {
      expect(a.segs[i].x0).toBeCloseTo(a.segs[i - 1].x1, 9)
      expect(a.segs[i].x1).toBeGreaterThan(a.segs[i].x0)
    }
    expect(new Set(a.pieces.map((p) => p.kind)).size).toBe(8)
  })
})

describe('Fourteen', () => {
  it.each([14, 1, 2, 3])('never gets stuck, and never sinks into the ground (town %i, 3 minutes)', (seed) => {
    const c = new Course(seed)
    const k = ready()
    let best = 0
    let since = 0
    run(k, c, 180, (k) => {
      expect(Number.isFinite(k.pos.x) && Number.isFinite(k.pos.y)).toBe(true)
      if (k.mode === 'ride' || k.mode === 'air') expect(k.pos.y).toBeGreaterThan(c.heightAt(k.pos.x) - 0.1)
      if (k.far > best + 1) {
        best = k.far
        since = 0
      } else since += DT
      expect(since).toBeLessThan(15)
    })
    expect(k.far).toBeGreaterThan(900)
  })

  it.each(['kicker', 'funbox', 'quarter', 'halfpipe', 'stairs', 'rail', 'pipe', 'blocks'])('rolling at a fair speed, he takes a %s in his stride: never stopping, never off his board', (kind) => {
    const c = new Course(14)
    const { k } = before(c, kind, 9)
    const i = c.pieces.findIndex((p) => p.kind === kind)
    const after = c.pieces[i + 1].x
    let stopped = false
    // (No flinging him on here: he has to get past it on his own momentum.)
    for (let t = 0; t < 15 / DT && k.pos.x < after; t++) {
      step(k, c, DT)
      if (k.mode === 'foot' || k.news.some((n) => n.kind === 'bump') || (k.mode === 'ride' && k.v <= 0)) stopped = true
      k.news = []
    }
    expect(stopped).toBe(false)
    expect(k.pos.x).toBeGreaterThanOrEqual(after)
  })

  it('too slow for a quarter pipe, he rolls back, so off he hops and climbs it, then skates on', () => {
    const c = new Course(14)
    const { k, x } = before(c, 'quarter', 2.5)
    const modes = new Set<string>()
    run(k, c, 12, (k) => {
      if (k.pos.x > x + 3) modes.add(k.mode)
    })
    expect(modes.has('foot')).toBe(true)
    expect(k.pos.x).toBeGreaterThan(x + 20)
  })

  it('creeping up to a parkour block, he vaults or climbs over the blocks, and is back on his board after them', () => {
    const c = new Course(14)
    const { k, x } = before(c, 'blocks', 2)
    const end = c.pieces[c.pieces.findIndex((p) => p.kind === 'blocks') + 1].x
    let footed = false
    run(k, c, 25, (k) => {
      if (k.mode === 'foot') footed = true
    })
    expect(footed).toBe(true)
    expect(k.pos.x).toBeGreaterThan(end)
    expect(x).toBeLessThan(end)
  })

  it('stuck in the bottom of a halfpipe, he runs up and out', () => {
    const c = new Course(14)
    const piece = c.pieces.find((p) => p.kind === 'halfpipe')!
    const k = ready()
    const bottom = piece.x + 9
    k.pos = { x: bottom, y: c.heightAt(bottom) }
    k.v = 0
    run(k, c, 10)
    expect(c.heightAt(k.pos.x)).toBeGreaterThanOrEqual(-0.01)
    expect(k.pos.x).toBeGreaterThan(piece.x + 20)
  })

  it('lands on stairs on his feet, runs down them, and gets back on his board at the bottom', () => {
    const c = new Course(14)
    const stairs = c.segs.find((s) => s.mat === 'stairs')!
    const k = ready()
    k.mode = 'air'
    // Below the handrail (above it, he'd grind it).
    k.pos = { x: stairs.x0 + 0.5, y: stairs.y0 + 1.2 }
    k.vel = { x: 0, y: 0 }
    let landedOnFoot = false
    let backOn: string | null = null
    run(k, c, 6, (k) => {
      if (k.mode === 'foot') landedOnFoot = true
      if (landedOnFoot && !backOn && k.news.some((n) => n.kind === 'on')) backOn = c.segAt(k.pos.x).mat
      k.news = []
    })
    expect(landedOnFoot).toBe(true)
    expect(backOn).toBe('street')
  })

  it('dropped onto a rail, he grinds it', () => {
    const c = new Course(14)
    const r = c.rails[0]
    const k = ready()
    k.mode = 'air'
    k.pos = { x: (r.x0 + r.x1) / 2, y: Math.max(r.y0, r.y1) + 2 }
    k.vel = { x: 6, y: 0 }
    let grinds = 0
    run(k, c, 3, (k) => {
      for (const n of k.news) if (n.kind === 'grind') grinds++
      k.news = []
    })
    expect(grinds).toBe(1)
  })

  it('flung along the ground he rolls off that way; flung up he flies; a tap while he flies is a flip, always finished by the landing', () => {
    const c = new Course(14)
    const k = ready()
    flick(k, c)
    expect(k.mode).toBe('ride')
    expect(k.v).toBeGreaterThan(10)
    const up = ready()
    const m = middle(up)
    grab(up, m, 0)
    drag(up, c, { x: m.x + 0.5, y: m.y + 1.5 }, 0.1)
    fling(up, c)
    expect(up.mode).toBe('air')
    expect(up.vel.y).toBeGreaterThan(10)
    // Every air: two flips asked for; every landing: both (all but) finished in the air just before it.
    let landings = 0
    let left = 0
    run(k, c, 8, (k) => {
      if (k.mode === 'air' && k.flips === 0) {
        tap(k)
        tap(k)
      }
      for (const n of k.news)
        if (n.kind === 'land') {
          landings++
          expect(left).toBeLessThan(0.15)
        }
      k.news = []
      if (k.mode === 'air') left = k.flips - k.turned
    })
    expect(landings).toBeGreaterThan(2)
    expect(k.tricks).toBeGreaterThanOrEqual(4)
  })

  it('only gets back on his board where he can skate', () => {
    const c = new Course(14)
    const stairs = c.segs.find((s) => s.mat === 'stairs')!
    expect(canSkate(c, stairs.x0 + 0.5)).toBe(false)
    const quarter = c.pieces.find((p) => p.kind === 'quarter')!
    expect(canSkate(c, quarter.x - 2)).toBe(false)
    expect(canSkate(c, -2)).toBe(true)
  })
})
