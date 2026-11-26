import { ANCHOR_BY_ID, BAND_BY_ID, CONCEPTS, CONCEPT_BY_ID, SUBJECT_BY_ID, SUBJECTS } from '../data/taxonomy'
import type {
  BrowseQuery,
  ConceptId,
  FeedCard,
  LearnerState,
  ProximalCatalog,
  ProximalVideo,
  SeedAnchorId,
  SubjectId,
} from '../types'
import { evaluateVideoFrontier, type FrontierSnapshot } from './frontier'
import { buildQueryVector, buildVideoCentroid, dotRow, getVectorIndex, type VectorIndex } from './vectors'

/** Deterministic PRNG (Mulberry32) so shuffle seeds produce stable, testable feeds. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'kids',
  'learn',
  'learning',
  'video',
  'videos',
  'how',
  'what',
  'from',
  'that',
  'this',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[+]/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
}

/** Expand query into matching concept IDs via concept labels and synonyms. */
export function inferQueryConcepts(rawQuery: string): Set<ConceptId> {
  const q = rawQuery.toLowerCase().trim()
  const tokens = tokenize(q)
  const matched = new Set<ConceptId>()
  if (!q) return matched

  for (const c of CONCEPTS) {
    if (q.includes(c.id.replace(/-/g, ' ')) || q.includes(c.label.toLowerCase())) {
      matched.add(c.id)
      continue
    }
    for (const syn of c.synonyms) {
      if (syn.includes(' ') ? q.includes(syn) : tokens.some((t) => syn === t || (t.length >= 4 && syn.startsWith(t)))) {
        matched.add(c.id)
        break
      }
    }
  }
  return matched
}

function anchorSimValue(v: ProximalVideo, anchor: SeedAnchorId | 'all'): number {
  if (anchor === 'all') return v.seedSim
  const key = ANCHOR_BY_ID[anchor].simKey
  return v.anchorSims[key]
}

export function matchesFilters(v: ProximalVideo, query: BrowseQuery, state: LearnerState): boolean {
  if (query.tab === 'seeds' && v.role !== 'seed') return false
  if (query.tab === 'discover' && v.role !== 'candidate') return false
  if (query.tab === 'liked' && !state.liked.includes(v.id)) return false
  if (query.tab === 'saved' && !state.saved.includes(v.id)) return false
  if (query.tab === 'history' && !state.history.some((h) => h.id === v.id)) return false

  if (query.subject !== 'all' && !v.subjects.includes(query.subject)) return false

  if (query.anchor !== 'all') {
    if (v.role === 'seed') {
      if (v.seedAnchor !== query.anchor) return false
    } else if (v.seedAnchor !== query.anchor && anchorSimValue(v, query.anchor) < 0.78) {
      return false
    }
  }

  if (query.concept !== 'all' && !v.concepts.includes(query.concept)) return false
  if (query.levelBand !== 'all' && v.levelBand !== query.levelBand) return false
  if (query.format !== 'all' && v.format !== query.format) return false
  if (query.channelKey !== 'all' && v.channelKey !== query.channelKey) return false

  return true
}

/**
 * Hybrid BM25F lexical + concept-synonym + 64-D prototype vector semantic search.
 */
export function searchVideos(
  videos: readonly ProximalVideo[],
  rawQuery: string,
  anchor: SeedAnchorId | 'all' = 'all',
  vecIndex?: VectorIndex | null,
): FeedCard[] {
  const qNorm = rawQuery.toLowerCase().trim()
  const qTokens = tokenize(qNorm)
  const expandedConcepts = inferQueryConcepts(qNorm)
  const qVec = vecIndex ? buildQueryVector(vecIndex, qTokens) : null
  if (!qTokens.length && !expandedConcepts.size && !qVec) return []

  const scored: { video: ProximalVideo; total: number; reason: string }[] = []

  for (const v of videos) {
    const titleLower = v.title.toLowerCase()
    const channelLower = v.channel.toLowerCase()
    const summaryLower = (v.summary ?? '').toLowerCase()
    const titleTokens = tokenize(v.title)
    const channelTokens = tokenize(v.channel)
    const summaryTokens = tokenize(v.summary ?? '')

    let lexScore = 0
    let matchedTokens = 0

    if (qNorm.length >= 3 && titleLower.includes(qNorm)) {
      lexScore += 6.0
    } else if (qNorm.length >= 3 && channelLower.includes(qNorm)) {
      lexScore += 4.0
    } else if (qNorm.length >= 4 && summaryLower.includes(qNorm)) {
      lexScore += 2.0
    }

    for (const qt of qTokens) {
      let tokenHit = 0
      if (titleTokens.some((t) => t === qt)) tokenHit = Math.max(tokenHit, 3.5)
      else if (qt.length >= 3 && titleTokens.some((t) => t.startsWith(qt))) tokenHit = Math.max(tokenHit, 2.4)

      if (channelTokens.some((t) => t === qt || (qt.length >= 3 && t.startsWith(qt)))) {
        tokenHit = Math.max(tokenHit, 2.5)
      }
      if (summaryTokens.some((t) => t === qt || (qt.length >= 4 && t.startsWith(qt)))) {
        tokenHit += 1.1
      }
      if (v.concepts.some((cid) => cid.includes(qt) || (CONCEPT_BY_ID[cid]?.label.toLowerCase().includes(qt) ?? false))) {
        tokenHit += 2.2
      }

      if (tokenHit > 0) {
        matchedTokens++
        lexScore += tokenHit
      }
    }

    let conceptBoost = 0
    let matchedConceptLabel = ''
    for (const cid of expandedConcepts) {
      if (v.concepts.includes(cid)) {
        conceptBoost += 3.2
        if (!matchedConceptLabel) matchedConceptLabel = CONCEPT_BY_ID[cid]?.label ?? cid
      }
    }

    let semScore = 0
    if (qVec && vecIndex) {
      const row = vecIndex.idToRow.get(v.id)
      if (row !== undefined) {
        const cos = dotRow(vecIndex, row, qVec)
        if (cos > 0.34) semScore = cos * 4.0
      }
    }

    if (matchedTokens === 0 && conceptBoost === 0 && semScore < 1.65) continue
    if (qTokens.length >= 2 && conceptBoost === 0 && semScore < 1.8 && matchedTokens < Math.ceil(qTokens.length * 0.6)) {
      continue
    }

    const coverage = qTokens.length > 0 ? matchedTokens / qTokens.length : 1
    const sim = anchorSimValue(v, anchor)
    const total = (lexScore * (0.6 + 0.4 * coverage) + conceptBoost + semScore) * (0.82 + 0.18 * sim) + v.score * 0.015

    const bandShort = BAND_BY_ID[v.levelBand]?.shortLabel ?? v.levelBand
    const subjShort = SUBJECT_BY_ID[v.primarySubject]?.shortLabel ?? v.primarySubject
    const reason = matchedConceptLabel
      ? `${matchedConceptLabel} · ${bandShort}`
      : semScore >= 1.65 && matchedTokens === 0
        ? `Semantic match · ${subjShort} · ${bandShort}`
        : `${subjShort} · ${bandShort}`

    scored.push({ video: v, total, reason })
  }

  scored.sort((a, b) => b.total - a.total)
  return scored.map(({ video, reason }) => ({ video, reason }))
}

/**
 * Similarity explorer ("More Like This"): combines precomputed 384-D k-NN edges with
 * on-device 64-D cosine similarity across the entire candidate pool.
 */
export function findSimilarVideos(
  allVideos: readonly ProximalVideo[],
  targetId: string,
  pool?: readonly ProximalVideo[],
  limit = 36,
  vecIndex?: VectorIndex | null,
): FeedCard[] {
  const byId = new Map(allVideos.map((v) => [v.id, v]))
  const target = byId.get(targetId)
  if (!target) return []

  const allowed = pool ? new Set(pool.map((v) => v.id)) : null
  const out: FeedCard[] = []
  const seen = new Set<string>([targetId])

  for (const relId of target.related) {
    if (seen.has(relId) || (allowed && !allowed.has(relId))) continue
    const cand = byId.get(relId)
    if (!cand) continue
    seen.add(relId)
    out.push({ video: cand, reason: `Similar to "${truncate(target.title, 28)}"` })
  }

  const targetCentroid = vecIndex ? buildVideoCentroid(vecIndex, [targetId]) : null
  const targetConcepts = new Set(target.concepts)

  const candidates = (pool ?? allVideos).filter((v) => !seen.has(v.id))
  const ranked = candidates.map((v) => {
    let vecCos = 0
    if (targetCentroid && vecIndex) {
      const row = vecIndex.idToRow.get(v.id)
      if (row !== undefined) vecCos = dotRow(vecIndex, row, targetCentroid)
    }

    let sharedConcepts = 0
    for (const c of v.concepts) if (targetConcepts.has(c)) sharedConcepts++
    const sameBandBonus = v.levelBand === target.levelBand ? 0.08 : 0
    const sameSubjectBonus = v.primarySubject === target.primarySubject ? 0.06 : 0
    const crossChannelBonus = v.channelKey !== target.channelKey ? 0.04 : 0

    const rankScore =
      0.62 * vecCos +
      0.22 * (sharedConcepts / Math.max(1, target.concepts.length)) +
      sameBandBonus +
      sameSubjectBonus +
      crossChannelBonus
    return { v, rankScore, vecCos }
  })

  ranked.sort((a, b) => b.rankScore - a.rankScore)
  for (const { v, vecCos } of ranked) {
    if (out.length >= limit) break
    out.push({
      video: v,
      reason:
        vecCos > 0.45
          ? `Vector neighbor of "${truncate(target.title, 22)}"`
          : `${SUBJECT_BY_ID[v.primarySubject]?.shortLabel ?? v.primarySubject} · ${BAND_BY_ID[v.levelBand]?.shortLabel ?? v.levelBand}`,
    })
  }

  return out
}

/** Interleave items so no single channel dominates consecutive thumbnails when browsing broadly. */
export function diversifyChannels(cards: readonly FeedCard[], maxRun = 2): FeedCard[] {
  const remaining = [...cards]
  const out: FeedCard[] = []
  while (remaining.length > 0) {
    const len = out.length
    const blockedKey =
      len >= maxRun && out.slice(len - maxRun).every((c) => c.video.channelKey === out[len - 1].video.channelKey)
        ? out[len - 1].video.channelKey
        : null

    let pickIdx = 0
    if (blockedKey) {
      const altIdx = remaining.findIndex((c) => c.video.channelKey !== blockedKey)
      if (altIdx >= 0) pickIdx = altIdx
    }
    out.push(remaining.splice(pickIdx, 1)[0])
  }
  return out
}

function buildTasteCentroid(vecIndex: VectorIndex | null, state: LearnerState): Float32Array | null {
  if (!vecIndex) return null
  const ids: string[] = []
  const weights: number[] = []
  for (const id of state.liked.slice(0, 12)) {
    ids.push(id)
    weights.push(1.6)
  }
  for (const h of state.history.slice(0, 12)) {
    if (!ids.includes(h.id)) {
      ids.push(h.id)
      weights.push(0.8)
    }
  }
  return ids.length > 0 ? buildVideoCentroid(vecIndex, ids, weights) : null
}

/**
 * Dynamic Feed Builder across all 6 uncapped subjects (PreK -> University):
 * - `frontier`: ZPD videos matching the learner's active learning frontier
 * - `explore`: Multi-subject balanced mix (Math, Science, Reading/ELA, Logic/AI, World/History, Art/Music)
 * - Plus `seeds`, `discover`, `liked`, `saved`, `history`, `search`, and `similarToId`
 */
export function buildBrowseFeed(
  catalogOrVideos: ProximalCatalog | readonly ProximalVideo[],
  query: BrowseQuery,
  state: LearnerState,
  frontier?: FrontierSnapshot,
): FeedCard[] {
  const isCatalog = 'videos' in catalogOrVideos
  const allVideos: readonly ProximalVideo[] = isCatalog ? catalogOrVideos.videos : catalogOrVideos
  const vecIndex = isCatalog ? getVectorIndex(catalogOrVideos) : null

  const byId = new Map(allVideos.map((v) => [v.id, v]))
  const filtered = allVideos.filter((v) => matchesFilters(v, query, state))

  if (query.similarToId) {
    return findSimilarVideos(allVideos, query.similarToId, filtered, 80, vecIndex)
  }

  if (query.search.trim().length > 0) {
    return searchVideos(filtered, query.search, query.anchor, vecIndex)
  }

  if (query.tab === 'history') {
    const allowed = new Set(filtered.map((v) => v.id))
    const out: FeedCard[] = []
    for (const h of state.history) {
      if (!allowed.has(h.id)) continue
      const v = byId.get(h.id)
      if (v) out.push({ video: v, reason: 'Watched recently' })
    }
    return out
  }

  if (query.tab === 'liked' || query.tab === 'saved') {
    const ids = query.tab === 'liked' ? state.liked : state.saved
    const allowed = new Set(filtered.map((v) => v.id))
    const label = query.tab === 'liked' ? 'Liked' : 'Saved for later'
    return ids
      .filter((id) => allowed.has(id))
      .map((id) => byId.get(id))
      .filter((v): v is ProximalVideo => Boolean(v))
      .map((video) => ({ video, reason: label }))
  }

  const rand = mulberry32(query.shuffleSeed)
  const watchedSet = new Set(state.history.map((h) => h.id))
  const tasteCentroid = buildTasteCentroid(vecIndex, state)

  // Learning Frontier ZPD tab
  if (query.tab === 'frontier' && frontier) {
    const proximalScored: { card: FeedCard; rankVal: number }[] = []
    for (const v of filtered) {
      const res = evaluateVideoFrontier(v, frontier)
      if (!res.proximal) continue
      const sim = anchorSimValue(v, query.anchor)
      let tasteBonus = 0
      if (tasteCentroid && vecIndex) {
        const row = vecIndex.idToRow.get(v.id)
        if (row !== undefined) tasteBonus = Math.max(0, dotRow(vecIndex, row, tasteCentroid)) * 0.1
      }
      const unseenBoost = watchedSet.has(v.id) ? -0.14 : 0.04
      const jitter = (rand() - 0.5) * 0.06
      const rankVal = res.fitScore + 0.25 * sim + v.score * 0.002 + tasteBonus + unseenBoost + jitter
      proximalScored.push({
        card: { video: v, reason: res.reason, frontierBadge: true },
        rankVal,
      })
    }
    proximalScored.sort((a, b) => b.rankVal - a.rankVal)
    const cards = proximalScored.map((x) => x.card)
    return query.channelKey === 'all' ? diversifyChannels(cards, 2) : cards
  }

  // Focused filter or Seeds / Discover tab
  if (
    query.tab === 'seeds' ||
    query.tab === 'discover' ||
    query.channelKey !== 'all' ||
    query.concept !== 'all' ||
    query.subject !== 'all' ||
    query.levelBand !== 'all'
  ) {
    const ranked = filtered
      .map((v) => {
        const sim = anchorSimValue(v, query.anchor)
        const epBoost = query.format === 'all' ? (v.format === 'episode' ? 0.05 : -0.04) : 0
        const seasonalPen = v.seasonal ? -0.09 : 0
        const unseenBoost = watchedSet.has(v.id) ? -0.04 : 0.02
        const jitter = (rand() - 0.5) * 0.05
        const sortVal = v.score * 0.01 + sim * 0.35 + epBoost + seasonalPen + unseenBoost + jitter
        const subj = SUBJECT_BY_ID[v.primarySubject]?.shortLabel ?? v.primarySubject
        const band = BAND_BY_ID[v.levelBand]?.shortLabel ?? v.levelBand
        const reason = v.role === 'seed' ? `Seed · ${subj} · ${band}` : `${subj} · ${band}`
        return { video: v, reason, sortVal }
      })
      .sort((a, b) => b.sortVal - a.sortVal)
      .map(({ video, reason }) => ({ video, reason }))

    return query.channelKey === 'all' ? diversifyChannels(ranked, 2) : ranked
  }

  // Default "Explore" Dashboard Mixer: balanced across all 6 subjects + personal taste + standalone-first
  const allowedIds = new Set(filtered.map((v) => v.id))
  const personalCards: FeedCard[] = []
  const positiveSeeds = [...state.liked.slice(0, 6), ...state.history.slice(0, 6).map((h) => h.id)]
  for (const srcId of positiveSeeds) {
    const srcVideo = byId.get(srcId)
    if (!srcVideo) continue
    for (const relId of srcVideo.related) {
      if (!allowedIds.has(relId) || watchedSet.has(relId)) continue
      const cand = byId.get(relId)
      if (cand && !cand.seasonal) {
        personalCards.push({ video: cand, reason: `Because you watched ${srcVideo.channel}` })
      }
    }
  }

  // Round-robin queues across all 6 subjects so Explore represents the entire uncapped multi-subject corpus
  const queuesBySubject = new Map<SubjectId, FeedCard[]>()
  for (const s of SUBJECTS) {
    const list = filtered.filter((v) => v.primarySubject === s.id)
    const ranked = list
      .map((v) => {
        const epBoost = v.format === 'episode' ? 0.08 : -0.06
        const seasonalPen = v.seasonal ? -0.12 : 0
        let tasteBoost = 0
        if (tasteCentroid && vecIndex) {
          const row = vecIndex.idToRow.get(v.id)
          if (row !== undefined) tasteBoost = Math.max(0, dotRow(vecIndex, row, tasteCentroid)) * 0.1
        }
        const unseen = watchedSet.has(v.id) ? -0.05 : 0.02
        const jitter = (rand() - 0.5) * 0.08
        const key = v.score * 0.01 + epBoost + seasonalPen + tasteBoost + unseen + jitter
        return { v, key }
      })
      .sort((a, b) => b.key - a.key)

    const topPool = ranked.slice(0, Math.min(80, ranked.length))
    const restPool = ranked.slice(topPool.length)
    const ordered = [...seededShuffle(topPool, query.shuffleSeed + s.id.length * 17), ...restPool]
    queuesBySubject.set(
      s.id,
      ordered.map(({ v }) => ({
        video: v,
        reason: `${s.shortLabel} · ${BAND_BY_ID[v.levelBand]?.shortLabel ?? v.levelBand}`,
      })),
    )
  }

  const seen = new Set<string>()
  const merged: FeedCard[] = []
  const takeNext = (q: FeedCard[] | undefined): FeedCard | null => {
    if (!q) return null
    while (q.length > 0) {
      const next = q.shift()!
      if (!seen.has(next.video.id)) {
        seen.add(next.video.id)
        return next
      }
    }
    return null
  }

  const pQueue = seededShuffle(personalCards, query.shuffleSeed + 7)
  const subjectCycle: SubjectId[] = ['math', 'science', 'ela', 'cs-logic', 'world-history', 'arts-music']
  let anyLeft = true
  while (anyLeft) {
    anyLeft = false
    const pCard = takeNext(pQueue)
    if (pCard) {
      merged.push(pCard)
      anyLeft = true
    }
    for (const sid of subjectCycle) {
      const card = takeNext(queuesBySubject.get(sid))
      if (card) {
        merged.push(card)
        anyLeft = true
      }
    }
  }

  for (const v of filtered) {
    if (!seen.has(v.id)) {
      seen.add(v.id)
      merged.push({
        video: v,
        reason: `${SUBJECT_BY_ID[v.primarySubject]?.shortLabel ?? v.primarySubject} · ${BAND_BY_ID[v.levelBand]?.shortLabel ?? v.levelBand}`,
      })
    }
  }

  return diversifyChannels(merged, 2)
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`
}
