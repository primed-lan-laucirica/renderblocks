import { blocksModule } from '@renderblocks/blocks/module'
import { shapesModule } from '@renderblocks/shapes/module'
import { combosModule } from '@renderblocks/combos/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [blocksModule, shapesModule, combosModule]

export const upcoming: UpcomingGame[] = []
