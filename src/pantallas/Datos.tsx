import { useState, type FormEvent } from 'react'
import { carreras, config } from '../contenido.js'
import { Pasos } from '../componentes/Pasos'
import { Reloj } from '../componentes/Reloj'
import { useJuego, type EstadoServidor } from '../juego'
import { mensajeError } from '../lib/errores'
import { normalizarId } from '../lib/normalizar'
import { supabase } from '../lib/supabase'

const OTRA = '__otra__'

export function Datos() {
  const { estado, aplicar } = useJuego()
  const p = estado?.perfil
  const [id, setId] = useState(p?.id_estudiantil ?? '')
  const [nombre, setNombre] = useState(p?.nombre ?? '')
  const [carrera, setCarrera] = useState(p?.carrera ?? '')
  const [otra, setOtra] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const idOk = config.formatoId.test(normalizarId(id))
  const carreraFinal = carrera === OTRA ? otra.trim() : carrera
  const listo = idOk && nombre.trim().split(/\s+/).length >= 2 && carreraFinal.length >= 2

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!listo || enviando) return
    setError('')
    setEnviando(true)
    try {
      const { data, error } = await supabase.rpc('guardar_datos', {
        p_id_estudiantil: normalizarId(id),
        p_nombre: nombre,
        p_carrera: carreraFinal,
      })
      if (error) throw error
      aplicar(data as EstadoServidor)
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }

  return (
    <main className="pantalla">
      <Pasos actual={2} />
      <h1 className="titulo">Datos del viajero</h1>
      <p className="mut">Así aparecerás en tu pasaporte.</p>
      <div style={{ marginTop: 10 }}>
        <Reloj />
      </div>

      <form onSubmit={enviar} style={{ display: 'contents' }}>
        <div className="campo">
          <label htmlFor="id">ID estudiantil</label>
          <input
            id="id"
            className="entrada"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            placeholder={config.ejemploId}
            value={id}
            onChange={(e) => setId(e.target.value)}
            aria-invalid={id.length > 0 && !idOk}
          />
          {id.length > 3 && !idOk && <small className="mut">Formato esperado: {config.ejemploId}</small>}
        </div>

        <div className="campo">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            className="entrada"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Nombre y apellido"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="carrera">Carrera</label>
          <select id="carrera" className="entrada" value={carrera} onChange={(e) => setCarrera(e.target.value)}>
            <option value="" disabled>
              Elige tu carrera
            </option>
            {carreras.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTRA}>Otra…</option>
          </select>
          {carrera === OTRA && (
            <input
              className="entrada"
              placeholder="Escribe tu carrera"
              value={otra}
              onChange={(e) => setOtra(e.target.value)}
              autoCapitalize="sentences"
            />
          )}
        </div>

        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}

        <div className="pie">
          <button className="btn" disabled={!listo || enviando}>
            {enviando ? 'Guardando…' : 'Continuar'}
          </button>
        </div>
      </form>
    </main>
  )
}
