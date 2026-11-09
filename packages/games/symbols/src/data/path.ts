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
 * few signs in words ("(fraction bar)") or as a pair ("( )"); SHEET_NAMES
 * says which of these each stands for, and a test checks the two agree.
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
}

export const SHEET_NAMES: Record<string, string[]> = {
  '(fraction bar)': ['frac'],
  '( )': ['(', ')'],
}

/** The signs of one rank, as the equation line names them. */
export const signsOf = (rank: number) => Object.keys(OWNER).filter((g) => OWNER[g] === rank)

/** Each stage's colour along the road (the Montessori bead colours, as Story5's parts). */
export const STAGE_COLOURS = ['#d63b3b', '#3fa34d', '#f08cb3', '#f2d03b', '#7cc4e8', '#9b6fc1', '#8a5a34']
export const stageColour = (stage: number) => STAGE_COLOURS[(stage - 1) % STAGE_COLOURS.length]
