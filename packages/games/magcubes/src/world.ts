/**
 * The magnet model (spec: Magnets). Pure — no DOM, no drawing — so it is
 * unit tested directly.
 *
 * Every cube sits on one shared, invisible grid: x right, y toward the
 * viewer, z up (0 = on the table). There are no stored groups: a group is
 * simply every cube connected face to face, found when one is grabbed.
 */

/** Numberblocks palette index, 1–10 (red … white). */
export type Colour = number

export interface Cube {
  x: number
  y: number
  z: number
  c: Colour
}

/** A picked-up group: cells relative to the grabbed cube (dx = dy = 0), lowest dz = 0. */
export interface Piece {
  cells: Array<{ dx: number; dy: number; dz: number; c: Colour }>
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`
const colKey = (x: number, y: number) => `${x},${y}`
const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const

export class World {
  private cubes = new Map<string, Cube>()
  /** Occupied heights per column, for "what's the top here". */
  private cols = new Map<string, Set<number>>()

  get size(): number {
    return this.cubes.size
  }

  all(): Cube[] {
    return [...this.cubes.values()]
  }

  at(x: number, y: number, z: number): Cube | undefined {
    return this.cubes.get(key(x, y, z))
  }

  /** Highest occupied z in a column, or -1 when it is empty. */
  top(x: number, y: number): number {
    const zs = this.cols.get(colKey(x, y))
    return zs && zs.size ? Math.max(...zs) : -1
  }

  /** Tallest column anywhere (-1 when empty) — bounds the landing search. */
  maxTop(): number {
    let t = -1
    for (const c of this.cubes.values()) t = Math.max(t, c.z)
    return t
  }

  add(c: Cube): void {
    this.cubes.set(key(c.x, c.y, c.z), c)
    const k = colKey(c.x, c.y)
    let zs = this.cols.get(k)
    if (!zs) this.cols.set(k, (zs = new Set()))
    zs.add(c.z)
  }

  remove(c: Cube): void {
    this.cubes.delete(key(c.x, c.y, c.z))
    const zs = this.cols.get(colKey(c.x, c.y))
    zs?.delete(c.z)
    if (zs && !zs.size) this.cols.delete(colKey(c.x, c.y))
  }

  /** Everything connected to `start` face to face, `start` included. */
  group(start: Cube): Cube[] {
    const seen = new Set([key(start.x, start.y, start.z)])
    const out = [start]
    for (let i = 0; i < out.length; i++) {
      const c = out[i]
      for (const [dx, dy, dz] of NEIGHBOURS) {
        const k = key(c.x + dx, c.y + dy, c.z + dz)
        const n = this.cubes.get(k)
        if (n && !seen.has(k)) {
          seen.add(k)
          out.push(n)
        }
      }
    }
    return out
  }

  /** Lift cubes out of the world as a piece, relative to `anchor`. */
  pickUp(cubes: Cube[], anchor: Cube): Piece {
    for (const c of cubes) this.remove(c)
    const minZ = Math.min(...cubes.map((c) => c.z))
    return {
      cells: cubes.map((c) => ({ dx: c.x - anchor.x, dy: c.y - anchor.y, dz: c.z - minZ, c: c.c })),
    }
  }

  /**
   * The height a piece rests at with its grabbed cube over (x, y): on the
   * highest cube beneath any of its cells, else on the table.
   */
  restingBase(piece: Piece, x: number, y: number): number {
    let base = 0
    for (const p of piece.cells) base = Math.max(base, this.top(x + p.dx, y + p.dy) + 1 - p.dz)
    return base
  }

  /** Whether a piece resting at (x, y, base) touches any cube — i.e. the magnets catch. */
  touches(piece: Piece, x: number, y: number, base: number): boolean {
    if (base > 0) return true // resting on something
    const own = new Set(piece.cells.map((p) => key(x + p.dx, y + p.dy, base + p.dz)))
    return piece.cells.some((p) =>
      NEIGHBOURS.some(([dx, dy, dz]) => {
        const k = key(x + p.dx + dx, y + p.dy + dy, base + p.dz + dz)
        return !own.has(k) && this.cubes.has(k)
      }),
    )
  }

  /** Put a piece down with its grabbed cube over (x, y), resting on whatever is beneath. */
  place(piece: Piece, x: number, y: number): Cube[] {
    const base = this.restingBase(piece, x, y)
    const placed = piece.cells.map((p) => ({ x: x + p.dx, y: y + p.dy, z: base + p.dz, c: p.c }))
    for (const c of placed) this.add(c)
    return placed
  }

  /**
   * Tap to turn: the pivot's whole group turns a quarter turn clockwise
   * (seen from above) about the pivot's column, and rests on whatever is
   * beneath its new footprint. Returns each cube with where it came from.
   */
  turn(pivot: Cube): Array<{ cube: Cube; from: { x: number; y: number; z: number } }> {
    const group = this.group(pivot)
    const minZ = Math.min(...group.map((c) => c.z))
    const { x, y } = pivot
    const piece = this.pickUp(group, pivot)
    // Screen y points toward the viewer, so clockwise takes right to front: (dx, dy) → (−dy, dx).
    const placed = this.place({ cells: piece.cells.map((p) => ({ dx: -p.dy, dy: p.dx, dz: p.dz, c: p.c })) }, x, y)
    return placed.map((cube, i) => {
      const p = piece.cells[i]
      return { cube, from: { x: x + p.dx, y: y + p.dy, z: minZ + p.dz } }
    })
  }

  /**
   * Drop anything left hanging in the air (a cube that sat only on a torn-off
   * one) until it rests on something. Groups touching the table, or touching
   * anything at all, are held by their magnets. Returns each moved cube with
   * how far it fell.
   */
  settle(): Array<{ cube: Cube; fell: number }> {
    const fallen = new Map<Cube, number>()
    for (let changed = true; changed; ) {
      changed = false
      const seen = new Set<Cube>()
      for (const c of this.cubes.values()) {
        if (seen.has(c)) continue
        const g = this.group(c)
        for (const m of g) seen.add(m)
        if (g.some((m) => m.z === 0)) continue
        const mine = new Set(g)
        let drop = Infinity
        for (const m of g) {
          let below = -1
          for (let z = m.z - 1; z >= 0; z--) {
            const b = this.at(m.x, m.y, z)
            if (b && !mine.has(b)) {
              below = z
              break
            }
          }
          drop = Math.min(drop, m.z - below - 1)
        }
        if (drop > 0 && drop < Infinity) {
          for (const m of g) this.remove(m)
          for (const m of g) {
            m.z -= drop
            this.add(m)
            fallen.set(m, (fallen.get(m) ?? 0) + drop)
          }
          changed = true
          break // groups may have merged: look again
        }
      }
    }
    return [...fallen].map(([cube, fell]) => ({ cube, fell }))
  }

  toJSON(): number[][] {
    return this.all().map((c) => [c.x, c.y, c.z, c.c])
  }

  static fromJSON(raw: unknown): World {
    const w = new World()
    if (Array.isArray(raw)) {
      for (const r of raw) {
        if (Array.isArray(r) && r.length === 4 && r.every(Number.isInteger) && r[2] >= 0 && r[3] >= 1 && r[3] <= 10) {
          w.add({ x: r[0], y: r[1], z: r[2], c: r[3] })
        }
      }
    }
    w.settle() // a hand-edited or partial save never leaves cubes floating
    return w
  }
}

/**
 * Where a held piece lands, from where it is drawn. The view looks down from
 * slightly in front and to the right, so a cube at height z is drawn
 * `layer` × z higher and `shear` × z further left: the same screen spot
 * could be a cube on the table or one on top of a stack further back. The
 * piece lands on the highest surface that matches what the finger shows —
 * the one you see.
 *
 * (gx, gy): the grabbed cube's top-face corner in world units as drawn
 * (the height shift already applied).
 */
export function landing(
  world: World,
  piece: Piece,
  gx: number,
  gy: number,
  layer: number,
  shear: number,
): { x: number; y: number; base: number } {
  const anchorDz = piece.cells.find((p) => p.dx === 0 && p.dy === 0)?.dz ?? 0
  const at = (base: number) => ({
    x: Math.round(gx + (base + anchorDz + 1) * shear),
    y: Math.round(gy + (base + anchorDz + 1) * layer),
  })
  for (let base = world.maxTop() + 1; base >= 0; base--) {
    const { x, y } = at(base)
    if (world.restingBase(piece, x, y) === base) return { x, y, base }
  }
  const { x, y } = at(0)
  return { x, y, base: world.restingBase(piece, x, y) }
}
