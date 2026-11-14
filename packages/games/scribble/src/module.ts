import type { GameModule } from '@renderblocks/kernel'

export const scribbleModule: GameModule = {
  id: 'scribble',
  title: 'Scribble',
  tile: { color: '#334155', tagline: 'Write what is above each box' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
