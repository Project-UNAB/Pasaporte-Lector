import { useState } from 'react'
import { paradas } from '../contenido.js'
import { Volver } from '../componentes/Volver'
import { guardar, leer } from '../lib/almacen'
import { useUbicacion } from '../lib/useUbicacion'

interface Lectura {
  parada: string
  lat: number
  lng: number
  precision: number
}

const formato = (l: Lectura) => `${l.parada}: ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${Math.round(l.precision)} m)`

/** Página oculta para que el cliente tome las coordenadas de cada póster. */
export default function Calibrar() {
  const [activa, setActiva] = useState(false)
  const { posicion, error } = useUbicacion(activa)
  const [parada, setParada] = useState(paradas[0].id)
  const [lecturas, setLecturas] = useState<Lectura[]>(() => {
    try {
      return JSON.parse(leer('calibracion') ?? '[]')
    } catch {
      return []
    }
  })
  const [copiado, setCopiado] = useState('')

  const coord = posicion ? `${posicion.lat.toFixed(6)}, ${posicion.lng.toFixed(6)}` : '—'

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(que)
      setTimeout(() => setCopiado(''), 1500)
    } catch {
      setCopiado('No se pudo copiar')
    }
  }

  function anotar() {
    if (!posicion) return
    const nuevas = [...lecturas.filter((l) => l.parada !== parada), { parada, lat: posicion.lat, lng: posicion.lng, precision: posicion.precision }]
    setLecturas(nuevas)
    guardar('calibracion', JSON.stringify(nuevas))
  }

  return (
    <main className="pantalla">
      <Volver a="/" etiqueta="Volver al inicio" />
      <h1 className="titulo">Calibrar paradas</h1>
      <p className="mut">Párate junto al póster, espera unos 10 segundos a que la precisión baje y anota la coordenada. Mejor al aire libre o junto a una ventana.</p>

      {!activa ? (
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setActiva(true)}>
          Activar ubicación
        </button>
      ) : (
        <section className="tarjeta">
          <p className="etiqueta">Coordenada actual</p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{coord}</p>
          <p className="mut">
            Precisión: {posicion ? `±${Math.round(posicion.precision)} m` : '—'}
            {posicion && posicion.precision > 25 ? ' · espera a que baje' : ''}
          </p>
          {error && <p className="aviso error">{error.code === 1 ? 'Permiso de ubicación negado.' : 'Sin señal de GPS.'}</p>}
          <button className="btn suave" style={{ marginTop: 12 }} disabled={!posicion} onClick={() => copiar(coord, 'actual')}>
            {copiado === 'actual' ? '¡Copiado!' : 'Copiar coordenada'}
          </button>
        </section>
      )}

      <section className="tarjeta">
        <label className="etiqueta" htmlFor="parada">
          Anotar para la parada
        </label>
        <select id="parada" className="entrada" style={{ marginTop: 8 }} value={parada} onChange={(e) => setParada(e.target.value)}>
          {paradas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {p.lugar}
            </option>
          ))}
        </select>
        <button className="btn" style={{ marginTop: 12 }} disabled={!posicion} onClick={anotar}>
          Anotar aquí
        </button>
        {lecturas.length > 0 && (
          <>
            <ul style={{ marginTop: 12, paddingLeft: 18, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
              {lecturas.map((l) => (
                <li key={l.parada}>{formato(l)}</li>
              ))}
            </ul>
            <button className="btn suave" style={{ marginTop: 12 }} onClick={() => copiar(lecturas.map(formato).join('\n'), 'todas')}>
              {copiado === 'todas' ? '¡Copiado!' : 'Copiar todas'}
            </button>
          </>
        )}
      </section>
    </main>
  )
}
