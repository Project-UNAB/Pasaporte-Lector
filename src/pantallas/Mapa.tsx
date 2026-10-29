import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { Check, ChevronDown, ChevronUp, LocateFixed, Lock } from 'lucide-react'
import { bloques } from '../contenido.js'
import { IconoBloque } from '../componentes/Iconos'
import { MapaCampus } from '../componentes/MapaCampus'
import { Reloj } from '../componentes/Reloj'
import { siguienteParada, useJuego } from '../juego'
import { leer } from '../lib/almacen'
import { pedirPosicion } from '../lib/geo'
import { useUbicacion } from '../lib/useUbicacion'
import './mapa.css'

export default function Mapa() {
  const { estado } = useJuego()
  const explicada = leer('ubicacionExplicada') === 'si'
  const { posicion, reiniciar } = useUbicacion(explicada, { esperarToque: true })
  const completadas = useMemo(() => new Set(estado?.completadas.map((c) => c.parada)), [estado])
  const siguiente = siguienteParada(estado)

  const [expandido, setExpandido] = useState(false)
  const [recentrar, setRecentrar] = useState(0)

  // Sin posición todavía, el toque pide el permiso (en iPhone solo aparece así) y luego centra.
  function centrar() {
    if (posicion) return setRecentrar((n) => n + 1)
    pedirPosicion()
      .then(() => reiniciar())
      .catch(() => {})
      .finally(() => setRecentrar((n) => n + 1))
  }
  const [altoArrastre, setAltoArrastre] = useState<number | null>(null)
  const [altoExpandido, setAltoExpandido] = useState(230)
  const [relleno, setRelleno] = useState({ arriba: 96, abajo: 176 })

  const cabezaRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const interiorRef = useRef<HTMLDivElement>(null)
  const gestoRef = useRef<{ id: number; inicioY: number; altoBase: number; altoMax: number; movio: boolean } | null>(null)

  useEffect(() => {
    const medir = () => {
      if (interiorRef.current) {
        const maxVista = Math.round(window.innerHeight * 0.42)
        setAltoExpandido(Math.min(interiorRef.current.scrollHeight, maxVista))
      }
      const arriba = cabezaRef.current ? Math.round(cabezaRef.current.getBoundingClientRect().bottom) : 96
      const abajo = panelRef.current ? Math.round(panelRef.current.getBoundingClientRect().height) : 176
      setRelleno((prev) => (prev.arriba === arriba && prev.abajo === abajo ? prev : { arriba, abajo }))
    }
    medir()
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    if (cabezaRef.current) obs?.observe(cabezaRef.current)
    if (panelRef.current) obs?.observe(panelRef.current)
    if (interiorRef.current) obs?.observe(interiorRef.current)
    window.addEventListener('resize', medir)
    return () => {
      obs?.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [expandido])

  if (!explicada) return <Navigate to="/ubicacion" replace />

  const total = estado?.total || 9
  const hechas = completadas.size
  const bloqueActual = siguiente ? bloques[siguiente.bloqueIndice] : bloques[bloques.length - 1]
  const arrastrando = altoArrastre !== null

  function iniciarGesto(e: PointerEvent<HTMLButtonElement>) {
    const maxVista = Math.round(window.innerHeight * 0.42)
    const altoMax = interiorRef.current ? Math.min(interiorRef.current.scrollHeight, maxVista) : altoExpandido
    const altoBase = expandido ? altoMax : 0
    gestoRef.current = { id: e.pointerId, inicioY: e.clientY, altoBase, altoMax, movio: false }
    setAltoExpandido(altoMax)
    setAltoArrastre(altoBase)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moverGesto(e: PointerEvent<HTMLButtonElement>) {
    const g = gestoRef.current
    if (!g || g.id !== e.pointerId) return
    const dy = e.clientY - g.inicioY
    if (Math.abs(dy) > 6) g.movio = true
    const nuevoAlto = Math.max(0, Math.min(g.altoMax, g.altoBase - dy))
    setAltoArrastre(nuevoAlto)
  }

  function terminarGesto(e: PointerEvent<HTMLButtonElement>) {
    const g = gestoRef.current
    if (!g || g.id !== e.pointerId) return
    const dy = e.clientY - g.inicioY
    gestoRef.current = null
    setAltoArrastre(null)
    if (!g.movio) {
      setExpandido((v) => !v)
    } else if (dy < -28) {
      setExpandido(true)
    } else if (dy > 28) {
      setExpandido(false)
    } else {
      setExpandido(g.altoBase - dy > g.altoMax / 2)
    }
  }

  function cancelarGesto() {
    gestoRef.current = null
    setAltoArrastre(null)
  }

  const altoCuerpo = altoArrastre !== null ? altoArrastre : expandido ? altoExpandido : 0
  const progresoApertura = altoExpandido > 0 ? Math.min(1, Math.max(0, altoCuerpo / altoExpandido)) : expandido ? 1 : 0

  const estiloVariables = {
    '--alto-arriba': `${relleno.arriba}px`,
    '--alto-abajo': `${relleno.abajo}px`,
  } as CSSProperties

  return (
    <main className="pantalla mapa" style={estiloVariables}>
      <MapaCampus
        completadas={completadas}
        actual={siguiente?.id ?? null}
        posicion={posicion}
        completo
        relleno={relleno}
        recentrar={recentrar}
      />

      <header ref={cabezaRef} className="mapa-cabeza">
        <div className="mapa-cabeza-fila">
          <h1 className="titulo">Explora tu ruta</h1>
          <Reloj detalle />
        </div>
        <div className="mapa-progreso">
          <div
            className="barra"
            aria-label={`${hechas} de ${total} paradas`}
            role="progressbar"
            aria-valuenow={hechas}
            aria-valuemax={total}
          >
            <i style={{ width: `${(hechas / total) * 100}%` }} />
          </div>
          <span className="mapa-progreso-texto" aria-hidden="true">
            {hechas}/{total}
          </span>
        </div>
      </header>

      <button
        type="button"
        className="btn-ubicacion"
        aria-label="Centrar en mi ubicación"
        onClick={centrar}
      >
        <LocateFixed size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <section
        ref={panelRef}
        className={`mapa-panel${expandido ? ' expandido' : ''}${arrastrando ? ' arrastrando' : ''}`}
        aria-label="Tu recorrido"
      >
        <button
          type="button"
          className="panel-manija"
          aria-expanded={expandido}
          aria-label={expandido ? 'Ocultar bloques' : 'Ver bloques'}
          onPointerDown={iniciarGesto}
          onPointerMove={moverGesto}
          onPointerUp={terminarGesto}
          onPointerCancel={cancelarGesto}
        >
          <span className="panel-pildora" aria-hidden="true" />
          <span className="panel-resumen">
            <span className="panel-resumen-bloque">
              {bloqueActual.nombre} · {bloqueActual.zona}
            </span>
            <span className="panel-resumen-icono" aria-hidden="true">
              {expandido ? (
                <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <ChevronUp size={18} strokeWidth={1.75} aria-hidden="true" />
              )}
            </span>
          </span>
        </button>

        <div
          className="panel-expandible"
          style={{ height: `${altoCuerpo}px`, opacity: progresoApertura }}
          aria-hidden={!expandido && !arrastrando}
        >
          <div ref={interiorRef} className="panel-expandible-interior">
            <p className="mut panel-subtitulo">Termina cada bloque para abrir el siguiente.</p>
            <ol className="ruta">
              {bloques.map((b) => {
                const n = b.paradas.filter((p) => completadas.has(p.id)).length
                const estadoBloque =
                  n === b.paradas.length ? 'hecho' : b.paradas.some((p) => p.id === siguiente?.id) ? 'actual' : 'bloqueado'
                return (
                  <li key={b.id} className={`bloque ${estadoBloque}`}>
                    <span className="icono" aria-hidden="true">
                      {estadoBloque === 'hecho' ? (
                        <Check size={18} strokeWidth={2} aria-hidden="true" />
                      ) : estadoBloque === 'bloqueado' ? (
                        <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <IconoBloque icono={b.icono} size={18} strokeWidth={1.75} />
                      )}
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
          </div>
        </div>

        {siguiente && (
          <div className="panel-pie">
            <p className="mut mapa-siguiente">
              Siguiente: <b>{siguiente.lugar !== 'Por definir' ? siguiente.lugar : `Parada ${siguiente.posicion}`}</b> ·{' '}
              {siguiente.pista}
            </p>
            <Link className="btn" to={`/parada/${siguiente.id}`}>
              {hechas === 0 ? 'Comenzar viaje' : 'Continuar viaje'}
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
