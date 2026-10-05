import type { GameModule } from '@renderblocks/kernel'

export const windyModule: GameModule = {
  id: 'windy',
  title: 'Windy',
  tile: { color: '#0EA5E9', tagline: 'Blown through the town' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
