import { useCallback, useEffect, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { CalendarView } from './CalendarView'
import type { Ctx } from './ctx'
import { Explorer } from './Explorer'
import { Lists } from './Lists'
import { clock12, iso, load, minutesOf, MONTHS, prune, seed, WEEKDAYS, type CalData } from './model'
import { RoutineEditor, Settings } from './Parent'
import { Stars } from './Stars'
import { Timer } from './Timer'
import { Today } from './Today'
import { SCALES, THEMES, useNow, useThemeName } from './theme'
import { PinGate } from './ui'

const KEY = 'data'
/** Parent mode closes itself after this long without a touch. */
const PARENT_MS = 5 * 60_000

type Tab = 'today' | 'calendar' | 'stars' | 'lists'
const TABS: Array<[Tab, string, string]> = [
  ['today', 'Today', '☀️'],
  ['calendar', 'Calendar', '📅'],
  ['stars', 'Stars', '⭐'],
  ['lists', 'Lists', '📝'],
]

/**
 * The family calendar and routine board (Calendar-MVP-spec.md). Replaces
 * Tasks. Everything is kept on the tablet; export and import move it.
 */
function App({ services }: GameProps) {
  const { storage } = services
  const [data, setData] = useState<CalData>(() => prune(load(storage.get(KEY)) ?? seed(), iso(new Date())))
  const [tab, setTab] = useState<Tab>('today')
  const [parentUntil, setParentUntil] = useState(0)
  const [asking, setAsking] = useState<(() => void) | null>(null)
  const [overlay, setOverlay] = useState<'explorer' | 'timer' | 'settings' | 'routines' | null>(null)
  const now = useNow(1000)
  const today = iso(now)
  const [lastTouch, setLastTouch] = useState(() => Date.now())

  useEffect(() => storage.set(KEY, JSON.stringify(data)), [storage, data])

  // Text size (spec 16): scale the root font size while the calendar is open.
  useEffect(() => {
    const html = document.documentElement
    const before = html.style.fontSize
    html.style.fontSize = `${SCALES[data.settings.scale] ?? 18}px`
    return () => {
      html.style.fontSize = before
    }
  }, [data.settings.scale])

  const parent = parentUntil > now.getTime()
  const update = useCallback((fn: (d: CalData) => CalData) => setData((d) => fn(d)), [])
  const askParent = useCallback(
    (then: () => void) => {
      if (parentUntil > Date.now()) then()
      else setAsking(() => then)
    },
    [parentUntil],
  )
  const ctx: Ctx = { data, update, parent, askParent, today }

  // Back: close whatever is open, then the calendar.
  useEffect(
    () =>
      services.onBack(() => {
        if (overlay || asking) {
          setOverlay(null)
          setAsking(null)
          return true
        }
        return false
      }),
    [services, overlay, asking],
  )

  // Night (spec 15): the sleep screen during the schedule, or after idle minutes.
  const mins = now.getHours() * 60 + now.getMinutes()
  const { sleep, idle } = data.settings
  const inNight = sleep.on && inWindow(mins, minutesOf(sleep.from), minutesOf(sleep.to))
  const quiet = now.getTime() - lastTouch
  const asleep = (inNight && quiet > 60_000) || (idle > 0 && quiet > idle * 60_000)
  const touched = () => {
    const t = now.getTime()
    setLastTouch(t)
    if (parent) setParentUntil(t + PARENT_MS)
  }

  const themeName = useThemeName(data.settings)
  return (
    <div
      className="h-dvh flex bg-[var(--bg)] text-[var(--ink)] select-none overflow-hidden"
      style={{ ...THEMES[themeName], filter: inNight && !asleep ? 'brightness(0.75)' : undefined }}
      onPointerDownCapture={touched}
    >
      <nav className="w-28 shrink-0 flex flex-col items-stretch gap-2 p-2 border-r border-[var(--line)] bg-[var(--card)]">
        <button type="button" onClick={services.exitToHome} className="h-12 rounded-2xl text-2xl font-black" aria-label="Home">
          ←
        </button>
        {TABS.map(([t, label, emoji]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-2xl py-3 flex flex-col items-center gap-1 font-black ${tab === t ? 'bg-[var(--accent)] text-[var(--on-accent)]' : ''}`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-base">{label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => (parent ? setOverlay('settings') : askParent(() => setOverlay('settings')))}
          className={`rounded-2xl py-3 flex flex-col items-center gap-1 font-black ${parent ? 'bg-amber-300 text-amber-950' : ''}`}
          aria-label={parent ? 'Parent settings' : 'Parent mode'}
        >
          <span className="text-3xl">{parent ? '🔓' : '🔒'}</span>
          <span className="text-sm">{parent ? 'Parent' : 'Grown-ups'}</span>
        </button>
      </nav>

      <main className="flex-1 min-w-0 flex flex-col">
        <button
          type="button"
          onClick={() => setOverlay('explorer')}
          className="flex items-baseline gap-4 px-5 py-3 border-b border-[var(--line)] text-left"
          aria-label="Open the time and date explorer"
        >
          <span className="text-3xl font-black">
            {WEEKDAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
          </span>
          <span className="text-2xl font-black tabular-nums text-[var(--muted)]">
            {now.getMonth() + 1}/{now.getDate()}/{now.getFullYear()}
          </span>
          <span className="ml-auto text-4xl font-black tabular-nums">{clock12(now.getHours(), now.getMinutes())}</span>
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'today' && (
            <Today ctx={ctx} now={now} onTimer={() => setOverlay('timer')} onEditRoutines={() => askParent(() => setOverlay('routines'))} />
          )}
          {tab === 'calendar' && <CalendarView ctx={ctx} />}
          {tab === 'stars' && <Stars ctx={ctx} />}
          {tab === 'lists' && <Lists ctx={ctx} />}
        </div>
      </main>

      {overlay === 'explorer' && <Explorer ctx={ctx} now={now} onClose={() => setOverlay(null)} />}
      {overlay === 'timer' && <Timer onClose={() => setOverlay(null)} />}
      {overlay === 'settings' && <Settings ctx={ctx} onClose={() => setOverlay(null)} onLock={() => (setParentUntil(0), setOverlay(null))} />}
      {overlay === 'routines' && <RoutineEditor ctx={ctx} onClose={() => setOverlay(null)} />}

      {asking && (
        <PinGate
          pin={data.settings.pin}
          onCancel={() => setAsking(null)}
          onSet={(pin) => {
            update((d) => ({ ...d, settings: { ...d.settings, pin } }))
            setParentUntil(Date.now() + PARENT_MS)
            const then = asking
            setAsking(null)
            then()
          }}
          onOpen={() => {
            setParentUntil(Date.now() + PARENT_MS)
            const then = asking
            setAsking(null)
            then()
          }}
        />
      )}

      {asleep && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-4 text-slate-600" aria-label="Sleep screen: tap to wake">
          <div className="text-9xl font-black tabular-nums">{clock12(now.getHours(), now.getMinutes())}</div>
          <div className="text-3xl font-bold">
            {WEEKDAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
          </div>
        </div>
      )}
    </div>
  )
}

/** Is `m` inside a window that may cross midnight (7:30 PM to 6:30 AM)? */
function inWindow(m: number, from: number, to: number): boolean {
  return from <= to ? m >= from && m < to : m >= from || m < to
}

export default App
