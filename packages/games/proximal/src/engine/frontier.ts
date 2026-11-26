/**
 * Proximal Learning Frontier Engine (ZPD — Uncapped Multi-Subject DAG)
 *
 * Reads real learner evidence across RenderBlocks:
 *  1. Shared IndexedDB progress log (`renderblocks-progress`) with <600ms button-mash noise filtering
 *     and sticky mastery against isolated playful wrong taps
 *  2. Drill star saves (`rb:add:progress`, `rb:subtract:progress`, `rb:times:progress`, `rb:divide:progress`)
 *  3. Story5 shared evidence (`rb:shared:story5.workshop`, `rb:story5:progress`)
 *  4. Symbols watched explainers & Bench stars (`rb:symbols:progress`)
 *  5. Gifted puzzle levels (`rb:gifted:progress`), Sneeze road (`rb:sneeze:roadRights`),
 *     Scribble (`rb:scribble:stars`), Words (`rb:words:index1..3`)
 *  6. Optional parent overrides stored in Proximal (`auto` | `mastered` | `frontier`)
 *
 * Computes each concept's status in the 38-node uncapped multi-subject curriculum DAG (PreK -> University).
 */
import type { ProgressEvent } from '@renderblocks/kernel'
import { CONCEPT_BY_ID } from '../data/taxonomy'
import type { ConceptId, ConceptOverride, ProximalVideo, SubjectId } from '../types'

/** Minimum response time (ms) to count as intentional rather than a button-mash. */
export const MIN_INTENTIONAL_MS = 600

export interface ConceptDagNode {
  id: ConceptId
  subject: SubjectId
  layer: number
  dependsOn: ConceptId[]
}

export const CONCEPT_DAG: ConceptDagNode[] = [
  // Layer 0 — Foundational Entry across all 6 subjects (open from day 1)
  { id: 'counting', subject: 'math', layer: 0, dependsOn: [] },
  { id: 'shapes-geometry', subject: 'math', layer: 0, dependsOn: [] },
  { id: 'phonics-foundations', subject: 'ela', layer: 0, dependsOn: [] },
  { id: 'science-life-nature', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-human-body', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-earth-weather', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'science-space-astronomy', subject: 'science', layer: 0, dependsOn: [] },
  { id: 'patterns-coding', subject: 'cs-logic', layer: 0, dependsOn: [] },
  { id: 'logic-reasoning', subject: 'cs-logic', layer: 0, dependsOn: [] },
  { id: 'world-geography', subject: 'world-history', layer: 0, dependsOn: [] },
  { id: 'colours-sorting', subject: 'arts-music', layer: 0, dependsOn: [] },
  { id: 'music-rhythm', subject: 'arts-music', layer: 0, dependsOn: [] },

  // Layer 1 — Early Structure, Decoding, Physical Science & Origins
  { id: 'number-sense', subject: 'math', layer: 1, dependsOn: ['counting'] },
  { id: 'skip-counting', subject: 'math', layer: 1, dependsOn: ['counting'] },
  { id: 'phonics-decoding', subject: 'ela', layer: 1, dependsOn: ['phonics-foundations'] },
  { id: 'grammar-syntax', subject: 'ela', layer: 1, dependsOn: ['phonics-foundations'] },
  { id: 'science-forces-physics', subject: 'science', layer: 1, dependsOn: ['science-earth-weather'] },
  { id: 'science-matter-chemistry', subject: 'science', layer: 1, dependsOn: ['science-earth-weather'] },
  { id: 'science-engineering', subject: 'science', layer: 1, dependsOn: ['patterns-coding'] },
  { id: 'great-stories', subject: 'world-history', layer: 1, dependsOn: ['world-geography'] },
  { id: 'art-design', subject: 'arts-music', layer: 1, dependsOn: ['colours-sorting'] },

  // Layer 2 — Additive Reasoning, Base-10, Vocab & World History
  { id: 'addition', subject: 'math', layer: 2, dependsOn: ['counting', 'number-sense'] },
  { id: 'place-value', subject: 'math', layer: 2, dependsOn: ['counting', 'number-sense'] },
  { id: 'measurement-time-money', subject: 'math', layer: 2, dependsOn: ['counting'] },
  { id: 'vocabulary-reading', subject: 'ela', layer: 2, dependsOn: ['phonics-decoding'] },
  { id: 'science-biology-genetics', subject: 'science', layer: 2, dependsOn: ['science-life-nature'] },
  { id: 'world-history', subject: 'world-history', layer: 2, dependsOn: ['world-geography'] },

  // Layer 3 — Subtraction, Fluency & Computing Foundations
  { id: 'subtraction', subject: 'math', layer: 3, dependsOn: ['addition'] },
  { id: 'math-facts', subject: 'math', layer: 3, dependsOn: ['addition', 'subtraction'] },
  { id: 'computer-science', subject: 'cs-logic', layer: 3, dependsOn: ['patterns-coding', 'logic-reasoning'] },
  { id: 'linguistics-writing', subject: 'ela', layer: 3, dependsOn: ['vocabulary-reading'] },

  // Layer 4 — Multiplicative Reasoning & Rational Numbers
  { id: 'multiplication', subject: 'math', layer: 4, dependsOn: ['addition', 'skip-counting'] },
  { id: 'division', subject: 'math', layer: 4, dependsOn: ['multiplication', 'subtraction'] },
  { id: 'fractions', subject: 'math', layer: 4, dependsOn: ['division', 'place-value'] },

  // Layer 5 — Secondary, University & Frontier (Uncapped)
  { id: 'algebra-equations', subject: 'math', layer: 5, dependsOn: ['fractions', 'multiplication'] },
  { id: 'probability-statistics', subject: 'math', layer: 5, dependsOn: ['fractions'] },
  { id: 'deep-math', subject: 'math', layer: 5, dependsOn: ['algebra-equations'] },
  { id: 'ai-machine-learning', subject: 'cs-logic', layer: 5, dependsOn: ['computer-science', 'probability-statistics'] },
]

export const DAG_BY_ID: Record<ConceptId, ConceptDagNode> = Object.fromEntries(
  CONCEPT_DAG.map((n) => [n.id, n]),
) as Record<ConceptId, ConceptDagNode>

export type FrontierZone = 'mastered' | 'frontier' | 'ahead'

export interface ConceptEvidence {
  secureItems: number
  rightCount: number
  attemptCount: number
  sources: string[]
}

export interface ConceptFrontierNode {
  id: ConceptId
  subject: SubjectId
  label: string
  color: string
  layer: number
  dependsOn: ConceptId[]
  zone: FrontierZone
  active: boolean
  override?: ConceptOverride
  evidence: ConceptEvidence
  note: string
}

export interface FrontierSnapshot {
  nodes: ConceptFrontierNode[]
  byId: Record<ConceptId, ConceptFrontierNode>
  masteredIds: Set<ConceptId>
  frontierIds: Set<ConceptId>
  activeFrontierIds: Set<ConceptId>
  aheadIds: Set<ConceptId>
  noiseFilteredCount: number
  totalEvidenceEvents: number
}

function localDay(t: number): string {
  if (t <= 0) return 'seed'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function filterNoisyEvents(events: readonly ProgressEvent[]): {
  clean: ProgressEvent[]
  droppedNoise: number
} {
  const clean: ProgressEvent[] = []
  let droppedNoise = 0
  for (const e of events) {
    if (e.ok !== undefined && e.ms !== undefined && e.ms >= 0 && e.ms < MIN_INTENTIONAL_MS) {
      droppedNoise++
      continue
    }
    clean.push(e)
  }
  return { clean, droppedNoise }
}

export function isItemSecureSticky(attempts: readonly ProgressEvent[]): boolean {
  const intentional = attempts.filter((e) => e.ok !== undefined)
  if (intentional.length === 0) return false
  const okDays = new Set(intentional.filter((e) => e.ok).map((e) => localDay(e.t)))
  if (okDays.size < 2) return false
  const last = intentional[intentional.length - 1]
  if (last.ok) return true
  const prev = intentional.length >= 2 ? intentional[intentional.length - 2] : null
  return prev ? Boolean(prev.ok) : true
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export interface StorageReader {
  getKey: (fullKey: string) => string | null
}

const defaultStorageReader: StorageReader = {
  getKey: (k) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null
    } catch {
      return null
    }
  },
}

function mapProgressEventToConcepts(e: ProgressEvent): ConceptId[] {
  if (e.app === 'add') return ['addition', 'math-facts']
  if (e.app === 'subtract') return ['subtraction', 'math-facts']
  if (e.app === 'times') return ['multiplication', 'math-facts']
  if (e.app === 'divide') return ['division', 'math-facts']
  if (e.app === 'sort' || e.concept === 'K.MD.B.3') return ['colours-sorting', 'logic-reasoning']
  if (e.app === 'graph' || e.concept === '5.G.A.1' || e.concept === '6.NS.C.8') return ['shapes-geometry', 'algebra-equations']
  if (e.app === 'sneeze') {
    if (e.concept === '3.OA.C.7') return e.item.includes('÷') ? ['division'] : ['multiplication']
    if (e.concept === '2.OA.B.2') return e.item.includes('+') ? ['addition'] : ['subtraction']
    return ['number-sense']
  }
  if ((CONCEPT_BY_ID as Record<string, unknown>)[e.concept]) {
    return [e.concept as ConceptId]
  }
  return []
}

export function computeFrontier(
  rawEvents: readonly ProgressEvent[],
  overrides: Partial<Record<ConceptId, ConceptOverride>> = {},
  reader: StorageReader = defaultStorageReader,
): FrontierSnapshot {
  const { clean, droppedNoise } = filterNoisyEvents(rawEvents)

  const evMap = new Map<ConceptId, ConceptEvidence>()
  const addSource = (cid: ConceptId, src: string) => {
    const cur = evMap.get(cid)
    if (cur && !cur.sources.includes(src)) cur.sources.push(src)
  }
  for (const node of CONCEPT_DAG) {
    evMap.set(node.id, { secureItems: 0, rightCount: 0, attemptCount: 0, sources: [] })
  }

  // 1. Group intentional progress events by (conceptId, item)
  const itemsByConcept = new Map<ConceptId, Map<string, ProgressEvent[]>>()
  for (const e of clean) {
    if (e.ok === undefined) continue
    const mapped = mapProgressEventToConcepts(e)
    for (const cid of mapped) {
      const ev = evMap.get(cid)
      if (!ev) continue
      ev.attemptCount++
      if (e.ok) ev.rightCount++
      addSource(cid, e.app)

      let byItem = itemsByConcept.get(cid)
      if (!byItem) {
        byItem = new Map()
        itemsByConcept.set(cid, byItem)
      }
      const arr = byItem.get(e.item) ?? []
      arr.push(e)
      byItem.set(e.item, arr)
    }
  }

  for (const [cid, byItem] of itemsByConcept) {
    const ev = evMap.get(cid)!
    for (const list of byItem.values()) {
      list.sort((a, b) => a.t - b.t)
      if (isItemSecureSticky(list)) ev.secureItems++
    }
  }

  // 2. Drill star saves
  const drillMap: [string, ConceptId, number][] = [
    ['add', 'addition', 10],
    ['subtract', 'subtraction', 10],
    ['times', 'multiplication', 12],
    ['divide', 'division', 12],
  ]
  for (const [app, cid, cols] of drillMap) {
    const saved = safeJson<{ stars?: Record<string, boolean> }>(reader.getKey(`rb:${app}:progress`), {})
    const starRows = Object.values(saved.stars ?? {}).filter(Boolean).length
    if (starRows > 0) {
      const ev = evMap.get(cid)!
      ev.secureItems = Math.max(ev.secureItems, starRows * cols)
      ev.rightCount = Math.max(ev.rightCount, starRows * cols)
      addSource(cid, app)
      if (starRows >= 3) {
        const mf = evMap.get('math-facts')!
        mf.secureItems += starRows * 2
        mf.rightCount += starRows * cols
        addSource('math-facts', app)
      }
    }
  }

  if (evMap.get('addition')!.rightCount >= 5) {
    evMap.get('counting')!.secureItems += 12
    evMap.get('number-sense')!.rightCount += 5
    addSource('counting', 'add')
  }

  // 3. Story5 evidence
  const storyWorkshops = safeJson<{ part?: number; correct?: boolean }[]>(reader.getKey('rb:shared:story5.workshop'), [])
  for (const w of storyWorkshops) {
    const cids: ConceptId[] =
      w.part === 1
        ? ['counting', 'number-sense']
        : w.part === 2
          ? ['place-value']
          : w.part === 3
            ? ['addition', 'subtraction']
            : w.part === 4
              ? ['multiplication', 'division']
              : w.part === 5 || w.part === 6
                ? ['fractions']
                : []
    for (const cid of cids) {
      const ev = evMap.get(cid)!
      ev.attemptCount++
      if (w.correct) {
        ev.rightCount++
        ev.secureItems++
      }
      addSource(cid, 'story5')
    }
  }
  const storyProg = safeJson<{ stars?: number[]; watched?: string[] }>(reader.getKey('rb:story5:progress'), {})
  for (const partStar of storyProg.stars ?? []) {
    if (partStar === 1) {
      evMap.get('counting')!.secureItems += 15
      evMap.get('number-sense')!.secureItems += 12
      addSource('counting', 'story5')
      addSource('number-sense', 'story5')
    } else if (partStar === 2) {
      evMap.get('place-value')!.secureItems += 15
      addSource('place-value', 'story5')
    } else if (partStar === 3) {
      evMap.get('addition')!.secureItems += 25
      evMap.get('subtraction')!.secureItems += 25
      addSource('addition', 'story5')
      addSource('subtraction', 'story5')
    } else if (partStar === 4) {
      evMap.get('multiplication')!.secureItems += 25
      evMap.get('division')!.secureItems += 25
      addSource('multiplication', 'story5')
      addSource('division', 'story5')
    } else if (partStar >= 5) {
      evMap.get('fractions')!.secureItems += 20
      addSource('fractions', 'story5')
    }
  }

  // 4. Symbols watched explainers & Stage Bench stars
  const symProg = safeJson<{ watched?: number[]; stars?: number[] }>(reader.getKey('rb:symbols:progress'), {})
  if ((symProg.stars ?? []).includes(1)) {
    for (const cid of ['addition', 'subtraction', 'multiplication', 'division'] as ConceptId[]) {
      evMap.get(cid)!.secureItems += 20
      addSource(cid, 'symbols')
    }
  }
  for (const rank of symProg.watched ?? []) {
    const cid: ConceptId =
      rank <= 2
        ? 'addition'
        : rank === 3
          ? 'multiplication'
          : rank === 4
            ? 'fractions'
            : rank <= 11
              ? 'algebra-equations'
              : 'deep-math'
    evMap.get(cid)!.rightCount += 2
    addSource(cid, 'symbols')
  }

  // 5. Gifted levels (logic, patterns & geometry)
  const giftedProg = safeJson<{ levels?: Record<string, number>; correct?: number }>(reader.getKey('rb:gifted:progress'), {})
  const maxGiftedLvl = Math.max(1, ...Object.values(giftedProg.levels ?? {}))
  if ((giftedProg.correct ?? 0) > 0) {
    evMap.get('logic-reasoning')!.rightCount += giftedProg.correct ?? 0
    evMap.get('patterns-coding')!.rightCount += giftedProg.correct ?? 0
    evMap.get('shapes-geometry')!.rightCount += Math.ceil((giftedProg.correct ?? 0) / 2)
    addSource('logic-reasoning', 'gifted')
    addSource('patterns-coding', 'gifted')
    addSource('shapes-geometry', 'gifted')
    if (maxGiftedLvl >= 4) {
      evMap.get('logic-reasoning')!.secureItems += 15
      evMap.get('patterns-coding')!.secureItems += 15
      evMap.get('shapes-geometry')!.secureItems += 12
    }
  }

  // 6. Sneeze road right-first-time guesses
  const sneezeRights = safeJson<Record<string, string[]>>(reader.getKey('rb:sneeze:roadRights'), {})
  const sneezeStops = Object.keys(sneezeRights).filter((k) => (sneezeRights[k]?.length ?? 0) >= 2).length
  if (sneezeStops > 0) {
    evMap.get('number-sense')!.rightCount += sneezeStops * 3
    evMap.get('subtraction')!.rightCount += sneezeStops * 2
    addSource('number-sense', 'sneeze')
    if (sneezeStops >= 3) evMap.get('number-sense')!.secureItems += 12
  }

  // 7. Scribble & Words (counting & phonics foundations/decoding)
  const scribbleStars = Number(reader.getKey('rb:scribble:stars') || 0)
  if (scribbleStars > 0) {
    evMap.get('counting')!.rightCount += scribbleStars * 2
    evMap.get('phonics-foundations')!.rightCount += scribbleStars * 2
    addSource('counting', 'scribble')
    addSource('phonics-foundations', 'scribble')
    if (scribbleStars >= 8) evMap.get('counting')!.secureItems += 12
  }
  const wordsIdx =
    Number(reader.getKey('rb:words:index1') || 0) +
    Number(reader.getKey('rb:words:index2') || 0) +
    Number(reader.getKey('rb:words:index3') || 0)
  if (wordsIdx > 0) {
    evMap.get('phonics-foundations')!.rightCount += wordsIdx
    evMap.get('phonics-decoding')!.rightCount += Math.floor(wordsIdx / 2)
    addSource('phonics-foundations', 'words')
    addSource('phonics-decoding', 'words')
    if (wordsIdx >= 15) evMap.get('phonics-foundations')!.secureItems += 12
  }

  const MASTERY_SECURE_THRESHOLD: Partial<Record<ConceptId, number>> = {
    addition: 25,
    subtraction: 25,
    'math-facts': 30,
    multiplication: 25,
    division: 25,
    fractions: 15,
    'algebra-equations': 20,
    'deep-math': 20,
  }

  const masteredIds = new Set<ConceptId>()
  for (const node of CONCEPT_DAG) {
    const ov = overrides[node.id]
    if (ov === 'mastered') {
      masteredIds.add(node.id)
      continue
    }
    if (ov === 'frontier') {
      continue
    }
    const ev = evMap.get(node.id)!
    const neededSecure = MASTERY_SECURE_THRESHOLD[node.id] ?? 12
    const autoMastered =
      ev.secureItems >= neededSecure ||
      (node.id === 'colours-sorting' && ev.rightCount >= 10) ||
      (node.id === 'shapes-geometry' && ev.rightCount >= 14)
    if (autoMastered) masteredIds.add(node.id)
  }

  const frontierIds = new Set<ConceptId>()
  const activeFrontierIds = new Set<ConceptId>()
  const aheadIds = new Set<ConceptId>()
  const nodes: ConceptFrontierNode[] = []

  for (const dag of CONCEPT_DAG) {
    const meta = CONCEPT_BY_ID[dag.id]
    const ev = evMap.get(dag.id)!
    const ov = overrides[dag.id]

    let zone: FrontierZone
    if (masteredIds.has(dag.id)) {
      zone = 'mastered'
    } else if (ov === 'frontier' || dag.dependsOn.every((dep) => masteredIds.has(dep))) {
      zone = 'frontier'
      frontierIds.add(dag.id)
    } else {
      zone = 'ahead'
      aheadIds.add(dag.id)
    }

    const active = zone === 'frontier' && (ev.rightCount > 0 || ev.attemptCount > 0 || ov === 'frontier')
    if (active) activeFrontierIds.add(dag.id)

    let note: string
    if (ov === 'mastered') note = 'Marked mastered'
    else if (ov === 'frontier') note = 'Pinned to frontier'
    else if (zone === 'mastered') {
      note = ev.sources.length ? `Mastered via ${ev.sources.join(', ')}` : 'Mastered'
    } else if (zone === 'frontier') {
      note = active
        ? `Practicing now (${ev.rightCount} right in ${ev.sources.join(', ') || 'apps'})`
        : dag.dependsOn.length === 0
          ? 'Ready to explore'
          : `Unlocked by ${dag.dependsOn.map((d) => CONCEPT_BY_ID[d]?.label ?? d).join(' + ')}`
    } else {
      const missing = dag.dependsOn.filter((d) => !masteredIds.has(d)).map((d) => CONCEPT_BY_ID[d]?.label ?? d)
      note = `Needs ${missing.join(' & ')}`
    }

    nodes.push({
      id: dag.id,
      subject: dag.subject,
      label: meta.label,
      color: meta.color,
      layer: dag.layer,
      dependsOn: dag.dependsOn,
      zone,
      active,
      override: ov,
      evidence: ev,
      note,
    })
  }

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<ConceptId, ConceptFrontierNode>
  return {
    nodes,
    byId,
    masteredIds,
    frontierIds,
    activeFrontierIds,
    aheadIds,
    noiseFilteredCount: droppedNoise,
    totalEvidenceEvents: clean.length,
  }
}

export function evaluateVideoFrontier(
  video: ProximalVideo,
  frontier: FrontierSnapshot,
): { proximal: boolean; fitScore: number; reason: string } {
  const { masteredIds, frontierIds, activeFrontierIds, aheadIds } = frontier

  const unmetHardPrereq = video.needs.some((req) => aheadIds.has(req))
  if (unmetHardPrereq) {
    return { proximal: false, fitScore: 0, reason: '' }
  }

  const activeHits = video.concepts.filter((c) => activeFrontierIds.has(c))
  const frontierHits = video.concepts.filter((c) => frontierIds.has(c))
  const aheadHits = video.concepts.filter((c) => aheadIds.has(c))

  if (frontierHits.length === 0) {
    return { proximal: false, fitScore: 0, reason: '' }
  }
  if (aheadIds.has(video.concepts[0])) {
    return { proximal: false, fitScore: 0, reason: '' }
  }

  // Gate university/HS videos unless an upper-layer concept is actually on the frontier or mastered
  const upperReady =
    frontierIds.has('algebra-equations') ||
    masteredIds.has('algebra-equations') ||
    frontierIds.has('deep-math') ||
    masteredIds.has('deep-math') ||
    frontierIds.has('computer-science') ||
    masteredIds.has('computer-science') ||
    frontierIds.has('ai-machine-learning') ||
    masteredIds.has('ai-machine-learning') ||
    frontierIds.has('science-biology-genetics') ||
    masteredIds.has('science-biology-genetics')

  if ((video.levelBand === 'university' || video.levelBand === 'hs') && !upperReady && activeHits.length === 0) {
    return { proximal: false, fitScore: 0, reason: '' }
  }

  const prereqsFullyMastered = video.needs.every((req) => masteredIds.has(req))
  let fitScore = 0.55
  if (prereqsFullyMastered) fitScore += 0.2
  if (activeHits.length > 0) fitScore += 0.22
  if (aheadHits.length > 0) fitScore -= 0.12
  if (video.format === 'episode') fitScore += 0.08
  if (video.seasonal) fitScore -= 0.12

  const leadConcept = activeHits[0] ?? frontierHits[0]
  const label = CONCEPT_BY_ID[leadConcept]?.label ?? leadConcept
  const reason = activeHits.length > 0 ? `⚡ Active Frontier · ${label}` : `⚡ Ready Next · ${label}`

  return { proximal: true, fitScore, reason }
}
