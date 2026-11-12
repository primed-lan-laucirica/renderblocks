import { useMemo } from 'react'
import type { Look } from '@renderblocks/designer/look'
import { STARTS, type StopId } from './ops'
import { Picture } from './Road'
import { laid, madeOf, NAMES, stageOf, STAGES, WINDOWS } from './windows'

function Card({ stop, n, on, lookFor, onPick }: { stop: StopId; n: number; on: boolean; lookFor: (n: bigint) => Look; onPick: () => void }) {
  const parts = useMemo(() => laid(stop, n), [stop, n])
  const made = madeOf(stop, n)
  return (
    <button type="button" data-start={n} onClick={onPick} className={`relative h-48 rounded-2xl shadow p-2 flex flex-col items-center bg-white text-slate-700 active:scale-95 transition-transform ${on ? 'ring-4 ring-yellow-400' : ''}`}>
      <div className="flex-1 w-full min-h-0">
        <Picture parts={parts} lookFor={lookFor} />
      </div>
      <span className="font-black tabular-nums text-2xl leading-tight">{n}</span>
      <span className="text-sm font-bold tabular-nums text-slate-400 leading-none h-4">{made}</span>
    </button>
  )
}

/**
 * A sneeze's own page, reached from its window on the road (as the squares
 * are from Sneeze²'s): every number it can start from, each drawn as it will
 * stand. A tap on one starts it.
 */
export function Starts({ stop, starred, guess, last, lookFor, onGuess, onPick, onBack }: { stop: StopId; starred: boolean; guess: boolean; /** The number he started from last time. */ last: number | null; lookFor: (n: bigint) => Look; onGuess: (on: boolean) => void; onPick: (n: number) => void; onBack: () => void }) {
  const colour = STAGES[stageOf(stop)].colour
  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-orange-100 to-amber-50 text-slate-900 select-none">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Back">
          ←
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 text-2xl font-black text-slate-700" aria-label={NAMES[stop]}>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-lg tabular-nums" style={{ background: colour }}>
            {WINDOWS.indexOf(stop) + 1}
          </span>
          {NAMES[stop]} 🤧{starred && ' ⭐'}
        </div>
        <div className="w-12 shrink-0" />
      </div>
      <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onGuess(!guess)}
          className={`h-14 px-4 rounded-2xl shadow font-black text-lg ${guess ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}
          aria-label={guess ? 'Guess first: on' : 'Guess first: off'}
        >
          🤔 = ? {guess ? 'On' : 'Off'}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
          {STARTS[stop].all.map((n) => (
            <Card key={n} stop={stop} n={n} on={n === last} lookFor={lookFor} onPick={() => onPick(n)} />
          ))}
        </div>
      </div>
    </div>
  )
}
