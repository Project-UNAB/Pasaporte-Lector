// ─────────────────────────────────────────────────────────────────────────────
//  AYUDAS COMUNES DE LAS PRUEBAS DE PUNTA A PUNTA
//  Aquí viven los pasos que repiten casi todas las pruebas: preparar la página
//  con el Supabase de mentira, entrar con el código, ubicarse en una parada,
//  sellarla y medir la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

import { expect, type Page, type TestInfo } from '@playwright/test'
import { paradas, textos } from '../../../src/contenido.js'
import { CODIGO_CORREO, CORREO, PALABRAS, montarSupabaseFalso, type Semilla, type SupabaseFalso } from './mock-supabase.js'

/** Las losetas del mapa salen a internet: en las pruebas se cortan. */
const LOSETAS = '**://tile.openstreetmap.org/**'

/** Los datos de una parada tal como los ve la web (coordenadas incluidas). */
export function datosDeParada(id: string) {
  const parada = paradas.find((p) => p.id === id)
  if (!parada) throw new Error(`Parada desconocida en las pruebas: ${id}`)
  return parada
}

/** El proyecto es un iPhone (WebKit) o un Android (Chromium). */
export const esAndroid = (info: TestInfo) => info.project.name === 'android'

/**
 * Deja la página lista: corta las losetas del mapa, concede ubicación, instala
 * el Supabase de mentira y arranca la web desde una sesión limpia.
 */
export async function prepararPagina(page: Page, semilla: Semilla = {}, opciones: { limpia?: boolean } = {}): Promise<SupabaseFalso> {
  await page.context().setGeolocation({ latitude: paradas[0].lat, longitude: paradas[0].lng, accuracy: 6 })
  await page.context().grantPermissions(['geolocation'])
  await page.route(LOSETAS, (ruta) => ruta.abort())
  const falso = await montarSupabaseFalso(page, semilla)
  await page.goto('/')
  if (opciones.limpia !== false) {
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
  }
  return falso
}

/**
 * Cambia el estado del servidor falso sin perder la sesión guardada, y vuelve a
 * cargar la web en la ruta indicada.
 */
export async function conEstado(page: Page, semilla: Semilla, destino = '/'): Promise<SupabaseFalso> {
  const falso = await montarSupabaseFalso(page, semilla)
  await page.goto(`${destino}?escenario=${Date.now()}`)
  return falso
}

/** Coloca el GPS (simulado) en la parada indicada. */
export async function ubicarEn(page: Page, id: string, desvioMetros = 0) {
  const parada = datosDeParada(id)
  const grados = desvioMetros / 111_320
  await page.context().setGeolocation({ latitude: parada.lat + grados, longitude: parada.lng, accuracy: 6 })
}

/**
 * Bienvenida → correo → código. Deja la página donde la lleve la etapa.
 * `alVerCodigo` permite revisar la pantalla del código antes de escribirla.
 */
export async function iniciarSesion(page: Page, opciones: { alVerCodigo?: () => Promise<void> } = {}) {
  await expect(page.getByRole('link', { name: textos.bienvenidaBoton })).toBeVisible()
  await page.getByRole('link', { name: textos.bienvenidaBoton }).click()

  await expect(page).toHaveURL(/\/ingresar$/)
  await page.getByLabel('Correo', { exact: true }).fill(CORREO)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Enviar código' }).click()

  await expect(page).toHaveURL(/\/codigo$/)
  await expect(page.locator('#codigo')).toBeVisible()
  await opciones.alVerCodigo?.()
  await page.locator('#codigo').fill(CODIGO_CORREO)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/codigo'))
}

/** Llena el formulario de datos y continúa (paso 2 del registro). */
export async function llenarDatos(page: Page, datos = { id: 'U00182088', nombre: 'Ana María Pérez', carrera: 'Ingeniería de Sistemas' }) {
  await expect(page).toHaveURL(/\/datos$/)
  await page.locator('#id').fill(datos.id)
  await page.locator('#nombre').fill(datos.nombre)
  await page.locator('#carrera').selectOption(datos.carrera)
  await page.getByRole('button', { name: 'Continuar' }).click()
}

/** Toma la foto con la cámara simulada de Chromium (en WebKit no existe). */
export async function tomarFoto(page: Page) {
  await expect(page).toHaveURL(/\/foto$/)
  await page.getByRole('button', { name: 'Abrir cámara' }).click()
  await expect(page.locator('video')).toBeVisible()
  await page.waitForFunction(() => {
    const video = document.querySelector('video')
    return Boolean(video && video.videoWidth > 0)
  })
  await page.getByRole('button', { name: 'Tomar foto' }).click()
  await page.getByRole('button', { name: 'Usar esta foto' }).click()
  // La subida y el guardado son asíncronos: se espera a que la web avance.
  await expect(page).toHaveURL(/\/ubicacion$/, { timeout: 20_000 })
}

/** Acepta el permiso de ubicación y entra al mapa. */
export async function activarUbicacion(page: Page) {
  await expect(page).toHaveURL(/\/ubicacion$/)
  await page.getByRole('button', { name: 'Activar ubicación' }).click()
  await expect(page).toHaveURL(/\/mapa$/)
}

/** Toca el botón del mapa que lleva a la siguiente parada. */
export async function entrarALaSiguiente(page: Page, id: string) {
  await expect(page).toHaveURL(/\/mapa$/)
  await page.getByRole('link', { name: /Comenzar viaje|Continuar viaje/ }).click()
  await expect(page).toHaveURL(new RegExp(`/parada/${id}$`))
}

/** Devuelve la ruta cuando lleva un momento sin cambiar (deja asentar la pantalla). */
async function rutaAsentada(page: Page, quietaMs = 400): Promise<string> {
  let anterior = new URL(page.url()).pathname
  for (;;) {
    await page.waitForTimeout(quietaMs)
    const actual = new URL(page.url()).pathname
    if (actual === anterior) return actual
    anterior = actual
  }
}

/**
 * Se para en el póster, toca “Ya llegué” y escribe la palabra clave con
 * mayúsculas y espacios de sobra (el servidor la normaliza). Devuelve la
 * pantalla en la que queda: su tarjeta cultural o la biblioteca.
 */
export async function sellarParada(page: Page, id: string, palabra = PALABRAS[id]): Promise<'tarjeta' | 'biblioteca'> {
  // Se espera a que la pantalla se asiente: si la web saltara sola a /biblioteca
  // (sin mostrar la tarjeta), la prueba debe verlo.
  await ubicarEn(page, id)
  await page.getByRole('button', { name: 'Ya llegué' }).click()
  const campo = page.locator('#palabra')
  await expect(campo).toBeVisible()
  await campo.fill(`  ${palabra.toUpperCase()}  `)
  await page.getByRole('button', { name: 'Sellar parada' }).click()
  await page.waitForURL(/\/tarjeta\/[^/]+$|\/biblioteca$/)
  return (await rutaAsentada(page)) === '/biblioteca' ? 'biblioteca' : 'tarjeta'
}

/** Avanza desde la tarjeta cultural: siguiente parada, bloque o biblioteca. */
export async function salirDeLaTarjeta(page: Page): Promise<'mapa' | 'biblioteca'> {
  const cerrar = page.getByRole('button', { name: 'Cerrar el bloque' })
  if (await cerrar.count()) {
    await cerrar.click()
    // Esperar la tarjeta final del bloque antes de decidir a dónde sigue.
    const siguiente = page.getByRole('button', { name: /^(Ir a la biblioteca|Abrir el siguiente bloque)$/ })
    await expect(siguiente).toBeVisible()
    const aBiblioteca = (await siguiente.textContent())?.includes('biblioteca')
    await siguiente.click()
    if (aBiblioteca) {
      await page.waitForURL(/\/biblioteca$/)
      return 'biblioteca'
    }
  } else {
    await page.getByRole('button', { name: 'Siguiente parada' }).click()
  }
  return 'mapa'
}

/** Recorre las 9 paradas desde el mapa hasta la biblioteca. */
export async function recorrerTodasLasParadas(page: Page, desde = 0): Promise<'mapa' | 'biblioteca'> {
  for (let i = desde; i < paradas.length; i++) {
    await entrarALaSiguiente(page, paradas[i].id)
    const donde = await sellarParada(page, paradas[i].id)
    // Todas, incluida la novena, deben abrir su tarjeta cultural.
    expect(donde, `la parada ${paradas[i].id} debe abrir su tarjeta cultural`).toBe('tarjeta')
    if ((await salirDeLaTarjeta(page)) === 'biblioteca') return 'biblioteca'
  }
  return 'mapa'
}

/** El personal de la biblioteca ingresa el código y se abre el pasaporte. */
export async function activarPasaporte(page: Page, codigo: string) {
  await page.getByRole('button', { name: 'Soy del equipo de la biblioteca' }).click()
  await page.locator('#codigo-bib').fill(codigo)
  await page.getByRole('button', { name: 'Activar pasaporte' }).click()
}

// ─── Revisiones de pantalla ──────────────────────────────────────────────────

export interface Medida {
  ruta: string
  ancho: number
  scrollWidth: number
  culpables: string[]
}

/** Mide el desbordamiento horizontal de la pantalla actual. */
export async function medirAncho(page: Page): Promise<Medida> {
  await page.waitForTimeout(250)
  return page.evaluate(() => {
    const ancho = window.innerWidth
    const culpables: string[] = []
    for (const elemento of document.querySelectorAll('body *')) {
      if (elemento.closest('.mapa-campus')) continue // las capas de Leaflet siempre sobresalen del recuadro
      const caja = elemento.getBoundingClientRect()
      if (caja.width === 0 && caja.height === 0) continue
      if (caja.right > ancho + 1 || caja.left < -1) {
        const clase = typeof elemento.className === 'string' ? elemento.className.split(' ')[0] : ''
        culpables.push(`${elemento.tagName.toLowerCase()}${clase ? '.' + clase : ''} [${Math.round(caja.left)}..${Math.round(caja.right)}]`)
      }
    }
    return {
      ruta: location.pathname,
      ancho,
      scrollWidth: document.documentElement.scrollWidth,
      culpables: [...new Set(culpables)].slice(0, 5),
    }
  })
}

/** Comprueba que la pantalla no se desplace de lado y devuelve la medida. */
export async function sinScrollHorizontal(page: Page, nombre: string): Promise<Medida> {
  const medida = await medirAncho(page)
  expect(
    medida.scrollWidth,
    `${nombre}: la pantalla se desplaza de lado (scrollWidth ${medida.scrollWidth} > ${medida.ancho} px). Elementos que sobresalen: ${medida.culpables.join(', ') || 'ninguno'}`,
  ).toBeLessThanOrEqual(medida.ancho + 1)
  return medida
}

export interface Campo {
  etiqueta: string
  tamano: number
}

/** Tamaño de letra de los campos visibles de la pantalla actual. */
export async function medirCampos(page: Page): Promise<Campo[]> {
  await page.waitForTimeout(250) // deja que la pantalla termine de pintarse
  return page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((campo) => {
        const caja = campo.getBoundingClientRect()
        return caja.width > 0 && caja.height > 0
      })
      .map((campo) => ({
        etiqueta: campo.id || campo.getAttribute('name') || (campo as HTMLInputElement).type || campo.tagName.toLowerCase(),
        tamano: Number.parseFloat(getComputedStyle(campo).fontSize),
      })),
  )
}

/** Comprueba que ningún campo baje de 16 px (Safari hace zoom si es menor). */
export async function camposDe16px(page: Page, nombre: string): Promise<Campo[]> {
  const campos = await medirCampos(page)
  for (const campo of campos) {
    expect(campo.tamano, `${nombre}: el campo "${campo.etiqueta}" tiene ${campo.tamano} px de letra (mínimo 16)`).toBeGreaterThanOrEqual(16)
  }
  return campos
}
