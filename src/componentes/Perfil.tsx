import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LogOut, User, X } from 'lucide-react'
import { useJuego } from '../juego'

/** Etapas con sesión iniciada en las que se muestra el botón de perfil. */
const CON_SESION = ['consentimiento', 'datos', 'foto', 'juego', 'biblioteca', 'pasaporte', 'bloqueado']

/** Botón de perfil de la barra superior: muestra quién inició sesión y permite cerrarla. */
export function Perfil() {
  const { sesion, estado, etapa, salir } = useJuego()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => caja.current && !caja.current.contains(e.target as Node) && setAbierto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  useEffect(() => setAbierto(false), [pathname])

  if (!sesion || !CON_SESION.includes(etapa)) return null

  async function cerrarSesion() {
    setSaliendo(true)
    try {
      await salir()
      navegar('/', { replace: true })
    } finally {
      setSaliendo(false)
      setAbierto(false)
    }
  }

  const nombre = estado?.perfil?.nombre
  const correo = sesion.user.email

  return (
    <div ref={caja} className="perfil">
      <button
        type="button"
        className="perfil-boton"
        aria-label="Perfil"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={() => setAbierto((a) => !a)}
      >
        <User size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="perfil-panel" role="dialog" aria-label="Tu perfil">
          <button type="button" className="perfil-cerrar" aria-label="Cerrar perfil" onClick={() => setAbierto(false)}>
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <div className="perfil-avatar" aria-hidden="true">
            <User size={22} strokeWidth={1.75} aria-hidden="true" />
          </div>
          {nombre && <p className="perfil-nombre">{nombre}</p>}
          {correo && <p className="perfil-correo">{correo}</p>}
          <button type="button" className="btn perfil-salir" onClick={cerrarSesion} disabled={saliendo}>
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
