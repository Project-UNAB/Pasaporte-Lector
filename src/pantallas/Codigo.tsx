import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { config } from '../contenido.js'
import { Pasos } from '../componentes/Pasos'
import { guardar, leer } from '../lib/almacen'
import { mensajeError } from '../lib/errores'
import { supabase } from '../lib/supabase'

export function Codigo() {
  const navegar = useNavigate()
  const correo = leer('correo')
  const [codigo, setCodigo] = useState('')
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
      const { error } = await supabase.auth.signInWithOtp({ email: correo!, options: { shouldCreateUser: true } })
      if (error) throw error
      guardar('codigoEnviado', String(Date.now()))
      setEspera(config.segundosReenvio)
      setAviso('Te enviamos un código nuevo.')
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <main className="pantalla">
      <Pasos actual={1} />
      <h1 className="titulo">Revisa tu correo</h1>
      <p className="mut">
        Escribe el código que enviamos a <b>{correo}</b>. Si no lo ves, busca en la carpeta de spam.
      </p>

      <form onSubmit={verificar} style={{ display: 'contents' }}>
        <div className="campo">
          <label htmlFor="codigo" className="sr">
            Código
          </label>
          <input
            id="codigo"
            className="entrada grande"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            enterKeyHint="go"
            placeholder="••••••"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^0-9]/g, ''))}
            autoFocus
          />
        </div>

        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        {aviso && <p className="aviso ok">{aviso}</p>}

        <div className="pie">
          <button className="btn" disabled={enviando || codigo.length < 6}>
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
          <button type="button" className="enlace" disabled={espera > 0} onClick={reenviar}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
          <button type="button" className="enlace" onClick={() => navegar('/ingresar')}>
            Cambiar correo
          </button>
        </div>
      </form>
    </main>
  )
}
