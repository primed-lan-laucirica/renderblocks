import type { GameModule } from '@renderblocks/kernel'

export const magcubesModule: GameModule = {
  id: 'magcubes',
  title: 'MagCubes',
  tile: { color: '#0891B2', tagline: 'Build with magnets' },
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
