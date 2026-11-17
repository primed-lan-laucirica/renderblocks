import type { ChannelGroupId, ConceptId, SeedAnchorId, StageId } from '../types'

export interface SeedAnchorMeta {
  id: SeedAnchorId
  label: string
  shortLabel: string
  color: string
  simKey: 'nb' | 'wb' | 'pp' | 'hp'
}

export const SEED_ANCHORS: SeedAnchorMeta[] = [
  { id: 'numberblocks', label: 'Numberblocks', shortLabel: 'Numberblocks', color: '#EF4444', simKey: 'nb' },
  { id: 'wonderblocks', label: 'Wonderblocks', shortLabel: 'Wonderblocks', color: '#8B5CF6', simKey: 'wb' },
  { id: 'preschool-prep', label: 'Preschool & Primary Prep', shortLabel: 'Preschool Prep', color: '#F59E0B', simKey: 'pp' },
  { id: 'homeschool-pop', label: 'Homeschool Pop Math', shortLabel: 'Homeschool Pop', color: '#0EA5E9', simKey: 'hp' },
]

export const ANCHOR_BY_ID: Record<SeedAnchorId, SeedAnchorMeta> = Object.fromEntries(
  SEED_ANCHORS.map((a) => [a.id, a]),
) as Record<SeedAnchorId, SeedAnchorMeta>

export interface ConceptMeta {
  id: ConceptId
  label: string
  color: string
  synonyms: string[]
}

export const CONCEPTS: ConceptMeta[] = [
  { id: 'counting', label: 'Counting & Numbers', color: '#EF4444', synonyms: ['count', 'numbers', '1 to 10', '1 to 20', '1 to 100', 'tally', 'ordinal', 'numerals'] },
  { id: 'number-sense', label: 'Number Sense', color: '#F97316', synonyms: ['subitize', 'subitizing', 'ten frame', 'number bonds', 'number line', 'even', 'odd', 'greater than', 'less than', 'compare'] },
  { id: 'addition', label: 'Addition', color: '#EA580C', synonyms: ['add', 'adding', 'plus', 'sum', 'sums', 'make 10', 'doubles'] },
  { id: 'subtraction', label: 'Subtraction', color: '#06B6D4', synonyms: ['subtract', 'minus', 'take away', 'difference', 'regrouping'] },
  { id: 'math-facts', label: 'Math Facts', color: '#D97706', synonyms: ['drills', 'flashcards', 'fluency', 'fact family', 'meet the math facts', 'mental math'] },
  { id: 'skip-counting', label: 'Skip Counting', color: '#10B981', synonyms: ['twos', 'fives', 'tens', 'threes', 'count by'] },
  { id: 'place-value', label: 'Place Value', color: '#0284C7', synonyms: ['ones', 'tens', 'hundreds', 'base 10', 'teen numbers', 'expanded form', 'rounding', 'roman numerals'] },
  { id: 'multiplication', label: 'Multiplication', color: '#16A34A', synonyms: ['multiply', 'times tables', 'arrays', 'square numbers', 'squares', 'factors', 'multiples', 'prime'] },
  { id: 'division', label: 'Division', color: '#E11D48', synonyms: ['divide', 'quotient', 'remainder', 'sharing', 'long division'] },
  { id: 'fractions', label: 'Fractions & Decimals', color: '#9333EA', synonyms: ['half', 'halves', 'quarters', 'thirds', 'numerator', 'denominator', 'decimals', 'percent', 'ratios'] },
  { id: 'shapes-geometry', label: 'Shapes & Geometry', color: '#2563EB', synonyms: ['triangle', 'square', 'circle', 'rectangle', 'polygon', '2d', '3d', 'cube', 'angles', 'perimeter', 'area', 'symmetry'] },
  { id: 'measurement-time-money', label: 'Time & Money', color: '#0D9488', synonyms: ['clock', 'telling time', 'hours', 'minutes', 'coins', 'pennies', 'nickels', 'dimes', 'dollars', 'ruler', 'inches', 'graphs'] },
  { id: 'patterns-coding', label: 'Patterns & Coding', color: '#7C3AED', synonyms: ['sequences', 'loops', 'again', 'debugging', 'do blocks', 'go and stop', 'logic', 'algorithms', 'wonderblocks'] },
  { id: 'phonics-reading', label: 'Phonics', color: '#EC4899', synonyms: ['alphablocks', 'letters', 'reading', 'spelling', 'vowels', 'blending'] },
  { id: 'colours-sorting', label: 'Colours & Sorting', color: '#F43F5E', synonyms: ['colourblocks', 'colors', 'rainbow', 'mixing', 'sorting'] },
  { id: 'deep-math', label: 'Higher Math', color: '#CA8A04', synonyms: ['algebra', 'calculus', 'derivatives', 'integrals', 'vectors', 'matrices', 'probability', 'infinity', 'proofs', '3blue1brown', 'symbols'] },
]

export const CONCEPT_BY_ID: Record<ConceptId, ConceptMeta> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
) as Record<ConceptId, ConceptMeta>

export const STAGES: { id: StageId; label: string }[] = [
  { id: 'preschool', label: 'Preschool' },
  { id: 'primary', label: 'Primary (K–2)' },
  { id: 'elementary', label: 'Elementary (3–5)' },
  { id: 'horizon', label: 'Upper Horizon' },
]

export const GROUP_LABELS: Record<ChannelGroupId, string> = {
  seed: 'Reference Seeds',
  structured_k5: 'Structured K–5 Math',
  visual_story: 'Visual Story & Pattern Math',
  fluency_songs: 'Math Facts & Songs',
  learningblocks_siblings: 'Learning Blocks Universe',
  symbols_bridge: 'Symbols Deep Dives',
}

export function channelCollectionLabel(channelKey: string, fallbackChannel: string): string {
  if (channelKey === 'symbols-dives') return 'Symbols Deep Dives'
  if (channelKey === 'pbs-kids-math') return 'PBS KIDS Math'
  if (channelKey === 'khan-math') return 'Khan Academy Math'
  if (channelKey === 'matholia') return 'Matholia (Singapore Math)'
  if (channelKey === 'math-antics') return 'Math Antics'
  return fallbackChannel
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Midpoint (50%) frame thumbnail URL (Karpathy HackerTube anti-clickbait convention),
 * with standard poster URL as fallback.
 */
export function thumbnailUrl(videoId: string, mode: 'midpoint' | 'poster'): string {
  return mode === 'midpoint'
    ? `https://i.ytimg.com/vi/${videoId}/hq2.jpg`
    : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
