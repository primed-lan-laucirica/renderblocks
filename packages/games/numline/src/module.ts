import type { GameModule } from '@renderblocks/kernel'

export const numlineModule: GameModule = {
  id: 'numline',
  title: 'Calc',
  tile: { color: '#FF7043', tagline: 'Number line math' },
  load: () => import('./App'),
  capabilities: ['audio'],
}
