import type { GameModule } from '@renderblocks/kernel'

export const blocksModule: GameModule = {
  id: 'blocks',
  title: 'Blocks',
  tile: { color: '#FF6B9D', tagline: 'Play with numbers' },
  load: () => import('./App'),
  capabilities: ['audio'],
}
