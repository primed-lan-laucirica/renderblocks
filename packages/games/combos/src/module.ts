import type { GameModule } from '@renderblocks/kernel'

export const combosModule: GameModule = {
  id: 'combos',
  title: 'Combos',
  tile: { color: '#9B5DE5', tagline: 'Match & spin' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
