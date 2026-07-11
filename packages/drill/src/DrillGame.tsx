import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameServices } from '@renderblocks/kernel'
import { PALETTES, type PaletteName } from './palettes'
import { createEffectPlayer } from './sounds'

const STORAGE_KEY = 'progress'

export interface DrillProblem {
  a: number
  b: number
  answer: number
}

export interface DrillConfig {
  /** Operator glyph shown in the problem, e.g. '×'. */
  symbol: string
  /** Dropdown label, e.g. 'Table', 'Plus', 'Minus', 'Divide by'. */
  keyLabel: string
  /** Key numbers selectable in the dropdown, drilled in this order. */
  keys: number[]
  stepsPerKey: number
  /** Operands and answer for a key + 0-based step. */
  operands: (key: number, stepIndex: number) => DrillProblem
  /** Lowest value allowed as an answer choice (default 1). */
  minAnswer?: number
  /** Veto for distractor candidates (e.g. Times rejects multiples of the key). */
  allowDistractor?: (candidate: number, key: number) => boolean
  completeMessage: (key: number) => string
  nextMessage: (nextKey: number) => string
  palette: PaletteName
  /** Public base path for yes/no/cheer effects, e.g. '/games/times/audio'. */
  audioBase: string
}

interface DrillGameProps {
  services: GameServices
  config: DrillConfig
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function makeChoices(config: DrillConfig, key: number, stepIndex: number): number[] {
  const { answer } = config.operands(key, stepIndex)
  const minAnswer = config.minAnswer ?? 1
  const offsets = shuffle([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6])
  const distractors: number[] = []
  for (const offset of offsets) {
    const candidate = answer + offset
    if (candidate < minAnswer) continue
    if (config.allowDistractor && !config.allowDistractor(candidate, key)) continue
    if (!distractors.includes(candidate)) {
      distractors.push(candidate)
      if (distractors.length === 2) break
    }
  }
  return shuffle([answer, ...distractors])
}

export function DrillGame({ services, config }: DrillGameProps) {
  const palette = PALETTES[config.palette]
  const effects = useMemo(() => createEffectPlayer(config.audioBase), [config.audioBase])

  const [{ key, step }, setPosition] = useState(() => {
    try {
      const raw = services.storage.get(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { key?: number; table?: number; step?: number }
        // `table` is the pre-engine Times save format.
        const savedKey = saved.key ?? saved.table
        const savedStep = typeof saved.step === 'number' ? Math.floor(saved.step) : 1
        return {
          key: config.keys.includes(savedKey as number) ? (savedKey as number) : config.keys[0],
          step: savedStep >= 1 && savedStep <= config.stepsPerKey ? savedStep : 1,
        }
      }
    } catch {
      // Corrupt save — start fresh.
    }
    return { key: config.keys[0], step: 1 }
  })
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [shaking, setShaking] = useState<number | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    effects.preload()
  }, [effects])

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify({ version: 1, key, step }))
  }, [services, key, step])

  const choices = useMemo(() => makeChoices(config, key, step - 1), [config, key, step])
  const problem = config.operands(key, step - 1)

  const keyIndex = config.keys.indexOf(key)
  const nextKey = config.keys[(keyIndex + 1) % config.keys.length]

  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => {
      setCelebrating(false)
      setPosition({ key: nextKey, step: 1 })
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [celebrating, nextKey])

  const pick = (value: number) => {
    if (celebrating) return
    if (value === problem.answer) {
      setWrongPicks([])
      setShaking(null)
      if (step < config.stepsPerKey) {
        effects.play('yes')
        setPosition({ key, step: step + 1 })
      } else {
        setCelebrating(true)
        effects.play('cheer', 0.8)
      }
    } else if (!wrongPicks.includes(value)) {
      effects.play('no')
      setWrongPicks((prev) => [...prev, value])
      setShaking(value)
    }
  }

  const selectKey = (next: number) => {
    setWrongPicks([])
    setShaking(null)
    setCelebrating(false)
    setPosition({ key: next, step: 1 })
  }

  return (
    <div
      className={`min-h-dvh ${palette.container} flex flex-col items-center p-4 gap-4 select-none`}
    >
      {/* Top bar: key selector + progress dots */}
      <div className="w-full max-w-xl flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-slate-600 font-extrabold text-lg">
          {config.keyLabel}
          <select
            value={key}
            onChange={(e) => selectKey(Number(e.target.value))}
            className={`text-2xl font-extrabold bg-white rounded-2xl px-4 py-2 shadow-playful border-2 ${palette.select}`}
          >
            {config.keys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1.5" aria-label={`Problem ${step} of ${config.stepsPerKey}`}>
          {Array.from({ length: config.stepsPerKey }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < step - 1 ? palette.dotDone : i === step - 1 ? 'bg-amber-400' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Problem */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${key}-${step}`}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
            className="text-7xl font-extrabold text-slate-700 tracking-tight"
          >
            {problem.a} {config.symbol} {problem.b} ={' '}
            <span className={palette.accent}>?</span>
          </motion.div>
        </AnimatePresence>

        {/* Choices */}
        <div className="flex gap-5 w-full justify-center">
          {choices.map((value) => {
            const disabled = wrongPicks.includes(value)
            return (
              <motion.button
                key={`${key}-${step}-${value}`}
                type="button"
                onClick={() => pick(value)}
                disabled={disabled}
                onAnimationEnd={() => setShaking(null)}
                className={`${shaking === value ? 'drill-shake' : ''} w-32 h-24 rounded-3xl text-5xl font-extrabold shadow-playful transition-colors ${
                  disabled
                    ? 'bg-slate-200 text-slate-400'
                    : `bg-white border-4 ${palette.button}`
                }`}
                whileTap={disabled ? undefined : { scale: 0.92 }}
              >
                {value}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Key-complete celebration */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${palette.overlay} flex flex-col items-center justify-center gap-6 z-50`}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.6 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            <div className="text-5xl font-extrabold text-white drop-shadow text-center px-6">
              {config.completeMessage(key)}
            </div>
            <div className={`text-2xl font-bold ${palette.overlaySub}`}>
              {config.nextMessage(nextKey)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
