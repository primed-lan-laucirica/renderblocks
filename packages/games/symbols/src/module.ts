import type { GameModule } from '@renderblocks/kernel'

export const symbolsModule: GameModule = {
  id: 'symbols',
  title: 'Symbols',
  tile: { color: '#4f6d8f', tagline: 'What the signs say' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
