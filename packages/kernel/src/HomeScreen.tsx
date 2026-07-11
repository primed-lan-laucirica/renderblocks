import { motion } from 'framer-motion'
import type { GameModule, UpcomingGame } from './types'

interface HomeScreenProps {
  games: GameModule[]
  upcoming: UpcomingGame[]
  onSelect: (id: string) => void
}

const tileBase =
  'w-44 h-44 rounded-3xl flex flex-col items-center justify-center gap-1 select-none'

export function HomeScreen({ games, upcoming, onSelect }: HomeScreenProps) {
  return (
    <div className="min-h-dvh bg-linear-to-b from-sky-200 via-cloud to-cloud-lavender flex flex-col items-center justify-center gap-10 p-6 overflow-hidden">
      <motion.h1
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="text-5xl font-extrabold tracking-tight text-slate-700 drop-shadow-sm"
      >
        Render<span className="text-accent-pink">Blocks</span>
      </motion.h1>

      <div className="flex flex-wrap items-center justify-center gap-6">
        {games.map((game, i) => (
          <motion.button
            key={game.id}
            type="button"
            onClick={() => onSelect(game.id)}
            className={`${tileBase} text-white shadow-playful cursor-pointer`}
            style={{ backgroundColor: game.tile.color }}
            initial={{ opacity: 0, scale: 0.7, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.45, delay: 0.1 + i * 0.08 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
          >
            {game.tile.icon}
            <span className="text-3xl font-extrabold drop-shadow">{game.title}</span>
            {game.tile.tagline && (
              <span className="text-sm font-bold opacity-90">{game.tile.tagline}</span>
            )}
          </motion.button>
        ))}

        {upcoming.map((game, i) => (
          <motion.div
            key={game.id}
            className={`${tileBase} text-white opacity-40 saturate-50`}
            style={{ backgroundColor: game.tile.color }}
            initial={{ opacity: 0, scale: 0.7, y: 24 }}
            animate={{ opacity: 0.4, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              bounce: 0.45,
              delay: 0.1 + (games.length + i) * 0.08,
            }}
          >
            {game.tile.icon}
            <span className="text-3xl font-extrabold drop-shadow">{game.title}</span>
            <span className="text-sm font-bold uppercase tracking-wide">Coming soon</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
