/* eslint-disable react-refresh/only-export-components -- the explainers' kit: its drawing parts with their sizes and the narration timing */
/**
 * What the explainers are drawn with, at 1920 × 1080: the puzzle screen's own
 * look (white boxes with a grey border, the dashed answer slot, Gifted's cell
 * drawings), so the last frame hands straight over to a real puzzle.
 */
import type { ReactNode } from 'react'
import { createVoice, type Clip, type VoiceLine } from '@renderblocks/scene'
import { CellView } from '../Figure'
import type { Cell } from '../types'
import CLIPS from './voice.json'

export const VOICE = createVoice(CLIPS as Record<string, Clip>, '/games/gifted/explain/')

export const INK = '#334155'
export const SOFT = '#94a3b8'
export const VIOLET = '#8b5cf6'
export const GREEN = '#34d399'
export const BOX = 220
export const FONT = "'Nunito', 'Quicksand', system-ui, sans-serif"

/**
 * The narration, one line after another: each starts when the one before has
 * finished (its clip's length, or a guess before clips exist) plus a pause.
 */
export function narrate(lines: (string | { say: string; pause: number })[], start = 0.8, gap = 0.6) {
  const out: (VoiceLine & { end: number })[] = []
  let t = start
  for (const l of lines) {
    const say = typeof l === 'string' ? l : l.say
    t += typeof l === 'string' ? 0 : l.pause
    const dur = (CLIPS as Record<string, Clip>)[say]?.dur ?? 0.4 + say.split(' ').length * 0.33
    out.push({ time: t, say, end: t + dur })
    t += dur + gap
  }
  return out
}

/** The background: the puzzle screen's soft violet. */
export function Paper({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 1920 1080" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="gifted-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f3ff" />
          <stop offset="1" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#gifted-paper)" />
      {children}
    </svg>
  )
}

/** A puzzle box with a cell in it; `ring` lights its border. */
export function CellBox({ cell, x, y, s = BOX, o = 1, ring, scale = 1 }: { cell?: Cell; x: number; y: number; s?: number; o?: number; ring?: string; scale?: number }) {
  if (o <= 0) return null
  return (
    <g opacity={o} transform={`translate(${x + s / 2} ${y + s / 2}) scale(${scale}) translate(${-s / 2} ${-s / 2})`}>
      <rect width={s} height={s} rx={s * 0.13} fill="#fff" stroke={ring ?? '#e2e8f0'} strokeWidth={ring ? 12 : 9} />
      <svg x={s * 0.06} y={s * 0.06} width={s * 0.88} height={s * 0.88}>
        <CellView cell={cell} dark={false} />
      </svg>
    </g>
  )
}

/** The answer slot: dashed; green once it's filled. */
export function Slot({ x, y, s = BOX, o = 1, done = 0 }: { x: number; y: number; s?: number; o?: number; done?: number }) {
  if (o <= 0) return null
  return (
    <rect
      x={x}
      y={y}
      width={s}
      height={s}
      rx={s * 0.13}
      opacity={o}
      fill={done > 0 ? `rgba(52,211,153,${0.18 * done})` : 'rgba(255,255,255,0.5)'}
      stroke={done > 0.5 ? GREEN : '#c4b5fd'}
      strokeWidth={9}
      strokeDasharray="26 18"
    />
  )
}

/** Big plain words in the scene (a label, a sign). */
export function Words({ x, y, text, o = 1, size = 64, fill = INK }: { x: number; y: number; text: string; o?: number; size?: number; fill?: string }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} opacity={o} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={size} fill={fill}>
      {text}
    </text>
  )
}

/** x positions for n boxes in a row, centred on cx. */
export const row = (n: number, cx = 960, s = BOX, gap = 40) => Array.from({ length: n }, (_, i) => cx - (n * s + (n - 1) * gap) / 2 + i * (s + gap))
