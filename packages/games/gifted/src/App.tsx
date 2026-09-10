import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { CellView } from './Figure'
import { MAX_LEVEL, generate } from './generators'
import { chooseGen, loadProgress, record, type Progress } from './adaptive'
import { playEffect } from './sounds'
import { useDarkMode } from './useDarkMode'
import type { GenId, Item } from './types'

const STORAGE_KEY = 'progress'
const CORRECT_MS = 900
const WRONG_MS = 1600

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [progress, setProgress] = useState<Progress>(() =>
    loadProgress(services.storage.get(STORAGE_KEY)),
  )
  const recent = useRef<GenId[]>([])
  const [item, setItem] = useState<Item>(() => {
    const gen = chooseGen(loadProgress(services.storage.get(STORAGE_KEY)), [])
    return generate(gen, loadProgress(services.storage.get(STORAGE_KEY)).levels[gen])
  })
  const [picked, setPicked] = useState<number | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const locked = picked !== null

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify(progress))
  }, [services, progress])

  const nextItem = (p: Progress) => {
    const gen = chooseGen(p, recent.current)
    recent.current = [...recent.current, gen].slice(-3)
    setItem(generate(gen, p.levels[gen]))
    setPicked(null)
  }

  const pick = (i: number) => {
    if (locked) return
    const isRight = i === item.answer
    setPicked(i)
    playEffect(isRight ? 'yes' : 'no', isRight ? 1 : 0.55)
    const { next, levelledUp, unlockedGen } = record(progress, item.gen, isRight)
    setProgress(next)
    if (unlockedGen) setBanner('New puzzle type!')
    else if (levelledUp) setBanner('Level up!')
    if (isRight && (next.correct % 10 === 0)) playEffect('cheer', 0.7)
    window.setTimeout(
      () => {
        setBanner(null)
        nextItem(next)
      },
      isRight ? CORRECT_MS : WRONG_MS,
    )
  }

  const cellCls = `w-full h-full`
  const frame = (extra = '') =>
    `rounded-2xl border-4 flex items-center justify-center p-1 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    } ${extra}`

  /** The question area: layout differs per task type. */
  const stimulus = useMemo(() => {
    const box = (i: number, key: string, sz: string) => (
      <div key={key} className={`${frame()} ${sz}`}>
        <CellView
          cell={item.stimulus[i]}
          blank={i === item.blankIndex}
          dark={isDark}
          className={cellCls}
        />
      </div>
    )

    if (item.layout === 'none') return null
    if (item.layout === 'sample')
      return <div className="flex justify-center">{box(0, 's0', 'w-28 h-28')}</div>

    if (item.layout === 'row')
      return (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {item.stimulus.map((_, i) => box(i, `r${i}`, 'w-20 h-20'))}
        </div>
      )

    if (item.layout === 'analogy')
      return (
        <div className="flex items-center justify-center gap-2">
          {box(0, 'a0', 'w-20 h-20')}
          <span className={`text-3xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            →
          </span>
          {box(1, 'a1', 'w-20 h-20')}
          <span className={`text-3xl font-extrabold px-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
            |
          </span>
          {box(2, 'a2', 'w-20 h-20')}
          <span className={`text-3xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            →
          </span>
          {box(3, 'a3', 'w-20 h-20')}
        </div>
      )

    // matrices
    const n = item.layout === 'matrix3' ? 3 : 2
    return (
      <div
        className="grid gap-2 justify-center"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, width: n === 3 ? 250 : 176 }}
      >
        {item.stimulus.map((_, i) => box(i, `m${i}`, 'w-[76px] h-[76px]'))}
      </div>
    )
  }, [item, isDark])

  const accuracy = progress.seen ? Math.round((progress.correct / progress.seen) * 100) : 0
  const level = progress.levels[item.gen]

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col items-center p-3 gap-2 select-none ${
        isDark
          ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
          : 'bg-linear-to-b from-violet-50 via-cloud to-cloud-lavender'
      }`}
    >
      {/* header: task label, level pips, score, theme */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-2 shrink-0">
        <div className={`text-xl font-extrabold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          {item.label}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" aria-label={`Level ${level}`}>
            {Array.from({ length: MAX_LEVEL }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < level ? 'bg-violet-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          <span className={`text-lg font-extrabold ${isDark ? 'text-violet-300' : 'text-violet-500'}`}>
            {progress.correct}
            {progress.seen >= 5 && (
              <span className={`ml-1 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {accuracy}%
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${
              isDark ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'
            }`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* question */}
      <div className="flex-1 min-h-0 w-full max-w-3xl flex flex-col items-center justify-center gap-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${progress.seen}-stim`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {stimulus}
          </motion.div>
        </AnimatePresence>

        {/* choices */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {item.choices.map((c, i) => {
            const isAnswer = i === item.answer
            const chosen = picked === i
            const state =
              picked === null
                ? ''
                : isAnswer
                  ? 'border-emerald-400 ring-4 ring-emerald-300'
                  : chosen
                    ? 'border-rose-400 ring-4 ring-rose-300'
                    : 'opacity-50'
            return (
              <motion.button
                key={`${progress.seen}-${i}`}
                type="button"
                onPointerDown={() => pick(i)}
                style={{ touchAction: 'manipulation' }}
                whileTap={locked ? undefined : { scale: 0.93 }}
                animate={chosen && !isAnswer ? { x: [0, -7, 7, -5, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`${frame(state)} w-24 h-24 sm:w-28 sm:h-28`}
              >
                <CellView cell={c} dark={isDark} className={cellCls} />
              </motion.button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-2xl font-extrabold rounded-3xl px-7 py-3 shadow-playful"
          >
            {banner} ⭐
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
