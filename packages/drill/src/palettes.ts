/**
 * Literal class strings only — Tailwind scans this file via @source, so
 * every class a palette needs must appear here verbatim (no interpolation).
 */
export type PaletteName = 'emerald' | 'orange' | 'cyan' | 'rose'

export interface Palette {
  container: string
  containerDark: string
  select: string
  selectDark: string
  dotDone: string
  accent: string
  accentDark: string
  button: string
  buttonDark: string
  overlay: string
  overlaySub: string
}

export const PALETTES: Record<PaletteName, Palette> = {
  emerald: {
    container: 'bg-linear-to-b from-emerald-100 via-cloud to-cloud-lavender',
    containerDark: 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950',
    select: 'bg-white text-emerald-700 border-emerald-300',
    selectDark: 'bg-slate-800 text-emerald-300 border-emerald-700',
    dotDone: 'bg-emerald-500',
    accent: 'text-emerald-600',
    accentDark: 'text-emerald-400',
    button: 'bg-white text-emerald-700 border-emerald-300 active:bg-emerald-50',
    buttonDark: 'bg-slate-800 text-emerald-300 border-emerald-700 active:bg-slate-700',
    overlay: 'bg-emerald-500/90',
    overlaySub: 'text-emerald-100',
  },
  orange: {
    container: 'bg-linear-to-b from-orange-100 via-cloud to-cloud-lavender',
    containerDark: 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950',
    select: 'bg-white text-orange-700 border-orange-300',
    selectDark: 'bg-slate-800 text-orange-300 border-orange-700',
    dotDone: 'bg-orange-500',
    accent: 'text-orange-600',
    accentDark: 'text-orange-400',
    button: 'bg-white text-orange-700 border-orange-300 active:bg-orange-50',
    buttonDark: 'bg-slate-800 text-orange-300 border-orange-700 active:bg-slate-700',
    overlay: 'bg-orange-500/90',
    overlaySub: 'text-orange-100',
  },
  cyan: {
    container: 'bg-linear-to-b from-cyan-100 via-cloud to-cloud-lavender',
    containerDark: 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950',
    select: 'bg-white text-cyan-700 border-cyan-300',
    selectDark: 'bg-slate-800 text-cyan-300 border-cyan-700',
    dotDone: 'bg-cyan-500',
    accent: 'text-cyan-600',
    accentDark: 'text-cyan-400',
    button: 'bg-white text-cyan-700 border-cyan-300 active:bg-cyan-50',
    buttonDark: 'bg-slate-800 text-cyan-300 border-cyan-700 active:bg-slate-700',
    overlay: 'bg-cyan-500/90',
    overlaySub: 'text-cyan-100',
  },
  rose: {
    container: 'bg-linear-to-b from-rose-100 via-cloud to-cloud-lavender',
    containerDark: 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950',
    select: 'bg-white text-rose-700 border-rose-300',
    selectDark: 'bg-slate-800 text-rose-300 border-rose-700',
    dotDone: 'bg-rose-500',
    accent: 'text-rose-600',
    accentDark: 'text-rose-400',
    button: 'bg-white text-rose-700 border-rose-300 active:bg-rose-50',
    buttonDark: 'bg-slate-800 text-rose-300 border-rose-700 active:bg-slate-700',
    overlay: 'bg-rose-500/90',
    overlaySub: 'text-rose-100',
  },
}
