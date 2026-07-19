export interface TaskCard {
  id: string
  label: string
  emoji: string
  /** Reserved for the photo upgrade — when set, rendered instead of emoji. */
  photoUri?: string
}

export interface Routine {
  id: string
  title: string
  emoji: string
  /** When true, tasks must be completed top to bottom. */
  inOrder: boolean
  tasks: TaskCard[]
}

export type TaskMark = 'check' | 'x'

interface RoutineProgress {
  /** YYYY-MM-DD the progress belongs to — a new day resets it. */
  date: string
  /** taskId -> check (done properly) | x (not done / done improperly). */
  marks: Record<string, TaskMark>
}

export interface TasksData {
  version: 2
  routines: Routine[]
  progress: Record<string, RoutineProgress>
}

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function newId(): string {
  return crypto.randomUUID()
}

function seedData(): TasksData {
  return {
    version: 2,
    routines: [
      {
        id: newId(),
        title: 'Morning',
        emoji: '☀️',
        inOrder: false,
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
        tasks: [
          { id: newId(), label: 'Bath', emoji: '🛁' },
          { id: newId(), label: 'Pajamas', emoji: '🩳' },
          { id: newId(), label: 'Brush Teeth', emoji: '🪥' },
          { id: newId(), label: 'Story', emoji: '📖' },
          { id: newId(), label: 'Sleep', emoji: '🛏️' },
        ],
      },
    ],
    progress: {},
  }
}

/** Load, validate, migrate v1 (doneIds) -> v2 (marks), apply daily reset. */
export function loadTasksData(raw: string | null): TasksData {
  if (!raw) return seedData()
  try {
    const parsed = JSON.parse(raw) as {
      version: number
      routines: Routine[]
      progress?: Record<string, { date: string; doneIds?: string[]; marks?: Record<string, TaskMark> }>
    }
    if ((parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.routines)) {
      return seedData()
    }
    const date = today()
    const progress: TasksData['progress'] = {}
    for (const routine of parsed.routines) {
      const p = parsed.progress?.[routine.id]
      if (!p || p.date !== date) continue
      const valid = new Set(routine.tasks.map((t) => t.id))
      const marks: Record<string, TaskMark> = {}
      if (p.marks) {
        for (const [id, mark] of Object.entries(p.marks)) {
          if (valid.has(id) && (mark === 'check' || mark === 'x')) marks[id] = mark
        }
      } else if (Array.isArray(p.doneIds)) {
        // v1: completed meant done-properly.
        for (const id of p.doneIds) if (valid.has(id)) marks[id] = 'check'
      }
      progress[routine.id] = { date, marks }
    }
    return { version: 2, routines: parsed.routines, progress }
  } catch {
    return seedData()
  }
}
