import { rect, sneezeOf, startOf, STARTS, STOPS, type Block, type StopId } from './ops'

/** A window on the road: Sneeze² itself, or one of the stops after it. */
export type Window = 'classic' | StopId
export const WINDOWS: Window[] = ['classic', ...STOPS]

export interface Placed {
  block: Block
  x: number
  y: number
  tilt?: number
}

/** A stop's picture: its shape in mid-sneeze (or its pieces, waiting to be put together). In blocks, bottom-left corners. */
export function scene(stop: StopId): Placed[] {
  const n = STARTS[stop].first
  const start = startOf(stop, n)
  if (stop === 'join' || stop === 'build') {
    let x = 0
    return start.map((block) => {
      const at = { block, x, y: 0 }
      x += block.cols + (stop === 'join' ? 1.2 : 0.8)
      return at
    })
  }
  if (stop === 'shapes') return [{ block: rect(3, 4), x: 0, y: 0 }, { block: rect(2, 6), x: 5.5, y: 0 }]
  if (stop === 'chain')
    return [
      { block: rect(2, 4), x: 0, y: 0 },
      { block: rect(2, 2), x: 5, y: 1.4, tilt: 0.25 },
      { block: rect(1, 2), x: 8.2, y: 0.9, tilt: 0.2 },
      { block: rect(1, 1), x: 11, y: 0.3, tilt: 0.15 },
    ]
  const res = sneezeOf(stop, start[0])
  if (!res) return [{ block: start[0], x: 0, y: 0 }]
  let flying = 0
  return res.parts.map((p) => (p.fly ? { block: p.block, x: p.x + start[0].cols * 0.35 + 1.4 + 0.5 * flying, y: p.y + 0.7 + 0.35 * flying++, tilt: 0.22 } : { block: p.block, x: p.x, y: p.y }))
}
