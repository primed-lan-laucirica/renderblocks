import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { NumberLine, type Op } from './NumberLine'
import { Flashcards } from './Flashcards'
import { buildDeck, shuffled, type Card, type DeckId } from './decks'
import { playEffect } from './sounds'
import { useDarkMode } from './useDarkMode'

// Not a design choice: past 15 digits JS floats can no longer represent
// every integer, and a calculator that silently rounds typed digits lies.
const MAX_DIGITS = 15

/** Up to 6 decimal places: enough for real decimal work, hides float noise (0.1 + 0.2). */
const tidy = (v: number) => parseFloat(v.toFixed(6))
const fmt = (v: number) => tidy(v).toLocaleString('en-US', { maximumFractionDigits: 6 })

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

const PANEL_KEY = 'panel'
const DECK_KEY = 'deck'

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [a, setA] = useState('')
  const [op, setOp] = useState<Op | null>(null)
  const [b, setB] = useState('')
  const [committed, setCommitted] = useState(false)
  /** The number-line area shows either the line or a flashcard. */
  const [panel, setPanel] = useState<'line' | 'cards'>(
    () => (services.storage.get(PANEL_KEY) === 'cards' ? 'cards' : 'line'),
  )
  const [deck, setDeck] = useState<DeckId>(
    () => (services.storage.get(DECK_KEY) as DeckId) || 'addsub10',
  )
  const [cards, setCards] = useState<Card[]>(() => shuffled(buildDeck(deck)))
  const [cardIndex, setCardIndex] = useState(0)
  const card = cards[cardIndex] ?? null

  useEffect(() => {
    services.storage.set(PANEL_KEY, panel)
  }, [services, panel])
  useEffect(() => {
    services.storage.set(DECK_KEY, deck)
  }, [services, deck])

  const chooseDeck = (id: DeckId) => {
    setDeck(id)
    setCards(shuffled(buildDeck(id)))
    setCardIndex(0)
    clearCalc()
  }

  /** Draw the next card and clear the keypad ready for it. */
  const nextCard = () => {
    setCardIndex((i) => {
      const next = i + 1
      if (next < cards.length) return next
      setCards(shuffled(buildDeck(deck))) // deck exhausted — reshuffle
      return 0
    })
    clearCalc()
  }

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
    // Nothing here is spoken — see pressEquals.
    const grow = (prev: string) =>
      prev === '0' || prev === '' ? d : prev.length < MAX_DIGITS ? prev + d : prev
    if (op === null) setA(grow(a))
    else setB(grow(b))
  }

  /** Add a decimal point to the operand being typed — at most one per number. */
  const pressDecimal = () => {
    playEffect('click', 0.5)
    const dot = (prev: string) =>
      prev.includes('.') ? prev : prev === '' ? '0.' : prev.length < MAX_DIGITS ? `${prev}.` : prev
    if (committed) {
      // A decimal point after a result starts a fresh number, like a digit does.
      setA('0.')
      setOp(null)
      setB('')
      setCommitted(false)
      return
    }
    if (op === null) setA(dot(a))
    else setB(dot(b))
  }

  const pressOp = (next: Op) => {
    playEffect('click', 0.5)
    if (committed) {
      if (result === null) {
        // Nothing to chain from an undefined result — start fresh at 0
        // rather than dead-ending the calculator.
        setA('')
        setOp(next)
        setB('')
        setCommitted(false)
        return
      }
      // Chain from the result.
      setA(String(tidy(result)))
      setOp(next)
      setB('')
      setCommitted(false)
      return
    }
    if (op !== null && b !== '') {
      // Chained evaluation: collapse a op b, then continue.
      if (result !== null) {
        setA(String(tidy(result)))
        setOp(next)
        setB('')
      }
      return
    }
    setOp(next)
  }

  const pressEquals = () => {
    if (op !== null && b !== '' && !committed) {
      // ÷0 commits too — it just resolves to "undefined" rather than a number.
      // Calc is silent apart from key clicks: it is a tool he drives, not a
      // game that talks back.
      playEffect('click', 0.5)
      setCommitted(true)
    } else {
      playEffect('click', 0.5)
    }
  }

  /** Undo one keypress: result -> expression -> b -> operator -> a. */
  const pressBackspace = () => {
    playEffect('click', 0.5)
    if (committed) {
      // Un-press equals: back to the editable expression.
      setCommitted(false)
      return
    }
    if (op !== null) {
      if (b !== '') setB((s) => s.slice(0, -1))
      else setOp(null)
      return
    }
    setA((s) => s.slice(0, -1))
  }

  const clearCalc = () => {
    setA('')
    setOp(null)
    setB('')
    setCommitted(false)
  }

  const pressClear = () => {
    playEffect('click', 0.5)
    clearCalc()
  }

  const expression = `${a || '0'}${op ? ` ${op} ${b}` : ''}${
    committed
      ? ` = ${result === null ? 'undefined' : fmt(result)}`
      : ''
  }`

  // Keep the display pinned to its right edge, so a long answer stays on
  // screen and the equation scrolls off the left instead.
  const displayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = displayRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [expression])

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
          ref={displayRef}
          className={`flex-1 text-right text-4xl font-extrabold tabular-nums rounded-2xl px-5 py-2 min-h-14 overflow-x-auto whitespace-nowrap ${
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
        <div className="w-full landscape:flex-1 landscape:min-w-0 flex flex-col items-center justify-center gap-2">
          <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-slate-800' : 'bg-white shadow-playful'}`}>
            {(
              [
                ['line', '📈 Number line'],
                ['cards', '🃏 Flashcards'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onPointerDown={() => setPanel(id)}
                style={{ touchAction: 'manipulation' }}
                className={`px-4 py-1.5 rounded-xl text-sm font-extrabold ${
                  panel === id
                    ? 'bg-orange-500 text-white'
                    : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === 'line' ? (
            <NumberLine a={aNum} op={op} b={bNum} result={result} dark={isDark} />
          ) : (
            <Flashcards
              deck={deck}
              onDeck={chooseDeck}
              card={card}
              revealed={committed}
              index={cardIndex}
              total={cards.length}
              onNext={nextCard}
              dark={isDark}
            />
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 w-full max-w-sm shrink-0">
          {key(
            'C',
            pressClear,
            `col-span-2 h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
              isDark
                ? 'bg-slate-800 text-rose-300 border-rose-700 active:bg-slate-700'
                : 'bg-rose-100 text-rose-600 border-rose-300 active:bg-rose-200'
            }`,
          )}
          {key(
            '⌫',
            pressBackspace,
            `col-span-2 h-14 rounded-2xl text-2xl font-extrabold border-4 select-none ${
              isDark
                ? 'bg-slate-800 text-slate-200 border-slate-600 active:bg-slate-700'
                : 'bg-slate-200 text-slate-600 border-slate-300 active:bg-slate-300'
            }`,
          )}
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
          {key('0', () => pressDigit('0'), keyBase)}
          {key('.', pressDecimal, keyBase)}
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
