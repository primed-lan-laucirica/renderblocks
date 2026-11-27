/**
 * Proximal Learning Frontier Bridge
 *
 * Uses the shared continuous Frontier Engine from `@renderblocks/kernel` so
 * Kernel VQs, Progress, and Proximal all operate on the exact same mastery,
 * confidence, and uncapped PreK -> University level-band state.
 */
import {
  BAND_BY_ID,
  CONCEPT_BY_ID,
  CONCEPT_DAG,
  DAG_BY_ID,
  MIN_INTENTIONAL_MS,
  computeFrontier,
  filterNoisyEvents,
  isItemSecureSticky,
  readProximalExposure,
  readSharedOverrides,
  recordProximalExposure,
  writeSharedOverrides,
  type ConceptDagNode,
  type ConceptEvidence,
  type ConceptExposure,
  type ConceptFrontierNode,
  type FrontierSnapshot,
  type FrontierZone,
  type StorageReader,
} from '@renderblocks/kernel'
import type { ProximalVideo } from '../types'

export {
  CONCEPT_DAG,
  DAG_BY_ID,
  MIN_INTENTIONAL_MS,
  computeFrontier,
  filterNoisyEvents,
  isItemSecureSticky,
  readProximalExposure,
  readSharedOverrides,
  recordProximalExposure,
  writeSharedOverrides,
}
export type {
  ConceptDagNode,
  ConceptEvidence,
  ConceptExposure,
  ConceptFrontierNode,
  FrontierSnapshot,
  FrontierZone,
  StorageReader,
}

export function evaluateVideoFrontier(
  video: ProximalVideo,
  frontier: FrontierSnapshot,
): { proximal: boolean; fitScore: number; reason: string } {
  const { masteredIds, frontierIds, activeFrontierIds, aheadIds, byId, subjectBand } = frontier

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

  // Gate HS/University videos until the subject's band or upper-layer concepts advance (uncapped upward)
  const videoBandOrder = BAND_BY_ID[video.levelBand]?.order ?? 0
  const curSubjectBand = subjectBand[video.primarySubject] ?? 0.5
  const upperConceptOpen =
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

  if (
    (video.levelBand === 'university' || video.levelBand === 'hs') &&
    !upperConceptOpen &&
    videoBandOrder - curSubjectBand > 2.2 &&
    activeHits.length === 0
  ) {
    return { proximal: false, fitScore: 0, reason: '' }
  }

  const leadConcept = activeHits[0] ?? frontierHits[0]
  const leadNode = byId[leadConcept]
  const pM = leadNode?.pMastery ?? 0.45

  // Peak ZPD around pMastery = 0.50 (sweet spot [0.30, 0.75])
  const zpdCurve = Math.max(0.2, 1 - Math.abs(pM - 0.52) * 1.4)
  const prereqsFullyMastered = video.needs.every((req) => masteredIds.has(req))

  let fitScore = 0.42 + 0.35 * zpdCurve
  if (prereqsFullyMastered) fitScore += 0.14
  if (activeHits.length > 0) fitScore += 0.15
  if (aheadHits.length > 0) fitScore -= 0.12
  if (video.format === 'episode') fitScore += 0.06
  if (video.seasonal) fitScore -= 0.12

  const label = CONCEPT_BY_ID[leadConcept]?.label ?? leadConcept
  const reason = activeHits.length > 0 ? `⚡ Active Frontier · ${label}` : `⚡ Ready Next · ${label}`

  return { proximal: true, fitScore, reason }
}
