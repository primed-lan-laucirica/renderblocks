import type { NamespacedStorage } from '@renderblocks/kernel'
import type { Item } from './items'
import type { Ink, Pen, Size } from './Page'
import type { FadeStep } from './fade'

/** Read a saved value, falling back when it's missing or unreadable. */
export function load<T>(storage: NamespacedStorage, key: string, fallback: T): T {
  try {
    const raw = storage.get(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

export function loadList<T>(storage: NamespacedStorage, key: string): T[] {
  try {
    const v = JSON.parse(storage.get(key) ?? '[]') as unknown
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

/** Crayons, plus a rainbow pen. */
export const COLOURS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#1F2937']
export const NIBS = [
  { label: 'thin', nib: 0.1 },
  { label: 'medium', nib: 0.16 },
  { label: 'thick', nib: 0.24 },
]
export const DEFAULT_PEN: Pen = { color: '#3B82F6', rainbow: false, nib: 0.16 }

/** Tracing guides, each on or off. */
export interface Guides {
  arrows: boolean
  /** The sparsity slider: 0 is the solid track, then dots further and further apart (SPARSITY). */
  sparsity: number
  lines: boolean
  size: Size
}
export const DEFAULT_GUIDES: Guides = { arrows: true, sparsity: 0, lines: true, size: 'big' }

/**
 * The sparsity slider's stops: the solid track, then dots spaced further
 * apart each stop (units; x-height is 1), then only the dots that carry the
 * shape (starts, ends, corners, curve tops and sides), then start dots only.
 */
export const SPARSITY: Array<Pick<FadeStep, 'spacing' | 'startsOnly'> | null> = [
  null,
  { spacing: 0.16 },
  { spacing: 0.22 },
  { spacing: 0.3 },
  { spacing: 0.42 },
  { spacing: 0.6 },
  { spacing: 0.85 },
  { spacing: 1.2 },
  { spacing: Infinity },
  { startsOnly: true },
]

/** The step a tracing page is drawn at: always locked to the path, at the slider's sparsity. */
export function traceStep(g: Guides): FadeStep {
  const stop = SPARSITY[Math.max(0, Math.min(SPARSITY.length - 1, Math.round(g.sparsity ?? 0)))]
  return stop ? { phase: 'dots', ...stop, arrows: g.arrows, locked: true } : { phase: 'solid', arrows: g.arrows, locked: true }
}

/** A finished page in his gallery. */
export interface Saved {
  id: string
  item: Item
  /** When it was finished (ms). */
  at: number
  pen: Pen
  ink: Ink[]
  /** Wrap width it was written at. */
  wrap?: number
}
export const GALLERY_MAX = 60
