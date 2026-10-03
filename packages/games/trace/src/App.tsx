import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { TraceScreen } from './TraceScreen'
import { PracticeScreen } from './PracticeScreen'
import { Gallery } from './Gallery'
import { Parent } from './Parent'
import { DEFAULT_PRACTICE, numberItem, pickRound, practicePool, traceGroups, type Item, type PracticeSettings, type ProgressMap, type TraceSet } from './items'
import { DEFAULT_GUIDES, DEFAULT_PEN, GALLERY_MAX, load, loadList, type Guides, type Saved } from './store'
import type { Done, Pen } from './Page'

type Screen =
  | { name: 'home' }
  | { name: 'sets' }
  | { name: 'keypad' }
  | { name: 'trace'; set: TraceSet; index: number }
  | { name: 'practice'; round: Item[]; n: number }
  | { name: 'gallery' }
  | { name: 'parent' }

/**
 * Trace (Handwriting-MVP-spec.md): a full tracing app he wants to use, with
 * Practice inside it fading the patterns step by step toward a blank page.
 */
function App({ services }: GameProps) {
  const { storage } = services
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [progress, setProgress] = useState<ProgressMap>(() => load<ProgressMap>(storage, 'progress', {}))
  const [settings, setSettings] = useState<PracticeSettings>(() => load(storage, 'practice', DEFAULT_PRACTICE))
  const [myWords, setMyWords] = useState<string[]>(() => loadList<string>(storage, 'mywords'))
  const [pen, setPen] = useState<Pen>(() => load(storage, 'pen', DEFAULT_PEN))
  const [guides, setGuides] = useState<Guides>(() => load(storage, 'guides', DEFAULT_GUIDES))
  const [pages, setPages] = useState<Saved[]>(() => loadList<Saved>(storage, 'gallery'))

  useEffect(() => storage.set('progress', JSON.stringify(progress)), [storage, progress])
  useEffect(() => storage.set('practice', JSON.stringify(settings)), [storage, settings])
  useEffect(() => storage.set('mywords', JSON.stringify(myWords)), [storage, myWords])
  useEffect(() => storage.set('pen', JSON.stringify(pen)), [storage, pen])
  useEffect(() => storage.set('guides', JSON.stringify(guides)), [storage, guides])
  useEffect(() => storage.set('gallery', JSON.stringify(pages)), [storage, pages])

  const groups = useMemo(() => traceGroups(myWords), [myWords])

  // The Android back button steps back a screen before leaving the app.
  useEffect(
    () =>
      services.onBack(() => {
        if (screen.name === 'home') return false
        setScreen(screen.name === 'trace' || screen.name === 'keypad' ? { name: 'sets' } : { name: 'home' })
        return true
      }),
    [services, screen],
  )

  const save = (item: Item, d: Done) => {
    if (!d.ink.length) return
    const at = Date.now()
    setPages((p) => [{ id: `${at}`, item, at, pen, ink: d.ink, wrap: d.wrap }, ...p].slice(0, GALLERY_MAX))
  }

  const newRound = (n: number) => setScreen({ name: 'practice', round: pickRound(practicePool(settings, myWords), progress), n })

  if (screen.name === 'trace')
    return (
      <Shell>
        <TraceScreen
          set={screen.set}
          index={screen.index}
          onIndex={(index) => setScreen({ ...screen, index })}
          guides={guides}
          onGuides={setGuides}
          pen={pen}
          onPen={setPen}
          onFinished={(d) => save(screen.set.items[screen.index], d)}
          onBack={() => setScreen({ name: 'sets' })}
        />
      </Shell>
    )

  if (screen.name === 'practice')
    return (
      <Shell>
        <PracticeScreen
          key={screen.n}
          round={screen.round}
          progress={progress}
          onProgress={(key, level) => setProgress((p) => ({ ...p, [key]: { level, seen: Date.now() } }))}
          pen={pen}
          onFinished={save}
          onAgain={() => newRound(screen.n + 1)}
          onExit={() => setScreen({ name: 'home' })}
        />
      </Shell>
    )

  if (screen.name === 'gallery')
    return (
      <Shell>
        <Gallery pages={pages} onDelete={(id) => setPages((p) => p.filter((s) => s.id !== id))} onBack={() => setScreen({ name: 'home' })} />
      </Shell>
    )

  if (screen.name === 'parent')
    return (
      <Shell>
        <Parent
          settings={settings}
          onSettings={setSettings}
          myWords={myWords}
          onMyWords={setMyWords}
          progress={progress}
          onLevel={(key, level) =>
            setProgress((p) => {
              const next = { ...p }
              if (level === null) delete next[key]
              else next[key] = { level, seen: p[key]?.seen ?? 0 }
              return next
            })
          }
          onResetAll={() => setProgress({})}
          onBack={() => setScreen({ name: 'home' })}
        />
      </Shell>
    )

  if (screen.name === 'keypad')
    return (
      <Shell>
        <Keypad onBack={() => setScreen({ name: 'sets' })} onTrace={(n) => setScreen({ name: 'trace', set: { id: 'any', title: 'Any number', sample: n, items: [numberItem(n)] }, index: 0 })} />
      </Shell>
    )

  if (screen.name === 'sets')
    return (
      <Shell>
        <div className="h-full flex flex-col">
          <TopBar onBack={() => setScreen({ name: 'home' })} title="Trace" />
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 flex flex-col gap-4">
            {groups.map((g) => (
              <section key={g.title} className="flex flex-col gap-2">
                <h2 className="font-black text-slate-600 text-lg px-1">{g.title}</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
                  {g.title === 'Numbers' && <SetButton sample="#" title="Any number" onClick={() => setScreen({ name: 'keypad' })} />}
                  {g.sets.map((s) => (
                    <SetButton key={s.id} sample={s.sample} title={s.title} onClick={() => setScreen({ name: 'trace', set: s, index: 0 })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Shell>
    )

  return (
    <Shell>
      <div className="h-full flex flex-col">
        <TopBar onBack={services.exitToHome} title="Trace" right={<ParentGate onOpen={() => setScreen({ name: 'parent' })} />} />
        <div className="flex-1 flex flex-col sm:flex-row items-stretch justify-center gap-4 p-4 sm:p-8">
          <BigButton colour="#0EA5E9" emoji="✏️" title="Trace" note="Numbers, letters, words, shapes" onClick={() => setScreen({ name: 'sets' })} />
          <BigButton colour="#F59E0B" emoji="🌟" title="Practice" note="A little less help each time" onClick={() => newRound(1)} />
          <BigButton colour="#8B5CF6" emoji="🖼️" title="My pages" note={`${pages.length} saved`} onClick={() => setScreen({ name: 'gallery' })} />
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh bg-[#F3F6FB] text-slate-900 select-none overflow-hidden">{children}</div>
}

function TopBar({ onBack, title, right }: { onBack: () => void; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2">
      <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
        ←
      </button>
      <div className="flex-1 text-center text-2xl font-black text-slate-600">{title}</div>
      <div className="w-12 flex justify-end">{right}</div>
    </div>
  )
}

function BigButton({ colour, emoji, title, note, onClick }: { colour: string; emoji: string; title: string; note: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex-1 max-h-72 sm:max-h-none rounded-[2rem] shadow-lg text-white flex flex-col items-center justify-center gap-1 p-4 active:scale-[0.98] transition-transform" style={{ background: colour }}>
      <span className="text-6xl">{emoji}</span>
      <span className="text-3xl font-black">{title}</span>
      <span className="text-sm font-bold opacity-90">{note}</span>
    </button>
  )
}

function SetButton({ sample, title, onClick }: { sample: string; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-24 rounded-2xl bg-white shadow flex flex-col items-center justify-center px-2 active:scale-95 transition-transform">
      <span className="text-3xl font-black text-sky-600 truncate max-w-full">{sample}</span>
      <span className="text-sm font-bold text-slate-500">{title}</span>
    </button>
  )
}

/** Grown-ups hold the gear for a moment to open their screen. */
function ParentGate({ onOpen }: { onOpen: () => void }) {
  const timer = useRef(0)
  const [holding, setHolding] = useState(false)
  const start = () => {
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onOpen()
    }, 1500)
  }
  const stop = () => {
    window.clearTimeout(timer.current)
    setHolding(false)
  }
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className={`w-12 h-12 rounded-full shadow text-xl transition-colors duration-[1500ms] ${holding ? 'bg-sky-300' : 'bg-white'}`}
      aria-label="For grown-ups (hold)"
    >
      ⚙️
    </button>
  )
}

/** Type any number to trace it. */
function Keypad({ onBack, onTrace }: { onBack: () => void; onTrace: (n: string) => void }) {
  const [n, setN] = useState('')
  const key = (label: string, onClick: () => void, cls = 'bg-white') => (
    <button type="button" onClick={onClick} className={`h-16 rounded-2xl shadow text-3xl font-black active:scale-95 transition-transform ${cls}`}>
      {label}
    </button>
  )
  return (
    <div className="h-full flex flex-col">
      <TopBar onBack={onBack} title="Any number" />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <div className="h-20 min-w-[12rem] px-6 rounded-2xl bg-white shadow text-5xl font-black tabular-nums flex items-center justify-center">{n || ' '}</div>
        <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
          {'123456789'.split('').map((d) => key(d, () => setN((s) => (s.length < 9 ? s + d : s))))}
          {key('⌫', () => setN((s) => s.slice(0, -1)))}
          {key('0', () => setN((s) => (s.length < 9 ? s + '0' : s)))}
          {key('✏️', () => n && onTrace(n), 'bg-sky-500 text-white')}
        </div>
      </div>
    </div>
  )
}

export default App
