import { describe, expect, it } from 'vitest'
import type { ProgressEvent } from '@renderblocks/kernel'
import rawCatalog from '../data/catalog.json'
import type { BrowseQuery, LearnerState, ProximalCatalog } from '../types'
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
  anchor: 'all',
  concept: 'all',
  stage: 'all',
  format: 'all',
  channelKey: 'all',
  similarToId: null,
  shuffleSeed: 42,
}

const emptyReader = { getKey: () => null }

describe('Proximal reference catalog & 64-D vector index invariants', () => {
  it('contains verified seed and candidate videos with zero Shorts (<60s) and strict seed author purity', () => {
    expect(videos.length).toBeGreaterThan(1750)
    expect(catalog.seedCount).toBeGreaterThan(550)
    expect(catalog.candidateCount).toBeGreaterThan(1100)

    const idSet = new Set(videos.map((v) => v.id))
    expect(idSet.size).toBe(videos.length)

    for (const v of videos) {
      expect(v.duration).toBeGreaterThanOrEqual(60)
      expect(v.concepts.length).toBeGreaterThanOrEqual(1)
      expect(v.seedSim).toBeGreaterThan(0)
      expect(v.related.length).toBeGreaterThan(0)
      for (const rel of v.related) {
        expect(idSet.has(rel)).toBe(true)
        expect(rel).not.toBe(v.id)
      }
      if (v.role === 'seed') {
        expect(['numberblocks', 'wonderblocks', 'preschool-prep', 'homeschool-pop']).toContain(v.channelKey)
      }
    }
  })

  it('decodes 64-D unit-normalized video embeddings and semantic query prototypes', () => {
    const idx = getVectorIndex(catalog)
    expect(idx).not.toBeNull()
    expect(idx!.dim).toBe(64)
    expect(idx!.count).toBe(videos.length)
    expect(idx!.protos.size).toBeGreaterThan(30)

    const selfCentroid = buildVideoCentroid(idx!, [videos[0].id])!
    const selfSim = dotRow(idx!, 0, selfCentroid)
    expect(selfSim).toBeGreaterThan(0.99)

    const qVec = buildQueryVector(idx!, ['fractions', 'decimals'])
    expect(qVec).not.toBeNull()
  })
})

describe('Proximal Learning Frontier Engine (ZPD)', () => {
  it('opens foundational entry concepts on a fresh tablet and holds advanced concepts ahead', () => {
    const f = computeFrontier([], {}, emptyReader)
    expect(f.frontierIds.has('counting')).toBe(true)
    expect(f.frontierIds.has('shapes-geometry')).toBe(true)
    expect(f.frontierIds.has('patterns-coding')).toBe(true)
    expect(f.aheadIds.has('addition')).toBe(true)
    expect(f.aheadIds.has('fractions')).toBe(true)
    expect(f.aheadIds.has('deep-math')).toBe(true)
  })

  it('filters rapid <600ms button-mash noise and keeps sticky mastery against isolated playful misses', () => {
    const day1 = new Date('2026-11-10T10:00:00Z').getTime()
    const day2 = new Date('2026-11-12T10:00:00Z').getTime()
    const day3 = new Date('2026-11-14T10:00:00Z').getTime()

    const events: ProgressEvent[] = [
      // Noisy button-mashes (<600ms) -> ignored
      { t: day1, app: 'sort', concept: 'K.MD.B.3', item: 'd1', ok: false, ms: 180 },
      { t: day1, app: 'sort', concept: 'K.MD.B.3', item: 'd2', ok: true, ms: 250 },
      // 12 genuine multi-day secure items in Story5 counting + number-sense via reader, plus sort right answers
      ...Array.from({ length: 10 }, (_, i) => ({
        t: i < 5 ? day1 : day2,
        app: 'sort',
        concept: 'K.MD.B.3',
        item: `deck-${i}`,
        ok: true,
        ms: 1800,
      })),
      // One isolated playful wrong tap on day 3 after multi-day mastery
      { t: day3, app: 'sort', concept: 'K.MD.B.3', item: 'deck-0', ok: false, ms: 1400 },
    ]

    const { droppedNoise } = filterNoisyEvents(events)
    expect(droppedNoise).toBe(2)

    const f = computeFrontier(events, {}, emptyReader)
    expect(f.noiseFilteredCount).toBe(2)
    expect(f.masteredIds.has('colours-sorting')).toBe(true)
  })

  it('unlocks Addition & Place Value onto the frontier once Counting & Number Sense are mastered', () => {
    const f = computeFrontier([], { counting: 'mastered', 'number-sense': 'mastered' }, emptyReader)
    expect(f.masteredIds.has('counting')).toBe(true)
    expect(f.masteredIds.has('number-sense')).toBe(true)
    expect(f.frontierIds.has('addition')).toBe(true)
    expect(f.frontierIds.has('place-value')).toBe(true)
    expect(f.aheadIds.has('fractions')).toBe(true)

    const addVideo = videos.find((v) => v.concepts[0] === 'addition' && v.needs.every((n) => n === 'counting' || n === 'number-sense'))!
    const evalAdd = evaluateVideoFrontier(addVideo, f)
    expect(evalAdd.proximal).toBe(true)

    const calcVideo = videos.find((v) => v.stage === 'horizon' && v.concepts.includes('deep-math'))!
    expect(evaluateVideoFrontier(calcVideo, f).proximal).toBe(false)
  })

  it('builds a clean ZPD Frontier feed prioritized toward crisp standalone lessons', () => {
    const f = computeFrontier([], {}, emptyReader)
    const frontierFeed = buildBrowseFeed(catalog, { ...baseQuery, tab: 'frontier' }, emptyState, f)
    expect(frontierFeed.length).toBeGreaterThan(100)
    expect(frontierFeed.slice(0, 15).every((c) => c.frontierBadge === true)).toBe(true)
    expect(frontierFeed.slice(0, 15).every((c) => c.video.stage !== 'horizon')).toBe(true)
  })
})

describe('Proximal hybrid semantic + lexical search & home mixer', () => {
  it('expands synonyms and vector prototypes for conceptual searches', () => {
    const idx = getVectorIndex(catalog)
    expect(inferQueryConcepts('ten frame subitizing').has('number-sense')).toBe(true)
    expect(inferQueryConcepts('loops and debugging').has('patterns-coding')).toBe(true)

    const frac = searchVideos(videos, 'fractions', 'all', idx)
    expect(frac.length).toBeGreaterThan(20)
    expect(frac.slice(0, 5).every((c) => c.video.concepts.includes('fractions'))).toBe(true)

    const prep = searchVideos(videos, 'Meet the Math Facts multiplication', 'all', idx)
    expect(prep[0].video.channelKey).toBe('preschool-prep')
  })

  it('prioritizes standalone lessons over seasonal/marathon packs on Explore and diversifies channels', () => {
    const feed = buildBrowseFeed(catalog, baseQuery, emptyState)
    expect(feed.length).toBe(videos.length)

    // Majority of top 16 Explore cards should be standalone episodes rather than marathon packs
    const topEpisodes = feed.slice(0, 16).filter((c) => c.video.format === 'episode').length
    expect(topEpisodes).toBeGreaterThanOrEqual(10)

    for (let i = 2; i < 30; i++) {
      const sameThree =
        feed[i].video.channelKey === feed[i - 1].video.channelKey &&
        feed[i].video.channelKey === feed[i - 2].video.channelKey
      expect(sameThree).toBe(false)
    }
  })

  it('finds diverse vector neighbors in findSimilarVideos and breaks channel runs', () => {
    const idx = getVectorIndex(catalog)
    const sample = videos.find((v) => v.channelKey === 'homeschool-pop' && v.concepts.includes('fractions')) ?? videos[0]
    const sim = findSimilarVideos(videos, sample.id, undefined, 20, idx)
    expect(sim.length).toBe(20)
    expect(sim.every((c) => c.video.id !== sample.id)).toBe(true)

    const sameCh = videos.filter((v) => v.channelKey === 'numberblocks').slice(0, 4).map((video) => ({ video }))
    const otherCh = videos.filter((v) => v.channelKey === 'math-antics').slice(0, 2).map((video) => ({ video }))
    const mixed = diversifyChannels([...sameCh, ...otherCh], 2)
    expect(mixed[2].video.channelKey).toBe('math-antics')
  })
})
