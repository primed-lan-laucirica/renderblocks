import {
  BAND_BY_ID,
  CONCEPTS,
  CONCEPT_BY_ID,
  LEVEL_BANDS,
  SUBJECTS,
  SUBJECT_BY_ID,
  type ConceptMeta,
  type LevelBandMeta,
  type SubjectMeta,
} from '@renderblocks/kernel'
import type { SeedAnchorId } from '../types'

export { BAND_BY_ID, CONCEPTS, CONCEPT_BY_ID, LEVEL_BANDS, SUBJECTS, SUBJECT_BY_ID }
export type { ConceptMeta, LevelBandMeta, SubjectMeta }

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
  { id: 'homeschool-pop', label: 'Homeschool Pop', shortLabel: 'Homeschool Pop', color: '#0EA5E9', simKey: 'hp' },
]

export const ANCHOR_BY_ID: Record<SeedAnchorId, SeedAnchorMeta> = Object.fromEntries(
  SEED_ANCHORS.map((a) => [a.id, a]),
) as Record<SeedAnchorId, SeedAnchorMeta>

export function channelCollectionLabel(channelKey: string, fallbackChannel: string): string {
  if (channelKey === 'symbols-dives') return 'Symbols Deep Dives'
  if (channelKey === 'great-stories-curated') return 'Great Stories (Curated)'
  if (channelKey === 'pbs-kids') return 'PBS KIDS'
  if (channelKey === 'khan-academy') return 'Khan Academy'
  if (channelKey === 'matholia') return 'Matholia (Singapore Math)'
  if (channelKey === 'math-antics') return 'Math Antics'
  if (channelKey === 'peekaboo-kidz') return 'Peekaboo Kidz (Dr. Binocs)'
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
