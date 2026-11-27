import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { computeFrontier } from './frontier/mastery'
import {
  evaluateTransitionVqTrigger,
  pickNextVq,
  readVqCadence,
  writeVqCadence,
  type ValidationQuizlet,
} from './frontier/vq'
import { VqPopup } from './frontier/VqPopup'
import { HomeScreen } from './HomeScreen'
import { createProgressLog, readAll } from './services/progress'
import { createNamespacedStorage } from './services/storage'
import type { GameModule, GameServices, UpcomingGame } from './types'

interface KernelAppProps {
  games: GameModule[]
  upcoming?: UpcomingGame[]
}

export function KernelApp({ games, upcoming = [] }: KernelAppProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingVq, setPendingVq] = useState<ValidationQuizlet | null>(null)
  const active = games.find((g) => g.id === activeId) ?? null
  const gameBackHandler = useRef<(() => boolean) | null>(null)
  const sessionStartRef = useRef<{ id: string; at: number } | null>(null)

  const openGame = useCallback((id: string) => {
    setPendingVq(null)
    sessionStartRef.current = { id, at: Date.now() }
    setActiveId(id)
  }, [])

  const returnHome = useCallback(() => {
    const sess = sessionStartRef.current
    sessionStartRef.current = null
    setActiveId(null)

    if (!sess) return
    const dwellMs = Date.now() - sess.at
    const cadence = readVqCadence()
    const { trigger, nextCadence } = evaluateTransitionVqTrigger(cadence, sess.id, dwellMs)
    writeVqCadence(nextCadence)

    if (!trigger) return
    void readAll().then((events) => {
      const frontier = computeFrontier(events)
      const q = pickNextVq(frontier, { recentQuestionIds: nextCadence.recentQuestionIds })
      if (q) setPendingVq(q)
    })
  }, [])

  // Android hardware/gesture back: active VQ dismisses first, then the active game
  // gets first refusal; otherwise in a game -> home, at home -> background the app.
  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      if (pendingVq) {
        setPendingVq(null)
        return
      }
      if (gameBackHandler.current?.()) return
      if (activeId !== null) {
        returnHome()
      } else {
        void CapacitorApp.minimizeApp()
      }
    })
    return () => {
      void listener.then((l) => l.remove())
    }
  }, [activeId, pendingVq, returnHome])

  const Game = useMemo(() => (active ? lazy(active.load) : null), [active])
  const services = useMemo<GameServices | null>(
    () =>
      active
        ? {
            storage: createNamespacedStorage(active.id),
            shared: createNamespacedStorage('shared'),
            progress: createProgressLog(active.id),
            exitToHome: returnHome,
            onBack: (handler) => {
              gameBackHandler.current = handler
              return () => {
                if (gameBackHandler.current === handler) {
                  gameBackHandler.current = null
                }
              }
            },
          }
        : null,
    [active, returnHome],
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

  return (
    <>
      <HomeScreen games={games} upcoming={upcoming} onSelect={openGame} />
      {pendingVq && <VqPopup quizlet={pendingVq} onClose={() => setPendingVq(null)} />}
    </>
  )
}
