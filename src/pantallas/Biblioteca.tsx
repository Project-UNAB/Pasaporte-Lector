import { useState, type FormEvent } from 'react'
import { Landmark } from 'lucide-react'
import { textos } from '../contenido.js'
import { useJuego } from '../juego'
import { mensajeError } from '../lib/errores'
import { supabase } from '../lib/supabase'

const MENSAJES: Record<string, string> = {
  incorrecto: 'Código incorrecto. Pídele al equipo de la biblioteca que lo revise.',
  espera: 'Demasiados intentos. Esperen unos minutos antes de volver a probar.',
  faltan_paradas: 'Aún faltan paradas por completar.',
  sin_codigo_configurado: 'La biblioteca aún no tiene un código configurado.',
}

export function Biblioteca() {
  const { estado, refrescar } = useJuego()
  const [personal, setPersonal] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function activar(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim() || enviando) return
    setError('')
    setEnviando(true)
    try {
      const { data, error } = await supabase.rpc('activar_pasaporte', { p_codigo: codigo })
      if (error) throw error
      const r = (data as { resultado: string }).resultado
      if (r === 'activado' || r === 'ya_activado') {
        if ('vibrate' in navigator) navigator.vibrate?.([80, 60, 120])
        await refrescar()
        return
      }
      setError(MENSAJES[r] ?? 'No se pudo activar. Intenta de nuevo.')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pantalla biblioteca">
      <div className="encabezado-centrado" style={{ marginTop: 20 }}>
        <div className="icono-circulo levita" aria-hidden="true" style={{ marginBottom: 16 }}>
          <Landmark size={26} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="titulo">
          ¡Completaste las {estado?.total ?? 9} paradas!
        </h1>
        <p className="mut">
          {textos.bibliotecaInstrucciones}
        </p>
      </div>

      {personal ? (
        <form onSubmit={activar} className="tarjeta aparece" style={{ marginTop: 20 }}>
          <label htmlFor="codigo-bib" className="etiqueta">
            Código del equipo de la biblioteca
          </label>
          <input
            id="codigo-bib"
            className="entrada grande"
            style={{ marginTop: 8, letterSpacing: 3 }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            type="password"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
          />
          {error && (
            <p className="aviso error" role="alert">
              {error}
            </p>
          )}
          <button className="btn dorado" style={{ marginTop: 12 }} disabled={enviando || !codigo.trim()}>
            {enviando ? 'Activando…' : 'Activar pasaporte'}
          </button>
        </form>
      ) : (
        <div className="pie">
          <button className="btn dorado" onClick={() => setPersonal(true)}>
            Soy del equipo de la biblioteca
          </button>
          <small className="mut" style={{ textAlign: 'center', display: 'block' }}>
            Entrega tu celular al personal de la biblioteca.
          </small>
        </div>
      )}
    </main>
  )
}
