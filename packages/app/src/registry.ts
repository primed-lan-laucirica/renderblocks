import { blocksModule } from '@renderblocks/blocks/module'
import { shapesModule } from '@renderblocks/shapes/module'
import { combosModule } from '@renderblocks/combos/module'
import { addModule } from '@renderblocks/add/module'
import { subtractModule } from '@renderblocks/subtract/module'
import { timesModule } from '@renderblocks/times/module'
import { divideModule } from '@renderblocks/divide/module'
import { calendarModule } from '@renderblocks/calendar/module'
import { base10Module } from '@renderblocks/base10/module'
import { graphModule } from '@renderblocks/graph/module'
import { numlineModule } from '@renderblocks/numline/module'
import { giftedModule } from '@renderblocks/gifted/module'
import { lavaModule } from '@renderblocks/lava/module'
import { wordsModule } from '@renderblocks/words/module'
import { magcubesModule } from '@renderblocks/magcubes/module'
import { traceModule } from '@renderblocks/trace/module'
import { skateModule } from '@renderblocks/skate/module'
import { sortModule } from '@renderblocks/sort/module'
import { designerModule } from '@renderblocks/designer/module'
import { windyModule } from '@renderblocks/windy/module'
import type { GameModule, UpcomingGame } from '@renderblocks/kernel'

export const games: GameModule[] = [
  blocksModule,
  shapesModule,
  combosModule,
  addModule,
  subtractModule,
  timesModule,
  divideModule,
  calendarModule,
  graphModule,
  numlineModule,
  giftedModule,
  lavaModule,
  wordsModule,
  magcubesModule,
  base10Module,
  traceModule,
  skateModule,
  sortModule,
  designerModule,
  windyModule,
]

export const upcoming: UpcomingGame[] = []
