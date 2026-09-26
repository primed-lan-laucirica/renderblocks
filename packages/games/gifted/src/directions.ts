import { COLORS, SHAPES, gcell, glyph, pcell, pick, shuffle, type Cell, type Glyph, type ShapeKind } from './types'
import { PIC, PICTURES, clearMembers, clearNonMembers, type Picture } from './pictures'

/**
 * Following Directions, pitched at real gifted-screener difficulty
 * (OLSAT Following Directions / CogAT Verbal / WPPSI Comprehension of
 * Instructions). What makes these hard is NOT vocabulary — it is the
 * syntax and the working-memory load:
 *
 *   ordinal reference      "the second triangle from the left"
 *   spatial relation       "the shape between the two stars"
 *   scoped superlative     "the biggest shape in the bottom row"
 *   conjunction            "both red and round"
 *   double negation        "not a circle and not red"
 *   conditional            "if there is a star … if there is not …"
 *   temporal inversion     "before you touch X, touch Y"  (answer order flips)
 *   cross-reference        "count the squares, then touch that many circles"
 *
 * Sentences are a FIXED bank (each has a pre-generated clip). Displays are
 * built placement-first so the target set is exact by construction.
 *
 * Grid geometry: always 3 columns, so row/column/ordinal language is
 * well-defined. index -> row = floor(i/3), col = i % 3.
 */

const COLS = 3
export const COLOR_NAME: Record<string, string> = {
  '#ef4444': 'red',
  '#3b82f6': 'blue',
  '#22c55e': 'green',
  '#f59e0b': 'orange',
  '#a855f7': 'purple',
  '#14b8a6': 'teal',
}
const hexOf = (name: string) => Object.entries(COLOR_NAME).find(([, n]) => n === name)![0]
const ANGULAR: ShapeKind[] = ['square', 'triangle', 'diamond', 'star', 'hexagon', 'pentagon', 'cross', 'arrow']

const BIG = 1
const MID = 0.72
const SMALL = 0.45

export interface Built {
  grid: Cell[]
  targets: number[]
  ordered: boolean
}

export interface Spec {
  id: string
  text: string
  level: number
  build: (n: number) => Built
}

/** A glyph that is deliberately none of the banned shapes/colors. */
function other(opts: { notShape?: ShapeKind[]; notColor?: string[]; size?: number } = {}): Glyph {
  const shapes = SHAPES.filter((s) => !(opts.notShape ?? []).includes(s))
  const colors = COLORS.filter((c) => !(opts.notColor ?? []).includes(c))
  return glyph({ shape: pick(shapes), color: pick(colors), size: opts.size ?? BIG })
}

function pack(slots: Array<Glyph | null>, fill: () => Glyph): Cell[] {
  return slots.map((g) => gcell(g ?? fill()))
}

/** Round the grid up to whole rows so row-language is unambiguous. */
function rows(n: number) {
  return Math.ceil(n / COLS)
}

/* ---------- builders ---------- */

/** "Touch the second triangle from the left." (ordinal within a shape class) */
function ordinalShape(shape: ShapeKind, nth: number, level: number): Spec {
  const word = ['first', 'second', 'third'][nth - 1]
  return {
    id: `ord-${nth}-${shape}`,
    text: `Touch the ${word} ${shape} from the left.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      // Place 3 of the shape in ascending index order; the nth is the target.
      const spots = shuffle([...Array(n).keys()]).slice(0, 3).sort((a, b) => a - b)
      spots.forEach((i) => (slots[i] = glyph({ shape, color: pick(COLORS), size: BIG })))
      return {
        grid: pack(slots, () => other({ notShape: [shape] })),
        targets: [spots[nth - 1]],
        ordered: false,
      }
    },
  }
}

/** "Touch the shape between the two stars." */
function betweenSpec(shape: ShapeKind, level: number): Spec {
  return {
    id: `between-${shape}`,
    text: `Touch the shape between the two ${shape === 'cross' ? 'crosses' : `${shape}s`}.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const r = Math.floor(Math.random() * rows(n))
      const base = r * COLS
      slots[base] = glyph({ shape, color: pick(COLORS), size: BIG })
      slots[base + 2] = glyph({ shape, color: pick(COLORS), size: BIG })
      slots[base + 1] = other({ notShape: [shape] })
      return {
        grid: pack(slots, () => other({ notShape: [shape] })),
        targets: [base + 1],
        ordered: false,
      }
    },
  }
}

/** "Touch the shape directly below the red circle." */
function belowSpec(level: number): Spec {
  return {
    id: 'below-red-circle',
    text: 'Touch the shape directly below the red circle.',
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const maxRow = rows(n) - 1
      const r = Math.floor(Math.random() * maxRow) // needs a row beneath it
      const c = Math.floor(Math.random() * COLS)
      const anchor = r * COLS + c
      const target = anchor + COLS
      slots[anchor] = glyph({ shape: 'circle', color: hexOf('red'), size: BIG })
      slots[target] = other({ notShape: ['circle'] })
      return {
        // No other red circle may exist, or the reference is ambiguous.
        grid: pack(slots, () => other({ notShape: ['circle'], notColor: [hexOf('red')] })),
        targets: [target],
        ordered: false,
      }
    },
  }
}

/** "Touch the biggest shape in the bottom row." (superlative with scope) */
function superlativeSpec(big: boolean, bottom: boolean, level: number): Spec {
  return {
    id: `${big ? 'biggest' : 'smallest'}-${bottom ? 'bottom' : 'top'}`,
    text: `Touch the ${big ? 'biggest' : 'smallest'} shape in the ${bottom ? 'bottom' : 'top'} row.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const r = bottom ? rows(n) - 1 : 0
      const base = r * COLS
      const inRow = [base, base + 1, base + 2].filter((i) => i < n)
      const targetIdx = pick(inRow)
      // Target is the extreme; the rest of that row sits at the middle size.
      inRow.forEach((i) => (slots[i] = other({ size: i === targetIdx ? (big ? BIG : SMALL) : MID })))
      // Other rows must not contain a more extreme shape, or scope is moot —
      // but they may contain the same extreme, which is the point of "in the
      // bottom row": the scope qualifier is what disambiguates.
      return {
        grid: pack(slots, () => other({ size: big ? BIG : SMALL })),
        targets: [targetIdx],
        ordered: false,
      }
    },
  }
}

/** "Touch the shape that is both blue and round." (conjunction) */
function conjunctionSpec(colorName: string, level: number): Spec {
  const hex = hexOf(colorName)
  return {
    id: `both-${colorName}-round`,
    text: `Touch the shape that is both ${colorName} and round.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const t = Math.floor(Math.random() * n)
      slots[t] = glyph({ shape: 'circle', color: hex, size: BIG })
      // Every distractor satisfies AT MOST one conjunct.
      return {
        grid: pack(slots, () =>
          Math.random() < 0.5
            ? glyph({ shape: 'circle', color: pick(COLORS.filter((c) => c !== hex)), size: BIG })
            : glyph({ shape: pick(ANGULAR), color: hex, size: BIG }),
        ),
        targets: [t],
        ordered: false,
      }
    },
  }
}

/** "Touch every shape that is not a circle and not red." (double negation) */
function doubleNegSpec(level: number): Spec {
  const red = hexOf('red')
  return {
    id: 'not-circle-not-red',
    text: 'Touch every shape that is not a circle and not red.',
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const k = 2 + Math.floor(Math.random() * 2)
      const spots = shuffle([...Array(n).keys()]).slice(0, k)
      spots.forEach(
        (i) => (slots[i] = glyph({ shape: pick(ANGULAR), color: pick(COLORS.filter((c) => c !== red)), size: BIG })),
      )
      // Distractors violate one conjunct or the other — never both satisfied.
      return {
        grid: pack(slots, () =>
          Math.random() < 0.5
            ? glyph({ shape: 'circle', color: pick(COLORS), size: BIG })
            : glyph({ shape: pick(ANGULAR), color: red, size: BIG }),
        ),
        targets: spots.sort((a, b) => a - b),
        ordered: false,
      }
    },
  }
}

/**
 * "If there is a star, touch the blue shape. If there is no star, touch the
 * green shape." — the branch actually taken varies per presentation.
 */
function conditionalSpec(level: number): Spec {
  const blue = hexOf('blue')
  const green = hexOf('green')
  return {
    id: 'if-star-blue-else-green',
    text: 'If there is a star, touch the blue shape. If there is no star, touch the green shape.',
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const starPresent = Math.random() < 0.5
      const free = shuffle([...Array(n).keys()])
      const t = free.pop()!
      slots[t] = glyph({
        shape: pick(ANGULAR.filter((s) => s !== 'star')),
        color: starPresent ? blue : green,
        size: BIG,
      })
      if (starPresent) {
        const s = free.pop()!
        slots[s] = glyph({ shape: 'star', color: pick(COLORS.filter((c) => c !== blue && c !== green)), size: BIG })
      }
      // Neither branch colour may appear anywhere else, and a star must not
      // appear in the false branch.
      return {
        grid: pack(slots, () =>
          glyph({
            shape: pick(ANGULAR.filter((s) => (starPresent ? true : s !== 'star'))),
            color: pick(COLORS.filter((c) => c !== blue && c !== green)),
            size: BIG,
          }),
        ),
        targets: [t],
        ordered: false,
      }
    },
  }
}

/**
 * "Before you touch the triangle, touch the square." — temporal inversion:
 * the sentence names the triangle first, but the square must be tapped first.
 */
function inversionSpec(first: ShapeKind, second: ShapeKind, level: number): Spec {
  return {
    id: `before-${second}-${first}`,
    text: `Before you touch the ${second}, touch the ${first}.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const free = shuffle([...Array(n).keys()])
      const a = free.pop()!
      const b = free.pop()!
      slots[a] = glyph({ shape: first, color: pick(COLORS), size: BIG })
      slots[b] = glyph({ shape: second, color: pick(COLORS), size: BIG })
      return {
        grid: pack(slots, () => other({ notShape: [first, second] })),
        targets: [a, b], // first-named-second must be tapped last
        ordered: true,
      }
    },
  }
}

/** "Count the squares. Touch that many circles." (cross-reference) */
function crossRefSpec(level: number): Spec {
  return {
    id: 'count-squares-touch-circles',
    text: 'Count the squares. Then touch that many circles.',
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const k = 2 + Math.floor(Math.random() * 2) // 2 or 3
      const free = shuffle([...Array(n).keys()])
      const squares = free.splice(0, k)
      const circles = free.splice(0, k + 1) // one more circle than needed
      squares.forEach((i) => (slots[i] = glyph({ shape: 'square', color: pick(COLORS), size: BIG })))
      circles.forEach((i) => (slots[i] = glyph({ shape: 'circle', color: pick(COLORS), size: BIG })))
      return {
        grid: pack(slots, () => other({ notShape: ['square', 'circle'] })),
        // Any k of the circles count, so scoring accepts the first k tapped.
        targets: circles.slice(0, k),
        ordered: false,
      }
    },
  }
}

/** "Touch every shape in the top row except the triangles." (scope + exclusion) */
function rowExceptSpec(shape: ShapeKind, level: number): Spec {
  const plural = shape === 'cross' ? 'crosses' : `${shape}s`
  return {
    id: `toprow-except-${shape}`,
    text: `Touch every shape in the top row except the ${plural}.`,
    level,
    build: (n) => {
      const slots: Array<Glyph | null> = Array(n).fill(null)
      const inRow = [0, 1, 2].filter((i) => i < n)
      const excluded = pick(inRow)
      const targets: number[] = []
      inRow.forEach((i) => {
        if (i === excluded) slots[i] = glyph({ shape, color: pick(COLORS), size: BIG })
        else {
          slots[i] = other({ notShape: [shape] })
          targets.push(i)
        }
      })
      // Lower rows deliberately contain the excluded shape AND valid-looking
      // shapes: the row scope is what the child must hold on to.
      return {
        grid: pack(slots, () => (Math.random() < 0.5 ? glyph({ shape, color: pick(COLORS), size: BIG }) : other())),
        targets,
        ordered: false,
      }
    },
  }
}

/* ---------- picture directions ---------- */

const pc = (p: Picture): Cell => pcell(p.emoji)
/** Pictures that are none of these kinds (and not arguable for them). */
const noneOf = (...groups: string[]) =>
  PICTURES.filter((p) => groups.every((g) => clearNonMembers(g).includes(p)) && !['person', 'worker'].some((t) => p.tags.includes(t)))

/** "Touch the animal between the two fruits." */
function picBetween(level: number): Spec {
  return {
    id: 'p-between-fruits',
    text: 'Touch the animal between the two fruits.',
    level,
    build: (n) => {
      const r = Math.floor(Math.random() * rows(n))
      const fruits = shuffle(clearMembers('fruit'))
      const grid: Cell[] = shuffle(noneOf('animal', 'fruit')).slice(0, n).map(pc)
      grid[r * COLS] = pc(fruits[0])
      grid[r * COLS + 2] = pc(fruits[1])
      grid[r * COLS + 1] = pc(pick(clearMembers('animal')))
      return { grid, targets: [r * COLS + 1], ordered: false }
    },
  }
}

/** "Touch the second bird." (reading order, as with the shapes) */
function picSecondBird(level: number): Spec {
  return {
    id: 'p-second-bird',
    text: 'Touch the second bird from the left.',
    level,
    build: (n) => {
      const grid: Cell[] = shuffle(noneOf('bird')).slice(0, n).map(pc)
      const spots = shuffle([...Array(n).keys()]).slice(0, 3).sort((a, b) => a - b)
      const birds = shuffle(clearMembers('bird'))
      spots.forEach((i, k) => (grid[i] = pc(birds[k])))
      return { grid, targets: [spots[1]], ordered: false }
    },
  }
}

/** "Touch the picture directly below the sun." */
function picBelowSun(level: number): Spec {
  return {
    id: 'p-below-sun',
    text: 'Touch the picture directly below the sun.',
    level,
    build: (n) => {
      const grid: Cell[] = shuffle(PICTURES.filter((p) => p.id !== 'sun')).slice(0, n).map(pc)
      const at = Math.floor(Math.random() * (n - COLS))
      grid[at] = pc(PIC.sun)
      return { grid, targets: [at + COLS], ordered: false }
    },
  }
}

/** "Touch every picture of something that can fly." */
function picEveryFly(level: number): Spec {
  return {
    id: 'p-every-fly',
    text: 'Touch every picture of something that can fly.',
    level,
    build: (n) => {
      const k = 3
      const flyers = shuffle(clearMembers('flies')).slice(0, k)
      const rest = shuffle(clearNonMembers('flies')).slice(0, n - k)
      const grid = shuffle([...flyers, ...rest])
      return { grid: grid.map(pc), targets: flyers.map((f) => grid.indexOf(f)), ordered: false }
    },
  }
}

/** "Touch the picture that is not an animal and not something to eat." */
function picNeither(level: number): Spec {
  return {
    id: 'p-not-animal-not-food',
    text: 'Touch the picture that is not an animal and not something to eat.',
    level,
    build: (n) => {
      const odd = pick(noneOf('animal').filter((p) => !['food', 'drink', 'fruit', 'plant'].some((t) => p.tags.includes(t))))
      const rest = shuffle([...clearMembers('animal'), ...PICTURES.filter((p) => p.tags.includes('food'))]).slice(0, n - 1)
      const grid = shuffle([odd, ...rest])
      return { grid: grid.map(pc), targets: [grid.indexOf(odd)], ordered: false }
    },
  }
}

/** "Before you touch the fish, touch the cow." — the order in the sentence is backwards. */
function picBefore(level: number): Spec {
  return {
    id: 'p-before-fish-cow',
    text: 'Before you touch the fish, touch the cow.',
    level,
    build: (n) => {
      const others = shuffle(PICTURES.filter((p) => !['fish', 'cow', 'tropicalfish', 'blowfish', 'shark'].includes(p.id))).slice(0, n - 2)
      const grid = shuffle([PIC.fish, PIC.cow, ...others])
      return { grid: grid.map(pc), targets: [grid.indexOf(PIC.cow), grid.indexOf(PIC.fish)], ordered: true }
    },
  }
}

/** "If there is a cat, touch the dog. If there is no cat, touch the bird." */
function picConditional(level: number): Spec {
  return {
    id: 'p-if-cat',
    text: 'If there is a cat, touch the dog. If there is no cat, touch the bird.',
    level,
    build: (n) => {
      const hasCat = Math.random() < 0.5
      const others = shuffle(PICTURES.filter((p) => !['cat', 'dog', 'bird'].includes(p.id))).slice(0, n - (hasCat ? 3 : 2))
      const grid = shuffle([PIC.dog, PIC.bird, ...(hasCat ? [PIC.cat] : []), ...others])
      return { grid: grid.map(pc), targets: [grid.indexOf(hasCat ? PIC.dog : PIC.bird)], ordered: false }
    },
  }
}

/* ---------- the bank ---------- */

export const DIRECTIONS: Spec[] = [
  // Pictures alongside the shapes, at the same difficulty steps.
  picBetween(2),
  picSecondBird(2),
  picBelowSun(3),
  picEveryFly(3),
  picNeither(4),
  picBefore(5),
  picConditional(6),
  // L1 — already beyond single-attribute: conjunction and spatial relation
  conjunctionSpec('blue', 1),
  conjunctionSpec('red', 1),
  betweenSpec('star', 1),
  // L2 — ordinal reference and scoped superlative
  ordinalShape('triangle', 2, 2),
  ordinalShape('circle', 2, 2),
  superlativeSpec(true, true, 2),
  superlativeSpec(false, false, 2),
  // L3 — third-ordinal, spatial anchor
  ordinalShape('square', 3, 3),
  belowSpec(3),
  betweenSpec('square', 3),
  // L4 — negation over two attributes, scoped exclusion
  doubleNegSpec(4),
  rowExceptSpec('triangle', 4),
  rowExceptSpec('circle', 4),
  // L5 — temporal inversion
  inversionSpec('square', 'triangle', 5),
  inversionSpec('circle', 'star', 5),
  inversionSpec('triangle', 'circle', 5),
  // L6 — conditional and cross-reference
  conditionalSpec(6),
  crossRefSpec(6),
  superlativeSpec(true, false, 6),
]

export interface DirectionItem {
  spec: Spec
  grid: Cell[]
  targets: number[]
}

export function buildDirection(spec: Spec, gridSize = 9): DirectionItem {
  // Whole rows only, so "top row" / "bottom row" are unambiguous.
  const n = Math.max(6, Math.ceil(gridSize / COLS) * COLS)
  const built = spec.build(n)
  return { spec, grid: built.grid, targets: built.targets }
}

export function isOrdered(spec: Spec, n = 9): boolean {
  return spec.build(Math.ceil(n / COLS) * COLS).ordered
}

export function directionsForLevel(level: number): Spec[] {
  // Practise at and just below the current level, never trivially below it.
  const floor = Math.max(1, level - 1)
  const pool = DIRECTIONS.filter((d) => d.level <= level && d.level >= floor)
  return pool.length ? pool : DIRECTIONS.filter((d) => d.level <= level)
}
