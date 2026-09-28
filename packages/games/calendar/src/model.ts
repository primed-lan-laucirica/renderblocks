/**
 * The calendar's data and every rule about it (spec: core features).
 * Pure — no DOM, no React — so it is unit tested directly.
 *
 * Dates are 'YYYY-MM-DD' strings and times 'HH:MM' (24-hour), in the
 * tablet's local time: a family board lives in one place.
 */

export type Part = 'morning' | 'afternoon' | 'evening' | 'anytime'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Profile {
  id: string
  name: string
  colour: string
}

export interface CalEvent {
  id: string
  title: string
  emoji?: string
  date: string
  /** Absent for an all-day event. */
  start?: string
  end?: string
  /** Profile ids; an event shared by two shows both colours. */
  people: string[]
  repeat: Repeat
}

export interface Task {
  id: string
  label: string
  emoji?: string
  /** Data-URL photo from the tablet camera, shown instead of the emoji. */
  photo?: string
  stars: number
  /** A counter task: done after this many taps ("Drink water: 2 of 4"). */
  count?: number
}

export interface Routine {
  id: string
  title: string
  emoji: string
  part: Part
  /** Optional start time, for Now / Next / Later. Defaults by part of day. */
  time?: string
  profile: string
  /** Days of the week it runs (0 = Sunday). */
  days: number[]
  /** Extra single dates it runs on. */
  dates?: string[]
  /** Tasks must be done top to bottom. */
  inOrder: boolean
  tasks: Task[]
}

export interface Reward {
  id: string
  label: string
  emoji: string
  cost: number
}

export interface ListItem {
  id: string
  text: string
  section?: string
  done: boolean
}

export interface List {
  id: string
  title: string
  kind: 'grocery' | 'todo'
  items: ListItem[]
}

/** One change to a person's stars: + for a task done, − for a reward. */
export interface StarEntry {
  profile: string
  stars: number
  date: string
  /** The task that earned it (so unticking takes it back), or the reward bought. */
  task?: string
  reward?: string
  note?: string
}

export interface Settings {
  pin?: string
  /** Text size step, 0–4. */
  scale: number
  sleep: { on: boolean; from: string; to: string }
  /** Minutes without a touch before the sleep screen; 0 = never. */
  idle: number
  theme: 'light' | 'dark' | 'auto'
}

export interface CalData {
  version: 1
  profiles: Profile[]
  events: CalEvent[]
  routines: Routine[]
  rewards: Reward[]
  lists: List[]
  /** date → task id → times done (1 for an ordinary task). */
  done: Record<string, Record<string, number>>
  stars: StarEntry[]
  settings: Settings
}

// ------------------------------------------------------------ dates

export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
export const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const timeOf = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
export const daysInMonth = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]
export const dayOfYear = (s: string) => daysBetween(`${s.slice(0, 4)}-01-01`, s) + 1

/** ISO 8601 week number (weeks start Monday; week 1 holds the year's first Thursday). */
export function isoWeek(s: string): number {
  const d = parseDate(s)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day + 3) // that week's Thursday
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const fDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - fDay + 3)
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

export function numberWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ''}`
  return String(n)
}

const ORDINAL_WORD: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' }

/** 28 → "twenty-eighth". */
export function ordinalWords(n: number): string {
  const w = numberWords(n)
  const last = w.split(/[- ]/).pop()!
  const ord = ORDINAL_WORD[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`)
  return w.slice(0, w.length - last.length) + ord
}

/** 28 → "28th", 1 → "1st", 12 → "12th". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}

/** A time in words: "half past three", "quarter to four", "twenty past seven", "three o'clock". */
export function timeWords(h24: number, m: number): string {
  const h = h24 % 12 || 12
  const next = (h % 12) + 1
  if (m === 0) return `${numberWords(h)} o'clock`
  if (m === 15) return `quarter past ${numberWords(h)}`
  if (m === 30) return `half past ${numberWords(h)}`
  if (m === 45) return `quarter to ${numberWords(next)}`
  const minutes = (n: number) => `${numberWords(n)} ${n === 1 ? 'minute' : 'minutes'}`
  if (m < 30) return `${m % 5 === 0 ? numberWords(m) : minutes(m)} past ${numberWords(h)}`
  return `${(60 - m) % 5 === 0 ? numberWords(60 - m) : minutes(60 - m)} to ${numberWords(next)}`
}

/** "3:30 PM" and "15:30". */
export const clock12 = (h: number, m: number) => `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
export const clock24 = (h: number, m: number) => `${pad(h)}:${pad(m)}`

// ------------------------------------------------------------ events

/** Does a (possibly repeating) event fall on this date? */
export function occursOn(e: CalEvent, date: string): boolean {
  if (date < e.date) return false
  if (date === e.date) return true
  const a = parseDate(e.date)
  const b = parseDate(date)
  switch (e.repeat) {
    case 'daily':
      return true
    case 'weekly':
      return a.getDay() === b.getDay()
    case 'monthly':
      return a.getDate() === b.getDate()
    case 'yearly':
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth()
    default:
      return false
  }
}

/** The day's events: all-day first, then by start time. */
export function eventsOn(events: CalEvent[], date: string): CalEvent[] {
  return events
    .filter((e) => occursOn(e, date))
    .sort((x, y) => (x.start ?? '') .localeCompare(y.start ?? '') || x.title.localeCompare(y.title))
}

// ------------------------------------------------------------ routines

/** Parts of the day (spec 4): morning to noon, afternoon to 6 pm, evening to midnight. */
export function partOf(mins: number): Exclude<Part, 'anytime'> {
  return mins < 12 * 60 ? 'morning' : mins < 18 * 60 ? 'afternoon' : 'evening'
}

export const PART_START: Record<Part, string> = { morning: '07:00', afternoon: '12:00', evening: '18:00', anytime: '00:00' }

export function routinesOn(routines: Routine[], date: string): Routine[] {
  const dow = parseDate(date).getDay()
  return routines.filter((r) => r.days.includes(dow) || r.dates?.includes(date))
}

export const timesDone = (data: CalData, date: string, task: Task) => data.done[date]?.[task.id] ?? 0
export const target = (task: Task) => task.count ?? 1
export const isDone = (data: CalData, date: string, task: Task) => timesDone(data, date, task) >= target(task)

/** "3 of 5 done". */
export function progress(data: CalData, date: string, r: Routine): { done: number; total: number } {
  return { done: r.tasks.filter((t) => isDone(data, date, t)).length, total: r.tasks.length }
}

/** In an in-order routine, only the first unfinished task can be ticked. */
export function canTick(data: CalData, date: string, r: Routine, task: Task): boolean {
  if (!r.inOrder) return true
  const first = r.tasks.find((t) => !isDone(data, date, t))
  return !first || first.id === task.id || isDone(data, date, task)
}

export const balance = (data: CalData, profile: string) =>
  data.stars.filter((s) => s.profile === profile).reduce((sum, s) => sum + s.stars, 0)

/**
 * Tick a task (or add one to a counter). When it becomes done, its stars
 * are earned. Ticking a done task undoes it and takes the stars back.
 * Returns the new data and the stars change (for "12 + 1 = 13 ★").
 */
export function tick(data: CalData, date: string, r: Routine, task: Task): { data: CalData; earned: number } {
  const n = timesDone(data, date, task)
  const wasDone = n >= target(task)
  const next = wasDone ? 0 : n + 1
  const done = { ...data.done, [date]: { ...data.done[date], [task.id]: next } }
  let stars = data.stars
  let earned = 0
  if (!wasDone && next >= target(task) && task.stars > 0) {
    stars = [...stars, { profile: r.profile, stars: task.stars, date, task: task.id }]
    earned = task.stars
  } else if (wasDone) {
    const i = stars.findIndex((s) => s.task === task.id && s.date === date && s.stars > 0)
    if (i >= 0) {
      earned = -stars[i].stars
      stars = stars.filter((_, k) => k !== i)
    }
  }
  return { data: { ...data, done, stars }, earned }
}

/** Spend stars on a reward (a parent approves in the UI). */
export function redeem(data: CalData, profile: string, reward: Reward, date: string): CalData | null {
  if (balance(data, profile) < reward.cost) return null
  return { ...data, stars: [...data.stars, { profile, stars: -reward.cost, date, reward: reward.id, note: reward.label }] }
}

// ------------------------------------------------------------ now / next / later

export interface Moment {
  title: string
  emoji?: string
  time: string
  /** When it's over: an event's end (or an hour on), a routine's part of the day. */
  until: number
  kind: 'event' | 'routine'
  id: string
}

const PART_END: Record<Part, number> = { morning: 12 * 60, afternoon: 18 * 60, evening: 24 * 60, anytime: 24 * 60 }

/**
 * Today's timed events and routines (spec 9): what is happening now (it
 * has started and isn't over — a routine lasts its part of the day), and
 * the next two to start.
 */
export function nowNext(data: CalData, date: string, nowMins: number): { now?: Moment; next?: Moment; later?: Moment } {
  const items: Moment[] = [
    ...eventsOn(data.events, date)
      .filter((e) => e.start)
      .map((e) => ({ title: e.title, emoji: e.emoji, time: e.start!, until: e.end ? minutesOf(e.end) : minutesOf(e.start!) + 60, kind: 'event' as const, id: e.id })),
    ...routinesOn(data.routines, date)
      .filter((r) => r.part !== 'anytime')
      .map((r) => ({ title: r.title, emoji: r.emoji, time: r.time ?? PART_START[r.part], until: PART_END[r.part], kind: 'routine' as const, id: r.id })),
  ].sort((a, b) => a.time.localeCompare(b.time))
  const current = items.filter((m) => minutesOf(m.time) <= nowMins && nowMins < m.until)
  const upcoming = items.filter((m) => minutesOf(m.time) > nowMins)
  return { now: current[current.length - 1], next: upcoming[0], later: upcoming[1] }
}

// ------------------------------------------------------------ start and load

let seq = 0
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const PROFILE_COLOURS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626']

export const DEFAULT_SETTINGS: Settings = { scale: 2, sleep: { on: false, from: '19:30', to: '06:30' }, idle: 0, theme: 'auto' }

const everyDay = [0, 1, 2, 3, 4, 5, 6]

export function seed(): CalData {
  const render = { id: newId(), name: 'Render', colour: PROFILE_COLOURS[0] }
  const family = { id: newId(), name: 'Family', colour: PROFILE_COLOURS[1] }
  const task = (label: string, emoji: string, extra: Partial<Task> = {}): Task => ({ id: newId(), label, emoji, stars: 1, ...extra })
  return {
    version: 1,
    profiles: [render, family],
    events: [],
    routines: [
      {
        id: newId(),
        title: 'Morning',
        emoji: '☀️',
        part: 'morning',
        profile: render.id,
        days: everyDay,
        inOrder: false,
        tasks: [task('Potty', '🚽'), task('Brush teeth', '🪥'), task('Get dressed', '👕'), task('Breakfast', '🍳')],
      },
      {
        id: newId(),
        title: 'Bedtime',
        emoji: '🌙',
        part: 'evening',
        time: '19:00',
        profile: render.id,
        days: everyDay,
        inOrder: false,
        tasks: [task('Bath', '🛁'), task('Pajamas', '🩳'), task('Brush teeth', '🪥'), task('Story', '📖')],
      },
      {
        id: newId(),
        title: 'Anytime',
        emoji: '⭐',
        part: 'anytime',
        profile: render.id,
        days: everyDay,
        inOrder: false,
        tasks: [task('Drink water', '💧', { count: 4 }), task('Tidy toys', '🧸')],
      },
    ],
    rewards: [
      { id: newId(), label: 'Trip to the park', emoji: '🛝', cost: 20 },
      { id: newId(), label: 'Extra story', emoji: '📚', cost: 5 },
    ],
    lists: [
      { id: newId(), title: 'Groceries', kind: 'grocery', items: [] },
      { id: newId(), title: 'To do', kind: 'todo', items: [] },
    ],
    done: {},
    stars: [],
    settings: DEFAULT_SETTINGS,
  }
}

/** Load saved data, keeping anything well-formed and filling gaps with defaults. */
export function load(raw: string | null): CalData | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Partial<CalData>
    if (d.version !== 1 || !Array.isArray(d.profiles) || !d.profiles.length) return null
    return {
      version: 1,
      profiles: d.profiles,
      events: Array.isArray(d.events) ? d.events : [],
      routines: Array.isArray(d.routines) ? d.routines : [],
      rewards: Array.isArray(d.rewards) ? d.rewards : [],
      lists: Array.isArray(d.lists) ? d.lists : [],
      done: d.done && typeof d.done === 'object' ? d.done : {},
      stars: Array.isArray(d.stars) ? d.stars : [],
      settings: { ...DEFAULT_SETTINGS, ...d.settings, sleep: { ...DEFAULT_SETTINGS.sleep, ...d.settings?.sleep } },
    }
  } catch {
    return null
  }
}

/** Keep a year of ticks; stars live in their own ledger, so balances survive. */
export function prune(data: CalData, today: string): CalData {
  const cutoff = addDays(today, -366)
  return { ...data, done: Object.fromEntries(Object.entries(data.done).filter(([d]) => d >= cutoff)) }
}

/** Everything, as one file to keep or move to another tablet (spec: export and import). */
export function exportData(data: CalData, today: string): string {
  return JSON.stringify({ app: 'renderblocks-calendar', exported: today, data }, null, 1)
}

/** Read an exported file back; null if it isn't one. */
export function importData(text: string): CalData | null {
  try {
    const f = JSON.parse(text) as { app?: string; data?: unknown }
    return load(JSON.stringify(f.app === 'renderblocks-calendar' ? f.data : f))
  } catch {
    return null
  }
}
