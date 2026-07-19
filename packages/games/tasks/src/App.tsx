import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import type { GameProps } from '@renderblocks/kernel'
import { ROUTINE_EMOJI, TASK_EMOJI } from './emoji'
import { playEffect } from './sounds'
import {
  addDays,
  dayParts,
  hasDayStar,
  hasRoutineStar,
  isComplete,
  loadTasksData,
  marksFor,
  newId,
  routinesForDate,
  starCount,
  today,
  type Routine,
  type TaskCard,
  type TaskMark,
  type TasksData,
} from './types'

type View =
  | { t: 'picker' }
  | { t: 'board'; id: string }
  | { t: 'editor' }
  | { t: 'edit'; id: string }

const STORAGE_KEY = 'data'
const TAP_LOCK_MS = 600
const HOLD_MS = 3000

/**
 * Press-and-hold gear: 3 seconds of continuous hold opens the parent editor.
 * Pointer capture keeps finger drift from cancelling; the long-press
 * context-menu gesture is suppressed (Android WebView).
 */
function HoldGate({ onOpen }: { onOpen: () => void }) {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef(0)

  const stop = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setProgress(0)
  }

  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = Date.now()
    setProgress(0.01)
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      const p = (Date.now() - startRef.current) / HOLD_MS
      if (p >= 1) {
        stop()
        onOpen()
      } else {
        setProgress(p)
      }
    }, 50)
  }

  useEffect(() => stop, [])

  const holding = progress > 0

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      aria-label="Hold for grown-up settings"
      className={`relative w-11 h-11 rounded-full flex items-center justify-center text-xl select-none transition-colors ${
        holding ? 'bg-indigo-200 text-indigo-600' : 'bg-slate-200 text-slate-500'
      }`}
    >
      {holding && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="#5C6BC0"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${progress * 119.4} 119.4`}
          />
        </svg>
      )}
      ⚙️
    </button>
  )
}

/** Photo when the card has one, emoji otherwise. */
function TaskVisual({ task, size }: { task: TaskCard; size: 'lg' | 'sm' | 'edit' }) {
  const px = size === 'lg' ? 'w-14 h-14' : size === 'edit' ? 'w-12 h-12' : 'w-7 h-7'
  const text = size === 'lg' ? 'text-5xl' : size === 'edit' ? 'text-3xl' : 'text-xl'
  if (task.photoUri) {
    return (
      <img
        src={task.photoUri}
        alt=""
        className={`${px} rounded-xl object-cover shrink-0`}
        draggable={false}
      />
    )
  }
  return <span className={`${text} shrink-0`}>{task.emoji}</span>
}

function EmojiGrid({
  choices,
  onPick,
  onClose,
}: {
  choices: string[]
  onPick: (emoji: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onPointerDown={onClose}
    >
      <div
        className="bg-white rounded-3xl p-4 max-w-md max-h-[70vh] overflow-y-auto grid grid-cols-6 gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {choices.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onPointerDown={() => onPick(emoji)}
            className="w-12 h-12 text-3xl flex items-center justify-center rounded-xl active:bg-indigo-100"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Seven-day window with per-day star markers; arrows shift by a week. */
function DayStrip({
  data,
  selected,
  onSelect,
}: {
  data: TasksData
  selected: string
  onSelect: (date: string) => void
}) {
  const [offset, setOffset] = useState(0)
  const t = today()
  const start = addDays(t, -3 + offset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="flex items-center gap-1 w-full max-w-xl mx-auto">
      <button
        type="button"
        onPointerDown={() => setOffset((o) => o - 7)}
        className="w-8 h-14 rounded-xl text-slate-400 font-extrabold text-lg shrink-0"
      >
        ‹
      </button>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map((date) => {
          const { dow, day } = dayParts(date)
          const isToday = date === t
          const isSelected = date === selected
          const dayStar = date <= t && hasDayStar(data, date)
          const stars = date <= t ? starCount(data, date) : 0
          return (
            <button
              key={date}
              type="button"
              onPointerDown={() => onSelect(date)}
              className={`flex flex-col items-center rounded-xl py-1 border-2 ${
                isSelected
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : isToday
                    ? 'bg-white border-indigo-400 text-slate-700'
                    : 'bg-white/60 border-transparent text-slate-500'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase">{dow}</span>
              <span className="text-lg font-extrabold leading-5">{day}</span>
              <span className="text-[11px] leading-4 h-4">
                {dayStar ? '🌟' : stars > 0 ? `${stars}⭐` : ''}
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onPointerDown={() => setOffset((o) => o + 7)}
        className="w-8 h-14 rounded-xl text-slate-400 font-extrabold text-lg shrink-0"
      >
        ›
      </button>
      {(offset !== 0 || selected !== t) && (
        <button
          type="button"
          onPointerDown={() => {
            setOffset(0)
            onSelect(t)
          }}
          className="shrink-0 text-xs font-extrabold text-indigo-500 bg-indigo-100 rounded-full px-2 py-1"
        >
          Today
        </button>
      )}
    </div>
  )
}

function App({ services }: GameProps) {
  const [data, setData] = useState<TasksData>(() =>
    loadTasksData(services.storage.get(STORAGE_KEY)),
  )
  const [view, setView] = useState<View>({ t: 'picker' })
  const [selectedDate, setSelectedDate] = useState(today())
  const [tapLocked, setTapLocked] = useState(false)
  const [celebrating, setCelebrating] = useState<{
    checks: number
    xs: number
    dayStar: boolean
  } | null>(null)
  const [emojiTarget, setEmojiTarget] = useState<
    | { kind: 'routine'; routineId: string }
    | { kind: 'task'; routineId: string; taskId: string }
    | null
  >(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify(data))
  }, [services, data])

  useEffect(() => {
    return services.onBack(() => {
      if (celebrating) return true
      if (view.t === 'edit') {
        setView({ t: 'editor' })
        return true
      }
      if (view.t === 'editor' || view.t === 'board') {
        setView({ t: 'picker' })
        return true
      }
      return false
    })
  }, [services, view, celebrating])

  const isToday = selectedDate === today()
  const isPast = selectedDate < today()

  const updateRoutine = (id: string, patch: (r: Routine) => Routine) => {
    setData((d) => ({
      ...d,
      routines: d.routines.map((r) => (r.id === id ? patch(r) : r)),
    }))
  }

  const takePhoto = async (routineId: string, taskId: string) => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 60,
        width: 500,
        promptLabelHeader: 'Task photo',
      })
      if (!photo.base64String) return
      const uri = `data:image/${photo.format ?? 'jpeg'};base64,${photo.base64String}`
      updateRoutine(routineId, (r) => ({
        ...r,
        tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, photoUri: uri } : t)),
      }))
    } catch {
      // User cancelled the camera/picker — nothing to do.
    }
  }

  const setMark = (routine: Routine, taskId: string, mark: TaskMark | null) => {
    if (tapLocked || celebrating || !isToday) return
    const date = selectedDate
    const marks = { ...marksFor(data, date, routine.id) }
    if (mark === null) {
      delete marks[taskId]
    } else {
      playEffect(mark === 'check' ? 'yes' : 'no', mark === 'check' ? 1 : 0.55)
      setTapLocked(true)
      window.setTimeout(() => setTapLocked(false), TAP_LOCK_MS)
      marks[taskId] = mark
    }
    const nextData: TasksData = {
      ...data,
      history: {
        ...data.history,
        [date]: { ...(data.history[date] ?? {}), [routine.id]: marks },
      },
    }
    setData(nextData)
    const total = routine.tasks.length
    if (mark !== null && total > 0 && Object.keys(marks).length === total) {
      const checks = Object.values(marks).filter((m) => m === 'check').length
      const xs = total - checks
      const dayStar = xs === 0 && hasDayStar(nextData, date)
      window.setTimeout(() => {
        if (xs === 0) playEffect('cheer', 0.8)
        setCelebrating({ checks, xs, dayStar })
        window.setTimeout(
          () => {
            setCelebrating(null)
            setView({ t: 'picker' })
          },
          dayStar ? 3400 : 2600,
        )
      }, 350)
    }
  }

  /* ---------- picker ---------- */

  if (view.t === 'picker') {
    const routines = routinesForDate(data, selectedDate)
    const extras = new Set(data.schedule[selectedDate] ?? [])
    const addable = data.routines.filter((r) => !r.everyday && !extras.has(r.id))
    const dayStar = !isPast || hasDayStar(data, selectedDate)

    return (
      <div className="min-h-dvh bg-linear-to-b from-indigo-100 via-cloud to-cloud-lavender flex flex-col p-4 gap-3 select-none">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-slate-700">
            Tasks{' '}
            {hasDayStar(data, selectedDate) && <span className="text-3xl">🌟</span>}
          </h1>
          <HoldGate onOpen={() => setView({ t: 'editor' })} />
        </div>

        <DayStrip data={data} selected={selectedDate} onSelect={setSelectedDate} />

        <div className="flex-1 flex flex-wrap items-start justify-center gap-4 pt-2 overflow-y-auto">
          {routines.map((routine, i) => {
            const marks = marksFor(data, selectedDate, routine.id)
            const total = routine.tasks.length
            const checks = Object.values(marks).filter((m) => m === 'check').length
            const xs = Object.keys(marks).length - checks
            const complete = isComplete(routine, marks)
            const star = hasRoutineStar(routine, marks)
            const isExtra = extras.has(routine.id)
            return (
              <motion.div
                key={`${selectedDate}-${routine.id}`}
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.4, delay: i * 0.05 }}
                className="relative"
              >
                <motion.div
                  onPointerDown={() => setView({ t: 'board', id: routine.id })}
                  whileTap={{ scale: 0.93 }}
                  className={`w-40 h-40 rounded-3xl bg-white shadow-playful flex flex-col items-center justify-center gap-1 border-4 cursor-pointer ${
                    star ? 'border-amber-300' : 'border-indigo-200'
                  } ${isPast && !complete ? 'opacity-60' : ''}`}
                >
                  <span className="text-6xl">
                    {star ? '⭐' : complete ? '🏁' : routine.emoji}
                  </span>
                  <span className="text-xl font-extrabold text-slate-700">
                    {routine.title}
                  </span>
                  <span className="text-sm font-bold text-indigo-400">
                    {!isPast && !complete
                      ? `${checks + xs}/${total}`
                      : `${checks}✓${xs > 0 ? ` ${xs}✗` : ''}`}
                  </span>
                </motion.div>
                {!isPast && isExtra && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setData((d) => ({
                        ...d,
                        schedule: {
                          ...d.schedule,
                          [selectedDate]: (d.schedule[selectedDate] ?? []).filter(
                            (id) => id !== routine.id,
                          ),
                        },
                      }))
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-extrabold"
                    aria-label={`Remove ${routine.title} from this day`}
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            )
          })}

          {!isPast && addable.length > 0 && (
            <button
              type="button"
              onPointerDown={() => setShowAddSheet(true)}
              className="w-40 h-40 rounded-3xl border-4 border-dashed border-indigo-300 text-indigo-400 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-5xl">＋</span>
              <span className="font-extrabold">Add to day</span>
            </button>
          )}

          {routines.length === 0 && addable.length === 0 && (
            <div className="text-xl font-bold text-slate-400 mt-10">
              Nothing scheduled this day
            </div>
          )}
        </div>

        {!dayStar && isPast && <div />}

        {showAddSheet && (
          <div
            className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
            onPointerDown={() => setShowAddSheet(false)}
          >
            <div
              className="bg-white rounded-t-3xl p-5 w-full max-w-md flex flex-col gap-2 pb-8"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-extrabold text-slate-700 mb-1">
                Add a routine to {isToday ? 'today' : selectedDate}
              </div>
              {addable.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onPointerDown={() => {
                    setData((d) => ({
                      ...d,
                      schedule: {
                        ...d.schedule,
                        [selectedDate]: [...(d.schedule[selectedDate] ?? []), routine.id],
                      },
                    }))
                    setShowAddSheet(false)
                  }}
                  className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 text-left"
                >
                  <span className="text-3xl">{routine.emoji}</span>
                  <span className="text-lg font-bold text-slate-700">{routine.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ---------- board ---------- */

  if (view.t === 'board') {
    const routine = data.routines.find((r) => r.id === view.id)
    if (!routine) {
      setView({ t: 'picker' })
      return null
    }
    const marks = marksFor(data, selectedDate, routine.id)
    const pending = routine.tasks.filter((t) => !(t.id in marks))
    const firstPendingId = pending[0]?.id
    const marked = routine.tasks.filter((t) => t.id in marks)
    const { dow, day } = dayParts(selectedDate)

    return (
      <div className="min-h-dvh bg-linear-to-b from-indigo-100 via-cloud to-cloud-lavender flex flex-col p-4 gap-4 select-none">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onPointerDown={() => setView({ t: 'picker' })}
            className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 text-xl font-extrabold"
            aria-label="Back to routines"
          >
            ←
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-2xl font-extrabold text-slate-700">
              <span className="text-3xl">{routine.emoji}</span> {routine.title}
              {hasRoutineStar(routine, marks) && <span>⭐</span>}
            </div>
            {!isToday && (
              <div className="text-sm font-bold text-indigo-400">
                {dow} {day} {isPast ? '· what happened' : '· coming up'}
              </div>
            )}
          </div>
          <HoldGate onOpen={() => setView({ t: 'editor' })} />
        </div>

        {isToday ? (
          <>
            <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto py-2">
              <AnimatePresence>
                {pending.map((task) => {
                  const locked = routine.inOrder && task.id !== firstPendingId
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      exit={{ opacity: 0, scale: 0.6, y: 40 }}
                      className={`w-full max-w-md flex items-center gap-3 rounded-3xl px-4 py-3 shadow-playful border-4 ${
                        locked
                          ? 'bg-slate-100 border-slate-200 opacity-45'
                          : 'bg-white border-indigo-200'
                      }`}
                    >
                      <TaskVisual task={task} size="lg" />
                      <span className="flex-1 text-2xl font-extrabold text-slate-700">
                        {task.label}
                      </span>
                      <motion.button
                        type="button"
                        onPointerDown={() => !locked && setMark(routine, task.id, 'check')}
                        style={{ touchAction: 'manipulation' }}
                        whileTap={locked ? undefined : { scale: 0.85 }}
                        aria-label={`${task.label} done properly`}
                        className="w-16 h-16 shrink-0 rounded-2xl bg-emerald-100 border-4 border-emerald-300 text-3xl font-extrabold text-emerald-600 flex items-center justify-center"
                      >
                        ✓
                      </motion.button>
                      <motion.button
                        type="button"
                        onPointerDown={() => !locked && setMark(routine, task.id, 'x')}
                        style={{ touchAction: 'manipulation' }}
                        whileTap={locked ? undefined : { scale: 0.85 }}
                        aria-label={`${task.label} not done`}
                        className="w-16 h-16 shrink-0 rounded-2xl bg-rose-100 border-4 border-rose-300 text-3xl font-extrabold text-rose-500 flex items-center justify-center"
                      >
                        ✗
                      </motion.button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {pending.length === 0 && (
                <div className="text-2xl font-extrabold text-indigo-400 mt-8">
                  All done! 🎉
                </div>
              )}
            </div>

            {marked.length > 0 && (
              <div className="shrink-0 w-full max-w-md mx-auto">
                <div className="text-sm font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                  Finished
                </div>
                <div className="flex flex-wrap gap-2">
                  {marked.map((task) => {
                    const isCheck = marks[task.id] === 'check'
                    return (
                      <motion.button
                        key={task.id}
                        type="button"
                        layout
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onPointerDown={() => setMark(routine, task.id, null)}
                        className={`flex items-center gap-1 rounded-full border-2 px-3 py-1 ${
                          isCheck
                            ? 'bg-emerald-100 border-emerald-300'
                            : 'bg-rose-100 border-rose-300'
                        }`}
                      >
                        <TaskVisual task={task} size="sm" />
                        <span
                          className={`font-extrabold ${
                            isCheck ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {isCheck ? '✓' : '✗'}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Read-only view for past results and future previews. */
          <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto py-2">
            {routine.tasks.map((task) => {
              const mark = marks[task.id]
              return (
                <div
                  key={task.id}
                  className="w-full max-w-md flex items-center gap-3 rounded-3xl px-4 py-3 bg-white/80 border-4 border-slate-200"
                >
                  <TaskVisual task={task} size="lg" />
                  <span className="flex-1 text-2xl font-extrabold text-slate-700">
                    {task.label}
                  </span>
                  <span
                    className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-extrabold ${
                      mark === 'check'
                        ? 'bg-emerald-100 text-emerald-600'
                        : mark === 'x'
                          ? 'bg-rose-100 text-rose-500'
                          : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {mark === 'check' ? '✓' : mark === 'x' ? '✗' : '·'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 flex flex-col items-center justify-center gap-5 z-50 ${
                celebrating.dayStar
                  ? 'bg-amber-400/95'
                  : celebrating.xs === 0
                    ? 'bg-indigo-500/90'
                    : 'bg-slate-500/90'
              }`}
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="text-8xl"
              >
                {celebrating.dayStar ? '🌟' : celebrating.xs === 0 ? '⭐' : '🏁'}
              </motion.div>
              <div className="text-5xl font-extrabold text-white drop-shadow text-center px-6">
                {celebrating.xs === 0
                  ? `${routine.title} star!`
                  : `${routine.title} finished`}
              </div>
              <div className="text-3xl font-extrabold text-white/90">
                {celebrating.checks}✓{celebrating.xs > 0 ? `  ${celebrating.xs}✗` : ''}
              </div>
              {celebrating.dayStar && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                  className="text-4xl font-extrabold text-white drop-shadow text-center px-6"
                >
                  🌟 WHOLE DAY STAR! 🌟
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  /* ---------- parent editor ---------- */

  if (view.t === 'editor') {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-700">Grown-ups: routines</h1>
          <button
            type="button"
            onPointerDown={() => setView({ t: 'picker' })}
            className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 text-xl font-extrabold"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2 max-w-md w-full mx-auto">
          {data.routines.map((routine) => (
            <button
              key={routine.id}
              type="button"
              onPointerDown={() => setView({ t: 'edit', id: routine.id })}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-200 text-left"
            >
              <span className="text-3xl">{routine.emoji}</span>
              <span className="flex-1 text-lg font-bold text-slate-700">
                {routine.title}
                {!routine.everyday && (
                  <span className="ml-2 text-xs font-bold text-indigo-400 bg-indigo-50 rounded-full px-2 py-0.5">
                    scheduled days
                  </span>
                )}
              </span>
              <span className="text-slate-400 text-sm">{routine.tasks.length} tasks ›</span>
            </button>
          ))}
          <button
            type="button"
            onPointerDown={() => {
              const routine: Routine = {
                id: newId(),
                title: 'New routine',
                emoji: '⭐',
                inOrder: false,
                everyday: true,
                tasks: [],
              }
              setData((d) => ({ ...d, routines: [...d.routines, routine] }))
              setView({ t: 'edit', id: routine.id })
            }}
            className="rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-bold py-3"
          >
            + Add routine
          </button>
        </div>
      </div>
    )
  }

  /* ---------- edit one routine ---------- */

  const routine = data.routines.find((r) => r.id === view.id)
  if (!routine) {
    setView({ t: 'editor' })
    return null
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onPointerDown={() => setView({ t: 'editor' })}
          className="w-11 h-11 rounded-full bg-slate-200 text-slate-600 text-xl font-extrabold"
        >
          ←
        </button>
        <h1 className="text-xl font-extrabold text-slate-700">Edit routine</h1>
        <div className="w-11" />
      </div>

      <div className="flex flex-col gap-3 max-w-md w-full mx-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => setEmojiTarget({ kind: 'routine', routineId: routine.id })}
            className="w-14 h-14 text-4xl bg-white rounded-2xl border border-slate-200"
          >
            {routine.emoji}
          </button>
          <input
            value={routine.title}
            onChange={(e) => updateRoutine(routine.id, (r) => ({ ...r, title: e.target.value }))}
            className="flex-1 text-lg font-bold text-slate-700 bg-white rounded-2xl px-4 py-3 border border-slate-200"
          />
        </div>

        <label className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-200">
          <input
            type="checkbox"
            checked={routine.everyday}
            onChange={(e) =>
              updateRoutine(routine.id, (r) => ({ ...r, everyday: e.target.checked }))
            }
            className="w-5 h-5 accent-indigo-500"
          />
          <span className="font-bold text-slate-600">
            Every day
            <span className="block text-xs font-semibold text-slate-400">
              Off = add it to specific days from the calendar
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-200">
          <input
            type="checkbox"
            checked={routine.inOrder}
            onChange={(e) =>
              updateRoutine(routine.id, (r) => ({ ...r, inOrder: e.target.checked }))
            }
            className="w-5 h-5 accent-indigo-500"
          />
          <span className="font-bold text-slate-600">Tasks must be done in order</span>
        </label>

        {routine.tasks.map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 border border-slate-200"
          >
            <button
              type="button"
              onPointerDown={() =>
                setEmojiTarget({ kind: 'task', routineId: routine.id, taskId: task.id })
              }
              className="shrink-0"
              aria-label="Choose emoji (replaces photo)"
            >
              <TaskVisual task={task} size="edit" />
            </button>
            <button
              type="button"
              onPointerDown={() => void takePhoto(routine.id, task.id)}
              className="w-10 h-10 shrink-0 text-xl rounded-xl bg-slate-100"
              aria-label="Take or choose a photo"
            >
              📷
            </button>
            <input
              value={task.label}
              onChange={(e) =>
                updateRoutine(routine.id, (r) => ({
                  ...r,
                  tasks: r.tasks.map((t) =>
                    t.id === task.id ? { ...t, label: e.target.value } : t,
                  ),
                }))
              }
              className="flex-1 min-w-0 font-bold text-slate-700 bg-transparent"
            />
            <button
              type="button"
              disabled={i === 0}
              onPointerDown={() =>
                updateRoutine(routine.id, (r) => {
                  const tasks = [...r.tasks]
                  ;[tasks[i - 1], tasks[i]] = [tasks[i], tasks[i - 1]]
                  return { ...r, tasks }
                })
              }
              className="text-slate-400 disabled:opacity-25 px-1"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === routine.tasks.length - 1}
              onPointerDown={() =>
                updateRoutine(routine.id, (r) => {
                  const tasks = [...r.tasks]
                  ;[tasks[i], tasks[i + 1]] = [tasks[i + 1], tasks[i]]
                  return { ...r, tasks }
                })
              }
              className="text-slate-400 disabled:opacity-25 px-1"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() =>
                updateRoutine(routine.id, (r) => ({
                  ...r,
                  tasks: r.tasks.filter((t) => t.id !== task.id),
                }))
              }
              className="text-rose-400 px-1"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onPointerDown={() =>
            updateRoutine(routine.id, (r) => ({
              ...r,
              tasks: [...r.tasks, { id: newId(), label: 'New task', emoji: '⭐' }],
            }))
          }
          className="rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-bold py-3"
        >
          + Add task
        </button>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onPointerDown={() =>
              setData((d) => {
                const date = today()
                const dayHistory = { ...(d.history[date] ?? {}) }
                delete dayHistory[routine.id]
                return { ...d, history: { ...d.history, [date]: dayHistory } }
              })
            }
            className="flex-1 rounded-2xl bg-amber-100 text-amber-700 font-bold py-3"
          >
            Reset today's progress
          </button>
          <button
            type="button"
            onPointerDown={() => {
              if (window.confirm(`Delete "${routine.title}"?`)) {
                setData((d) => ({
                  ...d,
                  routines: d.routines.filter((r) => r.id !== routine.id),
                }))
                setView({ t: 'editor' })
              }
            }}
            className="flex-1 rounded-2xl bg-rose-100 text-rose-600 font-bold py-3"
          >
            Delete routine
          </button>
        </div>
      </div>

      {emojiTarget && (
        <EmojiGrid
          choices={emojiTarget.kind === 'routine' ? ROUTINE_EMOJI : TASK_EMOJI}
          onClose={() => setEmojiTarget(null)}
          onPick={(emoji) => {
            if (emojiTarget.kind === 'routine') {
              updateRoutine(emojiTarget.routineId, (r) => ({ ...r, emoji }))
            } else {
              // Choosing an emoji also clears any photo — last choice wins.
              updateRoutine(emojiTarget.routineId, (r) => ({
                ...r,
                tasks: r.tasks.map((t) =>
                  t.id === emojiTarget.taskId
                    ? { ...t, emoji, photoUri: undefined }
                    : t,
                ),
              }))
            }
            setEmojiTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default App
