/**
 * Validation Quizlets (VQs) — Simple, High-Signal Frontier Calibration Probes
 *
 * Designed for RenderBlocks:
 *  - Number-forward, hyperlexia-friendly, minimal clutter (1 question, 3-4 big choices)
 *  - High information gain per tap: probes the uncertain edge of the 38-concept DAG
 *  - Never interrupts mid-game or mid-video; fires at natural tile transitions across RB
 *    (rate-limited) or on demand from Progress / Proximal ("Quick Check")
 *  - Uncapped upward: covers PreK counting through Middle/High School & University concepts
 */
import type { FrontierSnapshot } from './mastery'
import { CONCEPT_BY_ID, type ConceptId, type LevelBandId, type SubjectId } from './taxonomy'

export interface VqVisualDots {
  kind: 'dots'
  count: number
  color?: string
}

export interface VqVisualFraction {
  kind: 'fraction'
  numerator: number
  denominator: number
}

export type VqVisual = VqVisualDots | VqVisualFraction

export interface ValidationQuizlet {
  /** Stable item id for progress logging & deduping (e.g. 'vq:add:7+5'). */
  id: string
  concept: ConceptId
  subject: SubjectId
  band: LevelBandId
  /** Optional CCSS code + item key so Progress fact grids also credit VQ passes. */
  ccss?: string
  progressItem?: string
  /** Crisp big visual prompt. */
  prompt: string
  /** Optional short subtitle (never long prose). */
  hint?: string
  visual?: VqVisual
  choices: string[]
  correctIndex: number
}

export interface VqCadenceState {
  lastShownAt: number
  exitsSinceLast: number
  consecutiveSkips: number
  recentQuestionIds: string[]
}

export const VQ_CADENCE_KEY = 'rb:shared:vq.cadence'

/** Minimum dwell in a tile (30s) before exiting can trigger an automatic VQ. */
export const MIN_TILE_DWELL_MS = 30_000
/** Minimum time between automatic VQs (8 minutes). */
export const AUTO_VQ_COOLDOWN_MS = 8 * 60_000
/** Extended cooldown (20 minutes) if Render skipped the last 2 VQs in a row. */
export const SKIP_BACKOFF_MS = 20 * 60_000
/** Minimum qualifying tile exits between automatic VQs. */
export const EXITS_BETWEEN_VQS = 2

const DEFAULT_CADENCE: VqCadenceState = {
  lastShownAt: 0,
  exitsSinceLast: 1, // First qualifying session can trigger once Render has actually played
  consecutiveSkips: 0,
  recentQuestionIds: [],
}

export function readVqCadence(): VqCadenceState {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_CADENCE }
    const raw = localStorage.getItem(VQ_CADENCE_KEY)
    if (!raw) return { ...DEFAULT_CADENCE }
    const parsed = JSON.parse(raw) as Partial<VqCadenceState>
    return {
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : 0,
      exitsSinceLast: typeof parsed.exitsSinceLast === 'number' ? parsed.exitsSinceLast : 0,
      consecutiveSkips: typeof parsed.consecutiveSkips === 'number' ? parsed.consecutiveSkips : 0,
      recentQuestionIds: Array.isArray(parsed.recentQuestionIds) ? parsed.recentQuestionIds.slice(0, 30) : [],
    }
  } catch {
    return { ...DEFAULT_CADENCE }
  }
}

export function writeVqCadence(state: VqCadenceState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        VQ_CADENCE_KEY,
        JSON.stringify({ ...state, recentQuestionIds: state.recentQuestionIds.slice(0, 30) }),
      )
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Decide whether exiting `exitedAppId` after `dwellMs` should show a transition VQ.
 * Pure check + updates `exitsSinceLast` cleanly in the returned next cadence state.
 */
export function evaluateTransitionVqTrigger(
  cadence: VqCadenceState,
  exitedAppId: string,
  dwellMs: number,
  now = Date.now(),
): { trigger: boolean; nextCadence: VqCadenceState } {
  // Never fire right after Progress (review screen) or very brief taps (<30s)
  if (exitedAppId === 'progress' || dwellMs < MIN_TILE_DWELL_MS) {
    return { trigger: false, nextCadence: cadence }
  }

  const nextExits = cadence.exitsSinceLast + 1
  const cooldown = cadence.consecutiveSkips >= 2 ? SKIP_BACKOFF_MS : AUTO_VQ_COOLDOWN_MS
  const elapsed = cadence.lastShownAt > 0 ? now - cadence.lastShownAt : Number.POSITIVE_INFINITY

  if (nextExits >= EXITS_BETWEEN_VQS && elapsed >= cooldown) {
    return {
      trigger: true,
      nextCadence: {
        ...cadence,
        lastShownAt: now,
        exitsSinceLast: 0,
      },
    }
  }

  return {
    trigger: false,
    nextCadence: {
      ...cadence,
      exitsSinceLast: nextExits,
    },
  }
}

export function recordVqCompletion(
  cadence: VqCadenceState,
  questionId: string,
  skipped: boolean,
  now = Date.now(),
): VqCadenceState {
  return {
    lastShownAt: now,
    exitsSinceLast: 0,
    consecutiveSkips: skipped ? cadence.consecutiveSkips + 1 : 0,
    recentQuestionIds: [questionId, ...cadence.recentQuestionIds.filter((x) => x !== questionId)].slice(0, 30),
  }
}

/** Deterministic small PRNG so tests and choice shuffles are clean and reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeChoices(correct: string, distractors: string[], rand: () => number): { choices: string[]; correctIndex: number } {
  const unique = [correct]
  for (const d of distractors) {
    if (d !== correct && !unique.includes(d)) unique.push(d)
    if (unique.length === 4) break
  }
  const arr = [...unique]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { choices: arr, correctIndex: arr.indexOf(correct) }
}

interface StaticVqSpec {
  id: string
  concept: ConceptId
  band: LevelBandId
  prompt: string
  hint?: string
  visual?: VqVisual
  correct: string
  distractors: string[]
  ccss?: string
  progressItem?: string
}

/** Curated, ultra-crisp, high-signal probes spanning all 6 subjects and PreK -> University. */
const STATIC_VQ_BANK: StaticVqSpec[] = [
  // Counting & Number Sense
  { id: 'vq:count:dots7', concept: 'counting', band: 'prek', prompt: 'How many dots?', visual: { kind: 'dots', count: 7, color: '#EF4444' }, correct: '7', distractors: ['5', '6', '8'] },
  { id: 'vq:count:dots9', concept: 'counting', band: 'prek', prompt: 'How many dots?', visual: { kind: 'dots', count: 9, color: '#F59E0B' }, correct: '9', distractors: ['7', '8', '10'] },
  { id: 'vq:count:after19', concept: 'counting', band: 'prek', prompt: '17, 18, 19, ?', correct: '20', distractors: ['16', '21', '29'] },
  { id: 'vq:ns:bigger41', concept: 'number-sense', band: 'k_2', prompt: 'Which is BIGGER?', correct: '41', distractors: ['14', '29', '38'] },
  { id: 'vq:ns:even', concept: 'number-sense', band: 'k_2', prompt: 'Which number is EVEN?', correct: '18', distractors: ['13', '15', '21'] },
  { id: 'vq:ns:half16', concept: 'number-sense', band: 'k_2', prompt: 'Half of 16 = ?', correct: '8', distractors: ['6', '7', '9'] },

  // Skip Counting & Place Value & Measurement
  { id: 'vq:skip:5s', concept: 'skip-counting', band: 'k_2', prompt: '5, 10, 15, ?', correct: '20', distractors: ['16', '25', '18'] },
  { id: 'vq:skip:3s', concept: 'skip-counting', band: 'k_2', prompt: '3, 6, 9, 12, ?', correct: '15', distractors: ['14', '16', '18'] },
  { id: 'vq:pv:3t4o', concept: 'place-value', band: 'k_2', prompt: '3 tens + 4 ones = ?', correct: '34', distractors: ['43', '7', '304'] },
  { id: 'vq:pv:200', concept: 'place-value', band: 'k_2', prompt: '2 hundreds + 5 ones = ?', correct: '205', distractors: ['25', '250', '520'] },
  { id: 'vq:meas:quarter', concept: 'measurement-time-money', band: 'k_2', prompt: '1 quarter = ? cents', correct: '25¢', distractors: ['5¢', '10¢', '50¢'] },
  { id: 'vq:meas:hour', concept: 'measurement-time-money', band: 'k_2', prompt: '1 hour = ? minutes', correct: '60', distractors: ['12', '30', '100'] },

  // Shapes & Geometry
  { id: 'vq:geo:hex', concept: 'shapes-geometry', band: 'k_2', prompt: 'How many sides on a HEXAGON?', correct: '6', distractors: ['5', '7', '8'] },
  { id: 'vq:geo:cube', concept: 'shapes-geometry', band: 'k_2', prompt: 'Faces on a CUBE?', correct: '6', distractors: ['4', '8', '12'] },
  { id: 'vq:geo:angle', concept: 'shapes-geometry', band: 'g3_5', prompt: 'A RIGHT angle = ?', correct: '90°', distractors: ['45°', '180°', '360°'] },
  { id: 'vq:geo:quad1', concept: 'shapes-geometry', band: 'g3_5', ccss: '5.G.A.1', progressItem: '(3, 4)', prompt: 'Point (3, 4) is in Quadrant ?', correct: 'I', distractors: ['II', 'III', 'IV'] },

  // Fractions & Decimals
  { id: 'vq:frac:bar12', concept: 'fractions', band: 'g3_5', prompt: 'What fraction is shaded?', visual: { kind: 'fraction', numerator: 1, denominator: 2 }, correct: '1/2', distractors: ['1/3', '1/4', '2/3'] },
  { id: 'vq:frac:bar34', concept: 'fractions', band: 'g3_5', prompt: 'What fraction is shaded?', visual: { kind: 'fraction', numerator: 3, denominator: 4 }, correct: '3/4', distractors: ['1/4', '2/3', '3/5'] },
  { id: 'vq:frac:cmp', concept: 'fractions', band: 'g3_5', prompt: 'Which is BIGGER?', correct: '1/2', distractors: ['1/4', '1/8', '1/5'] },
  { id: 'vq:frac:dec', concept: 'fractions', band: 'g3_5', prompt: '1/4 as a decimal = ?', correct: '0.25', distractors: ['0.4', '0.5', '0.75'] },

  // Algebra, Probability & Higher Math (Uncapped)
  { id: 'vq:alg:x5', concept: 'algebra-equations', band: 'g6_8', prompt: '□ + 5 = 12   →   □ = ?', correct: '7', distractors: ['6', '8', '17'] },
  { id: 'vq:alg:3n21', concept: 'algebra-equations', band: 'g6_8', prompt: '3 × n = 21   →   n = ?', correct: '7', distractors: ['6', '8', '18'] },
  { id: 'vq:alg:neg', concept: 'algebra-equations', band: 'g6_8', prompt: '4 − 9 = ?', correct: '−5', distractors: ['5', '−4', '−13'] },
  { id: 'vq:alg:pow', concept: 'algebra-equations', band: 'g6_8', prompt: '2³ = ?', correct: '8', distractors: ['6', '9', '16'] },
  { id: 'vq:prob:coin', concept: 'probability-statistics', band: 'g6_8', prompt: 'Chance of Heads on 1 fair coin?', correct: '1/2', distractors: ['1/4', '1/3', '1/6'] },
  { id: 'vq:prob:die', concept: 'probability-statistics', band: 'g6_8', prompt: 'Rolling a 6 on a 6-sided die?', correct: '1/6', distractors: ['1/2', '1/3', '6/6'] },
  { id: 'vq:deep:sqrt49', concept: 'deep-math', band: 'hs', prompt: '√49 = ?', correct: '7', distractors: ['6', '8', '24.5'] },
  { id: 'vq:deep:deriv', concept: 'deep-math', band: 'university', prompt: 'd/dx (x²) = ?', correct: '2x', distractors: ['x', 'x²', '2'] },
  { id: 'vq:deep:log', concept: 'deep-math', band: 'hs', prompt: 'log₂(8) = ?', correct: '3', distractors: ['2', '4', '16'] },

  // Reading, Phonics & ELA
  { id: 'vq:ela:rhyme', concept: 'phonics-foundations', band: 'prek', prompt: 'Which rhymes with CAT?', correct: 'HAT', distractors: ['DOG', 'CUP', 'SUN'] },
  { id: 'vq:ela:start', concept: 'phonics-foundations', band: 'prek', prompt: 'Starts with the /m/ sound?', correct: 'MOON', distractors: ['STAR', 'FISH', 'BOOK'] },
  { id: 'vq:ela:silente', concept: 'phonics-decoding', band: 'k_2', prompt: 'Add silent e to CAP → ?', correct: 'CAPE', distractors: ['CUP', 'CLAP', 'CAMP'] },
  { id: 'vq:ela:digraph', concept: 'phonics-decoding', band: 'k_2', prompt: 'Starts with SH?', correct: 'SHIP', distractors: ['CHIP', 'SKIP', 'SLIP'] },
  { id: 'vq:ela:verb', concept: 'grammar-syntax', band: 'k_2', prompt: 'Which word is a VERB (action)?', correct: 'JUMP', distractors: ['BLUE', 'TABLE', 'FAST'] },
  { id: 'vq:ela:adj', concept: 'grammar-syntax', band: 'g3_5', prompt: 'Which word is an ADJECTIVE?', correct: 'TALL', distractors: ['RUN', 'DOG', 'QUICKLY'] },
  { id: 'vq:ela:prefix', concept: 'vocabulary-reading', band: 'g3_5', prompt: 'UN + HAPPY means ?', correct: 'Not happy', distractors: ['Very happy', 'Happy again', 'Before happy'] },
  { id: 'vq:ela:root', concept: 'linguistics-writing', band: 'g6_8', prompt: 'Greek root "TELE" means ?', correct: 'Far', distractors: ['Small', 'Water', 'Time'] },

  // Science & Engineering
  { id: 'vq:sci:plant', concept: 'science-life-nature', band: 'prek', prompt: 'Plants need sunlight and ?', correct: 'Water', distractors: ['Plastic', 'Magnets', 'Metal'] },
  { id: 'vq:sci:mammal', concept: 'science-life-nature', band: 'k_2', prompt: 'Which is a MAMMAL?', correct: 'Whale', distractors: ['Shark', 'Frog', 'Eagle'] },
  { id: 'vq:sci:heart', concept: 'science-human-body', band: 'k_2', prompt: 'Which organ pumps BLOOD?', correct: 'Heart', distractors: ['Stomach', 'Skin', 'Knee'] },
  { id: 'vq:sci:melt', concept: 'science-earth-weather', band: 'k_2', prompt: 'Ice melts into ?', correct: 'Liquid water', distractors: ['Rock', 'Sand', 'Wood'] },
  { id: 'vq:sci:planet', concept: 'science-space-astronomy', band: 'k_2', prompt: 'Earth orbits the ?', correct: 'Sun', distractors: ['Moon', 'Mars', 'Jupiter'] },
  { id: 'vq:sci:redp', concept: 'science-space-astronomy', band: 'k_2', prompt: 'Which is the RED planet?', correct: 'Mars', distractors: ['Venus', 'Neptune', 'Saturn'] },
  { id: 'vq:sci:grav', concept: 'science-forces-physics', band: 'g3_5', prompt: 'What pulls a dropped ball down?', correct: 'Gravity', distractors: ['Sound', 'Light', 'Evaporation'] },
  { id: 'vq:sci:mag', concept: 'science-forces-physics', band: 'k_2', prompt: 'A magnet attracts ?', correct: 'Iron', distractors: ['Wood', 'Glass', 'Rubber'] },
  { id: 'vq:sci:h2o', concept: 'science-matter-chemistry', band: 'g3_5', prompt: 'H₂O is the formula for ?', correct: 'Water', distractors: ['Salt', 'Oxygen', 'Gold'] },
  { id: 'vq:sci:cell', concept: 'science-biology-genetics', band: 'g6_8', prompt: 'Living things are made of ?', correct: 'Cells', distractors: ['Crystals', 'Gears', 'Pixels'] },
  { id: 'vq:sci:lever', concept: 'science-engineering', band: 'g3_5', prompt: 'A seesaw is a ?', correct: 'Lever', distractors: ['Battery', 'Prism', 'Circuit'] },

  // Logic, Coding & AI
  { id: 'vq:cs:pat', concept: 'patterns-coding', band: 'prek', prompt: '🔴 🔵 🔴 🔵 🔴 ?', correct: '🔵', distractors: ['🔴', '🟢', '🟡'] },
  { id: 'vq:cs:double', concept: 'patterns-coding', band: 'k_2', prompt: '2, 4, 8, 16, ?', correct: '32', distractors: ['20', '24', '18'] },
  { id: 'vq:cs:odd', concept: 'logic-reasoning', band: 'k_2', prompt: 'Which does NOT belong?', correct: 'Chair', distractors: ['Apple', 'Banana', 'Grape'] },
  { id: 'vq:cs:analogy', concept: 'logic-reasoning', band: 'g3_5', prompt: 'Bird : Fly  ::  Fish : ?', correct: 'Swim', distractors: ['Bark', 'Drive', 'Climb'] },
  { id: 'vq:cs:bin', concept: 'computer-science', band: 'g6_8', prompt: 'Binary 101 in base 10 = ?', correct: '5', distractors: ['3', '6', '10'] },
  { id: 'vq:cs:ai', concept: 'ai-machine-learning', band: 'hs', prompt: 'Neural nets learn by adjusting ?', correct: 'Weights', distractors: ['Pixels only', 'Cables', 'Fonts'] },

  // World, Geography & History
  { id: 'vq:geo:cont', concept: 'world-geography', band: 'k_2', prompt: 'How many continents on Earth?', correct: '7', distractors: ['4', '5', '12'] },
  { id: 'vq:geo:ocean', concept: 'world-geography', band: 'g3_5', prompt: 'Largest ocean on Earth?', correct: 'Pacific', distractors: ['Arctic', 'Indian', 'Atlantic'] },
  { id: 'vq:hist:bigbang', concept: 'great-stories', band: 'g3_5', prompt: 'Came FIRST in Earth history?', correct: 'Dinosaurs', distractors: ['Pyramids', 'Airplanes', 'Printing press'] },
  { id: 'vq:hist:egypt', concept: 'world-history', band: 'g3_5', prompt: 'Great Pyramids are in ?', correct: 'Egypt', distractors: ['Japan', 'Brazil', 'Canada'] },

  // Art, Color & Music
  { id: 'vq:art:mix', concept: 'colours-sorting', band: 'prek', ccss: 'K.MD.B.3', progressItem: 'color-mix-green', prompt: 'Blue + Yellow = ?', correct: 'Green', distractors: ['Purple', 'Orange', 'Pink'] },
  { id: 'vq:art:mix2', concept: 'colours-sorting', band: 'prek', ccss: 'K.MD.B.3', progressItem: 'color-mix-orange', prompt: 'Red + Yellow = ?', correct: 'Orange', distractors: ['Green', 'Blue', 'Brown'] },
  { id: 'vq:mus:notes', concept: 'music-rhythm', band: 'k_2', prompt: 'Which instrument has KEYS?', correct: 'Piano', distractors: ['Drum', 'Violin', 'Flute'] },
  { id: 'vq:art:arch', concept: 'art-design', band: 'g3_5', prompt: 'Opposite of WARM colors?', correct: 'Cool colors', distractors: ['Loud colors', 'Tall colors', 'Fast colors'] },
]

/** Parametric generator for infinite, high-signal math-fact VQs (also feeds Progress grids!). */
function generateMathFactVq(concept: ConceptId, seed: number): ValidationQuizlet | null {
  const rand = mulberry32(seed)
  if (concept === 'addition' || concept === 'math-facts') {
    const a = 2 + Math.floor(rand() * 8) // 2..9
    const b = 1 + Math.floor(rand() * 9) // 1..9
    const ans = a + b
    const { choices, correctIndex } = makeChoices(
      String(ans),
      [String(ans + 1), String(Math.max(1, ans - 1)), String(ans + 2), String(Math.max(0, ans - 2))],
      rand,
    )
    return {
      id: `vq:add:${a}+${b}`,
      concept: 'addition',
      subject: 'math',
      band: 'k_2',
      ccss: '2.OA.B.2',
      progressItem: `${a}+${b}`,
      prompt: `${a} + ${b} = ?`,
      choices,
      correctIndex,
    }
  }

  if (concept === 'subtraction') {
    const b = 1 + Math.floor(rand() * 8) // 1..8
    const ans = 1 + Math.floor(rand() * 9) // 1..9
    const a = b + ans
    const { choices, correctIndex } = makeChoices(
      String(ans),
      [String(ans + 1), String(Math.max(0, ans - 1)), String(ans + 2), String(b)],
      rand,
    )
    return {
      id: `vq:sub:${a}-${b}`,
      concept: 'subtraction',
      subject: 'math',
      band: 'k_2',
      ccss: '2.OA.B.2',
      progressItem: `${a}−${b}`,
      prompt: `${a} − ${b} = ?`,
      choices,
      correctIndex,
    }
  }

  if (concept === 'multiplication') {
    const a = 2 + Math.floor(rand() * 10) // 2..11
    const b = 2 + Math.floor(rand() * 10) // 2..11
    const ans = a * b
    const { choices, correctIndex } = makeChoices(
      String(ans),
      [String(ans + a), String(Math.max(2, ans - b)), String(ans + 2), String(a + b)],
      rand,
    )
    return {
      id: `vq:mul:${a}x${b}`,
      concept: 'multiplication',
      subject: 'math',
      band: 'g3_5',
      ccss: '3.OA.C.7',
      progressItem: `${a}×${b}`,
      prompt: `${a} × ${b} = ?`,
      choices,
      correctIndex,
    }
  }

  if (concept === 'division') {
    const b = 2 + Math.floor(rand() * 9) // 2..10
    const ans = 2 + Math.floor(rand() * 9) // 2..10
    const a = b * ans
    const { choices, correctIndex } = makeChoices(
      String(ans),
      [String(ans + 1), String(Math.max(1, ans - 1)), String(ans + 2), String(b)],
      rand,
    )
    return {
      id: `vq:div:${a}/${b}`,
      concept: 'division',
      subject: 'math',
      band: 'g3_5',
      ccss: '3.OA.C.7',
      progressItem: `${a}÷${b}`,
      prompt: `${a} ÷ ${b} = ?`,
      choices,
      correctIndex,
    }
  }

  return null
}

function buildVqForConcept(
  concept: ConceptId,
  recentIds: readonly string[],
  seed: number,
): ValidationQuizlet | null {
  const rand = mulberry32(seed)
  const mathGen = generateMathFactVq(concept, seed)
  if (mathGen) return mathGen

  const pool = STATIC_VQ_BANK.filter((q) => q.concept === concept)
  if (pool.length === 0) return null
  const recentSet = new Set(recentIds)
  const fresh = pool.filter((q) => !recentSet.has(q.id))
  const pickFrom = fresh.length > 0 ? fresh : pool
  const spec = pickFrom[Math.floor(rand() * pickFrom.length)]
  const { choices, correctIndex } = makeChoices(spec.correct, spec.distractors, rand)
  return {
    id: spec.id,
    concept: spec.concept,
    subject: CONCEPT_BY_ID[spec.concept].subject,
    band: spec.band,
    ccss: spec.ccss,
    progressItem: spec.progressItem,
    prompt: spec.prompt,
    hint: spec.hint,
    visual: spec.visual,
    choices,
    correctIndex,
  }
}

/**
 * Adaptive Information-Gain VQ Picker:
 * Chooses the single concept whose check will maximally sharpen the observed frontier.
 *
 * Priorities:
 *  1. Frontier concepts with low confidence & uncertain pMastery (~0.30..0.75)
 *  2. Concepts Render recently watched in Proximal (exposureSeconds > 0) not yet verified
 *  3. Concepts touched in RB apps (active) with low confidence
 *  4. Uncapped upward stretch: if frontier is well-resolved, probes the nearest 'ahead' node
 *     whose prereqs are strongest so Render is never capped.
 */
export function pickNextVq(
  frontier: FrontierSnapshot,
  options: {
    recentQuestionIds?: readonly string[]
    focusSubject?: SubjectId | 'all'
    now?: number
    seed?: number
  } = {},
): ValidationQuizlet | null {
  const now = options.now ?? Date.now()
  const seed = options.seed ?? Math.floor(now % 1_000_000)
  const recentIds = options.recentQuestionIds ?? []
  const rand = mulberry32(seed + 13)

  const candidates = frontier.nodes.filter((n) => {
    if (options.focusSubject && options.focusSubject !== 'all' && n.subject !== options.focusSubject) {
      return false
    }
    return true
  })

  const scored: { concept: ConceptId; gain: number }[] = []

  for (const node of candidates) {
    // Skip concepts checked very recently (last 10 min) unless no alternatives exist
    const sinceLastVq = node.evidence.lastVqAt > 0 ? now - node.evidence.lastVqAt : Number.POSITIVE_INFINITY
    const recentVqPenalty = sinceLastVq < 10 * 60_000 ? -0.55 : sinceLastVq < 60 * 60_000 ? -0.2 : 0

    // Uncertainty peaks at pMastery = 0.50 and low confidence
    const boundaryUncertainty = 1 - Math.abs(node.pMastery - 0.5) * 2 // 0..1
    const lowConf = 1 - node.confidence

    let zoneBase = 0
    if (node.zone === 'frontier') {
      zoneBase = 0.65
    } else if (node.zone === 'ahead') {
      // Allow uncapped upward stretch probes when prereqs are partially ready
      const prereqAvg =
        node.dependsOn.length > 0
          ? node.dependsOn.reduce((s, d) => s + (frontier.byId[d]?.pMastery ?? 0), 0) / node.dependsOn.length
          : 0.5
      zoneBase = prereqAvg >= 0.55 ? 0.35 * prereqAvg : 0.05
    } else {
      // Mastered: occasional retention check only if confidence is modest
      zoneBase = node.confidence < 0.7 ? 0.18 : 0.02
    }

    // Proximal video exposure boost: watched a topic -> verify if it stuck!
    const exposureBoost =
      node.evidence.exposureSeconds >= 30 && node.confidence < 0.7 ? 0.32 : node.evidence.exposureSeconds > 0 ? 0.12 : 0

    // Active RB app practice boost
    const activeBoost = node.active && node.confidence < 0.75 ? 0.18 : 0

    const jitter = rand() * 0.08
    const gain = zoneBase + 0.3 * lowConf + 0.25 * boundaryUncertainty + exposureBoost + activeBoost + recentVqPenalty + jitter

    scored.push({ concept: node.id, gain })
  }

  scored.sort((a, b) => b.gain - a.gain)

  for (const item of scored) {
    const q = buildVqForConcept(item.concept, recentIds, seed + item.concept.length * 31)
    if (q) return q
  }
  return null
}
