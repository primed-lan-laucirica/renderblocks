/** Shorthand for the explainers' cells. */
import type { Cell, Glyph } from '../types'

export const BLUE = '#3b82f6'
export const RED = '#ef4444'
export const GREEN_ = '#22c55e'
export const YELLOW = '#f59e0b'
export const pic = (emoji: string, count?: number): Cell => ({ kind: 'pic', emoji, ...(count ? { count } : {}) })
export const num = (value: number): Cell => ({ kind: 'number', value })
export const text = (t: string): Cell => ({ kind: 'text', text: t })
export const Q = text('?')
/** n of one shape (all alike), at a size (1 big, 0.5 small). */
export const shape = (s: Glyph['shape'], color: string, n = 1, fill: Glyph['fill'] = 'solid', size = 1): Cell => ({
  kind: 'glyphs',
  glyphs: Array.from({ length: n }, () => ({ shape: s, color, size: n === 1 ? size : Math.min(size, 0.72), rotation: 0, fill })),
})
