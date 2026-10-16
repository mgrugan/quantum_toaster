import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FluidParticlesBackground from './components/FluidParticlesBackground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluidParticlesBackground />
    <App />
  </StrictMode>,
)
