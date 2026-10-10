import type { ComponentType } from 'react'
import type { GameServices } from '@renderblocks/kernel'

export interface WorkshopProps {
  services: GameServices
  onBack: () => void
  /** A clean Mastery run: the part's card gets its star. */
  onStar: () => void
}

/** A part's workshop: its screen, and every line it speaks (for scripts/voice.mjs). */
export interface WorkshopDef {
  View: ComponentType<WorkshopProps>
  lines: string[]
}

/** Lines every workshop shares. */
export const COMMON_LINES = {
  clean: 'A clean run!',
  again: 'Again, for the star?',
} as const

export const LOCKOUT_MS = 1200
