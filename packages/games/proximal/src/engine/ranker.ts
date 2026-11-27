/**
 * Proximal Ranking Algorithm MVP
 *
 * Clean, inspectable 5-component weighted scorer for the Frontier feed:
 *
 *   Score(v) = 0.40 * ZPD(v)
 *            + 0.20 * BandFit(v)
 *            + 0.10 * Explore(v)
 *            + 0.15 * Taste(v)
 *            + 0.15 * Quality(v)
 *            - Penalties(v)
 *
 * Followed by channel + concept diversification (max 2 consecutive per channel or primary concept).
 */
import { ANCHOR_BY_ID, BAND_BY_ID, CONCEPT_BY_ID } from '../data/taxonomy'
import type {
  ConceptId,
  FeedCard,
  LearnerState,
  ProximalVideo,
  RankBreakdown,
  SeedAnchorId,
  WatchEntry,
} from '../types'
import { evaluateVideoFrontier, type FrontierSnapshot } from './frontier'
import { buildVideoCentroid, dotRow, type VectorIndex } from './vectors'

export const RANK_WEIGHTS = {
  zpd: 0.4,
  bandFit: 0.2,
  explore: 0.1,
  taste: 0.15,
  quality: 0.15,
} as const

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function anchorSimValue(v: ProximalVideo, anchor: SeedAnchorId | 'all'): number {
  if (anchor === 'all') return v.seedSim
  const key = ANCHOR_BY_ID[anchor].simKey
  return v.anchorSims[key]
}

/** Build positive & fast-bail centroids from liked videos and observed dwell history. */
export function buildLearnerCentroids(
  vecIndex: VectorIndex | null,
  state: LearnerState,
): { positive: Float32Array | null; bailed: Float32Array | null } {
  if (!vecIndex) return { positive: null, bailed: null }

  const posIds: string[] = []
  const posWeights: number[] = []
  const bailIds: string[] = []
  const bailWeights: number[] = []

  for (const id of state.liked.slice(0, 14)) {
    posIds.push(id)
    posWeights.push(1.8)
  }

  for (const h of state.history.slice(0, 20)) {
    if (h.bailedFast) {
      if (!posIds.includes(h.id)) {
        bailIds.push(h.id)
        bailWeights.push(1.0)
      }
      continue
    }
    if (!posIds.includes(h.id)) {
      const engagedWeight = h.completed ? 1.4 : (h.dwellSec ?? 30) >= 45 ? 1.1 : 0.65
      posIds.push(h.id)
      posWeights.push(engagedWeight)
    }
  }

  return {
    positive: posIds.length > 0 ? buildVideoCentroid(vecIndex, posIds, posWeights) : null,
    bailed: bailIds.length > 0 ? buildVideoCentroid(vecIndex, bailIds, bailWeights) : null,
  }
}

/**
 * ZPD component in [0, 1]:
 * Peaks when primary concept's pMastery is in [0.30, 0.75] and prerequisites are strong (>=0.70).
 * Penalizes already-mastered (>0.85) or unmet prereqs (<0.45).
 */
export function scoreZpd(video: ProximalVideo, frontier: FrontierSnapshot): {
  zpd: number
  leadConcept: ConceptId
  pMastery: number
  confidence: number
} {
  const primary = video.concepts[0]
  const frontierHits = video.concepts.filter((c) => frontier.frontierIds.has(c))
  const activeHits = video.concepts.filter((c) => frontier.activeFrontierIds.has(c))
  const leadConcept = activeHits[0] ?? frontierHits[0] ?? primary

  const leadNode = frontier.byId[leadConcept]
  const pMastery = leadNode?.pMastery ?? 0.35
  const confidence = leadNode?.confidence ?? 0.1

  // Asymmetric tent peaking smoothly across [0.30, 0.75]
  let masteryFit: number
  if (pMastery >= 0.3 && pMastery <= 0.75) {
    // Center peak near 0.52
    masteryFit = 1.0 - Math.abs(pMastery - 0.52) * 0.45
  } else if (pMastery < 0.3) {
    masteryFit = 0.55 + (pMastery / 0.3) * 0.35
  } else {
    // Mastered (>0.75) drops sharply past 0.85 so we keep moving Render forward
    masteryFit = pMastery > 0.85 ? Math.max(0.05, 0.35 - (pMastery - 0.85) * 2.0) : 0.9 - (pMastery - 0.75) * 4.5
  }

  // Prerequisite readiness
  const reqNodes = video.needs.map((r) => frontier.byId[r]).filter(Boolean)
  const prereqMin = reqNodes.length > 0 ? Math.min(...reqNodes.map((n) => n.pMastery)) : 1.0
  let prereqMult = 1.0
  if (prereqMin >= 0.7) prereqMult = 1.05
  else if (prereqMin < 0.45) prereqMult = 0.45

  const activeBonus = activeHits.length > 0 ? 0.12 : 0
  const aheadPenalty = video.concepts.some((c) => frontier.aheadIds.has(c)) ? -0.15 : 0

  return {
    zpd: clamp(masteryFit * prereqMult + activeBonus + aheadPenalty, 0, 1),
    leadConcept,
    pMastery,
    confidence,
  }
}

/**
 * BandFit component in [0, 1]:
 * Compares the video's level band (0=PreK..5=Univ) to the learner's estimated band
 * in that subject. Peaks right at `current` to `current + 0.8` (proximal stretch).
 */
export function scoreBandFit(video: ProximalVideo, frontier: FrontierSnapshot): number {
  const vBand = BAND_BY_ID[video.levelBand]?.order ?? 0
  const curBand = frontier.subjectBand[video.primarySubject] ?? 0.5
  const delta = vBand - curBand

  // Sweet spot: right at current band or slightly above (+0.0 .. +0.9)
  if (delta >= -0.25 && delta <= 0.9) return 1.0
  if (delta > 0.9) {
    // Stretch beyond +1 band decays smoothly (still allowed when concept prereqs open!)
    return clamp(1.0 - (delta - 0.9) * 0.35, 0.12, 1.0)
  }
  // Too far below current band decays faster (avoid remedial repetition)
  return clamp(1.0 - (-0.25 - delta) * 0.42, 0.1, 1.0)
}

/**
 * Explore component in [0, 1]:
 * UCB-style exploration bonus favoring low-confidence frontier concepts so
 * Proximal surfaces topics that broaden frontier coverage.
 */
export function scoreExplore(confidence: number, exposureSeconds: number): number {
  const uncertainty = clamp(1 - confidence, 0, 1)
  // Slight nudge if never watched yet; softens if already heavily watched without VQ
  const novelty = exposureSeconds === 0 ? 1.0 : exposureSeconds < 120 ? 0.85 : 0.65
  return clamp(uncertainty * novelty, 0, 1)
}

/**
 * Taste component in [0, 1]:
 * 64-D vector similarity to liked/engaged videos, gently repelled from fast-bailed videos.
 */
export function scoreTaste(
  video: ProximalVideo,
  anchor: SeedAnchorId | 'all',
  vecIndex: VectorIndex | null,
  centroids: { positive: Float32Array | null; bailed: Float32Array | null },
): number {
  const anchorSim = clamp(anchorSimValue(video, anchor), 0, 1)
  if (!vecIndex) return anchorSim

  const row = vecIndex.idToRow.get(video.id)
  if (row === undefined) return anchorSim

  let posSim = anchorSim
  if (centroids.positive) {
    const cos = clamp((dotRow(vecIndex, row, centroids.positive) + 0.1) / 0.85, 0, 1)
    posSim = 0.65 * cos + 0.35 * anchorSim
  }
  let bailRepel = 0
  if (centroids.bailed) {
    const bCos = Math.max(0, dotRow(vecIndex, row, centroids.bailed))
    if (bCos > 0.55) bailRepel = (bCos - 0.55) * 0.5
  }
  return clamp(posSim - bailRepel, 0, 1)
}

/** Quality component in [0, 1]: standalone episodes, clean metadata score, non-seasonal. */
export function scoreQuality(video: ProximalVideo): number {
  const base = clamp(video.score / 100, 0.2, 1.0)
  const epBonus = video.format === 'episode' ? 0.14 : -0.14
  const seedBonus = video.role === 'seed' ? 0.06 : 0
  return clamp(base * 0.85 + epBonus + seedBonus, 0, 1)
}

/** Diversity pass: cap consecutive items by channel AND by primary concept. */
export function diversifyFeed(
  cards: readonly FeedCard[],
  maxChannelRun = 2,
  maxConceptRun = 2,
): FeedCard[] {
  const remaining = [...cards]
  const out: FeedCard[] = []

  while (remaining.length > 0) {
    const len = out.length
    const blockedChannel =
      len >= maxChannelRun &&
      out.slice(len - maxChannelRun).every((c) => c.video.channelKey === out[len - 1].video.channelKey)
        ? out[len - 1].video.channelKey
        : null

    const lastConcept = len > 0 ? out[len - 1].video.concepts[0] : null
    const blockedConcept =
      lastConcept &&
      len >= maxConceptRun &&
      out.slice(len - maxConceptRun).every((c) => c.video.concepts[0] === lastConcept)
        ? lastConcept
        : null

    let pickIdx = 0
    if (blockedChannel || blockedConcept) {
      const bothOk = remaining.findIndex(
        (c) =>
          (!blockedChannel || c.video.channelKey !== blockedChannel) &&
          (!blockedConcept || c.video.concepts[0] !== blockedConcept),
      )
      if (bothOk >= 0) {
        pickIdx = bothOk
      } else if (blockedChannel) {
        const chOk = remaining.findIndex((c) => c.video.channelKey !== blockedChannel)
        if (chOk >= 0) pickIdx = chOk
      }
    }
    out.push(remaining.splice(pickIdx, 1)[0])
  }
  return out
}

export function rankFrontierFeed(
  videos: readonly ProximalVideo[],
  frontier: FrontierSnapshot,
  state: LearnerState,
  options: {
    anchor: SeedAnchorId | 'all'
    vecIndex: VectorIndex | null
    rand: () => number
    diversify?: boolean
    now?: number
  },
): FeedCard[] {
  const now = options.now ?? Date.now()
  const centroids = buildLearnerCentroids(options.vecIndex, state)
  const watchMap = new Map<string, WatchEntry>()
  for (const h of state.history) {
    if (!watchMap.has(h.id)) watchMap.set(h.id, h)
  }

  const scored: { card: FeedCard; total: number }[] = []

  for (const v of videos) {
    const gate = evaluateVideoFrontier(v, frontier)
    if (!gate.proximal) continue

    const { zpd, leadConcept, pMastery, confidence } = scoreZpd(v, frontier)
    const bandFit = scoreBandFit(v, frontier)
    const exposureSec = frontier.byId[leadConcept]?.evidence.exposureSeconds ?? 0
    const explore = scoreExplore(confidence, exposureSec)
    const taste = scoreTaste(v, options.anchor, options.vecIndex, centroids)
    const quality = scoreQuality(v)

    let penalty = 0
    if (v.seasonal) penalty += 0.14
    const hist = watchMap.get(v.id)
    if (hist) {
      const hoursAgo = Math.max(0, (now - hist.at) / 3_600_000)
      if (hist.bailedFast) {
        penalty += hoursAgo < 48 ? 0.35 : 0.18
      } else {
        penalty += hoursAgo < 24 ? 0.22 : 0.12
      }
    }

    const jitter = (options.rand() - 0.5) * 0.035
    const total =
      RANK_WEIGHTS.zpd * zpd +
      RANK_WEIGHTS.bandFit * bandFit +
      RANK_WEIGHTS.explore * explore +
      RANK_WEIGHTS.taste * taste +
      RANK_WEIGHTS.quality * quality -
      penalty +
      jitter

    const rank: RankBreakdown = {
      total: Number(total.toFixed(3)),
      zpd: Number(zpd.toFixed(2)),
      bandFit: Number(bandFit.toFixed(2)),
      explore: Number(explore.toFixed(2)),
      taste: Number(taste.toFixed(2)),
      quality: Number(quality.toFixed(2)),
      penalty: Number(penalty.toFixed(2)),
      pMastery: Number(pMastery.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      leadConcept,
    }

    const conceptLabel = CONCEPT_BY_ID[leadConcept]?.label ?? leadConcept
    const reason =
      frontier.activeFrontierIds.has(leadConcept)
        ? `⚡ Active Frontier · ${conceptLabel}`
        : confidence < 0.35
          ? `⚡ Explore Next · ${conceptLabel}`
          : `⚡ Ready Next · ${conceptLabel}`

    scored.push({
      card: { video: v, reason, frontierBadge: true, rank },
      total,
    })
  }

  scored.sort((a, b) => b.total - a.total)
  const cards = scored.map((x) => x.card)
  return options.diversify === false ? cards : diversifyFeed(cards, 2, 2)
}
