import { useState } from 'react'
import { useNavigate } from 'react-router'
import { guardar } from '../lib/almacen'
import { pedirPosicion } from '../lib/geo'

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
      if ((e as GeolocationPositionError)?.code === 1) setNegado(true)
      else seguir()
    } finally {
      setPidiendo(false)
    }
  }

  return (
    <main className="pantalla">
      <div className="centro" style={{ marginTop: 24 }}>
        <div
          aria-hidden="true"
          style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--g1)', display: 'grid', placeItems: 'center', fontSize: 54 }}
        >
          📍
        </div>
      </div>
      <h1 className="titulo" style={{ marginTop: 18, textAlign: 'center' }}>
        Activa tu ubicación
      </h1>
      <p className="mut" style={{ textAlign: 'center' }}>
        La usamos solo para saber si llegaste al póster de cada parada. Al estar cerca se abre el teclado para escribir la
        palabra clave.
      </p>

      <div className="tip">
        <b>🗺️</b> Verás en el mapa dónde estás y a dónde ir.
      </div>
      <div className="tip">
        <b>🔒</b> Solo se guarda tu posición cuando tocas “Ya llegué”.
      </div>
      <div className="tip">
        <b>🛟</b> Si el GPS falla, aparecerá una ayuda para seguir jugando.
      </div>

      {negado && (
        <p className="aviso info" role="alert">
          Bloqueaste la ubicación. Para activarla: en iPhone ve a Ajustes → Safari → Ubicación; en Android toca el candado
          junto a la dirección de la página → Permisos → Ubicación. También puedes seguir sin ella y usar la ayuda.
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
