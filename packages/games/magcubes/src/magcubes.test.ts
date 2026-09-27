import { describe, expect, it } from 'vitest'
import { apply, axisAngle, HOME, mul, project, ray, rayCube, rotation, transpose, type Camera, type Vec3 } from './camera'
import { World, type Cube } from './world'

const one = (c = 1) => ({ cells: [{ dx: 0, dy: 0, dz: 0, c }] })
const row = (w: World, n: number, y = 0, z = 0) => {
  for (let x = 0; x < n; x++) w.add({ x, y, z, c: 1 })
}

describe('magnets', () => {
  it('finds a group as everything connected face to face', () => {
    const w = new World()
    row(w, 3)
    w.add({ x: 5, y: 0, z: 0, c: 2 }) // apart
    w.add({ x: 1, y: 0, z: 1, c: 3 }) // stacked on the middle
    expect(w.group(w.at(0, 0, 0)!)).toHaveLength(4)
    expect(w.group(w.at(5, 0, 0)!)).toHaveLength(1)
  })

  it('rests an aimed piece: lifted out of cubes, dropped if nothing holds it', () => {
    const w = new World()
    row(w, 3)
    w.add({ x: 1, y: 0, z: 1, c: 1 })
    expect(w.spot(one(), 1, 0, 0)).toEqual({ x: 1, y: 0, z: 2 }) // aimed into the stack: on top
    expect(w.spot(one(), 4, 0, 3)).toEqual({ x: 4, y: 0, z: 0 }) // in mid-air, touching nothing: falls
    expect(w.spot(one(), 3, 0, 0)).toEqual({ x: 3, y: 0, z: 0 }) // beside the row
    expect(w.spot(one(), 2, 0, 1)).toEqual({ x: 2, y: 0, z: 1 }) // beside the stacked cube, on the end one
    expect(w.spot(one(), 0, 1, 1)).toEqual({ x: 0, y: 1, z: 0 }) // hangs off nothing: falls to the table
    expect(w.spot(one(), 1, 1, 1)).toEqual({ x: 1, y: 1, z: 1 }) // held by the stacked cube's side
    // A bar lifted as a whole when any of it runs into something.
    const bar = { cells: [{ dx: 0, dy: 0, dz: 0, c: 1 }, { dx: 1, dy: 0, dz: 0, c: 1 }] }
    expect(w.spot(bar, 1, 0, 0)).toEqual({ x: 1, y: 0, z: 2 })
    // Cells below the grabbed cube never go under the table.
    const hanging = { cells: [{ dx: 0, dy: 0, dz: 0, c: 1 }, { dx: 0, dy: 0, dz: -1, c: 1 }] }
    expect(w.spot(hanging, 6, 6, 0)).toEqual({ x: 6, y: 6, z: 1 })
  })

  it('catches only when touching', () => {
    const w = new World()
    row(w, 2)
    expect(w.touches(one(), 2, 0, 0)).toBe(true) // beside
    expect(w.touches(one(), 3, 0, 0)).toBe(false) // a gap
    expect(w.touches(one(), 2, 1, 0)).toBe(false) // diagonal only
    expect(w.touches(one(), 0, 0, 1)).toBe(true) // on top
  })

  it('picks up a group relative to the grabbed cube', () => {
    const w = new World()
    row(w, 3, 0, 0)
    w.add({ x: 2, y: 0, z: 1, c: 5 })
    const grabbed = w.at(1, 0, 0)!
    const piece = w.pickUp(w.group(grabbed), grabbed)
    expect(w.size).toBe(0)
    expect(piece.cells).toContainEqual({ dx: 1, dy: 0, dz: 1, c: 5 })
    w.place(piece, 10, 10, 0)
    expect(w.at(11, 10, 1)?.c).toBe(5)
  })

  it('drops what a torn-off cube was holding up', () => {
    const w = new World()
    row(w, 3)
    w.add({ x: 2, y: 0, z: 1, c: 2 }) // on the end cube only
    w.add({ x: 2, y: 0, z: 2, c: 3 })
    const torn = w.at(2, 0, 0)!
    w.pickUp([torn], torn)
    // The two cubes above the gap touch nothing now (there is no cube at
    // x = 1 up there to hold them by the side), so they fall into it.
    const fell = w.settle()
    expect(fell.map((f) => f.fell)).toEqual([1, 1])
    expect(w.at(2, 0, 0)?.c).toBe(2)
    expect(w.at(2, 0, 1)?.c).toBe(3)
  })

  it('keeps an overhang its magnets hold', () => {
    const w = new World()
    row(w, 2)
    w.add({ x: 1, y: 0, z: 1, c: 1 })
    w.add({ x: 2, y: 0, z: 1, c: 1 }) // sticks out over the table, held by its side
    expect(w.settle()).toEqual([])
    expect(w.at(2, 0, 1)).toBeTruthy()
  })

  it('turns a group a quarter turn about the tapped cube', () => {
    const w = new World()
    // An L on the table: (0,0) (1,0) (2,0) and (2,1), with a cube stacked on (1,0).
    for (const [x, y] of [[0, 0], [1, 0], [2, 0], [2, 1]]) w.add({ x, y, z: 0, c: 1 })
    w.add({ x: 1, y: 0, z: 1, c: 5 })
    const before = w.toJSON().map(String).sort()
    const moved = w.turn(w.at(0, 0, 0)!)
    // Right becomes toward the viewer: the row now runs down from the pivot.
    expect(w.at(0, 1, 0)).toBeTruthy()
    expect(w.at(0, 2, 0)).toBeTruthy()
    expect(w.at(-1, 2, 0)).toBeTruthy()
    expect(w.at(0, 1, 1)?.c).toBe(5) // the stacked cube turns with it
    expect(moved.find((m) => m.cube.c === 5)?.from).toEqual({ x: 1, y: 0, z: 1 })
    // Four turns bring it back.
    for (let i = 0; i < 3; i++) w.turn(w.at(0, 0, 0)!)
    expect(w.toJSON().map(String).sort()).toEqual(before)
  })

  it('rests a turned group on top of anything in its way', () => {
    const w = new World()
    row(w, 3) // a bar (0,0) (1,0) (2,0)
    w.add({ x: 0, y: 2, z: 0, c: 4 }) // apart from it, but where its end swings to
    const moved = w.turn(w.at(0, 0, 0)!)
    // The bar would lie at (0,0) (0,1) (0,2): the cube at (0,2) is in the way, so it rests on top.
    expect(moved.map((m) => [m.cube.x, m.cube.y, m.cube.z])).toEqual([
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
    ])
  })

  it('round-trips a save and ignores junk', () => {
    const w = new World()
    row(w, 2)
    w.add({ x: 0, y: 0, z: 1, c: 10 })
    const back = World.fromJSON(JSON.parse(JSON.stringify(w)))
    expect(back.all().sort((a: Cube, b: Cube) => a.z - b.z || a.x - b.x)).toEqual(
      w.all().sort((a: Cube, b: Cube) => a.z - b.z || a.x - b.x),
    )
    expect(World.fromJSON([[0, 0, 0, 99], 'x', [1, 2]]).size).toBe(0)
    expect(World.fromJSON([[4, 4, 3, 2]]).at(4, 4, 0)).toBeTruthy() // floating cube settles
  })
})

describe('camera', () => {
  const cam = (R = HOME): Camera => ({ R, T: [0, 0, 0], ox: 0, oy: 0, zoom: 100, w: 800, h: 600 })
  const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6))

  it('starts at the home view: 60° above the table, a little from the right', () => {
    const up = apply(HOME, [0, 0, 1])
    const front = apply(HOME, [0, 1, 0])
    const right = apply(HOME, [1, 0, 0])
    expect(up[1]).toBeCloseTo(-0.5) // up is up the screen, by half a cube per cube of height
    expect(front[1]).toBeCloseTo(Math.cos(Math.PI / 6) * Math.cos((12 * Math.PI) / 180))
    expect(front[2]).toBeGreaterThan(0) // front faces face the viewer
    expect(right[2]).toBeGreaterThan(0) // so do right faces
    expect(up[2]).toBeGreaterThan(0) // and tops
  })

  it('finds the rotation between two views, and undoes it', () => {
    for (const [axis, angle] of [[[0, 0, 1], 0.7], [[1, 2, 3], 2.5], [[0, 1, 0], Math.PI], [[1, 1, 0], 3.1]] as Array<[Vec3, number]>) {
      const m = mul(rotation(axis, angle), HOME)
      const rel = axisAngle(mul(HOME, transpose(m)))
      close(mul(rotation(rel.axis, rel.angle), m), HOME)
    }
  })

  it('casts the ray through a screen point into the scene', () => {
    const c = cam()
    const p = project(c, [2.5, 1.5, 1])
    const r = ray(c, p.x, p.y)
    // The ray passes through the point it came from.
    const t = (2.5 - r.o[0]) / r.d[0]
    close([r.o[1] + r.d[1] * t, r.o[2] + r.d[2] * t], [1.5, 1])
  })

  it('hits the front-most cube, through the face you see', () => {
    const c = cam()
    // Straight down onto a stack: the top face of the top cube.
    const top = project(c, [0.5, 0.5, 2])
    const r = ray(c, top.x, top.y)
    const hits = [0, 1].map((z) => rayCube(r.o, r.d, [0, 0, z])).filter(Boolean) as Array<{ t: number; normal: Vec3 }>
    hits.sort((a, b) => a.t - b.t)
    expect(hits[0].normal).toEqual([0, 0, 1])
    // The middle of a front face.
    const front = project(c, [0.5, 1, 0.5])
    const f = ray(c, front.x, front.y)
    expect(rayCube(f.o, f.d, [0, 0, 0])?.normal).toEqual([0, 1, 0])
    // Straight down from the identity view misses a cube it isn't over.
    const d = cam([1, 0, 0, 0, 1, 0, 0, 0, 1])
    const miss = project(d, [3.5, 0.5, 0])
    const m = ray(d, miss.x, miss.y)
    expect(rayCube(m.o, m.d, [0, 0, 0])).toBeNull()
  })
})
