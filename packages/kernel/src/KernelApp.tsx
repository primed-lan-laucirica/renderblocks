import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { HomeScreen } from './HomeScreen'
import { createNamespacedStorage } from './services/storage'
import type { GameModule, GameServices, UpcomingGame } from './types'

interface KernelAppProps {
  games: GameModule[]
  upcoming?: UpcomingGame[]
}

export function KernelApp({ games, upcoming = [] }: KernelAppProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = games.find((g) => g.id === activeId) ?? null

  // Android hardware/gesture back: in a game -> home; at home -> background the app.
  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      if (activeId !== null) {
        setActiveId(null)
      } else {
        void CapacitorApp.minimizeApp()
      }
    })
    return () => {
      void listener.then((l) => l.remove())
    }
  }, [activeId])

  const Game = useMemo(() => (active ? lazy(active.load) : null), [active])
  const services = useMemo<GameServices | null>(
    () =>
      active
        ? {
            storage: createNamespacedStorage(active.id),
            exitToHome: () => setActiveId(null),
          }
        : null,
    [active],
  )

  if (Game && services) {
    return (
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center bg-cloud">
            <div className="text-2xl font-extrabold text-slate-500 animate-pulse">
              Loading…
            </div>
          </div>
        }
      >
        <Game services={services} />
      </Suspense>
    )
  }

  return <HomeScreen games={games} upcoming={upcoming} onSelect={setActiveId} />
}
