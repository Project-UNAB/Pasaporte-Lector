import { useMemo } from 'react'
import { Link, Navigate } from 'react-router'
import { bloques } from '../contenido.js'
import { MapaCampus } from '../componentes/MapaCampus'
import { Reloj } from '../componentes/Reloj'
import { siguienteParada, useJuego } from '../juego'
import { leer } from '../lib/almacen'
import { useUbicacion } from '../lib/useUbicacion'
import './mapa.css'

export default function Mapa() {
  const { estado } = useJuego()
  const explicada = leer('ubicacionExplicada') === 'si'
  const { posicion } = useUbicacion(explicada)
  const completadas = useMemo(() => new Set(estado?.completadas.map((c) => c.parada)), [estado])
  const siguiente = siguienteParada(estado)

  if (!explicada) return <Navigate to="/ubicacion" replace />

  const total = estado?.total || 9
  const hechas = completadas.size

  return (
    <main className="pantalla mapa">
      <div className="mapa-cabeza">
        <div>
          <h1 className="titulo">Explora tu ruta</h1>
          <p className="mut">Termina cada bloque para abrir el siguiente.</p>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Reloj detalle />
      </div>

      <div style={{ marginTop: 12 }}>
        <MapaCampus completadas={completadas} actual={siguiente?.id ?? null} posicion={posicion} alto={230} />
      </div>

      <ol className="ruta">
        {bloques.map((b) => {
          const n = b.paradas.filter((p) => completadas.has(p.id)).length
          const estadoBloque = n === b.paradas.length ? 'hecho' : b.paradas.some((p) => p.id === siguiente?.id) ? 'actual' : 'bloqueado'
          return (
            <li key={b.id} className={`bloque ${estadoBloque}`}>
              <span className="icono" aria-hidden="true">
                {estadoBloque === 'hecho' ? '✓' : estadoBloque === 'bloqueado' ? '🔒' : b.icono}
              </span>
              <div>
                <b>{b.nombre}</b>
                <small>
                  {b.zona} · {n} de {b.paradas.length} paradas
                </small>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="barra" aria-label={`${hechas} de ${total} paradas`} role="progressbar" aria-valuenow={hechas} aria-valuemax={total}>
        <i style={{ width: `${(hechas / total) * 100}%` }} />
      </div>

      <div className="pie">
        {siguiente && (
          <>
            <p className="mut" style={{ textAlign: 'center' }}>
              Siguiente: <b>{siguiente.lugar !== 'Por definir' ? siguiente.lugar : `Parada ${siguiente.posicion}`}</b> · {siguiente.pista}
            </p>
            <Link className="btn" to={`/parada/${siguiente.id}`}>
              {hechas === 0 ? 'Comenzar viaje' : 'Continuar viaje'}
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
