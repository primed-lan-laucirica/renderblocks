/**
 * Shared Uncapped Multi-Subject Curriculum Taxonomy & DAG (PreK -> University)
 *
 * Single source of truth used across:
 *  - Kernel app-wide Validation Quizlets (VQs)
 *  - Progress tile (frontier overview + CCSS integration)
 *  - Proximal ranking algorithm (ZPD + per-subject level bands)
 */

export type SubjectId = 'math' | 'ela' | 'science' | 'cs-logic' | 'world-history' | 'arts-music'

export type LevelBandId = 'prek' | 'k_2' | 'g3_5' | 'g6_8' | 'hs' | 'university'

export type ConceptId =
  // Mathematics
  | 'counting'
  | 'number-sense'
  | 'skip-counting'
  | 'addition'
  | 'subtraction'
  | 'math-facts'
  | 'place-value'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'shapes-geometry'
  | 'measurement-time-money'
  | 'algebra-equations'
  | 'probability-statistics'
  | 'deep-math'
  // Reading, Phonics & Language (ELA)
  | 'phonics-foundations'
  | 'phonics-decoding'
  | 'grammar-syntax'
  | 'vocabulary-reading'
  | 'linguistics-writing'
  // Science & Engineering
  | 'science-life-nature'
  | 'science-human-body'
  | 'science-earth-weather'
  | 'science-space-astronomy'
  | 'science-forces-physics'
  | 'science-matter-chemistry'
  | 'science-biology-genetics'
  | 'science-engineering'
  // Logic, Coding & AI
  | 'patterns-coding'
  | 'logic-reasoning'
  | 'computer-science'
  | 'ai-machine-learning'
  // World, Geography & History
  | 'world-geography'
  | 'great-stories'
  | 'world-history'
  // Art, Color & Music
  | 'colours-sorting'
  | 'music-rhythm'
  | 'art-design'

export type ConceptOverride = 'mastered' | 'frontier'

export interface SubjectMeta {
  id: SubjectId
  label: string
  shortLabel: string
  color: string
}

export const SUBJECTS: SubjectMeta[] = [
  { id: 'math', label: 'Mathematics', shortLabel: 'Math', color: '#EF4444' },
  { id: 'science', label: 'Science & Engineering', shortLabel: 'Science', color: '#10B981' },
  { id: 'ela', label: 'Reading, Phonics & ELA', shortLabel: 'Reading & ELA', color: '#EC4899' },
  { id: 'cs-logic', label: 'Logic, Coding & AI', shortLabel: 'Logic & AI', color: '#8B5CF6' },
  { id: 'world-history', label: 'World, Geography & History', shortLabel: 'World & History', color: '#F59E0B' },
  { id: 'arts-music', label: 'Art, Color & Music', shortLabel: 'Art & Music', color: '#06B6D4' },
]

export const SUBJECT_BY_ID: Record<SubjectId, SubjectMeta> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
) as Record<SubjectId, SubjectMeta>

export interface LevelBandMeta {
  id: LevelBandId
  label: string
  shortLabel: string
  order: number
}

export const LEVEL_BANDS: LevelBandMeta[] = [
  { id: 'prek', label: 'Preschool (PreK)', shortLabel: 'PreK', order: 0 },
  { id: 'k_2', label: 'Early Primary (K–2)', shortLabel: 'K–2', order: 1 },
  { id: 'g3_5', label: 'Upper Elementary (3–5)', shortLabel: 'Gr 3–5', order: 2 },
  { id: 'g6_8', label: 'Middle School (6–8)', shortLabel: 'Gr 6–8', order: 3 },
  { id: 'hs', label: 'High School (9–12)', shortLabel: 'High School', order: 4 },
  { id: 'university', label: 'University & Frontier', shortLabel: 'University', order: 5 },
]

export const BAND_BY_ID: Record<LevelBandId, LevelBandMeta> = Object.fromEntries(
  LEVEL_BANDS.map((b) => [b.id, b]),
) as Record<LevelBandId, LevelBandMeta>

export interface ConceptMeta {
  id: ConceptId
  subject: SubjectId
  label: string
  color: string
  synonyms: string[]
  /** Typical entry level band order (0 = PreK .. 5 = University) for band estimation. */
  typicalBand: number
  /** Optional Common Core code so VQs also feed Progress tile grids/counts. */
  ccss?: string
}

export const CONCEPTS: ConceptMeta[] = [
  // Mathematics
  { id: 'counting', subject: 'math', label: 'Counting & Numbers', color: '#EF4444', typicalBand: 0, synonyms: ['count', 'numbers', '1 to 10', '1 to 20', '1 to 100', 'tally', 'ordinal', 'numerals'] },
  { id: 'number-sense', subject: 'math', label: 'Number Sense', color: '#F97316', typicalBand: 0.5, synonyms: ['subitize', 'subitizing', 'ten frame', 'number bonds', 'number line', 'even', 'odd', 'greater than', 'less than', 'compare'] },
  { id: 'skip-counting', subject: 'math', label: 'Skip Counting', color: '#10B981', typicalBand: 1, synonyms: ['twos', 'fives', 'tens', 'threes', 'count by'] },
  { id: 'addition', subject: 'math', label: 'Addition', color: '#EA580C', typicalBand: 1, ccss: '2.OA.B.2', synonyms: ['add', 'adding', 'plus', 'sum', 'sums', 'make 10', 'doubles'] },
  { id: 'subtraction', subject: 'math', label: 'Subtraction', color: '#06B6D4', typicalBand: 1.2, ccss: '2.OA.B.2', synonyms: ['subtract', 'minus', 'take away', 'difference', 'regrouping'] },
  { id: 'math-facts', subject: 'math', label: 'Math Facts', color: '#D97706', typicalBand: 1.5, synonyms: ['drills', 'flashcards', 'fluency', 'fact family', 'meet the math facts', 'mental math'] },
  { id: 'place-value', subject: 'math', label: 'Place Value', color: '#0284C7', typicalBand: 1.2, synonyms: ['ones', 'tens', 'hundreds', 'base 10', 'teen numbers', 'expanded form', 'rounding', 'roman numerals'] },
  { id: 'multiplication', subject: 'math', label: 'Multiplication & Primes', color: '#16A34A', typicalBand: 2, ccss: '3.OA.C.7', synonyms: ['multiply', 'times tables', 'arrays', 'square numbers', 'squares', 'factors', 'multiples', 'prime'] },
  { id: 'division', subject: 'math', label: 'Division', color: '#E11D48', typicalBand: 2.2, ccss: '3.OA.C.7', synonyms: ['divide', 'quotient', 'remainder', 'sharing', 'long division'] },
  { id: 'fractions', subject: 'math', label: 'Fractions & Decimals', color: '#9333EA', typicalBand: 2.5, synonyms: ['half', 'halves', 'quarters', 'thirds', 'numerator', 'denominator', 'decimals', 'percent', 'ratios'] },
  { id: 'shapes-geometry', subject: 'math', label: 'Shapes & Geometry', color: '#2563EB', typicalBand: 0.8, ccss: '5.G.A.1', synonyms: ['triangle', 'square', 'circle', 'rectangle', 'polygon', '2d', '3d', 'cube', 'angles', 'perimeter', 'area', 'symmetry', 'trigonometry', 'fractal'] },
  { id: 'measurement-time-money', subject: 'math', label: 'Time, Money & Data', color: '#0D9488', typicalBand: 1.2, synonyms: ['clock', 'telling time', 'hours', 'minutes', 'coins', 'pennies', 'nickels', 'dimes', 'dollars', 'ruler', 'inches', 'graphs', 'calendar'] },
  { id: 'algebra-equations', subject: 'math', label: 'Algebra & Functions', color: '#4F46E5', typicalBand: 3.5, synonyms: ['algebra', 'equations', 'variables', 'integers', 'negative numbers', 'exponents', 'quadratics', 'polynomials', 'logarithms'] },
  { id: 'probability-statistics', subject: 'math', label: 'Probability & Stats', color: '#7C3AED', typicalBand: 3.5, synonyms: ['probability', 'statistics', 'bayes', 'distribution', 'combinatorics', 'statquest', 'random'] },
  { id: 'deep-math', subject: 'math', label: 'Calculus & Higher Math', color: '#CA8A04', typicalBand: 4.8, synonyms: ['calculus', 'derivatives', 'integrals', 'vectors', 'matrices', 'linear algebra', 'infinity', 'proofs', '3blue1brown', 'fourier', 'topology'] },

  // Reading, Phonics & Language (ELA)
  { id: 'phonics-foundations', subject: 'ela', label: 'Letter Sounds & CVC', color: '#EC4899', typicalBand: 0, synonyms: ['alphablocks', 'alphabet', 'letters', 'phonics', 'letter sounds', 'cvc', 'rhyming', 'short vowels'] },
  { id: 'phonics-decoding', subject: 'ela', label: 'Digraphs, Blends & Decoding', color: '#DB2777', typicalBand: 1, synonyms: ['digraphs', 'blends', 'silent e', 'magic e', 'vowel teams', 'r-controlled', 'sight words', 'nessy', 'decoding', 'spelling'] },
  { id: 'grammar-syntax', subject: 'ela', label: 'Grammar & Syntax', color: '#BE185D', typicalBand: 1.5, synonyms: ['grammar', 'nouns', 'verbs', 'adjectives', 'adverbs', 'punctuation', 'sentences', 'clauses', 'parts of speech'] },
  { id: 'vocabulary-reading', subject: 'ela', label: 'Vocab, Roots & Reading', color: '#F472B6', typicalBand: 2.2, synonyms: ['vocabulary', 'prefixes', 'suffixes', 'roots', 'morphology', 'reading', 'comprehension', 'fables', 'poetry', 'literature'] },
  { id: 'linguistics-writing', subject: 'ela', label: 'Linguistics & Etymology', color: '#9D174D', typicalBand: 3.8, synonyms: ['etymology', 'linguistics', 'writing systems', 'cuneiform', 'hieroglyphs', 'history of english', 'robwords', 'nativlang'] },

  // Science & Engineering
  { id: 'science-life-nature', subject: 'science', label: 'Plants, Animals & Habitats', color: '#10B981', typicalBand: 0.5, synonyms: ['animals', 'plants', 'dinosaurs', 'insects', 'habitats', 'ecosystems', 'food chain', 'life cycle', 'photosynthesis', 'pollination', 'wildlife'] },
  { id: 'science-human-body', subject: 'science', label: 'Human Body & Health', color: '#EF4444', typicalBand: 0.8, synonyms: ['human body', 'senses', 'brain', 'heart', 'lungs', 'skeleton', 'immune system', 'bacteria', 'sleep', 'nutrition'] },
  { id: 'science-earth-weather', subject: 'science', label: 'Earth, Weather & Fossils', color: '#059669', typicalBand: 1, synonyms: ['weather', 'seasons', 'water cycle', 'volcanoes', 'earthquakes', 'rocks', 'fossils', 'landforms', 'oceans', 'tectonics', 'geology'] },
  { id: 'science-space-astronomy', subject: 'science', label: 'Space & Astronomy', color: '#6366F1', typicalBand: 1, synonyms: ['solar system', 'planets', 'sun', 'moon', 'stars', 'galaxies', 'black holes', 'big bang', 'astronauts', 'rockets', 'universe', 'cosmology'] },
  { id: 'science-forces-physics', subject: 'science', label: 'Forces, Light, Sound & Physics', color: '#0284C7', typicalBand: 1.8, synonyms: ['forces', 'gravity', 'magnets', 'simple machines', 'energy', 'electricity', 'light', 'sound', 'waves', 'physics', 'quantum', 'relativity'] },
  { id: 'science-matter-chemistry', subject: 'science', label: 'Matter & Chemistry', color: '#14B8A6', typicalBand: 2, synonyms: ['matter', 'solids', 'liquids', 'gases', 'atoms', 'molecules', 'periodic table', 'chemistry', 'chemical reaction', 'elements'] },
  { id: 'science-biology-genetics', subject: 'science', label: 'Cells, DNA & Evolution', color: '#16A34A', typicalBand: 3.2, synonyms: ['cells', 'dna', 'genetics', 'evolution', 'natural selection', 'mitosis', 'biology', 'crispr', 'amoeba sisters'] },
  { id: 'science-engineering', subject: 'science', label: 'Engineering & How Things Work', color: '#D97706', typicalBand: 1.8, synonyms: ['engineering', 'inventions', 'robots', 'bridges', 'airplanes', 'design', 'experiments', 'machines', 'mark rober'] },

  // Logic, Coding & AI
  { id: 'patterns-coding', subject: 'cs-logic', label: 'Patterns & Early Coding', color: '#8B5CF6', typicalBand: 0.5, synonyms: ['patterns', 'sequences', 'loops', 'again', 'debugging', 'do blocks', 'go and stop', 'wonderblocks', 'coding'] },
  { id: 'logic-reasoning', subject: 'cs-logic', label: 'Logic, Analogies & Puzzles', color: '#7C3AED', typicalBand: 1, synonyms: ['logic', 'puzzles', 'riddles', 'paradox', 'analogies', 'classification', 'sorting', 'odd one out', 'problem solving'] },
  { id: 'computer-science', subject: 'cs-logic', label: 'Computer Science & Algorithms', color: '#6D28D9', typicalBand: 3.2, synonyms: ['computer science', 'algorithms', 'binary', 'cpu', 'internet', 'cryptography', 'programming', 'computerphile', 'data structures'] },
  { id: 'ai-machine-learning', subject: 'cs-logic', label: 'AI & Machine Learning', color: '#4C1D95', typicalBand: 4.5, synonyms: ['ai', 'artificial intelligence', 'machine learning', 'neural networks', 'deep learning', 'transformers', 'llm', 'gradient descent'] },

  // World, Geography & History
  { id: 'world-geography', subject: 'world-history', label: 'Geography & Communities', color: '#F59E0B', typicalBand: 1, synonyms: ['geography', 'maps', 'continents', 'oceans', 'countries', 'states', 'communities', 'landmarks', 'around the world'] },
  { id: 'great-stories', subject: 'world-history', label: 'Great Stories & Origins', color: '#D97706', typicalBand: 1.5, synonyms: ['great stories', 'great lessons', 'cosmic education', 'big history', 'timeline of life', 'origin of universe', 'story of numbers', 'story of writing'] },
  { id: 'world-history', subject: 'world-history', label: 'World History & Civics', color: '#B45309', typicalBand: 2.5, synonyms: ['history', 'ancient egypt', 'ancient greece', 'ancient rome', 'medieval', 'civilizations', 'explorers', 'economics', 'government', 'civics'] },

  // Art, Color & Music
  { id: 'colours-sorting', subject: 'arts-music', label: 'Colors & Visual Perception', color: '#F43F5E', typicalBand: 0, ccss: 'K.MD.B.3', synonyms: ['colourblocks', 'colors', 'colours', 'rainbow', 'color mixing', 'primary colors'] },
  { id: 'music-rhythm', subject: 'arts-music', label: 'Music, Rhythm & Theory', color: '#06B6D4', typicalBand: 1, synonyms: ['music', 'rhythm', 'melody', 'chords', 'instruments', 'composers', 'orchestra', 'music theory', '12tone'] },
  { id: 'art-design', subject: 'arts-music', label: 'Art, Drawing & Architecture', color: '#0891B2', typicalBand: 1.8, synonyms: ['art', 'art history', 'painting', 'sculpture', 'drawing', 'architecture', 'artists', 'smarthistory'] },
]

export const CONCEPT_BY_ID: Record<ConceptId, ConceptMeta> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
) as Record<ConceptId, ConceptMeta>

export interface ConceptDagNode {
  id: ConceptId
  subject: SubjectId
  layer: number
  dependsOn: ConceptId[]
}

export const CONCEPT_DAG: ConceptDagNode[] = [
  // Layer 0 — Foundational Entry across all 6 subjects (open from day 1)
  { id: 'counting', subject: 'math', layer: 0, dependsOn: [] },
  { id: 'shapes-geometry', subject: 'math', layer: 0, dependsOn: [] },
  { id: 'phonics-foundations', subject: 'ela', layer: 0, dependsOn: [] },
  { id: 'science-life-nature', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-human-body', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-earth-weather', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-space-astronomy', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'patterns-coding', subject: 'cs-logic', layer: 0, dependsOn: [] },
  { id: 'logic-reasoning', subject: 'cs-logic', layer: 0, dependsOn: [] },
  { id: 'world-geography', subject: 'world-history', layer: 0, dependsOn: [] },
  { id: 'colours-sorting', subject: 'arts-music', layer: 0, dependsOn: [] },
  { id: 'music-rhythm', subject: 'arts-music', layer: 0, dependsOn: [] },

  // Layer 1 — Early Structure, Decoding, Physical Science & Origins
  { id: 'number-sense', subject: 'math', layer: 1, dependsOn: ['counting'] },
  { id: 'skip-counting', subject: 'math', layer: 1, dependsOn: ['counting'] },
  { id: 'phonics-decoding', subject: 'ela', layer: 1, dependsOn: ['phonics-foundations'] },
  { id: 'grammar-syntax', subject: 'ela', layer: 1, dependsOn: ['phonics-foundations'] },
  { id: 'science-forces-physics', subject: 'science', layer: 1, dependsOn: ['science-earth-weather'] },
  { id: 'science-matter-chemistry', subject: 'science', layer: 1, dependsOn: ['science-earth-weather'] },
  { id: 'science-engineering', subject: 'science', layer: 1, dependsOn: ['patterns-coding'] },
  { id: 'great-stories', subject: 'world-history', layer: 1, dependsOn: ['world-geography'] },
  { id: 'art-design', subject: 'arts-music', layer: 1, dependsOn: ['colours-sorting'] },

  // Layer 2 — Additive Reasoning, Base-10, Vocab & World History
  { id: 'addition', subject: 'math', layer: 2, dependsOn: ['counting', 'number-sense'] },
  { id: 'place-value', subject: 'math', layer: 2, dependsOn: ['counting', 'number-sense'] },
  { id: 'measurement-time-money', subject: 'math', layer: 2, dependsOn: ['counting'] },
  { id: 'vocabulary-reading', subject: 'ela', layer: 2, dependsOn: ['phonics-decoding'] },
  { id: 'science-biology-genetics', subject: 'science', layer: 2, dependsOn: ['science-life-nature'] },
  { id: 'world-history', subject: 'world-history', layer: 2, dependsOn: ['world-geography'] },

  // Layer 3 — Subtraction, Fluency & Computing Foundations
  { id: 'subtraction', subject: 'math', layer: 3, dependsOn: ['addition'] },
  { id: 'math-facts', subject: 'math', layer: 3, dependsOn: ['addition', 'subtraction'] },
  { id: 'computer-science', subject: 'cs-logic', layer: 3, dependsOn: ['patterns-coding', 'logic-reasoning'] },
  { id: 'linguistics-writing', subject: 'ela', layer: 3, dependsOn: ['vocabulary-reading'] },

  // Layer 4 — Multiplicative Reasoning & Rational Numbers
  { id: 'multiplication', subject: 'math', layer: 4, dependsOn: ['addition', 'skip-counting'] },
  { id: 'division', subject: 'math', layer: 4, dependsOn: ['multiplication', 'subtraction'] },
  { id: 'fractions', subject: 'math', layer: 4, dependsOn: ['division', 'place-value'] },

  // Layer 5 — Secondary, University & Frontier (Uncapped)
  { id: 'algebra-equations', subject: 'math', layer: 5, dependsOn: ['fractions', 'multiplication'] },
  { id: 'probability-statistics', subject: 'math', layer: 5, dependsOn: ['fractions'] },
  { id: 'deep-math', subject: 'math', layer: 5, dependsOn: ['algebra-equations'] },
  { id: 'ai-machine-learning', subject: 'cs-logic', layer: 5, dependsOn: ['computer-science', 'probability-statistics'] },
]

export const DAG_BY_ID: Record<ConceptId, ConceptDagNode> = Object.fromEntries(
  CONCEPT_DAG.map((n) => [n.id, n]),
) as Record<ConceptId, ConceptDagNode>
