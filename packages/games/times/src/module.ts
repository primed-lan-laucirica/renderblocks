import type { GameModule } from '@renderblocks/kernel'

export const timesModule: GameModule = {
  id: 'times',
  title: 'Times',
  tile: { color: '#00CC00', tagline: 'Times tables' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
