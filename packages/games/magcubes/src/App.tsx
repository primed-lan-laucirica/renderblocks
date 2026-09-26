import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { closeAudio, unlockAudio } from './audio'
import { Board } from './board'
import { LAYER, PAINT } from './render'
import { World } from './world'

const BUILD_KEY = 'build'
const COLOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const TOP_SHARE = Math.round(100 / (1 + LAYER))

function loadBuild(raw: string | null): World {
  try {
    return World.fromJSON(JSON.parse(raw ?? '[]'))
  } catch {
    return new World()
  }
}

/** A tray cube: its top face with a strip of front face, as on the table. */
function TrayCube({ colour, onGrab }: { colour: number; onGrab: (e: React.PointerEvent) => void }) {
  const p = PAINT[colour]
  return (
    <div
      onPointerDown={onGrab}
      className="size-[min(3.5rem,calc((100dvh-6rem)/10))] portrait:size-14 rounded-md touch-none cursor-grab"
      style={{
        // Top face over a front-face strip, in the table's proportions.
        background: `linear-gradient(to bottom, ${p.top} ${TOP_SHARE}%, ${p.front} ${TOP_SHARE}%)`,
        border: `2px solid ${p.edge}`,
        boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
      }}
    />
  )
}

function App({ services }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<Board | null>(null)
  const [overTray, setOverTray] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const board = new Board(canvas, loadBuild(services.storage.get(BUILD_KEY)), {
      trayRect: () => trayRef.current?.getBoundingClientRect() ?? null,
      onTrayHover: setOverTray,
      onChange: (world) => services.storage.set(BUILD_KEY, JSON.stringify(world)),
    })
    boardRef.current = board
    // Debug builds expose the board for inspection from devtools and tests.
    if (services.storage.get('debug') === '1') Object.assign(window, { __mag: board })
    // Fingers are tracked on the window: a drag that starts on the tray
    // carries on over the canvas as one motion.
    const move = (e: PointerEvent) => board.move(e)
    const up = (e: PointerEvent) => board.up(e)
    const resize = () => board.resize()
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      board.wheel(e)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('resize', resize)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('wheel', wheel)
      board.destroy()
      boardRef.current = null
      closeAudio()
    }
  }, [services])

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none bg-[#7A4A26]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        onPointerDown={(e) => {
          unlockAudio()
          boardRef.current?.down(e.nativeEvent)
        }}
      />

      <div className="absolute top-3 left-3 flex flex-col gap-3">
        <button
          type="button"
          onClick={services.exitToHome}
          className="w-12 h-12 rounded-full bg-black/40 text-white text-2xl font-bold"
          aria-label="Home"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => boardRef.current?.fit()}
          className="w-12 h-12 rounded-full bg-black/40 text-white text-2xl font-bold"
          aria-label="Show everything"
        >
          ⤢
        </button>
      </div>

      {/* The tray (spec: the tray): right edge in landscape, bottom in portrait. Drop a piece here to put it away. */}
      <div
        ref={trayRef}
        className={`absolute grid gap-2 p-2 rounded-2xl transition-colors landscape:right-3 landscape:top-1/2 landscape:-translate-y-1/2 landscape:grid-cols-1 portrait:bottom-3 portrait:left-1/2 portrait:-translate-x-1/2 portrait:grid-cols-5 ${
          overTray ? 'bg-black/50 ring-4 ring-white/70' : 'bg-black/25'
        }`}
      >
        {COLOURS.map((c) => (
          <TrayCube
            key={c}
            colour={c}
            onGrab={(e) => {
              unlockAudio()
              boardRef.current?.spawn(c, e.nativeEvent)
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App
