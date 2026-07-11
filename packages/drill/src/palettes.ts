/**
 * Literal class strings only — Tailwind scans this file via @source, so
 * every class a palette needs must appear here verbatim (no interpolation).
 */
export type PaletteName = 'emerald' | 'orange' | 'cyan' | 'rose'

export interface Palette {
  container: string
  select: string
  dotDone: string
  accent: string
  button: string
  overlay: string
  overlaySub: string
}

export const PALETTES: Record<PaletteName, Palette> = {
  emerald: {
    container: 'bg-linear-to-b from-emerald-100 via-cloud to-cloud-lavender',
    select: 'text-emerald-700 border-emerald-300',
    dotDone: 'bg-emerald-500',
    accent: 'text-emerald-600',
    button: 'text-emerald-700 border-emerald-300 active:bg-emerald-50',
    overlay: 'bg-emerald-500/90',
    overlaySub: 'text-emerald-100',
  },
  orange: {
    container: 'bg-linear-to-b from-orange-100 via-cloud to-cloud-lavender',
    select: 'text-orange-700 border-orange-300',
    dotDone: 'bg-orange-500',
    accent: 'text-orange-600',
    button: 'text-orange-700 border-orange-300 active:bg-orange-50',
    overlay: 'bg-orange-500/90',
    overlaySub: 'text-orange-100',
  },
  cyan: {
    container: 'bg-linear-to-b from-cyan-100 via-cloud to-cloud-lavender',
    select: 'text-cyan-700 border-cyan-300',
    dotDone: 'bg-cyan-500',
    accent: 'text-cyan-600',
    button: 'text-cyan-700 border-cyan-300 active:bg-cyan-50',
    overlay: 'bg-cyan-500/90',
    overlaySub: 'text-cyan-100',
  },
  rose: {
    container: 'bg-linear-to-b from-rose-100 via-cloud to-cloud-lavender',
    select: 'text-rose-700 border-rose-300',
    dotDone: 'bg-rose-500',
    accent: 'text-rose-600',
    button: 'text-rose-700 border-rose-300 active:bg-rose-50',
    overlay: 'bg-rose-500/90',
    overlaySub: 'text-rose-100',
  },
}
