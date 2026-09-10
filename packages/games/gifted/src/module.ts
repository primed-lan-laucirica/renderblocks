import type { GameModule } from '@renderblocks/kernel'

export const giftedModule: GameModule = {
  id: 'gifted',
  title: 'Gifted',
  tile: { color: '#7E57C2', tagline: 'Test prep' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
