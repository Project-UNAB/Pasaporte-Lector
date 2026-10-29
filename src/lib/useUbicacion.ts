import { useCallback, useEffect, useState } from 'react'
import { aPosicion, estadoPermiso, type Posicion } from './geo'

/**
 * Sigue la posición mientras la pantalla está abierta.
 * Con `esperarToque`, si el permiso aún no se ha dado no se pide al abrir la pantalla (en iPhone el aviso
 * saldría sin que la persona lo espere); se espera a que toque un botón y llame a `reiniciar()`.
 */
export function useUbicacion(activa = true, { esperarToque = false } = {}) {
  const [posicion, setPosicion] = useState<Posicion | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)
  const [esperandoPermiso, setEsperandoPermiso] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!activa || !('geolocation' in navigator)) return
    let vivo = true
    let id: number | null = null
    estadoPermiso().then((estado) => {
      if (!vivo) return
      if (esperarToque && intento === 0 && estado === 'prompt') return setEsperandoPermiso(true)
      setEsperandoPermiso(false)
      id = navigator.geolocation.watchPosition(
        (p) => {
          setPosicion(aPosicion(p))
          setError(null)
        },
        setError,
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
      )
    })
    return () => {
      vivo = false
      if (id !== null) navigator.geolocation.clearWatch(id)
    }
  }, [activa, esperarToque, intento])

  const reiniciar = useCallback(() => setIntento((n) => n + 1), [])
  return { posicion, error, esperandoPermiso, reiniciar }
}
