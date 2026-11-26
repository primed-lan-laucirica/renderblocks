export type SeedAnchorId = 'numberblocks' | 'wonderblocks' | 'preschool-prep' | 'homeschool-pop'

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

export type FeedTab = 'explore' | 'frontier' | 'seeds' | 'discover' | 'liked' | 'saved' | 'history'
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
  subject: SubjectId | 'all'
  anchor: SeedAnchorId | 'all'
  concept: ConceptId | 'all'
  levelBand: LevelBandId | 'all'
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
