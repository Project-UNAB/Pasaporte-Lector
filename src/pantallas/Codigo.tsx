import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { config } from '../contenido.js'
import { Pasos } from '../componentes/Pasos'
import { guardar, leer } from '../lib/almacen'
import { mensajeError } from '../lib/errores'
import { opcionesCodigo, supabase } from '../lib/supabase'

const DIGITOS = 6

export function Codigo() {
  const navegar = useNavigate()
  const correo = leer('correo')
  const crear = leer('modo') !== 'entrar'
  const [codigo, setCodigo] = useState('')
  const [enfocado, setEnfocado] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [espera, setEspera] = useState(() => {
    const t = Number(leer('codigoEnviado') ?? 0)
    return Math.max(0, config.segundosReenvio - Math.floor((Date.now() - t) / 1000))
  })

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  if (!correo) return <Navigate to="/ingresar" replace />

  async function verificar(e?: FormEvent) {
    e?.preventDefault()
    if (enviando) return
    setError('')
    setEnviando(true)
    try {
      // Al verificar, el proveedor del juego inicia la partida y esta pantalla se reemplaza sola.
      const { error } = await supabase.auth.verifyOtp({ email: correo!, token: codigo.trim(), type: 'email' })
      if (error) throw error
      guardar('codigoEnviado', null)
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }

  async function reenviar() {
    setError('')
    setAviso('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: correo!, options: opcionesCodigo(crear) })
      if (error) throw error
      guardar('codigoEnviado', String(Date.now()))
      setEspera(config.segundosReenvio)
      setAviso('Te enviamos un código nuevo.')
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  const indiceActivo = Math.min(codigo.length, DIGITOS - 1)

  return (
    <main className="pantalla acceso-pantalla">
      {crear ? <Pasos actual={1} /> : <div style={{ height: 8 }} />}

      <form onSubmit={verificar} className="acceso-form aparece">
        <div className="encabezado-centrado acceso-cabeza">
          <h1 className="acceso-titulo">Revisa tu correo</h1>
          <p className="mut">
            Escribe el código de verificación de 6 dígitos que enviamos a <b>{correo}</b>. Si no lo ves, busca en la
            carpeta de spam.
          </p>
        </div>

        <div className="acceso-campos">
          <div className="campo campo-centrado">
            <label htmlFor="codigo" className="sr">
              Código
            </label>
            <div className="otp-contenedor">
              <input
                id="codigo"
                className="otp-input-real"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={DIGITOS}
                enterKeyHint="go"
                value={codigo}
                onFocus={() => setEnfocado(true)}
                onBlur={() => setEnfocado(false)}
                onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, '').slice(0, DIGITOS))}
                autoFocus
              />
              <div className="otp-casillas" aria-hidden="true">
                {Array.from({ length: DIGITOS }, (_, i) => {
                  const char = codigo[i] ?? ''
                  const activa = enfocado && i === indiceActivo && codigo.length < DIGITOS
                  return (
                    <div
                      key={i}
                      className={`otp-casilla${char ? ' llena' : ''}${activa ? ' activa' : ''}`}
                    >
                      {char ? (
                        <span key={`${i}-${char}`} className="otp-digito">
                          {char}
                        </span>
                      ) : (
                        <span className="otp-punto" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {error && (
            <p className="aviso error" role="alert" style={{ textAlign: 'center' }}>
              {error}
            </p>
          )}
          {aviso && (
            <p className="aviso ok" style={{ textAlign: 'center' }}>
              {aviso}
            </p>
          )}
        </div>

        <div className="pie acceso-pie">
          <button className="btn btn-pildora" disabled={enviando || codigo.length < 6}>
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
          <button type="button" className="enlace" disabled={espera > 0} onClick={reenviar}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
          <button type="button" className="enlace" onClick={() => navegar(crear ? '/ingresar' : '/ingresar?modo=entrar')}>
            Cambiar correo
          </button>
        </div>
      </form>
    </main>
  )
}
