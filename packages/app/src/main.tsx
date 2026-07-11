import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KernelApp } from '@renderblocks/kernel'
import './index.css'
import { games, upcoming } from './registry'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KernelApp games={games} upcoming={upcoming} />
  </StrictMode>,
)
