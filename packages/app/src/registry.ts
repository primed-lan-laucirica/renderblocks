import { blocksModule } from '@renderblocks/blocks/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [blocksModule]

export const upcoming: UpcomingGame[] = [
  { id: 'shapes', title: 'Shapes', tile: { color: '#00BFFF', tagline: 'Puzzle play' } },
  { id: 'combos', title: 'Combos', tile: { color: '#9B5DE5', tagline: 'Match & spin' } },
]
