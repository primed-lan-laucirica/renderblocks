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
  /** Local x of the eyes: centred, except a staircase looks out from its tallest step. */
  eyeX: number
}

/**
 * How a block arranges its cubes: the Blocks-game layout, or — in the
 * Square Club and Step Squad battles — a square (16 = 4×4) or a staircase
 * rising to the right (10 = 1+2+3+4), as those clubs look in Numberblocks.
 */
export type ShapeStyle = 'blocks' | 'square' | 'steps'

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
  return getCubePositions(abs, 1, 0).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
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
    }
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
      eyeX: style === 'steps' ? w / 2 - k / 2 : 0,
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
  }
}
