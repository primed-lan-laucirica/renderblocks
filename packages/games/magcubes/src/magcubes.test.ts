import { describe, expect, it } from 'vitest'
import { landing, World, type Cube } from './world'

const LAYER = 0.35
const SHEAR = 0.2
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

  it('stacks a piece on the highest cube beneath it', () => {
    const w = new World()
    row(w, 3)
    w.add({ x: 1, y: 0, z: 1, c: 1 })
    expect(w.place(one(), 1, 0)[0].z).toBe(2)
    expect(w.place(one(), 0, 0)[0].z).toBe(1)
    expect(w.place(one(), 4, 0)[0].z).toBe(0) // on the table
    // A 2-wide bar half over the stack rests on its top.
    const bar = { cells: [{ dx: 0, dy: 0, dz: 0, c: 1 }, { dx: 1, dy: 0, dz: 0, c: 1 }] }
    expect(w.place(bar, 1, 1).map((c) => c.z)).toEqual([0, 0])
    expect(w.place(bar, 2, 0).map((c) => c.z)).toEqual([1, 1])
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
    w.place(piece, 10, 10)
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

describe('landing', () => {
  // The drawn top-face corner of a cube at (x, y, z).
  const drawn = (x: number, y: number, z: number) => [x - (z + 1) * SHEAR, y - (z + 1) * LAYER] as const

  it('lands on the surface the finger shows', () => {
    const w = new World()
    // A 2-high stack at (0, 5).
    w.add({ x: 0, y: 5, z: 0, c: 1 })
    w.add({ x: 0, y: 5, z: 1, c: 1 })
    // Drawn where a cube resting on the stack would be.
    expect(landing(w, one(), ...drawn(0, 5, 2), LAYER, SHEAR)).toEqual({ x: 0, y: 5, base: 2 })
    // Drawn where a cube on the table in front of it would be.
    expect(landing(w, one(), ...drawn(0, 6, 0), LAYER, SHEAR)).toEqual({ x: 0, y: 6, base: 0 })
    // Open table, a little off the grid: the magnets line it up.
    const [gx, gy] = drawn(3, 7, 0)
    expect(landing(w, one(), gx + 0.4, gy + 0.2, LAYER, SHEAR)).toEqual({ x: 3, y: 7, base: 0 })
  })
})
