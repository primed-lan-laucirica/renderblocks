import type { GameModule } from '@renderblocks/kernel'

export const giftedModule: GameModule = {
  id: 'gifted',
  title: 'Puzzles',
  tile: { color: '#7E57C2', tagline: 'Thinking games' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
