import { describe, expect, it } from 'vitest'
import { normalizarPalabra as delNavegador } from './normalizar'
import { normalizarPalabra as delScript } from '../../scripts/normalizar.mjs'
import { distanciaMetros } from './geo'
import { paradas } from '../contenido.js'

describe('normalizarPalabra', () => {
  it.each([
    ['Poesía', 'poesia'],
    ['  POESÍA ', 'poesia'],
    ['Telón', 'telon'],
    ['capítulo', 'capitulo'],
    ['Año  nuevo', 'ano nuevo'],
  ])('%s → %s', (entrada, esperado) => {
    expect(delNavegador(entrada)).toBe(esperado)
    expect(delScript(entrada)).toBe(esperado)
  })
})

describe('distanciaMetros', () => {
  it('es cero en el mismo punto', () => {
    expect(distanciaMetros({ lat: 7.117, lng: -73.105 }, { lat: 7.117, lng: -73.105 })).toBe(0)
  })
  it('mide ~111 m por milésima de grado de latitud', () => {
    const d = distanciaMetros({ lat: 7.117, lng: -73.105 }, { lat: 7.118, lng: -73.105 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})

describe('contenido', () => {
  it('tiene 3 bloques de 3 paradas con ids únicos y la biblioteca al final', () => {
    expect(paradas).toHaveLength(9)
    expect(new Set(paradas.map((p) => p.id)).size).toBe(9)
    expect(paradas.map((p) => p.posicion)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(paradas[8].bloqueId).toBe('b3')
  })
})
