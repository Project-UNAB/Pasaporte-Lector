import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { bloques, config, paradas } from '../contenido.js'
import { MapaCampus } from '../componentes/MapaCampus'
import { Reloj } from '../componentes/Reloj'
import { paradaCompletada, siguienteParada, useJuego, type EstadoServidor } from '../juego'
import { mensajeError } from '../lib/errores'
import { distanciaMetros, ignorarUbicacion, pedirPosicion, type Posicion } from '../lib/geo'
import { supabase } from '../lib/supabase'
import { useUbicacion } from '../lib/useUbicacion'
import './parada.css'

type Resultado = 'correcta' | 'incorrecta' | 'espera' | 'expirado' | 'fuera_de_orden' | 'ya_completada' | 'ya_finalizado' | 'datos_incompletos' | 'parada_invalida' | 'sin_perfil'

export default function Parada() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { estado, aplicar, refrescar } = useJuego()
  const { posicion } = useUbicacion()
  const [cerca, setCerca] = useState(ignorarUbicacion)
  const [buscando, setBuscando] = useState(false)
  const [palabra, setPalabra] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'info' | 'ok'; texto: string } | null>(null)

  const parada = paradas.find((p) => p.id === id)
  const completadas = useMemo(() => new Set(estado?.completadas.map((c) => c.parada)), [estado])

  if (!parada) return <Navigate to="/mapa" replace />
  if (paradaCompletada(estado, id)) return <Navigate to={`/tarjeta/${id}`} replace />
  const siguiente = siguienteParada(estado)
  if (siguiente && siguiente.id !== id) return <Navigate to={`/parada/${siguiente.id}`} replace />

  const bloque = bloques[parada.bloqueIndice]
  const radio = parada.radio ?? config.radioPorDefecto
  const fallos = estado?.fallos_ubicacion[id] ?? 0
  const ayudaUsada = estado?.ayuda_usada.includes(id) ?? false
  const tecladoActivo = cerca || ayudaUsada
  const mostrarAyuda = !tecladoActivo && fallos >= config.intentosParaAyuda
  const distancia = posicion ? Math.round(distanciaMetros(posicion, parada)) : null

  async function registrar(tipo: 'ubicacion_fallida' | 'ayuda_usada', pos: Posicion | null) {
    const { data, error } = await supabase.rpc('registrar_ubicacion', {
      p_parada: id,
      p_tipo: tipo,
      p_lat: pos?.lat ?? null,
      p_lng: pos?.lng ?? null,
      p_precision: pos?.precision ?? null,
    })
    if (error) throw error
    aplicar(data as EstadoServidor)
  }

  async function yaLlegue() {
    setAviso(null)
    setBuscando(true)
    let pos: Posicion | null = posicion && Date.now() - posicion.fecha < 10000 ? posicion : null
    try {
      if (!pos) pos = await pedirPosicion().catch(() => null)
      if (pos && distanciaMetros(pos, parada!) <= radio) {
        setCerca(true)
        setAviso({ tipo: 'ok', texto: '¡Ya estás aquí! Busca la palabra clave en el póster.' })
        return
      }
      await registrar('ubicacion_fallida', pos)
      setAviso({
        tipo: 'info',
        texto: pos
          ? `Estás lejos de la parada (a unos ${Math.round(distanciaMetros(pos, parada!))} m). Acércate al póster e intenta de nuevo.`
          : 'No pudimos obtener tu ubicación. Revisa que esté activada e intenta de nuevo.',
      })
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) })
    } finally {
      setBuscando(false)
    }
  }

  async function pedirAyuda() {
    setAviso(null)
    try {
      await registrar('ayuda_usada', posicion)
      setAviso({ tipo: 'ok', texto: 'Listo. Escribe la palabra clave del póster.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) })
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!palabra.trim() || enviando) return
    setAviso(null)
    setEnviando(true)
    try {
      const { data, error } = await supabase.rpc('enviar_palabra', {
        p_parada: id,
        p_palabra: palabra,
        p_lat: posicion?.lat ?? null,
        p_lng: posicion?.lng ?? null,
        p_precision: posicion?.precision ?? null,
      })
      if (error) throw error
      const r = (data as { resultado: Resultado }).resultado
      if (r === 'correcta') {
        if ('vibrate' in navigator) navigator.vibrate?.(60)
        await refrescar()
        navegar(`/tarjeta/${id}`, { replace: true, state: { nueva: true } })
        return
      }
      if (r === 'incorrecta') setAviso({ tipo: 'error', texto: 'Esa no es la palabra. Mira bien el póster e intenta de nuevo.' })
      else if (r === 'espera') setAviso({ tipo: 'info', texto: 'Demasiados intentos. Espera un minuto y vuelve a probar.' })
      else await refrescar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pantalla parada">
      <div className="parada-cabeza">
        <Link to="/mapa" className="volver" aria-label="Volver al mapa">
          ←
        </Link>
        <span className="chip">
          Bloque {parada.bloqueIndice + 1} · {bloque.nombre}
        </span>
      </div>

      <MapaCampus completadas={completadas} actual={id} posicion={posicion} enfocar={id} alto={190} />

      <div className="minirruta" aria-hidden="true">
        {bloque.paradas.map((p, i) => (
          <span key={p.id} className={completadas.has(p.id) ? 'hecha' : p.id === id ? 'actual' : ''}>
            {completadas.has(p.id) ? '✓' : i + 1}
          </span>
        ))}
      </div>

      <section className="tarjeta">
        <span className="chip">
          Parada {parada.indiceEnBloque + 1} de {bloque.paradas.length}
        </span>
        <h2 style={{ marginTop: 6 }}>{parada.lugar !== 'Por definir' ? parada.lugar : `Parada ${parada.posicion}`}</h2>
        <p className="mut">{parada.pista}</p>
        <p className={`estado-ubicacion${tecladoActivo ? ' ok' : ''}`}>
          {tecladoActivo
            ? '✅ Ya estás aquí'
            : distancia === null
              ? '📡 Buscando tu ubicación…'
              : distancia <= radio
                ? '📍 Estás cerca. Toca “Ya llegué”.'
                : `🚶 Estás a unos ${distancia} m`}
        </p>
      </section>

      {tecladoActivo ? (
        <form onSubmit={enviar} className="tarjeta aparece">
          <label htmlFor="palabra" className="etiqueta">
            🔎 Palabra clave del póster
          </label>
          <input
            id="palabra"
            className="entrada"
            style={{ marginTop: 8 }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            maxLength={64}
            placeholder="Escríbela aquí"
            value={palabra}
            onChange={(e) => setPalabra(e.target.value)}
            autoFocus
          />
          <button className="btn dorado" style={{ marginTop: 12 }} disabled={enviando || !palabra.trim()}>
            {enviando ? 'Revisando…' : 'Sellar parada'}
          </button>
        </form>
      ) : (
        <div className="tarjeta suave">
          <b>🔎 Dato clave</b>
          <p className="mut">Se desbloquea al llegar al póster y escribir su palabra.</p>
        </div>
      )}

      {aviso && (
        <p className={`aviso ${aviso.tipo}`} role="alert">
          {aviso.texto}
        </p>
      )}

      <div className="pie">
        <Reloj />
        {!tecladoActivo && (
          <button className="btn" onClick={yaLlegue} disabled={buscando}>
            {buscando ? 'Revisando ubicación…' : 'Ya llegué'}
          </button>
        )}
        {mostrarAyuda && (
          <button className="enlace" onClick={pedirAyuda}>
            ¿Ya estás frente al póster y no funciona?
          </button>
        )}
      </div>
    </main>
  )
}
