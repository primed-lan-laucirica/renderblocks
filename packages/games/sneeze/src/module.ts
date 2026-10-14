import type { GameModule } from '@renderblocks/kernel'

export const sneezeModule: GameModule = {
  id: 'sneeze',
  title: 'SneezeBlocks',
  tile: { color: '#F97316', tagline: 'Squares sneeze out squares' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
