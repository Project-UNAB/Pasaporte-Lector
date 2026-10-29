import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ArrowLeft, Ban, Check, CheckCircle2, MapPin, Navigation, Radio, Search } from 'lucide-react'
import { bloques, config, paradas } from '../contenido.js'
import { MapaCampus } from '../componentes/MapaCampus'
import { Reloj } from '../componentes/Reloj'
import { paradaCompletada, siguienteParada, useJuego, type EstadoServidor } from '../juego'
import { mensajeError } from '../lib/errores'
import { codigoError, distanciaMetros, ignorarUbicacion, instruccionesPermiso, MENSAJE_SIN_HTTPS, pedirPosicion, type Posicion } from '../lib/geo'
import { supabase } from '../lib/supabase'
import { useUbicacion } from '../lib/useUbicacion'
import './parada.css'

type Resultado = 'correcta' | 'incorrecta' | 'espera' | 'expirado' | 'fuera_de_orden' | 'ya_completada' | 'ya_finalizado' | 'datos_incompletos' | 'parada_invalida' | 'sin_perfil'

export default function Parada() {
  const { id = '' } = useParams()
  const { estado, aplicar, refrescar } = useJuego()
  const { posicion, error: errorUbicacion, esperandoPermiso, reiniciar } = useUbicacion(true, { esperarToque: true })
  const [cerca, setCerca] = useState(false)
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
    let codigo = 0
    try {
      // Se pide directo desde el toque para que iPhone muestre el permiso; si falla, sirve la última posición conocida.
      if (!pos && !ignorarUbicacion) {
        try {
          pos = await pedirPosicion()
          reiniciar()
        } catch (err) {
          codigo = codigoError(err)
          pos = posicion
        }
      }
      if (ignorarUbicacion || (pos && distanciaMetros(pos, parada!) <= radio)) {
        setCerca(true)
        return
      }
      await registrar('ubicacion_fallida', pos)
      setAviso({
        tipo: 'info',
        texto: pos
          ? `Estás lejos de la parada (a unos ${Math.round(distanciaMetros(pos, parada!))} m). Acércate al póster e intenta de nuevo.`
          : !window.isSecureContext
            ? MENSAJE_SIN_HTTPS
            : codigo === 1
              ? instruccionesPermiso()
              : 'No logramos señal de GPS. Sal a un lugar abierto, espera unos segundos e intenta de nuevo.',
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
        // Con el estado nuevo, la parada ya figura completada y esta pantalla redirige
        // sola a su tarjeta (también en la novena, cuando la etapa pasa a biblioteca).
        await refrescar()
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
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <span className="chip">
          Bloque {parada.bloqueIndice + 1} · {bloque.nombre}
        </span>
      </div>

      <MapaCampus completadas={completadas} actual={id} posicion={posicion} enfocar={id} alto={180} />

      <div className="minirruta" aria-hidden="true">
        {bloque.paradas.map((p, i) => (
          <span key={p.id} className={completadas.has(p.id) ? 'hecha' : p.id === id ? 'actual' : ''}>
            {completadas.has(p.id) ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : i + 1}
          </span>
        ))}
      </div>

      {ignorarUbicacion && (
        <p className="aviso info" role="note">
          Modo pruebas: «Ya llegué» funciona aunque estés lejos.
        </p>
      )}

      <section className="tarjeta">
        <span className="chip">
          Parada {parada.indiceEnBloque + 1} de {bloque.paradas.length}
        </span>
        <h2 style={{ marginTop: 8 }}>{parada.lugar !== 'Por definir' ? parada.lugar : `Parada ${parada.posicion}`}</h2>
        <p className="mut">{parada.pista}</p>
        <p className={`estado-ubicacion${tecladoActivo ? ' ok' : ''}`}>
          {tecladoActivo ? (
            <>
              <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Ya estás aquí</span>
            </>
          ) : distancia === null ? (
            errorUbicacion?.code === 1 ? (
              <>
                <Ban size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>La ubicación está bloqueada. Actívala en los ajustes del navegador o toca “Ya llegué” para pedir ayuda.</span>
              </>
            ) : esperandoPermiso ? (
              <>
                <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Toca “Ya llegué” y permite el acceso a tu ubicación.</span>
              </>
            ) : (
              <>
                <Radio size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Buscando tu ubicación…</span>
              </>
            )
          ) : distancia <= radio ? (
            <>
              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Estás cerca. Toca “Ya llegué”.</span>
            </>
          ) : (
            <>
              <Navigation size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Estás a unos {distancia} m</span>
            </>
          )}
        </p>
      </section>

      {tecladoActivo ? (
        <form onSubmit={enviar} className="tarjeta aparece">
          <label htmlFor="palabra" className="etiqueta">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>Palabra clave del póster</span>
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
          <b className="etiqueta">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>Dato clave</span>
          </b>
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
