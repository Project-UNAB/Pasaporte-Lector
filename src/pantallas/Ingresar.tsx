import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { config, textos } from '../contenido.js'
import { Pasos } from '../componentes/Pasos'
import { useJuego, type EstadoServidor } from '../juego'
import { guardar, leer } from '../lib/almacen'
import { mensajeError } from '../lib/errores'
import { correoValido, normalizarCorreo } from '../lib/normalizar'
import { opcionesCodigo, supabase } from '../lib/supabase'

/** Crear cuenta o iniciar sesión: en los dos casos llega un código de 6 dígitos al correo. */
export function Ingresar() {
  const { etapa, aplicar, salir } = useJuego()
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const [correo, setCorreo] = useState(() => leer('correo') ?? '')
  const [acepta, setAcepta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  // Ya verificó el código pero nunca aceptó la autorización (cuenta creada a medias).
  const yaVerificado = etapa === 'consentimiento'
  const crear = !yaVerificado && parametros.get('modo') !== 'entrar'
  const pideAutorizacion = crear || yaVerificado
  const correoNorm = normalizarCorreo(correo)
  const dominioOk = correoValido(correoNorm, config.dominioCorreo)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pideAutorizacion && !acepta) return setError('Debes aceptar la autorización de datos para continuar.')
    setEnviando(true)
    try {
      if (yaVerificado) {
        const { data, error } = await supabase.rpc('iniciar_juego', { p_consentimiento: true })
        if (error) throw error
        aplicar(data as EstadoServidor)
        return
      }
      if (!dominioOk) throw new Error(`Usa tu correo @${config.dominioCorreo}.`)
      const { error } = await supabase.auth.signInWithOtp({ email: correoNorm, options: opcionesCodigo(crear) })
      if (error) throw error
      guardar('correo', correoNorm)
      guardar('modo', crear ? 'crear' : 'entrar')
      guardar('consentimiento', crear ? 'si' : null)
      guardar('codigoEnviado', String(Date.now()))
      navegar('/codigo')
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('Usa tu') ? err.message : mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const titulo = yaVerificado ? 'Antes de empezar' : crear ? 'Crea tu cuenta' : 'Inicia sesión'
  const subtitulo = yaVerificado
    ? 'Acepta la autorización de datos para comenzar tu viaje.'
    : crear
      ? `Te enviaremos un código de verificación de 6 dígitos. Solo correos @${config.dominioCorreo}.`
      : 'Te enviaremos un código de verificación de 6 dígitos para volver a tu viaje.'

  return (
    <main className="pantalla">
      {crear || yaVerificado ? <Pasos actual={1} /> : <div style={{ height: 8 }} />}
      <h1 className="titulo">{titulo}</h1>
      <p className="mut">{subtitulo}</p>

      <form onSubmit={enviar} className="aparece" style={{ display: 'contents' }}>
        {!yaVerificado && (
          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input
              id="correo"
              className="entrada"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              placeholder={`nombre@${config.dominioCorreo}`}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>
        )}

        {pideAutorizacion && (
          <label className="check">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
            <span>{textos.autorizacionDatos}</span>
          </label>
        )}

        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}

        <div className="pie">
          <button className="btn" disabled={enviando || (pideAutorizacion && !acepta) || (!yaVerificado && !dominioOk)}>
            {enviando ? 'Un momento…' : yaVerificado ? 'Comenzar' : 'Enviar código'}
          </button>
          {yaVerificado ? (
            <button type="button" className="enlace" onClick={salir}>
              Usar otro correo
            </button>
          ) : crear ? (
            <Link className="enlace" to="/ingresar?modo=entrar" replace style={{ textAlign: 'center' }}>
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          ) : (
            <Link className="enlace" to="/ingresar" replace style={{ textAlign: 'center' }}>
              ¿No tienes cuenta? Créala aquí
            </Link>
          )}
        </div>
      </form>
    </main>
  )
}
