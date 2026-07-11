import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameModule, UpcomingGame } from './types'

interface HomeScreenProps {
  games: GameModule[]
  upcoming: UpcomingGame[]
  onSelect: (id: string) => void
}

const TILE_GAP = 16
const TILE_MAX = 200

/**
 * Largest square tile that lets `count` tiles fit the area: try every column
 * count and keep the best. Guarantees fit for any game count and screen.
 */
function solveTileLayout(count: number, width: number, height: number) {
  let best = { cols: 1, tile: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const tile = Math.min(
      (width - TILE_GAP * (cols - 1)) / cols,
      (height - TILE_GAP * (rows - 1)) / rows,
    )
    if (tile > best.tile) best = { cols, tile }
  }
  return { cols: best.cols, tile: Math.min(Math.floor(best.tile), TILE_MAX) }
}

export function HomeScreen({ games, upcoming, onSelect }: HomeScreenProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const count = games.length + upcoming.length
  const { cols, tile } = solveTileLayout(count, area.width, area.height)
  const measured = tile > 0
  const showTagline = tile >= 120

  const tileStyle = { width: tile, height: tile }
  const titleSize = Math.max(14, tile * 0.16)
  const taglineSize = Math.max(10, tile * 0.075)

  return (
    <div className="h-dvh bg-linear-to-b from-sky-200 via-cloud to-cloud-lavender flex flex-col items-center gap-4 p-4 overflow-hidden">
      <motion.h1
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="shrink-0 text-4xl font-extrabold tracking-tight text-slate-700 drop-shadow-sm"
      >
        Render<span className="text-accent-pink">Blocks</span>
      </motion.h1>

      <div ref={areaRef} className="flex-1 min-h-0 w-full flex items-center justify-center">
        {measured && (
          <div
            className="grid place-items-center"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${tile}px)`,
              gap: TILE_GAP,
            }}
          >
            {games.map((game, i) => (
              <motion.button
                key={game.id}
                type="button"
                onClick={() => onSelect(game.id)}
                className="rounded-3xl flex flex-col items-center justify-center gap-1 select-none text-white shadow-playful cursor-pointer"
                style={{ ...tileStyle, backgroundColor: game.tile.color }}
                initial={{ opacity: 0, scale: 0.7, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.45, delay: 0.1 + i * 0.06 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
              >
                {game.tile.icon}
                <span className="font-extrabold drop-shadow" style={{ fontSize: titleSize }}>
                  {game.title}
                </span>
                {showTagline && game.tile.tagline && (
                  <span className="font-bold opacity-90" style={{ fontSize: taglineSize }}>
                    {game.tile.tagline}
                  </span>
                )}
              </motion.button>
            ))}

            {upcoming.map((game, i) => (
              <motion.div
                key={game.id}
                className="rounded-3xl flex flex-col items-center justify-center gap-1 select-none text-white opacity-40 saturate-50"
                style={{ ...tileStyle, backgroundColor: game.tile.color }}
                initial={{ opacity: 0, scale: 0.7, y: 24 }}
                animate={{ opacity: 0.4, scale: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  bounce: 0.45,
                  delay: 0.1 + (games.length + i) * 0.06,
                }}
              >
                {game.tile.icon}
                <span className="font-extrabold drop-shadow" style={{ fontSize: titleSize }}>
                  {game.title}
                </span>
                {showTagline && (
                  <span
                    className="font-bold uppercase tracking-wide"
                    style={{ fontSize: taglineSize }}
                  >
                    Coming soon
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
