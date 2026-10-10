/** Pieces every SVG episode shares: the stage, the title card, the closing question. */
import type { ReactNode } from 'react'
import { p, smooth, win } from '../engine/ease'
import { Caption, Paper } from '../kit/kit'
import { INK, SERIF, SOFT } from '../kit/sizes'

/** The SVG stage: 1920 × 1080, scaled to fit. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <Paper />
      {children}
    </svg>
  )
}

/** The opening card: episode number and title, gone by 2.8 s. */
export function TitleCard({ t, number, title }: { t: number; number: number; title: string }) {
  const a = win(t, 0, 2.8)
  if (a <= 0) return null
  return (
    <g opacity={a}>
      <text x={960} y={470} fontFamily={SERIF} fontWeight={700} fontSize={64} fill={SOFT} textAnchor="middle">
        {number}
      </text>
      <text x={960} y={570} fontFamily={SERIF} fontWeight={700} fontSize={110} fill={INK} textAnchor="middle">
        {title}
      </text>
    </g>
  )
}

/** A caption shown from a to b (rising in, fading out). */
export function Say({ t, a, b, text, y = 150 }: { t: number; a: number; b: number; text: string; y?: number }) {
  const o = smooth(p(t, a, a + 0.7)) * (1 - smooth(p(t, b - 0.5, b)))
  return <Caption text={text} y={y} o={o} />
}

