import { useMemo, useState } from 'react'
import type { Look } from '@renderblocks/designer/look'
import { bigStartsOf, fmt, MOST, nearStarts, startsOf, typedStart, type ChainId, type Start } from './chains'
import { Picture } from './Road'
import { NAMES, stageOf, STAGES, WINDOWS } from './windows'

function Card({ start, on, lookFor, onPick }: { start: Start; on: boolean; lookFor: (n: bigint) => Look; onPick: () => void }) {
  const parts = useMemo(() => [{ shape: start.shape, x: 0, y: 0 }], [start])
  return (
    <button type="button" data-start={start.key} onClick={onPick} className={`relative h-48 rounded-2xl shadow p-2 flex flex-col items-center bg-white text-slate-700 active:scale-95 transition-transform ${on ? 'ring-4 ring-yellow-400' : ''}`}>
      <div className="flex-1 w-full min-h-0">
        <Picture parts={parts} lookFor={lookFor} />
      </div>
      {/* A long number is written smaller, to stay on its card. */}
      <span className="font-black tabular-nums leading-tight whitespace-nowrap" style={{ fontSize: start.title.length <= 9 ? 24 : start.title.length <= 13 ? 17 : 13.5 }}>
        {start.title}
      </span>
      <span className="font-bold tabular-nums text-slate-400 leading-none h-4 whitespace-nowrap" style={{ fontSize: start.sub.length <= 16 ? 14 : start.sub.length <= 21 ? 11 : 9.5 }}>
        {start.sub}
      </span>
    </button>
  )
}

/** What the keypad's button says: the kind of number this chain starts from. */
const ANY: Record<ChainId, string> = { corner: 'any square', steps: 'any staircase', cubes: 'any cube', factors: 'any number', powers: 'any power', rect: 'any rectangle' }

/**
 * Type any number of the chain's own (as Sneeze²'s keypad takes any square):
 * if it isn't one, the nearest below and above that are get offered. The
 * rectangles take two sides, with × between.
 */
function Keypad({ stop, onDone }: { stop: ChainId; onDone: (key: number | null) => void }) {
  const [typed, setTyped] = useState('')
  const two = stop === 'rect'
  const [a, b] = typed.split('×').map((t) => (t ? Number(t) : undefined))
  const start = a === undefined ? null : typedStart(stop, a, b)
  const near = a !== undefined && a > 1 && !start && !two ? nearStarts(stop, a) : []
  // As many digits as the chain's biggest has (each side of a rectangle: its biggest side's).
  const most = String(MOST[stop]).length
  const part = typed.split('×').pop()!
  const press = (k: string) => {
    if (k === '⌫') return setTyped((t) => t.slice(0, -1))
    if (k === '✓') return onDone(start?.key ?? null)
    if (k === '×') return setTyped((t) => (t && !t.includes('×') ? t + k : t))
    setTyped((t) => (part.length >= most ? t : part === '0' ? t.slice(0, -1) + k : t + k))
  }
  const key = (k: string, cls = 'bg-white') => (
    <button
      key={k}
      type="button"
      data-key={k}
      disabled={k === '✓' && !start}
      onClick={() => press(k)}
      className={`h-16 [@media(max-height:560px)]:h-11 rounded-2xl shadow text-3xl [@media(max-height:560px)]:text-2xl font-black active:scale-95 transition-transform disabled:opacity-30 ${cls}`}
    >
      {k}
    </button>
  )
  const shown = typed
    .split('×')
    .map((t) => (t ? fmt(Number(t)) : ''))
    .join(' × ')
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 [@media(max-height:560px)]:p-1 overflow-y-auto" onClick={() => onDone(null)}>
      <div className="w-full max-w-sm bg-orange-50 rounded-3xl p-4 [@media(max-height:560px)]:p-2 flex flex-col gap-3 [@media(max-height:560px)]:gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div data-typed className="min-h-16 [@media(max-height:560px)]:min-h-11 px-3 py-2 [@media(max-height:560px)]:py-1 rounded-2xl bg-white shadow font-black tabular-nums text-orange-700 text-3xl break-all text-center">
          {shown || ' '}
        </div>
        <div className="min-h-12 [@media(max-height:560px)]:min-h-9 flex flex-wrap items-center justify-center gap-2 font-black tabular-nums text-slate-600">
          {start && (
            <span className="text-xl" data-ok>
              = {start.sub} ✓
            </span>
          )}
          {near.map((s) => (
            <button key={s.key} type="button" data-near={s.key} onClick={() => onDone(s.key)} className="h-12 px-3 rounded-xl bg-white shadow text-lg whitespace-nowrap active:scale-95">
              {s.title} <span className="text-sm text-slate-400">= {s.sub}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => key(k))}
          {key('⌫')}
          {key('0')}
          {two && !typed.includes('×') ? key('×', 'bg-sky-500 text-white') : key('✓', 'bg-emerald-500 text-white')}
        </div>
      </div>
    </div>
  )
}

/**
 * A chain's own page, reached from its window on the path (as the squares
 * are from Sneeze²'s): everything it can start from, each drawn as it will
 * stand. A tap on one starts it.
 */
export function Starts({ stop, starred, guess, last, lookFor, onGuess, onPick, onBack }: { stop: ChainId; starred: boolean; guess: boolean; /** The number he started from last time. */ last: number | null; lookFor: (n: bigint) => Look; onGuess: (on: boolean) => void; onPick: (n: number) => void; onBack: () => void }) {
  const colour = STAGES[stageOf(stop)].colour
  const [keypad, setKeypad] = useState(false)
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
          {startsOf(stop).map((s) => (
            <Card key={s.key} start={s} on={s.key === last} lookFor={lookFor} onPick={() => onPick(s.key)} />
          ))}
        </div>
        {/* The big ones, in round numbers, as Sneeze²'s Rounds are; and any number of the chain's own, typed (Lan, Nov 13). */}
        <h2 className="font-black text-slate-600 text-lg px-1 pt-4 pb-2">Bigger</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3" data-big>
          {bigStartsOf(stop).map((s) => (
            <Card key={s.key} start={s} on={s.key === last} lookFor={lookFor} onPick={() => onPick(s.key)} />
          ))}
        </div>
        <div className="pt-4">
          <button type="button" data-keypad onClick={() => setKeypad(true)} className="h-14 px-5 rounded-2xl bg-white shadow font-black text-lg text-orange-700 active:scale-95 transition-transform">
            {ANY[stop]} 🔢
          </button>
        </div>
      </div>
      {keypad && (
        <Keypad
          stop={stop}
          onDone={(key) => {
            setKeypad(false)
            if (key !== null) onPick(key)
          }}
        />
      )}
    </div>
  )
}
