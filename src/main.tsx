import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { registerServiceWorker } from '@/lib/registerServiceWorker'
import '@/styles/index.css'

// Punto de entrada: mete la aplicación dentro del <div id="root"> de index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
