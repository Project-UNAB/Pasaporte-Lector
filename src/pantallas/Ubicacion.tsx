import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LifeBuoy, Lock, Map, MapPin } from 'lucide-react'
import { Volver } from '../componentes/Volver'
import { guardar } from '../lib/almacen'
import { codigoError, instruccionesPermiso, MENSAJE_SIN_HTTPS, pedirPosicion } from '../lib/geo'

export function Ubicacion() {
  const navegar = useNavigate()
  const [pidiendo, setPidiendo] = useState(false)
  const [negado, setNegado] = useState(false)

  function seguir() {
    guardar('ubicacionExplicada', 'si')
    navegar('/mapa', { replace: true })
  }

  async function activar() {
    setPidiendo(true)
    try {
      await pedirPosicion()
      seguir()
    } catch (e) {
      if (codigoError(e) === 1 || !window.isSecureContext) setNegado(true)
      else seguir()
    } finally {
      setPidiendo(false)
    }
  }

  return (
    <main className="pantalla ubicacion">
      <Volver a="/foto" etiqueta="Volver a la foto" />
      <div className="encabezado-centrado" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="icono-circulo radar" aria-hidden="true" style={{ marginBottom: 16 }}>
          <MapPin size={26} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="titulo">Activa tu ubicación</h1>
        <p className="mut">
          La usamos solo para saber si llegaste al póster de cada parada. Al estar cerca se abre el teclado para escribir la
          palabra clave.
        </p>
      </div>

      <div className="tip">
        <span className="tip-icono" aria-hidden="true">
          <Map size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span>Verás en el mapa dónde estás y a dónde ir.</span>
      </div>
      <div className="tip">
        <span className="tip-icono" aria-hidden="true">
          <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span>Solo se guarda tu posición cuando tocas “Ya llegué”.</span>
      </div>
      <div className="tip">
        <span className="tip-icono" aria-hidden="true">
          <LifeBuoy size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span>Si el GPS falla, aparecerá una ayuda para seguir jugando.</span>
      </div>

      {negado && (
        <p className="aviso info" role="alert">
          {window.isSecureContext ? instruccionesPermiso() : MENSAJE_SIN_HTTPS} También puedes seguir sin ella y usar la ayuda.
        </p>
      )}

      <div className="pie">
        <button className="btn" onClick={activar} disabled={pidiendo}>
          {pidiendo ? 'Buscando señal…' : 'Activar ubicación'}
        </button>
        {negado && (
          <button className="btn suave" onClick={seguir}>
            Seguir sin ubicación
          </button>
        )}
      </div>
    </main>
  )
}
