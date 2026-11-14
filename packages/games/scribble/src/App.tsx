import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps, NamespacedStorage } from '@renderblocks/kernel'
import { Board } from './Board'
import { Gallery } from './Gallery'
import { Parent } from './Parent'
import { DEFAULT_SETTINGS, GALLERY_MAX, layoutOf, pageOf, PATH_LENGTH, type Saved, type Settings, type Stroke } from './model'
import { effect } from './speak'

function read<T>(storage: NamespacedStorage, key: string, fallback: T): T {
  try {
    const raw = storage.get(key)
    if (!raw) return fallback
    const v = JSON.parse(raw) as T
    return Array.isArray(fallback) ? (Array.isArray(v) ? v : fallback) : typeof fallback === 'object' && fallback ? { ...fallback, ...v } : v
  } catch {
    return fallback
  }
}

/** The page he is on: kept as he writes, so leaving and coming back does not lose it. */
interface Open {
  /** What the boxes ask for (a page begun for other boxes is started afresh). */
  key: string
  ink: Stroke[]
  finished: boolean
}

type Screen = 'board' | 'gallery' | 'parent'

/**
 * Scribble (model.ts): the tile opens straight on the board, at his place on
 * the path. The gallery and the grown-ups' screen (hold the gear) are reached
 * from its top bar.
 */
function App({ services }: GameProps) {
  const { storage } = services
  const [screen, setScreen] = useState<Screen>('board')
  // Settings saved by v1.104.0 (a set of 1–10 or A–H) start on the path from its beginning.
  const [settings, setSettings] = useState<Settings>(() => {
    const s = read<Settings & { set?: string }>(storage, 'settings', DEFAULT_SETTINGS)
    return s.set ? { ...DEFAULT_SETTINGS, prompt: s.prompt, advance: s.advance, custom: s.set === 'custom' ? s.custom : '', mode: s.set === 'custom' ? 'custom' : 'path' } : s
  })
  const [pages, setPages] = useState<Saved[]>(() => read<Saved[]>(storage, 'gallery', []))
  const [stars, setStars] = useState(() => Number(storage.get('stars')) || 0)
  const def = useMemo(() => pageOf(settings), [settings])
  const key = `${settings.mode}:${def.perRow}:${def.whole ? 'w' : ''}:${def.items.join('\u0001')}`
  const [open, setOpen] = useState<Open>(() => read<Open>(storage, 'page', { key, ink: [], finished: false }))
  // How many pages he has begun here: a new one is a new board (its turn starts at the first box).
  const [n, setN] = useState(0)
  const page = useMemo<Open>(() => (open.key === key ? open : { key, ink: [], finished: false }), [open, key])
  const lay = useMemo(() => layoutOf(def.items, def.perRow, def.whole), [def])

  useEffect(() => storage.set('settings', JSON.stringify(settings)), [storage, settings])
  useEffect(() => storage.set('gallery', JSON.stringify(pages)), [storage, pages])
  useEffect(() => storage.set('stars', String(stars)), [storage, stars])
  useEffect(() => storage.set('page', JSON.stringify(page)), [storage, page])

  useEffect(
    () =>
      services.onBack(() => {
        if (screen === 'board') return false
        setScreen('board')
        return true
      }),
    [services, screen],
  )

  const fresh = () => {
    setOpen({ key, ink: [], finished: false })
    setN((v) => v + 1)
  }
  const finish = (ink: Stroke[]) => {
    const at = Date.now()
    setOpen({ key, ink, finished: true })
    setPages((p) => [{ id: String(at), at, items: def.items, perRow: def.perRow, whole: def.whole, ink }, ...p].slice(0, GALLERY_MAX))
    setStars((s) => s + 1)
    effect('celebrate')
  }
  const level = Math.min(settings.level, PATH_LENGTH - 1)

  if (screen === 'gallery')
    return (
      <Shell>
        <Gallery pages={pages} stars={stars} onDelete={(id) => setPages((p) => p.filter((s) => s.id !== id))} onBack={() => setScreen('board')} />
      </Shell>
    )
  if (screen === 'parent')
    return (
      <Shell>
        <Parent
          settings={settings}
          onSettings={setSettings}
          onNewPage={() => {
            fresh()
            setScreen('board')
          }}
          onBack={() => setScreen('board')}
        />
      </Shell>
    )
  return (
    <Shell>
      <Board
        key={`${key}#${n}`}
        items={def.items}
        lay={lay}
        ink={page.ink}
        onInk={(ink) => setOpen({ key, ink, finished: false })}
        prompt={settings.prompt}
        advance={settings.advance}
        finished={page.finished}
        onFinished={finish}
        onAgain={fresh}
        onNext={
          settings.mode === 'path'
            ? () => {
                if (level + 1 < PATH_LENGTH) setSettings((s) => ({ ...s, level: level + 1 }))
                else fresh()
                setN((v) => v + 1)
              }
            : undefined
        }
        stars={stars}
        label={settings.mode === 'path' ? `${def.stage} · ${level + 1}` : def.stage}
        left={
          <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Home">
            ←
          </button>
        }
        right={
          <>
            <button type="button" onClick={() => setScreen('gallery')} className="w-12 h-12 rounded-full bg-white shadow text-xl" aria-label="My pages">
              🖼️
            </button>
            <ParentGate onOpen={() => setScreen('parent')} />
          </>
        }
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh bg-[#EEF1F4] text-slate-900 select-none overflow-hidden">{children}</div>
}

/** Grown-ups hold the gear for a moment to open their screen (as in Trace). */
function ParentGate({ onOpen }: { onOpen: () => void }) {
  const timer = useRef(0)
  const [holding, setHolding] = useState(false)
  const stop = () => {
    window.clearTimeout(timer.current)
    setHolding(false)
  }
  return (
    <button
      type="button"
      onPointerDown={() => {
        setHolding(true)
        timer.current = window.setTimeout(() => {
          setHolding(false)
          onOpen()
        }, 1500)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className={`w-12 h-12 rounded-full shadow text-xl transition-colors duration-[1500ms] ${holding ? 'bg-slate-400' : 'bg-white'}`}
      aria-label="For grown-ups (hold)"
    >
      ⚙️
    </button>
  )
}

export default App
