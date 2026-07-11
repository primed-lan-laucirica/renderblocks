import type { ComponentType, ReactNode } from 'react'

export type GameCapability = 'audio' | 'speech' | 'llm' | 'storage'

export interface GameTile {
  /** Tile background color (hex). */
  color: string
  icon?: ReactNode
  /** Short line shown under the title on the tile. */
  tagline?: string
}

/** Props the kernel passes to every game's root component. */
export interface GameProps {
  services: GameServices
}

/**
 * The manifest each game package exports. The kernel reads these at build
 * time; `load` keeps the game itself out of the initial bundle.
 */
export interface GameModule {
  id: string
  title: string
  tile: GameTile
  load: () => Promise<{ default: ComponentType<GameProps> }>
  capabilities?: GameCapability[]
}

/** A tile shown greyed-out on the home screen for a game not yet ported. */
export interface UpcomingGame {
  id: string
  title: string
  tile: GameTile
}

/** Per-game key/value storage, namespaced so games can't read each other. */
export interface NamespacedStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Services the kernel injects into each game. Grows in later phases. */
export interface GameServices {
  storage: NamespacedStorage
  /** Return to the game-select home screen. */
  exitToHome: () => void
}
