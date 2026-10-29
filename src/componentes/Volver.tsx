import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

/** Botón «Volver» arriba de la pantalla: a una ruta (`a`) o con una acción (`alTocar`). */
export function Volver({ a, alTocar, etiqueta = 'Volver' }: { a?: string; alTocar?: () => void; etiqueta?: string }) {
  const contenido = (
    <>
      <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      <span>Volver</span>
    </>
  )
  return (
    <div className="volver-fila">
      {a ? (
        <Link to={a} replace className="boton-volver" aria-label={etiqueta}>
          {contenido}
        </Link>
      ) : (
        <button type="button" className="boton-volver" aria-label={etiqueta} onClick={alTocar}>
          {contenido}
        </button>
      )}
    </div>
  )
}
