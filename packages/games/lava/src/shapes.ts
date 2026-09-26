import {
  getCubePositions,
  getCubeColor,
  getCubeOutlineColor,
  getNumberBlockColor,
  PALE_COLORS,
  NINE_GRAY_COLORS,
} from '@renderblocks/blocks/cubeLayout'

/** Axis-aligned rectangle in block-local units: centre (cx, cy), y up, origin at the block's centre. */
export interface Rect {
  cx: number
  cy: number
  w: number
  h: number
}

/** One drawn cube (or, for huge blocks, one hundred-square cell). */
export interface Cube extends Rect {
  fill: string
  outline: string | null
}

export interface BlockShape {
  value: number
  /** Bounding box, in world units. */
  w: number
  h: number
  /** Collider: a compound of rectangles that together cover the cubes exactly. */
  rects: Rect[]
  cubes: Cube[]
  /** Side of one drawn cube — decides whether cube detail is visible at a zoom. */
  cubeSize: number
  /** Solid colour used when the cubes are too small to draw individually. */
  body: string
  kind: 'cubes' | 'grid' | 'zero'
  /** Characteristic size √(w·h): the yardstick for size-relative fling and drag limits. */
  L: number
  /** Where the eyes sit: over the highest cubes (a staircase's tallest step, a 128's tall column). */
  eyeX: number
  /** Local y of the top of those cubes. */
  eyeTop: number
  /**
   * Where a notation (7², T₄ …) goes: centre and the box it must fit in, in
   * local units. The block's centre — for a staircase, the centre of the
   * steps themselves, since its bounding-box centre sits on the stepped edge.
   */
  mark: { x: number; y: number; w: number; h: number }
  /**
   * Cube Club: the outline (a convex hexagon — front, top and side) used as
   * the collider and silhouette instead of `rects`, and the three faces to draw.
   */
  hull?: Array<{ x: number; y: number }>
  faces?: CubeFace[]
}

/** One face of a drawn cube: a parallelogram (corner + two edges) split into cells × cells. */
export interface CubeFace {
  origin: { x: number; y: number }
  u: { x: number; y: number }
  v: { x: number; y: number }
  cells: number
  fill: string
}

/** A staircase's steps fill the lower-right triangle: mark its centroid, in the room there. */
const stairMark = (w: number, h: number) => ({ x: w / 6, y: -h / 6, w: w * 0.45, h: h * 0.28 })
const boxMark = (w: number, h: number) => ({ x: 0, y: 0, w: w * 0.8, h: h * 0.5 })

/**
 * How a block arranges its cubes: the Blocks-game layout, or — in the
 * Square Club and Step Squad battles — a square (16 = 4×4) or a staircase
 * rising to the right (10 = 1+2+3+4), as those clubs look in Numberblocks.
 */
export type ShapeStyle = 'blocks' | 'square' | 'steps' | 'cube'

/** Up to this magnitude a block is its true Blocks-game shape, one cube per unit. */
export const TRUE_SCALE_MAX = 100

/**
 * Side of the equal-area square for |n| > 100 (spec 14.1): continues from
 * 100's 10×10 and grows by 3 units per power of ten.
 */
export function bigSide(abs: number): number {
  return 10 + 3 * Math.log10(abs / 100)
}

function darken(hex: string, amount = 0.5): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * amount)
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

/** Depth drawn for a cube, as a share of its side (an oblique, 45° view). */
const DEPTH = 0.4

/**
 * A Cube Club block: drawn as a cube — an m × m front face with its top and
 * right side receding at 45° — so it reads as m × m × m, the way he knows
 * cubes from Numberblocks. Physics stays 2D; the collider is the outline.
 * Front side = m units up to 10³ (every cube drawn), then log-scaled like
 * the other big blocks, each face showing a 10 × 10 grid.
 */
function cubeShape(value: number, m: number): BlockShape {
  const side = m <= 10 ? m : 10 + 3 * Math.log10(m / 10)
  const cells = Math.min(m, 10)
  const d = side * DEPTH * Math.SQRT1_2
  const w = side + d
  const h = side + d
  const x0 = -w / 2
  const y0 = -h / 2
  const x1 = x0 + side
  const y1 = y0 + side
  const color = getNumberBlockColor(value < 10 ? value : value % 10 || Math.floor(value / 10 ** Math.floor(Math.log10(value))))
  const base = color.toUpperCase() === '#FFFFFF' ? '#f1f5f9' : color
  return {
    value,
    w,
    h,
    rects: [{ cx: x0 + side / 2, cy: y0 + side / 2, w: side, h: side }],
    hull: [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1 + d, y: y0 + d },
      { x: x1 + d, y: y1 + d },
      { x: x0 + d, y: y1 + d },
      { x: x0, y: y1 },
    ],
    faces: [
      { origin: { x: x0, y: y1 }, u: { x: side, y: 0 }, v: { x: d, y: d }, cells, fill: lighten(base, 0.35) }, // top
      { origin: { x: x1, y: y0 }, u: { x: d, y: d }, v: { x: 0, y: side }, cells, fill: darken(base, 0.3) }, // side
      { origin: { x: x0, y: y0 }, u: { x: side, y: 0 }, v: { x: 0, y: side }, cells, fill: base }, // front
    ],
    cubes: [],
    cubeSize: side / cells,
    body: base,
    // Real cubes (to 10³) get ordinary eyes; the log-scaled giants get the big-block ones.
    kind: m <= 10 ? 'cubes' : 'grid',
    L: Math.sqrt(w * h),
    eyeX: x0 + side / 2,
    eyeTop: y1,
    mark: { x: x0 + side / 2, y: y0 + side / 2, w: side * 0.8, h: side * 0.5 },
  }
}

/**
 * Cover a set of unit cells with few rectangles: one run per row, then
 * stack identical runs from consecutive rows.
 */
function coverCells(cells: Array<{ x: number; y: number }>): Array<{ x: number; y: number; w: number; h: number }> {
  const rows = new Map<number, number[]>()
  for (const c of cells) {
    const row = rows.get(c.y) ?? []
    row.push(c.x)
    rows.set(c.y, row)
  }
  const runs: Array<{ x: number; y: number; w: number; h: number }> = []
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y)!.sort((a, b) => a - b)
    let start = xs[0]
    for (let i = 1; i <= xs.length; i++) {
      if (i === xs.length || xs[i] !== xs[i - 1] + 1) {
        const w = xs[i - 1] - start + 1
        const above = runs.find((r) => r.x === start && r.w === w && r.y + r.h === y)
        if (above) above.h++
        else runs.push({ x: start, y, w, h: 1 })
        if (i < xs.length) start = xs[i]
      }
    }
  }
  return runs
}

const shapeCache = new Map<string, BlockShape>()

export function blockShape(value: number, style: ShapeStyle = 'blocks'): BlockShape {
  const key = `${style}:${value}`
  let shape = shapeCache.get(key)
  if (!shape) {
    shape = buildShape(value, style)
    shapeCache.set(key, shape)
  }
  return shape
}

/** Largest m with m(m+1)/2 ≤ n. */
function stepCount(n: number): number {
  let m = Math.floor((Math.sqrt(8 * n + 1) - 1) / 2)
  while ((m * (m + 1)) / 2 > n) m--
  return m
}

/**
 * Cube cells (unit grid, y down) in colouring order — bottom row first, left
 * to right, so the tens (pale) portion sits at the base as in the Blocks game.
 * Square and staircase styles only apply to members of those clubs.
 */
function arrangement(abs: number, style: ShapeStyle): Array<{ x: number; y: number }> {
  if (style === 'square') {
    const m = Math.round(Math.sqrt(abs))
    if (m * m === abs) return Array.from({ length: abs }, (_, i) => ({ x: i % m, y: m - 1 - Math.floor(i / m) }))
  }
  if (style === 'steps') {
    const m = stepCount(abs)
    if ((m * (m + 1)) / 2 === abs) {
      const cells: Array<{ x: number; y: number }> = []
      for (let row = 0; row < m; row++) for (let col = row; col < m; col++) cells.push({ x: col, y: m - 1 - row })
      return cells
    }
  }
  const cells = getCubePositions(abs, 1, 0).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  if (abs >= 100) {
    // The Blocks-game layout lines the leftover tens and units up with the
    // TOP of the hundred-squares (its comment says bottom). Floating in the
    // Blocks playground that's harmless; standing on a platform, a 128 would
    // rest on its 2-cube-wide 28 with the whole square overhanging, and tip.
    // Stand both parts on the same floor.
    const hundreds = Math.floor(abs / 100) * 100
    const floor = (from: number, to: number) => Math.max(...cells.slice(from, to).map((c) => c.y))
    if (cells.length > hundreds) {
      const dy = floor(0, hundreds) - floor(hundreds, cells.length)
      for (let i = hundreds; i < cells.length; i++) cells[i].y += dy
    }
    const top = Math.min(...cells.map((c) => c.y))
    for (const c of cells) c.y -= top
  }
  return cells
}

function buildShape(value: number, style: ShapeStyle): BlockShape {
  const abs = Math.abs(value)
  const tint = value < 0 ? (c: string) => darken(c.startsWith('#') ? c : '#808080') : (c: string) => c

  if (abs === 0) {
    return {
      value,
      w: 1,
      h: 1,
      rects: [{ cx: 0, cy: 0, w: 1, h: 1 }],
      cubes: [],
      cubeSize: 1,
      body: '#94a3b8',
      kind: 'zero',
      L: 1,
      eyeX: 0,
      eyeTop: 0.5,
      mark: boxMark(1, 1),
    }
  }

  if (style === 'cube') {
    const m = Math.round(Math.cbrt(abs))
    if (m ** 3 === abs) return cubeShape(abs, m)
  }

  if (abs < 1000) {
    // Cube layout on a unit grid (y down), flipped to y up.
    const cells = arrangement(abs, style)
    const maxX = Math.max(...cells.map((c) => c.x))
    const maxY = Math.max(...cells.map((c) => c.y))
    const gridW = maxX + 1
    const gridH = maxY + 1
    // True scale to 100; above it, the same layout scaled to the equal-area square.
    const k = abs <= TRUE_SCALE_MAX ? 1 : bigSide(abs) / Math.sqrt(abs)
    const toLocal = (x: number, y: number) => ({ cx: (x + 0.5 - gridW / 2) * k, cy: (maxY - y + 0.5 - gridH / 2) * k })
    const cubes: Cube[] = cells.map((c, i) => ({
      ...toLocal(c.x, c.y),
      w: k,
      h: k,
      fill: tint(getCubeColor(abs, i, cells.length)),
      outline: (() => {
        const o = getCubeOutlineColor(abs, i)
        return o ? tint(o) : null
      })(),
    }))
    const rects = coverCells(cells).map((r) => ({
      cx: (r.x + r.w / 2 - gridW / 2) * k,
      cy: (maxY - (r.y + r.h - 1) + r.h / 2 - gridH / 2) * k,
      w: r.w * k,
      h: r.h * k,
    }))
    const w = gridW * k
    const h = gridH * k
    const topY = Math.max(...cubes.map((c) => c.cy))
    const topRow = cubes.filter((c) => Math.abs(c.cy - topY) < 1e-9)
    return {
      value,
      w,
      h,
      rects,
      cubes,
      cubeSize: k,
      body: tint(getNumberBlockColor(abs % 10 || Math.floor(abs / 10 ** Math.floor(Math.log10(abs))))),
      kind: 'cubes',
      L: Math.sqrt(w * h),
      eyeX: topRow.reduce((sum, c) => sum + c.cx, 0) / topRow.length,
      eyeTop: topY + k / 2,
      mark: style === 'steps' ? stairMark(w, h) : boxMark(w, h),
    }
  }

  // 1,000 and up (option a): equal-area, drawn as a 10×10 grid of
  // hundred-squares in the leading digit's colour — 7 keeps its rainbow
  // columns and 9 its grey gradient, as in the Blocks game. Step Squad
  // members keep their staircase: 10 steps of the same cells.
  const s = bigSide(abs)
  const lead = Math.floor(abs / 10 ** Math.floor(Math.log10(abs)))
  const steps = style === 'steps'
  const grid: Array<{ col: number; row: number }> = []
  for (let col = 0; col < 10; col++) for (let row = 0; row < (steps ? col + 1 : 10); row++) grid.push({ col, row })
  const c = s / Math.sqrt(grid.length)
  const side = 10 * c
  const cubes: Cube[] = []
  for (const { col, row } of grid) {
    const fill =
      lead === 7
        ? getNumberBlockColor(Math.min(7, Math.floor((col * 7) / 10) + 1))
        : lead === 9
          ? NINE_GRAY_COLORS[Math.min(8, Math.floor(((9 - row) * 3) / 10) * 3)]
          : lead === 1
            ? PALE_COLORS[1]
            : getNumberBlockColor(lead)
    cubes.push({
      cx: (col + 0.5) * c - side / 2,
      cy: (row + 0.5) * c - side / 2,
      w: c,
      h: c,
      fill: tint(fill),
      outline: lead === 1 ? tint(getNumberBlockColor(1)) : null,
    })
  }
  const rects = steps
    ? coverCells(grid.map(({ col, row }) => ({ x: col, y: 9 - row }))).map((r) => ({
        cx: (r.x + r.w / 2) * c - side / 2,
        cy: (9 - (r.y + r.h - 1) + r.h / 2) * c - side / 2,
        w: r.w * c,
        h: r.h * c,
      }))
    : [{ cx: 0, cy: 0, w: side, h: side }]
  return {
    value,
    w: side,
    h: side,
    rects,
    cubes,
    cubeSize: c,
    body: tint(lead === 1 ? '#f1f5f9' : getNumberBlockColor(lead)),
    kind: 'grid',
    L: s,
    eyeX: steps ? side / 2 - c / 2 : 0,
    eyeTop: side / 2,
    mark: steps ? stairMark(side, side) : boxMark(side, side),
  }
}
