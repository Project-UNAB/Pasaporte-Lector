// ─────────────────────────────────────────────────────────────────────────────
//  CASOS G y H: revisión de todas las pantallas.
//  G: a 360 px de ancho ninguna pantalla se desplaza de lado.
//  H: los campos visibles tienen 16 px o más de letra (Safari hace zoom si no).
// ─────────────────────────────────────────────────────────────────────────────

import { expect, test, type Page } from '@playwright/test'
import { paradas, textos } from '../../src/contenido.js'
import { CODIGO_BIBLIOTECA, perfilListo } from './apoyo/mock-supabase.js'
import {
  activarUbicacion,
  camposDe16px,
  conEstado,
  iniciarSesion,
  llenarDatos,
  prepararPagina,
  sinScrollHorizontal,
  ubicarEn,
} from './apoyo/ayudas.js'

/** Recorre una por una todas las pantallas de la web. */
async function recorrerPantallas(page: Page, revisar: (nombre: string) => Promise<void>) {
  // ── Sin sesión ──
  await prepararPagina(page)
  await revisar('bienvenida')
  await page.getByRole('link', { name: textos.bienvenidaBoton }).click()
  await expect(page).toHaveURL(/\/ingresar$/)
  await expect(page.getByLabel('Correo', { exact: true })).toBeVisible()
  await revisar('ingresar')

  await page.goto('/calibrar')
  await expect(page.getByRole('heading', { name: 'Calibrar paradas' })).toBeVisible()
  await revisar('calibrar')

  // ── Registro ──
  await page.goto('/')
  await iniciarSesion(page, { alVerCodigo: () => revisar('codigo') })
  await expect(page).toHaveURL(/\/datos$/)
  await revisar('datos')
  await llenarDatos(page)
  await expect(page).toHaveURL(/\/foto$/)
  await revisar('foto')

  // ── Juego ──
  await conEstado(page, { perfil: perfilListo() })
  await expect(page).toHaveURL(/\/ubicacion$/)
  await revisar('ubicacion')
  await activarUbicacion(page)
  await revisar('mapa')

  await conEstado(page, { perfil: perfilListo(), completadas: ['b1-p1'] }, '/parada/b1-p2')
  await ubicarEn(page, 'b1-p2')
  await page.getByRole('button', { name: 'Ya llegué' }).click()
  await expect(page.locator('#palabra')).toBeVisible()
  await revisar('parada con el teclado abierto')
  await page.locator('#palabra').fill('palabra-equivocada')
  await page.getByRole('button', { name: 'Sellar parada' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await revisar('parada con aviso de error')

  await conEstado(page, { perfil: perfilListo(), completadas: ['b1-p1', 'b1-p2'] }, '/mapa')
  await revisar('mapa con un bloque a medias')

  await conEstado(page, { perfil: perfilListo(), completadas: ['b1-p1'] }, '/tarjeta/b1-p1')
  await revisar('tarjeta cultural')

  // ── Biblioteca y pasaporte ──
  await conEstado(page, { perfil: perfilListo(), completadas: paradas.map((p) => p.id) })
  await expect(page).toHaveURL(/\/biblioteca$/)
  await revisar('biblioteca')
  await page.getByRole('button', { name: 'Soy del equipo de la biblioteca' }).click()
  await expect(page.locator('#codigo-bib')).toBeVisible()
  await revisar('biblioteca con el campo del código')
  await page.locator('#codigo-bib').fill(CODIGO_BIBLIOTECA)
  await page.getByRole('button', { name: 'Activar pasaporte' }).click()
  await expect(page).toHaveURL(/\/pasaporte$/)
  await expect(page.getByRole('heading', { name: /Viaje completado/ })).toBeVisible()
  await revisar('pasaporte')

  // ── Bloqueado ──
  await conEstado(page, { perfil: perfilListo({ inicio: new Date(Date.now() - 25 * 3_600_000).toISOString(), vence: new Date(Date.now() - 3_600_000).toISOString() }) })
  await expect(page).toHaveURL(/\/bloqueado$/)
  await revisar('bloqueado')
}

test('g) ninguna pantalla se desplaza de lado a 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  let pantallas = 0
  await recorrerPantallas(page, async (nombre) => {
    const medida = await sinScrollHorizontal(page, nombre)
    expect(medida.ancho, `${nombre}: la ventana debe medir 360 px de ancho`).toBe(360)
    pantallas++
  })
  expect(pantallas, 'la revisión debe haber pasado por todas las pantallas').toBeGreaterThanOrEqual(12)
})

test('h) los campos de texto tienen 16 px o más de letra', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  let camposRevisados = 0
  await recorrerPantallas(page, async (nombre) => {
    camposRevisados += (await camposDe16px(page, nombre)).length
  })
  // Si esta cuenta bajara a cero, la prueba no estaría mirando ningún campo.
  expect(camposRevisados, 'la revisión debe haber medido campos de verdad').toBeGreaterThanOrEqual(8)
})
