import type { GameModule } from '@renderblocks/kernel'

export const scribbleModule: GameModule = {
  id: 'scribble',
  title: 'Scribble',
  tile: { color: '#334155', tagline: 'Empty boxes to write in' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
