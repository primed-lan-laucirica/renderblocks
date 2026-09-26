import type { GameModule } from '@renderblocks/kernel'

export const wordsModule: GameModule = {
  id: 'words',
  title: 'Words',
  tile: { color: '#0EA5E9', tagline: 'Sound it out' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
