import { useEffect, useState } from 'react'
import type { Ctx } from './ctx'
import {
  balance,
  canTick,
  clock12,
  isDone,
  minutesOf,
  nowNext,
  partOf,
  progress,
  routinesOn,
  target,
  tick,
  timesDone,
  type Moment,
  type Part,
  type Routine,
  type Task,
} from './model'
import { playEffect } from './sounds'
import { Card } from './ui'

const PARTS: Array<[Part, string, string]> = [
  ['morning', 'Morning', '☀️'],
  ['afternoon', 'Afternoon', '🌤️'],
  ['evening', 'Evening', '🌙'],
  ['anytime', 'Anytime', '⭐'],
]

/**
 * Today (spec 4–9, 11–12): Now / Next / Later in words, the routines for
 * this part of the day in a column per person, word-first task cards, and
 * the numbers — "3 of 5 done", 3/5, "12 + 1 = 13 ★".
 */
export function Today({ ctx, now, onTimer, onEditRoutines }: { ctx: Ctx; now: Date; onTimer: () => void; onEditRoutines: () => void }) {
  const { data, today } = ctx
  const mins = now.getHours() * 60 + now.getMinutes()
  const current = partOf(mins)
  // A tapped part holds until the clock moves into the next part of the day.
  const [chosen, setChosen] = useState<{ part: Part; during: Part } | null>(null)
  const part = chosen && chosen.during === current ? chosen.part : current
  const setPart = (p: Part) => setChosen({ part: p, during: current })
  const [toast, setToast] = useState<string | null>(null)

  const nn = nowNext(data, today, mins)
  // Chores (anytime) show under every part of the day, after its own routines.
  const shown = routinesOn(data.routines, today)
    .filter((r) => r.part === part || (part !== 'anytime' && r.part === 'anytime'))
    .sort((a, b) => Number(a.part === 'anytime') - Number(b.part === 'anytime'))
  const people = data.profiles.filter((p) => shown.some((r) => r.profile === p.id))

  const onTick = (r: Routine, t: Task) => {
    if (!canTick(data, today, r, t)) return
    const before = balance(data, r.profile)
    const { data: next, earned } = tick(data, today, r, t)
    ctx.update(() => next)
    const nowDone = isDone(next, today, t)
    playEffect(nowDone || timesDone(next, today, t) > 0 ? 'yes' : 'no', nowDone ? 1 : 0.6)
    if (earned > 0) setToast(`${before} + ${earned} = ${before + earned} ★`)
    else if (earned < 0) setToast(`${before} − ${-earned} = ${before + earned} ★`)
    const p = progress(next, today, r)
    if (p.done === p.total && nowDone) window.setTimeout(() => playEffect('cheer', 0.8), 250)
  }

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  return (
    <div className="flex flex-col gap-4 p-4 min-h-full">
      <div className="grid grid-cols-3 gap-3">
        <NowCard label="Now" m={nn.now} strong />
        <NowCard label="Next" m={nn.next} mins={mins} />
        <NowCard label="Later" m={nn.later} mins={mins} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PARTS.map(([p, label, emoji]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPart(p)}
            className={`rounded-full px-4 py-2 text-lg font-extrabold border-2 ${part === p ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--line)] bg-[var(--card)]'}`}
          >
            {emoji} {label}
            {p === current && <span className="ml-1 text-xs opacity-80">now</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={onTimer} className="rounded-full px-4 py-2 text-lg font-extrabold border-2 border-[var(--line)] bg-[var(--card)]">
          ⏱️ Timer
        </button>
        <button type="button" onClick={onEditRoutines} className="rounded-full px-4 py-2 text-lg font-extrabold border-2 border-[var(--line)] bg-[var(--card)]">
          {ctx.parent ? '✏️' : '🔒'} Routines
        </button>
      </div>

      {people.length === 0 ? (
        <Card className="p-8 text-center text-2xl font-bold text-[var(--muted)]">Nothing planned for this part of the day.</Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(people.length, 3)}, minmax(0, 1fr))` }}>
          {people.map((person) => (
            <div key={person.id} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center gap-2 text-2xl font-black" style={{ color: person.colour }}>
                {person.name}
                <span className="ml-auto text-xl tabular-nums">{balance(data, person.id)} ★</span>
              </div>
              {shown
                .filter((r) => r.profile === person.id)
                .map((r) => (
                  <RoutineCard key={r.id} ctx={ctx} r={r} colour={person.colour} onTick={onTick} />
                ))}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-30 rounded-3xl bg-amber-300 text-amber-950 px-8 py-4 text-4xl font-black tabular-nums shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function NowCard({ label, m, strong, mins }: { label: string; m?: Moment; strong?: boolean; mins?: number }) {
  const [h, mm] = m ? m.time.split(':').map(Number) : [0, 0]
  const away = m && mins !== undefined ? minutesOf(m.time) - mins : null
  return (
    <Card className={`p-4 ${strong ? 'border-4 border-[var(--accent)]' : ''}`}>
      <div className="text-sm font-black uppercase tracking-wider text-[var(--muted)]">{label}</div>
      {m ? (
        <>
          <div className="text-2xl font-black truncate">
            {m.emoji} {m.title}
          </div>
          <div className="text-lg font-bold text-[var(--muted)] tabular-nums">
            {clock12(h, mm)}
            {away !== null && away > 0 && away < 180 && <span> · in {away} minutes</span>}
          </div>
        </>
      ) : (
        <div className="text-xl font-bold text-[var(--muted)]">—</div>
      )}
    </Card>
  )
}

function RoutineCard({ ctx, r, colour, onTick }: { ctx: Ctx; r: Routine; colour: string; onTick: (r: Routine, t: Task) => void }) {
  const { data, today } = ctx
  const p = progress(data, today, r)
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-3xl">{r.emoji}</span>
        <span className="text-2xl font-black flex-1 truncate">{r.title}</span>
        <span className="text-lg font-black tabular-nums">
          {p.done} of {p.total} done
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 rounded-full bg-[var(--line)] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${p.total ? (100 * p.done) / p.total : 0}%`, background: colour }} />
        </div>
        <Fraction top={p.done} bottom={p.total} />
      </div>
      <div className="flex flex-col gap-2">
        {r.tasks.map((t) => {
          const done = isDone(data, today, t)
          const n = timesDone(data, today, t)
          const blocked = !canTick(data, today, r, t)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTick(r, t)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition ${blocked ? 'opacity-40' : 'active:scale-[0.98]'}`}
              style={{ borderColor: done ? colour : 'var(--line)', background: done ? `${colour}22` : 'var(--card)' }}
            >
              {t.photo ? (
                <img src={t.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <span className="text-4xl w-14 text-center">{t.emoji}</span>
              )}
              <span className={`flex-1 text-2xl font-extrabold ${done ? 'line-through opacity-60' : ''}`}>{t.label}</span>
              {t.count ? (
                <span className="text-xl font-black tabular-nums whitespace-nowrap">
                  {Math.min(n, target(t))} of {target(t)}
                </span>
              ) : null}
              <span
                className="w-11 h-11 rounded-full border-4 flex items-center justify-center text-2xl font-black text-white shrink-0"
                style={{ borderColor: colour, background: done ? colour : 'transparent' }}
              >
                {done ? '✓' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** A stacked fraction, e.g. 3 over 5. */
export function Fraction({ top, bottom }: { top: number; bottom: number }) {
  return (
    <span className="inline-flex flex-col items-center leading-none font-black tabular-nums text-xl" aria-label={`${top} out of ${bottom}`}>
      <span>{top}</span>
      <span className="w-full h-0.5 bg-current my-0.5" />
      <span>{bottom}</span>
    </span>
  )
}
