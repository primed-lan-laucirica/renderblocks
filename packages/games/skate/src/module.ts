import type { GameModule } from '@renderblocks/kernel'

export const skateModule: GameModule = {
  id: 'skate',
  title: 'Skate 14',
  tile: { color: '#16A34A', tagline: 'Fourteen skates the town' },
  load: () => import('./App'),
  capabilities: ['audio'],
}
