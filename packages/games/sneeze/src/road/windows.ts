import { rect, sneezeOf, startOf, STARTS, STOPS, type Block, type StopId } from './ops'

/** A window on the road: Sneeze² itself, or one of the stops after it. */
export type Window = 'classic' | StopId
export const WINDOWS: Window[] = ['classic', ...STOPS]

/** What each window is called, under it on the road and at the top of its own page. */
export const NAMES: Record<Window, string> = {
  classic: 'Sneeze²',
  one: 'One out',
  split: 'Split',
  twins: 'Twins',
  join: 'Back in',
  rows: 'Rows',
  burst: 'All at once',
  build: 'Rows back in',
  over: 'One left over',
  shapes: 'New shape',
  chain: 'Chain sneeze',
}

/** The road's stretches: each a kind of sneezing, in its own colour, from its first window on. */
export const STAGES: { name: string; colour: string; from: Window }[] = [
  { name: 'Squares', colour: '#f97316', from: 'classic' },
  { name: 'Taking apart', colour: '#0ea5e9', from: 'one' },
  { name: 'Equal groups', colour: '#10b981', from: 'rows' },
]

/** Which stretch a window is on. */
export const stageOf = (w: Window): number => STAGES.reduce((at, s, i) => (WINDOWS.indexOf(s.from) <= WINDOWS.indexOf(w) ? i : at), 0)

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

/** What a stop starts with for a number, laid out for its card: one shape, towers side by side, or rows one over the other. */
export function laid(stop: StopId, n: number): Placed[] {
  const blocks = startOf(stop, n)
  let x = 0
  if (stop === 'build') return blocks.map((block, i) => ({ block, x: 0, y: i * 1.35 }))
  return blocks.map((block) => {
    const at = { block, x, y: 0 }
    x += block.cols + 1.2
    return at
  })
}

/** The small print under a start's number: how it is made. */
export function madeOf(stop: StopId, n: number): string {
  const blocks = startOf(stop, n)
  const b = blocks[0]
  if (stop === 'join') return blocks.map((q) => q.cols * q.rows + q.left).join(' + ')
  if (stop === 'build') return `${blocks.length} × ${b.cols}`
  if (blocks.length !== 1 || b.rows < 2 || b.cols < 2) return ''
  return `${b.rows} × ${b.cols}${b.left ? ` + ${b.left}` : ''}`
}
