/**
 * His drawings, kept on the tablet (IndexedDB: a long painting is too big for
 * the kernel's key/value storage). Each one saves itself as he paints.
 */
import type { Drawing } from './model'

const DB = 'renderblocks-paint'
const STORE = 'drawings'

let db: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return db
}

function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = f(d.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/** Every drawing, the newest first. */
export async function listDrawings(): Promise<Drawing[]> {
  try {
    const all = await run<Drawing[]>('readonly', (s) => s.getAll())
    return all.sort((a, b) => b.updated - a.updated)
  } catch {
    return []
  }
}

export const saveDrawing = (d: Drawing) => run('readwrite', (s) => s.put(d)).then(() => {}, () => {})
export const deleteDrawing = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => {}, () => {})
