import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { ROUTINE_EMOJI, TASK_EMOJI } from './emoji'
import { playEffect } from './sounds'
import {
  loadTasksData,
  newId,
  today,
  type Routine,
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

/** Press-and-hold gear: 3 seconds of continuous hold opens the parent editor. */
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

  const start = () => {
    startRef.current = Date.now()
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

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      style={{ touchAction: 'none' }}
      aria-label="Hold for grown-up settings"
      className="relative w-11 h-11 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xl select-none"
    >
      {progress > 0 && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="#5C6BC0"
            strokeWidth="4"
            strokeDasharray={`${progress * 119.4} 119.4`}
          />
        </svg>
      )}
      ⚙️
    </button>
  )
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

function App({ services }: GameProps) {
  const [data, setData] = useState<TasksData>(() =>
    loadTasksData(services.storage.get(STORAGE_KEY)),
  )
  const [view, setView] = useState<View>(() =>
    data.routines.length === 1 ? { t: 'board', id: data.routines[0].id } : { t: 'picker' },
  )
  const [tapLocked, setTapLocked] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [emojiTarget, setEmojiTarget] = useState<
    | { kind: 'routine'; routineId: string }
    | { kind: 'task'; routineId: string; taskId: string }
    | null
  >(null)

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify(data))
  }, [services, data])

  // Hardware back mirrors the on-screen back affordances.
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

  const doneIds = (routineId: string): string[] => data.progress[routineId]?.doneIds ?? []

  const updateRoutine = (id: string, patch: (r: Routine) => Routine) => {
    setData((d) => ({
      ...d,
      routines: d.routines.map((r) => (r.id === id ? patch(r) : r)),
    }))
  }

  const toggleTask = (routine: Routine, taskId: string, isDone: boolean) => {
    if (tapLocked || celebrating) return
    const done = doneIds(routine.id)
    if (isDone) {
      // Un-doing a mistaken tap: silent, no lock.
      setData((d) => ({
        ...d,
        progress: {
          ...d.progress,
          [routine.id]: { date: today(), doneIds: done.filter((x) => x !== taskId) },
        },
      }))
      return
    }
    playEffect('yes')
    setTapLocked(true)
    window.setTimeout(() => setTapLocked(false), TAP_LOCK_MS)
    const nextDone = [...done, taskId]
    setData((d) => ({
      ...d,
      progress: { ...d.progress, [routine.id]: { date: today(), doneIds: nextDone } },
    }))
    if (nextDone.length === routine.tasks.length && routine.tasks.length > 0) {
      window.setTimeout(() => {
        playEffect('cheer', 0.8)
        setCelebrating(true)
        window.setTimeout(() => {
          setCelebrating(false)
          setView({ t: 'picker' })
        }, 2600)
      }, 350)
    }
  }

  /* ---------- kid views ---------- */

  if (view.t === 'picker') {
    return (
      <div className="min-h-dvh bg-linear-to-b from-indigo-100 via-cloud to-cloud-lavender flex flex-col p-4 gap-4 select-none">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-slate-700">Tasks</h1>
          <HoldGate onOpen={() => setView({ t: 'editor' })} />
        </div>
        <div className="flex-1 flex flex-wrap items-center justify-center gap-5">
          {data.routines.map((routine, i) => {
            const done = doneIds(routine.id).length
            const total = routine.tasks.length
            const complete = total > 0 && done === total
            return (
              <motion.button
                key={routine.id}
                type="button"
                onPointerDown={() => setView({ t: 'board', id: routine.id })}
                initial={{ opacity: 0, scale: 0.8, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.45, delay: i * 0.07 }}
                whileTap={{ scale: 0.93 }}
                className="w-40 h-40 rounded-3xl bg-white shadow-playful flex flex-col items-center justify-center gap-1 border-4 border-indigo-200"
              >
                <span className="text-6xl">{complete ? '✅' : routine.emoji}</span>
                <span className="text-xl font-extrabold text-slate-700">{routine.title}</span>
                <span className="text-sm font-bold text-indigo-400">
                  {done}/{total}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  if (view.t === 'board') {
    const routine = data.routines.find((r) => r.id === view.id)
    if (!routine) {
      setView({ t: 'picker' })
      return null
    }
    const done = doneIds(routine.id)
    const pending = routine.tasks.filter((t) => !done.includes(t.id))
    const firstPendingId = pending[0]?.id

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
          <div className="flex items-center gap-2 text-2xl font-extrabold text-slate-700">
            <span className="text-3xl">{routine.emoji}</span> {routine.title}
          </div>
          <HoldGate onOpen={() => setView({ t: 'editor' })} />
        </div>

        {/* To-do cards */}
        <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto py-2">
          <AnimatePresence>
            {pending.map((task) => {
              const locked = routine.inOrder && task.id !== firstPendingId
              return (
                <motion.button
                  key={task.id}
                  type="button"
                  layout
                  exit={{ opacity: 0, scale: 0.6, y: 40 }}
                  onPointerDown={() => !locked && toggleTask(routine, task.id, false)}
                  style={{ touchAction: 'manipulation' }}
                  whileTap={locked ? undefined : { scale: 0.96 }}
                  className={`w-full max-w-md flex items-center gap-4 rounded-3xl px-5 py-4 shadow-playful border-4 ${
                    locked
                      ? 'bg-slate-100 border-slate-200 opacity-45'
                      : 'bg-white border-indigo-200'
                  }`}
                >
                  <span className="text-5xl">{task.emoji}</span>
                  <span className="text-2xl font-extrabold text-slate-700">{task.label}</span>
                </motion.button>
              )
            })}
          </AnimatePresence>
          {pending.length === 0 && (
            <div className="text-2xl font-extrabold text-indigo-400 mt-8">All done! 🎉</div>
          )}
        </div>

        {/* Done row — tap a chip to un-do a mistaken completion */}
        {done.length > 0 && (
          <div className="shrink-0 w-full max-w-md mx-auto">
            <div className="text-sm font-extrabold text-slate-400 uppercase tracking-wide mb-1">
              Done
            </div>
            <div className="flex flex-wrap gap-2">
              {routine.tasks
                .filter((t) => done.includes(t.id))
                .map((task) => (
                  <motion.button
                    key={task.id}
                    type="button"
                    layout
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onPointerDown={() => toggleTask(routine, task.id, true)}
                    className="flex items-center gap-1 rounded-full bg-emerald-100 border-2 border-emerald-300 px-3 py-1"
                  >
                    <span className="text-xl">{task.emoji}</span>
                    <span className="text-emerald-600 font-extrabold">✓</span>
                  </motion.button>
                ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-indigo-500/90 flex flex-col items-center justify-center gap-6 z-50"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="text-8xl"
              >
                🎉
              </motion.div>
              <div className="text-5xl font-extrabold text-white drop-shadow text-center px-6">
                {routine.title} all done!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  /* ---------- parent views ---------- */

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
              <span className="flex-1 text-lg font-bold text-slate-700">{routine.title}</span>
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

  // view.t === 'edit'
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
              className="w-12 h-12 text-3xl shrink-0"
            >
              {task.emoji}
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
                const progress = { ...d.progress }
                delete progress[routine.id]
                return { ...d, progress }
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
              updateRoutine(emojiTarget.routineId, (r) => ({
                ...r,
                tasks: r.tasks.map((t) =>
                  t.id === emojiTarget.taskId ? { ...t, emoji } : t,
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
