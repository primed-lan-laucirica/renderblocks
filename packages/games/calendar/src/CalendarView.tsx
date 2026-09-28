import { useState } from 'react'
import type { Ctx } from './ctx'
import {
  addDays,
  clock12,
  daysInMonth,
  eventsOn,
  iso,
  MONTHS,
  newId,
  parseDate,
  WEEKDAYS,
  type CalEvent,
  type Profile,
  type Repeat,
} from './model'
import { Button, Card, PeoplePicker, Sheet, TimeField } from './ui'

type Mode = 'day' | 'week' | 'month' | 'agenda'

/** The family calendar (spec 1–3): Day, Week, Month and Agenda, in each person's colour. */
export function CalendarView({ ctx }: { ctx: Ctx }) {
  const { data, today } = ctx
  const [mode, setMode] = useState<Mode>('month')
  const [cursor, setCursor] = useState(today)
  const [editing, setEditing] = useState<CalEvent | null>(null)
  const [viewing, setViewing] = useState<CalEvent | null>(null)

  const step = (d: number) => {
    const c = parseDate(cursor)
    if (mode === 'month') setCursor(iso(new Date(c.getFullYear(), c.getMonth() + d, 1)))
    else setCursor(addDays(cursor, mode === 'week' ? 7 * d : mode === 'agenda' ? 30 * d : d))
  }
  const c = parseDate(cursor)
  const title =
    mode === 'month'
      ? `${MONTHS[c.getMonth()]} ${c.getFullYear()}`
      : mode === 'week'
        ? `Week of ${MONTHS[parseDate(weekStart(cursor)).getMonth()]} ${parseDate(weekStart(cursor)).getDate()}`
        : `${WEEKDAYS[c.getDay()]}, ${MONTHS[c.getMonth()]} ${c.getDate()}`
  const open = (e: CalEvent) => (ctx.parent ? setEditing(e) : setViewing(e))
  const add = (date: string) =>
    ctx.askParent(() => setEditing({ id: newId(), title: '', date, people: [], repeat: 'none', start: '09:00', end: '10:00' }))

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => step(-1)} label="Back" className="text-2xl px-4">
          ‹
        </Button>
        <Button onClick={() => setCursor(today)}>Today</Button>
        <Button onClick={() => step(1)} label="Forward" className="text-2xl px-4">
          ›
        </Button>
        <h2 className="text-2xl font-black mx-2">{title}</h2>
        <div className="flex-1" />
        <div className="flex rounded-2xl bg-[var(--card)] border border-[var(--line)] p-1 gap-1">
          {(['day', 'week', 'month', 'agenda'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl px-3 py-1.5 font-extrabold capitalize ${mode === m ? 'bg-[var(--accent)] text-[var(--on-accent)]' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
        <Button kind="primary" onClick={() => add(cursor)}>
          {ctx.parent ? '+' : '🔒'} Event
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === 'month' && <Month ctx={ctx} cursor={cursor} onDay={(d) => (setCursor(d), setMode('day'))} onEvent={open} />}
        {mode === 'week' && <Week ctx={ctx} cursor={cursor} onDay={(d) => (setCursor(d), setMode('day'))} onEvent={open} />}
        {mode === 'day' && <Day ctx={ctx} date={cursor} onEvent={open} />}
        {mode === 'agenda' && <Agenda ctx={ctx} from={cursor} onEvent={open} />}
      </div>

      {editing && (
        <EventEditor
          event={editing}
          profiles={data.profiles}
          isNew={!data.events.some((e) => e.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(e) => {
            ctx.update((d) => ({ ...d, events: d.events.some((x) => x.id === e.id) ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] }))
            setEditing(null)
          }}
          onDelete={() => {
            ctx.update((d) => ({ ...d, events: d.events.filter((x) => x.id !== editing.id) }))
            setEditing(null)
          }}
        />
      )}
      {viewing && (
        <Sheet title={`${viewing.emoji ?? ''} ${viewing.title}`} onClose={() => setViewing(null)}>
          <EventFacts e={viewing} profiles={data.profiles} />
        </Sheet>
      )}
    </div>
  )
}

const weekStart = (date: string) => addDays(date, -parseDate(date).getDay())

/** An event's colours: one person's, or stripes when it's shared. */
function stripe(e: CalEvent, profiles: Profile[]): string {
  const cs = e.people.map((id) => profiles.find((p) => p.id === id)?.colour).filter(Boolean) as string[]
  if (!cs.length) return '#64748b'
  if (cs.length === 1) return cs[0]
  const w = 100 / cs.length
  return `linear-gradient(90deg, ${cs.map((c, i) => `${c} ${i * w}% ${(i + 1) * w}%`).join(', ')})`
}

function EventChip({ e, profiles, onClick, big }: { e: CalEvent; profiles: Profile[]; onClick: () => void; big?: boolean }) {
  const [h, m] = (e.start ?? '0:0').split(':').map(Number)
  return (
    <button
      type="button"
      onClick={(ev) => (ev.stopPropagation(), onClick())}
      className={`w-full text-left rounded-lg px-1.5 py-0.5 text-white font-bold truncate ${big ? 'text-lg px-3 py-2 rounded-xl' : 'text-xs'}`}
      style={{ background: stripe(e, profiles) }}
    >
      {e.start && <span className="tabular-nums mr-1 opacity-90">{clock12(h, m).replace(':00', '')}</span>}
      {e.emoji} {e.title}
    </button>
  )
}

function Month({ ctx, cursor, onDay, onEvent }: { ctx: Ctx; cursor: string; onDay: (d: string) => void; onEvent: (e: CalEvent) => void }) {
  const c = parseDate(cursor)
  const first = iso(new Date(c.getFullYear(), c.getMonth(), 1))
  const start = weekStart(first)
  const n = daysInMonth(c.getFullYear(), c.getMonth())
  const rows = Math.ceil((parseDate(first).getDay() + n) / 7)
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((w) => (
        <div key={w} className="text-center font-black text-[var(--muted)] text-sm">
          {w.slice(0, 3)}
        </div>
      ))}
      {Array.from({ length: rows * 7 }, (_, i) => {
        const d = addDays(start, i)
        const inMonth = parseDate(d).getMonth() === c.getMonth()
        const evs = eventsOn(ctx.data.events, d)
        return (
          <button
            key={d}
            type="button"
            onClick={() => onDay(d)}
            className={`min-h-24 rounded-2xl p-1.5 text-left flex flex-col gap-1 border-2 bg-[var(--card)] ${d === ctx.today ? 'border-[var(--accent)]' : 'border-transparent'} ${inMonth ? '' : 'opacity-40'}`}
          >
            <span className={`text-lg font-black tabular-nums ${d === ctx.today ? 'text-[var(--accent)]' : ''}`}>{parseDate(d).getDate()}</span>
            {evs.slice(0, 3).map((e) => (
              <EventChip key={e.id} e={e} profiles={ctx.data.profiles} onClick={() => onEvent(e)} />
            ))}
            {evs.length > 3 && <span className="text-xs font-bold text-[var(--muted)]">+{evs.length - 3} more</span>}
          </button>
        )
      })}
    </div>
  )
}

function Week({ ctx, cursor, onDay, onEvent }: { ctx: Ctx; cursor: string; onDay: (d: string) => void; onEvent: (e: CalEvent) => void }) {
  const start = weekStart(cursor)
  return (
    <div className="grid grid-cols-7 gap-2 h-full">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i)
        const p = parseDate(d)
        return (
          <button
            key={d}
            type="button"
            onClick={() => onDay(d)}
            className={`rounded-2xl p-2 bg-[var(--card)] border-2 flex flex-col gap-1.5 text-left min-h-60 ${d === ctx.today ? 'border-[var(--accent)]' : 'border-transparent'}`}
          >
            <span className="font-black text-[var(--muted)]">{WEEKDAYS[p.getDay()].slice(0, 3)}</span>
            <span className="text-3xl font-black tabular-nums">{p.getDate()}</span>
            {eventsOn(ctx.data.events, d).map((e) => (
              <EventChip key={e.id} e={e} profiles={ctx.data.profiles} onClick={() => onEvent(e)} />
            ))}
          </button>
        )
      })}
    </div>
  )
}

/** A day as an hour timeline, 6 AM to 10 PM, with all-day events on top. */
function Day({ ctx, date, onEvent }: { ctx: Ctx; date: string; onEvent: (e: CalEvent) => void }) {
  const evs = eventsOn(ctx.data.events, date)
  const HOUR_PX = 64
  const FROM = 6
  const TO = 22
  const top = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (Math.max(FROM, Math.min(TO, h + m / 60)) - FROM) * HOUR_PX
  }
  return (
    <div className="flex flex-col gap-2">
      {evs
        .filter((e) => !e.start)
        .map((e) => (
          <EventChip key={e.id} e={e} profiles={ctx.data.profiles} onClick={() => onEvent(e)} big />
        ))}
      <div className="relative" style={{ height: (TO - FROM) * HOUR_PX }}>
        {Array.from({ length: TO - FROM + 1 }, (_, i) => (
          <div key={i} className="absolute left-0 right-0 flex items-start gap-2" style={{ top: i * HOUR_PX }}>
            <span className="w-20 text-right text-sm font-black text-[var(--muted)] tabular-nums -translate-y-2">{clock12(FROM + i, 0)}</span>
            <span className="flex-1 border-t border-[var(--line)]" />
          </div>
        ))}
        {evs
          .filter((e) => e.start)
          .map((e) => (
            <div key={e.id} className="absolute left-24 right-2" style={{ top: top(e.start!), height: Math.max(36, top(e.end ?? e.start!) - top(e.start!)) }}>
              <EventChip e={e} profiles={ctx.data.profiles} onClick={() => onEvent(e)} big />
            </div>
          ))}
      </div>
    </div>
  )
}

function Agenda({ ctx, from, onEvent }: { ctx: Ctx; from: string; onEvent: (e: CalEvent) => void }) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(from, i)).filter((d) => eventsOn(ctx.data.events, d).length)
  if (!days.length) return <Card className="p-8 text-center text-xl font-bold text-[var(--muted)]">Nothing in the next 30 days.</Card>
  return (
    <div className="flex flex-col gap-3">
      {days.map((d) => {
        const p = parseDate(d)
        return (
          <Card key={d} className="p-3 flex gap-4">
            <div className="w-24 text-center shrink-0">
              <div className="font-black text-[var(--muted)]">{WEEKDAYS[p.getDay()].slice(0, 3)}</div>
              <div className="text-3xl font-black tabular-nums">{p.getDate()}</div>
              <div className="text-sm font-bold text-[var(--muted)]">{MONTHS[p.getMonth()].slice(0, 3)}</div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {eventsOn(ctx.data.events, d).map((e) => (
                <EventChip key={e.id} e={e} profiles={ctx.data.profiles} onClick={() => onEvent(e)} big />
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function EventFacts({ e, profiles }: { e: CalEvent; profiles: Profile[] }) {
  const p = parseDate(e.date)
  const t = (s: string) => {
    const [h, m] = s.split(':').map(Number)
    return clock12(h, m)
  }
  return (
    <div className="flex flex-col gap-2 text-xl font-bold">
      <div>
        {WEEKDAYS[p.getDay()]}, {MONTHS[p.getMonth()]} {p.getDate()}, {p.getFullYear()}
      </div>
      <div className="tabular-nums">{e.start ? `${t(e.start)}${e.end ? ` to ${t(e.end)}` : ''}` : 'All day'}</div>
      {e.repeat !== 'none' && <div>Repeats {e.repeat}</div>}
      <div className="flex gap-2 flex-wrap">
        {e.people.map((id) => {
          const pr = profiles.find((x) => x.id === id)
          return pr ? (
            <span key={id} className="rounded-full px-3 py-1 text-white" style={{ background: pr.colour }}>
              {pr.name}
            </span>
          ) : null
        })}
      </div>
    </div>
  )
}

const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly', 'yearly']
const EVENT_EMOJI = ['📅', '🎂', '🏊', '⚽', '🩺', '🦷', '🏫', '🎉', '✈️', '🚗', '🛒', '🍽️', '👵', '🎨', '📚', '🎵']

function EventEditor({ event, profiles, isNew, onSave, onDelete, onClose }: { event: CalEvent; profiles: Profile[]; isNew: boolean; onSave: (e: CalEvent) => void; onDelete: () => void; onClose: () => void }) {
  const [e, setE] = useState(event)
  const set = (patch: Partial<CalEvent>) => setE((x) => ({ ...x, ...patch }))
  return (
    <Sheet title={isNew ? 'New event' : 'Edit event'} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <input
          value={e.title}
          onChange={(ev) => set({ title: ev.target.value })}
          placeholder="What is it?"
          className="rounded-2xl bg-[var(--card)] border border-[var(--line)] px-4 py-3 text-2xl font-bold"
        />
        <div className="flex flex-wrap gap-1">
          {EVENT_EMOJI.map((em) => (
            <button key={em} type="button" onClick={() => set({ emoji: e.emoji === em ? undefined : em })} className={`text-3xl rounded-xl p-1 ${e.emoji === em ? 'bg-[var(--soft)]' : ''}`}>
              {em}
            </button>
          ))}
        </div>
        <DatePick value={e.date} onChange={(date) => set({ date })} />
        <div className="flex flex-wrap items-center gap-3">
          <Button kind={e.start ? 'plain' : 'primary'} onClick={() => set({ start: undefined, end: undefined })}>
            All day
          </Button>
          <Button kind={e.start ? 'primary' : 'plain'} onClick={() => set({ start: e.start ?? '09:00', end: e.end ?? '10:00' })}>
            At a time
          </Button>
          {e.start && (
            <>
              <TimeField label="Starts" value={e.start} onChange={(start) => set({ start })} />
              <span className="font-bold">to</span>
              <TimeField label="Ends" value={e.end ?? ''} onChange={(end) => set({ end })} />
            </>
          )}
        </div>
        <div>
          <div className="font-black mb-2">Who</div>
          <PeoplePicker profiles={profiles} value={e.people} onChange={(people) => set({ people })} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black mr-2">Repeats</span>
          {REPEATS.map((r) => (
            <Button key={r} kind={e.repeat === r ? 'primary' : 'plain'} onClick={() => set({ repeat: r })} className="capitalize">
              {r === 'none' ? 'never' : r}
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button kind="primary" onClick={() => e.title.trim() && onSave({ ...e, title: e.title.trim() })} disabled={!e.title.trim()} className="text-xl px-6">
            Save
          </Button>
          {!isNew && (
            <Button kind="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}

/** Pick a date on a small month grid. */
export function DatePick({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const [month, setMonth] = useState(() => value.slice(0, 7) + '-01')
  const m = parseDate(month)
  const start = weekStart(month)
  const rows = Math.ceil((m.getDay() + daysInMonth(m.getFullYear(), m.getMonth())) / 7)
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-3 max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <Button kind="ghost" onClick={() => setMonth(iso(new Date(m.getFullYear(), m.getMonth() - 1, 1)))}>
          ‹
        </Button>
        <div className="flex-1 text-center font-black">
          {MONTHS[m.getMonth()]} {m.getFullYear()}
        </div>
        <Button kind="ghost" onClick={() => setMonth(iso(new Date(m.getFullYear(), m.getMonth() + 1, 1)))}>
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-xs font-black text-[var(--muted)]">
            {w[0]}
          </span>
        ))}
        {Array.from({ length: rows * 7 }, (_, i) => {
          const d = addDays(start, i)
          const inMonth = parseDate(d).getMonth() === m.getMonth()
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`rounded-lg py-1.5 font-bold tabular-nums ${d === value ? 'bg-[var(--accent)] text-[var(--on-accent)]' : ''} ${inMonth ? '' : 'opacity-30'}`}
            >
              {parseDate(d).getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
