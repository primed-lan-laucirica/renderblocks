import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps, NamespacedStorage } from '@renderblocks/kernel'
import { Board } from './Board'
import { Gallery } from './Gallery'
import { Parent } from './Parent'
import { DEFAULT_SETTINGS, GALLERY_MAX, layoutOf, perRowOf, tokensOf, type Saved, type Settings, type Stroke } from './model'
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
  /** What the boxes ask for (a page begun under other settings is started afresh). */
  key: string
  ink: Stroke[]
  finished: boolean
}

type Screen = 'board' | 'gallery' | 'parent'

/**
 * Scribble (model.ts): the tile opens straight on the board. The gallery and
 * the grown-ups' screen (hold the gear) are reached from its top bar.
 */
function App({ services }: GameProps) {
  const { storage } = services
  const [screen, setScreen] = useState<Screen>('board')
  const [settings, setSettings] = useState<Settings>(() => read(storage, 'settings', DEFAULT_SETTINGS))
  const [pages, setPages] = useState<Saved[]>(() => read<Saved[]>(storage, 'gallery', []))
  const [stars, setStars] = useState(() => Number(storage.get('stars')) || 0)
  const tokens = useMemo(() => tokensOf(settings), [settings])
  const perRow = perRowOf(settings)
  const key = `${perRow}:${tokens.join('\u0001')}`
  const [open, setOpen] = useState<Open>(() => read<Open>(storage, 'page', { key, ink: [], finished: false }))
  // How many pages he has begun here: a new one is a new board (its turn starts at the first box).
  const [n, setN] = useState(0)
  const page = useMemo<Open>(() => (open.key === key ? open : { key, ink: [], finished: false }), [open, key])
  const lay = useMemo(() => layoutOf(tokens.length, perRow), [tokens.length, perRow])

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

  const newPage = () => {
    setOpen({ key, ink: [], finished: false })
    setN((v) => v + 1)
  }
  const finish = (ink: Stroke[]) => {
    const at = Date.now()
    setOpen({ key, ink, finished: true })
    setPages((p) => [{ id: String(at), at, tokens, perRow, ink }, ...p].slice(0, GALLERY_MAX))
    setStars((s) => s + 1)
    effect('celebrate')
  }

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
            newPage()
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
        tokens={tokens}
        lay={lay}
        ink={page.ink}
        onInk={(ink) => setOpen({ key, ink, finished: false })}
        prompt={settings.prompt}
        advance={settings.advance}
        finished={page.finished}
        onFinished={finish}
        onNew={newPage}
        stars={stars}
        top={
          <>
            <button type="button" onClick={services.exitToHome} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Home">
              ←
            </button>
            <div className="flex-1" />
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
