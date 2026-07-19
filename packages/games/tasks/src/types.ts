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

interface RoutineProgress {
  /** YYYY-MM-DD the progress belongs to — a new day resets it. */
  date: string
  doneIds: string[]
}

export interface TasksData {
  version: 1
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
    version: 1,
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

/** Load, validate, and apply the daily progress reset. */
export function loadTasksData(raw: string | null): TasksData {
  if (!raw) return seedData()
  try {
    const parsed = JSON.parse(raw) as TasksData
    if (parsed.version !== 1 || !Array.isArray(parsed.routines)) return seedData()
    const date = today()
    const progress: TasksData['progress'] = {}
    for (const routine of parsed.routines) {
      const p = parsed.progress?.[routine.id]
      if (p && p.date === date && Array.isArray(p.doneIds)) {
        const valid = new Set(routine.tasks.map((t) => t.id))
        progress[routine.id] = { date, doneIds: p.doneIds.filter((id) => valid.has(id)) }
      }
    }
    return { version: 1, routines: parsed.routines, progress }
  } catch {
    return seedData()
  }
}
