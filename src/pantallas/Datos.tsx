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
    <main className="pantalla acceso-pantalla">
      <Pasos actual={2} />

      <form onSubmit={enviar} className="acceso-form aparece">
        <div className="encabezado-centrado acceso-cabeza">
          <h1 className="acceso-titulo">Datos del viajero</h1>
          <p className="mut">Así aparecerás en tu pasaporte.</p>
          <div style={{ marginTop: 10 }}>
            <Reloj />
          </div>
        </div>

        <div className="acceso-campos">
          <div className="campo campo-centrado">
            <label htmlFor="id">ID estudiantil</label>
            <input
              id="id"
              className="entrada entrada-pildora"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="next"
              placeholder={config.ejemploId}
              maxLength={9}
              value={id}
              onChange={(e) => setId(e.target.value)}
              aria-invalid={id.length > 0 && !idOk}
            />
            {id.length > 3 && !idOk && <small className="mut">Formato esperado: {config.ejemploId}</small>}
          </div>

          <div className="campo campo-centrado">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              className="entrada entrada-pildora"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Nombre y apellido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="campo campo-centrado">
            <label htmlFor="carrera">Carrera</label>
            <select id="carrera" className="entrada entrada-pildora" value={carrera} onChange={(e) => setCarrera(e.target.value)}>
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
                className="entrada entrada-pildora"
                style={{ marginTop: 8 }}
                placeholder="Escribe tu carrera"
                value={otra}
                onChange={(e) => setOtra(e.target.value)}
                autoCapitalize="sentences"
              />
            )}
          </div>

          {error && (
            <p className="aviso error" role="alert" style={{ textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>

        <div className="pie acceso-pie">
          <button className="btn btn-pildora" disabled={!listo || enviando}>
            {enviando ? 'Guardando…' : 'Continuar'}
          </button>
        </div>
      </form>
    </main>
  )
}
