import type { GameModule } from '@renderblocks/kernel'

export const progressModule: GameModule = {
  id: 'progress',
  title: 'Progress',
  tile: { color: '#334155', tagline: 'What I know' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
