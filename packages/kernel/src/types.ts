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

/**
 * One thing he did that shows what he knows: an answer (`ok` says whether it
 * was right first time) or something he explored (no `ok`).
 */
export interface ProgressEvent {
  /** When, ms since 1970. */
  t: number
  /** The app it happened in (filled in by the kernel). */
  app: string
  /** The concept it's evidence for: a Common Core code such as '3.OA.C.7'. */
  concept: string
  /** The item within it, e.g. '7×8' or '(-3,4)'. */
  item: string
  /** Right first time (true), needed another go (false); absent when nothing was asked. */
  ok?: boolean
  /** How he answered, e.g. 'type' (recall) or 'choose' (recognition). */
  how?: string
  /** How long he took, ms. */
  ms?: number
}

/** The shared progress log (the Progress tile reads it back). */
export interface ProgressLog {
  record(e: Omit<ProgressEvent, 't' | 'app'>): void
  all(): Promise<ProgressEvent[]>
}

/** Services the kernel injects into each game. Grows in later phases. */
export interface GameServices {
  storage: NamespacedStorage
  /**
   * Storage every game can read and write (rb:shared:…), for things games
   * share — e.g. "designs": the Numberblock characters made in Designer,
   * used by Windy and, later, LavaBlocks.
   */
  shared: NamespacedStorage
  /** Where answers go, for the Progress tile. */
  progress: ProgressLog
  /** Return to the game-select home screen. */
  exitToHome: () => void
  /**
   * Register a handler for the Android hardware/gesture back button.
   * Return true to consume the event (e.g. leave an in-progress round);
   * return false to let the kernel exit to the home screen.
   * Returns an unregister function — call it in the effect cleanup.
   */
  onBack: (handler: () => boolean) => () => void
}
