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
 * number is "var"); SHEET_NAMES says which of these each stands for, and a
 * test checks the two agree.
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
}

/** The signs of one rank, as the equation line names them. */
export const signsOf = (rank: number) => Object.keys(OWNER).filter((g) => OWNER[g] === rank)

/** Each stage's colour along the road (the Montessori bead colours, as Story5's parts). */
export const STAGE_COLOURS = ['#d63b3b', '#3fa34d', '#f08cb3', '#f2d03b', '#7cc4e8', '#9b6fc1', '#8a5a34']
export const stageColour = (stage: number) => STAGE_COLOURS[(stage - 1) % STAGE_COLOURS.length]
