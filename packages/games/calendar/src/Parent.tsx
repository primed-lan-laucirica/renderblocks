import { useState } from 'react'
import type { Ctx } from './ctx'
import { ROUTINE_EMOJI, TASK_EMOJI } from './emoji'
import { openFile, saveFile, takePhoto } from './files'
import { exportData, importData, newId, PROFILE_COLOURS, WEEKDAYS, type CalData, type Part, type Routine, type Task } from './model'
import { Button, Card, PeoplePicker, Sheet, TimeField } from './ui'

/** Parent settings (spec 14–16, export and import). */
export function Settings({ ctx, onClose, onLock }: { ctx: Ctx; onClose: () => void; onLock: () => void }) {
  const { data } = ctx
  const s = data.settings
  const setS = (patch: Partial<CalData['settings']>) => ctx.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  const [pending, setPending] = useState<CalData | null>(null)
  const [note, setNote] = useState<string | null>(null)

  return (
    <Sheet title="Parent settings" onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <Section title="People">
          {data.profiles.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <input
                value={p.name}
                onChange={(e) => ctx.update((d) => ({ ...d, profiles: d.profiles.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))}
                className="rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-2 text-xl font-bold w-44"
                style={{ color: p.colour }}
                aria-label="Name"
              />
              {PROFILE_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => ctx.update((d) => ({ ...d, profiles: d.profiles.map((x) => (x.id === p.id ? { ...x, colour: c } : x)) }))}
                  className={`w-9 h-9 rounded-full border-4 ${p.colour === c ? 'border-[var(--ink)]' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              {data.profiles.length > 1 && (
                <Button kind="ghost" onClick={() => ctx.update((d) => ({ ...d, profiles: d.profiles.filter((x) => x.id !== p.id) }))}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            className="self-start"
            onClick={() =>
              ctx.update((d) => ({ ...d, profiles: [...d.profiles, { id: newId(), name: 'New person', colour: PROFILE_COLOURS[d.profiles.length % PROFILE_COLOURS.length] }] }))
            }
          >
            + Person
          </Button>
        </Section>

        <Section title="Text size">
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <Button key={n} kind={s.scale === n ? 'primary' : 'plain'} onClick={() => setS({ scale: n })} className="w-16 h-16" label={`Text size ${n + 1}`}>
                <span style={{ fontSize: 12 + n * 4 }}>Aa</span>
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Theme">
          <div className="flex gap-2">
            {(['auto', 'light', 'dark'] as const).map((t) => (
              <Button key={t} kind={s.theme === t ? 'primary' : 'plain'} onClick={() => setS({ theme: t })}>
                {t === 'auto' ? 'Match the tablet' : t === 'light' ? 'Light' : 'Dark'}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Night">
          <div className="flex flex-wrap items-center gap-3">
            <Button kind={s.sleep.on ? 'primary' : 'plain'} onClick={() => setS({ sleep: { ...s.sleep, on: !s.sleep.on } })}>
              {s.sleep.on ? 'Sleep schedule on' : 'Sleep schedule off'}
            </Button>
            <span className="font-bold">from</span>
            <TimeField label="Sleep from" value={s.sleep.from} onChange={(from) => setS({ sleep: { ...s.sleep, from } })} />
            <span className="font-bold">to</span>
            <TimeField label="Wake at" value={s.sleep.to} onChange={(to) => setS({ sleep: { ...s.sleep, to } })} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold mr-1">Sleep screen after no touches for</span>
            {[0, 5, 10, 15, 30].map((m) => (
              <Button key={m} kind={s.idle === m ? 'primary' : 'plain'} onClick={() => setS({ idle: m })}>
                {m === 0 ? 'never' : `${m} min`}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Backup">
          <div className="flex flex-wrap gap-2">
            <Button
              kind="primary"
              onClick={() =>
                void saveFile(`calendar-${ctx.today}.json`, exportData(data, ctx.today)).then(
                  () => setNote('Exported.'),
                  () => setNote('Export did not finish.'),
                )
              }
            >
              ⬆️ Export all data
            </Button>
            <Button
              onClick={() =>
                void openFile().then((text) => {
                  if (!text) return
                  const d = importData(text)
                  if (d) setPending(d)
                  else setNote('That file is not a calendar backup.')
                })
              }
            >
              ⬇️ Import…
            </Button>
          </div>
          {pending && (
            <Card className="p-4 flex flex-col gap-3 border-4 border-rose-400">
              <div className="font-bold text-lg">
                Replace everything on this tablet with the backup? It has {pending.profiles.length} people, {pending.events.length} events, {pending.routines.length} routines and{' '}
                {pending.lists.length} lists.
              </div>
              <div className="flex gap-2">
                <Button
                  kind="danger"
                  onClick={() => {
                    ctx.update(() => pending)
                    setPending(null)
                    setNote('Imported.')
                  }}
                >
                  Replace
                </Button>
                <Button onClick={() => setPending(null)}>Cancel</Button>
              </div>
            </Card>
          )}
          {note && <div className="font-bold text-[var(--accent)]">{note}</div>}
        </Section>

        <Section title="Parent PIN">
          <div className="flex gap-2">
            <Button onClick={() => setS({ pin: undefined })}>Change PIN (asked next time)</Button>
            <Button kind="primary" onClick={onLock}>
              🔒 Lock now
            </Button>
          </div>
        </Section>
      </div>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <h3 className="text-xl font-black">{title}</h3>
      {children}
    </Card>
  )
}

const PARTS: Array<[Part, string]> = [
  ['morning', '☀️ Morning'],
  ['afternoon', '🌤️ Afternoon'],
  ['evening', '🌙 Evening'],
  ['anytime', '⭐ Anytime'],
]

/** Routines and their task cards (spec 4–8). */
export function RoutineEditor({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const { data } = ctx
  const [openId, setOpenId] = useState<string | null>(null)
  const routine = data.routines.find((r) => r.id === openId)
  const change = (id: string, fn: (r: Routine) => Routine) => ctx.update((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? fn(r) : r)) }))

  if (routine) return <RoutineForm ctx={ctx} r={routine} change={(fn) => change(routine.id, fn)} onBack={() => setOpenId(null)} />

  return (
    <Sheet title="Routines" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        {data.routines.map((r) => {
          const p = data.profiles.find((x) => x.id === r.profile)
          return (
            <Card key={r.id} className="p-3 flex items-center gap-3">
              <span className="text-3xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="text-xl font-black">{r.title}</div>
                <div className="font-bold text-[var(--muted)]">
                  {PARTS.find(([k]) => k === r.part)?.[1]} · <span style={{ color: p?.colour }}>{p?.name}</span> · {r.tasks.length} tasks
                </div>
              </div>
              <Button onClick={() => setOpenId(r.id)}>Edit</Button>
            </Card>
          )
        })}
        <Button
          kind="primary"
          className="self-start text-xl"
          onClick={() => {
            const r: Routine = { id: newId(), title: 'New routine', emoji: '⭐', part: 'anytime', profile: data.profiles[0].id, days: [0, 1, 2, 3, 4, 5, 6], inOrder: false, tasks: [] }
            ctx.update((d) => ({ ...d, routines: [...d.routines, r] }))
            setOpenId(r.id)
          }}
        >
          + Routine
        </Button>
      </div>
    </Sheet>
  )
}

function RoutineForm({ ctx, r, change, onBack }: { ctx: Ctx; r: Routine; change: (fn: (r: Routine) => Routine) => void; onBack: () => void }) {
  const [emojiFor, setEmojiFor] = useState<string | null>(null)
  const setTask = (id: string, patch: Partial<Task>) => change((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  const move = (i: number, d: number) =>
    change((x) => {
      const tasks = [...x.tasks]
      const j = i + d
      if (j < 0 || j >= tasks.length) return x
      ;[tasks[i], tasks[j]] = [tasks[j], tasks[i]]
      return { ...x, tasks }
    })

  return (
    <Sheet title={`Routine: ${r.title}`} onClose={onBack} wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <input value={r.title} onChange={(e) => change((x) => ({ ...x, title: e.target.value }))} className="rounded-xl bg-[var(--card)] border border-[var(--line)] px-3 py-2 text-2xl font-black" aria-label="Routine name" />
          {ROUTINE_EMOJI.map((em) => (
            <button key={em} type="button" onClick={() => change((x) => ({ ...x, emoji: em }))} className={`text-3xl rounded-xl p-1 ${r.emoji === em ? 'bg-[var(--soft)]' : ''}`}>
              {em}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {PARTS.map(([k, label]) => (
            <Button key={k} kind={r.part === k ? 'primary' : 'plain'} onClick={() => change((x) => ({ ...x, part: k }))}>
              {label}
            </Button>
          ))}
          {r.part !== 'anytime' && (
            <span className="flex items-center gap-2 ml-2">
              <span className="font-bold">starts</span>
              <TimeField label="Starts at" value={r.time ?? ''} onChange={(time) => change((x) => ({ ...x, time }))} />
            </span>
          )}
        </div>
        <PeoplePicker profiles={ctx.data.profiles} value={[r.profile]} single onChange={([profile]) => change((x) => ({ ...x, profile }))} />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-black mr-1">On</span>
          {WEEKDAYS.map((w, i) => (
            <Button key={w} kind={r.days.includes(i) ? 'primary' : 'plain'} onClick={() => change((x) => ({ ...x, days: x.days.includes(i) ? x.days.filter((d) => d !== i) : [...x.days, i].sort() }))}>
              {w.slice(0, 3)}
            </Button>
          ))}
          <Button kind={r.inOrder ? 'primary' : 'plain'} onClick={() => change((x) => ({ ...x, inOrder: !x.inOrder }))} className="ml-2">
            {r.inOrder ? 'In order ✓' : 'Any order'}
          </Button>
        </div>

        <h3 className="text-xl font-black">Tasks</h3>
        {r.tasks.map((t, i) => (
          <Card key={t.id} className="p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setEmojiFor(emojiFor === t.id ? null : t.id)} className="w-16 h-16 rounded-xl bg-[var(--bg)] text-4xl flex items-center justify-center overflow-hidden" aria-label="Picture">
                {t.photo ? <img src={t.photo} alt="" className="w-full h-full object-cover" /> : (t.emoji ?? '＋')}
              </button>
              <input value={t.label} onChange={(e) => setTask(t.id, { label: e.target.value })} className="flex-1 min-w-40 rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-2 text-xl font-bold" aria-label="Task words" />
              <Button kind="ghost" onClick={() => move(i, -1)} label="Up">
                ▲
              </Button>
              <Button kind="ghost" onClick={() => move(i, 1)} label="Down">
                ▼
              </Button>
              <Button kind="ghost" onClick={() => change((x) => ({ ...x, tasks: x.tasks.filter((k) => k.id !== t.id) }))} label="Remove">
                ✕
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span>Stars</span>
              {[0, 1, 2, 3, 5].map((n) => (
                <Button key={n} kind={t.stars === n ? 'primary' : 'plain'} onClick={() => setTask(t.id, { stars: n })}>
                  {n}
                </Button>
              ))}
              <span className="ml-3">Count to</span>
              {[1, 2, 3, 4, 5, 8].map((n) => (
                <Button key={n} kind={(t.count ?? 1) === n ? 'primary' : 'plain'} onClick={() => setTask(t.id, { count: n === 1 ? undefined : n })}>
                  {n}
                </Button>
              ))}
            </div>
            {emojiFor === t.id && (
              <div className="flex flex-wrap gap-1">
                <Button
                  onClick={() =>
                    void takePhoto().then((photo) => {
                      if (photo) setTask(t.id, { photo })
                      setEmojiFor(null)
                    })
                  }
                >
                  📷 Photo
                </Button>
                {t.photo && <Button onClick={() => (setTask(t.id, { photo: undefined }), setEmojiFor(null))}>Remove photo</Button>}
                {TASK_EMOJI.map((em) => (
                  <button key={em} type="button" onClick={() => (setTask(t.id, { emoji: em, photo: undefined }), setEmojiFor(null))} className="text-3xl rounded-xl p-1">
                    {em}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
        <div className="flex gap-2">
          <Button kind="primary" onClick={() => change((x) => ({ ...x, tasks: [...x.tasks, { id: newId(), label: 'New task', emoji: '⭐', stars: 1 }] }))}>
            + Task
          </Button>
          <div className="flex-1" />
          <Button
            kind="danger"
            onClick={() => {
              ctx.update((d) => ({ ...d, routines: d.routines.filter((x) => x.id !== r.id) }))
              onBack()
            }}
          >
            Delete routine
          </Button>
          <Button onClick={onBack}>Done</Button>
        </div>
      </div>
    </Sheet>
  )
}
