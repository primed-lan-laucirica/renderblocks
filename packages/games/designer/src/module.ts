import type { GameModule } from '@renderblocks/kernel'

export const designerModule: GameModule = {
  id: 'designer',
  title: 'Designer',
  tile: { color: '#F97316', tagline: 'Make your own Numberblock' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
