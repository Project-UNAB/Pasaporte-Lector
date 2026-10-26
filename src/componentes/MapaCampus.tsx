import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { config, paradas } from '../contenido.js'
import type { Posicion } from '../lib/geo'
import './mapa-campus.css'

const COLOR = { hecha: '#2fa57e', actual: '#eab83c', bloqueada: '#9aa8a3' }

interface Props {
  completadas: Set<string>
  actual: string | null
  posicion: Posicion | null
  /** Si se pasa, el mapa se centra en esta parada. */
  enfocar?: string
  alto?: number
}

/** Campus en gris; cada parada se colorea al completarla. */
export function MapaCampus({ completadas, actual, posicion, enfocar, alto = 260 }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capaParadas = useRef<L.LayerGroup | null>(null)
  const yo = useRef<L.CircleMarker | null>(null)
  const yoPrecision = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!caja.current) return
    const foco = paradas.find((p) => p.id === enfocar)
    const m = L.map(caja.current, {
      center: foco ? [foco.lat, foco.lng] : [config.centroMapa.lat, config.centroMapa.lng],
      zoom: config.zoomMapa,
      zoomControl: false,
      attributionControl: true,
      tap: false,
    } as L.MapOptions)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'mapa-gris',
      attribution: '© OpenStreetMap',
    }).addTo(m)
    // En la vista general se ven todas las paradas; en una parada, se centra en ella.
    if (!foco) m.fitBounds(L.latLngBounds(paradas.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [24, 24], maxZoom: config.zoomMapa })
    capaParadas.current = L.layerGroup().addTo(m)
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
      yo.current = null
      yoPrecision.current = null
    }
  }, [enfocar])

  useEffect(() => {
    const capa = capaParadas.current
    if (!capa) return
    capa.clearLayers()
    for (const p of paradas) {
      const tipo = completadas.has(p.id) ? 'hecha' : p.id === actual ? 'actual' : 'bloqueada'
      L.circle([p.lat, p.lng], {
        radius: p.radio ?? config.radioPorDefecto,
        color: COLOR[tipo],
        weight: tipo === 'actual' ? 3 : 1.5,
        fillColor: COLOR[tipo],
        fillOpacity: tipo === 'bloqueada' ? 0.12 : 0.35,
        dashArray: tipo === 'actual' ? '6 6' : undefined,
        interactive: false,
      }).addTo(capa)
      L.marker([p.lat, p.lng], {
        interactive: false,
        icon: L.divIcon({
          className: `pin-parada ${tipo}`,
          html: tipo === 'hecha' ? '✓' : tipo === 'bloqueada' ? '🔒' : String(p.posicion),
          iconSize: [28, 28],
        }),
      }).addTo(capa)
    }
  }, [completadas, actual, enfocar])

  useEffect(() => {
    const m = mapa.current
    if (!m || !posicion) return
    const ll: L.LatLngTuple = [posicion.lat, posicion.lng]
    if (!yo.current) {
      yoPrecision.current = L.circle(ll, { radius: posicion.precision, color: '#2c6fb3', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(m)
      yo.current = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2c6fb3', fillOpacity: 1, interactive: false }).addTo(m)
    } else {
      yo.current.setLatLng(ll)
      yoPrecision.current?.setLatLng(ll).setRadius(posicion.precision)
    }
  }, [posicion])

  return <div ref={caja} className="mapa-campus" style={{ height: alto }} role="img" aria-label="Mapa del campus con las paradas" />
}
