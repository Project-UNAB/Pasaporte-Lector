import { useEffect, useState } from 'react'
import { aPosicion, type Posicion } from './geo'

/** Sigue la posición mientras la pantalla está abierta. */
export function useUbicacion(activa = true) {
  const [posicion, setPosicion] = useState<Posicion | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  useEffect(() => {
    if (!activa || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosicion(aPosicion(p))
        setError(null)
      },
      setError,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [activa])

  return { posicion, error }
}
