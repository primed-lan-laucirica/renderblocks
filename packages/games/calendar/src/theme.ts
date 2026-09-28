import { useEffect, useState, type CSSProperties } from 'react'
import type { Settings } from './model'

/**
 * Colours come from CSS variables set on the app's root (spec 15: dark
 * theme), so every screen follows the theme without its own dark classes.
 */
export const THEMES: Record<'light' | 'dark', CSSProperties> = {
  light: {
    '--bg': '#f1f5f9',
    '--card': '#ffffff',
    '--ink': '#0f172a',
    '--muted': '#64748b',
    '--line': '#e2e8f0',
    '--accent': '#0f766e',
    '--soft': '#ccfbf1',
    '--on-accent': '#ffffff',
  } as CSSProperties,
  dark: {
    '--bg': '#0b1220',
    '--card': '#172033',
    '--ink': '#e2e8f0',
    '--muted': '#94a3b8',
    '--line': '#263349',
    '--accent': '#2dd4bf',
    '--soft': '#134e4a',
    '--on-accent': '#042f2e',
  } as CSSProperties,
}

/** Text size steps (spec 16): the root font size, so every rem scales. */
export const SCALES = [14, 16, 18, 21, 24]

export function useThemeName(settings: Settings): 'light' | 'dark' {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const on = () => setPrefersDark(mq.matches)
    mq?.addEventListener('change', on)
    return () => mq?.removeEventListener('change', on)
  }, [])
  return settings.theme === 'auto' ? (prefersDark ? 'dark' : 'light') : settings.theme
}

/** The time, ticking once a second (or minute). */
export function useNow(every = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), every)
    return () => window.clearInterval(id)
  }, [every])
  return now
}
