import { useEffect, useMemo, useState } from 'react'
import type { GameProps, NamespacedStorage } from '@renderblocks/kernel'
import rawCatalog from './data/catalog.json'
import { CONCEPTS, SEED_ANCHORS, STAGES, channelCollectionLabel } from './data/taxonomy'
import { buildBrowseFeed, findSimilarVideos } from './engine/search'
import { Player } from './Player'
import type {
  BrowseQuery,
  ConceptId,
  FeedTab,
  LearnerState,
  ProximalCatalog,
  ProximalVideo,
  SeedAnchorId,
  StageId,
  VideoFormat,
} from './types'
import { VideoCard } from './VideoCard'

const catalog = rawCatalog as unknown as ProximalCatalog
const PAGE_SIZE = 36
const HISTORY_MAX = 150

const DEFAULT_STATE: LearnerState = {
  liked: [],
  saved: [],
  history: [],
  thumbMode: 'midpoint',
}

function readState(storage: NamespacedStorage): LearnerState {
  try {
    const raw = storage.get('learner_state_v1')
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<LearnerState>
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      thumbMode: parsed.thumbMode === 'poster' ? 'poster' : 'midpoint',
    }
  } catch {
    return DEFAULT_STATE
  }
}

export default function App({ services }: GameProps) {
  const { storage } = services
  const [learner, setLearner] = useState<LearnerState>(() => readState(storage))
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const [tab, setTab] = useState<FeedTab>('explore')
  const [search, setSearch] = useState('')
  const [anchor, setAnchor] = useState<SeedAnchorId | 'all'>('all')
  const [concept, setConcept] = useState<ConceptId | 'all'>('all')
  const [stage, setStage] = useState<StageId | 'all'>('all')
  const [format, setFormat] = useState<VideoFormat | 'all'>('all')
  const [channelKey, setChannelKey] = useState<string | 'all'>('all')
  const [similarToId, setSimilarToId] = useState<string | null>(null)
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => Math.floor(Date.now() % 1_000_000))
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    storage.set('learner_state_v1', JSON.stringify(learner))
  }, [storage, learner])

  // Hardware back button: close Player first, then clear similarity filter, else exit to RenderBlocks home
  useEffect(
    () =>
      services.onBack(() => {
        if (activeVideoId) {
          setActiveVideoId(null)
          return true
        }
        if (similarToId) {
          setSimilarToId(null)
          return true
        }
        return false
      }),
    [services, activeVideoId, similarToId],
  )

  const videoById = useMemo(() => new Map(catalog.videos.map((v) => [v.id, v])), [])

  const channelOptions = useMemo(() => {
    const counts = new Map<string, { key: string; label: string; count: number; role: string }>()
    for (const v of catalog.videos) {
      const prev = counts.get(v.channelKey)
      if (prev) prev.count++
      else {
        counts.set(v.channelKey, {
          key: v.channelKey,
          label: channelCollectionLabel(v.channelKey, v.channel),
          count: 1,
          role: v.role,
        })
      }
    }
    return [...counts.values()].sort((a, b) => (a.role === b.role ? b.count - a.count : a.role === 'seed' ? -1 : 1))
  }, [])

  const query: BrowseQuery = useMemo(
    () => ({
      tab,
      search,
      anchor,
      concept,
      stage,
      format,
      channelKey,
      similarToId,
      shuffleSeed,
    }),
    [tab, search, anchor, concept, stage, format, channelKey, similarToId, shuffleSeed],
  )

  const cards = useMemo(() => buildBrowseFeed(catalog.videos, query, learner), [query, learner])

  const likedSet = useMemo(() => new Set(learner.liked), [learner.liked])
  const savedSet = useMemo(() => new Set(learner.saved), [learner.saved])
  const watchedSet = useMemo(() => new Set(learner.history.map((h) => h.id)), [learner.history])

  const toggleLike = (id: string) => {
    setLearner((prev) => ({
      ...prev,
      liked: prev.liked.includes(id) ? prev.liked.filter((x) => x !== id) : [id, ...prev.liked],
    }))
  }

  const toggleSave = (id: string) => {
    setLearner((prev) => ({
      ...prev,
      saved: prev.saved.includes(id) ? prev.saved.filter((x) => x !== id) : [id, ...prev.saved],
    }))
  }

  const openVideo = (v: ProximalVideo) => {
    const now = Date.now()
    setLearner((prev) => ({
      ...prev,
      history: [{ id: v.id, at: now }, ...prev.history.filter((h) => h.id !== v.id)].slice(0, HISTORY_MAX),
    }))
    // Log exploratory watch evidence to shared RenderBlocks progress log (no `ok` field since exploratory)
    services.progress.record({
      concept: v.concepts[0] ?? 'number-sense',
      item: `watch:${v.id}`,
      how: 'watch',
    })
    setActiveVideoId(v.id)
  }

  const resetFilters = () => {
    setSearch('')
    setAnchor('all')
    setConcept('all')
    setStage('all')
    setFormat('all')
    setChannelKey('all')
    setSimilarToId(null)
    setTab('explore')
    setVisibleCount(PAGE_SIZE)
  }

  const activeVideo = activeVideoId ? videoById.get(activeVideoId) ?? null : null
  if (activeVideo) {
    const related = findSimilarVideos(catalog.videos, activeVideo.id, undefined, 8)
    const nearestSeed = videoById.get(activeVideo.nearestSeedId)
    return (
      <Player
        video={activeVideo}
        nearestSeed={nearestSeed}
        related={related}
        thumbMode={learner.thumbMode}
        liked={likedSet.has(activeVideo.id)}
        saved={savedSet.has(activeVideo.id)}
        onBack={() => setActiveVideoId(null)}
        onSelectVideo={openVideo}
        onToggleLike={toggleLike}
        onToggleSave={toggleSave}
        onExploreSimilar={(v) => {
          setSimilarToId(v.id)
          setActiveVideoId(null)
          setVisibleCount(PAGE_SIZE)
        }}
      />
    )
  }

  const similarTarget = similarToId ? videoById.get(similarToId) ?? null : null
  const hasActiveFilter =
    search.trim() !== '' ||
    anchor !== 'all' ||
    concept !== 'all' ||
    stage !== 'all' ||
    format !== 'all' ||
    channelKey !== 'all' ||
    similarToId !== null ||
    tab !== 'explore'

  const shownCards = cards.slice(0, visibleCount)

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-slate-100 select-none overflow-hidden" data-proximal-home>
      {/* Top header & search */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 pt-2.5 pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={services.exitToHome}
            aria-label="Back to RenderBlocks home"
            className="h-10 w-10 shrink-0 rounded-full bg-slate-800 hover:bg-slate-700 text-lg font-bold flex items-center justify-center"
          >
            ←
          </button>

          <div className="flex items-baseline gap-2 mr-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">Proximal</h1>
            <span className="hidden md:inline text-xs font-semibold text-slate-400">
              {cards.length} / {catalog.totalVideos} videos
            </span>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSimilarToId(null)
                setVisibleCount(PAGE_SIZE)
              }}
              placeholder="Search topics, math facts, channels, skills…"
              className="w-full h-10 rounded-full bg-slate-950 border border-slate-700 focus:border-sky-400 pl-4 pr-9 text-sm text-white placeholder:text-slate-500 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Shuffle & Midpoint thumbnail toggle */}
          <button
            type="button"
            onClick={() => {
              setShuffleSeed((s) => s + 1)
              setVisibleCount(PAGE_SIZE)
            }}
            title="Deal a fresh mix"
            className="h-10 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 px-3.5 text-xs font-extrabold text-sky-200 shrink-0"
          >
            ↻ Shuffle
          </button>

          <button
            type="button"
            onClick={() =>
              setLearner((prev) => ({
                ...prev,
                thumbMode: prev.thumbMode === 'midpoint' ? 'poster' : 'midpoint',
              }))
            }
            title="Switch between 50% mid-video frames (no clickbait) and uploaded posters"
            className="hidden sm:inline-flex items-center h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 text-xs font-bold text-slate-200 shrink-0"
          >
            {learner.thumbMode === 'midpoint' ? '🎞 50% Frame' : '🖼 Poster'}
          </button>
        </div>

        {/* Navigation tabs + Seed Anchor lens */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(
            [
              { id: 'explore', label: 'Explore' },
              { id: 'seeds', label: `Seeds (${catalog.seedCount})` },
              { id: 'discover', label: `Discover (${catalog.candidateCount})` },
              { id: 'liked', label: `♥ Liked (${learner.liked.length})` },
              { id: 'saved', label: `Later (${learner.saved.length})` },
              { id: 'history', label: `History (${learner.history.length})` },
            ] as { id: FeedTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                setSimilarToId(null)
                setVisibleCount(PAGE_SIZE)
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${
                tab === t.id ? 'bg-white text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-slate-700 shrink-0" />

          {/* 4 Seed Reference Anchor pills */}
          <button
            type="button"
            onClick={() => {
              setAnchor('all')
              setVisibleCount(PAGE_SIZE)
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              anchor === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Seeds
          </button>
          {SEED_ANCHORS.map((a) => {
            const active = anchor === a.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAnchor(active ? 'all' : a.id)
                  setVisibleCount(PAGE_SIZE)
                }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: active ? a.color : `${a.color}20`,
                  color: active ? '#FFFFFF' : '#E2E8F0',
                  border: `1px solid ${active ? a.color : `${a.color}55`}`,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#FFF' : a.color }} />
                {a.shortLabel}
              </button>
            )
          })}
        </div>

        {/* Concept chips + Channel / Stage / Format selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <select
            aria-label="Filter by channel"
            value={channelKey}
            onChange={(e) => {
              setChannelKey(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            className="h-7 rounded-full bg-slate-800 border border-slate-700 px-2.5 text-xs font-bold text-slate-200 shrink-0 outline-none"
          >
            <option value="all">All Channels ({channelOptions.length})</option>
            {channelOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.role === 'seed' ? '★ ' : ''}
                {c.label} ({c.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by stage"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value as StageId | 'all')
              setVisibleCount(PAGE_SIZE)
            }}
            className="h-7 rounded-full bg-slate-800 border border-slate-700 px-2.5 text-xs font-bold text-slate-200 shrink-0 outline-none"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by format"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as VideoFormat | 'all')
              setVisibleCount(PAGE_SIZE)
            }}
            className="h-7 rounded-full bg-slate-800 border border-slate-700 px-2.5 text-xs font-bold text-slate-200 shrink-0 outline-none"
          >
            <option value="all">Episodes + Packs</option>
            <option value="episode">Single Episodes</option>
            <option value="compilation">Compilations / Packs</option>
          </select>

          <span className="mx-0.5 h-4 w-px bg-slate-800 shrink-0" />

          {CONCEPTS.map((c) => {
            const active = concept === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setConcept(active ? 'all' : c.id)
                  setVisibleCount(PAGE_SIZE)
                }}
                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: active ? c.color : '#1E293B',
                  color: active ? '#FFFFFF' : '#CBD5E1',
                  border: `1px solid ${active ? c.color : '#334155'}`,
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Active similarity neighborhood banner */}
        {similarTarget && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-950/70 border border-indigo-500/50 px-3 py-1.5 text-xs">
            <span className="truncate text-indigo-200">
              ✦ Showing videos most similar to <strong className="text-white">“{similarTarget.title}”</strong> ({similarTarget.channel})
            </span>
            <button
              type="button"
              onClick={() => setSimilarToId(null)}
              className="shrink-0 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 px-2.5 py-0.5 font-bold text-white"
            >
              Clear ✕
            </button>
          </div>
        )}
      </header>

      {/* Scrollable thumbnail dashboard */}
      <main className="flex-1 overflow-y-auto px-3 py-3">
        {shownCards.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <p className="text-base font-bold text-slate-300">No videos match these filters yet.</p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-extrabold text-slate-950"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {shownCards.map((card) => (
                <VideoCard
                  key={card.video.id}
                  card={card}
                  thumbMode={learner.thumbMode}
                  liked={likedSet.has(card.video.id)}
                  saved={savedSet.has(card.video.id)}
                  watched={watchedSet.has(card.video.id)}
                  onPlay={openVideo}
                  onToggleLike={toggleLike}
                  onToggleSave={toggleSave}
                  onMoreLikeThis={(v) => {
                    setSimilarToId(v.id)
                    setVisibleCount(PAGE_SIZE)
                  }}
                />
              ))}
            </div>

            {visibleCount < cards.length && (
              <div className="mt-6 mb-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 px-6 py-2.5 text-sm font-extrabold text-white shadow"
                >
                  Show more ({cards.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
