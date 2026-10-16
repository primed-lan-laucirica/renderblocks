import type { GameModule } from '@renderblocks/kernel'

export const paintModule: GameModule = {
  id: 'paint',
  title: 'Paint',
  tile: { color: '#F97316', tagline: 'Brushes, crayons, paint' },
  load: () => import('./App'),
  capabilities: ['storage'],
}
