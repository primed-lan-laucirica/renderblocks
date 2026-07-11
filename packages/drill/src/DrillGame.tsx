import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameServices } from '@renderblocks/kernel'
import { PALETTES, type PaletteName } from './palettes'
import { createEffectPlayer } from './sounds'
import { useDarkMode } from './useDarkMode'

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
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
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
  // Bumped after each wrong answer: regenerates distractor values AND order,
  // so neither remembered positions nor remembered wrong values help — the
  // only winning strategy is knowing the answer.
  const [attempt, setAttempt] = useState(0)
  const [shakeValue, setShakeValue] = useState<number | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    effects.preload()
  }, [effects])

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify({ version: 1, key, step }))
  }, [services, key, step])

  const choices = useMemo(
    () => makeChoices(config, key, step - 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attempt reshuffles on wrong answers
    [config, key, step, attempt],
  )
  const problem = config.operands(key, step - 1)

  // Wrong answer: shake + brief input lock, then deal a fresh set of choices.
  useEffect(() => {
    if (shakeValue === null) return
    const timer = window.setTimeout(() => {
      setShakeValue(null)
      setAttempt((a) => a + 1)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [shakeValue])

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
    if (celebrating || shakeValue !== null) return
    if (value === problem.answer) {
      setAttempt(0)
      if (step < config.stepsPerKey) {
        effects.play('yes')
        setPosition({ key, step: step + 1 })
      } else {
        setCelebrating(true)
        effects.play('cheer', 0.8)
      }
    } else {
      effects.play('no')
      setShakeValue(value)
    }
  }

  const selectKey = (next: number) => {
    setAttempt(0)
    setShakeValue(null)
    setCelebrating(false)
    setPosition({ key: next, step: 1 })
  }

  return (
    <div
      className={`min-h-dvh ${isDark ? palette.containerDark : palette.container} flex flex-col items-center p-4 gap-4 select-none`}
    >
      {/* Top bar: key selector + progress dots + dark mode toggle */}
      <div className="w-full max-w-xl flex items-center justify-between gap-3">
        <label
          className={`flex items-center gap-2 font-extrabold text-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          {config.keyLabel}
          <select
            value={key}
            onChange={(e) => selectKey(Number(e.target.value))}
            className={`text-2xl font-extrabold rounded-2xl px-4 py-2 shadow-playful border-2 ${isDark ? palette.selectDark : palette.select}`}
          >
            {config.keys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-label={`Problem ${step} of ${config.stepsPerKey}`}>
            {Array.from({ length: config.stepsPerKey }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < step - 1
                    ? palette.dotDone
                    : i === step - 1
                      ? 'bg-amber-400'
                      : isDark
                        ? 'bg-slate-600'
                        : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors ${
              isDark
                ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
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
            className={`text-7xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-700'}`}
          >
            {problem.a} {config.symbol} {problem.b} ={' '}
            <span className={isDark ? palette.accentDark : palette.accent}>?</span>
          </motion.div>
        </AnimatePresence>

        {/* Choices */}
        <div className="flex gap-5 w-full justify-center">
          {choices.map((value) => (
            <motion.button
              key={`${key}-${step}-${attempt}-${value}`}
              type="button"
              // onPointerDown, not onClick: a long or slightly-moving toddler
              // press never completes the WebView's click gesture (same fix
              // combos applied to its cards).
              onPointerDown={() => pick(value)}
              style={{ touchAction: 'manipulation' }}
              className={`${shakeValue === value ? 'drill-shake' : ''} w-32 h-24 rounded-3xl text-5xl font-extrabold shadow-playful transition-colors border-4 ${
                isDark ? palette.buttonDark : palette.button
              }`}
              whileTap={{ scale: 0.92 }}
            >
              {value}
            </motion.button>
          ))}
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
