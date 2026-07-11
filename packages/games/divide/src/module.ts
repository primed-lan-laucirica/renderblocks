import type { GameModule } from '@renderblocks/kernel'

export const divideModule: GameModule = {
  id: 'divide',
  title: 'Divide',
  tile: { color: '#E91E63', tagline: 'Division tables' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
