import type { GameModule } from '@renderblocks/kernel'

export const graphModule: GameModule = {
  id: 'graph',
  title: 'Graph',
  tile: { color: '#009688', tagline: 'Coordinate plane' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
