import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { playEffect, preloadEffects } from './sounds'

const MAX_TABLE = 12
const MAX_STEP = 12
const STORAGE_KEY = 'progress'
const TABLES = Array.from({ length: MAX_TABLE }, (_, i) => i + 1)

interface Progress {
  version: 1
  table: number
  step: number
}

function clampToRange(value: unknown, max: number): number {
  const n = typeof value === 'number' ? Math.floor(value) : NaN
  return Number.isFinite(n) && n >= 1 && n <= max ? n : 1
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function makeChoices(table: number, step: number): number[] {
  const correct = table * step
  // Near-misses only: distractors must never be multiples of the key number,
  // so spotting the table's skip-count pattern is what finds the answer.
  // (Impossible for the 1x table — everything is a multiple of 1 — so there
  // the divisibility filter is skipped and any nearby number qualifies.)
  const offsets = shuffle([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6])
  const distractors: number[] = []
  for (const offset of offsets) {
    const candidate = correct + offset
    if (candidate <= 0) continue
    if (table > 1 && candidate % table === 0) continue
    if (!distractors.includes(candidate)) {
      distractors.push(candidate)
      if (distractors.length === 2) break
    }
  }
  return shuffle([correct, ...distractors])
}

function App({ services }: GameProps) {
  const [{ table, step }, setPosition] = useState<Pick<Progress, 'table' | 'step'>>(() => {
    try {
      const raw = services.storage.get(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Progress>
        return {
          table: clampToRange(saved.table, MAX_TABLE),
          step: clampToRange(saved.step, MAX_STEP),
        }
      }
    } catch {
      // Corrupt save — start fresh.
    }
    return { table: 1, step: 1 }
  })
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [shaking, setShaking] = useState<number | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    preloadEffects()
  }, [])

  useEffect(() => {
    const progress: Progress = { version: 1, table, step }
    services.storage.set(STORAGE_KEY, JSON.stringify(progress))
  }, [services, table, step])

  // The problem identity; changing it resets per-problem state via key usage below.
  const choices = useMemo(() => makeChoices(table, step), [table, step])
  const correct = table * step

  const advance = () => {
    setWrongPicks([])
    setShaking(null)
    if (step < MAX_STEP) {
      setPosition({ table, step: step + 1 })
      return
    }
    // Table cleared — celebrate, then roll to the next table (wrap after 12).
    setCelebrating(true)
    playEffect('cheer', 0.8)
  }

  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => {
      setCelebrating(false)
      setPosition({ table: table >= MAX_TABLE ? 1 : table + 1, step: 1 })
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [celebrating, table])

  const pick = (value: number) => {
    if (celebrating) return
    if (value === correct) {
      playEffect('yes')
      advance()
    } else if (!wrongPicks.includes(value)) {
      playEffect('no')
      setWrongPicks((prev) => [...prev, value])
      setShaking(value)
    }
  }

  const selectTable = (next: number) => {
    setWrongPicks([])
    setShaking(null)
    setCelebrating(false)
    setPosition({ table: next, step: 1 })
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-emerald-100 via-cloud to-cloud-lavender flex flex-col items-center p-4 gap-4 select-none">
      {/* Top bar: table selector */}
      <div className="w-full max-w-xl flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-slate-600 font-extrabold text-lg">
          Table
          <select
            value={table}
            onChange={(e) => selectTable(Number(e.target.value))}
            className="text-2xl font-extrabold text-emerald-700 bg-white rounded-2xl px-4 py-2 shadow-playful border-2 border-emerald-300"
          >
            {TABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {/* Progress dots for the current table */}
        <div className="flex gap-1.5" aria-label={`Problem ${step} of ${MAX_STEP}`}>
          {Array.from({ length: MAX_STEP }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < step - 1 ? 'bg-emerald-500' : i === step - 1 ? 'bg-amber-400' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Problem */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${table}x${step}`}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
            className="text-7xl font-extrabold text-slate-700 tracking-tight"
          >
            {table} × {step} = <span className="text-emerald-600">?</span>
          </motion.div>
        </AnimatePresence>

        {/* Choices */}
        <div className="flex gap-5 w-full justify-center">
          {choices.map((value) => {
            const disabled = wrongPicks.includes(value)
            return (
              <motion.button
                key={`${table}x${step}-${value}`}
                type="button"
                onClick={() => pick(value)}
                disabled={disabled}
                onAnimationEnd={() => setShaking(null)}
                className={`${shaking === value ? 'times-shake' : ''} w-32 h-24 rounded-3xl text-5xl font-extrabold shadow-playful transition-colors ${
                  disabled
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-white text-emerald-700 border-4 border-emerald-300 active:bg-emerald-50'
                }`}
                whileTap={disabled ? undefined : { scale: 0.92 }}
              >
                {value}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Table-complete celebration */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-emerald-500/90 flex flex-col items-center justify-center gap-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.6 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            <div className="text-5xl font-extrabold text-white drop-shadow">
              {table} times table done!
            </div>
            <div className="text-2xl font-bold text-emerald-100">
              {table >= MAX_TABLE ? 'Starting over from 1…' : `Here comes the ${table + 1}s…`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
