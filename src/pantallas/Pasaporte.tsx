import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Download } from 'lucide-react'
import { bloques, config, marcasDeAgua, paradas, textos } from '../contenido.js'
import { IconoBloque } from '../componentes/Iconos'
import { useJuego } from '../juego'
import { supabase } from '../lib/supabase'
import { fechaSello } from '../lib/tiempo'
import './pasaporte.css'

const COLORES = ['#0f6b57', '#2c6fb3', '#d9503f']

function mrz(nombre: string, id: string, fecha: string) {
  const limpiar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')

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

  async function descargar() {
    setErrorDescarga('')
    setDescargando(true)
    try {
      const [{ crearImagenPasaporte, guardarImagen }, retrato] = await Promise.all([
        import('../lib/imagenPasaporte'),
        p.foto_path ? supabase.storage.from('fotos').download(p.foto_path).then(({ data }) => data) : null,
      ])
      const blob = await crearImagenPasaporte({
        encabezado: textos.pasaporteEncabezado,
        nombre: p.nombre ?? '',
        carrera: p.carrera ?? '',
        id: p.id_estudiantil ?? '',
        mrz: [l1, l2],
        foto: retrato,
        marca,
        sellos: sellos.map((s, i) => ({ icono: s.icono, nombre: s.nombre, fecha: s.fecha ? fechaSello(s.fecha) : '', color: COLORES[i % 3] })),
      })
      await guardarImagen(blob, 'pasaporte-lector.png')
    } catch {
      setErrorDescarga('No pudimos crear la imagen. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

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
    ) : null

  return (
    <main className="pantalla noche pasaporte" onContextMenu={(e) => e.preventDefault()}>
      <h1 className="titulo" style={{ textAlign: 'center' }}>¡Viaje completado!</h1>

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
              <b aria-hidden="true">
                <IconoBloque icono={s.icono} size={sellos.length > 3 ? 18 : 22} strokeWidth={1.75} />
              </b>
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

      <button className="btn dorado" style={{ marginTop: 14 }} onClick={descargar} disabled={descargando}>
        {descargando ? (
          'Creando imagen…'
        ) : (
          <>
            <Download size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Descargar como foto</span>
          </>
        )}
      </button>
      {errorDescarga && (
        <p className="aviso error" role="alert">
          {errorDescarga}
        </p>
      )}

      <section className="lecturas" aria-label="Tus lecturas">
        <h2>Tus lecturas</h2>
        <ul>
          {paradas.map((pa) => (
            <li key={pa.id}>
              <Link to={`/tarjeta/${pa.id}`}>
                <span className="lectura-icono" aria-hidden="true">
                  <IconoBloque icono={bloques[pa.bloqueIndice].icono} size={18} strokeWidth={1.75} />
                </span>
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
