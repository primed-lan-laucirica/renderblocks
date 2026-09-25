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
}

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

const shapeCache = new Map<number, BlockShape>()

export function blockShape(value: number): BlockShape {
  let shape = shapeCache.get(value)
  if (!shape) {
    shape = buildShape(value)
    shapeCache.set(value, shape)
  }
  return shape
}

function buildShape(value: number): BlockShape {
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
    }
  }

  if (abs < 1000) {
    // Blocks-game layout on a unit grid (y down), flipped to y up.
    const pos = getCubePositions(abs, 1, 0)
    const cells = pos.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
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
    }
  }

  // 1,000 and up (option a): an equal-area square drawn as a 10×10 grid of
  // hundred-squares in the leading digit's colour — 7 keeps its rainbow
  // columns and 9 its grey gradient, as in the Blocks game.
  const s = bigSide(abs)
  const lead = Math.floor(abs / 10 ** Math.floor(Math.log10(abs)))
  const c = s / 10
  const cubes: Cube[] = []
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const fill =
        lead === 7
          ? getNumberBlockColor(Math.min(7, Math.floor((col * 7) / 10) + 1))
          : lead === 9
            ? NINE_GRAY_COLORS[Math.min(8, Math.floor(((9 - row) * 3) / 10) * 3)]
            : lead === 1
              ? PALE_COLORS[1]
              : getNumberBlockColor(lead)
      cubes.push({
        cx: (col + 0.5) * c - s / 2,
        cy: (row + 0.5) * c - s / 2,
        w: c,
        h: c,
        fill: tint(fill),
        outline: lead === 1 ? tint(getNumberBlockColor(1)) : null,
      })
    }
  }
  return {
    value,
    w: s,
    h: s,
    rects: [{ cx: 0, cy: 0, w: s, h: s }],
    cubes,
    cubeSize: c,
    body: tint(lead === 1 ? '#f1f5f9' : getNumberBlockColor(lead)),
    kind: 'grid',
    L: s,
  }
}
