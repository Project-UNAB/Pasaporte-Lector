import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { config, textos } from '../contenido.js'
import { Pasos } from '../componentes/Pasos'
import { useJuego, type EstadoServidor } from '../juego'
import { guardar, leer } from '../lib/almacen'
import { mensajeError } from '../lib/errores'
import { normalizarCorreo } from '../lib/normalizar'
import { supabase } from '../lib/supabase'

export function Ingresar() {
  const { etapa, aplicar, salir } = useJuego()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState(() => leer('correo') ?? '')
  const [acepta, setAcepta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const yaVerificado = etapa === 'consentimiento'
  const correoNorm = normalizarCorreo(correo)
  const dominioOk = new RegExp(`^[^\s@]+@${config.dominioCorreo.replace(/\./g, '\.')}$`).test(correoNorm)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!acepta) return setError('Debes aceptar la autorización de datos para continuar.')
    setEnviando(true)
    try {
      if (yaVerificado) {
        const { data, error } = await supabase.rpc('iniciar_juego', { p_consentimiento: true })
        if (error) throw error
        aplicar(data as EstadoServidor)
        return
      }
      if (!dominioOk) throw new Error(`Usa tu correo @${config.dominioCorreo}.`)
      const { error } = await supabase.auth.signInWithOtp({ email: correoNorm, options: { shouldCreateUser: true } })
      if (error) throw error
      guardar('correo', correoNorm)
      guardar('consentimiento', 'si')
      guardar('codigoEnviado', String(Date.now()))
      navegar('/codigo')
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('Usa tu') ? err.message : mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pantalla">
      <Pasos actual={1} />
      <h1 className="titulo">{yaVerificado ? 'Antes de empezar' : 'Tu correo institucional'}</h1>
      <p className="mut">
        {yaVerificado
          ? 'Acepta la autorización de datos para comenzar tu viaje.'
          : `Te enviaremos un código para entrar. Solo correos @${config.dominioCorreo}.`}
      </p>

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

        <label className="check">
          <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
          <span>{textos.autorizacionDatos}</span>
        </label>

        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}

        <div className="pie">
          <button className="btn" disabled={enviando || !acepta || (!yaVerificado && !dominioOk)}>
            {enviando ? 'Un momento…' : yaVerificado ? 'Comenzar' : 'Enviar código'}
          </button>
          {yaVerificado && (
            <button type="button" className="enlace" onClick={salir}>
              Usar otro correo
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
