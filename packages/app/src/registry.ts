import { blocksModule } from '@renderblocks/blocks/module'
import { shapesModule } from '@renderblocks/shapes/module'
import { combosModule } from '@renderblocks/combos/module'
import { addModule } from '@renderblocks/add/module'
import { subtractModule } from '@renderblocks/subtract/module'
import { timesModule } from '@renderblocks/times/module'
import { divideModule } from '@renderblocks/divide/module'
import { tasksModule } from '@renderblocks/tasks/module'
import { graphModule } from '@renderblocks/graph/module'
import { numlineModule } from '@renderblocks/numline/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [
  blocksModule,
  shapesModule,
  combosModule,
  addModule,
  subtractModule,
  timesModule,
  divideModule,
  tasksModule,
  graphModule,
  numlineModule,
]

export const upcoming: UpcomingGame[] = []
