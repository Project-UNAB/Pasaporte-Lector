import { useJuego } from '../juego'

/** No se pudo leer el estado del juego (sin internet o servidor caído). El progreso sigue a salvo. */
export function SinConexion() {
  const { reintentar } = useJuego()
  return (
    <main className="pantalla" style={{ textAlign: 'center' }}>
      <div className="centro" style={{ marginTop: 40 }}>
        <div
          aria-hidden="true"
          style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--g1)', display: 'grid', placeItems: 'center', fontSize: 52 }}
        >
          📶
        </div>
      </div>
      <h1 className="titulo" style={{ marginTop: 20 }}>
        Sin conexión
      </h1>
      <p className="mut" style={{ fontSize: 16, marginTop: 10 }}>
        No pudimos cargar tu viaje. Revisa tu internet o el wifi de la universidad. Tu progreso está guardado.
      </p>
      <div className="pie">
        <button className="btn" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    </main>
  )
}
