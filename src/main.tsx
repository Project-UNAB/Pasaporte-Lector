import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './estilos/base.css'
import { App } from './App'
import { ProveedorJuego } from './juego'

// Al reiniciar la base de datos se cambia esta versión: cada celular borra una sola vez su caché, su sesión y lo
// guardado de la partida, y empieza limpio desde la portada.
const VERSION_DATOS = '2026-10-29b'
try {
  if (localStorage.getItem('pl:version-datos') !== VERSION_DATOS) {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('pl:version-datos', VERSION_DATOS)
    if ('caches' in window) caches.keys().then((claves) => claves.forEach((c) => caches.delete(c))).catch(() => {})
  }
} catch {
  // Navegación privada o almacenamiento bloqueado: no hay nada que limpiar.
}

// Busca versiones nuevas al abrir, al volver a la pestaña y cada minuto; al encontrar una, la página se recarga sola.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    const buscar = () => registro.update().catch(() => {})
    setInterval(buscar, 60_000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && buscar())
  },
})

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
