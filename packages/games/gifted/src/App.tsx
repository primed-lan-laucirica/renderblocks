import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { CellView } from './Figure'
import { MAX_LEVEL, generate } from './generators'
import { chooseGen, loadProgress, record, type Progress } from './adaptive'
import { playEffect, playFeedback, playVoice, playDirection, stopVoice } from './sounds'
import { useDarkMode } from './useDarkMode'
import { SUBTESTS, SUBTEST_HINT, SUBTEST_NAME, type Item, type SubtestId } from './types'

const STORAGE_KEY = 'progress'
const HEARD_KEY = 'heardInstructions'
/** Long enough to see the answer land and hear the "yes", short enough not to drag. */
const ADVANCE_MS = 1700

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [progress, setProgress] = useState<Progress>(() =>
    loadProgress(services.storage.get(STORAGE_KEY)),
  )
  const recent = useRef<SubtestId[]>([])
  /** null = menu; 'mixed' = adaptive mix; otherwise practise one subtest. */
  const [mode, setMode] = useState<SubtestId | 'mixed' | null>(null)
  const [item, setItem] = useState<Item>(() => {
    const p = loadProgress(services.storage.get(STORAGE_KEY))
    const sub = chooseGen(p, [])
    return generate(sub, p.levels[sub])
  })
  /** Choices already tried and rejected — he can keep probing. */
  const [tried, setTried] = useState<number[]>([])
  /** Touch-mode: indices tapped correctly so far, in order. */
  const [hit, setHit] = useState<number[]>([])
  /** He asked to be shown the answer — teaches rather than scores. */
  const [revealed, setRevealed] = useState(false)
  const [solved, setSolved] = useState(false)
  const [scored, setScored] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  /** Subtests whose spoken instruction he has already heard. */
  const [heard, setHeard] = useState<SubtestId[]>(() => {
    try {
      const raw = services.storage.get(HEARD_KEY)
      return raw ? (JSON.parse(raw) as SubtestId[]) : []
    } catch {
      return []
    }
  })
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    services.storage.set(HEARD_KEY, JSON.stringify(heard))
  }, [services, heard])

  useEffect(() => {
    return services.onBack(() => {
      if (mode !== null) {
        stopVoice()
        setMode(null)
        return true
      }
      return false
    })
  }, [services, mode])

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify(progress))
  }, [services, progress])

  // Minimal voicing: a real battery gives an instruction once at the start of
  // a section, then the child works in silence. So speak a subtest's
  // instruction only the FIRST time it is ever seen; after that the format is
  // self-evident and the 🔊 button is there if he wants it again.
  useEffect(() => {
    // Following Directions: the spoken sentence IS the item, so it plays for
    // every puzzle. Everything else follows the minimal-voicing rule below.
    if (item.touch) {
      const t = window.setTimeout(() => playDirection(item.touch!.clip), 250)
      return () => {
        window.clearTimeout(t)
        stopVoice()
      }
    }
    if (heard.includes(item.sub)) return
    const t = window.setTimeout(() => playVoice(item.sub), 250)
    setHeard((h) => (h.includes(item.sub) ? h : [...h, item.sub]))
    return () => {
      window.clearTimeout(t)
      stopVoice()
    }
  }, [item, heard])

  const nextItem = (p: Progress) => {
    const sub = mode && mode !== 'mixed' ? mode : chooseGen(p, recent.current)
    recent.current = [...recent.current, sub].slice(-3)
    setItem(generate(sub, p.levels[sub]))
    setTried([])
    setHit([])
    setSolved(false)
    setScored(false)
    setRevealed(false)
    setBanner(null)
  }

  /** Try a choice. The first attempt is what the adaptive ladder scores. */
  const attempt = (i: number) => {
    if (solved || tried.includes(i)) return
    const right = i === item.answer

    let updated = progress
    if (!scored) {
      const { next, levelledUp, unlockedGen } = record(progress, item.sub, right)
      updated = next
      setProgress(next)
      setScored(true)
      if (unlockedGen) setBanner(`New: ${SUBTEST_NAME[unlockedGen]}`)
      else if (levelledUp) setBanner('Level up!')
      if (unlockedGen) window.setTimeout(() => playVoice('newPuzzle'), 900)
      else if (levelledUp) window.setTimeout(() => playVoice('levelUp'), 900)
    }

    if (right) {
      stopVoice()
      playEffect('correct')
      window.setTimeout(() => playFeedback('yes'), 220)
      setSolved(true)
      const milestone = updated.correct % 10 === 0
      if (milestone) {
        playEffect('celebrate', 0.7)
        window.setTimeout(() => playFeedback('cheer', 0.8), 500)
      }
      // Move on by itself once it is right — clicking Next after every
      // correct answer was friction. A revealed answer ("Show me") still
      // waits for him, since that one is there to be studied.
      window.setTimeout(() => nextItem(updated), milestone ? ADVANCE_MS + 900 : ADVANCE_MS)
    } else {
      playEffect('wrong', 0.6)
      window.setTimeout(() => playFeedback('no', 0.5), 200)
      setTried((t) => [...t, i])
      setRejecting(true)
      window.setTimeout(() => setRejecting(false), 400)
    }
  }

  const start = (m: SubtestId | 'mixed') => {
    const p = progress
    const sub = m === 'mixed' ? chooseGen(p, []) : m
    recent.current = [sub]
    setItem(generate(sub, p.levels[sub]))
    setTried([])
    setHit([])
    setSolved(false)
    setScored(false)
    setRevealed(false)
    setBanner(null)
    setMode(m)
  }

  /** Touch mode: tap a shape in the grid. Correct taps stay lit. */
  const touchTap = (i: number) => {
    const t = item.touch
    if (!t || solved) return
    if (hit.includes(i)) return
    const expected = t.ordered ? t.targets[hit.length] : null
    const isTarget = t.ordered ? i === expected : t.targets.includes(i)

    let updated = progress
    if (!isTarget) {
      playEffect('wrong', 0.6)
      window.setTimeout(() => playFeedback('no', 0.5), 200)
      setRejecting(true)
      window.setTimeout(() => setRejecting(false), 400)
      if (!scored) {
        const { next } = record(progress, item.sub, false)
        setProgress(next)
        setScored(true)
      }
      return
    }

    playEffect('pop', 0.8)
    const nextHit = [...hit, i]
    setHit(nextHit)
    if (nextHit.length === t.targets.length) {
      if (!scored) {
        const { next, levelledUp, unlockedGen } = record(progress, item.sub, true)
        updated = next
        setProgress(next)
        setScored(true)
        if (unlockedGen) setBanner(`New: ${SUBTEST_NAME[unlockedGen]}`)
        else if (levelledUp) setBanner('Level up!')
      }
      playEffect('correct')
      window.setTimeout(() => playFeedback('yes'), 220)
      setSolved(true)
      const milestone = updated.correct % 10 === 0
      if (milestone) {
        playEffect('celebrate', 0.7)
        window.setTimeout(() => playFeedback('cheer', 0.8), 500)
      }
      window.setTimeout(() => nextItem(updated), milestone ? ADVANCE_MS + 900 : ADVANCE_MS)
    }
  }

  /**
   * Show the answer. Counts as a miss if the item hasn't been scored yet —
   * asking to be shown is legitimate here, it just shouldn't advance a level.
   */
  const showMe = () => {
    if (solved) return
    stopVoice()
    if (!scored) {
      const { next } = record(progress, item.sub, false)
      setProgress(next)
      setScored(true)
    }
    if (item.touch) setHit(item.touch.targets)
    setRevealed(true)
    setSolved(true)
  }

  /** Did this drag finish over the answer slot? */
  const droppedOnSlot = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const r = slotRef.current?.getBoundingClientRect()
    if (!r) return false
    const x = 'clientX' in e ? (e as PointerEvent).clientX : info.point.x
    const y = 'clientY' in e ? (e as PointerEvent).clientY : info.point.y
    const pad = 24 // forgiving target for small hands
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
  }

  /**
   * Stimulus cells and choice cells MUST render at the same physical size —
   * otherwise a figure at the same logical size looks bigger in the answer
   * row and "which is the same size" becomes unanswerable.
   */
  const cellPx = (() => {
    switch (item.layout) {
      case 'matrix3':
        return 76
      case 'pairs':
      case 'equation':
        return 68
      case 'fold':
        return 136
      case 'touchGrid':
        return 84
      case 'field': {
        const f = item.stimulus[0]
        // A piece is shown at exactly the size of the hole it must fill.
        if (f.kind === 'field' && f.hole) return Math.round((f.hole.n / f.grid.length) * 240)
        return 88
      }
      default:
        return 88
    }
  })()
  const px = { width: cellPx, height: cellPx }

  const frame = (extra = '') =>
    `rounded-2xl border-4 flex items-center justify-center p-1 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    } ${extra}`

  /** The drop target: dashed, and it lights up while a piece is in the air. */
  const slotClass = `rounded-2xl border-4 border-dashed flex items-center justify-center p-1 transition-colors ${
    solved
      ? 'border-emerald-400 bg-emerald-50/40'
      : rejecting
        ? 'border-rose-400 bg-rose-50/40'
        : dragging
          ? 'border-violet-500 bg-violet-100/50 scale-105'
          : isDark
            ? 'border-slate-600 bg-slate-800/60'
            : 'border-violet-300 bg-white/70'
  }`

  const answerCell = solved ? item.choices[item.answer] : undefined

  const Slot = () => (
    <div ref={slotRef} className={slotClass} style={px}>
      {answerCell ? (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full h-full"
        >
          <CellView cell={answerCell} dark={isDark} className="w-full h-full" />
        </motion.div>
      ) : (
        <span className={`text-4xl font-extrabold ${isDark ? 'text-slate-600' : 'text-violet-300'}`}>
          ?
        </span>
      )}
    </div>
  )

  const stimulus = useMemo(() => {
    const box = (i: number, key: string) =>
      i === item.blankIndex ? (
        <Slot key={key} />
      ) : (
        <div key={key} className={frame()} style={px}>
          <CellView cell={item.stimulus[i]} dark={isDark} className="w-full h-full" />
        </div>
      )

    switch (item.layout) {
      case 'classify':
        return (
          <div className="flex items-center justify-center gap-2">
            {item.stimulus.map((_, i) => box(i, `c${i}`))}
            <span className={`text-2xl font-extrabold px-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
              +
            </span>
            <Slot />
          </div>
        )

      case 'row':
        return (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {item.stimulus.map((_, i) => box(i, `r${i}`))}
          </div>
        )

      case 'pairs':
        return (
          <div className="flex flex-col gap-2 items-center">
            {[0, 2, 4].map((base, row) => (
              <div key={row} className="flex items-center gap-2">
                {box(base, `p${base}`)}
                <span className={`text-2xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  →
                </span>
                {box(base + 1, `p${base + 1}`)}
              </div>
            ))}
          </div>
        )

      case 'equation':
        return (
          <div className="flex items-center justify-center gap-1">
            {item.stimulus.map((c, i) =>
              c.kind === 'text' && c.text === '?' ? (
                <Slot key={`e${i}`} />
              ) : c.kind === 'text' ? (
                <span
                  key={`e${i}`}
                  className={`text-4xl font-extrabold px-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {c.text}
                </span>
              ) : (
                box(i, `e${i}`)
              ),
            )}
          </div>
        )

      case 'touchGrid': {
        const cols = item.stimulus.length <= 6 ? 3 : 3
        return (
          <div
            className="grid gap-3 justify-center"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {item.stimulus.map((c, i) => {
              const got = hit.includes(i)
              return (
                <motion.button
                  key={`t${i}`}
                  type="button"
                  onPointerDown={() => touchTap(i)}
                  style={{ ...px, touchAction: 'manipulation' }}
                  whileTap={solved || got ? undefined : { scale: 0.92 }}
                  animate={{ scale: got ? 1.04 : 1 }}
                  className={frame(
                    got ? 'border-emerald-400 ring-4 ring-emerald-300' : 'cursor-pointer',
                  )}
                >
                  <CellView cell={c} dark={isDark} className="w-full h-full pointer-events-none" />
                </motion.button>
              )
            })}
          </div>
        )
      }

      case 'field': {
        // The hole in the design is itself the drop target.
        const f = item.stimulus[0]
        const hole = f.kind === 'field' ? f.hole : undefined
        const n = f.kind === 'field' ? f.grid.length : 8
        return (
          <div className={`${frame()} relative`} style={{ width: 240, height: 240 }}>
            <CellView cell={f} dark={isDark} className="w-full h-full" />
            {hole && (
              <div
                ref={slotRef}
                className={`absolute rounded-md border-4 border-dashed transition-colors ${
                  solved
                    ? 'border-emerald-400'
                    : rejecting
                      ? 'border-rose-400'
                      : dragging
                        ? 'border-violet-500'
                        : 'border-violet-300'
                }`}
                style={{
                  left: `${(hole.c / n) * 100}%`,
                  top: `${(hole.r / n) * 100}%`,
                  width: `${(hole.n / n) * 100}%`,
                  height: `${(hole.n / n) * 100}%`,
                }}
              >
                {answerCell && <CellView cell={answerCell} dark={isDark} className="w-full h-full" />}
              </div>
            )}
          </div>
        )
      }

      case 'fold':
        return (
          <div className="flex items-center gap-3">
            <div className={frame()} style={px}>
              <CellView cell={item.stimulus[0]} dark={isDark} className="w-full h-full" />
            </div>
            <span className={`text-3xl font-extrabold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              →
            </span>
            <Slot />
          </div>
        )

      default: {
        const n = item.layout === 'matrix3' ? 3 : 2
        return (
          <div
            className="grid gap-2 justify-center"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, width: n === 3 ? 250 : 176 }}
          >
            {item.stimulus.map((_, i) => box(i, `m${i}`))}
          </div>
        )
      }
    }
  }, [item, isDark, solved, dragging, rejecting, answerCell, cellPx, hit])

  const level = progress.levels[item.sub]
  const accuracy = progress.seen ? Math.round((progress.correct / progress.seen) * 100) : 0

  /* ---------- subtest menu ---------- */
  if (mode === null) {
    return (
      <div
        className={`h-dvh overflow-y-auto flex flex-col items-center p-4 gap-4 select-none ${
          isDark
            ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
            : 'bg-linear-to-b from-violet-50 via-cloud to-cloud-lavender'
        }`}
      >
        <div className="w-full max-w-3xl flex items-center justify-between shrink-0">
          <h1 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
            Gifted
          </h1>
          <div className="flex items-center gap-3">
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

        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-3 gap-3">
          <motion.button
            type="button"
            onPointerDown={() => start('mixed')}
            whileTap={{ scale: 0.95 }}
            className="col-span-2 sm:col-span-3 rounded-3xl bg-violet-500 text-white p-4 shadow-playful flex items-center justify-between"
          >
            <span className="text-2xl font-extrabold">🎲 Mixed practice</span>
            <span className="text-sm font-bold opacity-90">
              {progress.unlocked.length} of {SUBTESTS.length} unlocked
            </span>
          </motion.button>

          {SUBTESTS.map((sub) => {
            const lv = progress.levels[sub]
            const unlocked = progress.unlocked.includes(sub)
            return (
              <motion.button
                key={sub}
                type="button"
                onPointerDown={() => start(sub)}
                whileTap={{ scale: 0.95 }}
                className={`rounded-3xl p-3 border-4 text-left flex flex-col gap-1 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200 shadow-playful'
                } ${unlocked ? '' : 'opacity-70'}`}
              >
                <span className={`text-base font-extrabold leading-tight ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                  {SUBTEST_NAME[sub]}
                </span>
                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {SUBTEST_HINT[sub]}
                </span>
                <span className="flex gap-1 mt-1">
                  {Array.from({ length: MAX_LEVEL }, (_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < lv ? 'bg-violet-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                  {!unlocked && (
                    <span className={`ml-1 text-[10px] font-extrabold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      not yet in mix
                    </span>
                  )}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col items-center p-3 gap-2 select-none ${
        isDark
          ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
          : 'bg-linear-to-b from-violet-50 via-cloud to-cloud-lavender'
      }`}
    >
      <div className="w-full max-w-3xl flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onPointerDown={() => {
            stopVoice()
            setMode(null)
          }}
          className={`w-10 h-10 shrink-0 rounded-full text-xl font-extrabold ${
            isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
          }`}
          aria-label="Back to the puzzle list"
        >
          ←
        </button>
        <div className="min-w-0">
          <div className="text-xs font-extrabold uppercase tracking-wide truncate text-violet-400">
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
            onPointerDown={() => (item.touch ? playDirection(item.touch.clip) : playVoice(item.sub))}
            className={`p-2 rounded-full ${isDark ? 'bg-gray-700 text-violet-300' : 'bg-gray-200 text-violet-600'}`}
            aria-label="Say the instruction again"
          >
            🔊
          </button>
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

      <div className="flex-1 min-h-0 w-full max-w-3xl flex flex-col items-center justify-center gap-3 overflow-y-auto py-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${progress.seen}-${tried.length}-stim`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {stimulus}
          </motion.div>
        </AnimatePresence>

        {/* What the item was asking — for touch items this is the spoken
            sentence in print, which also supports his sight-word reading. */}
        <div className="min-h-12 flex items-center justify-center px-2">
          <AnimatePresence>
            {solved && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-center text-base font-bold leading-tight ${
                  revealed
                    ? isDark ? 'text-amber-300' : 'text-amber-600'
                    : isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {revealed && <span className="mr-1">Here it is —</span>}
                {item.explain}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Probing controls: take as long as you like, then move on. */}
        <div className="flex items-center justify-center gap-3">
          {!solved && (
            <button
              type="button"
              onPointerDown={showMe}
              className={`px-4 py-2 rounded-2xl text-sm font-extrabold ${
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}
            >
              Show me
            </button>
          )}
          {solved && revealed && (
            <motion.button
              type="button"
              onPointerDown={() => nextItem(progress)}
              whileTap={{ scale: 0.94 }}
              className="px-7 py-3 rounded-2xl bg-violet-500 text-white text-xl font-extrabold shadow-playful"
            >
              Next →
            </motion.button>
          )}
        </div>

        {/* Drag a piece into the slot — or just tap it. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(item.touch ? [] : item.choices).map((c, i) => {
            const rejected = tried.includes(i)
            const isAnswer = i === item.answer
            const hidden = solved && isAnswer
            return (
              <motion.div
                key={`${progress.seen}-${i}`}
                drag={!solved && !rejected}
                dragSnapToOrigin
                dragMomentum={false}
                whileDrag={{ scale: 1.15, zIndex: 50, rotate: 2 }}
                onDragStart={() => setDragging(true)}
                onDragEnd={(e, info) => {
                  setDragging(false)
                  if (droppedOnSlot(e, info)) attempt(i)
                }}
                // No tap-to-select: answering is a drop on the slot and
                // nothing else, so he can pick a piece up, hold it against
                // the puzzle to see it in context, and put it back without
                // committing to it.
                animate={{
                  opacity: hidden ? 0.25 : rejected ? 0.3 : 1,
                  scale: rejected ? 0.9 : 1,
                }}
                style={{ ...px, touchAction: 'none' }}
                className={frame(
                  rejected ? 'border-rose-300' : solved && isAnswer ? 'border-emerald-400' : 'cursor-grab',
                )}
              >
                <CellView cell={c} dark={isDark} className="w-full h-full pointer-events-none" />
              </motion.div>
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
