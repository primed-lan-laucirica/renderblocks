import type { GameModule } from '@renderblocks/kernel'

export const shapesModule: GameModule = {
  id: 'shapes',
  title: 'Shapes',
  tile: { color: '#00BFFF', tagline: 'Puzzle play' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
