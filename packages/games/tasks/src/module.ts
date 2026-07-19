import type { GameModule } from '@renderblocks/kernel'

export const tasksModule: GameModule = {
  id: 'tasks',
  title: 'Tasks',
  tile: { color: '#5C6BC0', tagline: 'My routines' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
