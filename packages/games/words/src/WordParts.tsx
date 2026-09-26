import { forwardRef } from 'react'
import type { Part } from './words'

/** One part's letters, coloured: vowels red, silent letters faint, a ♥ over tricky parts. */
export const PartLetters = forwardRef<HTMLSpanElement, { part: Part; lit?: boolean; className?: string }>(
  function PartLetters({ part, lit = false, className = '' }, ref) {
    const color = part.silent ? 'text-slate-300' : part.vowel ? 'text-red-500' : 'text-slate-800'
    return (
      <span
        ref={ref}
        className={`relative inline-block leading-none transition-transform duration-100 ${color} ${
          lit ? 'scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]' : ''
        } ${className}`}
      >
        {part.heart && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-[0.45em] text-[0.3em] text-rose-500" aria-hidden>
            ♥
          </span>
        )}
        {part.g}
        {/* A letter group that makes one sound is underlined as one piece. */}
        {part.g.length > 1 && !part.silent && (
          <span className="absolute left-[0.06em] right-[0.06em] -bottom-[0.12em] h-[0.06em] rounded-full bg-current opacity-40" />
        )}
      </span>
    )
  },
)

/** Big, but never taller than a phone held sideways allows (tiles add their own padding). */
export const WORD_FONT = 'font-black tracking-wide text-[clamp(3rem,min(17vw,22vh),11rem)]'
