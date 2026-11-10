/**
 * The Math Symbols Learning Path, as imported from the sheet
 * (scripts/import.mjs → symbols.json): 53 ranks in 7 stages, each naming the
 * ranks it depends on. The sheet's rule is that a sign depends only on signs
 * ranked above it; the tests hold every explainer to it.
 */
import LIST from './symbols.json'

export interface Rank {
  rank: number
  stage: number
  stageName: string
  /** The sign, or the members of its family, as the sheet writes them. */
  glyphs: string[]
  name: string
  dependsOn: number[]
}

export const RANKS: Rank[] = LIST

export const rankOf = (n: number) => RANKS[n - 1]

export interface StageInfo {
  n: number
  name: string
  ranks: number[]
}

export const STAGES: StageInfo[] = [...new Set(RANKS.map((r) => r.stage))].map((n) => {
  const rows = RANKS.filter((r) => r.stage === n)
  return { n, name: rows[0].stageName, ranks: rows.map((r) => r.rank) }
})

/**
 * Which rank owns each sign an equation line can show. The sheet writes a
 * few signs in words ("(fraction bar)"), as a pair ("( )") or round a
 * letter that is not theirs ("xⁿ" is the raised number, "pow"; "xᵢ" the
 * label set low, "sub"; "f(x)" the function's name, "fn"; any letter for a
 * number is "var"; "{ x | … }" is the braces and what goes between them;
 * "dy/dx" is the upright d, "f′" the prime and "ẋ" the dot over a letter;
 * "v⃗" is the arrow over a letter, "vec", and a matrix is its tall
 * brackets, "mat"; the upright P of "P(A)" is "prob", the E of "E[X]" is
 * "expect" and the N of the normal curve is "normal");
 * SHEET_NAMES says which of these each stands for, and a test checks the
 * two agree.
 */
export const OWNER: Record<string, number> = {
  '=': 1,
  '+': 2,
  '−': 2,
  '×': 3,
  '·': 3,
  '÷': 4,
  '/': 4,
  frac: 4,
  '(': 5,
  ')': 5,
  '<': 6,
  '>': 6,
  '≤': 6,
  '≥': 6,
  '≠': 6,
  pow: 7,
  '√': 8,
  '.': 9,
  '%': 9,
  '≈': 10,
  '|': 11,
  var: 12,
  '±': 13,
  sub: 14,
  fn: 15,
  π: 16,
  θ: 16,
  sin: 16,
  cos: 16,
  tan: 16,
  e: 17,
  log: 17,
  ln: 17,
  '!': 18,
  Σ: 19,
  Π: 20,
  '∞': 21,
  '∝': 22,
  '¬': 23,
  '∧': 23,
  '∨': 23,
  '→': 24,
  '⇒': 24,
  '↔': 24,
  '⇔': 24,
  '∀': 25,
  '∃': 25,
  '∈': 26,
  '∉': 26,
  '{': 27,
  '}': 27,
  '∣': 27,
  ',': 27,
  '…': 27,
  '∅': 28,
  '⊆': 29,
  '⊂': 29,
  '∪': 30,
  '∩': 30,
  '∖': 30,
  ℕ: 31,
  ℤ: 31,
  ℚ: 31,
  ℝ: 31,
  ℂ: 31,
  ':': 33,
  '↦': 33,
  '∘': 33,
  ':=': 34,
  '≡': 34,
  mod: 34,
  '∴': 35,
  Δ: 36,
  lim: 37,
  d: 38,
  '′': 38,
  dot: 38,
  '∫': 39,
  '∂': 40,
  vec: 41,
  bold: 41,
  '‖': 42,
  mat: 44,
  ᵀ: 44,
  det: 44,
  '∇': 45,
  '⟨': 46,
  '⟩': 46,
  prob: 47,
  μ: 48,
  σ: 48,
  expect: 49,
  Var: 49,
  '[': 49,
  ']': 49,
  '~': 50,
  normal: 50,
  '≅': 51,
  '≃': 51,
  '⊕': 52,
  '⊗': 52,
  '∮': 53,
}

export const SHEET_NAMES: Record<string, string[]> = {
  '(fraction bar)': ['frac'],
  '( )': ['(', ')'],
  'xⁿ': ['pow'],
  '(decimal point)': ['.'],
  '|x|': ['|'],
  'x, y, n …': ['var'],
  'xᵢ': ['sub'],
  'f(x)': ['fn'],
  'n!': ['!'],
  // The braces, the bar that reads "such that" (not rank 11's pair of bars), the comma between members and the dots for "and so on".
  '{ x | … }': ['{', '}', '∣', ',', '…'],
  // The times sign between two sets is rank 3's own.
  'A × B': [],
  // The colon; its arrow is rank 24's, and the raised −1 of f⁻¹ is a power's place with a minus in it.
  'f : A → B': [':'],
  'f⁻¹': [],
  '≡': ['≡', 'mod'],
  // The arrow under "lim" is rank 24's.
  'x → a': [],
  // The upright d of a small step, the prime after a function's name, and the dot over a letter.
  'dy/dx': ['d'],
  'f′': ['′'],
  'ẋ': ['dot'],
  // The same sign with its two ends written on.
  '∫ₐᵇ': [],
  // The arrow over a letter, and the same letter set upright and heavy.
  'v⃗': ['vec'],
  '(or bold v)': ['bold'],
  '‖v‖': ['‖'],
  // Rank 3's dot and cross, with a new job between two vectors.
  'u · v': [],
  'u × v': [],
  // A matrix's name is a capital letter; its own sign is the tall brackets round its numbers. The raised −1 is a power's place, as in f⁻¹.
  A: ['mat'],
  'Aᵀ': ['ᵀ'],
  'A⁻¹': [],
  'det A': ['det'],
  '∇·': [],
  '∇×': [],
  '⟨u, v⟩': ['⟨', '⟩'],
  // The upright P. The bar read "given" is rank 27's bar, which read "such that".
  'P(A)': ['prob'],
  'P(A | B)': [],
  // The raised two is a power.
  'σ²': [],
  // The upright E and its square brackets; the word Var.
  'E[X]': ['expect', '[', ']'],
  'Var(X)': ['Var'],
  // The wave, and the upright N of the normal curve.
  'X ~ N(μ, σ²)': ['~', 'normal'],
}

/** The signs of one rank, as the equation line names them. */
export const signsOf = (rank: number) => Object.keys(OWNER).filter((g) => OWNER[g] === rank)

/** Each stage's colour along the road (the Montessori bead colours, as Story5's parts). */
export const STAGE_COLOURS = ['#d63b3b', '#3fa34d', '#f08cb3', '#f2d03b', '#7cc4e8', '#9b6fc1', '#8a5a34']
export const stageColour = (stage: number) => STAGE_COLOURS[(stage - 1) % STAGE_COLOURS.length]
