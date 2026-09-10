import {
  COARSE_AXES,
  COLORS,
  FILLS,
  FINE_AXES,
  ROTATABLE,
  SHAPES,
  SIZE_STEPS,
  cloneCell,
  gcell,
  glyph,
  ncell,
  perceptibleAxes,
  pick,
  sameCell,
  shuffle,
  tcell,
  varyCell,
  type Axis,
  type Cell,
  type Fill,
  type ColorGrid,
  type Item,
  type SubtestId,
} from './types'
import { fitPairRules, fitRules, isDetermined, plausibleNext } from './rules'

export const MAX_LEVEL = 6

function knobs(level: number) {
  return {
    choices: level <= 1 ? 3 : level <= 3 ? 4 : level <= 5 ? 5 : 6,
    rules: level <= 2 ? 1 : level <= 4 ? 2 : 3,
    axisPool: level <= 2 ? COARSE_AXES : level <= 4 ? [...COARSE_AXES, ...FINE_AXES] : FINE_AXES,
  }
}

/**
 * Assemble an item. `reject` lets a generator veto distractors that would be
 * defensible answers in their own right — the difference between a fair item
 * and a trick question.
 */
function assemble(
  sub: SubtestId,
  level: number,
  layout: Item['layout'],
  stimulus: Cell[],
  blankIndex: number,
  correct: Cell,
  makeDistractor: () => Cell,
  explain: string,
  reject: (c: Cell) => boolean = () => false,
): Item {
  const want = knobs(level).choices
  const opts: Cell[] = [correct]
  let guard = 0
  while (opts.length < want && guard++ < 500) {
    const d = makeDistractor()
    if (opts.some((o) => sameCell(o, d))) continue
    if (reject(d)) continue
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
    explain,
  }
}

const AXIS_WORD: Record<Axis, string> = {
  shape: 'shape',
  color: 'color',
  size: 'size',
  rotation: 'turn',
  fill: 'shading',
  count: 'number of shapes',
}

/* ============ NONVERBAL ============ */

/**
 * Figure Classification: three figures share exactly one property. The item is
 * regenerated unless that property is the ONLY thing they share — otherwise a
 * distractor matching the accidental second property is equally defensible.
 */
function figureClassify(level: number): Item {
  // Size and rotation are excluded as the DEFINING property here: judging
  // "same size" across different shapes is genuinely hard, and "same
  // rotation" is meaningless on symmetric shapes. Both remain available in
  // series/matrices, where they appear as a progression instead.
  const pool: Axis[] =
    level <= 2 ? ['shape', 'color'] : level <= 4 ? ['shape', 'color', 'count'] : ['color', 'fill', 'count']
  const property = pick(pool)

  // Every axis except the defining one is cycled through at least two values,
  // so the family provably shares ONE property. (Randomising instead lets
  // defaults collide — a family that also shares size and rotation gives a
  // distractor a second, equally defensible reason to belong.)
  const shapePool = shuffle(SHAPES).slice(0, 4)
  const colorPool = shuffle(COLORS).slice(0, 4)
  const sizePool = [...SIZE_STEPS]
  const rotPool = [0, 90, 180, 270]
  // Only the two extremes: 'light' (30% opacity) reads too close to 'solid'
  // to be judged fairly when the color differs from figure to figure.
  const fillPool: Fill[] = shuffle(['outline', 'solid'])
  const countPool = [1, 2, 3]
  const anchor = {
    shape: shapePool[0],
    color: colorPool[0],
    size: sizePool[0],
    rotation: rotPool[0],
    fill: fillPool[0],
    count: 3,
  }

  const member = (i: number): Cell => {
    const g = glyph({
      shape: property === 'shape' ? anchor.shape : shapePool[i % shapePool.length],
      color: property === 'color' ? anchor.color : colorPool[i % colorPool.length],
      size: property === 'size' ? anchor.size : sizePool[i % sizePool.length],
      rotation: property === 'rotation' ? anchor.rotation : rotPool[i % rotPool.length],
      fill: property === 'fill' ? anchor.fill : fillPool[i % fillPool.length],
    })
    const n = property === 'count' ? anchor.count : countPool[i % countPool.length]
    return gcell(...Array.from({ length: n }, () => ({ ...g })))
  }

  const stimulus = [member(0), member(1), member(2)]
  const correct = member(3)
  let seed = 4
  const distractor = (): Cell => {
    const c = member(seed++)
    if (property !== 'fill') return varyCell(c, property)
    // Flip to the opposite extreme so the difference is unmistakable.
    if (c.kind === 'glyphs') c.glyphs.forEach((g) => (g.fill = fillPool[1]))
    return c
  }

  const shares = (c: Cell): boolean => {
    if (c.kind !== 'glyphs' || correct.kind !== 'glyphs') return false
    const g = c.glyphs[0]
    const a = correct.glyphs[0]
    switch (property) {
      case 'shape':
        return g.shape === a.shape
      case 'color':
        return g.color === a.color
      case 'fill':
        return g.fill === a.fill
      case 'size':
        return Math.abs(g.size - a.size) < 0.01
      case 'rotation':
        return g.rotation === a.rotation
      case 'count':
        return c.glyphs.length === correct.glyphs.length
    }
  }

  return assemble(
    'figureClassify',
    level,
    'classify',
    stimulus,
    -1,
    correct,
    distractor,
    `All three share the same ${AXIS_WORD[property]}; only the answer matches it.`,
    shares,
  )
}

/**
 * Figure Series. Cyclic rules must repeat at least once inside the visible
 * terms (len >= period + 2), otherwise "A B C ?" is legitimately ambiguous
 * between restarting the cycle and introducing a new element.
 */
function figureSeries(level: number): Item {
  const k = knobs(level)
  const len = level <= 2 ? 4 : 5
  const maxPeriod = len - 2
  const axes = shuffle(k.axisPool as Axis[]).slice(0, Math.min(k.rules, 2))
  const period = Math.min(maxPeriod, pick([2, 3]))
  const colorCycle = shuffle(COLORS).slice(0, period)
  // Shading cycles like color/shape. The old rule saturated (outline,
  // light, solid, solid…) leaving the next term genuinely ambiguous.
  const fillCycle = shuffle([...FILLS]).slice(0, Math.min(period, FILLS.length))
  // A quarter turn must be visible, so a rotation rule restricts the shapes.
  const shapePool = axes.includes('rotation') ? ROTATABLE : SHAPES
  const shapeCycle = shuffle(shapePool).slice(0, period)

  // Anything the rule doesn't govern is held CONSTANT across the series.
  // Otherwise that attribute is unconstrained, and a choice differing only on
  // it would be just as defensible as the intended answer.
  const base = glyph({ fill: 'solid', size: 1, rotation: 0, shape: pick(shapePool) })

  const at = (i: number): Cell => {
    const g = { ...base }
    for (const a of axes) {
      if (a === 'color') g.color = colorCycle[i % colorCycle.length]
      else if (a === 'shape') g.shape = shapeCycle[i % shapeCycle.length]
      else if (a === 'rotation') g.rotation = (i * 90) % 360
      else if (a === 'size') g.size = 0.4 + 0.2 * i
      else if (a === 'fill') g.fill = fillCycle[i % fillCycle.length]
    }
    const n = axes.includes('count') ? 1 + i : 1
    return gcell(...Array.from({ length: Math.min(n, 6) }, () => ({ ...g })))
  }

  const cells = Array.from({ length: len }, (_, i) => at(i))
  const blank = len - 1
  const correct = cells[blank]
  const stimulus = cells.map((c, i) => (i === blank ? gcell() : c))
  const distractor = () =>
    varyCell(cloneCell(correct), pick(perceptibleAxes(correct, k.axisPool as Axis[])))

  const parts = axes.map((a) => {
    if (a === 'color') return `the colors repeat every ${colorCycle.length}`
    if (a === 'shape') return `the shapes repeat every ${shapeCycle.length}`
    if (a === 'rotation') return 'each step turns a quarter turn'
    if (a === 'size') return 'each one grows bigger'
    if (a === 'fill') return `the shading repeats every ${fillCycle.length}`
    return 'one more shape is added each step'
  })
  return assemble(
    'figureSeries',
    level,
    'row',
    stimulus,
    blank,
    correct,
    distractor,
    `Following the series: ${parts.join(', and ')}.`,
  )
}

/** Figure Matrices: one rule across rows, another down columns. */
function figureMatrix(level: number): Item {
  const three = level >= 3
  const n = three ? 3 : 2
  const rowAxis = pick(['color', 'fill', 'size'] as Axis[])
  const colAxis = pick(['shape', 'count', 'rotation'] as Axis[])
  const colorsR = shuffle(COLORS).slice(0, n)
  const shapePool = colAxis === 'rotation' ? ROTATABLE : SHAPES
  const shapesC = shuffle(shapePool).slice(0, n)
  const fillsR = shuffle(FILLS).slice(0, n)

  // Non-rule attributes stay constant across the whole matrix (see above).
  const base = glyph({ fill: 'solid', size: 1, rotation: 0, shape: pick(shapePool) })

  const at = (r: number, c: number): Cell => {
    const g = { ...base }
    if (rowAxis === 'color') g.color = colorsR[r]
    else if (rowAxis === 'fill') g.fill = fillsR[r]
    else g.size = SIZE_STEPS[Math.min(r, SIZE_STEPS.length - 1)]
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
  const distractor = () =>
    varyCell(cloneCell(correct), pick(perceptibleAxes(correct, [rowAxis, colAxis])))
  return assemble(
    'figureMatrix',
    level,
    three ? 'matrix3' : 'matrix2',
    stimulus,
    blank,
    correct,
    distractor,
    `Across each row the ${AXIS_WORD[rowAxis]} stays the same; down each column the ${AXIS_WORD[colAxis]} follows the pattern. The empty box needs both.`,
  )
}

/** Pattern Completion: the piece must continue the design at the hole. */
function patternCompletion(level: number): Item {
  const size = 8
  const holeN = level <= 2 ? 3 : 2
  const palette = level <= 2 ? 2 : level <= 4 ? 3 : 4
  const rule = pick(
    level <= 2 ? (['checker', 'vstripe'] as const) : (['checker', 'vstripe', 'diag', 'block'] as const),
  )

  const colorAt = (r: number, c: number): number => {
    switch (rule) {
      case 'checker':
        return (r + c) % palette
      case 'vstripe':
        return c % palette
      case 'diag':
        return (r + 2 * c) % palette
      case 'block':
        return (Math.floor(r / 2) + Math.floor(c / 2)) % palette
    }
  }

  const grid: ColorGrid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => colorAt(r, c)),
  )
  const hr = 1 + Math.floor(Math.random() * (size - holeN - 1))
  const hc = 1 + Math.floor(Math.random() * (size - holeN - 1))
  const crop = (r0: number, c0: number): ColorGrid =>
    Array.from({ length: holeN }, (_, r) => Array.from({ length: holeN }, (_, c) => grid[r0 + r][c0 + c]))

  const field: Cell = { kind: 'field', grid, hole: { r: hr, c: hc, n: holeN } }
  const correctGrid = crop(hr, hc)
  const correct: Cell = { kind: 'field', grid: correctGrid }
  const distractor = (): Cell => {
    if (Math.random() < 0.7) {
      const r = Math.floor(Math.random() * (size - holeN))
      const c = Math.floor(Math.random() * (size - holeN))
      return { kind: 'field', grid: crop(r, c) }
    }
    const g = correctGrid.map((row) => [...row])
    const rr = Math.floor(Math.random() * holeN)
    const cc = Math.floor(Math.random() * holeN)
    g[rr][cc] = (g[rr][cc] + 1) % palette
    return { kind: 'field', grid: g }
  }
  const ruleWord =
    rule === 'checker'
      ? 'the colors alternate like a checkerboard'
      : rule === 'vstripe'
        ? 'the design runs in vertical stripes'
        : rule === 'diag'
          ? 'the stripes run diagonally'
          : 'the design repeats in blocks'
  // Any piece identical to the true crop would be equally correct.
  const identical = (c: Cell) =>
    c.kind === 'field' && JSON.stringify(c.grid) === JSON.stringify(correctGrid)
  return assemble(
    'patternCompletion',
    level,
    'field',
    [field],
    -1,
    correct,
    distractor,
    `In this design ${ruleWord}. Only one piece continues it through the hole.`,
    identical,
  )
}

/** Paper Folding: punches mirror across the fold when the sheet opens. */
function paperFolding(level: number): Item {
  const size = 4
  const axis: 'v' | 'h' = pick(['v', 'h'] as const)
  const punchCount = level <= 2 ? 1 : level <= 4 ? 2 : 3
  const half = size / 2

  const spots: Array<[number, number]> = []
  for (let r = 0; r < (axis === 'h' ? half : size); r++)
    for (let c = 0; c < (axis === 'v' ? half : size); c++) spots.push([r, c])
  const punches = shuffle(spots).slice(0, Math.min(punchCount, spots.length))

  const mirror = ([r, c]: [number, number]): [number, number] =>
    axis === 'v' ? [r, size - 1 - c] : [size - 1 - r, c]
  const key = (hs: Array<[number, number]>) => hs.map(([r, c]) => `${r},${c}`).sort().join('|')
  const unfolded = [...punches, ...punches.map(mirror)]

  const folded: Cell = { kind: 'fold', axis, size, punches }
  const correct: Cell = { kind: 'sheet', size, holes: unfolded }

  const distractor = (): Cell => {
    const mode = Math.random()
    let holes: Array<[number, number]>
    if (mode < 0.3) holes = [...punches]
    else if (mode < 0.55) holes = punches.map(mirror)
    else if (mode < 0.8) {
      const wrong = ([r, c]: [number, number]): [number, number] =>
        axis === 'v' ? [size - 1 - r, c] : [r, size - 1 - c]
      holes = [...punches, ...punches.map(wrong)]
    } else {
      holes = unfolded.map(([r, c], i) =>
        i === 0 ? ([(r + 1) % size, c] as [number, number]) : ([r, c] as [number, number]),
      )
    }
    const dedup = new Map(holes.map((h) => [`${h[0]},${h[1]}`, h]))
    return { kind: 'sheet', size, holes: [...dedup.values()] }
  }

  // Any sheet with the true hole set is the answer, however it was produced.
  const equalsAnswer = (c: Cell) => c.kind === 'sheet' && key(c.holes) === key(unfolded)

  return assemble(
    'paperFolding',
    level,
    'fold',
    [folded],
    -1,
    correct,
    distractor,
    `The ${punches.length === 1 ? 'hole goes' : 'holes go'} through both layers, so opening the sheet mirrors ${
      punches.length === 1 ? 'it' : 'them'
    } across the fold — ${unfolded.length} holes in total.`,
    equalsAnswer,
  )
}

/* ============ QUANTITATIVE ============ */

/**
 * Number Series. The sequence is kept only if every rule that fits the visible
 * terms predicts the same next value, and distractors never coincide with a
 * value some other fitting rule would justify.
 */
function numberSeries(level: number): Item {
  const len = level <= 2 ? 4 : 5
  for (let attempt = 0; attempt < 200; attempt++) {
    const step = 1 + Math.floor(Math.random() * (level <= 2 ? 4 : 9))
    const kind = pick(
      level <= 1
        ? (['add'] as const)
        : level <= 2
          ? (['add', 'sub'] as const)
          : level <= 4
            ? (['add', 'sub', 'mul'] as const)
            : (['add', 'sub', 'mul', 'grow', 'alt'] as const),
    )
    const start = 1 + Math.floor(Math.random() * (level <= 2 ? 9 : 20))
    const seq: number[] = [start]
    for (let i = 1; i < len; i++) {
      const prev = seq[i - 1]
      if (kind === 'add') seq.push(prev + step)
      else if (kind === 'sub') seq.push(prev - step)
      else if (kind === 'mul') seq.push(prev * 2)
      else if (kind === 'grow') seq.push(prev + step * i)
      else seq.push(prev + (i % 2 === 1 ? step : -Math.max(1, step - 1)))
    }
    if (seq.some((v) => v < 0 || v > 999 || !Number.isInteger(v))) continue
    if (new Set(seq).size !== seq.length) continue

    const shown = seq.slice(0, len - 1)
    // The visible terms must admit exactly one continuation.
    if (!isDetermined(shown)) continue
    const fitted = fitRules(shown)
    if (fitted.length === 0 || fitted[0].next !== seq[len - 1]) continue

    const answer = seq[len - 1]
    const stimulus = seq.map((v, i) => (i === len - 1 ? tcell('?') : ncell(v)))
    // Values another rule could justify are barred from the options.
    const barred = new Set(plausibleNext(shown))
    const distractor = () => ncell(Math.max(0, answer + pick([-3, -2, -1, 1, 2, 3, 4])))
    const reject = (c: Cell) => c.kind === 'number' && c.value !== answer && barred.has(c.value)

    return assemble(
      'numberSeries',
      level,
      'row',
      stimulus,
      len - 1,
      ncell(answer),
      distractor,
      `${fitted[0].explain} ${shown.join(', ')} → ${answer}.`,
      reject,
    )
  }
  return numberSeries(1)
}

/** Number Analogies: the same rule must be the only one fitting both pairs. */
function numberAnalogy(level: number): Item {
  for (let attempt = 0; attempt < 200; attempt++) {
    const mode = pick(
      level <= 2 ? (['add', 'sub'] as const) : (['add', 'sub', 'mul', 'div'] as const),
    )
    const k = 1 + Math.floor(Math.random() * (level <= 2 ? 5 : 9))
    const xs = shuffle(Array.from({ length: 24 }, (_, i) => i + 2)).slice(0, 3)
    const f = (x: number) =>
      mode === 'add' ? x + k : mode === 'sub' ? x - k : mode === 'mul' ? x * 2 : x / 2
    const ys = xs.map(f)
    if (ys.some((y) => y < 1 || y > 999 || !Number.isInteger(y))) continue

    const shownPairs: Array<[number, number]> = [
      [xs[0], ys[0]],
      [xs[1], ys[1]],
    ]
    const fitted = fitPairRules(shownPairs)
    // Exactly one rule may fit the two demonstrated pairs.
    if (fitted.length !== 1) continue
    const answer = fitted[0].apply(xs[2])
    if (answer !== ys[2]) continue

    const stimulus = [ncell(xs[0]), ncell(ys[0]), ncell(xs[1]), ncell(ys[1]), ncell(xs[2]), tcell('?')]
    const distractor = () => ncell(Math.max(0, answer + pick([-3, -2, -1, 1, 2, 3])))
    return assemble(
      'numberAnalogy',
      level,
      'pairs',
      stimulus,
      5,
      ncell(answer),
      distractor,
      `${fitted[0].explain} ${xs[0]}→${ys[0]}, ${xs[1]}→${ys[1]}, so ${xs[2]}→${answer}.`,
    )
  }
  return numberAnalogy(1)
}

/** Number Puzzles: solve for the missing term. */
function numberPuzzle(level: number): Item {
  const big = level <= 2 ? 10 : level <= 4 ? 20 : 50
  const a = 1 + Math.floor(Math.random() * big)
  const b = 1 + Math.floor(Math.random() * big)
  const op = level <= 2 ? '+' : pick(['+', '−'] as const)
  const lhs = op === '+' ? a : Math.max(a, b)
  const rhs = op === '+' ? b : Math.min(a, b)
  const total = op === '+' ? lhs + rhs : lhs - rhs

  const missingRight = Math.random() < 0.5
  const answer = missingRight ? rhs : total
  const stimulus: Cell[] = missingRight
    ? [ncell(total), tcell('='), ncell(lhs), tcell(op), tcell('?')]
    : [tcell('?'), tcell('='), ncell(lhs), tcell(op), ncell(rhs)]

  const distractor = () => ncell(Math.max(0, answer + pick([-3, -2, -1, 1, 2, 3])))
  const explain = missingRight
    ? `${total} = ${lhs} ${op} ?, so the missing number is ${answer}.`
    : `${lhs} ${op} ${rhs} = ${answer}.`
  return assemble('numberPuzzle', level, 'equation', stimulus, -1, ncell(answer), distractor, explain)
}

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
