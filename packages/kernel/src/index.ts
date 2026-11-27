export { KernelApp } from './KernelApp'
export { createNamespacedStorage } from './services/storage'
export { createProgressLog, readAll } from './services/progress'
export type {
  GameCapability,
  GameModule,
  GameProps,
  GameServices,
  GameTile,
  NamespacedStorage,
  ProgressEvent,
  ProgressLog,
  UpcomingGame,
} from './types'
export {
  numberToClips,
  playClips,
  speakNumber,
  speakEquation,
  speakEquationPrompt,
  stopSpeech,
  OPERATOR_CLIP,
} from './numberSpeech'

// Shared Learning Frontier & Validation Quizlets (used by Kernel, Progress, and Proximal)
export {
  SUBJECTS,
  SUBJECT_BY_ID,
  LEVEL_BANDS,
  BAND_BY_ID,
  CONCEPTS,
  CONCEPT_BY_ID,
  CONCEPT_DAG,
  DAG_BY_ID,
} from './frontier/taxonomy'
export type {
  SubjectId,
  LevelBandId,
  ConceptId,
  ConceptOverride,
  SubjectMeta,
  LevelBandMeta,
  ConceptMeta,
  ConceptDagNode,
} from './frontier/taxonomy'
export {
  MIN_INTENTIONAL_MS,
  SHARED_OVERRIDES_KEY,
  SHARED_EXPOSURE_KEY,
  filterNoisyEvents,
  isItemSecureSticky,
  readSharedOverrides,
  writeSharedOverrides,
  readProximalExposure,
  recordProximalExposure,
  computeFrontier,
} from './frontier/mastery'
export type {
  FrontierZone,
  ConceptExposure,
  ConceptEvidence,
  ConceptFrontierNode,
  FrontierSnapshot,
  StorageReader,
} from './frontier/mastery'
export {
  VQ_CADENCE_KEY,
  MIN_TILE_DWELL_MS,
  AUTO_VQ_COOLDOWN_MS,
  SKIP_BACKOFF_MS,
  EXITS_BETWEEN_VQS,
  readVqCadence,
  writeVqCadence,
  evaluateTransitionVqTrigger,
  recordVqCompletion,
  pickNextVq,
} from './frontier/vq'
export type { ValidationQuizlet, VqCadenceState, VqVisual } from './frontier/vq'
export { VqPopup } from './frontier/VqPopup'
