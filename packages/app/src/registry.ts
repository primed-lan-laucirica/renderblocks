import { blocksModule } from '@renderblocks/blocks/module'
import { shapesModule } from '@renderblocks/shapes/module'
import { combosModule } from '@renderblocks/combos/module'
import { addModule } from '@renderblocks/add/module'
import { subtractModule } from '@renderblocks/subtract/module'
import { timesModule } from '@renderblocks/times/module'
import { divideModule } from '@renderblocks/divide/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [
  blocksModule,
  shapesModule,
  combosModule,
  addModule,
  subtractModule,
  timesModule,
  divideModule,
]

export const upcoming: UpcomingGame[] = []
