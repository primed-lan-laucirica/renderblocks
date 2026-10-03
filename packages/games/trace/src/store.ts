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
  path: 'solid' | 'dots'
  lines: boolean
  size: Size
}
export const DEFAULT_GUIDES: Guides = { arrows: true, path: 'solid', lines: true, size: 'big' }

/** The step a tracing page is drawn at: always locked to the path. */
export const traceStep = (g: Guides): FadeStep => (g.path === 'solid' ? { phase: 'solid', arrows: g.arrows, locked: true } : { phase: 'dots', spacing: 0.16, arrows: g.arrows, locked: true })

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
