import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  LEVEL_BANDS,
  SUBJECTS,
  VqPopup,
  computeFrontier,
  pickNextVq,
  readVqCadence,
  speakEquation,
  speakNumber,
  type FrontierSnapshot,
  type GameProps,
  type ProgressEvent,
  type ValidationQuizlet,
} from '@renderblocks/kernel'
import { CONCEPTS, type Concept } from './concepts'
import { BEFORE, milestones, next, perDay, summarise, type FactsSummary, type Milestone, type Status, type Summary } from './mastery'
import { seedEvents } from './seed'

/**
 * Progress (Lan, Oct 17): his progress toward the core concepts, added up
 * from every app's answers, as real graphs: a bar for each concept, a bar
 * chart of the days, each concept's facts as a grid, and the shared Learning
 * Frontier + Validation Quizlets (Quick Checks).
 */
export default function App({ services }: GameProps) {
  const [rawEvents, setRawEvents] = useState<ProgressEvent[] | null>(null)
  const [open, setOpen] = useState<Concept | null>(null)
  const [activeVq, setActiveVq] = useState<ValidationQuizlet | null>(null)
  const [recentVqIds, setRecentVqIds] = useState<string[]>(() => readVqCadence().recentQuestionIds)

  const reloadEvents = useCallback(() => {
    return services.progress.all().then((logged) => {
      setRawEvents(logged)
      return logged
    })
  }, [services])

  useEffect(() => {
    let live = true
    void services.progress.all().then((logged) => live && setRawEvents(logged))
    return () => {
      live = false
    }
  }, [services])

  const events = useMemo(() => (rawEvents ? [...seedEvents(), ...rawEvents] : null), [rawEvents])
  const frontier = useMemo(() => (rawEvents ? computeFrontier(rawEvents) : null), [rawEvents])

  useEffect(
    () =>
      services.onBack(() => {
        if (activeVq) {
          setActiveVq(null)
          return true
        }
        if (open) {
          setOpen(null)
          return true
        }
        return false
      }),
    [services, open, activeVq],
  )

  const launchQuickCheck = useCallback(
    (sourceFrontier?: FrontierSnapshot | null, extraRecent?: string[]) => {
      const f = sourceFrontier ?? frontier
      if (!f) return
      const q = pickNextVq(f, {
        recentQuestionIds: extraRecent ?? recentVqIds,
        seed: Math.floor(Date.now() % 1_000_000),
      })
      if (q) setActiveVq(q)
    },
    [frontier, recentVqIds],
  )

  const summaries = useMemo(() => (events ? CONCEPTS.map((c) => summarise(c, events)) : []), [events])
  const reached = useMemo(() => (events ? milestones(events) : []), [events])

  return (
    <div className="h-dvh w-full overflow-y-auto bg-slate-900 text-white p-3 select-none">
      <div className="flex items-center gap-3 mb-3">
        <button type="button" onClick={() => (open ? setOpen(null) : services.exitToHome())} className="w-12 h-12 rounded-full bg-white/10 text-2xl font-bold shrink-0" aria-label="Back">
          ←
        </button>
        <h1 className="text-3xl font-black flex-1">{open ? open.title : 'Progress'}</h1>
        {open ? (
          <span className="text-slate-400 font-bold tabular-nums">{open.codes.join(' · ')}</span>
        ) : (
          <button
            type="button"
            onClick={() => launchQuickCheck()}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 px-4 py-2 text-sm font-black text-slate-950 shadow shrink-0 transition"
          >
            ⚡ Quick Check
          </button>
        )}
      </div>
      {!events || !frontier ? null : open ? (
        <Detail summary={summaries[CONCEPTS.indexOf(open)]} reached={reached.filter((m) => m.concept === open)} />
      ) : (
        <Overview
          summaries={summaries}
          events={events}
          reached={reached}
          frontier={frontier}
          onOpen={setOpen}
          onQuickCheck={() => launchQuickCheck()}
        />
      )}
      {activeVq && (
        <VqPopup
          quizlet={activeVq}
          allowNext
          onAnswered={({ quizlet }) => {
            setRecentVqIds((prev) => [quizlet.id, ...prev.filter((x) => x !== quizlet.id)].slice(0, 30))
            void reloadEvents()
          }}
          onNext={() => {
            const nextRecent = [activeVq.id, ...recentVqIds.filter((x) => x !== activeVq.id)].slice(0, 30)
            setRecentVqIds(nextRecent)
            void reloadEvents().then((fresh) => {
              launchQuickCheck(computeFrontier(fresh), nextRecent)
            })
          }}
          onClose={() => {
            setActiveVq(null)
            void reloadEvents()
          }}
        />
      )}
    </div>
  )
}

const KEY: { s: Status; label: string }[] = [
  { s: 'secure', label: 'secure' },
  { s: 'getting', label: 'getting it' },
  { s: 'tried', label: 'tried' },
]

/** How a status looks in a concept's colour. */
function swatch(s: Status, colour: string): React.CSSProperties {
  if (s === 'secure') return { background: colour }
  if (s === 'getting') return { background: colour + '66' }
  if (s === 'tried') return { background: '#1e293b', boxShadow: `inset 0 0 0 2px ${colour}99` }
  return { background: '#1e293b' }
}

function Key({ colour = '#94a3b8' }: { colour?: string }) {
  return (
    <div className="flex gap-4 text-sm font-bold text-slate-300">
      {KEY.map(({ s, label }) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded" style={swatch(s, colour)} />
          {label}
        </span>
      ))}
    </div>
  )
}

function Overview({
  summaries,
  events,
  reached,
  frontier,
  onOpen,
  onQuickCheck,
}: {
  summaries: Summary[]
  events: ProgressEvent[]
  reached: Milestone[]
  frontier: FrontierSnapshot
  onOpen: (c: Concept) => void
  onQuickCheck: () => void
}) {
  const [now] = useState(() => Date.now())
  const days = useMemo(() => perDay(events, now), [events, now])
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <FrontierSummarySection frontier={frontier} onQuickCheck={onQuickCheck} />
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h2 className="text-lg font-bold text-slate-400">Concepts</h2>
          <Key />
        </div>
        <div className="flex flex-col gap-2">
          {summaries.map((s) => (
            <ConceptRow key={s.concept.id} s={s} onOpen={() => onOpen(s.concept)} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold text-slate-400 mb-2">Answers each day</h2>
        <Bars
          bars={days.map((d) => ({
            label: String(d.date.getDate()),
            sub: d.date.getDate() === 1 || d === days[0] ? d.date.toLocaleString('en', { month: 'short' }) : undefined,
            parts: d.byConcept.map((n, i) => ({ n, colour: CONCEPTS[i].colour })).filter((p) => p.n),
          }))}
          height={180}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm font-bold text-slate-300">
          {CONCEPTS.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: c.colour }} />
              {c.title}
            </span>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold text-slate-400 mb-2">Milestones</h2>
        <Milestones list={reached} />
      </section>
    </div>
  )
}

function ConceptRow({ s, onOpen }: { s: Summary; onOpen: () => void }) {
  const c = s.concept
  const n = next(s)
  return (
    <button type="button" onClick={onOpen} className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-3 text-left active:bg-slate-700">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-black">{c.title}</span>
        <span className="text-xl font-black tabular-nums">
          {'items' in s ? (
            <>
              {s.counts.secure}
              <span className="text-slate-400"> / {s.total}</span>
            </>
          ) : (
            <>
              {s.count} <span className="text-base text-slate-400">{c.kind === 'count' ? c.unit : ''}</span>
            </>
          )}
        </span>
      </div>
      {'items' in s ? (
        <div className="flex h-5 rounded-md overflow-hidden bg-slate-900 mt-2">
          {KEY.map(({ s: k }) => (
            <div key={k} style={{ ...swatch(k, c.colour), width: `${(100 * s.counts[k]) / s.total}%` }} />
          ))}
        </div>
      ) : (
        s.groups.length > 0 && (
          <div className="flex gap-3 mt-2 text-sm font-bold text-slate-300 tabular-nums">
            {s.groups.map((g, i) => (
              <span key={i}>
                {c.kind === 'count' && c.group?.labels[i]}: {g}
              </span>
            ))}
          </div>
        )
      )}
      <div className="flex justify-between text-sm font-bold text-slate-400 mt-1.5">
        <span>{c.apps.join(', ')}</span>
        {n && (
          <span>
            next: {n.text} · <span className="text-white tabular-nums">{n.more}</span> more
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * A bar chart: a y axis with round numbers, a bar per entry (stacked parts),
 * labels underneath. Tapping a bar says its total.
 */
function Bars({ bars, height, max: fixedMax }: { bars: { label: string; sub?: string; parts: { n: number; colour: string }[] }[]; height: number; max?: number }) {
  const [picked, setPicked] = useState<number | null>(null)
  const totals = bars.map((b) => b.parts.reduce((s, p) => s + p.n, 0))
  // A fixed top gets a step that divides it (12: 0, 3, 6, 9, 12).
  const step = fixedMax ? ([1, 2, 3, 4, 5, 6, 10].find((k) => fixedMax % k === 0 && fixedMax / k <= 4) ?? fixedMax) : niceStep(Math.max(1, ...totals))
  const max = fixedMax ?? Math.max(step, Math.ceil(Math.max(1, ...totals) / step) * step)
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  return (
    <div className="flex gap-2">
      <div className="relative w-9 shrink-0 text-right text-xs font-bold text-slate-400 tabular-nums" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: height - (t / max) * height }}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative flex items-end gap-1 border-l-2 border-b-2 border-slate-500" style={{ height }}>
          {ticks.slice(1).map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-slate-700/70" style={{ top: height - (t / max) * height }} />
          ))}
          {bars.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${b.label}: ${totals[i]}`}
              onClick={() => {
                setPicked(i)
                speakNumber(totals[i])
              }}
              className="relative flex-1 h-full flex flex-col-reverse items-stretch"
            >
              {b.parts.map((p, j) => (
                <div key={j} style={{ height: (p.n / max) * height, background: p.colour }} className={j === b.parts.length - 1 ? 'rounded-t-sm' : ''} />
              ))}
              {picked === i && (
                <span className="absolute left-1/2 -translate-x-1/2 text-lg font-black tabular-nums" style={{ bottom: (totals[i] / max) * height + 2 }}>
                  {totals[i]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 text-center text-xs font-bold text-slate-300 tabular-nums leading-tight">
              {b.label}
              {b.sub && <div className="text-slate-500">{b.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A round step for the y axis: 1, 2, 5, 10, 20, 50… with about 4 lines. */
function niceStep(max: number) {
  const rough = max / 4
  const p = 10 ** Math.floor(Math.log10(Math.max(1, rough)))
  for (const k of [1, 2, 5, 10]) if (k * p >= rough) return k * p
  return 10 * p
}

function when(t: number) {
  if (t === BEFORE) return 'before'
  return new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function Milestones({ list }: { list: Milestone[] }) {
  if (!list.length) return <p className="text-slate-400 font-bold">None yet.</p>
  return (
    <ol className="flex flex-col gap-1">
      {list
        .slice(-12)
        .reverse()
        .map((m, i) => (
          <li key={i} className="flex items-baseline gap-3 rounded-xl bg-slate-800 px-3 py-2">
            <span className="w-3 h-3 rounded-full shrink-0 self-center" style={{ background: m.concept.colour }} />
            <span className="font-bold flex-1">{m.text}</span>
            <span className="text-sm font-bold text-slate-400 tabular-nums shrink-0">{when(m.t)}</span>
          </li>
        ))}
    </ol>
  )
}

function bandLabel(order: number): string {
  const idx = Math.max(0, Math.min(LEVEL_BANDS.length - 1, Math.round(order)))
  return LEVEL_BANDS[idx]?.shortLabel ?? 'PreK'
}

function FrontierSummarySection({
  frontier,
  onQuickCheck,
}: {
  frontier: FrontierSnapshot
  onQuickCheck: () => void
}) {
  return (
    <section className="rounded-2xl bg-slate-800/90 border-2 border-slate-700 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>⚡ Learning Frontier</span>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300 tabular-nums">
              {frontier.masteredIds.size} mastered · {frontier.frontierIds.size} active
            </span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Shared with Proximal &amp; Quick Checks ({frontier.totalVqAttempts} checks done
            {frontier.totalVqAttempts > 0 ? `, ${frontier.totalVqRight} right` : ''}
            {frontier.noiseFilteredCount > 0 ? ` · ${frontier.noiseFilteredCount} rapid taps filtered` : ''})
          </p>
        </div>
        <button
          type="button"
          onClick={onQuickCheck}
          className="rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 px-3 py-1.5 text-xs font-extrabold text-emerald-200"
        >
          Run Quick Check →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SUBJECTS.map((subj) => {
          const nodes = frontier.nodes.filter((n) => n.subject === subj.id)
          const mastered = nodes.filter((n) => n.zone === 'mastered').length
          const onFrontier = nodes.filter((n) => n.zone === 'frontier')
          const avgConf = nodes.length ? Math.round((nodes.reduce((s, n) => s + n.confidence, 0) / nodes.length) * 100) : 0
          const lead = onFrontier.find((n) => n.active) ?? onFrontier[0]
          return (
            <div key={subj.id} className="rounded-xl bg-slate-900/90 border border-slate-700/80 p-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-sm font-black" style={{ color: subj.color }}>
                  {subj.shortLabel}
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-slate-200 tabular-nums">
                  {bandLabel(frontier.subjectBand[subj.id])} · {mastered}/{nodes.length}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(8, Math.round(((mastered + onFrontier.length * 0.35) / Math.max(1, nodes.length)) * 100))}%`,
                    backgroundColor: subj.color,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                <span className="truncate">{lead ? `Next: ${lead.label}` : 'All mastered!'}</span>
                <span className="shrink-0 tabular-nums">{avgConf}% conf</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Detail({ summary, reached }: { summary: Summary; reached: Milestone[] }) {
  const c = summary.concept
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {'items' in summary ? (
        <>
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h2 className="text-lg font-bold text-slate-400">
                <span className="text-white text-2xl font-black tabular-nums">{summary.counts.secure}</span> of {summary.total} facts secure
              </h2>
              <Key colour={c.colour} />
            </div>
            <FactGrid s={summary} />
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-400 mb-2">Secure in each row</h2>
            <Bars
              bars={summary.concept.grid.rows.map((r, i) => ({ label: summary.concept.grid.rowLabel(r).replace(/\s/g, ''), parts: [{ n: summary.rows[i], colour: c.colour }] }))}
              height={160}
              max={summary.concept.grid.cols}
            />
          </section>
        </>
      ) : (
        <section>
          <h2 className="text-lg font-bold text-slate-400 mb-2">
            <span className="text-white text-2xl font-black tabular-nums">{summary.count}</span> {c.kind === 'count' ? c.unit : ''}
          </h2>
          {c.kind === 'count' && c.group && (
            <Bars bars={c.group.labels.map((label, i) => ({ label, parts: [{ n: summary.groups[i], colour: c.colour }] }))} height={160} />
          )}
        </section>
      )}
      <section>
        <h2 className="text-lg font-bold text-slate-400 mb-2">Milestones</h2>
        <Milestones list={reached} />
      </section>
    </div>
  )
}

/** Every fact as a cell showing its answer, coloured by how well he knows it. Tap: it's said. */
function FactGrid({ s }: { s: FactsSummary }) {
  const { grid, colour } = s.concept
  // A heading row when every row has the same columns (the times table's 1–12).
  const heads = Array.from({ length: grid.cols }, (_, i) => grid.colLabel(grid.rows[0], i))
  const sameCols = heads.every((h, i) => h === grid.colLabel(grid.rows[1], i))
  return (
    <div className="grid gap-0.5 tabular-nums" style={{ gridTemplateColumns: `auto repeat(${grid.cols}, minmax(0, 1fr))` }}>
      {sameCols && (
        <>
          <div />
          {heads.map((h, i) => (
            <div key={i} className="text-center text-sm sm:text-base font-black text-slate-300">
              {h}
            </div>
          ))}
        </>
      )}
      {grid.rows.map((r) => (
        <Fragment key={r}>
          <div className="pr-2 text-right text-sm sm:text-base font-black text-slate-300 self-center whitespace-nowrap">{grid.rowLabel(r)}</div>
          {Array.from({ length: grid.cols }, (_, i) => {
            const st = s.items.get(grid.item(r, i)) ?? 'new'
            const [a, op, b, answer] = grid.say(r, i)
            return (
              <button
                key={i}
                type="button"
                aria-label={`${a} ${op} ${b} = ${answer}, ${st}`}
                onClick={() => speakEquation(a, op, b, answer)}
                className={`aspect-square rounded-[4px] text-[10px] sm:text-sm font-black flex items-center justify-center ${st === 'new' ? 'text-slate-600' : 'text-white'}`}
                style={swatch(st, colour)}
              >
                {answer}
              </button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
