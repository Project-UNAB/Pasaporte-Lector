// ─────────────────────────────────────────────────────────────────────────────
//  CASOS A y F: recorrido completo y recarga a mitad del recorrido.
//  Cubre las 9 paradas, los 3 bloques, la biblioteca y el pasaporte.
// ─────────────────────────────────────────────────────────────────────────────

import { expect, test } from '@playwright/test'
import { paradas } from '../../src/contenido.js'
import { CODIGO_BIBLIOTECA, PALABRAS, perfilListo } from './apoyo/mock-supabase.js'
import {
  activarPasaporte,
  activarUbicacion,
  entrarALaSiguiente,
  esAndroid,
  iniciarSesion,
  llenarDatos,
  prepararPagina,
  recorrerTodasLasParadas,
  salirDeLaTarjeta,
  sellarParada,
  tomarFoto,
} from './apoyo/ayudas.js'

test('a) recorrido completo hasta el pasaporte', async ({ page }, info) => {
  // Chromium trae cámara simulada; WebKit no, así que ahí se arranca con un
  // estado que ya tiene nombre y foto.
  const conCamara = esAndroid(info)
  const falso = await prepararPagina(page, conCamara ? {} : { perfil: perfilListo() })

  await iniciarSesion(page)
  if (conCamara) {
    await llenarDatos(page)
    await tomarFoto(page)
    expect(falso.perfil()?.foto_path).toBeTruthy()
    // La foto se sube al bucket privado antes de enlazarla en el perfil.
    expect(falso.registro.some((peticion) => peticion.startsWith('POST /storage/v1/object/fotos/'))).toBe(true)
  }

  await activarUbicacion(page)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(await recorrerTodasLasParadas(page)).toBe('biblioteca')

  await expect(page).toHaveURL(/\/biblioteca$/)
  await expect(page.getByRole('heading', { name: /Completaste las 9 paradas/ })).toBeVisible()

  await activarPasaporte(page, CODIGO_BIBLIOTECA)
  await expect(page).toHaveURL(/\/pasaporte$/)
  await expect(page.getByRole('heading', { name: /Viaje completado/ })).toBeVisible()
  await expect(page.getByText('Ana María Pérez')).toBeVisible()
  await expect(page.getByText('Ingeniería de Sistemas')).toBeVisible()

  // El pasaporte pide el enlace firmado de la foto.
  expect(falso.registro.some((peticion) => peticion.startsWith('POST /storage/v1/object/sign/fotos/'))).toBe(true)
  expect(falso.completadas()).toEqual(paradas.map((p) => p.id))
  expect(falso.intentos('palabra_correcta')).toHaveLength(9)
  expect(falso.perfil()?.activado_en).toBeTruthy()
})

/**
 * Al sellar la novena parada se ve su tarjeta cultural y el cierre del bloque 3
 * antes de llegar a la biblioteca (antes la web saltaba directo a /biblioteca).
 */
test('a2) la tarjeta de la última parada y el cierre del bloque 3 se muestran', async ({ page }) => {
  await prepararPagina(page, { perfil: perfilListo(), completadas: paradas.slice(0, 8).map((p) => p.id) })
  await iniciarSesion(page)
  await activarUbicacion(page)
  await entrarALaSiguiente(page, paradas[8].id)
  expect(await sellarParada(page, paradas[8].id)).toBe('tarjeta')
  await expect(page).toHaveURL(new RegExp(`/tarjeta/${paradas[8].id}$`))
  await expect(page.getByRole('heading', { name: paradas[8].tarjeta.titulo })).toBeVisible()

  await page.getByRole('button', { name: 'Cerrar el bloque' }).click()
  await expect(page.getByRole('heading', { name: /Último paso: la Biblioteca/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ir a la biblioteca' }).click()
  await expect(page).toHaveURL(/\/biblioteca$/)
})

test('f) al recargar a mitad del recorrido continúa donde iba', async ({ page }) => {
  const falso = await prepararPagina(page, { perfil: perfilListo() })
  await iniciarSesion(page)
  await activarUbicacion(page)

  // Sella las dos primeras paradas del bloque 1.
  await entrarALaSiguiente(page, paradas[0].id)
  await sellarParada(page, paradas[0].id)
  await salirDeLaTarjeta(page)
  await entrarALaSiguiente(page, paradas[1].id)
  await sellarParada(page, paradas[1].id)
  await salirDeLaTarjeta(page)

  await expect(page).toHaveURL(/\/mapa$/)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await page.reload()

  // Sigue en el mapa, con el mismo avance y la misma parada pendiente.
  await expect(page).toHaveURL(/\/mapa$/)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await expect(page.getByText(paradas[2].lugar)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continuar viaje' })).toBeVisible()

  // Y puede seguir justo por donde iba.
  await entrarALaSiguiente(page, paradas[2].id)
  await sellarParada(page, paradas[2].id, PALABRAS[paradas[2].id])
  await expect(page).toHaveURL(new RegExp(`/tarjeta/${paradas[2].id}$`))
  expect(falso.completadas()).toEqual([paradas[0].id, paradas[1].id, paradas[2].id])
})
