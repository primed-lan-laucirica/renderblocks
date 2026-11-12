import { useEffect, useRef } from 'react'
import type { Look } from '@renderblocks/designer/look'
import { drawPiece } from '../draw'
import { drawBlock } from './draw'
import type { StopId } from './ops'
import { scene, WINDOWS, type Window } from './windows'

/** What each window is, for a screen reader (there are no words on the road). */
const NAMES: Record<Window, string> = {
  classic: 'Sneeze squared',
  one: 'One out',
  split: 'Split',
  twins: 'Twins',
  join: 'Back in',
  rows: 'Rows',
  burst: 'All at once',
  build: 'Rows back in',
  over: 'One left over',
  shapes: 'Same number, new shape',
  chain: 'Chain sneeze',
}

/** The second stretch of the road (equal groups) starts here. */
const STAGE_2: Window = 'rows'

/** A window's picture, drawn to fit. */
function Thumb({ window: win, lookFor }: { window: Window; lookFor: (n: bigint) => Look }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = el.clientWidth
    const h = el.clientHeight
    el.width = Math.round(w * dpr)
    el.height = Math.round(h * dpr)
    if (win === 'classic') {
      // 16 sneezes out 4 and keeps a ring of 12.
      const scale = Math.min(w / 9.5, h / 6.5)
      const at = (x: number, y: number, tilt: number, side: number) => {
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.translate(w / 2 + (x - 4.2) * scale, h * 0.86 - y * scale)
        g.rotate(tilt)
        g.scale(scale, -scale)
        g.translate(-side / 2, -side / 2)
      }
      at(2, 2, 0, 4)
      drawPiece(g, 12n, 4n, 2n, { ...lookFor(12n), legs: 'none' }, scale)
      at(6.8, 3.3, 0.25, 2)
      drawPiece(g, 4n, 2n, 0n, { ...lookFor(4n), legs: 'none' }, scale)
      return
    }
    const parts = scene(win)
    const x1 = Math.max(...parts.map((p) => p.x + p.block.cols))
    const y1 = Math.max(...parts.map((p) => p.y + p.block.rows + (p.block.left ? 1 : 0)))
    // Room round them for arms and tilted corners.
    const scale = Math.min(w / (x1 + 2.4), h / (y1 + 1.6))
    for (const p of parts) {
      const cx = w / 2 + (p.x + p.block.cols / 2 - x1 / 2) * scale
      const cy = h * 0.9 - (p.y + p.block.rows / 2) * scale
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.translate(cx, cy)
      g.rotate(p.tilt ?? 0)
      g.scale(scale, -scale)
      g.translate(-p.block.cols / 2, -p.block.rows / 2)
      drawBlock(g, p.block, lookFor(BigInt(p.block.cols * p.block.rows + p.block.left)), scale)
    }
  }, [win, lookFor])
  return <canvas ref={ref} className="w-full h-full" />
}

/**
 * The sneeze road: a window for every kind of sneeze, in order, Sneeze²
 * first. Every window is open from the start (he is two and a half: a locked
 * door would end the play); a star marks the ones he has guessed right in.
 */
export function Road({
  stars,
  guess,
  lookFor,
  last,
  onGuess,
  onOpen,
  onBack,
}: {
  stars: Set<StopId>
  guess: boolean
  lookFor: (n: bigint) => Look
  /** The window he was last in: the road opens there. */
  last: Window | null
  onGuess: (on: boolean) => void
  onOpen: (w: Window) => void
  onBack: () => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = last ? strip.current?.querySelector(`[data-window="${last}"]`) : null
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [last])
  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-orange-100 to-amber-50 text-slate-900 select-none">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-700" aria-label="The sneeze road">
          🤧 → 🤧 → 🤧
        </div>
        <button
          type="button"
          onClick={() => onGuess(!guess)}
          className={`h-12 px-4 rounded-2xl shadow font-black text-lg shrink-0 ${guess ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}
          aria-label={guess ? 'Guess first: on' : 'Guess first: off'}
        >
          🤔 = ? {guess ? 'On' : 'Off'}
        </button>
      </div>
      <div ref={strip} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="relative h-full flex items-stretch px-6 w-max">
          {/* The road itself, behind the windows. */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-amber-200/80 border-y-4 border-amber-300" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-4 border-dashed border-white/90" />
          {WINDOWS.map((win, i) => {
            const two = WINDOWS.indexOf(win) >= WINDOWS.indexOf(STAGE_2)
            const starred = win !== 'classic' && stars.has(win)
            return (
              <div key={win} className={`relative h-full flex flex-col ${i % 2 ? 'justify-end pb-3' : 'justify-start pt-1'} ${i ? '-ml-[min(20vh,8rem)]' : ''}`} style={{ width: 'min(58vh, 24rem)' }}>
                <button
                  type="button"
                  data-window={win}
                  onClick={() => onOpen(win)}
                  aria-label={`${i + 1}: ${NAMES[win]}${starred ? ', star earned' : ''}`}
                  className={`relative w-full rounded-3xl bg-white shadow-lg border-4 p-2 active:scale-95 transition-transform ${two ? 'border-emerald-400' : 'border-orange-400'}`}
                  style={{ height: '45%' }}
                >
                  <Thumb window={win} lookFor={lookFor} />
                  <span className={`absolute -top-3 -left-3 w-9 h-9 rounded-full text-white font-black text-lg flex items-center justify-center shadow ${two ? 'bg-emerald-500' : 'bg-orange-500'}`}>{i + 1}</span>
                  {starred && <span className="absolute -top-4 -right-3 text-3xl">⭐</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** The way onto the road, from the Sneeze² menu: the first few windows, small. */
export function RoadDoor({ lookFor, onOpen }: { lookFor: (n: bigint) => Look; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label="The sneeze road" className="w-full h-24 rounded-3xl bg-white shadow border-4 border-orange-400 px-3 flex items-center gap-2 active:scale-[0.98] transition-transform">
      {(['one', 'twins', 'rows', 'burst', 'chain'] as const).map((s) => (
        <div key={s} className="flex-1 h-full py-1 min-w-0">
          <Thumb window={s} lookFor={lookFor} />
        </div>
      ))}
      <span className="text-3xl font-black text-orange-500 shrink-0">→</span>
    </button>
  )
}
