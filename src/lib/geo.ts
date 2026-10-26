export interface Posicion {
  lat: number
  lng: number
  precision: number
  fecha: number
}

const R = 6371000

/** Distancia en metros entre dos coordenadas (fórmula del semiverseno). */
export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function estaCerca(pos: Posicion, punto: { lat: number; lng: number }, radio: number): boolean {
  return distanciaMetros(pos, punto) <= radio
}

export const ignorarUbicacion = import.meta.env.DEV && import.meta.env.VITE_IGNORAR_UBICACION === 'true'

export type EstadoPermiso = 'concedido' | 'denegado' | 'preguntar' | 'desconocido'

export async function permisoUbicacion(): Promise<EstadoPermiso> {
  try {
    const r = await navigator.permissions?.query({ name: 'geolocation' })
    if (!r) return 'desconocido'
    return r.state === 'granted' ? 'concedido' : r.state === 'denied' ? 'denegado' : 'preguntar'
  } catch {
    return 'desconocido'
  }
}

export function aPosicion(p: GeolocationPosition): Posicion {
  return { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, fecha: p.timestamp }
}

export function pedirPosicion(): Promise<Posicion> {
  return new Promise((ok, mal) => {
    if (!('geolocation' in navigator)) return mal(new Error('sin_geolocalizacion'))
    navigator.geolocation.getCurrentPosition((p) => ok(aPosicion(p)), mal, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    })
  })
}
