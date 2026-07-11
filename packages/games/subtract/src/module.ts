import type { GameModule } from '@renderblocks/kernel'

export const subtractModule: GameModule = {
  id: 'subtract',
  title: 'Subtract',
  tile: { color: '#00BCD4', tagline: 'Taking away' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
