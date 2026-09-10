import {
  COARSE_AXES,
  COLORS,
  FILLS,
  FINE_AXES,
  SHAPES,
  cloneCell,
  gcell,
  glyph,
  ncell,
  pick,
  sameCell,
  shuffle,
  tcell,
  varyCell,
  type Axis,
  type Cell,
  type ColorGrid,
  type Item,
  type SubtestId,
} from './types'

export const MAX_LEVEL = 6

function knobs(level: number) {
  return {
    choices: level <= 1 ? 3 : level <= 3 ? 4 : level <= 5 ? 5 : 6,
    rules: level <= 2 ? 1 : level <= 4 ? 2 : 3,
    axisPool: level <= 2 ? COARSE_AXES : level <= 4 ? [...COARSE_AXES, ...FINE_AXES] : FINE_AXES,
  }
}

/** Assemble an item, filling the option list out with unique distractors. */
function assemble(
  sub: SubtestId,
  level: number,
  layout: Item['layout'],
  stimulus: Cell[],
  blankIndex: number,
  correct: Cell,
  makeDistractor: () => Cell,
): Item {
  const want = knobs(level).choices
  const opts: Cell[] = [correct]
  let guard = 0
  while (opts.length < want && guard++ < 400) {
    const d = makeDistractor()
    if (opts.some((o) => sameCell(o, d))) continue
    opts.push(d)
  }
  const shuffled = shuffle(opts)
  return {
    sub,
    level,
    layout,
    stimulus,
    blankIndex,
    choices: shuffled,
    answer: shuffled.findIndex((c) => sameCell(c, correct)),
  }
}

/* ============ NONVERBAL ============ */

/**
 * Figure Classification (CogAT/OLSAT): three figures share one property;
 * choose the fourth that belongs with them.
 */
function figureClassify(level: number): Item {
  const k = knobs(level)
  // The shared property is one attribute held constant; everything else varies.
  const property = pick(k.axisPool) as Axis
  const anchor = glyph({ fill: pick(FILLS) })

  const member = (): Cell => {
    const g = glyph({ fill: pick(FILLS) })
    // Inherit the defining property, randomise the rest.
    if (property === 'shape') g.shape = anchor.shape
    else if (property === 'color') g.color = anchor.color
    else if (property === 'fill') g.fill = anchor.fill
    else if (property === 'size') g.size = anchor.size
    else if (property === 'rotation') g.rotation = anchor.rotation
    if (property === 'count') return gcell(...Array.from({ length: 3 }, () => ({ ...g })))
    return gcell(g)
  }

  const stimulus = [member(), member(), member()]
  const correct = member()
  const distractor = (): Cell => {
    const c = member()
    return varyCell(c, property) // breaks exactly the defining property
  }
  return assemble('figureClassify', level, 'classify', stimulus, -1, correct, distractor)
}

/** Figure Series (CogAT/NNAT serial reasoning): one transformation per step. */
function figureSeries(level: number): Item {
  const k = knobs(level)
  const len = level <= 2 ? 4 : 5
  const axes = shuffle(k.axisPool as Axis[]).slice(0, Math.min(k.rules, 2))
  const colorCycle = shuffle(COLORS).slice(0, pick([2, 3]))
  const shapeCycle = shuffle(SHAPES).slice(0, pick([2, 3]))

  const at = (i: number): Cell => {
    const g = glyph({ fill: 'solid', size: 1, rotation: 0 })
    for (const a of axes) {
      if (a === 'color') g.color = colorCycle[i % colorCycle.length]
      else if (a === 'shape') g.shape = shapeCycle[i % shapeCycle.length]
      else if (a === 'rotation') g.rotation = (i * 90) % 360
      else if (a === 'size') g.size = 0.5 + 0.25 * (i % 3)
      else if (a === 'fill') g.fill = FILLS[i % FILLS.length]
    }
    const n = axes.includes('count') ? 1 + (i % 4) : 1
    return gcell(...Array.from({ length: n }, () => ({ ...g })))
  }

  const cells = Array.from({ length: len }, (_, i) => at(i))
  const blank = len - 1
  const correct = cells[blank]
  const stimulus = cells.map((c, i) => (i === blank ? gcell() : c))
  const distractor = () => {
    let d = cloneCell(correct)
    d = varyCell(d, pick(k.axisPool) as Axis)
    return d
  }
  return assemble('figureSeries', level, 'row', stimulus, blank, correct, distractor)
}

/** Figure Matrices (CogAT/NNAT): independent row and column rules. */
function figureMatrix(level: number): Item {
  const three = level >= 3
  const n = three ? 3 : 2
  const rowAxis = pick(['color', 'fill', 'size'] as Axis[])
  const colAxis = pick(['shape', 'count', 'rotation'] as Axis[])
  const colorsR = shuffle(COLORS).slice(0, n)
  const shapesC = shuffle(SHAPES).slice(0, n)
  const fillsR = shuffle(FILLS).slice(0, n)

  const at = (r: number, c: number): Cell => {
    const g = glyph({ fill: 'solid', size: 1, rotation: 0 })
    if (rowAxis === 'color') g.color = colorsR[r]
    else if (rowAxis === 'fill') g.fill = fillsR[r]
    else g.size = 0.55 + 0.22 * r
    if (colAxis === 'shape') g.shape = shapesC[c]
    else if (colAxis === 'rotation') g.rotation = (c * 90) % 360
    const count = colAxis === 'count' ? c + 1 : 1
    return gcell(...Array.from({ length: count }, () => ({ ...g })))
  }

  const cells: Cell[] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(at(r, c))
  const blank = n * n - 1
  const correct = cells[blank]
  const stimulus = cells.map((c, i) => (i === blank ? gcell() : c))
  const distractor = () => varyCell(cloneCell(correct), pick([rowAxis, colAxis]) as Axis)
  return assemble('figureMatrix', level, three ? 'matrix3' : 'matrix2', stimulus, blank, correct, distractor)
}

/**
 * Pattern Completion (NNAT signature item): a patterned field with a square
 * hole; pick the piece that continues the design.
 */
function patternCompletion(level: number): Item {
  const size = 8
  const holeN = level <= 2 ? 3 : 2
  const palette = shuffle(COLORS).slice(0, level <= 2 ? 2 : level <= 4 ? 3 : 4)
  const rule = pick(
    level <= 2
      ? (['checker', 'vstripe'] as const)
      : (['checker', 'vstripe', 'diag', 'block'] as const),
  )

  const colorAt = (r: number, c: number): number => {
    switch (rule) {
      case 'checker':
        return (r + c) % palette.length
      case 'vstripe':
        return c % palette.length
      case 'diag':
        return (r + 2 * c) % palette.length
      case 'block':
        return (Math.floor(r / 2) + Math.floor(c / 2)) % palette.length
    }
  }

  const grid: ColorGrid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => colorAt(r, c)),
  )
  const hr = 1 + Math.floor(Math.random() * (size - holeN - 1))
  const hc = 1 + Math.floor(Math.random() * (size - holeN - 1))
  const crop = (r0: number, c0: number): ColorGrid =>
    Array.from({ length: holeN }, (_, r) =>
      Array.from({ length: holeN }, (_, c) => grid[r0 + r][c0 + c]),
    )

  const field: Cell = { kind: 'field', grid, hole: { r: hr, c: hc, n: holeN } }
  const correct: Cell = { kind: 'field', grid: crop(hr, hc) }
  const distractor = (): Cell => {
    // Pieces cropped from elsewhere in the field, or a nudged copy — both
    // plausible, neither continuing the design at the hole.
    if (Math.random() < 0.7) {
      const r = Math.floor(Math.random() * (size - holeN))
      const c = Math.floor(Math.random() * (size - holeN))
      return { kind: 'field', grid: crop(r, c) }
    }
    const g = crop(hr, hc).map((row) => [...row])
    const rr = Math.floor(Math.random() * holeN)
    const cc = Math.floor(Math.random() * holeN)
    g[rr][cc] = (g[rr][cc] + 1) % palette.length
    return { kind: 'field', grid: g }
  }
  const withPalette = (c: Cell): Cell =>
    c.kind === 'field'
      ? { ...c, grid: c.grid.map((row) => row.map((v) => v)) }
      : c
  void withPalette
  const item = assemble('patternCompletion', level, 'field', [field], -1, correct, distractor)
  return { ...item, stimulus: [field], choices: item.choices.map((c) => ({ ...c })) }
}

/**
 * Paper Folding (CogAT/NNAT): a sheet is folded, holes are punched through,
 * pick how it looks unfolded.
 */
function paperFolding(level: number): Item {
  const size = 4
  const axis: 'v' | 'h' = pick(['v', 'h'] as const)
  const punchCount = level <= 2 ? 1 : level <= 4 ? 2 : 3
  const half = size / 2

  // Punches live in the visible (folded) half.
  const spots: Array<[number, number]> = []
  for (let r = 0; r < (axis === 'h' ? half : size); r++)
    for (let c = 0; c < (axis === 'v' ? half : size); c++) spots.push([r, c])
  const punches = shuffle(spots).slice(0, Math.min(punchCount, spots.length))

  const mirror = ([r, c]: [number, number]): [number, number] =>
    axis === 'v' ? [r, size - 1 - c] : [size - 1 - r, c]

  const key = (hs: Array<[number, number]>) =>
    hs.map(([r, c]) => `${r},${c}`).sort().join('|')
  const unfolded = [...punches, ...punches.map(mirror)]

  const folded: Cell = { kind: 'fold', axis, size, punches }
  const correct: Cell = { kind: 'sheet', size, holes: unfolded }

  const distractor = (): Cell => {
    const mode = Math.random()
    let holes: Array<[number, number]>
    if (mode < 0.3) holes = [...punches] // forgot to mirror
    else if (mode < 0.55) holes = punches.map(mirror) // mirrored only
    else if (mode < 0.8) {
      // mirrored across the wrong axis
      const wrong = ([r, c]: [number, number]): [number, number] =>
        axis === 'v' ? [size - 1 - r, c] : [r, size - 1 - c]
      holes = [...punches, ...punches.map(wrong)]
    } else {
      // right count, one hole displaced
      const shifted = unfolded.map(([r, c], i) =>
        i === 0 ? ([(r + 1) % size, c] as [number, number]) : ([r, c] as [number, number]),
      )
      holes = shifted
    }
    const dedup = new Map(holes.map((h) => [`${h[0]},${h[1]}`, h]))
    return { kind: 'sheet', size, holes: [...dedup.values()] }
  }

  const item = assemble('paperFolding', level, 'fold', [folded], -1, correct, distractor)
  // Guard: no distractor may coincide with the true unfolded pattern.
  const fixed = item.choices.map((c, i) =>
    i !== item.answer && c.kind === 'sheet' && key(c.holes) === key(unfolded)
      ? ({ kind: 'sheet', size, holes: punches } as Cell)
      : c,
  )
  return { ...item, choices: fixed }
}

/* ============ QUANTITATIVE ============ */

interface NumRule {
  apply: (n: number, i: number) => number
  label: string
}

function numRule(level: number): NumRule {
  const step = 1 + Math.floor(Math.random() * (level <= 2 ? 4 : 9))
  const pool: NumRule[] = [
    { apply: (n) => n + step, label: `+${step}` },
    { apply: (n) => n - step, label: `-${step}` },
  ]
  if (level >= 2) pool.push({ apply: (n) => n * 2, label: '×2' })
  if (level >= 3) pool.push({ apply: (n) => n * 3, label: '×3' })
  if (level >= 4)
    pool.push({
      apply: (n, i) => n + (i % 2 === 0 ? step : -Math.max(1, step - 1)),
      label: 'alternating',
    })
  if (level >= 5) pool.push({ apply: (n, i) => n + step * (i + 1), label: 'growing' })
  return pick(pool)
}

/** Number Series (CogAT quantitative): find the rule, extend the sequence. */
function numberSeries(level: number): Item {
  const len = level <= 2 ? 4 : 5
  for (let attempt = 0; attempt < 40; attempt++) {
    const rule = numRule(level)
    const start = 1 + Math.floor(Math.random() * (level <= 2 ? 9 : 20))
    const seq: number[] = [start]
    for (let i = 1; i < len; i++) seq.push(rule.apply(seq[i - 1], i - 1))
    if (seq.some((v) => v < 0 || v > 999 || !Number.isInteger(v))) continue
    if (new Set(seq).size !== seq.length) continue
    const answer = seq[len - 1]
    const stimulus = seq.map((v, i) => (i === len - 1 ? tcell('?') : ncell(v)))
    const distractor = () => {
      const delta = pick([-2, -1, 1, 2, 3])
      return ncell(Math.max(0, answer + delta))
    }
    return assemble('numberSeries', level, 'row', stimulus, len - 1, ncell(answer), distractor)
  }
  return numberSeries(1)
}

/** Number Analogies (CogAT): [a → b] [c → d] [e → ?] with one shared rule. */
function numberAnalogy(level: number): Item {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rule = numRule(Math.min(level, 4))
    const xs = shuffle(Array.from({ length: 20 }, (_, i) => i + 1)).slice(0, 3)
    const ys = xs.map((x) => rule.apply(x, 0))
    if (ys.some((y) => y < 0 || y > 999 || !Number.isInteger(y))) continue
    const stimulus = [
      ncell(xs[0]),
      ncell(ys[0]),
      ncell(xs[1]),
      ncell(ys[1]),
      ncell(xs[2]),
      tcell('?'),
    ]
    const answer = ys[2]
    const distractor = () => ncell(Math.max(0, answer + pick([-3, -2, -1, 1, 2, 3])))
    return assemble('numberAnalogy', level, 'pairs', stimulus, 5, ncell(answer), distractor)
  }
  return numberAnalogy(1)
}

/** Number Puzzles (CogAT): solve for the missing value in an equation. */
function numberPuzzle(level: number): Item {
  const big = level <= 2 ? 10 : level <= 4 ? 20 : 50
  const a = 1 + Math.floor(Math.random() * big)
  const b = 1 + Math.floor(Math.random() * big)
  const op = level <= 2 ? '+' : pick(['+', '−'] as const)
  const total = op === '+' ? a + b : Math.max(a, b) - Math.min(a, b)
  const lhs = op === '+' ? a : Math.max(a, b)
  const rhs = op === '+' ? b : Math.min(a, b)

  // Two shapes: "? = a + b"  or  "total = a + ?"
  const missingRight = Math.random() < 0.5
  const answer = missingRight ? rhs : total
  const stimulus: Cell[] = missingRight
    ? [ncell(total), tcell('='), ncell(lhs), tcell(op), tcell('?')]
    : [tcell('?'), tcell('='), ncell(lhs), tcell(op), ncell(rhs)]

  const distractor = () => ncell(Math.max(0, answer + pick([-3, -2, -1, 1, 2, 3])))
  return assemble('numberPuzzle', level, 'equation', stimulus, -1, ncell(answer), distractor)
}

/* ---------- dispatch ---------- */

export function generate(sub: SubtestId, level: number): Item {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level))
  switch (sub) {
    case 'figureClassify':
      return figureClassify(lvl)
    case 'figureSeries':
      return figureSeries(lvl)
    case 'figureMatrix':
      return figureMatrix(lvl)
    case 'patternCompletion':
      return patternCompletion(lvl)
    case 'paperFolding':
      return paperFolding(lvl)
    case 'numberSeries':
      return numberSeries(lvl)
    case 'numberAnalogy':
      return numberAnalogy(lvl)
    case 'numberPuzzle':
      return numberPuzzle(lvl)
  }
}
