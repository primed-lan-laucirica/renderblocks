import type { GameModule } from '@renderblocks/kernel'

export const traceModule: GameModule = {
  id: 'trace',
  title: 'Trace',
  tile: { color: '#0EA5E9', tagline: 'Trace, then less and less help' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
