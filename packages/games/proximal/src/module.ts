import type { GameModule } from '@renderblocks/kernel'

export const proximalModule: GameModule = {
  id: 'proximal',
  title: 'Proximal',
  tile: {
    color: '#1E293B',
    tagline: 'Curated math & discovery videos',
  },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
