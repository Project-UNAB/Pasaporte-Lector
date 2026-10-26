// ─────────────────────────────────────────────────────────────────────────────
//  CASOS C y D: palabra clave y ayuda por ubicación.
// ─────────────────────────────────────────────────────────────────────────────

import { expect, test } from '@playwright/test'
import { PALABRAS, perfilListo } from './apoyo/mock-supabase.js'
import { activarUbicacion, entrarALaSiguiente, iniciarSesion, prepararPagina, ubicarEn } from './apoyo/ayudas.js'

/** Cerca del póster: primero la palabra equivocada y luego la correcta. */
test('c) la palabra incorrecta avisa y la correcta abre la tarjeta', async ({ page }) => {
  const falso = await prepararPagina(page, { perfil: perfilListo(), completadas: ['b1-p1'] })
  await iniciarSesion(page)
  await activarUbicacion(page)
  await entrarALaSiguiente(page, 'b1-p2')

  await ubicarEn(page, 'b1-p2')
  await page.getByRole('button', { name: 'Ya llegué' }).click()
  const campo = page.locator('#palabra')
  await expect(campo).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ya llegué' })).toBeHidden()

  await campo.fill('palabra-equivocada')
  await page.getByRole('button', { name: 'Sellar parada' }).click()
  await expect(page.getByRole('alert')).toContainText('Esa no es la palabra')
  await expect(page).toHaveURL(/\/parada\/b1-p2$/)
  expect(falso.completadas()).toEqual(['b1-p1'])

  await campo.fill(`  ${PALABRAS['b1-p2'].toUpperCase()}  `)
  await page.getByRole('button', { name: 'Sellar parada' }).click()
  await expect(page).toHaveURL(/\/tarjeta\/b1-p2$/)
  await expect(page.getByRole('heading', { name: 'Un Nobel que escribió al amor' })).toBeVisible()

  expect(falso.completadas()).toEqual(['b1-p1', 'b1-p2'])
  expect(falso.intentos('palabra_incorrecta')).toHaveLength(1)
  expect(falso.intentos('palabra_correcta')).toHaveLength(1)
})

/** Lejos del póster: a los 3 intentos fallidos aparece la ayuda y se abre el campo. */
test('d) lejos del póster la ayuda aparece tras 3 fallos y habilita el campo', async ({ page }) => {
  const falso = await prepararPagina(page, { perfil: perfilListo() })
  await iniciarSesion(page)
  await activarUbicacion(page)
  await entrarALaSiguiente(page, 'b1-p1')

  await ubicarEn(page, 'b1-p1', 400) // 400 m al norte de la parada (el radio es 40 m)
  const yaLlegue = page.getByRole('button', { name: 'Ya llegué' })
  const ayuda = page.getByRole('button', { name: /Ya estás frente al póster/ })
  const campo = page.locator('#palabra')

  for (let intento = 1; intento <= 2; intento++) {
    await yaLlegue.click()
    await expect(page.getByRole('alert')).toContainText('Estás lejos de la parada')
    await expect(ayuda).toBeHidden()
    await expect(campo).toBeHidden()
  }

  await yaLlegue.click()
  await expect(page.getByRole('alert')).toContainText('Estás lejos de la parada')
  await expect(ayuda).toBeVisible()
  await expect(campo).toBeHidden()

  // Con la ayuda ya se puede escribir la palabra.
  await ayuda.click()
  await expect(campo).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Escribe la palabra clave')
  await expect(yaLlegue).toBeHidden()

  expect(falso.intentos('ubicacion_fallida')).toHaveLength(3)
  expect(falso.intentos('ayuda_usada')).toHaveLength(1)
  expect(falso.estado()?.fallos_ubicacion['b1-p1']).toBe(3)
})
