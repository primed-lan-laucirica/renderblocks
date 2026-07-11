import type { GameModule } from '@renderblocks/kernel'

export const addModule: GameModule = {
  id: 'add',
  title: 'Add',
  tile: { color: '#FF8C00', tagline: 'Adding 0–9' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
