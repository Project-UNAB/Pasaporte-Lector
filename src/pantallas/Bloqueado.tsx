import { Hourglass } from 'lucide-react'
import { useJuego } from '../juego'

export function Bloqueado() {
  const { estado, salir } = useJuego()
  const hechas = estado?.completadas.length ?? 0
  return (
    <main className="pantalla bloqueado">
      <div className="encabezado-centrado" style={{ marginTop: 32 }}>
        <div className="icono-circulo reloj-arena" aria-hidden="true" style={{ marginBottom: 18 }}>
          <Hourglass size={26} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="titulo">Se acabó el tiempo</h1>
        <p className="mut">
          Pasaron 24 horas desde que verificaste tu correo y el recorrido no se completó, así que tu cuenta quedó cerrada.
          Lograste {hechas} de {estado?.total ?? 9} paradas. ¡Gracias por participar!
        </p>
      </div>
      <div className="pie">
        <button className="enlace" onClick={salir}>
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
