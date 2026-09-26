import { useMemo, useState } from 'react'
import { LIMIT, MULTIPLE_SETS, PRESETS, SETS, spawnNumbers, type NumberRange, type SetId } from './sets'

interface SelectorProps {
  set: SetId
  range: NumberRange
  cap: number
  onChange: (set: SetId, range: NumberRange) => void
  onBattle: (values: number[]) => void
  onHome: () => void
}

const fmt = (n: number) => n.toLocaleString('en-US')
const sameRange = (a: NumberRange, b: NumberRange) => a.from === b.from && a.to === b.to

export function Selector({ set, range, cap, onChange, onBattle, onHome }: SelectorProps) {
  const [editing, setEditing] = useState<'from' | 'to' | null>(null)
  const values = useMemo(() => spawnNumbers(set, range, cap), [set, range, cap])
  const isPreset = PRESETS.some((p) => sameRange(p, range))

  return (
    <div className="h-dvh overflow-y-auto bg-linear-to-b from-indigo-950 via-orange-950 to-orange-800 text-white select-none">
      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onHome}
            className="w-11 h-11 rounded-full bg-white/15 text-xl font-bold shrink-0"
            aria-label="Home"
          >
            ←
          </button>
          <h1 className="text-3xl font-black tracking-tight">🌋 LavaBlocks</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id, range)}
              className={`rounded-2xl px-3 py-3 text-left border-4 ${
                set === s.id ? 'bg-orange-500 border-orange-300' : 'bg-white/10 border-transparent active:bg-white/20'
              }`}
            >
              <div className="text-lg font-extrabold">{s.name}</div>
              <div className="text-xl font-black tabular-nums opacity-90">{s.sample} …</div>
            </button>
          ))}
        </div>

        {/* Skip counting: a button per multiple, 1s to 12s. */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {MULTIPLE_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id, range)}
              className={`rounded-2xl px-3 py-2 text-left border-4 ${
                set === s.id ? 'bg-orange-500 border-orange-300' : 'bg-white/10 border-transparent active:bg-white/20'
              }`}
            >
              <div className="text-sm font-extrabold opacity-80">{s.name}</div>
              <div className="text-lg sm:text-xl font-black tabular-nums whitespace-nowrap">{s.sample} …</div>
            </button>
          ))}
        </div>

        {/* Sets above, ranges below. */}
        <div className="h-1.5 rounded-full bg-white/30 my-2" aria-hidden />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map((p) => (
            <button
              key={`${p.from}_${p.to}`}
              type="button"
              onClick={() => onChange(set, p)}
              className={`rounded-2xl px-2 py-3 text-base sm:text-lg font-extrabold tabular-nums border-4 ${
                sameRange(p, range) ? 'bg-orange-500 border-orange-300' : 'bg-white/10 border-transparent active:bg-white/20'
              }`}
            >
              {fmt(p.from)} to {fmt(p.to)}
            </button>
          ))}
          <div
            className={`col-span-2 sm:col-span-4 flex items-center gap-2 rounded-2xl p-2 border-4 ${
              isPreset ? 'bg-white/10 border-transparent' : 'bg-orange-500 border-orange-300'
            }`}
          >
            {(['from', 'to'] as const).map((end, i) => (
              <div key={end} className="flex-1 flex items-center gap-2 min-w-0">
                {i === 1 && <span className="text-lg font-extrabold">to</span>}
                <button
                  type="button"
                  onClick={() => setEditing(end)}
                  className="flex-1 min-w-0 rounded-xl bg-black/30 px-3 py-2 text-lg font-extrabold tabular-nums truncate"
                >
                  {fmt(range[end])}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={values.length === 0}
          onClick={() => onBattle(values)}
          className="rounded-3xl py-5 text-3xl font-black bg-orange-500 active:bg-orange-600 disabled:opacity-40 shadow-xl border-4 border-orange-300"
        >
          Battle! <span className="tabular-nums opacity-90">· {values.length}</span>
        </button>
      </div>

      {editing && (
        <NumPad
          initial={range[editing]}
          onDone={(v) => {
            setEditing(null)
            if (v !== null) onChange(set, { ...range, [editing]: v })
          }}
        />
      )}
    </div>
  )
}

/** Large on-screen number pad with a minus key (spec 4.1). */
function NumPad({ initial, onDone }: { initial: number; onDone: (v: number | null) => void }) {
  const [text, setText] = useState(String(initial))
  const value = Number(text === '' || text === '-' ? 0 : text)
  const valid = Math.abs(value) <= LIMIT

  const press = (k: string) => {
    if (k === '⌫') setText((t) => t.slice(0, -1))
    else if (k === '−') setText((t) => (t.startsWith('-') ? t.slice(1) : `-${t}`))
    else setText((t) => (t === '0' ? k : t === '-0' ? `-${k}` : t.replace('-', '').length < 13 ? t + k : t))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-10" onClick={() => onDone(null)}>
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div
          className={`text-right text-4xl font-black tabular-nums rounded-2xl bg-black/40 px-4 py-3 overflow-x-auto whitespace-nowrap ${
            valid ? 'text-white' : 'text-rose-400'
          }`}
        >
          {text === '' || text === '-' ? text || '0' : value.toLocaleString('en-US')}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '⌫'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="h-16 rounded-2xl bg-white/10 active:bg-white/25 text-3xl font-extrabold text-white"
            >
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onDone(Math.trunc(value))}
          className="h-16 rounded-2xl bg-orange-500 active:bg-orange-600 disabled:opacity-40 text-3xl font-black text-white"
        >
          OK
        </button>
      </div>
    </div>
  )
}
