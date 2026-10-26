import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito'
import './estilos/base.css'
import { App } from './App'
import { ProveedorJuego } from './juego'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorJuego>
        <App />
      </ProveedorJuego>
    </BrowserRouter>
  </StrictMode>,
)
