import type { CalData } from './model'

/** What every screen gets from the app. */
export interface Ctx {
  data: CalData
  update: (fn: (d: CalData) => CalData) => void
  /** Parent mode is unlocked (spec 14): editing is open. */
  parent: boolean
  /** Run `then` in parent mode, asking for the PIN if needed. */
  askParent: (then: () => void) => void
  today: string
}
