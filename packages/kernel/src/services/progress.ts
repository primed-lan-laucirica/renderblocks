import type { ProgressEvent, ProgressLog } from '../types'

/**
 * The progress log: every answer the apps record, in one IndexedDB store
 * shared by all of them, so the Progress tile can add them up by concept.
 * Recording never throws and never waits: a game keeps playing even if the
 * log can't be written.
 */
const DB = 'renderblocks-progress'
const STORE = 'events'

let opening: Promise<IDBDatabase> | null = null

function open(version?: number): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, version)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { autoIncrement: true })
    }
    req.onsuccess = () => {
      const db = req.result
      if (db.objectStoreNames.contains(STORE)) return resolve(db)
      // A database with no log in it (opened by something else first): add the store.
      db.close()
      opening = null
      open(db.version + 1).then(resolve, reject)
    }
    req.onerror = () => reject(req.error)
  })
  opening.catch(() => (opening = null))
  return opening
}

export function createProgressLog(app: string): ProgressLog {
  return {
    record(e) {
      const event: ProgressEvent = { ...e, app, t: Date.now() }
      open()
        .then((db) => db.transaction(STORE, 'readwrite').objectStore(STORE).add(event))
        .catch(() => {})
    },
    all: () => readAll(),
  }
}

/** Every event recorded so far, oldest first. */
export async function readAll(): Promise<ProgressEvent[]> {
  try {
    const db = await open()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as ProgressEvent[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}
