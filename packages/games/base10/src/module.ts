import type { GameModule } from '@renderblocks/kernel'

export const base10Module: GameModule = {
  id: 'base10',
  title: 'Base 10',
  tile: { color: '#2436A6', tagline: 'Place value to a billion' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
