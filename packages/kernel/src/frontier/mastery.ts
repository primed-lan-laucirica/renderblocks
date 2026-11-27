/**
 * Shared Continuous Learning Frontier Engine (PreK -> University, Uncapped)
 *
 * Synthesizes a single continuous mastery & confidence estimate per concept across:
 *  1. Shared IndexedDB progress log (`renderblocks-progress`), including drills,
 *     sneeze, sort, graph, proximal, and app-wide Validation Quizlets (`app: 'vq'`)
 *  2. Legacy/private app saves (`add/subtract/times/divide`, `story5`, `symbols`,
 *     `gifted`, `sneeze`, `scribble`, `words`)
 *  3. Shared Proximal watch-dwell exposure (`rb:shared:proximal.exposure`), which
 *     informs where VQs should probe next without ever auto-mastering a concept
 *  4. Shared parent overrides (`rb:shared:frontier.overrides`)
 *
 * Noise handling:
 *  - Filters rapid button-mashing (< 600ms) from mastery updates
 *  - Asymmetric sticky mastery: isolated playful wrong taps barely dent mastery,
 *    while repeated deliberate misses pull pMastery down cleanly.
 */
import type { ProgressEvent } from '../types'
import {
  CONCEPT_BY_ID,
  CONCEPT_DAG,
  SUBJECTS,
  type ConceptId,
  type ConceptOverride,
  type SubjectId,
} from './taxonomy'

/** Minimum response time (ms) to count as intentional rather than a button-mash. */
export const MIN_INTENTIONAL_MS = 600

export const SHARED_OVERRIDES_KEY = 'rb:shared:frontier.overrides'
export const SHARED_EXPOSURE_KEY = 'rb:shared:proximal.exposure'

export type FrontierZone = 'mastered' | 'frontier' | 'ahead'

export interface ConceptExposure {
  seconds: number
  count: number
  lastAt: number
}

export interface ConceptEvidence {
  secureItems: number
  rightCount: number
  attemptCount: number
  vqRight: number
  vqAttempts: number
  lastVqAt: number
  exposureSeconds: number
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
  /** Continuous estimated probability of mastery in [0, 1]. */
  pMastery: number
  /** Resolution/confidence in pMastery in [0, 1]. Low confidence attracts VQ probes. */
  confidence: number
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
  /** Estimated current level band order per subject (0.0 = PreK .. 5.0 = University). */
  subjectBand: Record<SubjectId, number>
  noiseFilteredCount: number
  totalEvidenceEvents: number
  totalVqAttempts: number
  totalVqRight: number
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
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

export function readSharedOverrides(
  reader: StorageReader = defaultStorageReader,
): Partial<Record<ConceptId, ConceptOverride>> {
  const shared = safeJson<Partial<Record<ConceptId, ConceptOverride>>>(
    reader.getKey(SHARED_OVERRIDES_KEY),
    {},
  )
  // Merge legacy Proximal overrides if shared store doesn't set them yet
  const legacyState = safeJson<{ conceptOverrides?: Partial<Record<ConceptId, ConceptOverride>> }>(
    reader.getKey('rb:proximal:learner_state_v1'),
    {},
  )
  return { ...(legacyState.conceptOverrides ?? {}), ...shared }
}

export function writeSharedOverrides(overrides: Partial<Record<ConceptId, ConceptOverride>>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SHARED_OVERRIDES_KEY, JSON.stringify(overrides))
    }
  } catch {
    // ignore storage errors
  }
}

export function readProximalExposure(
  reader: StorageReader = defaultStorageReader,
): Partial<Record<ConceptId, ConceptExposure>> {
  return safeJson<Partial<Record<ConceptId, ConceptExposure>>>(reader.getKey(SHARED_EXPOSURE_KEY), {})
}

export function recordProximalExposure(concepts: readonly ConceptId[], dwellSeconds: number, now = Date.now()): void {
  if (dwellSeconds < 15 || concepts.length === 0) return
  try {
    if (typeof localStorage === 'undefined') return
    const cur = readProximalExposure()
    for (const cid of concepts) {
      const prev = cur[cid] ?? { seconds: 0, count: 0, lastAt: 0 }
      cur[cid] = {
        seconds: Math.round(prev.seconds + dwellSeconds),
        count: prev.count + 1,
        lastAt: now,
      }
    }
    localStorage.setItem(SHARED_EXPOSURE_KEY, JSON.stringify(cur))
  } catch {
    // ignore storage errors
  }
}

function mapProgressEventToConcepts(e: ProgressEvent): ConceptId[] {
  // Direct concept id (used by VQs and future apps)
  if ((CONCEPT_BY_ID as Record<string, unknown>)[e.concept]) {
    return [e.concept as ConceptId]
  }
  if (e.app === 'add') return ['addition', 'math-facts']
  if (e.app === 'subtract') return ['subtraction', 'math-facts']
  if (e.app === 'times') return ['multiplication', 'math-facts']
  if (e.app === 'divide') return ['division', 'math-facts']
  if (e.app === 'sort' || e.concept === 'K.MD.B.3') return ['colours-sorting', 'logic-reasoning']
  if (e.app === 'graph' || e.concept === '5.G.A.1' || e.concept === '6.NS.C.8') {
    return ['shapes-geometry', 'algebra-equations']
  }
  if (e.app === 'sneeze') {
    if (e.concept === '3.OA.C.7') return e.item.includes('÷') ? ['division'] : ['multiplication']
    if (e.concept === '2.OA.B.2') return e.item.includes('+') ? ['addition'] : ['subtraction']
    return ['number-sense']
  }
  if (e.app === 'vq') {
    if (e.concept === '2.OA.B.2') return e.item.includes('−') || e.item.includes('-') ? ['subtraction'] : ['addition']
    if (e.concept === '3.OA.C.7') return e.item.includes('÷') ? ['division'] : ['multiplication']
  }
  return []
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

export function computeFrontier(
  rawEvents: readonly ProgressEvent[],
  explicitOverrides?: Partial<Record<ConceptId, ConceptOverride>>,
  reader: StorageReader = defaultStorageReader,
): FrontierSnapshot {
  const overrides = explicitOverrides ?? readSharedOverrides(reader)
  const exposureMap = readProximalExposure(reader)
  const { clean, droppedNoise } = filterNoisyEvents(rawEvents)

  const evMap = new Map<ConceptId, ConceptEvidence>()
  const addSource = (cid: ConceptId, src: string) => {
    const cur = evMap.get(cid)
    if (cur && !cur.sources.includes(src)) cur.sources.push(src)
  }
  for (const node of CONCEPT_DAG) {
    evMap.set(node.id, {
      secureItems: 0,
      rightCount: 0,
      attemptCount: 0,
      vqRight: 0,
      vqAttempts: 0,
      lastVqAt: 0,
      exposureSeconds: exposureMap[node.id]?.seconds ?? 0,
      sources: [],
    })
  }

  let totalVqAttempts = 0
  let totalVqRight = 0

  // 1. Group intentional progress events by (conceptId, item) and track VQ probes
  const itemsByConcept = new Map<ConceptId, Map<string, ProgressEvent[]>>()
  const vqHistoryByConcept = new Map<ConceptId, ProgressEvent[]>()

  for (const e of clean) {
    if (e.ok === undefined) continue
    const mapped = mapProgressEventToConcepts(e)
    const isVq = e.app === 'vq' || e.how === 'vq'
    if (isVq) {
      totalVqAttempts++
      if (e.ok) totalVqRight++
    }
    for (const cid of mapped) {
      const ev = evMap.get(cid)
      if (!ev) continue
      ev.attemptCount++
      if (e.ok) ev.rightCount++
      addSource(cid, isVq ? 'vq' : e.app)

      if (isVq) {
        ev.vqAttempts++
        if (e.ok) ev.vqRight++
        ev.lastVqAt = Math.max(ev.lastVqAt, e.t)
        const vqList = vqHistoryByConcept.get(cid) ?? []
        vqList.push(e)
        vqHistoryByConcept.set(cid, vqList)
      }

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
  const storyWorkshops = safeJson<{ part?: number; correct?: boolean }[]>(
    reader.getKey('rb:shared:story5.workshop'),
    [],
  )
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

  // 5. Gifted levels
  const giftedProg = safeJson<{ levels?: Record<string, number>; correct?: number }>(
    reader.getKey('rb:gifted:progress'),
    {},
  )
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

  // 7. Scribble & Words
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

  // 8. Compute continuous (pMastery, confidence) & discrete zone per concept
  const pMasteryMap = new Map<ConceptId, number>()
  const confidenceMap = new Map<ConceptId, number>()
  const masteredIds = new Set<ConceptId>()

  for (const dag of CONCEPT_DAG) {
    const ev = evMap.get(dag.id)!
    const ov = overrides[dag.id]
    const neededSecure = MASTERY_SECURE_THRESHOLD[dag.id] ?? 12

    if (ov === 'mastered') {
      pMasteryMap.set(dag.id, 0.96)
      confidenceMap.set(dag.id, 0.95)
      masteredIds.add(dag.id)
      continue
    }

    // Passive app evidence signal (excluding VQ events so VQs aren't double-counted as tiny passive ratios)
    const passiveRights = Math.max(0, ev.rightCount - ev.vqRight)
    const passiveAttempts = Math.max(0, ev.attemptCount - ev.vqAttempts)
    const secureRatio = clamp(ev.secureItems / neededSecure, 0, 1)
    const passiveRightRatio = clamp(passiveRights / (neededSecure * 1.3), 0, 1)
    const passiveAcc =
      passiveAttempts > 0 ? clamp((passiveRights + 1) / (passiveAttempts + 1.5), 0.15, 0.95) : 0.5

    // High-signal Validation Quizlet (VQ) sequential Bayesian-like update
    // Asymmetric: right lifts strongly; a single miss dips mildly (toddler playful tap),
    // two deliberate misses pull pMastery down cleanly.
    const vqList = (vqHistoryByConcept.get(dag.id) ?? []).slice().sort((a, b) => a.t - b.t)
    let vqAlpha = 1.2
    let vqBeta = 1.2
    let consecutiveMiss = 0
    for (const vqe of vqList) {
      if (vqe.ok) {
        vqAlpha += 2.2
        consecutiveMiss = 0
      } else {
        consecutiveMiss++
        // Single playful miss weighs light (0.65); repeated deliberate misses weigh heavier (1.6)
        vqBeta += consecutiveMiss >= 2 ? 1.6 : 0.65
      }
    }
    const vqEstimate = vqAlpha / (vqAlpha + vqBeta)
    const vqWeight = ev.vqAttempts > 0 ? clamp(ev.vqAttempts / (ev.vqAttempts + 1.4), 0.35, 0.85) : 0

    // Combine passive + VQ
    const hasPassive = ev.secureItems > 0 || passiveRights > 0 || passiveAttempts > 0
    const passiveMastery = hasPassive
      ? clamp(0.65 * secureRatio + 0.25 * passiveRightRatio + 0.1 * passiveAcc, 0.1, 0.96)
      : dag.layer === 0
        ? 0.28
        : 0.12

    let pMastery =
      ev.vqAttempts > 0
        ? hasPassive
          ? passiveMastery * (1 - vqWeight * 0.65) + vqEstimate * (vqWeight * 0.65)
          : vqEstimate
        : passiveMastery

    // Confidence grows with secure items, non-VQ right answers, and especially VQ checks
    let confidence = clamp(
      0.08 +
        Math.min(0.55, secureRatio * 0.55) +
        Math.min(0.25, (ev.rightCount / (neededSecure * 1.5)) * 0.25) +
        Math.min(0.65, ev.vqAttempts * 0.26),
      0.08,
      0.98,
    )

    if (ov === 'frontier') {
      pMastery = clamp(Math.min(pMastery, 0.62), 0.38, 0.62)
      confidence = Math.max(confidence, 0.75)
    }

    pMasteryMap.set(dag.id, Number(pMastery.toFixed(3)))
    confidenceMap.set(dag.id, Number(confidence.toFixed(3)))

    const autoMastered =
      ov !== 'frontier' &&
      (ev.secureItems >= neededSecure ||
        (dag.id === 'colours-sorting' && ev.rightCount >= 10) ||
        (dag.id === 'shapes-geometry' && ev.rightCount >= 14) ||
        (ev.vqAttempts >= 2 && ev.vqRight >= 2 && pMastery >= 0.78 && confidence >= 0.55) ||
        (pMastery >= 0.82 && confidence >= 0.6))

    if (autoMastered) masteredIds.add(dag.id)
  }

  // 9. Assign discrete zones (mastered / frontier / ahead) & build readable notes
  const frontierIds = new Set<ConceptId>()
  const activeFrontierIds = new Set<ConceptId>()
  const aheadIds = new Set<ConceptId>()
  const nodes: ConceptFrontierNode[] = []

  for (const dag of CONCEPT_DAG) {
    const meta = CONCEPT_BY_ID[dag.id]
    const ev = evMap.get(dag.id)!
    const ov = overrides[dag.id]
    const pMastery = pMasteryMap.get(dag.id) ?? 0.2
    const confidence = confidenceMap.get(dag.id) ?? 0.1

    const prereqsStrong = dag.dependsOn.every(
      (dep) => masteredIds.has(dep) || ((pMasteryMap.get(dep) ?? 0) >= 0.72 && (confidenceMap.get(dep) ?? 0) >= 0.45),
    )

    let zone: FrontierZone
    if (masteredIds.has(dag.id)) {
      zone = 'mastered'
    } else if (ov === 'frontier' || prereqsStrong) {
      zone = 'frontier'
      frontierIds.add(dag.id)
    } else {
      zone = 'ahead'
      aheadIds.add(dag.id)
    }

    const active =
      zone === 'frontier' &&
      (ev.rightCount > 0 || ev.attemptCount > 0 || ev.exposureSeconds >= 30 || ov === 'frontier')
    if (active) activeFrontierIds.add(dag.id)

    let note: string
    if (ov === 'mastered') note = 'Marked mastered'
    else if (ov === 'frontier') note = 'Pinned to frontier'
    else if (zone === 'mastered') {
      note = ev.sources.length ? `Mastered via ${ev.sources.join(', ')}` : 'Mastered'
    } else if (zone === 'frontier') {
      if (ev.vqAttempts > 0) {
        note = `Quick Checks: ${ev.vqRight}/${ev.vqAttempts} · ${Math.round(pMastery * 100)}% est.`
      } else if (ev.rightCount > 0) {
        note = `Practicing (${ev.rightCount} right in ${ev.sources.join(', ') || 'apps'})`
      } else if (ev.exposureSeconds >= 30) {
        note = `Watched ${Math.round(ev.exposureSeconds / 60)}m in Proximal — ready to verify`
      } else if (dag.dependsOn.length === 0) {
        note = 'Ready to explore'
      } else {
        note = `Unlocked by ${dag.dependsOn.map((d) => CONCEPT_BY_ID[d]?.label ?? d).join(' + ')}`
      }
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
      pMastery,
      confidence,
      active,
      override: ov,
      evidence: ev,
      note,
    })
  }

  // 10. Estimate current level band per subject (0.0 PreK -> 5.0 University, uncapped)
  const subjectBand = {} as Record<SubjectId, number>
  for (const s of SUBJECTS) {
    const subNodes = nodes.filter((n) => n.subject === s.id)
    let bestBand = 0.5
    for (const n of subNodes) {
      const band = CONCEPT_BY_ID[n.id].typicalBand
      if (n.zone === 'mastered') {
        bestBand = Math.max(bestBand, band + 0.65)
      } else if (n.zone === 'frontier' && n.pMastery >= 0.45 && n.confidence >= 0.3) {
        bestBand = Math.max(bestBand, band)
      }
    }
    subjectBand[s.id] = Number(clamp(bestBand, 0, 5).toFixed(2))
  }

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<ConceptId, ConceptFrontierNode>
  return {
    nodes,
    byId,
    masteredIds,
    frontierIds,
    activeFrontierIds,
    aheadIds,
    subjectBand,
    noiseFilteredCount: droppedNoise,
    totalEvidenceEvents: clean.length,
    totalVqAttempts,
    totalVqRight,
  }
}
