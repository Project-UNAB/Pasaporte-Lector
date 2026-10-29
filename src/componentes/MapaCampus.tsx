import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { config, paradas } from '../contenido.js'
import type { Posicion } from '../lib/geo'
import './mapa-campus.css'

const SVG_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

const SVG_LOCK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'

interface RellenoMapa {
  arriba?: number
  abajo?: number
}

interface Props {
  completadas: Set<string>
  actual: string | null
  posicion: Posicion | null
  /** Si se pasa, el mapa se centra en esta parada. */
  enfocar?: string
  alto?: number
  /** Modo a pantalla completa (sin bordes redondeados, ocupa el 100% del contenedor). */
  completo?: boolean
  /** Espacio ocupado por controles flotantes superior e inferior para encuadrar las paradas. */
  relleno?: RellenoMapa
  /** Contador incremental para recentrar el mapa en la ubicación del usuario o en la ruta. */
  recentrar?: number
}

/** Campus en gris; cada parada se colorea al completarla. */
export function MapaCampus({
  completadas,
  actual,
  posicion,
  enfocar,
  alto = 260,
  completo = false,
  relleno,
  recentrar = 0,
}: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capaParadas = useRef<L.LayerGroup | null>(null)
  const yo = useRef<L.CircleMarker | null>(null)
  const yoPrecision = useRef<L.Circle | null>(null)
  const posicionRef = useRef<Posicion | null>(posicion)
  posicionRef.current = posicion

  const encuadrarParadas = useCallback(
    (m: L.Map, animar = false) => {
      const limites = L.latLngBounds(paradas.map((p) => [p.lat, p.lng] as L.LatLngTuple))
      const arriba = (relleno?.arriba ?? 0) + 24
      const abajo = (relleno?.abajo ?? 0) + 24
      m.fitBounds(limites, {
        paddingTopLeft: [28, arriba],
        paddingBottomRight: [28, abajo],
        maxZoom: config.zoomMapa,
        animate: animar,
      })
    },
    [relleno?.arriba, relleno?.abajo],
  )

  useEffect(() => {
    const contenedor = caja.current
    if (!contenedor) return
    const foco = paradas.find((p) => p.id === enfocar)
    const m = L.map(contenedor, {
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
    if (!foco) {
      const limites = L.latLngBounds(paradas.map((p) => [p.lat, p.lng] as L.LatLngTuple))
      m.fitBounds(limites, { padding: [24, 24], maxZoom: config.zoomMapa })
    }
    capaParadas.current = L.layerGroup().addTo(m)
    mapa.current = m

    const observador =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            m.invalidateSize()
          })
        : null
    observador?.observe(contenedor)

    return () => {
      observador?.disconnect()
      m.remove()
      mapa.current = null
      yo.current = null
      yoPrecision.current = null
    }
  }, [enfocar])

  useEffect(() => {
    const m = mapa.current
    if (!m || enfocar) return
    m.invalidateSize()
    encuadrarParadas(m, false)
  }, [enfocar, encuadrarParadas])

  useEffect(() => {
    if (!recentrar) return
    const m = mapa.current
    if (!m) return
    m.invalidateSize()
    const pos = posicionRef.current
    if (pos) {
      m.setView([pos.lat, pos.lng], Math.max(m.getZoom(), config.zoomMapa), { animate: true })
    } else if (!enfocar) {
      encuadrarParadas(m, true)
    }
  }, [recentrar, enfocar, encuadrarParadas])

  useEffect(() => {
    const capa = capaParadas.current
    if (!capa) return
    capa.clearLayers()

    // Línea sutil que conecta el recorrido entre paradas
    L.polyline(
      paradas.map((p) => [p.lat, p.lng] as L.LatLngTuple),
      {
        color: '#8a9994',
        weight: 1.5,
        dashArray: '3 6',
        opacity: 0.55,
        interactive: false,
      },
    ).addTo(capa)

    for (const p of paradas) {
      const tipo = completadas.has(p.id) ? 'hecha' : p.id === actual ? 'actual' : 'bloqueada'
      const mostrarRango = tipo === 'actual' || p.id === enfocar

      if (mostrarRango) {
        L.circle([p.lat, p.lng], {
          radius: p.radio ?? config.radioPorDefecto,
          color: '#0f5243',
          weight: 1.25,
          opacity: 0.45,
          fillColor: '#1b7a64',
          fillOpacity: 0.08,
          dashArray: '4 5',
          interactive: false,
        }).addTo(capa)
      }

      const lado = tipo === 'actual' ? 32 : tipo === 'hecha' ? 24 : 22
      L.marker([p.lat, p.lng], {
        interactive: false,
        zIndexOffset: tipo === 'actual' ? 1000 : tipo === 'hecha' ? 400 : 0,
        icon: L.divIcon({
          className: `pin-parada ${tipo}`,
          html: `<span>${tipo === 'hecha' ? SVG_CHECK : tipo === 'bloqueada' ? SVG_LOCK : String(p.posicion)}</span>`,
          iconSize: [lado, lado],
          iconAnchor: [lado / 2, lado / 2],
        }),
      }).addTo(capa)
    }
  }, [completadas, actual, enfocar])

  useEffect(() => {
    const m = mapa.current
    if (!m || !posicion) return
    const ll: L.LatLngTuple = [posicion.lat, posicion.lng]
    if (!yo.current) {
      yoPrecision.current = L.circle(ll, {
        radius: posicion.precision,
        color: '#2c6fb3',
        weight: 1,
        opacity: 0.35,
        fillColor: '#2c6fb3',
        fillOpacity: 0.07,
        interactive: false,
      }).addTo(m)
      yo.current = L.circleMarker(ll, {
        radius: 6,
        color: '#ffffff',
        weight: 2.5,
        fillColor: '#2c6fb3',
        fillOpacity: 1,
        interactive: false,
      }).addTo(m)
    } else {
      yo.current.setLatLng(ll)
      yoPrecision.current?.setLatLng(ll).setRadius(posicion.precision)
    }
  }, [posicion])

  return (
    <div
      ref={caja}
      className={`mapa-campus${completo ? ' completo' : ''}`}
      style={completo ? undefined : { height: alto }}
      role="img"
      aria-label="Mapa del campus con las paradas"
    />
  )
}
