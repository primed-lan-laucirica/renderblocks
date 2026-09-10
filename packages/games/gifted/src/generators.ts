import {
  COARSE_AXES,
  COLORS,
  FILLS,
  FINE_AXES,
  GEN_LABEL,
  SHAPES,
  cell,
  cloneCell,
  glyph,
  pick,
  pickNot,
  sameCell,
  shuffle,
  varyCell,
  type Axis,
  type Cell,
  type GenId,
  type Item,
} from './types'

export const MAX_LEVEL = 6

/**
 * Difficulty knobs shared by every generator. Levels ladder the same way the
 * spec describes: more choices, more simultaneous rules, and distractors that
 * close in from grossly-wrong to one-feature-off.
 */
function knobs(level: number) {
  return {
    choices: level <= 1 ? 3 : level <= 3 ? 4 : level <= 5 ? 5 : 6,
    /** How many attributes vary at once. */
    rules: level <= 2 ? 1 : level <= 4 ? 2 : 3,
    /** Prefer subtle axes (size/fill/rotation) as level climbs. */
    axisPool: level <= 2 ? COARSE_AXES : level <= 4 ? [...COARSE_AXES, ...FINE_AXES] : FINE_AXES,
    /** Distractors differ from the answer by exactly one feature. */
    nearMiss: level >= 3,
  }
}

/** Build distractors around a correct cell, avoiding duplicates. */
function distractors(correct: Cell, n: number, level: number): Cell[] {
  const k = knobs(level)
  const out: Cell[] = []
  let guard = 0
  while (out.length < n && guard++ < 200) {
    let d = cloneCell(correct)
    const axes = k.nearMiss ? 1 : 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < axes; i++) d = varyCell(d, pick(k.axisPool) as Axis)
    if (sameCell(d, correct)) continue
    if (out.some((o) => sameCell(o, d))) continue
    out.push(d)
  }
  // Guard against pathological cases where variation kept colliding.
  while (out.length < n) out.push(cell(glyph()))
  return out
}

function finish(
  gen: GenId,
  level: number,
  layout: Item['layout'],
  stimulus: Cell[],
  blankIndex: number,
  correct: Cell,
): Item {
  const k = knobs(level)
  const opts = shuffle([correct, ...distractors(correct, k.choices - 1, level)])
  return {
    gen,
    level,
    layout,
    stimulus,
    blankIndex,
    choices: opts,
    answer: opts.findIndex((c) => sameCell(c, correct)),
    label: GEN_LABEL[gen],
  }
}

/* ---------- 3.8 match to sample: the most accessible entry point ---------- */

function genSample(level: number): Item {
  const n = level <= 2 ? 1 : level <= 4 ? 2 : 3
  const target = cell(...Array.from({ length: n }, () => glyph({ fill: pick(FILLS) })))
  return finish('sample', level, 'sample', [target], -1, target)
}

/* ---------- 4.3 odd one out ---------- */

function genOdd(level: number): Item {
  const k = knobs(level)
  const count = k.choices
  const base = cell(glyph({ fill: pick(FILLS) }))
  const axis = pick(k.axisPool) as Axis
  const odd = varyCell(base, axis)
  // Siblings share the defining feature. At high levels they also carry
  // superficial rotation jitter — but never when rotation IS the odd feature,
  // and never such that a sibling collides with the odd one (which would
  // leave the puzzle without a unique answer).
  const jitter = level >= 5 && axis !== 'rotation'
  const family = Array.from({ length: count - 1 }, () => {
    const c = cloneCell(base)
    if (jitter) c.glyphs.forEach((g) => (g.rotation = (g.rotation + pick([0, 90, 180])) % 360))
    return sameCell(c, odd) ? cloneCell(base) : c
  })
  const opts = shuffle([odd, ...family])
  return {
    gen: 'odd',
    level,
    layout: 'none',
    stimulus: [],
    blankIndex: -1,
    choices: opts,
    answer: opts.indexOf(odd),
    label: GEN_LABEL.odd,
  }
}

/* ---------- 4.1 sequential patterns ---------- */

type Step = (c: Cell, i: number) => Cell

function stepFor(axis: Axis, seedColors: string[], seedShapes: string[]): Step {
  switch (axis) {
    case 'color':
      return (c, i) => {
        const out = cloneCell(c)
        out.glyphs.forEach((g) => (g.color = seedColors[i % seedColors.length]))
        return out
      }
    case 'shape':
      return (c, i) => {
        const out = cloneCell(c)
        out.glyphs.forEach((g) => (g.shape = seedShapes[i % seedShapes.length] as never))
        return out
      }
    case 'rotation':
      return (c, i) => {
        const out = cloneCell(c)
        out.glyphs.forEach((g) => (g.rotation = (i * 90) % 360))
        return out
      }
    case 'count':
      return (c, i) => {
        const g = c.glyphs[0]
        return cell(...Array.from({ length: 1 + (i % 4) }, () => ({ ...g })))
      }
    case 'size':
      return (c, i) => {
        const out = cloneCell(c)
        out.glyphs.forEach((g) => (g.size = 0.5 + 0.25 * (i % 3)))
        return out
      }
    case 'fill':
      return (c, i) => {
        const out = cloneCell(c)
        out.glyphs.forEach((g) => (g.fill = FILLS[i % FILLS.length]))
        return out
      }
  }
}

function genSequence(level: number): Item {
  const k = knobs(level)
  const len = level <= 2 ? 4 : 5
  const axes = shuffle(k.axisPool as Axis[]).slice(0, Math.min(k.rules, 2))
  const seedColors = shuffle(COLORS).slice(0, pick([2, 3]))
  const seedShapes = shuffle(SHAPES).slice(0, pick([2, 3]))
  const steps = axes.map((a) => stepFor(a, seedColors, seedShapes))
  const base = cell(glyph({ fill: 'solid', size: 1, rotation: 0 }))

  const cells: Cell[] = []
  for (let i = 0; i < len; i++) {
    let c = cloneCell(base)
    for (const s of steps) c = s(c, i)
    cells.push(c)
  }
  // Higher levels sometimes blank a middle cell rather than the last.
  const blank = level >= 4 && Math.random() < 0.4 ? 1 + Math.floor(Math.random() * (len - 2)) : len - 1
  const correct = cells[blank]
  const stimulus = cells.map((c, i) => (i === blank ? cell() : c))
  return finish('sequence', level, 'row', stimulus, blank, correct)
}

/* ---------- 4.4 figural analogies ---------- */

function genAnalogy(level: number): Item {
  const k = knobs(level)
  const axes = shuffle(k.axisPool as Axis[]).slice(0, k.rules)
  const a = cell(glyph({ fill: pick(FILLS) }))
  let b = cloneCell(a)
  for (const ax of axes) b = varyCell(b, ax)
  // Same transformation applied to a different starting figure.
  const c = cell(
    glyph({
      shape: pickNot(SHAPES, a.glyphs[0].shape),
      color: pickNot(COLORS, a.glyphs[0].color),
      fill: a.glyphs[0].fill,
      size: a.glyphs[0].size,
      rotation: a.glyphs[0].rotation,
    }),
  )
  let d = cloneCell(c)
  for (const ax of axes) {
    // Reapply the *same* concrete change, not a fresh random one.
    if (ax === 'color') d.glyphs.forEach((g) => (g.color = b.glyphs[0].color))
    else if (ax === 'shape') d.glyphs.forEach((g) => (g.shape = b.glyphs[0].shape))
    else if (ax === 'fill') d.glyphs.forEach((g) => (g.fill = b.glyphs[0].fill))
    else if (ax === 'size') d.glyphs.forEach((g) => (g.size = b.glyphs[0].size))
    else if (ax === 'rotation')
      d.glyphs.forEach(
        (g) => (g.rotation = (g.rotation + (b.glyphs[0].rotation - a.glyphs[0].rotation) + 360) % 360),
      )
    else if (ax === 'count')
      d = cell(...Array.from({ length: b.glyphs.length }, () => ({ ...d.glyphs[0] })))
  }
  return finish('analogy', level, 'analogy', [a, b, c, cell()], 3, d)
}

/* ---------- 4.2 matrices ---------- */

function genMatrix(level: number): Item {
  const k = knobs(level)
  const three = level >= 3
  const size = three ? 3 : 2
  const rowAxis = pick(['color', 'fill', 'size'] as Axis[])
  const colAxis = pickNot(['shape', 'count', 'rotation'] as Axis[], rowAxis as never)

  const colorsRow = shuffle(COLORS).slice(0, size)
  const shapesCol = shuffle(SHAPES).slice(0, size)
  const fillsRow = shuffle(FILLS).slice(0, size)

  const make = (r: number, c: number): Cell => {
    const g = glyph({ fill: 'solid', size: 1, rotation: 0 })
    // Row rule
    if (rowAxis === 'color') g.color = colorsRow[r]
    else if (rowAxis === 'fill') g.fill = fillsRow[r]
    else g.size = 0.55 + 0.22 * r
    // Column rule
    if (colAxis === 'shape') g.shape = shapesCol[c] as never
    else if (colAxis === 'rotation') g.rotation = (c * 90) % 360
    const n = colAxis === 'count' ? c + 1 : 1
    return cell(...Array.from({ length: n }, () => ({ ...g })))
  }

  const cells: Cell[] = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push(make(r, c))
  const blank = size * size - 1
  const correct = cells[blank]
  const stimulus = cells.map((c, i) => (i === blank ? cell() : c))
  void k
  return finish('matrix', level, three ? 'matrix3' : 'matrix2', stimulus, blank, correct)
}

/* ---------- dispatch ---------- */

export function generate(gen: GenId, level: number): Item {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level))
  switch (gen) {
    case 'sample':
      return genSample(lvl)
    case 'odd':
      return genOdd(lvl)
    case 'sequence':
      return genSequence(lvl)
    case 'analogy':
      return genAnalogy(lvl)
    case 'matrix':
      return genMatrix(lvl)
  }
}
