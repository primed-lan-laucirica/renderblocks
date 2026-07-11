import type { NamespacedStorage } from '../types'

export function createNamespacedStorage(gameId: string): NamespacedStorage {
  const prefix = `rb:${gameId}:`
  return {
    get: (key) => localStorage.getItem(prefix + key),
    set: (key, value) => localStorage.setItem(prefix + key, value),
    remove: (key) => localStorage.removeItem(prefix + key),
  }
}
