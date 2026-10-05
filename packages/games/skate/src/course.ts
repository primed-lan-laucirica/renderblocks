/**
 * The skate town: a side-on course, built piece by piece to the right as
 * Fourteen travels, from a seed. Its ground is one profile (a height for
 * every x), made of straight segments; a jump in height between two
 * segments is a wall. Rails float above it. Units are Fourteen's blocks
 * (he's 2 wide, 7 tall); y is up; the street is y = 0.
 */

/** What a stretch of ground is made of (how it's drawn); `ride` says whether he can skate it. */
export type Material = 'street' | 'wood' | 'stone' | 'stairs' | 'pipe' | 'blocks'

export interface Seg {
  x0: number
  y0: number
  x1: number
  y1: number
  ride: boolean
  mat: Material
  /** A parkour block's number (its height in blocks). */
  n?: number
}

export interface Rail {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** A concrete pipe lying in the street (drawn as a pipe; its top is part of the profile). */
export interface Pipe {
  cx: number
  r: number
}

/** The start: a deck high up with a drop-in down to the street, and a wall behind. */
export const START = { x: -16, y: 12 }
export const BACK_WALL = -34

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type PieceKind = 'kicker' | 'funbox' | 'quarter' | 'halfpipe' | 'stairs' | 'rail' | 'pipe' | 'blocks'
const KINDS: PieceKind[] = ['kicker', 'funbox', 'quarter', 'halfpipe', 'stairs', 'rail', 'pipe', 'blocks']
/** The first few, easy to hard, then any. */
const OPENING: PieceKind[] = ['kicker', 'funbox', 'blocks', 'halfpipe', 'rail', 'quarter', 'stairs', 'pipe']

export class Course {
  segs: Seg[] = []
  rails: Rail[] = []
  pipes: Pipe[] = []
  /** Where each piece starts (for tests and for showing what's coming). */
  pieces: { kind: PieceKind; x: number }[] = []
  private x = 0
  private y = 0
  private count = 0
  private readonly r: () => number

  constructor(seed = 14) {
    this.r = rng(seed)
    // The wall behind the start, the start deck, and the drop-in (a quarter circle down to the street).
    this.x = BACK_WALL - 6
    this.y = 40
    this.line(BACK_WALL, 40, false, 'stone')
    this.y = START.y
    this.line(START.x, START.y, true, 'wood')
    const R = START.y
    this.arc(START.x + R, R, R, Math.PI * 1.03, Math.PI * 1.5, true, 'wood')
    this.line(this.x + 14, 0, true, 'street')
    this.ensure(200)
  }

  /** The far end built so far. */
  get end() {
    return this.x
  }

  /** Build out to `x` (and drop what's long behind `behind`). */
  ensure(x: number, behind = -Infinity): void {
    while (this.x < x) this.piece()
    if (this.segs.length > 3000) {
      const keep = this.segs.findIndex((s) => s.x1 > behind - 150)
      if (keep > 500) {
        this.segs.splice(0, keep)
        this.rails = this.rails.filter((r) => r.x1 > behind - 150)
        this.pipes = this.pipes.filter((p) => p.cx > behind - 150)
      }
    }
  }

  /** The index of the segment under x (the one whose span holds it; at a wall, the one after). */
  indexAt(x: number): number {
    const s = this.segs
    let lo = 0
    let hi = s.length - 1
    if (x <= s[0].x0) return 0
    if (x >= s[hi].x1) return hi
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (s[mid].x0 <= x) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  segAt(x: number): Seg {
    return this.segs[this.indexAt(x)]
  }

  heightAt(x: number): number {
    const g = this.segAt(x)
    const t = (x - g.x0) / (g.x1 - g.x0)
    return g.y0 + (g.y1 - g.y0) * Math.max(0, Math.min(1, t))
  }

  /** The highest ground anywhere from x0 to x1. */
  highest(x0: number, x1: number): number {
    const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0]
    let top = Math.max(this.heightAt(a), this.heightAt(b))
    for (let i = this.indexAt(a); i < this.segs.length && this.segs[i].x0 < b; i++) {
      const s = this.segs[i]
      if (s.x0 >= a) top = Math.max(top, s.y0)
      if (s.x1 <= b) top = Math.max(top, s.y1)
    }
    return top
  }

  // ——— building ———

  private line(x1: number, y1: number, ride: boolean, mat: Material, n?: number) {
    if (x1 - this.x > 1e-6) this.segs.push({ x0: this.x, y0: this.y, x1, y1, ride, mat, n })
    this.x = x1
    this.y = y1
  }

  /** A wall (straight up or down) to height y. */
  private wall(y: number) {
    this.y = y
  }

  /** Along a circle (centre cx, cy, radius r) from angle a0 to a1, in short straight pieces. */
  private arc(cx: number, cy: number, r: number, a0: number, a1: number, ride: boolean, mat: Material) {
    const n = Math.max(4, Math.ceil((Math.abs(a1 - a0) * r) / 0.35))
    for (let i = 1; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      this.line(cx + r * Math.cos(a), cy + r * Math.sin(a), ride, mat)
    }
  }

  private flat(w: number) {
    this.line(this.x + w, 0, true, 'street')
  }

  private piece() {
    const r = this.r
    const kind = this.count < OPENING.length ? OPENING[this.count] : KINDS[Math.floor(r() * KINDS.length)]
    this.count++
    this.flat(8 + r() * 8)
    this.pieces.push({ kind, x: this.x })
    switch (kind) {
      case 'kicker': {
        // A curved launch ramp, then straight down at the back.
        const h = 2 + r() * 1.5
        const w = 4 + r() * 2
        const x0 = this.x
        for (let i = 1; i <= 8; i++) this.line(x0 + (w * i) / 8, h * (i / 8) ** 1.7, true, 'wood')
        this.wall(0)
        this.flat(10)
        break
      }
      case 'funbox': {
        const h = 2.5 + r() * 1.5
        this.line(this.x + 5, h, true, 'wood')
        this.line(this.x + 6 + r() * 6, h, true, 'wood')
        this.line(this.x + 5, 0, true, 'wood')
        break
      }
      case 'quarter': {
        // Up a quarter pipe (steep at the top) onto its deck, then a ramp back down.
        const R = 6 + r() * 2
        const cx = this.x
        this.arc(cx, R, R, Math.PI * 1.5, Math.PI * 1.5 + (75 * Math.PI) / 180, true, 'wood')
        this.line(this.x + 7 + r() * 4, this.y, true, 'wood')
        this.line(this.x + 7, 0, true, 'wood')
        break
      }
      case 'halfpipe': {
        // Sunk into the street: down one wall, along the flat, up the other and out.
        const R = 7
        const F = 5
        const cl = this.x + R
        const lip = Math.asin(0.7 / R)
        this.line(cl - R * Math.cos(lip), -0.7, true, 'stone')
        this.arc(cl, 0, R, Math.PI + lip, Math.PI * 1.5, true, 'stone')
        this.line(cl + F, -R, true, 'stone')
        const cr = cl + F
        this.arc(cr, 0, R, Math.PI * 1.5, Math.PI * 2 - lip, true, 'stone')
        this.line(cr + R + 0.08, 0, true, 'stone')
        break
      }
      case 'stairs': {
        // Up a ramp to a landing, then a flight of stairs down, with a handrail to grind.
        const steps = 4 + Math.floor(r() * 3)
        const run = 1.4
        this.line(this.x + 7, steps, true, 'wood')
        this.line(this.x + 5, steps, true, 'stone')
        const top = { x: this.x, y: steps }
        for (let i = steps - 1; i >= 0; i--) {
          this.wall(i)
          this.line(this.x + run, i, false, 'stairs')
        }
        this.rails.push({ x0: top.x - 1, y0: top.y + 2.6, x1: this.x, y1: 2.6 })
        this.flat(6)
        break
      }
      case 'rail': {
        // A kicker up onto a long flat rail.
        const h = 2.5
        const x0 = this.x
        for (let i = 1; i <= 8; i++) this.line(x0 + (5 * i) / 8, h * (i / 8) ** 1.7, true, 'wood')
        this.wall(0)
        const len = 10 + r() * 6
        this.rails.push({ x0: this.x + 0.8, y0: 3.4, x1: this.x + 0.8 + len, y1: 3.4 })
        this.flat(len + 2)
        break
      }
      case 'pipe': {
        // A big concrete pipe lying across the street: a wall, round over the top, down again.
        const R = 2.5 + r() * 1
        const cx = this.x + R
        this.pipes.push({ cx, r: R })
        // Its outline: straight up at the sides, then over the top.
        this.flat(R * (1 - Math.cos(Math.PI / 6)))
        this.wall(R * 1.5)
        this.arc(cx, R, R, Math.PI * (5 / 6), Math.PI / 6, true, 'pipe')
        this.wall(0)
        this.flat(R * (1 - Math.cos(Math.PI / 6)))
        break
      }
      case 'blocks': {
        // Parkour blocks: stacks of 2 to 9, three wide, with gaps to jump.
        const n = 3 + Math.floor(r() * 3)
        let prev = 0
        let touching = false
        for (let i = 0; i < n; i++) {
          let h = 2 + Math.floor(r() * 8)
          // Stacks side by side are never the same height (they'd look like one wide one).
          if (touching && h === prev) h = h === 9 ? 8 : h + 1
          this.wall(h)
          this.line(this.x + 3 + Math.floor(r() * 2), h, true, 'blocks', h)
          this.wall(0)
          prev = h
          touching = r() < 0.35
          if (i < n - 1 && !touching) this.flat(1.5 + r() * 3)
        }
        break
      }
    }
  }
}
