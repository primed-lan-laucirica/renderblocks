import type { GameModule } from '@renderblocks/kernel'

export const story5Module: GameModule = {
  id: 'story5',
  title: 'Story5',
  tile: { color: '#c8643b', tagline: 'The Story of Numbers' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
