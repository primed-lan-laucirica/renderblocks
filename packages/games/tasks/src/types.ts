export interface TaskCard {
  id: string
  label: string
  emoji: string
  /** Data-URL photo taken with the device camera; shown instead of emoji. */
  photoUri?: string
}

export interface Routine {
  id: string
  title: string
  emoji: string
  /** When true, tasks must be completed top to bottom. */
  inOrder: boolean
  /** Everyday routines appear on every date; others are scheduled per date. */
  everyday: boolean
  tasks: TaskCard[]
}

export type TaskMark = 'check' | 'x'
export type Marks = Record<string, TaskMark>

export interface TasksData {
  version: 3
  routines: Routine[]
  /** date -> extra (non-everyday) routine ids scheduled onto that date. */
  schedule: Record<string, string[]>
  /** date -> routineId -> taskId -> mark. Kept as history, pruned at ~120 days. */
  history: Record<string, Record<string, Marks>>
}

const HISTORY_DAYS = 120

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function today(): string {
  return fmt(new Date())
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return fmt(new Date(y, m - 1, d + n))
}

export function dayParts(date: string): { dow: string; day: number } {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()],
    day: d,
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

/* ---------- derivations ---------- */

export function routinesForDate(data: TasksData, date: string): Routine[] {
  const extras = new Set(data.schedule[date] ?? [])
  return data.routines.filter((r) => r.everyday || extras.has(r.id))
}

export function marksFor(data: TasksData, date: string, routineId: string): Marks {
  return data.history[date]?.[routineId] ?? {}
}

export function isComplete(routine: Routine, marks: Marks): boolean {
  return routine.tasks.length > 0 && routine.tasks.every((t) => t.id in marks)
}

/** Routine star: every task marked, all of them checks. */
export function hasRoutineStar(routine: Routine, marks: Marks): boolean {
  return routine.tasks.length > 0 && routine.tasks.every((t) => marks[t.id] === 'check')
}

/** Day star: at least one routine on the date and every one earned its star. */
export function hasDayStar(data: TasksData, date: string): boolean {
  const routines = routinesForDate(data, date)
  return (
    routines.length > 0 &&
    routines.every((r) => hasRoutineStar(r, marksFor(data, date, r.id)))
  )
}

export function starCount(data: TasksData, date: string): number {
  return routinesForDate(data, date).filter((r) =>
    hasRoutineStar(r, marksFor(data, date, r.id)),
  ).length
}

/* ---------- load / migrate ---------- */

function seedData(): TasksData {
  return {
    version: 3,
    routines: [
      {
        id: newId(),
        title: 'Morning',
        emoji: '☀️',
        inOrder: false,
        everyday: true,
        tasks: [
          { id: newId(), label: 'Potty', emoji: '🚽' },
          { id: newId(), label: 'Brush Teeth', emoji: '🪥' },
          { id: newId(), label: 'Get Dressed', emoji: '👕' },
          { id: newId(), label: 'Breakfast', emoji: '🍳' },
        ],
      },
      {
        id: newId(),
        title: 'Bedtime',
        emoji: '🌙',
        inOrder: false,
        everyday: true,
        tasks: [
          { id: newId(), label: 'Bath', emoji: '🛁' },
          { id: newId(), label: 'Pajamas', emoji: '🩳' },
          { id: newId(), label: 'Brush Teeth', emoji: '🪥' },
          { id: newId(), label: 'Story', emoji: '📖' },
          { id: newId(), label: 'Sleep', emoji: '🛏️' },
        ],
      },
    ],
    schedule: {},
    history: {},
  }
}

function sanitizeMarks(raw: unknown, routine: Routine): Marks {
  const valid = new Set(routine.tasks.map((t) => t.id))
  const marks: Marks = {}
  if (raw && typeof raw === 'object') {
    for (const [id, mark] of Object.entries(raw as Record<string, unknown>)) {
      if (valid.has(id) && (mark === 'check' || mark === 'x')) marks[id] = mark
    }
  }
  return marks
}

/** Load, validate, migrate v1/v2 -> v3, prune old history. */
export function loadTasksData(raw: string | null): TasksData {
  if (!raw) return seedData()
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (![1, 2, 3].includes(parsed.version as number) || !Array.isArray(parsed.routines)) {
      return seedData()
    }
    const routines: Routine[] = (parsed.routines as Routine[]).map((r) => ({
      ...r,
      everyday: typeof r.everyday === 'boolean' ? r.everyday : true,
    }))
    const byId = new Map(routines.map((r) => [r.id, r]))
    const cutoff = addDays(today(), -HISTORY_DAYS)

    const history: TasksData['history'] = {}
    const schedule: TasksData['schedule'] = {}

    if (parsed.version === 3) {
      const rawHistory = (parsed.history ?? {}) as Record<string, Record<string, unknown>>
      for (const [date, byRoutine] of Object.entries(rawHistory)) {
        if (date < cutoff) continue
        for (const [rid, marks] of Object.entries(byRoutine)) {
          const routine = byId.get(rid)
          if (!routine) continue
          const clean = sanitizeMarks(marks, routine)
          if (Object.keys(clean).length > 0) {
            ;(history[date] ??= {})[rid] = clean
          }
        }
      }
      const rawSchedule = (parsed.schedule ?? {}) as Record<string, unknown>
      for (const [date, ids] of Object.entries(rawSchedule)) {
        if (date < cutoff || !Array.isArray(ids)) continue
        const clean = ids.filter((id): id is string => typeof id === 'string' && byId.has(id))
        if (clean.length > 0) schedule[date] = [...new Set(clean)]
      }
    } else {
      // v1/v2: single-day progress keyed by routine id.
      const progress = (parsed.progress ?? {}) as Record<
        string,
        { date: string; doneIds?: string[]; marks?: unknown }
      >
      for (const [rid, p] of Object.entries(progress)) {
        const routine = byId.get(rid)
        if (!routine || !p?.date || p.date < cutoff) continue
        const marks = p.marks
          ? sanitizeMarks(p.marks, routine)
          : sanitizeMarks(
              Object.fromEntries((p.doneIds ?? []).map((id) => [id, 'check'])),
              routine,
            )
        if (Object.keys(marks).length > 0) {
          ;(history[p.date] ??= {})[rid] = marks
        }
      }
    }

    return { version: 3, routines, schedule, history }
  } catch {
    return seedData()
  }
}
