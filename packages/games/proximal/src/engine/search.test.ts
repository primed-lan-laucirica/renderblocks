import { describe, expect, it } from 'vitest'
import rawCatalog from '../data/catalog.json'
import type { BrowseQuery, LearnerState, ProximalCatalog } from '../types'
import { buildBrowseFeed, diversifyChannels, findSimilarVideos, inferQueryConcepts, searchVideos } from './search'

const catalog = rawCatalog as unknown as ProximalCatalog
const videos = catalog.videos

const emptyState: LearnerState = {
  liked: [],
  saved: [],
  history: [],
  thumbMode: 'midpoint',
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

describe('Proximal reference catalog invariants', () => {
  it('contains verified seed and candidate videos with zero Shorts (<60s)', () => {
    expect(videos.length).toBeGreaterThan(1500)
    expect(catalog.seedCount).toBeGreaterThan(400)
    expect(catalog.candidateCount).toBeGreaterThan(1000)

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
    }
  })

  it('includes both standalone episodes and compilations across the 4 seed anchors', () => {
    for (const anchor of ['numberblocks', 'wonderblocks', 'preschool-prep', 'homeschool-pop'] as const) {
      const seeds = videos.filter((v) => v.role === 'seed' && v.seedAnchor === anchor)
      expect(seeds.length).toBeGreaterThan(30)
    }
    expect(videos.some((v) => v.format === 'episode')).toBe(true)
    expect(videos.some((v) => v.format === 'compilation')).toBe(true)
  })
})

describe('Proximal algorithmic search & similarity engine', () => {
  it('expands synonyms into concept matches', () => {
    expect(inferQueryConcepts('ten frame subitizing').has('number-sense')).toBe(true)
    expect(inferQueryConcepts('loops and debugging').has('patterns-coding')).toBe(true)
    expect(inferQueryConcepts('meet the math facts').has('math-facts')).toBe(true)
    expect(inferQueryConcepts('telling time on a clock').has('measurement-time-money')).toBe(true)
  })

  it('ranks relevant videos at the top for topic & series searches', () => {
    const frac = searchVideos(videos, 'fractions')
    expect(frac.length).toBeGreaterThan(20)
    expect(frac.slice(0, 5).every((c) => c.video.concepts.includes('fractions'))).toBe(true)

    const prep = searchVideos(videos, 'Meet the Math Facts multiplication')
    expect(prep.length).toBeGreaterThan(3)
    expect(prep[0].video.channelKey).toBe('preschool-prep')

    const wb = searchVideos(videos, 'Wonderblocks debugging')
    expect(wb.length).toBeGreaterThan(0)
    expect(wb[0].video.seedAnchor).toBe('wonderblocks')
  })

  it('finds diverse neural neighbors in findSimilarVideos', () => {
    const sample = videos.find((v) => v.channelKey === 'homeschool-pop' && v.concepts.includes('fractions')) ?? videos[0]
    const sim = findSimilarVideos(videos, sample.id, undefined, 20)
    expect(sim.length).toBe(20)
    expect(sim.every((c) => c.video.id !== sample.id)).toBe(true)
    expect(sim[0].video.id).toBe(sample.related[0])
  })

  it('builds a diversified home feed and refreshes order when shuffleSeed changes', () => {
    const feedA = buildBrowseFeed(videos, baseQuery, emptyState)
    const feedB = buildBrowseFeed(videos, { ...baseQuery, shuffleSeed: 999 }, emptyState)
    expect(feedA.length).toBe(videos.length)

    const topIdsA = feedA.slice(0, 12).map((c) => c.video.id)
    const topIdsB = feedB.slice(0, 12).map((c) => c.video.id)
    expect(topIdsA).not.toEqual(topIdsB)

    // Channel diversity: never 3 consecutive cards from the same channel at the top of Explore
    for (let i = 2; i < 30; i++) {
      const sameThree =
        feedA[i].video.channelKey === feedA[i - 1].video.channelKey &&
        feedA[i].video.channelKey === feedA[i - 2].video.channelKey
      expect(sameThree).toBe(false)
    }
  })

  it('surfaces personal related recommendations when learner likes or watches videos', () => {
    const likedTarget = videos.find((v) => v.channelKey === 'wonderblocks')!
    const stateWithLikes: LearnerState = {
      ...emptyState,
      liked: [likedTarget.id],
    }
    const feed = buildBrowseFeed(videos, baseQuery, stateWithLikes)
    const hasPersonalReason = feed.slice(0, 25).some((c) => c.reason?.startsWith('Because you watched'))
    expect(hasPersonalReason).toBe(true)
  })

  it('diversifyChannels breaks runs longer than maxRun when alternatives exist', () => {
    const sameCh = videos.filter((v) => v.channelKey === 'numberblocks').slice(0, 4).map((video) => ({ video }))
    const otherCh = videos.filter((v) => v.channelKey === 'math-antics').slice(0, 2).map((video) => ({ video }))
    const mixed = diversifyChannels([...sameCh, ...otherCh], 2)
    expect(mixed[0].video.channelKey).toBe('numberblocks')
    expect(mixed[1].video.channelKey).toBe('numberblocks')
    expect(mixed[2].video.channelKey).toBe('math-antics')
  })
})
