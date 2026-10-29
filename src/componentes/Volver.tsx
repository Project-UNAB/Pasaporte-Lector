import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Perfil } from './Perfil'

/**
 * Barra superior de la pantalla: «Volver» a la izquierda (a una ruta con `a` o con una acción con `alTocar`)
 * y el botón de perfil a la derecha, a la misma altura. Sin `a` ni `alTocar` solo muestra el perfil.
 */
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
      ) : alTocar ? (
        <button type="button" className="boton-volver" aria-label={etiqueta} onClick={alTocar}>
          {contenido}
        </button>
      ) : (
        <span />
      )}
      <Perfil />
    </div>
  )
}
