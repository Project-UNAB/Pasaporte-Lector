import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { bloques, config, marcasDeAgua, paradas, textos } from '../contenido.js'
import { useJuego } from '../juego'
import { supabase } from '../lib/supabase'
import { fechaSello } from '../lib/tiempo'
import './pasaporte.css'

const COLORES = ['var(--g7)', 'var(--blue)', 'var(--red)']

function mrz(nombre: string, id: string, fecha: string) {
  const limpiar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z ]/g, '')
      .trim()
  // Como en Colombia: 2 palabras = nombre + apellido, 3 = nombre + 2 apellidos, 4+ = 2 nombres + apellidos.
  const partes = limpiar(nombre).split(/\s+/)
  const n = partes.length >= 4 ? 2 : 1
  const apellidos = partes.length > 1 ? partes.slice(n).join('<') : partes[0]
  const nombres = partes.length > 1 ? partes.slice(0, n).join('<') : ''
  const l1 = `P<COL${apellidos}<<${nombres}`.padEnd(36, '<').slice(0, 36)
  const d = new Date(fecha)
  const dm = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}`
  const l2 = `${id}<COL<<${dm}`.padEnd(35, '<').slice(0, 35) + (id.length % 10)
  return [l1, l2]
}

export default function Pasaporte() {
  const { estado } = useJuego()
  const p = estado!.perfil!
  const [foto, setFoto] = useState<string | null>(null)

  useEffect(() => {
    if (!p.foto_path) return
    supabase.storage
      .from('fotos')
      .createSignedUrl(p.foto_path, 3600)
      .then(({ data }) => setFoto(data?.signedUrl ?? null))
  }, [p.foto_path])

  const marca = marcasDeAgua.find((m) => m.id === p.marca_agua) ?? marcasDeAgua[0]
  const fechaDe = (id: string) => estado!.completadas.find((c) => c.parada === id)?.completado_en
  const sellos =
    config.sellosPor === 'parada'
      ? paradas.map((pa) => ({ id: pa.id, icono: bloques[pa.bloqueIndice].icono, nombre: pa.lugar !== 'Por definir' ? pa.lugar : `Parada ${pa.posicion}`, fecha: fechaDe(pa.id) }))
      : bloques.map((b) => ({ id: b.id, icono: b.icono, nombre: b.zona, fecha: fechaDe(b.paradas[b.paradas.length - 1].id) }))
  const [l1, l2] = mrz(p.nombre ?? '', p.id_estudiantil ?? '', p.activado_en ?? p.inicio)

  // Una marca con `color` (la UNAB) usa su SVG como molde y se pinta con ese color.
  const marcaDeAgua = (clase: string) =>
    marca.svg && marca.color ? (
      <div
        className={`marca tenida ${clase}`}
        style={{ backgroundColor: marca.color, WebkitMaskImage: `url(${marca.svg})`, maskImage: `url(${marca.svg})` }}
        aria-hidden="true"
      />
    ) : marca.svg ? (
      <div className={`marca ${clase}`} style={{ backgroundImage: `url(${marca.svg})` }} aria-hidden="true" />
    ) : (
      <div className={`marca emoji ${clase}`} aria-hidden="true">
        {marca.emoji}
      </div>
    )

  return (
    <main className="pantalla noche pasaporte" onContextMenu={(e) => e.preventDefault()}>
      <h1 className="titulo">¡Viaje completado! 🎉</h1>

      <section className="hoja aparece" aria-label="Página de datos del pasaporte">
        <div className="franja" />
        {marcaDeAgua('derecha')}
        <h2>{textos.pasaporteEncabezado}</h2>
        <div className="datos">
          <div className="retrato" style={foto ? { backgroundImage: `url(${foto})` } : undefined} role="img" aria-label="Foto del viajero" />
          <dl>
            <dt>Nombre</dt>
            <dd>{p.nombre}</dd>
            <dt>Carrera</dt>
            <dd>{p.carrera}</dd>
            <dt>ID</dt>
            <dd>{p.id_estudiantil}</dd>
          </dl>
        </div>
        <p className="mrz" aria-hidden="true">
          {l1}
          <br />
          {l2}
        </p>
      </section>

      <section className="hoja aparece" style={{ animationDelay: '0.15s' }} aria-label="Sellos de viaje">
        {marcaDeAgua('izquierda')}
        <h2>Sellos de viaje</h2>
        <div className={`sellos${sellos.length > 3 ? ' muchos' : ''}`}>
          {sellos.map((s, i) => (
            <div key={s.id} className="sello" style={{ color: COLORES[i % 3], rotate: `${[-8, 6, -4][i % 3]}deg` }}>
              <b aria-hidden="true">{s.icono}</b>
              {s.nombre}
              <br />
              {s.fecha ? fechaSello(s.fecha) : ''}
            </div>
          ))}
        </div>
      </section>

      <p className="mut" style={{ textAlign: 'center', marginTop: 14 }}>
        Marca de agua: {marca.nombre}
      </p>

      <section className="lecturas" aria-label="Tus lecturas">
        <h2>Tus lecturas</h2>
        <ul>
          {paradas.map((pa) => (
            <li key={pa.id}>
              <Link to={`/tarjeta/${pa.id}`}>
                <span aria-hidden="true">{bloques[pa.bloqueIndice].icono}</span>
                <span>
                  <b>{pa.tarjeta.autor}</b>
                  <small>{pa.tarjeta.titulo}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
