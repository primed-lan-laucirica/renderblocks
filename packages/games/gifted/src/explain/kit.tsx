/* eslint-disable react-refresh/only-export-components -- the explainers' kit: its drawing parts with their sizes, the stage and the narration timing */
/**
 * What the explainers are drawn with: the puzzle screen itself. An
 * explainer plays inside the puzzle screen's body, under its real header,
 * in screen pixels, so its boxes are the puzzle's boxes (the same sizes,
 * gaps, borders and colours, light or dark) and its last frame is the
 * layout of the puzzle it dissolves into.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { createVoice, type Clip, type VoiceLine } from '@renderblocks/scene'
import { CellView } from '../Figure'
import type { Cell } from '../types'
import CLIPS from './voice.json'

export const VOICE = createVoice(CLIPS as Record<string, Clip>, '/games/gifted/explain/')

/** The body the explainer fills: its size in px, the screen's width (cells are sized from it, as the puzzle's are), dark or light. */
export interface Stage {
  w: number
  h: number
  vw: number
  dark: boolean
  /** Drawn in real screen pixels (an explainer): borders are the puzzle's 4 px, not scaled with the box. */
  px?: boolean
}
const StageContext = createContext<Stage>({ w: 740, h: 560, vw: 1280, dark: false })
export const StageProvider = StageContext.Provider
export const useStage = () => useContext(StageContext)

/** The puzzle screen's colours (App.tsx: frame, slotClass, the "+" and "?"). */
export function palette(dark: boolean) {
  return dark
    ? { box: '#1e293b', edge: '#334155', slot: '#475569', slotFill: 'rgba(30,41,59,0.6)', mark: '#475569', ink: '#e2e8f0', note: '#cbd5e1', accent: '#a78bfa' }
    : { box: '#ffffff', edge: '#e2e8f0', slot: '#c4b5fd', slotFill: 'rgba(255,255,255,0.7)', mark: '#cbd5e1', ink: '#334155', note: '#475569', accent: '#8b5cf6' }
}
export const GREEN = '#34d399'
export const GREEN_FILL = 'rgba(236,253,245,0.4)'

/** The puzzle screen's cell size: the largest that fits `count` across (plus any glue glyph), capped at `desired`. */
export function cellSize(vw: number, desired: number, count: number, extra = 0) {
  const fit = Math.floor((Math.min(vw, 760) - 28 - extra - (count - 1) * 8) / count)
  return Math.max(44, Math.min(desired, fit))
}
/** A choice's size, as the puzzle screen sizes them. */
export const choiceSize = (vw: number, cell: number) => Math.min(cell, Math.floor((Math.min(vw, 760) - 28 - 16) / 3))

/**
 * Where things sit, as the puzzle body lays them out (a centred column,
 * 12 px apart): the puzzle row, the line where an explanation is printed
 * (48 px), the "Show me" row (36 px), then the choices.
 */
export function bodyRows(h: number, cell: number, choice: number) {
  const total = cell + 12 + 48 + 12 + 36 + 12 + choice
  const top = Math.max(8, (h - total) / 2)
  return { top, note: top + cell + 12 + 24, low: top + cell + 12 + 48 + 12 + 36 + 12 }
}

/** x positions for n boxes in a row, centred on cx. */
export const row = (n: number, cx: number, s: number, gap: number) => Array.from({ length: n }, (_, i) => cx - (n * s + (n - 1) * gap) / 2 + i * (s + gap))

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

/** The drawing surface: the stage in px (or a fixed size, for a thumbnail). Its background is whatever is behind it. */
export function Paper({ children, w, h }: { children: ReactNode; w?: number; h?: number }) {
  const st = useStage()
  return (
    <svg viewBox={`0 0 ${w ?? st.w} ${h ?? st.h}`} className="absolute inset-0 w-full h-full" style={{ fontFamily: 'inherit' }}>
      {children}
    </svg>
  )
}

/** A puzzle box (rounded-2xl, border-4, p-1) with a cell in it; `ring` lights its border. Everything scales with s (88 px is the puzzle's). */
export function CellBox({ cell, x, y, s, o = 1, ring, scale = 1 }: { cell?: Cell; x: number; y: number; s: number; o?: number; ring?: string; scale?: number }) {
  const { dark, px } = useStage()
  const c = palette(dark)
  if (o <= 0) return null
  const b = px ? 4 : s * 0.045
  const pad = px ? 8 : s * 0.09
  return (
    <g opacity={o} transform={`translate(${x + s / 2} ${y + s / 2}) scale(${scale}) translate(${-s / 2} ${-s / 2})`}>
      <rect x={b / 2} y={b / 2} width={s - b} height={s - b} rx={px ? 16 : s * 0.17} fill={c.box} stroke={ring ?? c.edge} strokeWidth={b} />
      <svg x={pad} y={pad} width={s - 2 * pad} height={s - 2 * pad}>
        <CellView cell={cell} dark={dark} />
      </svg>
    </g>
  )
}

/** The answer slot: dashed with a "?"; once `cell` is in it, green with the answer inside (as when he answers). */
export function Slot({ x, y, s, o = 1, cell, done = 0 }: { x: number; y: number; s: number; o?: number; cell?: Cell; done?: number }) {
  const { dark, px } = useStage()
  const c = palette(dark)
  if (o <= 0) return null
  const b = px ? 4 : s * 0.045
  const pad = px ? 8 : s * 0.09
  return (
    <g opacity={o}>
      <rect x={x + b / 2} y={y + b / 2} width={s - b} height={s - b} rx={px ? 16 : s * 0.17} fill={done > 0.5 ? (dark ? 'rgba(52,211,153,0.14)' : GREEN_FILL) : c.slotFill} stroke={done > 0.5 ? GREEN : c.slot} strokeWidth={b} strokeDasharray={px ? '9 6' : `${s * 0.1} ${s * 0.07}`} />
      {done > 0 && cell ? (
        <svg x={x + pad} y={y + pad} width={s - 2 * pad} height={s - 2 * pad} opacity={done}>
          <CellView cell={cell} dark={dark} />
        </svg>
      ) : (
        <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={s * 0.4} fill={dark ? '#475569' : '#c4b5fd'}>
          ?
        </text>
      )}
    </g>
  )
}

/** Words where the puzzle prints its explanation (text-base, bold). */
export function Note({ x, y, text, o = 1, fill }: { x: number; y: number; text: string; o?: number; fill?: string }) {
  const { dark } = useStage()
  if (o <= 0) return null
  return (
    <text x={x} y={y} opacity={o} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={20} fill={fill ?? palette(dark).note}>
      {text}
    </text>
  )
}
