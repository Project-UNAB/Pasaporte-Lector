import { Link } from 'react-router'
import { textos } from '../contenido.js'
import './bienvenida.css'

export function Bienvenida() {
  return (
    <main className="pantalla oscura bienvenida">
      <div className="libro aparece" aria-hidden="true">
        📖
      </div>
      <h1>{textos.bienvenidaTitulo}</h1>
      <p>{textos.bienvenidaTexto}</p>
      <div className="pie">
        <Link to="/ingresar" className="btn dorado">
          {textos.bienvenidaBoton}
        </Link>
        <small>{textos.bienvenidaNota}</small>
      </div>
    </main>
  )
}
