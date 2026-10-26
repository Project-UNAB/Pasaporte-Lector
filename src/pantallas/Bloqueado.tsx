import { useJuego } from '../juego'

export function Bloqueado() {
  const { estado, salir } = useJuego()
  const hechas = estado?.completadas.length ?? 0
  return (
    <main className="pantalla noche" style={{ textAlign: 'center' }}>
      <div className="centro" style={{ marginTop: 40 }}>
        <div
          aria-hidden="true"
          style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'grid', placeItems: 'center', fontSize: 58 }}
        >
          ⌛
        </div>
      </div>
      <h1 className="titulo" style={{ marginTop: 22 }}>
        Se acabó el tiempo
      </h1>
      <p className="mut" style={{ fontSize: 16, marginTop: 10 }}>
        Pasaron 24 horas desde que verificaste tu correo y el recorrido no se completó, así que tu cuenta quedó cerrada.
        Lograste {hechas} de {estado?.total ?? 9} paradas. ¡Gracias por participar!
      </p>
      <div className="pie">
        <button className="enlace" onClick={salir}>
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}
