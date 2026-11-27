import { describe, expect, it } from 'vitest'
import type { ProgressEvent } from '@renderblocks/kernel'
import rawCatalog from '../data/catalog.json'
import type { BrowseQuery, LearnerState, LevelBandId, ProximalCatalog, SubjectId } from '../types'
import { computeFrontier, evaluateVideoFrontier, filterNoisyEvents } from './frontier'
import { buildBrowseFeed, diversifyChannels, findSimilarVideos, inferQueryConcepts, searchVideos } from './search'
import { buildQueryVector, buildVideoCentroid, dotRow, getVectorIndex } from './vectors'

const catalog = rawCatalog as unknown as ProximalCatalog
const videos = catalog.videos

const emptyState: LearnerState = {
  liked: [],
  saved: [],
  history: [],
  thumbMode: 'midpoint',
  conceptOverrides: {},
}

const baseQuery: BrowseQuery = {
  tab: 'explore',
  search: '',
  subject: 'all',
  anchor: 'all',
  concept: 'all',
  levelBand: 'all',
  format: 'all',
  channelKey: 'all',
  similarToId: null,
  shuffleSeed: 42,
}

const emptyReader = { getKey: () => null }

describe('Proximal uncapped multi-subject catalog & 64-D vector index invariants', () => {
  it('contains 7,000+ verified videos across all 6 subjects and all 6 uncapped level bands with zero Shorts (<60s)', () => {
    expect(videos.length).toBeGreaterThan(7000)
    expect(catalog.seedCount).toBeGreaterThan(1000)

    const idSet = new Set(videos.map((v) => v.id))
    expect(idSet.size).toBe(videos.length)

    const subjectsPresent = new Set<SubjectId>()
    const bandsPresent = new Set<LevelBandId>()

    for (const v of videos) {
      expect(v.duration).toBeGreaterThanOrEqual(60)
      expect(v.concepts.length).toBeGreaterThanOrEqual(1)
      expect(v.subjects.length).toBeGreaterThanOrEqual(1)
      expect(v.related.length).toBeGreaterThan(0)
      subjectsPresent.add(v.primarySubject)
      bandsPresent.add(v.levelBand)
      for (const rel of v.related) {
        expect(idSet.has(rel)).toBe(true)
        expect(rel).not.toBe(v.id)
      }
    }

    expect(subjectsPresent.size).toBe(6)
    expect(bandsPresent.size).toBe(6)
  })

  it('decodes 64-D unit-normalized video embeddings and multi-subject semantic query prototypes', () => {
    const idx = getVectorIndex(catalog)
    expect(idx).not.toBeNull()
    expect(idx!.dim).toBe(64)
    expect(idx!.count).toBe(videos.length)
    expect(idx!.protos.size).toBeGreaterThan(50)

    const selfCentroid = buildVideoCentroid(idx!, [videos[0].id])!
    const selfSim = dotRow(idx!, 0, selfCentroid)
    expect(selfSim).toBeGreaterThan(0.99)

    expect(buildQueryVector(idx!, ['dinosaurs', 'fossils'])).not.toBeNull()
    expect(buildQueryVector(idx!, ['digraphs', 'phonics'])).not.toBeNull()
    expect(buildQueryVector(idx!, ['ai', 'computers'])).not.toBeNull()
  })
})

describe('Proximal Learning Frontier Engine (Uncapped 38-Concept Multi-Subject DAG)', () => {
  it('opens foundational entry concepts across all 6 subjects and holds advanced concepts ahead', () => {
    const f = computeFrontier([], {}, emptyReader)
    expect(f.frontierIds.has('counting')).toBe(true)
    expect(f.frontierIds.has('phonics-foundations')).toBe(true)
    expect(f.frontierIds.has('science-life-nature')).toBe(true)
    expect(f.frontierIds.has('patterns-coding')).toBe(true)
    expect(f.frontierIds.has('world-geography')).toBe(true)
    expect(f.frontierIds.has('colours-sorting')).toBe(true)

    expect(f.aheadIds.has('addition')).toBe(true)
    expect(f.aheadIds.has('algebra-equations')).toBe(true)
    expect(f.aheadIds.has('deep-math')).toBe(true)
    expect(f.aheadIds.has('ai-machine-learning')).toBe(true)
  })

  it('filters rapid <600ms button-mash noise and keeps sticky mastery against isolated playful misses', () => {
    const day1 = new Date('2026-11-10T10:00:00Z').getTime()
    const day2 = new Date('2026-11-12T10:00:00Z').getTime()
    const day3 = new Date('2026-11-14T10:00:00Z').getTime()

    const events: ProgressEvent[] = [
      { t: day1, app: 'sort', concept: 'K.MD.B.3', item: 'd1', ok: false, ms: 180 },
      { t: day1, app: 'sort', concept: 'K.MD.B.3', item: 'd2', ok: true, ms: 250 },
      ...Array.from({ length: 10 }, (_, i) => ({
        t: i < 5 ? day1 : day2,
        app: 'sort',
        concept: 'K.MD.B.3',
        item: `deck-${i}`,
        ok: true,
        ms: 1800,
      })),
      { t: day3, app: 'sort', concept: 'K.MD.B.3', item: 'deck-0', ok: false, ms: 1400 },
    ]

    const { droppedNoise } = filterNoisyEvents(events)
    expect(droppedNoise).toBe(2)

    const f = computeFrontier(events, {}, emptyReader)
    expect(f.noiseFilteredCount).toBe(2)
    expect(f.masteredIds.has('colours-sorting')).toBe(true)
  })

  it('unlocks Addition & Place Value once Counting & Number Sense are mastered, and unlocks University AI/Deep Math when prereqs are mastered', () => {
    const f = computeFrontier([], { counting: 'mastered', 'number-sense': 'mastered' }, emptyReader)
    expect(f.frontierIds.has('addition')).toBe(true)
    expect(f.frontierIds.has('place-value')).toBe(true)
    expect(f.aheadIds.has('deep-math')).toBe(true)

    const addVideo = videos.find(
      (v) => v.concepts[0] === 'addition' && v.levelBand === 'k_2' && v.needs.every((n) => n === 'counting' || n === 'number-sense'),
    )!
    expect(evaluateVideoFrontier(addVideo, f).proximal).toBe(true)

    const calcVideo = videos.find(
      (v) => v.levelBand === 'university' && v.concepts[0] === 'deep-math' && v.needs.every((n) => n === 'algebra-equations'),
    )!
    expect(evaluateVideoFrontier(calcVideo, f).proximal).toBe(false)

    // Uncapped upper progression: mastering algebra-equations unlocks deep-math!
    const fAdv = computeFrontier([], { 'algebra-equations': 'mastered' }, emptyReader)
    expect(fAdv.frontierIds.has('deep-math')).toBe(true)
    expect(evaluateVideoFrontier(calcVideo, fAdv).proximal).toBe(true)
  })
})

describe('Proximal multi-subject search & home mixer', () => {
  it('finds high-signal videos across Math, Science, ELA/Phonics, CS/AI, and History', () => {
    const idx = getVectorIndex(catalog)
    expect(inferQueryConcepts('ten frame subitizing').has('number-sense')).toBe(true)
    expect(inferQueryConcepts('digraphs and silent e').has('phonics-decoding')).toBe(true)
    expect(inferQueryConcepts('neural networks').has('ai-machine-learning')).toBe(true)

    const frac = searchVideos(videos, 'fractions', 'all', idx)
    expect(frac.length).toBeGreaterThan(50)
    expect(frac.slice(0, 5).every((c) => c.video.concepts.includes('fractions'))).toBe(true)

    const space = searchVideos(videos, 'solar system planets', 'all', idx)
    expect(space.length).toBeGreaterThan(50)
    expect(space.slice(0, 5).some((c) => c.video.primarySubject === 'science')).toBe(true)

    const phonics = searchVideos(videos, 'digraphs phonics', 'all', idx)
    expect(phonics.length).toBeGreaterThan(20)
    expect(phonics.slice(0, 5).some((c) => c.video.primarySubject === 'ela')).toBe(true)

    const ai = searchVideos(videos, 'neural networks', 'all', idx)
    expect(ai.length).toBeGreaterThan(10)
    expect(ai.slice(0, 5).some((c) => c.video.concepts.includes('ai-machine-learning'))).toBe(true)
  })

  it('mixes all 6 subjects on Explore, filters cleanly by subject & levelBand, and diversifies channels', () => {
    const feed = buildBrowseFeed(catalog, baseQuery, emptyState)
    expect(feed.length).toBe(videos.length)

    // Top 18 cards on Explore span all 6 subjects!
    const topSubjects = new Set(feed.slice(0, 18).map((c) => c.video.primarySubject))
    expect(topSubjects.size).toBe(6)

    for (let i = 2; i < 30; i++) {
      const sameThree =
        feed[i].video.channelKey === feed[i - 1].video.channelKey &&
        feed[i].video.channelKey === feed[i - 2].video.channelKey
      expect(sameThree).toBe(false)
    }

    const univMath = buildBrowseFeed(catalog, { ...baseQuery, subject: 'math', levelBand: 'university' }, emptyState)
    expect(univMath.length).toBeGreaterThan(200)
    expect(univMath.every((c) => c.video.subjects.includes('math') && c.video.levelBand === 'university')).toBe(true)
  })

  it('finds diverse vector neighbors in findSimilarVideos and breaks channel runs', () => {
    const idx = getVectorIndex(catalog)
    const sample = videos.find((v) => v.channelKey === 'scishow-kids') ?? videos[0]
    const sim = findSimilarVideos(videos, sample.id, undefined, 20, idx)
    expect(sim.length).toBe(20)
    expect(sim.every((c) => c.video.id !== sample.id)).toBe(true)

    const sameCh = videos.filter((v) => v.channelKey === 'numberblocks').slice(0, 4).map((video) => ({ video }))
    const otherCh = videos.filter((v) => v.channelKey === 'scishow-kids').slice(0, 2).map((video) => ({ video }))
    const mixed = diversifyChannels([...sameCh, ...otherCh], 2)
    expect(mixed[2].video.channelKey).toBe('scishow-kids')
  })
})

describe('Proximal Ranking Algorithm MVP (Weighted ZPD + BandFit + Explore + Taste + Diversity)', () => {
  it('ranks the Frontier feed with full RankBreakdown, penalizes fast-bails, and diversifies channel & concept runs', () => {
    const frontier = computeFrontier(
      [],
      { counting: 'mastered', 'number-sense': 'mastered' },
      emptyReader,
    )
    const feed = buildBrowseFeed(catalog, { ...baseQuery, tab: 'frontier' }, emptyState, frontier)
    expect(feed.length).toBeGreaterThan(500)

    // Every frontier card carries an inspectable RankBreakdown
    for (const card of feed.slice(0, 20)) {
      expect(card.frontierBadge).toBe(true)
      expect(card.rank).toBeDefined()
      expect(card.rank!.zpd).toBeGreaterThanOrEqual(0)
      expect(card.rank!.zpd).toBeLessThanOrEqual(1)
      expect(card.rank!.bandFit).toBeGreaterThanOrEqual(0)
      expect(card.rank!.bandFit).toBeLessThanOrEqual(1)
    }

    // Channel diversity: never 3 consecutive cards from same channel in top 30
    for (let i = 2; i < 30; i++) {
      const sameThreeCh =
        feed[i].video.channelKey === feed[i - 1].video.channelKey &&
        feed[i].video.channelKey === feed[i - 2].video.channelKey
      expect(sameThreeCh).toBe(false)
    }

    // Fast-bail penalty pushes a bailed video down in rank
    const topVideo = feed[0].video
    const bailedState: LearnerState = {
      ...emptyState,
      history: [{ id: topVideo.id, at: Date.now(), dwellSec: 5, completed: false, bailedFast: true }],
    }
    const feedAfterBail = buildBrowseFeed(catalog, { ...baseQuery, tab: 'frontier' }, bailedState, frontier)
    const oldRank = feed[0].rank!.total
    const newCard = feedAfterBail.find((c) => c.video.id === topVideo.id)!
    expect(newCard.rank!.penalty).toBeGreaterThanOrEqual(0.3)
    expect(newCard.rank!.total).toBeLessThan(oldRank - 0.2)
  })
})
