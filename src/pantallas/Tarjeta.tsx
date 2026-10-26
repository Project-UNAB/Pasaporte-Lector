import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { bloques, paradas } from '../contenido.js'
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
      <main className="pantalla oscura tarjeta-cultural">
        <div className="sello-grande aparece" aria-hidden="true">
          {bloque.icono}
        </div>
        <span className="chip">Bloque {parada.bloqueIndice + 1} completado</span>
        <h1>{bloque.tarjetaFinal.titulo}</h1>
        <p className="texto">{bloque.tarjetaFinal.texto}</p>
        <div className="pie">
          <button className="btn dorado" onClick={seguir}>
            {esUltimo ? 'Ir a la biblioteca' : 'Abrir el siguiente bloque'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="pantalla tarjeta-cultural clara">
      {!releyendo && (
        <div className="festejo aparece" aria-hidden="true">
          ✨ ¡Parada sellada! ✨
        </div>
      )}
      <span className="chip">
        {bloque.nombre} · Parada {parada.indiceEnBloque + 1} de {bloque.paradas.length}
      </span>
      <article className="tarjeta aparece">
        <p className="autor">{parada.tarjeta.autor}</p>
        <h1>{parada.tarjeta.titulo}</h1>
        <p className="texto">{parada.tarjeta.texto}</p>
      </article>
      <div className="pie">
        <button className="btn" onClick={() => (cierraBloque ? setVerFinal(true) : seguir())}>
          {releyendo ? 'Volver al pasaporte' : cierraBloque ? 'Cerrar el bloque' : 'Siguiente parada'}
        </button>
      </div>
    </main>
  )
}
