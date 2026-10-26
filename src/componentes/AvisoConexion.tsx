import { useSyncExternalStore } from 'react'

function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

/** Franja fija cuando el celular pierde internet (en el campus pasa al cambiar de edificio). */
export function AvisoConexion() {
  const enLinea = useSyncExternalStore(suscribir, () => navigator.onLine, () => true)
  if (enLinea) return null
  return (
    <div className="aviso-conexion" role="status">
      Sin internet. Tu progreso está guardado; reintenta al recuperar la señal.
    </div>
  )
}
