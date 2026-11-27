import type { ConceptId, ConceptOverride, LevelBandId, SubjectId } from '@renderblocks/kernel'

export type { ConceptId, ConceptOverride, LevelBandId, SubjectId }

export type SeedAnchorId = 'numberblocks' | 'wonderblocks' | 'preschool-prep' | 'homeschool-pop'

export type VideoFormat = 'episode' | 'compilation'
export type VideoRole = 'seed' | 'candidate'

export interface AnchorSims {
  nb: number
  wb: number
  pp: number
  hp: number
}

export interface ProximalVideo {
  id: string
  title: string
  channel: string
  channelKey: string
  role: VideoRole
  subjects: SubjectId[]
  primarySubject: SubjectId
  levelBand: LevelBandId
  seedAnchor: SeedAnchorId
  nearestSeedId: string
  seedSim: number
  anchorSims: AnchorSims
  score: number
  duration: number
  format: VideoFormat
  concepts: ConceptId[]
  needs: ConceptId[]
  views: number
  related: string[]
  seasonal?: boolean
  start?: number
  end?: number
  symbolsRanks?: number[]
  summary?: string
}

export interface ProximalCatalog {
  generatedAt: string
  model: string
  vecDim?: number
  vectorsB64?: string
  queryProtos?: Record<string, string>
  totalVideos: number
  seedCount: number
  candidateCount: number
  videos: ProximalVideo[]
}

export type FeedTab = 'frontier' | 'explore' | 'seeds' | 'discover' | 'liked' | 'saved' | 'history'
export type ThumbnailMode = 'midpoint' | 'poster'

export interface WatchEntry {
  id: string
  at: number
  /** Observed dwell seconds inside Player. */
  dwellSec?: number
  /** True if video reached YouTube ENDED state or >=80% duration. */
  completed?: boolean
  /** True if learner exited in <15s (soft negative signal for ranker). */
  bailedFast?: boolean
}

export interface LearnerState {
  liked: string[]
  saved: string[]
  history: WatchEntry[]
  thumbMode: ThumbnailMode
  conceptOverrides: Partial<Record<ConceptId, ConceptOverride>>
}

export interface BrowseQuery {
  tab: FeedTab
  search: string
  subject: SubjectId | 'all'
  anchor: SeedAnchorId | 'all'
  concept: ConceptId | 'all'
  levelBand: LevelBandId | 'all'
  format: VideoFormat | 'all'
  channelKey: string | 'all'
  similarToId?: string | null
  shuffleSeed: number
}

export interface RankBreakdown {
  total: number
  zpd: number
  bandFit: number
  explore: number
  taste: number
  quality: number
  penalty: number
  pMastery: number
  confidence: number
  leadConcept: ConceptId
}

export interface FeedCard {
  video: ProximalVideo
  reason?: string
  frontierBadge?: boolean
  rank?: RankBreakdown
}
