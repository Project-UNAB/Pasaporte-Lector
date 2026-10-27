import { Link } from 'react-router'
import { textos } from '../contenido.js'
import './bienvenida.css'

// Los navegadores dentro de Instagram, Facebook o TikTok suelen bloquear la cámara o la ubicación.
const navegadorInterno = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\//i.test(navigator.userAgent)

export function Bienvenida() {
  return (
    <main className="pantalla oscura bienvenida">
      <div className="libro aparece" aria-hidden="true">
        📖
      </div>
      <h1>{textos.bienvenidaTitulo}</h1>
      <p>{textos.bienvenidaTexto}</p>
      {navegadorInterno && (
        <p className="aviso info" role="alert">
          Para usar la cámara y el mapa, abre esta página en Chrome o Safari: toca ⋯ y elige “Abrir en el navegador”.
        </p>
      )}
      <div className="pie">
        <Link to="/ingresar" className="btn dorado">
          {textos.bienvenidaBoton}
        </Link>
        <Link to="/ingresar?modo=entrar" className="btn claro">
          {textos.bienvenidaBotonEntrar}
        </Link>
        <small>{textos.bienvenidaNota}</small>
      </div>
    </main>
  )
}
