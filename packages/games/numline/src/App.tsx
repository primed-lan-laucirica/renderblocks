import { useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { NumberLine, type Op } from './NumberLine'
import { playEffect } from './sounds'
import { useDarkMode } from './useDarkMode'

const MAX_DIGITS = 3

const round2 = (v: number) => Math.round(v * 100) / 100

function compute(a: number, op: Op, b: number): number | null {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? null : a / b
  }
}

function App({ services }: GameProps) {
  void services
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [a, setA] = useState('')
  const [op, setOp] = useState<Op | null>(null)
  const [b, setB] = useState('')
  const [committed, setCommitted] = useState(false)

  const aNum = Number(a || '0')
  const bTyped = op !== null && b !== ''
  const bNum = bTyped ? Number(b) : null
  const result = op !== null && bNum !== null ? compute(aNum, op, bNum) : null

  const pressDigit = (d: string) => {
    playEffect('click', 0.5)
    if (committed) {
      // Fresh calculation.
      setA(d)
      setOp(null)
      setB('')
      setCommitted(false)
      return
    }
    if (op === null) {
      setA((s) => (s === '0' || s === '' ? d : s.length < MAX_DIGITS ? s + d : s))
    } else {
      setB((s) => (s === '0' || s === '' ? d : s.length < MAX_DIGITS ? s + d : s))
    }
  }

  const pressOp = (next: Op) => {
    playEffect('click', 0.5)
    if (committed) {
      // Chain from the result.
      if (result !== null) {
        setA(String(round2(result)))
        setOp(next)
        setB('')
        setCommitted(false)
      }
      return
    }
    if (op !== null && b !== '') {
      // Chained evaluation: collapse a op b, then continue.
      if (result !== null) {
        setA(String(round2(result)))
        setOp(next)
        setB('')
      }
      return
    }
    setOp(next)
  }

  const pressEquals = () => {
    if (op !== null && b !== '' && result !== null && !committed) {
      playEffect('yes')
      setCommitted(true)
    } else {
      playEffect('click', 0.5)
    }
  }

  const pressClear = () => {
    playEffect('click', 0.5)
    setA('')
    setOp(null)
    setB('')
    setCommitted(false)
  }

  const expression = `${a || '0'}${op ? ` ${op} ${b}` : ''}${
    committed
      ? ` = ${result === null ? '?' : round2(result).toLocaleString('en-US')}`
      : ''
  }`

  const keyBase = `h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
    isDark
      ? 'bg-slate-800 text-slate-100 border-slate-600 active:bg-slate-700'
      : 'bg-white text-slate-700 border-slate-200 active:bg-slate-100'
  }`
  const opKey = `h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
    isDark
      ? 'bg-slate-800 text-amber-300 border-amber-700 active:bg-slate-700'
      : 'bg-amber-100 text-amber-600 border-amber-300 active:bg-amber-200'
  }`

  const key = (label: string, onPress: () => void, cls: string) => (
    <button
      key={label}
      type="button"
      onPointerDown={onPress}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'manipulation' }}
      className={cls}
    >
      {label}
    </button>
  )

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col items-center p-3 gap-2 select-none ${
        isDark
          ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
          : 'bg-linear-to-b from-orange-50 via-cloud to-cloud-lavender'
      }`}
    >
      {/* display row */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-3 shrink-0">
        <div
          className={`flex-1 text-right text-4xl font-extrabold tabular-nums rounded-2xl px-5 py-2 min-h-14 ${
            isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-700 shadow-playful'
          }`}
        >
          {expression}
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className={`p-2 rounded-full shrink-0 ${
            isDark ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'
          }`}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* number line + pad: stacked in portrait, side by side in landscape */}
      <div className="flex-1 min-h-0 w-full max-w-5xl flex flex-col landscape:flex-row items-center justify-center gap-2 landscape:gap-6">
        <div className="w-full landscape:flex-1 landscape:min-w-0 flex items-center justify-center">
          <NumberLine a={aNum} op={op} b={bNum} result={result} dark={isDark} />
        </div>

        <div className="grid grid-cols-4 gap-2 w-full max-w-sm shrink-0">
          {key('7', () => pressDigit('7'), keyBase)}
          {key('8', () => pressDigit('8'), keyBase)}
          {key('9', () => pressDigit('9'), keyBase)}
          {key('÷', () => pressOp('÷'), op === '÷' && !committed ? `${opKey} ring-4 ring-amber-400` : opKey)}
          {key('4', () => pressDigit('4'), keyBase)}
          {key('5', () => pressDigit('5'), keyBase)}
          {key('6', () => pressDigit('6'), keyBase)}
          {key('×', () => pressOp('×'), op === '×' && !committed ? `${opKey} ring-4 ring-amber-400` : opKey)}
          {key('1', () => pressDigit('1'), keyBase)}
          {key('2', () => pressDigit('2'), keyBase)}
          {key('3', () => pressDigit('3'), keyBase)}
          {key('−', () => pressOp('−'), op === '−' && !committed ? `${opKey} ring-4 ring-amber-400` : opKey)}
          {key(
            'C',
            pressClear,
            `h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
              isDark
                ? 'bg-slate-800 text-rose-300 border-rose-700 active:bg-slate-700'
                : 'bg-rose-100 text-rose-600 border-rose-300 active:bg-rose-200'
            }`,
          )}
          {key('0', () => pressDigit('0'), keyBase)}
          {key(
            '=',
            pressEquals,
            `h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
              isDark
                ? 'bg-teal-600 text-white border-teal-500 active:bg-teal-500'
                : 'bg-teal-500 text-white border-teal-400 active:bg-teal-600'
            }`,
          )}
          {key('+', () => pressOp('+'), op === '+' && !committed ? `${opKey} ring-4 ring-amber-400` : opKey)}
        </div>
      </div>
    </div>
  )
}

export default App
