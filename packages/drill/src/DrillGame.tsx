import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameServices } from '@renderblocks/kernel'
import { PALETTES, type PaletteName } from './palettes'
import { createEffectPlayer } from './sounds'
import { useDarkMode } from './useDarkMode'
import {
  advanceQueue,
  freshRun,
  loadDrillState,
  saveDrillState,
  type LoadedDrillState,
} from './drillState'

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
  /** Operands and answer for a key + 0-based fact index. */
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

interface Celebration {
  earnedStar: boolean
  completedKey: number
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

  const [state, setState] = useState<LoadedDrillState>(() =>
    loadDrillState(services.storage.get(STORAGE_KEY), config.keys, config.stepsPerKey),
  )
  const { run, stars } = state
  // Bumped after each wrong answer: regenerates distractor values AND order,
  // so neither remembered positions nor remembered wrong values help — the
  // only winning strategy is knowing the answer.
  const [attempt, setAttempt] = useState(0)
  const [shakeValue, setShakeValue] = useState<number | null>(null)
  // True once the current encounter has any miss — a dirty fact re-enters the
  // queue instead of retiring, and forfeits this run's star.
  const [encounterDirty, setEncounterDirty] = useState(false)
  // Counts completed encounters, so a re-queued fact still remounts animations.
  const [encounter, setEncounter] = useState(0)
  const [celebrating, setCelebrating] = useState<Celebration | null>(null)

  useEffect(() => {
    effects.preload()
  }, [effects])

  useEffect(() => {
    services.storage.set(STORAGE_KEY, saveDrillState(run, stars))
  }, [services, run, stars])

  const factIndex = run.queue[0]
  const problem = config.operands(run.key, factIndex)

  const choices = useMemo(
    () => makeChoices(config, run.key, factIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attempt redeals on wrong answers; encounter freshens re-queued facts
    [config, run.key, factIndex, attempt, encounter],
  )

  const nextKeyOf = (key: number) =>
    config.keys[(config.keys.indexOf(key) + 1) % config.keys.length]

  // Wrong answer: shake + brief input lock, then deal a fresh set of choices.
  useEffect(() => {
    if (shakeValue === null) return
    const timer = window.setTimeout(() => {
      setShakeValue(null)
      setAttempt((a) => a + 1)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [shakeValue])

  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => setCelebrating(null), 2200)
    return () => window.clearTimeout(timer)
  }, [celebrating])

  const pick = (value: number) => {
    if (celebrating || shakeValue !== null) return
    if (value === problem.answer) {
      const dirty = encounterDirty
      setAttempt(0)
      setEncounterDirty(false)
      setEncounter((e) => e + 1)
      const nextQueue = advanceQueue(run.queue, dirty)
      if (nextQueue.length === 0) {
        // Run complete — star only if every fact was answered clean first try.
        const earnedStar = run.missed.length === 0
        const completedKey = run.key
        effects.play('cheer', 0.8)
        setCelebrating({ earnedStar, completedKey })
        setState((s) => ({
          run: freshRun(nextKeyOf(completedKey), config.stepsPerKey),
          stars: earnedStar ? { ...s.stars, [String(completedKey)]: true } : s.stars,
        }))
      } else {
        effects.play('yes')
        setState((s) => ({ ...s, run: { ...s.run, queue: nextQueue } }))
      }
    } else {
      effects.play('no')
      setShakeValue(value)
      setEncounterDirty(true)
      setState((s) =>
        s.run.missed.includes(factIndex)
          ? s
          : { ...s, run: { ...s.run, missed: [...s.run.missed, factIndex] } },
      )
    }
  }

  const selectKey = (next: number) => {
    setAttempt(0)
    setShakeValue(null)
    setEncounterDirty(false)
    setCelebrating(null)
    setState((s) => ({ ...s, run: freshRun(next, config.stepsPerKey) }))
  }

  const factsDone = config.stepsPerKey - run.queue.length

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
            value={run.key}
            onChange={(e) => selectKey(Number(e.target.value))}
            className={`text-2xl font-extrabold rounded-2xl px-4 py-2 shadow-playful border-2 ${isDark ? palette.selectDark : palette.select}`}
          >
            {config.keys.map((k) => (
              <option key={k} value={k}>
                {k}
                {stars[String(k)] ? ' ⭐' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <div
            className="flex gap-1.5"
            aria-label={`${factsDone} of ${config.stepsPerKey} facts done`}
          >
            {Array.from({ length: config.stepsPerKey }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  factIndex === i
                    ? 'bg-amber-400'
                    : !run.queue.includes(i)
                      ? palette.dotDone
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
            key={`${run.key}-${factIndex}-${encounter}`}
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
              key={`${run.key}-${factIndex}-${encounter}-${attempt}-${value}`}
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
              {celebrating.earnedStar ? '⭐' : '🎉'}
            </motion.div>
            <div className="text-5xl font-extrabold text-white drop-shadow text-center px-6">
              {config.completeMessage(celebrating.completedKey)}
            </div>
            {celebrating.earnedStar && (
              <div className="text-3xl font-extrabold text-yellow-300 drop-shadow">
                Perfect — you earned a star!
              </div>
            )}
            <div className={`text-2xl font-bold ${palette.overlaySub}`}>
              {config.nextMessage(nextKeyOf(celebrating.completedKey))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
