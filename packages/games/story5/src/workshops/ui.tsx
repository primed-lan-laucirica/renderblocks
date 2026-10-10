/**
 * The frame every workshop shares: the header (back, title, Explore /
 * Mastery), the prompt line, the check button and the end-of-run screen.
 * Workshops look alike, so a child who knows one knows them all.
 */
import { useEffect, type ReactNode } from 'react'
import { say } from '../engine/voice'
import { COMMON_LINES } from './types'

export type Mode = 'explore' | 'mastery'

export function WorkshopScreen({ title, mode, onMode, onBack, children }: { title: string; mode: Mode; onMode: (m: Mode) => void; onBack: () => void; children: ReactNode }) {
  return (
    <div className="h-dvh w-full flex flex-col gap-2 p-3 text-white select-none overflow-hidden" style={{ background: '#1d1813' }}>
      <div className="flex items-center gap-2 w-full">
        <button type="button" onClick={onBack} className="w-11 h-11 rounded-full bg-white/10 text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <h1 className="text-2xl font-black flex-1">{title}</h1>
        {(['explore', 'mastery'] as const).map((m) => (
          <button key={m} type="button" onClick={() => onMode(m)} className={`rounded-lg px-4 py-2 font-black ${mode === m ? 'bg-amber-500 text-slate-900' : 'bg-white/10'}`}>
            {m === 'explore' ? 'Explore' : 'Mastery'}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

/**
 * The challenge's prompt: shown, spoken when it changes (after the last
 * answer's chime), spoken again on a tap; it shakes on a miss (`shake` counts misses).
 */
export function Prompt({ text, line, shake, left, sayKey }: { text: ReactNode; line: string; shake: number; left: number; sayKey: string }) {
  useEffect(() => {
    const id = window.setTimeout(() => void say(line), 500)
    return () => window.clearTimeout(id)
  }, [line, sayKey])
  return (
    <div className="flex items-center gap-3">
      <style>{`@keyframes ws-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-10px)} 75%{transform:translateX(10px)} }`}</style>
      <div key={shake} className="text-3xl font-black flex-1" style={shake ? { animation: 'ws-shake 0.3s 2' } : undefined}>
        <button type="button" onClick={() => void say(line)} className="text-left" aria-label="Say it again">
          {text}
        </button>
      </div>
      <div className="text-lg font-bold text-slate-400 tabular-nums">{left} left</div>
    </div>
  )
}

export function CheckButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-emerald-500 w-24 h-24 text-5xl font-black shadow-xl shrink-0" aria-label="Check">
      ✓
    </button>
  )
}

/** The end of a Mastery run: a star for a clean run, or how many came back. */
export function RunDone({ star, missed, onAgain }: { star: boolean; missed: number; onAgain: () => void }) {
  const line = star ? COMMON_LINES.clean : COMMON_LINES.again
  useEffect(() => {
    const id = window.setTimeout(() => void say(line), 500)
    return () => window.clearTimeout(id)
  }, [line])
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">{star ? '⭐' : ''}</div>
      <div className="text-3xl font-black">{star ? 'A clean run!' : `${missed} came back. Again for the star?`}</div>
      <button type="button" onClick={onAgain} className="rounded-xl bg-amber-500 text-slate-900 px-6 py-3 text-2xl font-black">
        New run
      </button>
    </div>
  )
}
