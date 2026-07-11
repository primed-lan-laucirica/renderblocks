import { blocksModule } from '@renderblocks/blocks/module'
import { shapesModule } from '@renderblocks/shapes/module'
import { combosModule } from '@renderblocks/combos/module'
import { timesModule } from '@renderblocks/times/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [blocksModule, shapesModule, combosModule, timesModule]

export const upcoming: UpcomingGame[] = []
