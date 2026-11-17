import { ANCHOR_BY_ID, CONCEPTS, CONCEPT_BY_ID } from '../data/taxonomy'
import type { BrowseQuery, ConceptId, FeedCard, LearnerState, ProximalVideo, SeedAnchorId } from '../types'

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
    if (q.includes(c.id.replace('-', ' ')) || q.includes(c.label.toLowerCase())) {
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

  if (query.anchor !== 'all') {
    // Seed videos belong to their own anchor; candidate videos match if this anchor is their top match or very strong (>= 0.80)
    if (v.role === 'seed') {
      if (v.seedAnchor !== query.anchor) return false
    } else if (v.seedAnchor !== query.anchor && anchorSimValue(v, query.anchor) < 0.8) {
      return false
    }
  }

  if (query.concept !== 'all' && !v.concepts.includes(query.concept)) return false
  if (query.stage !== 'all' && v.stage !== query.stage) return false
  if (query.format !== 'all' && v.format !== query.format) return false
  if (query.channelKey !== 'all' && v.channelKey !== query.channelKey) return false

  return true
}

/**
 * Hybrid BM25F-style weighted lexical + concept-synonym + seed-similarity search.
 */
export function searchVideos(videos: readonly ProximalVideo[], rawQuery: string, anchor: SeedAnchorId | 'all' = 'all'): FeedCard[] {
  const qNorm = rawQuery.toLowerCase().trim()
  const qTokens = tokenize(qNorm)
  const expandedConcepts = inferQueryConcepts(qNorm)
  if (!qTokens.length && !expandedConcepts.size) return []

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
      if (v.concepts.some((cid) => cid.includes(qt) || CONCEPT_BY_ID[cid].label.toLowerCase().includes(qt))) {
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
        if (!matchedConceptLabel) matchedConceptLabel = CONCEPT_BY_ID[cid].label
      }
    }

    if (matchedTokens === 0 && conceptBoost === 0) continue
    // If multiple query tokens were entered and no concept expansion hit, require majority token coverage
    if (qTokens.length >= 2 && conceptBoost === 0 && matchedTokens < Math.ceil(qTokens.length * 0.6)) {
      continue
    }

    const coverage = qTokens.length > 0 ? matchedTokens / qTokens.length : 1
    const sim = anchorSimValue(v, anchor)
    // Scale relevance by quality + seed similarity (HackerTube principle: quality reorders hits without pushing off-topic items up)
    const total = (lexScore * (0.6 + 0.4 * coverage) + conceptBoost) * (0.72 + 0.28 * sim) + v.score * 0.015

    const reason = matchedConceptLabel
      ? `${matchedConceptLabel} · ${Math.round(sim * 100)}% seed match`
      : `${ANCHOR_BY_ID[v.seedAnchor].shortLabel} match (${Math.round(sim * 100)}%)`

    scored.push({ video: v, total, reason })
  }

  scored.sort((a, b) => b.total - a.total)
  return scored.map(({ video, reason }) => ({ video, reason }))
}

/**
 * Similarity explorer ("More Like This"): walks precomputed k-NN embedding neighbors first,
 * followed by videos sharing concepts & high anchor profile similarity.
 */
export function findSimilarVideos(
  allVideos: readonly ProximalVideo[],
  targetId: string,
  pool?: readonly ProximalVideo[],
  limit = 36,
): FeedCard[] {
  const byId = new Map(allVideos.map((v) => [v.id, v]))
  const target = byId.get(targetId)
  if (!target) return []

  const allowed = pool ? new Set(pool.map((v) => v.id)) : null
  const out: FeedCard[] = []
  const seen = new Set<string>([targetId])

  // 1. Direct neural k-NN neighbors
  for (const relId of target.related) {
    if (seen.has(relId) || (allowed && !allowed.has(relId))) continue
    const cand = byId.get(relId)
    if (!cand) continue
    seen.add(relId)
    out.push({ video: cand, reason: `Similar to "${truncate(target.title, 28)}"` })
  }

  // 2. Second-hop neural neighbors & concept/anchor profile cosine proximity
  const targetVec = [target.anchorSims.nb, target.anchorSims.wb, target.anchorSims.pp, target.anchorSims.hp]
  const targetConcepts = new Set(target.concepts)
  const twoHopSet = new Set<string>()
  for (const relId of target.related) {
    const n1 = byId.get(relId)
    if (n1) for (const r2 of n1.related) twoHopSet.add(r2)
  }

  const candidates = (pool ?? allVideos).filter((v) => !seen.has(v.id))
  const ranked = candidates.map((v) => {
    const vec = [v.anchorSims.nb, v.anchorSims.wb, v.anchorSims.pp, v.anchorSims.hp]
    const profileDot = vec[0] * targetVec[0] + vec[1] * targetVec[1] + vec[2] * targetVec[2] + vec[3] * targetVec[3]
    const normA = Math.hypot(...targetVec) || 1
    const normB = Math.hypot(...vec) || 1
    const profileCos = profileDot / (normA * normB)

    let sharedConcepts = 0
    for (const c of v.concepts) if (targetConcepts.has(c)) sharedConcepts++
    const twoHopBonus = twoHopSet.has(v.id) ? 0.35 : 0
    const sameStageBonus = v.stage === target.stage ? 0.12 : 0
    const crossChannelBonus = v.channelKey !== target.channelKey ? 0.05 : 0

    const rankScore = twoHopBonus + 0.45 * profileCos + 0.25 * (sharedConcepts / Math.max(1, target.concepts.length)) + sameStageBonus + crossChannelBonus + v.seedSim * 0.15
    return { v, rankScore, twoHop: twoHopSet.has(v.id) }
  })

  ranked.sort((a, b) => b.rankScore - a.rankScore)
  for (const { v, twoHop } of ranked) {
    if (out.length >= limit) break
    out.push({
      video: v,
      reason: twoHop ? `Connected to "${truncate(target.title, 24)}"` : `Matches ${ANCHOR_BY_ID[v.seedAnchor].shortLabel}`,
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

/**
 * Dynamic Home Mixer (adapted from HackerTube's local-session ForYou feed):
 * Blends Reference Seeds, Personal Similarities (from local likes/history),
 * High-Similarity Candidate Discoveries, and Unexplored Concepts.
 */
export function buildBrowseFeed(
  allVideos: readonly ProximalVideo[],
  query: BrowseQuery,
  state: LearnerState,
): FeedCard[] {
  const byId = new Map(allVideos.map((v) => [v.id, v]))
  const filtered = allVideos.filter((v) => matchesFilters(v, query, state))

  // 1. Explicit "More Like This" similarity mode
  if (query.similarToId) {
    return findSimilarVideos(allVideos, query.similarToId, filtered, 80)
  }

  // 2. Explicit text search
  if (query.search.trim().length > 0) {
    return searchVideos(filtered, query.search, query.anchor)
  }

  // 3. History tab: preserve most-recent-first watch order
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

  // 4. Liked / Saved tabs: preserve newest-saved order
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

  // 5. Focused filter or Seeds / Discover tab: rank by anchor similarity + seeded jitter for variety
  const rand = mulberry32(query.shuffleSeed)
  const watchedSet = new Set(state.history.map((h) => h.id))

  if (query.tab === 'seeds' || query.tab === 'discover' || query.channelKey !== 'all' || query.concept !== 'all') {
    const ranked = filtered
      .map((v) => {
        const sim = anchorSimValue(v, query.anchor)
        const unseenBoost = watchedSet.has(v.id) ? -0.04 : 0.02
        const jitter = (rand() - 0.5) * 0.05
        const sortVal = sim + v.score * 0.002 + unseenBoost + jitter
        const reason =
          v.role === 'seed'
            ? `Seed · ${ANCHOR_BY_ID[v.seedAnchor].shortLabel}`
            : `${Math.round(sim * 100)}% like ${ANCHOR_BY_ID[v.seedAnchor].shortLabel}`
        return { video: v, reason, sortVal }
      })
      .sort((a, b) => b.sortVal - a.sortVal)
      .map(({ video, reason }) => ({ video, reason }))

    return query.channelKey === 'all' ? diversifyChannels(ranked, 2) : ranked
  }

  // 6. Default "Explore" Home Dashboard Mixer:
  //    Bucket A: Personal neighbor picks from liked + recent watches
  //    Bucket B: Balanced Reference Seeds across all 4 anchors
  //    Bucket C: Top Seed-Matched Candidate Discoveries
  //    Bucket D: Unexplored Concepts serendipity
  const allowedIds = new Set(filtered.map((v) => v.id))
  const personalCards: FeedCard[] = []
  const positiveSeeds = [...state.liked.slice(0, 6), ...state.history.slice(0, 6).map((h) => h.id)]
  for (const srcId of positiveSeeds) {
    const srcVideo = byId.get(srcId)
    if (!srcVideo) continue
    for (const relId of srcVideo.related) {
      if (!allowedIds.has(relId) || watchedSet.has(relId)) continue
      const cand = byId.get(relId)
      if (cand) {
        personalCards.push({ video: cand, reason: `Because you watched ${srcVideo.channel}` })
      }
    }
  }

  const seedsByAnchor = new Map<SeedAnchorId, ProximalVideo[]>()
  for (const v of filtered) {
    if (v.role !== 'seed') continue
    const list = seedsByAnchor.get(v.seedAnchor) ?? []
    list.push(v)
    seedsByAnchor.set(v.seedAnchor, list)
  }
  for (const [k, list] of seedsByAnchor) {
    // Take top half + shuffled mix so Shuffle button refreshes seed picks
    const sorted = [...list].sort((a, b) => (watchedSet.has(a.id) ? 1 : 0) - (watchedSet.has(b.id) ? 1 : 0) || b.score - a.score)
    seedsByAnchor.set(k, seededShuffle(sorted.slice(0, Math.max(24, Math.ceil(sorted.length * 0.7))), query.shuffleSeed + k.length))
  }
  const seedQueue: FeedCard[] = []
  const anchorKeys: SeedAnchorId[] = ['numberblocks', 'wonderblocks', 'preschool-prep', 'homeschool-pop']
  let round = 0
  while (seedQueue.length < 160) {
    let added = false
    for (const ak of anchorKeys) {
      const item = seedsByAnchor.get(ak)?.[round]
      if (item) {
        seedQueue.push({ video: item, reason: `Reference · ${ANCHOR_BY_ID[ak].shortLabel}` })
        added = true
      }
    }
    if (!added) break
    round++
  }

  const candidateSorted = filtered
    .filter((v) => v.role === 'candidate')
    .map((v) => {
      const sim = anchorSimValue(v, query.anchor)
      const unseen = watchedSet.has(v.id) ? -0.05 : 0.02
      const jitter = (rand() - 0.5) * 0.045
      return { v, key: sim + v.score * 0.0015 + unseen + jitter, sim }
    })
    .sort((a, b) => b.key - a.key)

  const discoveryQueue: FeedCard[] = candidateSorted.map(({ v, sim }) => ({
    video: v,
    reason: `${Math.round(sim * 100)}% match · ${ANCHOR_BY_ID[v.seedAnchor].shortLabel}`,
  }))

  // Unexplored concepts serendipity
  const watchedConcepts = new Set<ConceptId>()
  for (const h of state.history) {
    const hv = byId.get(h.id)
    if (hv) for (const c of hv.concepts) watchedConcepts.add(c)
  }
  const unexploredQueue: FeedCard[] = seededShuffle(
    filtered.filter((v) => v.stage !== 'horizon' && v.concepts.some((c) => !watchedConcepts.has(c))),
    query.shuffleSeed + 99,
  )
    .slice(0, 80)
    .map((v) => {
      const freshConcept = v.concepts.find((c) => !watchedConcepts.has(c)) ?? v.concepts[0]
      return { video: v, reason: `Explore · ${CONCEPT_BY_ID[freshConcept].label}` }
    })

  // Weave queues without duplicates: [Seed, Discovery, Personal/Discovery, Discovery, Unexplored]
  const seen = new Set<string>()
  const merged: FeedCard[] = []
  const takeNext = (q: FeedCard[]): FeedCard | null => {
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
  while (seedQueue.length || discoveryQueue.length || pQueue.length || unexploredQueue.length) {
    const s1 = takeNext(seedQueue)
    if (s1) merged.push(s1)
    const d1 = takeNext(discoveryQueue)
    if (d1) merged.push(d1)
    const p1 = takeNext(pQueue) ?? takeNext(discoveryQueue)
    if (p1) merged.push(p1)
    const d2 = takeNext(discoveryQueue)
    if (d2) merged.push(d2)
    const u1 = takeNext(unexploredQueue)
    if (u1) merged.push(u1)
  }

  // Append any remaining filtered videos so the full filtered set is always reachable
  for (const v of filtered) {
    if (!seen.has(v.id)) {
      seen.add(v.id)
      merged.push({
        video: v,
        reason: v.role === 'seed' ? `Reference · ${ANCHOR_BY_ID[v.seedAnchor].shortLabel}` : `${Math.round(v.seedSim * 100)}% match`,
      })
    }
  }

  return diversifyChannels(merged, 2)
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`
}
