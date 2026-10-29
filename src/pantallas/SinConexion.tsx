import { WifiOff } from 'lucide-react'
import { useJuego } from '../juego'

/** No se pudo leer el estado del juego (sin internet o servidor caído). El progreso sigue a salvo. */
export function SinConexion() {
  const { reintentar } = useJuego()
  return (
    <main className="pantalla sin-conexion">
      <div className="encabezado-centrado" style={{ marginTop: 32 }}>
        <div className="icono-circulo radar" aria-hidden="true" style={{ marginBottom: 18 }}>
          <WifiOff size={26} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="titulo">Sin conexión</h1>
        <p className="mut">
          No pudimos cargar tu viaje. Revisa tu internet o el wifi de la universidad. Tu progreso está guardado.
        </p>
      </div>
      <div className="pie">
        <button className="btn" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    </main>
  )
}
