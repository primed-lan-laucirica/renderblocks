/**
 * Drawing a designed Numberblock on a 2D canvas, in cell units (one block
 * is 1 × 1, y up). Small characters are drawn block by block; big ones as
 * bands of colour (one per place), with a grid that fades as the blocks get
 * too small to see. The face, arms, legs and hat scale with the character,
 * so even a trillion-block square has a face you can see.
 */
import { bandColour, bands, cellOf, slots, type Band, type Shape } from './shapes'
import type { Look } from './look'

/** Characters with at most this many blocks are drawn block by block. */
export const PER_BLOCK = 2500

export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** The body's size in cells (plain numbers, approximate for huge ones). */
export function bodySize(s: Shape): { w: number; h: number } {
  return { w: Number(s.cols), h: s.kind === 'steps' ? Number(s.cols) : Number(s.rows) }
}

/** How big the face and limbs are: a block, or a fifth of a big character. */
export function featureUnit(s: Shape): number {
  const { w, h } = bodySize(s)
  return Math.max(1, 0.22 * Math.min(w, Math.max(1, h)))
}

/** Everything the camera should show: the body, its leftovers, arms, legs and hat. */
export function bounds(s: Shape): Bounds {
  const { w, h } = bodySize(s)
  const u = featureUnit(s)
  const side = s.left > 0n && s.left <= 50n ? 1 : 0
  return { x0: -side - 1.3 * u, x1: w + side + 1.3 * u, y0: -1.1 * u, y1: h + (s.left ? 1 : 0) + 1.4 * u }
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, edge: string | null, px: number) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, 1, 1)
  if (px < 3) return
  ctx.lineWidth = Math.min(0.12, 2 / px)
  ctx.strokeStyle = edge ?? 'rgba(0,0,0,0.25)'
  ctx.strokeRect(x + 0.05, y + 0.05, 0.9, 0.9)
}

/** Index ranges of one band, split into its rainbow parts for a 7. */
function bandParts(b: Band): { start: bigint; count: bigint; fill: string; edge: string | null }[] {
  if (b.digit !== 7 || b.place === 0) {
    const c = bandColour(b, 0)
    return [{ start: b.start, count: b.count, ...c }]
  }
  const unit = 10n ** BigInt(b.place)
  return Array.from({ length: 7 }, (_, u) => ({ start: b.start + BigInt(u) * unit, count: unit, ...bandColour(b, u) }))
}

/** A run of blocks [start, start + count) laid row by row `cols` wide: up to three rectangles. */
function runRects(start: bigint, count: bigint, cols: bigint): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = []
  let s = start
  let left = count
  const c = Number(cols)
  // A partial first row.
  if (s % cols !== 0n && left > 0n) {
    const col = s % cols
    const take = left < cols - col ? left : cols - col
    out.push({ x: Number(col), y: Number(s / cols), w: Number(take), h: 1 })
    s += take
    left -= take
  }
  // Whole rows.
  const rows = left / cols
  if (rows > 0n) {
    out.push({ x: 0, y: Number(s / cols), w: c, h: Number(rows) })
    s += rows * cols
    left -= rows * cols
  }
  // A partial last row.
  if (left > 0n) out.push({ x: 0, y: Number(s / cols), w: Number(left), h: 1 })
  return out
}

/** The body: every block in its Numberblock colour. `leftovers` are the slots the leftover blocks sit in. */
export function drawBody(ctx: CanvasRenderingContext2D, n: bigint, s: Shape, leftovers: number[], px: number, held?: { index: number; x: number; y: number }) {
  const bs = bands(n)
  const total = n
  const draggableLeft = leftovers.length > 0
  const mainCount = draggableLeft ? total - s.left : total
  if (total <= BigInt(PER_BLOCK) || s.kind === 'steps') {
    // Block by block (steps are always few enough columns to draw this way).
    const count = Number(total)
    const slotCells = slots(s)
    for (let i = 0; i < count; i++) {
      const bi = BigInt(i)
      const b = bs.find((x) => bi < x.start + x.count) ?? bs[bs.length - 1]
      const j = bi - b.start
      const { fill, edge } = bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j))
      if (i >= Number(mainCount)) {
        const k = i - Number(mainCount)
        if (held && held.index === k) continue
        const cell = slotCells[leftovers[k]]
        if (cell) block(ctx, cell.col, cell.row, fill, edge, px)
        continue
      }
      if (s.kind === 'steps' && count > PER_BLOCK) {
        // Big step squads: draw each column as one strip below.
        continue
      }
      const c = cellOf(s, i)
      block(ctx, c.col, c.row, fill, edge, px)
    }
    if (s.kind === 'steps' && count > PER_BLOCK) {
      for (let c = 0; c < Number(s.cols); c++) {
        ctx.fillStyle = bandColour(bs[0], 0).fill
        ctx.fillRect(c, 0, 1, c + 1)
      }
    }
  } else {
    // Bands of colour, then a grid while the blocks are big enough to see.
    for (const b of bs)
      for (const part of bandParts(b)) {
        const end = part.start + part.count < mainCount ? part.start + part.count : mainCount
        if (end <= part.start) continue
        ctx.fillStyle = part.fill
        for (const r of runRects(part.start, end - part.start, s.cols)) ctx.fillRect(r.x, r.y, r.w, r.h)
      }
    if (px >= 4) {
      const { w, h } = bodySize(s)
      ctx.lineWidth = 1.2 / px
      ctx.strokeStyle = `rgba(0,0,0,${Math.min(0.25, (px - 4) / 40)})`
      ctx.beginPath()
      for (let x = 1; x < w; x++) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let y = 1; y < h; y++) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
    }
    // Leftovers that can't each be dragged sit as a partial top row (drawn above with the bands);
    // ones that can, at their slots.
    if (draggableLeft) {
      const slotCells = slots(s)
      for (let k = 0; k < leftovers.length; k++) {
        if (held && held.index === k) continue
        const i = mainCount + BigInt(k)
        const b = bs.find((x) => i < x.start + x.count) ?? bs[bs.length - 1]
        const j = i - b.start
        const { fill, edge } = bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j))
        const cell = slotCells[leftovers[k]]
        if (cell) block(ctx, cell.col, cell.row, fill, edge, px)
      }
    }
  }
  // The leftover being dragged, under the finger.
  if (held) {
    const i = mainCount + BigInt(held.index)
    const b = bs.find((x) => i < x.start + x.count) ?? bs[bs.length - 1]
    const j = i - b.start
    const { fill, edge } = bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j))
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 12
    block(ctx, held.x - 0.5, held.y - 0.5, fill, edge, px)
    ctx.restore()
  }
}

// --- Face, limbs and hat, Numberblocks style ---------------------------------------------------------
// Flat colours with soft shading, no harsh outlines except the eyes' (as in
// the Blocks app): tall white eyes with big pupils, a lopsided smile, stubby
// limbs in a darker shade of the block they come from, round mitten hands.

const INK = '#1A1A2E'

/** A darker (k < 1) or lighter (k > 1) shade of a colour. */
function shade(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const v = parseInt(m[1], 16)
  const ch = (x: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? x + (255 - x) * (k - 1) : x * k)))
  const r = ch((v >> 16) & 255)
  const g = ch((v >> 8) & 255)
  const b = ch(v & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function line(ctx: CanvasRenderingContext2D, w: number, colour: string) {
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colour
  ctx.stroke()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.5 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
}

/** One eye: a tall white oval, black outline, big pupil and a shine. `skin` is the block colour (for sleepy lids). */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: Look['eyes'], left: boolean, skin: string) {
  const outline = r * 0.13
  if (style === 'wink' && !left) {
    ctx.beginPath()
    ctx.arc(x, y - r * 0.2, r * 0.75, Math.PI * 0.15, Math.PI * 0.85)
    line(ctx, outline * 1.4, INK)
    return
  }
  const rx = style === 'round' ? r * 0.9 : r * 0.7
  const ry = style === 'round' ? r * 0.9 : r
  ctx.beginPath()
  if (style === 'star' && !left) star(ctx, x, y, r * 1.15)
  else ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  line(ctx, outline, INK)
  // Pupil, looking slightly up and in, with a shine.
  const px = x + (left ? 0.12 : -0.12) * r
  const py = y - 0.05 * r
  ctx.beginPath()
  ctx.arc(px, py, r * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()
  ctx.beginPath()
  ctx.arc(px + r * 0.14, py + r * 0.16, r * 0.13, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  if (style === 'sleepy') {
    // A heavy lid in the block's own colour over the top half.
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(x, y, rx + outline, ry + outline, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = shade(skin, 0.85)
    ctx.fillRect(x - rx * 1.5, y - ry * 0.05, rx * 3, ry * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.moveTo(x - rx, y - ry * 0.05)
    ctx.lineTo(x + rx, y - ry * 0.05)
    line(ctx, outline, INK)
  }
  if (style === 'glasses') {
    ctx.beginPath()
    ctx.arc(x, y, r * 1.35, 0, Math.PI * 2)
    line(ctx, r * 0.22, '#334155')
  }
}

function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, style: Look['mouth']) {
  const w = 0.3 * u
  const lw = 0.055 * u
  ctx.beginPath()
  if (style === 'o') {
    ctx.ellipse(x, y, w * 0.32, w * 0.4, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#5B1A1A'
    ctx.fill()
    return
  }
  if (style === 'flat') {
    ctx.moveTo(x - w * 0.45, y)
    ctx.quadraticCurveTo(x, y - w * 0.12, x + w * 0.45, y + w * 0.05)
    line(ctx, lw, INK)
    return
  }
  if (style === 'grin' || style === 'tongue') {
    // An open smile: dark inside, a pink tongue.
    ctx.moveTo(x - w, y + w * 0.25)
    ctx.quadraticCurveTo(x - w * 0.1, y + w * 0.05, x + w * 0.9, y + w * 0.3)
    ctx.quadraticCurveTo(x + w * 0.2, y - w * 1.15, x - w, y + w * 0.25)
    ctx.closePath()
    ctx.fillStyle = '#5B1A1A'
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    ctx.ellipse(x + w * 0.05, y - w * 0.55, w * 0.45, w * 0.32, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#F472B6'
    ctx.fill()
    ctx.restore()
    if (style === 'tongue') {
      ctx.beginPath()
      ctx.ellipse(x + w * 0.15, y - w * 0.7, w * 0.3, w * 0.42, 0.2, 0, Math.PI * 2)
      ctx.fillStyle = '#F472B6'
      ctx.fill()
    }
    return
  }
  // The lopsided Numberblocks smile.
  ctx.moveTo(x - w * 0.85, y + w * 0.2)
  ctx.quadraticCurveTo(x - w * 0.05, y - w * 0.75, x + w * 0.8, y + w * 0.05)
  line(ctx, lw, INK)
}

function hat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, style: Look['hat']) {
  const w = 0.75 * u
  ctx.beginPath()
  if (style === 'helmet') {
    ctx.arc(x, y, w, 0, Math.PI)
    ctx.fillStyle = '#15803D'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, w * 0.68, 0.25, Math.PI - 0.25)
    line(ctx, w * 0.14, '#4ADE80')
    ctx.fillStyle = shade('#15803D', 0.8)
    ctx.fillRect(x - w * 1.05, y - w * 0.04, w * 2.1, w * 0.12)
  } else if (style === 'crown') {
    ctx.moveTo(x - w * 0.85, y)
    ctx.lineTo(x - w * 0.95, y + w * 0.75)
    ctx.lineTo(x - w * 0.45, y + w * 0.4)
    ctx.lineTo(x, y + w * 0.95)
    ctx.lineTo(x + w * 0.45, y + w * 0.4)
    ctx.lineTo(x + w * 0.95, y + w * 0.75)
    ctx.lineTo(x + w * 0.85, y)
    ctx.closePath()
    ctx.fillStyle = '#FACC15'
    ctx.fill()
    ctx.fillStyle = '#EAB308'
    ctx.fillRect(x - w * 0.85, y, w * 1.7, w * 0.18)
    for (const [gx, c] of [[-0.45, '#EF4444'], [0, '#3B82F6'], [0.45, '#22C55E']] as const) {
      ctx.beginPath()
      ctx.arc(x + gx * w, y + w * 0.09, w * 0.08, 0, Math.PI * 2)
      ctx.fillStyle = c
      ctx.fill()
    }
  } else if (style === 'bow') {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x, y + w * 0.3)
      ctx.quadraticCurveTo(x + side * w * 0.9, y + w * 1.0, x + side * w * 0.85, y + w * 0.3)
      ctx.quadraticCurveTo(x + side * w * 0.9, y - w * 0.25, x, y + w * 0.3)
      ctx.fillStyle = '#EC4899'
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(x, y + w * 0.3, w * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = '#BE185D'
    ctx.fill()
  } else if (style === 'cap') {
    ctx.arc(x, y, w * 0.85, 0, Math.PI)
    ctx.fillStyle = '#2563EB'
    ctx.fill()
    ctx.fillStyle = '#1D4ED8'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.85, y + w * 0.04, w * 0.65, w * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y + w * 0.85, w * 0.1, 0, Math.PI * 2)
    ctx.fill()
  } else if (style === 'party') {
    ctx.moveTo(x - w * 0.6, y)
    ctx.lineTo(x, y + w * 1.6)
    ctx.lineTo(x + w * 0.6, y)
    ctx.closePath()
    ctx.fillStyle = '#A855F7'
    ctx.fill()
    ctx.save()
    ctx.clip()
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#FACC15' : '#22D3EE'
      ctx.fillRect(x - w, y + w * (0.25 + i * 0.38), w * 2, w * 0.14)
    }
    ctx.restore()
    ctx.beginPath()
    ctx.arc(x, y + w * 1.65, w * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = '#F472B6'
    ctx.fill()
  }
}

/** The colour of the block in a main-body cell (for limbs and lids). */
function colourAt(n: bigint, s: Shape, col: number, row: number, bs: Band[]): string {
  let i: bigint
  if (s.kind === 'steps') i = BigInt((col * (col + 1)) / 2 + Math.min(row, col))
  else i = BigInt(row) * s.cols + BigInt(Math.max(0, Math.min(Number(s.cols) - 1, col)))
  if (i >= n) i = n - 1n
  const b = bs.find((x) => i < x.start + x.count) ?? bs[bs.length - 1]
  const j = i - b.start
  return bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j)).fill
}

/** Face on the top row, arms on the sides, legs underneath, hat on top. `wave` (0–1) lifts the arms for a jump. */
export function drawFeatures(ctx: CanvasRenderingContext2D, n: bigint, s: Shape, leftovers: number[], look: Look, wave = 0) {
  const { w, h } = bodySize(s)
  const u = featureUnit(s)
  const bs = bands(n)
  const slotCells = slots(s)
  const occupied = leftovers.map((i) => slotCells[i]).filter(Boolean)
  const leftSide = occupied.some((c) => c.col < 0) ? 1 : 0
  const rightSide = occupied.some((c) => c.col >= w) ? 1 : 0
  // Steps: the face sits on the tallest column; otherwise the middle of the top row.
  // The face goes on the highest blocks: leftovers on top if there are any, else the top row (steps: the tallest column).
  const onTop = occupied.filter((c) => c.row >= h)
  const topCols = onTop.map((c) => c.col)
  const faceOnTop = topCols.length > 0
  const fx = faceOnTop ? (Math.min(...topCols) + Math.max(...topCols) + 1) / 2 : s.kind === 'steps' ? w - 0.5 : w / 2
  const faceW = faceOnTop ? Math.max(...topCols) - Math.min(...topCols) + 1 : s.kind === 'steps' ? 1 : w
  // Faces fill most of their blocks, as in the show: bigger on bigger characters, never wider than the blocks they sit on.
  const fu = Math.min(Math.max(1, 0.3 * Math.min(w, Math.max(1, h))), Math.max(1, 0.9 * faceW))
  const faceRowTop = faceOnTop ? h + 1 : h
  const fy = faceRowTop - Math.min(0.5, fu * 0.45) - (fu > 1 ? fu * 0.15 : 0)
  // Limbs in the units colour (Fourteen's are green, Ten's red), as numbers over ten have them in the show.
  const last = bs[bs.length - 1]
  const unitsColour = (() => {
    const c = bandColour(last, last.digit === 7 ? 6 : 0, Number(last.count) - 1)
    return last.place === 0 ? c.fill : (c.edge ?? c.fill)
  })()
  const topRow = Math.max(0, Math.floor(h) - 1)
  const skin = faceOnTop ? unitsColour : colourAt(n, s, Math.floor(fx), topRow, bs)
  // Arms: stubby, a darker shade of the block they come from, round mitten hands.
  if (look.arms !== 'none') {
    const ay = Math.max(u * 0.5, h * 0.6)
    const len = (look.arms === 'long' ? 1.15 : 0.7) * u
    for (const side of [-1, 1]) {
      const colour = shade(unitsColour, 0.8)
      const x0 = side < 0 ? -leftSide : (s.kind === 'steps' ? w : w + rightSide)
      const y0 = s.kind === 'steps' && side < 0 ? Math.min(ay, 0.6) : ay
      const lift = look.arms === 'up' ? 1.05 : look.arms === 'wave' && side > 0 ? 0.95 : 0.3
      const a = lift + wave * 0.7
      const hx = x0 + side * len * Math.cos(a)
      const hy = y0 + len * Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(hx, hy)
      line(ctx, 0.17 * u, colour)
      ctx.beginPath()
      ctx.arc(hx, hy, 0.17 * u, 0, Math.PI * 2)
      ctx.fillStyle = colour
      ctx.fill()
    }
  }
  // Legs: short stubs with rounded feet, in the bottom blocks' darker shade.
  if (look.legs !== 'none') {
    const len = (look.legs === 'long' ? 0.85 : 0.45) * u
    const spots = w <= 1 ? [0.3, 0.7] : [w * 0.3, w * 0.7]
    for (const x of spots) {
      const colour = shade(unitsColour, 0.75)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, -len)
      line(ctx, 0.2 * u, colour)
      ctx.beginPath()
      ctx.ellipse(x + 0.06 * u, -len - 0.02 * u, 0.2 * u, 0.12 * u, 0, 0, Math.PI * 2)
      ctx.fillStyle = shade(colour, 0.85)
      ctx.fill()
    }
  }
  // Face: one eye or two, sized to the character.
  const r = 0.21 * fu
  if (look.eyes === 'one') eye(ctx, fx, fy + r * 0.3, r * 1.2, 'oval', true, skin)
  else {
    eye(ctx, fx - r * 1.3, fy + r * 0.3, r, look.eyes, true, skin)
    eye(ctx, fx + r * 1.3, fy + r * 0.3, r, look.eyes, false, skin)
  }
  mouth(ctx, fx, fy - r * 1.45, fu, look.mouth)
  // Hat on whatever is highest above the face.
  if (look.hat !== 'none') {
    const above = !faceOnTop && occupied.some((c) => c.row >= h && Math.abs(c.col + 0.5 - fx) < 0.6) ? 1 : 0
    hat(ctx, fx, faceRowTop + above, Math.max(u, fu), look.hat)
  }
}

/** Where every block sits (main blocks, then leftovers in their slots), for small characters; null for big ones. */
export function blockCells(n: bigint, s: Shape, leftovers: number[]): { x: number; y: number }[] | null {
  if (n > BigInt(PER_BLOCK)) return null
  const count = Number(n)
  const main = count - leftovers.length
  const slotCells = slots(s)
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    if (i < main) {
      const c = cellOf(s, i)
      out.push({ x: c.col, y: c.row })
    } else {
      const c = slotCells[leftovers[i - main]] ?? cellOf(s, i)
      out.push({ x: c.col, y: c.row })
    }
  }
  return out
}

/** Small characters, block by block at given positions (for the slide between shapes). */
export function drawBlocksAt(ctx: CanvasRenderingContext2D, n: bigint, cells: { x: number; y: number }[], px: number, skip = -1) {
  const bs = bands(n)
  cells.forEach((c, i) => {
    if (i === skip) return
    const bi = BigInt(i)
    const b = bs.find((x) => bi < x.start + x.count) ?? bs[bs.length - 1]
    const j = bi - b.start
    const { fill, edge } = bandColour(b, Number(j / 10n ** BigInt(b.place)), Number(j))
    block(ctx, c.x, c.y, fill, edge, px)
  })
}
