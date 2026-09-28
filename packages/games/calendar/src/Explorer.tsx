import { useState } from 'react'
import { AnalogClock, HOUR, MINUTE, SECOND } from './Clock'
import type { Ctx } from './ctx'
import {
  addDays,
  clock12,
  dayOfYear,
  daysBetween,
  daysInMonth,
  eventsOn,
  isLeap,
  isoWeek,
  iso,
  MONTHS,
  numberWords,
  ordinal,
  ordinalWords,
  parseDate,
  PART_START,
  routinesOn,
  timeWords,
  WEEKDAYS,
} from './model'
import { Button, Card } from './ui'

/** Date-part colours, the same in every notation so the pattern shows. */
const DAY = '#ea580c'
const MONTH = '#7c3aed'
const YEAR = '#0891b2'

/**
 * The Time & Date explorer (spec: explorer): clocks to read and set, the
 * day as a ruler, today's date in every notation, and the calendar as
 * something to count on. Opened from the date and clock in the top bar.
 */
export function Explorer({ ctx, now, onClose }: { ctx: Ctx; now: Date; onClose: () => void }) {
  const [tab, setTab] = useState<'clocks' | 'date'>('clocks')
  return (
    <div className="fixed inset-0 z-30 bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)]">
        <h2 className="text-2xl font-black mr-3">Time & Date</h2>
        {(['clocks', 'date'] as const).map((t) => (
          <Button key={t} kind={tab === t ? 'primary' : 'plain'} onClick={() => setTab(t)} className="text-xl capitalize">
            {t === 'clocks' ? '🕒 Clocks' : '📅 Date'}
          </Button>
        ))}
        <div className="flex-1" />
        <Button kind="ghost" onClick={onClose} className="text-3xl" label="Close">
          ✕
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{tab === 'clocks' ? <Clocks ctx={ctx} now={now} /> : <DateTab now={now} />}</div>
    </div>
  )
}

function Clocks({ ctx, now }: { ctx: Ctx; now: Date }) {
  const [set, setSet] = useState<{ h: number; m: number } | null>(null)
  const [twentyFour, setTwentyFour] = useState(false)
  const h = set ? set.h : now.getHours()
  const m = set ? set.m : now.getMinutes()
  const s = set ? undefined : now.getSeconds()
  const nudge = (dh: number, dm: number) => {
    const total = (((h * 60 + m + dh * 60 + dm) % 1440) + 1440) % 1440
    setSet({ h: Math.floor(total / 60), m: total % 60 })
  }
  const hh = twentyFour ? String(h).padStart(2, '0') : String(h % 12 || 12)

  return (
    <div className="flex flex-col gap-5 items-center">
      <div className="flex flex-wrap items-center justify-center gap-10">
        <AnalogClock h={h} m={m} s={s} size={340} onSet={(nh, nm) => setSet({ h: nh, m: nm })} />
        <div className="flex flex-col items-center gap-3">
          <div className="text-8xl font-black tabular-nums tracking-tight">
            <span style={{ color: HOUR }}>{hh}</span>
            <span>:</span>
            <span style={{ color: MINUTE }}>{String(m).padStart(2, '0')}</span>
            {s !== undefined && (
              <span className="text-5xl" style={{ color: SECOND }}>
                :{String(s).padStart(2, '0')}
              </span>
            )}
            {!twentyFour && <span className="text-4xl ml-2 text-[var(--muted)]">{h < 12 ? 'AM' : 'PM'}</span>}
          </div>
          <div className="text-3xl font-black">{timeWords(h, m)}</div>
          <div className="text-xl font-bold text-[var(--muted)]">
            {numberWords(m)} {m === 1 ? 'minute' : 'minutes'} past {numberWords(h % 12 || 12)}
          </div>
          <div className="text-2xl font-black tabular-nums">
            {clock12(h, m)} = {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button kind={twentyFour ? 'plain' : 'primary'} onClick={() => setTwentyFour(false)}>
              12-hour
            </Button>
            <Button kind={twentyFour ? 'primary' : 'plain'} onClick={() => setTwentyFour(true)}>
              24-hour
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center justify-center gap-2">
        <span className="font-black text-xl mr-2">{set ? 'Setting the time' : 'Drag the hands, or:'}</span>
        <Button onClick={() => nudge(-1, 0)} className="text-xl" label="Hour back">
          <span style={{ color: HOUR }}>− hour</span>
        </Button>
        <Button onClick={() => nudge(1, 0)} className="text-xl" label="Hour on">
          <span style={{ color: HOUR }}>+ hour</span>
        </Button>
        <Button onClick={() => nudge(0, -5)} className="text-xl" label="Five minutes back">
          <span style={{ color: MINUTE }}>− 5 min</span>
        </Button>
        <Button onClick={() => nudge(0, 5)} className="text-xl" label="Five minutes on">
          <span style={{ color: MINUTE }}>+ 5 min</span>
        </Button>
        <Button onClick={() => nudge(0, -1)} className="text-xl" label="A minute back">
          <span style={{ color: MINUTE }}>− 1 min</span>
        </Button>
        <Button onClick={() => nudge(0, 1)} className="text-xl" label="A minute on">
          <span style={{ color: MINUTE }}>+ 1 min</span>
        </Button>
        {set && (
          <Button kind="primary" onClick={() => setSet(null)} className="text-xl">
            Back to now
          </Button>
        )}
      </Card>

      <DayRuler ctx={ctx} now={now} />
    </div>
  )
}

/** The day as a 24-hour ruler, with now and today's routines and events on it. */
function DayRuler({ ctx, now }: { ctx: Ctx; now: Date }) {
  const mins = now.getHours() * 60 + now.getMinutes()
  const items = [
    ...routinesOn(ctx.data.routines, ctx.today)
      .filter((r) => r.part !== 'anytime')
      .map((r) => ({ t: r.time ?? PART_START[r.part], label: r.title, emoji: r.emoji })),
    ...eventsOn(ctx.data.events, ctx.today)
      .filter((e) => e.start)
      .map((e) => ({ t: e.start!, label: e.title, emoji: e.emoji ?? '📅' })),
  ].sort((a, b) => a.t.localeCompare(b.t))
  const pct = (t: number) => `${(t / 1440) * 100}%`
  const next = items.find((i) => toMins(i.t) > mins)
  return (
    <Card className="p-5 w-full max-w-5xl">
      <div className="text-xl font-black mb-8">Today, hour by hour</div>
      <div className="relative h-24 mx-4">
        {/* Night and day. */}
        <div className="absolute inset-x-0 top-6 h-8 rounded-full overflow-hidden flex">
          <div className="h-full bg-indigo-900" style={{ width: pct(6 * 60) }} />
          <div className="h-full bg-sky-300" style={{ width: pct(12 * 60) }} />
          <div className="h-full bg-indigo-900 flex-1" />
        </div>
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="absolute top-14 -translate-x-1/2 flex flex-col items-center" style={{ left: pct(i * 60) }}>
            <span className={`w-0.5 ${i % 3 === 0 ? 'h-3 bg-[var(--ink)]' : 'h-2 bg-[var(--muted)]'}`} />
            {i % 3 === 0 && <span className="text-xs font-black tabular-nums whitespace-nowrap">{i === 24 ? '12 AM' : clock12(i, 0).replace(':00', '')}</span>}
          </div>
        ))}
        {items.map((i, k) => (
          <div key={k} className="absolute -top-6 -translate-x-1/2 text-2xl" style={{ left: pct(toMins(i.t)) }} title={i.label}>
            {i.emoji}
          </div>
        ))}
        <div className="absolute top-3 bottom-8 w-1 bg-rose-600 rounded-full -translate-x-1/2" style={{ left: pct(mins) }} />
        <div className="absolute -bottom-2 -translate-x-1/2 text-sm font-black text-rose-600" style={{ left: pct(mins) }}>
          now
        </div>
      </div>
      {next && (
        <div className="mt-6 text-xl font-bold tabular-nums">
          Next: {next.emoji} {next.label} at {clock12(...(next.t.split(':').map(Number) as [number, number]))}, in {toMins(next.t) - mins} minutes (
          {clock12(...(next.t.split(':').map(Number) as [number, number]))} − {clock12(now.getHours(), now.getMinutes())})
        </div>
      )}
    </Card>
  )
}

const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function DateTab({ now }: { now: Date }) {
  const today = iso(now)
  const d = now.getDate()
  const mo = now.getMonth()
  const y = now.getFullYear()
  const rows: Array<[string, React.ReactNode]> = [
    [
      'In words',
      <>
        {WEEKDAYS[now.getDay()]}, <M>{MONTHS[mo]}</M> <D>{d}</D>, <Y>{y}</Y>
      </>,
    ],
    [
      'Month / day / year (US)',
      <>
        <M>{mo + 1}</M>/<D>{d}</D>/<Y>{y}</Y>
      </>,
    ],
    [
      'Day / month / year (most countries)',
      <>
        <D>{d}</D>/<M>{mo + 1}</M>/<Y>{y}</Y>
      </>,
    ],
    [
      'Year-month-day (international)',
      <>
        <Y>{y}</Y>-<M>{String(mo + 1).padStart(2, '0')}</M>-<D>{String(d).padStart(2, '0')}</D>
      </>,
    ],
    [
      'Short',
      <>
        <M>{MONTHS[mo].slice(0, 3)}</M> <D>{d}</D>
      </>,
    ],
    [
      'The day, as an order',
      <>
        the <D>{ordinal(d)}</D> · the <D>{ordinalWords(d)}</D>
      </>,
    ],
    [
      'In the year',
      <>
        day {dayOfYear(today)} of {isLeap(y) ? 366 : 365} · week {isoWeek(today)}
      </>,
    ],
  ]
  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      <Card className="p-5 flex flex-col gap-3">
        <div className="flex gap-4 font-black text-lg">
          <span style={{ color: DAY }}>■ day</span>
          <span style={{ color: MONTH }}>■ month</span>
          <span style={{ color: YEAR }}>■ year</span>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline gap-x-4">
            <span className="w-72 font-bold text-[var(--muted)]">{label}</span>
            <span className="text-3xl font-black tabular-nums">{value}</span>
          </div>
        ))}
      </Card>
      <WeekCycle now={now} />
      <CountingMonth today={today} />
      <Year y={y} month={mo} />
      <Card className="p-4 text-xl font-bold">
        {isLeap(y) ? `${y} is a leap year: February has 29 days.` : `${y} is not a leap year: February has 28 days.`} The next leap year is {nextLeap(y + 1)}: February has 29 days, and the year
        has 366.
      </Card>
    </div>
  )
}

const D = ({ children }: { children: React.ReactNode }) => <span style={{ color: DAY }}>{children}</span>
const M = ({ children }: { children: React.ReactNode }) => <span style={{ color: MONTH }}>{children}</span>
const Y = ({ children }: { children: React.ReactNode }) => <span style={{ color: YEAR }}>{children}</span>

const nextLeap = (y: number): number => (isLeap(y) ? y : nextLeap(y + 1))

/** The days of the week go round and round: yesterday, today, tomorrow. */
function WeekCycle({ now }: { now: Date }) {
  const t = now.getDay()
  return (
    <Card className="p-4">
      <div className="text-xl font-black mb-3">The week goes round</div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((w, i) => {
          const tag = i === t ? 'today' : i === (t + 6) % 7 ? 'yesterday' : i === (t + 1) % 7 ? 'tomorrow' : ''
          return (
            <div key={w} className={`rounded-2xl p-2 text-center ${i === t ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--bg)]'}`}>
              <div className="font-black">{w}</div>
              <div className="text-sm font-bold opacity-80">{tag || ' '}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 font-bold text-[var(--muted)]">After Saturday comes Sunday again. 7 days make a week.</div>
    </Card>
  )
}

/** Tap two days to count how far apart they are. */
function CountingMonth({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7) + '-01')
  const [picked, setPicked] = useState<string[]>([])
  const m = parseDate(month)
  const start = addDays(month, -m.getDay())
  const rows = Math.ceil((m.getDay() + daysInMonth(m.getFullYear(), m.getMonth())) / 7)
  const [a, b] = [...picked].sort()
  const gap = a && b ? daysBetween(a, b) : null
  const tag = (d: string) => (d === today ? 'today' : d === addDays(today, -1) ? 'yesterday' : d === addDays(today, 1) ? 'tomorrow' : '')
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xl font-black flex-1">
          {MONTHS[m.getMonth()]} {m.getFullYear()} · {daysInMonth(m.getFullYear(), m.getMonth())} days
        </div>
        <Button onClick={() => setMonth(iso(new Date(m.getFullYear(), m.getMonth() - 1, 1)))}>‹</Button>
        <Button onClick={() => setMonth(iso(new Date(m.getFullYear(), m.getMonth() + 1, 1)))}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="font-black text-[var(--muted)] text-sm">
            {w.slice(0, 3)}
          </span>
        ))}
        {Array.from({ length: rows * 7 }, (_, i) => {
          const d = addDays(start, i)
          const inMonth = parseDate(d).getMonth() === m.getMonth()
          const on = picked.includes(d)
          const between = a && b && d > a && d < b
          return (
            <button
              key={d}
              type="button"
              onClick={() => setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : p.length >= 2 ? [d] : [...p, d]))}
              className={`rounded-xl py-2 flex flex-col items-center ${on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : between ? 'bg-[var(--soft)]' : 'bg-[var(--bg)]'} ${inMonth ? '' : 'opacity-30'} ${d === today && !on ? 'ring-4 ring-[var(--accent)]' : ''}`}
            >
              <span className="text-xl font-black tabular-nums">{parseDate(d).getDate()}</span>
              <span className="text-[0.6rem] font-bold h-3">{tag(d)}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-2xl font-black tabular-nums min-h-8">
        {gap === null
          ? 'Tap two days to count the days between them.'
          : `${MONTHS[parseDate(a).getMonth()].slice(0, 3)} ${parseDate(a).getDate()} to ${MONTHS[parseDate(b).getMonth()].slice(0, 3)} ${parseDate(b).getDate()}: ${gap} ${gap === 1 ? 'day' : 'days'} apart`}
      </div>
    </Card>
  )
}

const SEASON = (month: number) =>
  month <= 1 || month === 11
    ? { name: 'winter', colour: '#93c5fd' }
    : month <= 4
      ? { name: 'spring', colour: '#86efac' }
      : month <= 7
        ? { name: 'summer', colour: '#fde047' }
        : { name: 'fall', colour: '#fdba74' }

/** The 12 months: their numbers, their days, their seasons. */
function Year({ y, month }: { y: number; month: number }) {
  return (
    <Card className="p-4">
      <div className="text-xl font-black mb-3">
        The year {y}: 12 months, {isLeap(y) ? 366 : 365} days
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {MONTHS.map((name, i) => {
          const s = SEASON(i)
          return (
            <div key={name} className={`rounded-2xl p-2 border-4 ${i === month ? 'border-[var(--ink)]' : 'border-transparent'}`} style={{ background: s.colour, color: '#0f172a' }}>
              <div className="text-sm font-black opacity-70">month {i + 1}</div>
              <div className="text-xl font-black">{name}</div>
              <div className="font-bold tabular-nums">{daysInMonth(y, i)} days</div>
              <div className="text-sm font-bold opacity-70">{s.name}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
