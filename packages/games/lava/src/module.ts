import type { GameModule } from '@renderblocks/kernel'

export const lavaModule: GameModule = {
  id: 'lava',
  title: 'LavaBlocks',
  tile: { color: '#EA580C', tagline: 'Floor is lava' },
  // Loaded on tap: keeps Rapier's ~2 MB WASM out of app start-up.
  load: () => import('./App'),
  capabilities: ['audio', 'storage'],
}
