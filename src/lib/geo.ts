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

/** Modo pruebas: «Ya llegué» funciona aunque estés lejos. Apagarlo (false) antes del lanzamiento. */
export const ignorarUbicacion = import.meta.env.VITE_IGNORAR_UBICACION === 'true'

export function aPosicion(p: GeolocationPosition): Posicion {
  return { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, fecha: p.timestamp }
}

function obtener(opciones: PositionOptions): Promise<Posicion> {
  return new Promise((ok, mal) => {
    if (!('geolocation' in navigator)) return mal(new Error('sin_geolocalizacion'))
    navigator.geolocation.getCurrentPosition((p) => ok(aPosicion(p)), mal, opciones)
  })
}

/**
 * Pide la posición. Llamarla directo desde el toque de un botón: así iPhone muestra el permiso en ese momento.
 * Si el GPS preciso no responde a tiempo (común en iPhone bajo techo), se reintenta con la ubicación normal.
 */
export async function pedirPosicion(): Promise<Posicion> {
  try {
    return await obtener({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 })
  } catch (err) {
    if (codigoError(err) === 1) throw err
    return obtener({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 })
  }
}

/** 1 = permiso negado, 2 = sin señal, 3 = tardó demasiado, 0 = el navegador no tiene GPS. */
export function codigoError(err: unknown): number {
  return typeof err === 'object' && err !== null && 'code' in err ? Number((err as GeolocationPositionError).code) : 0
}

const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Sin https el navegador bloquea la ubicación sin mostrar ningún aviso. */
export const MENSAJE_SIN_HTTPS = 'La ubicación solo funciona si la dirección de la página empieza por https://. Ábrela así e intenta de nuevo.'

/** Qué hacer cuando la ubicación está bloqueada, según el celular. */
export function instruccionesPermiso(): string {
  return esIOS()
    ? 'La ubicación está bloqueada para esta página. En Safari toca «aA» junto a la dirección → Configuración del sitio web → Ubicación → Permitir. Revisa también Ajustes → Privacidad y seguridad → Localización → Sitios web de Safari → «Al usar la app», con «Ubicación exacta» activada.'
    : 'La ubicación está bloqueada para esta página. Toca el ícono a la izquierda de la dirección → Permisos → Ubicación → Permitir, y revisa que la ubicación del celular esté encendida.'
}

/** Si el navegador lo informa, dice si el permiso ya está concedido, negado o por preguntar. */
export async function estadoPermiso(): Promise<PermissionState | 'desconocido'> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state
  } catch {
    return 'desconocido'
  }
}
