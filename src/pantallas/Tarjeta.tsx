import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Check } from 'lucide-react'
import { bloques, paradas } from '../contenido.js'
import { IconoBloque } from '../componentes/Iconos'
import { paradaCompletada, useJuego } from '../juego'
import './tarjeta.css'

/** Tarjeta cultural de la parada y, si cierra el bloque, la tarjeta final del bloque. */
export function Tarjeta() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { estado, etapa } = useJuego()
  const [verFinal, setVerFinal] = useState(false)

  const parada = paradas.find((p) => p.id === id)
  if (!parada || !paradaCompletada(estado, id)) return <Navigate to="/mapa" replace />

  const bloque = bloques[parada.bloqueIndice]
  // Desde el pasaporte solo se relee la tarjeta; el cierre de bloque es parte del recorrido.
  const releyendo = etapa === 'pasaporte'
  const cierraBloque = !releyendo && parada.indiceEnBloque === bloque.paradas.length - 1
  const esUltimo = parada.bloqueIndice === bloques.length - 1

  const seguir = () => navegar(etapa === 'pasaporte' ? '/pasaporte' : etapa === 'biblioteca' ? '/biblioteca' : '/mapa', { replace: true })

  if (verFinal) {
    return (
      <main className="pantalla oscura tarjeta-cultural tarjeta-cierre">
        <header className="tarjeta-encabezado">
          <span className="chip">Bloque {parada.bloqueIndice + 1} completado</span>
        </header>
        <article className="tarjeta tarjeta-editorial tarjeta-final">
          <div className="cierre-emblema">
            <div className="sello-grande" aria-hidden="true">
              <IconoBloque icono={bloque.icono} size={34} strokeWidth={1.6} />
            </div>
            <div className="cierre-retratos" aria-hidden="true">
              {bloque.paradas.map((p) => (
                <figure key={p.id} className="cierre-miniatura">
                  <img
                    src={p.tarjeta.retrato}
                    alt=""
                    aria-hidden="true"
                    width={64}
                    height={64}
                    decoding="async"
                  />
                </figure>
              ))}
            </div>
          </div>
          <div className="tarjeta-cuerpo">
            <p className="autor">{bloque.nombre}</p>
            <h1>{bloque.tarjetaFinal.titulo}</h1>
            <span className="tarjeta-divisor" aria-hidden="true" />
            <p className="texto">{bloque.tarjetaFinal.texto}</p>
          </div>
        </article>
        <div className="pie tarjeta-pie">
          <button className="btn dorado" onClick={seguir}>
            {esUltimo ? 'Ir a la biblioteca' : 'Abrir el siguiente bloque'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla tarjeta-cultural clara">
      <header className="tarjeta-encabezado">
        {!releyendo && (
          <div className="festejo" aria-hidden="true">
            <Check size={14} strokeWidth={2.25} aria-hidden="true" />
            <span>¡Parada sellada!</span>
          </div>
        )}
        <span className="chip">
          {bloque.nombre} · Parada {parada.indiceEnBloque + 1} de {bloque.paradas.length}
        </span>
      </header>
      <article className="tarjeta tarjeta-editorial">
        <figure className="retrato-marco">
          <div className="retrato-halo" aria-hidden="true" />
          <img
            className="retrato-img"
            src={parada.tarjeta.retrato}
            alt={`Retrato de ${parada.tarjeta.autor}`}
            width={216}
            height={216}
            decoding="async"
          />
        </figure>
        <div className="tarjeta-cuerpo">
          <p className="autor">{parada.tarjeta.autor}</p>
          <h1>{parada.tarjeta.titulo}</h1>
          <span className="tarjeta-divisor" aria-hidden="true" />
          <p className="texto">{parada.tarjeta.texto}</p>
        </div>
      </article>
      <div className="pie tarjeta-pie">
        <button className="btn" onClick={() => (cierraBloque ? setVerFinal(true) : seguir())}>
          {releyendo ? 'Volver al pasaporte' : cierraBloque ? 'Cerrar el bloque' : 'Siguiente parada'}
        </button>
      </div>
    </main>
  )
}
