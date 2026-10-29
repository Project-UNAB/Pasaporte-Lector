// Dibuja el pasaporte en un canvas para guardarlo como foto (más confiable en iPhone que capturar el DOM).

export interface DatosImagen {
  encabezado: string
  nombre: string
  carrera: string
  id: string
  mrz: [string, string]
  foto: Blob | null
  marca: { nombre: string; emoji?: string; svg?: string; color?: string }
  sellos: { icono: string; nombre: string; fecha: string; color: string }[]
}

const ANCHO = 1080
const TITULO = "'Inter Variable', 'Inter', system-ui, sans-serif"
const TEXTO = "'Inter Variable', 'Inter', system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
const PAPEL = '#f3f1df'
const TINTA = '#0b3d34'
const VERDE = '#0f6b57'

const TRAZOS_ICONO: Record<string, string> = {
  pluma:
    '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  mascaras:
    '<path d="M10 11h.01"/><path d="M14 6h.01"/><path d="M18 6h.01"/><path d="M6.5 13.1h.01"/><path d="M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3"/><path d="M17.4 9.9c-.8.8-2 .8-2.8 0"/><path d="M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"/><path d="M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4"/>',
  libros:
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
}

function svgIcono(icono: string, color: string): string {
  const trazos = TRAZOS_ICONO[icono] ?? TRAZOS_ICONO.libros
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${trazos}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = src
  })
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Parte un texto en líneas que quepan en `ancho` (máximo `maxLineas`, la última con …). */
function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const res: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba
    else {
      res.push(actual)
      actual = p
    }
  }
  if (actual) res.push(actual)
  if (res.length > maxLineas) {
    res.length = maxLineas
    let ultima = res[maxLineas - 1]
    while (ultima && ctx.measureText(ultima + '…').width > ancho) ultima = ultima.slice(0, -1)
    res[maxLineas - 1] = ultima + '…'
  }
  return res
}

/** La marca de agua: SVG tal cual o SVG pintado con su color (la UNAB). */
async function dibujarMarca(ctx: CanvasRenderingContext2D, marca: DatosImagen['marca'], x: number, y: number, lado: number) {
  ctx.save()
  ctx.globalAlpha = 0.14
  const img = marca.svg ? await cargarImagen(marca.svg) : null
  // Como en CSS (contain): el SVG cabe en el cuadro sin deformarse. Las proporciones salen del viewBox.
  const caja = marca.svg ? await fetch(marca.svg).then((r) => r.text()).then((t) => t.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/)).catch(() => null) : null
  const prop = caja ? Number(caja[1]) / Number(caja[2]) : 1
  const w = prop >= 1 ? lado : lado * prop
  const h = prop >= 1 ? lado / prop : lado
  const dx = x + (lado - w) / 2
  const dy = y + (lado - h) / 2
  if (img && marca.color) {
    const molde = document.createElement('canvas')
    molde.width = Math.ceil(w)
    molde.height = Math.ceil(h)
    const m = molde.getContext('2d')!
    m.drawImage(img, 0, 0, w, h)
    m.globalCompositeOperation = 'source-in'
    m.fillStyle = marca.color
    m.fillRect(0, 0, w, h)
    ctx.drawImage(molde, dx, dy)
  } else if (img) {
    ctx.drawImage(img, dx, dy, w, h)
  }
  ctx.restore()
}

function hoja(ctx: CanvasRenderingContext2D, y: number, alto: number) {
  rectRedondo(ctx, 60, y, ANCHO - 120, alto, 40)
  ctx.fillStyle = PAPEL
  ctx.fill()
}

function encabezado(ctx: CanvasRenderingContext2D, texto: string, y: number) {
  ctx.fillStyle = VERDE
  ctx.font = `800 28px ${TEXTO}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(texto.toUpperCase(), 100, y)
}

export async function crearImagenPasaporte(d: DatosImagen): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`600 40px ${TITULO}`),
    document.fonts.load(`800 40px ${TEXTO}`),
  ]).catch(() => {})

  const porFila = 3
  const filas = Math.ceil(d.sellos.length / porFila)
  const radio = filas > 1 ? 82 : 118
  const altoDatos = 600
  const altoSellos = 130 + filas * (radio * 2 + 40)
  const yDatos = 230
  const ySellos = yDatos + altoDatos + 40
  const alto = ySellos + altoSellos + 150

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!

  // Fondo
  ctx.fillStyle = TINTA
  ctx.fillRect(0, 0, ANCHO, alto)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.font = `600 72px ${TITULO}`
  ctx.fillText('¡Viaje completado!', ANCHO / 2, 125)
  ctx.globalAlpha = 0.8
  ctx.font = `700 32px ${TEXTO}`
  ctx.fillText('Pasaporte Lector · UNAB', ANCHO / 2, 180)
  ctx.globalAlpha = 1

  // Página de datos
  ctx.save()
  hoja(ctx, yDatos, altoDatos)
  ctx.clip()
  const franja = ctx.createLinearGradient(60, 0, ANCHO - 60, 0)
  ;['#eab83c', '#2fa57e', '#2c6fb3', '#d9503f'].forEach((c, i) => franja.addColorStop(i / 3, c))
  ctx.fillStyle = franja
  ctx.fillRect(60, yDatos, ANCHO - 120, 14)
  await dibujarMarca(ctx, d.marca, ANCHO - 60 - 340, yDatos + altoDatos - 300, 400)
  ctx.restore()

  encabezado(ctx, d.encabezado, yDatos + 70)

  const fx = 100, fy = yDatos + 105, fw = 240, fh = 300
  ctx.save()
  rectRedondo(ctx, fx - 8, fy - 8, fw + 16, fh + 16, 30)
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.restore()
  ctx.save()
  rectRedondo(ctx, fx, fy, fw, fh, 22)
  ctx.clip()
  ctx.fillStyle = '#bfe8d6'
  ctx.fillRect(fx, fy, fw, fh)
  if (d.foto) {
    const url = URL.createObjectURL(d.foto)
    const img = await cargarImagen(url)
    URL.revokeObjectURL(url)
    if (img) {
      // Recorte tipo "cover" centrado.
      const escala = Math.max(fw / img.width, fh / img.height)
      const w = img.width * escala, h = img.height * escala
      ctx.drawImage(img, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h)
    }
  }
  ctx.restore()

  const tx = 390, ancho = ANCHO - 100 - tx
  let ty = fy + 22
  ctx.textAlign = 'left'
  for (const [etiqueta, valor, max] of [['Nombre', d.nombre, 2], ['Carrera', d.carrera, 2], ['ID', d.id, 1]] as const) {
    ctx.fillStyle = TINTA
    ctx.globalAlpha = 0.7
    ctx.font = `700 26px ${TEXTO}`
    ctx.fillText(etiqueta, tx, ty)
    ctx.globalAlpha = 1
    ctx.font = `800 38px ${TEXTO}`
    for (const l of lineas(ctx, valor, ancho, max)) {
      ty += 44
      ctx.fillText(l, tx, ty)
    }
    ty += 50
  }

  ctx.fillStyle = '#35594f'
  ctx.font = `700 26px ${MONO}`
  ctx.fillText(d.mrz[0], 100, yDatos + altoDatos - 80)
  ctx.fillText(d.mrz[1], 100, yDatos + altoDatos - 42)

  // Página de sellos
  ctx.save()
  hoja(ctx, ySellos, altoSellos)
  ctx.clip()
  await dibujarMarca(ctx, d.marca, 40, ySellos - 40, 360)
  ctx.restore()
  encabezado(ctx, 'Sellos de viaje', ySellos + 70)

  const iconosSellos = await Promise.all(d.sellos.map((s) => cargarImagen(svgIcono(s.icono, s.color))))

  d.sellos.forEach((s, i) => {
    const fila = Math.floor(i / porFila)
    const enFila = Math.min(porFila, d.sellos.length - fila * porFila)
    const paso = (ANCHO - 120) / enFila
    const cx = 60 + paso * (i % porFila) + paso / 2
    const cy = ySellos + 115 + radio + fila * (radio * 2 + 40)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(([-8, 6, -4][i % 3] * Math.PI) / 180)
    ctx.beginPath()
    ctx.arc(0, 0, radio, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fill()
    ctx.lineWidth = 7
    ctx.strokeStyle = s.color
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const t = radio / 118
    const ladoIcono = 56 * t
    const imgIcono = iconosSellos[i]
    if (imgIcono) {
      ctx.drawImage(imgIcono, -ladoIcono / 2, -38 * t - ladoIcono / 2, ladoIcono, ladoIcono)
    }
    ctx.fillStyle = s.color
    ctx.font = `600 ${26 * t}px ${TITULO}`
    const nombre = lineas(ctx, s.nombre.toUpperCase(), radio * 1.6, 2)
    nombre.forEach((l, j) => ctx.fillText(l, 0, (14 + j * 28 - (nombre.length - 1) * 6) * t))
    ctx.font = `600 ${24 * t}px ${TITULO}`
    ctx.fillText(s.fecha.toUpperCase(), 0, (50 + (nombre.length - 1) * 20) * t)
    ctx.restore()
  })

  // Pie
  ctx.fillStyle = '#fff'
  ctx.globalAlpha = 0.75
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 30px ${TEXTO}`
  ctx.fillText(`Marca de agua: ${d.marca.nombre}`, ANCHO / 2, alto - 70)
  ctx.globalAlpha = 1

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'))
}

/** En iPhone abre el menú de compartir (ahí está «Guardar imagen» → Fotos); en el resto descarga el archivo. */
export async function guardarImagen(blob: Blob, nombre: string) {
  const archivo = new File([blob], nombre, { type: blob.type })
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (esIOS && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Mi Pasaporte Lector' })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
