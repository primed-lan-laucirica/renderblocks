import { useState } from 'react'
import { FADE, TOP } from './fade'
import { levelOf, practicePool, type PracticeSettings, type ProgressMap } from './items'
import { LEVELS } from '@renderblocks/words/words'

interface Props {
  settings: PracticeSettings
  onSettings: (s: PracticeSettings) => void
  myWords: string[]
  onMyWords: (w: string[]) => void
  progress: ProgressMap
  onLevel: (key: string, level: number | null) => void
  onResetAll: () => void
  onBack: () => void
}

const PHASE_NAMES: Record<string, string> = { solid: 'path', dots: 'dots', flash: 'flash', blank: 'blank' }
/** A short name for a fade step: "path + arrows", "dots 3", "flash 2", "blank". */
function stepName(i: number) {
  const s = FADE[i]
  if (s.phase === 'solid') return s.arrows ? 'path + arrows' : 'path'
  if (s.startsOnly) return 'start dots'
  const n = FADE.slice(0, i + 1).filter((f) => f.phase === s.phase && !f.startsOnly).length
  return s.baselineOnly ? 'baseline only' : `${PHASE_NAMES[s.phase]} ${n}`
}

/** For grown-ups (Handwriting-MVP-spec.md: for you): what Practice includes, your own words, and each item's fade step. */
export function Parent({ settings, onSettings, myWords, onMyWords, progress, onLevel, onResetAll, onBack }: Props) {
  const [draft, setDraft] = useState('')
  const pool = practicePool(settings, myWords)
  const chip = (on: boolean, label: string, flip: () => void) => (
    <button type="button" onClick={flip} className={`h-11 px-4 rounded-xl font-bold shadow ${on ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}>
      {label}
    </button>
  )
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-600">For grown-ups</div>
        <div className="w-12" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h2 className="font-black text-slate-700">Practice includes</h2>
          <div className="flex flex-wrap gap-2">
            {chip(settings.numbers, '0–9', () => onSettings({ ...settings, numbers: !settings.numbers }))}
            {chip(settings.lower, 'a–z', () => onSettings({ ...settings, lower: !settings.lower }))}
            {chip(settings.upper, 'A–Z', () => onSettings({ ...settings, upper: !settings.upper }))}
            {chip(settings.words, 'Words', () => onSettings({ ...settings, words: !settings.words }))}
          </div>
          {settings.words && (
            <div className="flex items-center gap-2 text-slate-600 font-bold">
              Words app levels 1 to
              <button type="button" className="w-10 h-10 rounded-xl bg-white shadow" onClick={() => onSettings({ ...settings, wordLevels: Math.max(1, settings.wordLevels - 1) })}>
                −
              </button>
              <span className="w-8 text-center text-xl">{settings.wordLevels}</span>
              <button type="button" className="w-10 h-10 rounded-xl bg-white shadow" onClick={() => onSettings({ ...settings, wordLevels: Math.min(LEVELS.length, settings.wordLevels + 1) })}>
                +
              </button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-black text-slate-700">My words</h2>
          <p className="text-sm text-slate-500">Words, names, numbers or short sentences to trace. Single words also join Practice.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const w = draft.trim()
              if (w && !myWords.includes(w)) onMyWords([...myWords, w])
              setDraft('')
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Render" className="flex-1 h-12 px-3 rounded-xl bg-white shadow text-xl" />
            <button type="submit" className="h-12 px-5 rounded-xl bg-sky-500 text-white font-black shadow">
              Add
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {myWords.map((w) => (
              <span key={w} className="h-10 pl-3 pr-1 rounded-xl bg-white shadow flex items-center gap-2 font-bold">
                {w}
                <button type="button" onClick={() => onMyWords(myWords.filter((x) => x !== w))} className="w-8 h-8 rounded-lg text-slate-400" aria-label={`Remove ${w}`}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-700 flex-1">How far each has faded</h2>
            <button type="button" onClick={onResetAll} className="h-10 px-3 rounded-xl bg-white shadow font-bold text-rose-600">
              Reset all
            </button>
          </div>
          <p className="text-sm text-slate-500">
            {TOP + 1} steps: path with arrows, path, thinning dots, start dots, flashes getting shorter and rarer, then a blank page. A clean try moves an item one step on; a struggle moves it back one.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {pool.map((item) => {
              const lv = levelOf(item, progress)
              return (
                <div key={item.key} className="flex items-center gap-2 bg-white rounded-xl shadow px-2 py-1">
                  <span className="w-20 font-black text-lg truncate">{item.text}</span>
                  <button type="button" className="w-9 h-9 rounded-lg bg-slate-100" onClick={() => onLevel(item.key, Math.max(0, lv - 1))} aria-label={`More help for ${item.text}`}>
                    −
                  </button>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-sky-400" style={{ width: `${((lv + 1) / (TOP + 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-bold">{stepName(lv)}</span>
                  </div>
                  <button type="button" className="w-9 h-9 rounded-lg bg-slate-100" onClick={() => onLevel(item.key, Math.min(TOP, lv + 1))} aria-label={`Less help for ${item.text}`}>
                    +
                  </button>
                  {progress[item.key] && (
                    <button type="button" className="w-9 h-9 rounded-lg text-slate-400" onClick={() => onLevel(item.key, null)} aria-label={`Reset ${item.text}`}>
                      ↺
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
