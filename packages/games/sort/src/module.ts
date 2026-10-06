import type { GameModule } from '@renderblocks/kernel'

export const sortModule: GameModule = {
  id: 'sort',
  title: 'Sort',
  tile: { color: '#0EA5E9', tagline: 'Which group?' },
  load: () => import('./App'),
  capabilities: ['audio'],
}
