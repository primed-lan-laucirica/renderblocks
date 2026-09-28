import type { GameModule } from '@renderblocks/kernel'

export const calendarModule: GameModule = {
  id: 'calendar',
  title: 'Calendar',
  tile: { color: '#0F766E', tagline: 'Our days' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
