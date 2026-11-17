export type SeedAnchorId = 'numberblocks' | 'wonderblocks' | 'preschool-prep' | 'homeschool-pop'

export type ChannelGroupId =
  | 'seed'
  | 'structured_k5'
  | 'visual_story'
  | 'fluency_songs'
  | 'learningblocks_siblings'
  | 'symbols_bridge'

export type ConceptId =
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
  | 'patterns-coding'
  | 'phonics-reading'
  | 'colours-sorting'
  | 'deep-math'

export type StageId = 'preschool' | 'primary' | 'elementary' | 'horizon'
export type VideoFormat = 'episode' | 'compilation'
export type VideoRole = 'seed' | 'candidate'
export type ConceptOverride = 'mastered' | 'frontier'

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
  group: ChannelGroupId
  seedAnchor: SeedAnchorId
  nearestSeedId: string
  seedSim: number
  anchorSims: AnchorSims
  score: number
  duration: number
  format: VideoFormat
  stage: StageId
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
  anchor: SeedAnchorId | 'all'
  concept: ConceptId | 'all'
  stage: StageId | 'all'
  format: VideoFormat | 'all'
  channelKey: string | 'all'
  similarToId?: string | null
  shuffleSeed: number
}

export interface FeedCard {
  video: ProximalVideo
  reason?: string
  frontierBadge?: boolean
}
