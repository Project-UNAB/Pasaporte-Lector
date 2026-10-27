// ─────────────────────────────────────────────────────────────────────────────
//  CASOS B, E e I: correo de otro dominio, cuenta expirada y /calibrar sin sesión.
// ─────────────────────────────────────────────────────────────────────────────

import { expect, test } from '@playwright/test'
import { textos } from '../../src/contenido.js'
import { CODIGO_CORREO, CORREO, perfilListo } from './apoyo/mock-supabase.js'
import { iniciarSesion, prepararPagina } from './apoyo/ayudas.js'

const haceHoras = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString()

test('b) un correo de otro dominio no habilita el botón', async ({ page }) => {
  const falso = await prepararPagina(page)
  await page.getByRole('link', { name: textos.bienvenidaBoton }).click()
  await expect(page).toHaveURL(/\/ingresar$/)

  const correo = page.getByLabel('Correo', { exact: true })
  const boton = page.getByRole('button', { name: 'Enviar código' })

  await correo.fill('alguien@gmail.com')
  await expect(boton).toBeDisabled() // sin autorización
  await page.getByRole('checkbox').check()
  await expect(boton).toBeDisabled() // con autorización, pero el dominio no sirve
  await expect(page).toHaveURL(/\/ingresar$/)

  // El correo institucional sí habilita el botón, aunque venga con mayúsculas y espacios.
  await correo.fill(`  ${CORREO.toUpperCase()}  `)
  await expect(boton).toBeEnabled()

  // Nunca se pidió un código para el correo ajeno.
  expect(falso.registro.filter((peticion) => peticion.includes('/auth/v1/otp'))).toHaveLength(0)
})

test('e) una cuenta expirada lleva a la pantalla de bloqueo', async ({ page }) => {
  const falso = await prepararPagina(page, {
    perfil: perfilListo({ inicio: haceHoras(25), vence: haceHoras(1) }),
    completadas: ['b1-p1', 'b1-p2'],
  })

  await iniciarSesion(page)

  await expect(page).toHaveURL(/\/bloqueado$/)
  await expect(page.getByRole('heading', { name: 'Se acabó el tiempo' })).toBeVisible()
  await expect(page.getByText(/Lograste 2 de 9 paradas/)).toBeVisible()
  expect(falso.perfil()?.estado).toBe('expirado')
  expect(falso.perfil()?.activado_en).toBeNull()
})

test('i) /calibrar carga sin sesión', async ({ page }) => {
  const falso = await prepararPagina(page)
  await page.goto('/calibrar')

  await expect(page.getByRole('heading', { name: 'Calibrar paradas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar ubicación' })).toBeVisible()
  await expect(page.locator('#parada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Anotar aquí' })).toBeDisabled()

  // La página oculta no depende de la sesión ni del juego.
  expect(falso.registro.filter((peticion) => peticion.includes('/rest/v1/rpc/'))).toHaveLength(0)
})

test('j) iniciar sesión con una cuenta existente entra con el código, sin pedir la autorización otra vez', async ({ page }) => {
  await prepararPagina(page, { perfil: perfilListo() })
  await page.getByRole('link', { name: textos.bienvenidaBotonEntrar }).click()
  await expect(page).toHaveURL(/\/ingresar\?modo=entrar$/)
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)

  await page.getByLabel('Correo', { exact: true }).fill(CORREO)
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await expect(page).toHaveURL(/\/codigo$/)
  await page.locator('#codigo').fill(CODIGO_CORREO)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/codigo'))
  await expect(page).not.toHaveURL(/\/ingresar/)
})

test('k) iniciar sesión con un correo sin cuenta avisa que hay que crearla', async ({ page }) => {
  await prepararPagina(page)
  await page.goto('/ingresar?modo=entrar')
  await page.getByLabel('Correo', { exact: true }).fill(CORREO)
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await expect(page.getByRole('alert')).toContainText('No hay una cuenta con ese correo')
  await expect(page).toHaveURL(/\/ingresar\?modo=entrar$/)

  await page.getByRole('link', { name: '¿No tienes cuenta? Créala aquí' }).click()
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(1)
})
