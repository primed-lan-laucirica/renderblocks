import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { CellView } from './Figure'
import { MAX_LEVEL, generate } from './generators'
import { chooseGen, loadProgress, record, type Progress } from './adaptive'
import { playEffect } from './sounds'
import { useDarkMode } from './useDarkMode'
import { SUBTEST_HINT, SUBTEST_NAME, type Item, type SubtestId } from './types'

const STORAGE_KEY = 'progress'
const CORRECT_MS = 900
const WRONG_MS = 1800

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [progress, setProgress] = useState<Progress>(() =>
    loadProgress(services.storage.get(STORAGE_KEY)),
  )
  const recent = useRef<SubtestId[]>([])
  const [item, setItem] = useState<Item>(() => {
    const p = loadProgress(services.storage.get(STORAGE_KEY))
    const sub = chooseGen(p, [])
    return generate(sub, p.levels[sub])
  })
  const [picked, setPicked] = useState<number | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const locked = picked !== null

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify(progress))
  }, [services, progress])

  const nextItem = (p: Progress) => {
    const sub = chooseGen(p, recent.current)
    recent.current = [...recent.current, sub].slice(-3)
    setItem(generate(sub, p.levels[sub]))
    setPicked(null)
  }

  const pick = (i: number) => {
    if (locked) return
    const right = i === item.answer
    setPicked(i)
    playEffect(right ? 'yes' : 'no', right ? 1 : 0.55)
    const { next, levelledUp, unlockedGen } = record(progress, item.sub, right)
    setProgress(next)
    if (unlockedGen) setBanner(`New: ${SUBTEST_NAME[unlockedGen]}`)
    else if (levelledUp) setBanner('Level up!')
    if (right && next.correct % 10 === 0) playEffect('cheer', 0.7)
    window.setTimeout(
      () => {
        setBanner(null)
        nextItem(next)
      },
      right ? CORRECT_MS : WRONG_MS,
    )
  }

  const frame = (extra = '') =>
    `rounded-2xl border-4 flex items-center justify-center p-1 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    } ${extra}`

  const stimulus = useMemo(() => {
    const box = (i: number, key: string, sz: string) => (
      <div key={key} className={`${frame()} ${sz}`}>
        <CellView
          cell={item.stimulus[i]}
          blank={i === item.blankIndex}
          dark={isDark}
          className="w-full h-full"
        />
      </div>
    )
    const glyphOnly = (i: number, key: string, sz: string) => (
      <div key={key} className={sz}>
        <CellView cell={item.stimulus[i]} dark={isDark} className="w-full h-full" />
      </div>
    )

    switch (item.layout) {
      case 'classify':
        // Three that belong together, set apart from the answer row.
        return (
          <div className="flex items-center justify-center gap-2">
            {item.stimulus.map((_, i) => box(i, `c${i}`, 'w-20 h-20'))}
          </div>
        )

      case 'row':
        return (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {item.stimulus.map((_, i) => box(i, `r${i}`, 'w-20 h-20'))}
          </div>
        )

      case 'pairs':
        // [a → b] [c → d] [e → ?]
        return (
          <div className="flex flex-col gap-2 items-center">
            {[0, 2, 4].map((base, row) => (
              <div key={row} className="flex items-center gap-2">
                {box(base, `p${base}`, 'w-16 h-16')}
                <span className={`text-2xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  →
                </span>
                {box(base + 1, `p${base + 1}`, 'w-16 h-16')}
              </div>
            ))}
          </div>
        )

      case 'equation':
        return (
          <div className="flex items-center justify-center gap-1">
            {item.stimulus.map((c, i) =>
              c.kind === 'text' && c.text !== '?' ? (
                <span
                  key={`e${i}`}
                  className={`text-4xl font-extrabold px-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {c.text}
                </span>
              ) : (
                box(i, `e${i}`, 'w-16 h-16')
              ),
            )}
          </div>
        )

      case 'field':
        return <div className={`${frame()} w-56 h-56`}>{glyphOnly(0, 'f0', 'w-full h-full')}</div>

      case 'fold':
        return (
          <div className="flex items-center gap-3">
            <div className={`${frame()} w-40 h-40`}>{glyphOnly(0, 'fo0', 'w-full h-full')}</div>
            <span className={`text-3xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              →
            </span>
            <div
              className={`${frame()} w-40 h-40 border-dashed flex items-center justify-center text-5xl font-extrabold ${
                isDark ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              ?
            </div>
          </div>
        )

      default: {
        const n = item.layout === 'matrix3' ? 3 : 2
        return (
          <div
            className="grid gap-2 justify-center"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, width: n === 3 ? 250 : 176 }}
          >
            {item.stimulus.map((_, i) => box(i, `m${i}`, 'w-[76px] h-[76px]'))}
          </div>
        )
      }
    }
  }, [item, isDark])

  const level = progress.levels[item.sub]
  const accuracy = progress.seen ? Math.round((progress.correct / progress.seen) * 100) : 0
  const choiceSize = item.layout === 'fold' || item.layout === 'field' ? 'w-24 h-24' : 'w-24 h-24 sm:w-28 sm:h-28'

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col items-center p-3 gap-2 select-none ${
        isDark
          ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
          : 'bg-linear-to-b from-violet-50 via-cloud to-cloud-lavender'
      }`}
    >
      {/* header: subtest name (parent-facing) + kid hint + level pips */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className={`text-xs font-extrabold uppercase tracking-wide truncate ${isDark ? 'text-violet-400' : 'text-violet-400'}`}>
            {SUBTEST_NAME[item.sub]}
          </div>
          <div className={`text-xl font-extrabold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {SUBTEST_HINT[item.sub]}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
            className={`p-2 rounded-full ${isDark ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full max-w-3xl flex flex-col items-center justify-center gap-4 overflow-y-auto py-1">
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

        <div className={`w-full h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

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
                className={`${frame(state)} ${choiceSize}`}
              >
                <CellView cell={c} dark={isDark} className="w-full h-full" />
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xl font-extrabold rounded-3xl px-7 py-3 shadow-playful"
          >
            {banner} ⭐
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
