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

// En iPhone el teclado tapa la parte baja de la pantalla: centrar el campo al enfocarlo.
document.addEventListener('focusin', (e) => {
  const el = e.target
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorJuego>
        <App />
      </ProveedorJuego>
    </BrowserRouter>
  </StrictMode>,
)
