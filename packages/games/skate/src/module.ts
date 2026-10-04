import type { GameModule } from '@renderblocks/kernel'

export const skateModule: GameModule = {
  id: 'skate',
  title: 'Skate',
  tile: { color: '#16A34A', tagline: "Fourteen's halfpipe" },
  load: () => import('./App'),
  capabilities: ['audio'],
}
