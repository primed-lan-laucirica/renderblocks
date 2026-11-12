import { CHAINS, sneezeOf, startOf, type ChainId, type Shape } from './chains'

/** A window on the path: Sneeze² itself, or one of the chains after it. */
export type Window = 'classic' | ChainId
export const WINDOWS: Window[] = ['classic', ...CHAINS]

/** What each window is called, under it on the path and at the top of its own page. */
export const NAMES: Record<Window, string> = {
  classic: 'Sneeze²',
  corner: 'Corner squares',
  steps: 'Step triangles',
  factors: 'Factors',
  powers: 'Powers',
  rect: 'Biggest square',
}

/** The path's stretches, each in its own colour, from its first window on. */
export const STAGES: { name: string; colour: string; from: Window }[] = [
  { name: 'Taking away', colour: '#f97316', from: 'classic' },
  { name: 'Sharing out', colour: '#10b981', from: 'factors' },
]

/** Which stretch a window is on. */
export const stageOf = (w: Window): number => STAGES.reduce((at, s, i) => (WINDOWS.indexOf(s.from) <= WINDOWS.indexOf(w) ? i : at), 0)

export interface Placed {
  shape: Shape
  x: number
  y: number
  tilt?: number
}

/** A chain's picture: its first shape in mid-sneeze. In blocks, bottom-left corners. */
export function scene(chain: ChainId): Placed[] {
  const first = startOf(chain, 0).shape
  const res = sneezeOf(chain, first)
  if (!res) return [{ shape: first, x: 0, y: 0 }]
  const wide = Math.max(...res.parts.map((p) => p.x + p.shape.length))
  return res.parts.map((p) => (p.fly ? { shape: p.shape, x: p.x + wide * 0.3 + 1.6, y: p.y + 0.9, tilt: 0.22 } : { shape: p.shape, x: p.x, y: p.y }))
}
