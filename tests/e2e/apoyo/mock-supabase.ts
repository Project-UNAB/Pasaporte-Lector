// ─────────────────────────────────────────────────────────────────────────────
//  SUPABASE DE MENTIRA PARA LAS PRUEBAS
//  Intercepta todas las peticiones que la web hace a `https://mock.supabase.co`
//  y las responde con un estado en memoria. Las reglas del servidor (orden de
//  las paradas, palabra normalizada, reloj de 24 h, límites de intentos) se
//  copian de supabase/migrations/0001_esquema.sql para que las pruebas vean lo
//  mismo que vería Supabase. Nunca se sale a la red.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'
import type { Page, Route } from '@playwright/test'
import { paradas } from '../../../src/contenido.js'

/** Todas las peticiones de la web al Supabase de mentira. */
const SITIO_FALSO = /^https:\/\/mock\.supabase\.co\//

/** Id fijo del usuario de prueba. */
export const USUARIO = '11111111-1111-4111-8111-111111111111'
export const CORREO = 'viajero@unab.edu.co'
/** Código que "llega por correo". */
export const CODIGO_CORREO = '246810'
/** Código del equipo de la biblioteca. */
export const CODIGO_BIBLIOTECA = 'BIBLIO-2026'

/** Palabras de prueba: las reales viven en claves.json y no se tocan. */
export const PALABRAS: Record<string, string> = {
  'b1-p1': 'Pombo',
  'b1-p2': 'Neruda',
  'b1-p3': 'Silva',
  'b2-p1': 'Shakespeare',
  'b2-p2': 'Lorca',
  'b2-p3': 'Escena',
  'b3-p1': 'Quijote',
  'b3-p2': 'María',
  'b3-p3': 'Macondo',
}

const FOTO_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
)

const POSICION: Record<string, number> = Object.fromEntries(paradas.map((p) => [p.id, p.posicion]))
const TOTAL = paradas.length
const MINUTO = 60_000

// ─── Copia de public.normalizar_palabra y public.hash_palabra ────────────────

const DE = 'áàäâéèëêíìïîóòöôúùüûñç'
const A = 'aaaaeeeeiiiioooouuuunc'

function normalizarPalabra(p: string): string {
  const s = [...p.toLowerCase()].map((c) => (DE.includes(c) ? A[DE.indexOf(c)] : c))
  return s.join('').replace(/\s+/g, ' ').trim()
}

function hashPalabra(p: string): string {
  return createHash('sha256').update(`pasaporte-lector:${normalizarPalabra(p)}`).digest('hex')
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PerfilFalso {
  usuario: string
  correo: string
  nombre: string | null
  id_estudiantil: string | null
  carrera: string | null
  foto_path: string | null
  consentimiento_en: string
  inicio: string
  vence: string
  marca_agua: number
  finalizado_en: string | null
  activado_en: string | null
  estado: 'activo' | 'expirado' | 'completado'
}

export interface CompletadaFalsa {
  parada: string
  posicion: number
  completado_en: string
}

export interface EstadoFalso {
  ahora: string
  total: number
  perfil: PerfilFalso | null
  completadas: CompletadaFalsa[]
  fallos_ubicacion: Record<string, number>
  ayuda_usada: string[]
}

export interface Semilla {
  /** `null` (por defecto) = la persona todavía no tiene perfil. */
  perfil?: Partial<PerfilFalso> | null
  /** Ids de paradas ya selladas, en orden. */
  completadas?: string[]
  palabras?: Record<string, string>
  codigoBiblioteca?: string | null
  /** Código que "llega por correo" (para probar códigos equivocados). */
  codigoCorreo?: string
}

export interface SupabaseFalso {
  /** Último estado que entregó el servidor falso. */
  estado(): EstadoFalso | null
  perfil(): PerfilFalso | null
  completadas(): string[]
  intentos(tipo?: string): { tipo: string; parada: string | null; creado_en: string }[]
  /** Peticiones recibidas, como "POST /rest/v1/rpc/estado_juego". */
  registro: string[]
}

// ─── Perfil de prueba ────────────────────────────────────────────────────────

const hace = (ms: number) => new Date(Date.now() - ms).toISOString()
const en = (ms: number) => new Date(Date.now() + ms).toISOString()

function crearPerfil(datos: Partial<PerfilFalso>): PerfilFalso {
  const inicio = datos.inicio ?? hace(5 * MINUTO)
  return {
    usuario: USUARIO,
    correo: CORREO,
    nombre: null,
    id_estudiantil: null,
    carrera: null,
    foto_path: null,
    consentimiento_en: inicio,
    inicio,
    vence: en(24 * 60 * MINUTO),
    marca_agua: 7,
    finalizado_en: null,
    activado_en: null,
    estado: 'activo',
    ...datos,
  }
}

/** Perfil listo para jugar (con nombre y foto): la base de casi todas las pruebas. */
export function perfilListo(datos: Partial<PerfilFalso> = {}): Partial<PerfilFalso> {
  return {
    nombre: 'Ana María Pérez',
    id_estudiantil: '182088',
    carrera: 'Ingeniería de Sistemas',
    foto_path: `${USUARIO}/foto.jpg`,
    ...datos,
  }
}

// ─── Montaje ─────────────────────────────────────────────────────────────────

export async function montarSupabaseFalso(page: Page, semilla: Semilla = {}): Promise<SupabaseFalso> {
  const palabras = { ...PALABRAS, ...semilla.palabras }
  const codigoCorreo = semilla.codigoCorreo ?? CODIGO_CORREO
  const codigoBiblioteca = semilla.codigoBiblioteca === undefined ? CODIGO_BIBLIOTECA : semilla.codigoBiblioteca

  let perfil: PerfilFalso | null = semilla.perfil === undefined || semilla.perfil === null ? null : crearPerfil(semilla.perfil)
  const completadas: CompletadaFalsa[] = (semilla.completadas ?? []).map((id) => ({
    parada: id,
    posicion: POSICION[id],
    completado_en: hace(20 * MINUTO),
  }))
  if (perfil && completadas.length === TOTAL && !perfil.finalizado_en) perfil.finalizado_en = hace(10 * MINUTO)

  const intentos: { tipo: string; parada: string | null; creado_en: string }[] = []
  const objetos = new Set<string>()
  const registro: string[] = []
  let ultimoEstado: EstadoFalso | null = null
  let correoPendiente = CORREO
  let veces = 0

  // Cierra la cuenta cuando pasan las 24 h, igual que public._expirar.
  function expirar() {
    if (perfil && perfil.estado === 'activo' && !perfil.finalizado_en && Date.parse(perfil.vence) <= Date.now())
      perfil.estado = 'expirado'
  }

  function contar(tipo: string, desdeMs: number): number {
    const desde = Date.now() - desdeMs
    return intentos.filter((i) => i.tipo === tipo && Date.parse(i.creado_en) > desde).length
  }

  function anotar(tipo: string, parada: string | null = null) {
    intentos.push({ tipo, parada, creado_en: new Date().toISOString() })
  }

  function estadoJuego(): EstadoFalso {
    expirar()
    const fallos: Record<string, number> = {}
    for (const i of intentos) {
      if (i.tipo === 'ubicacion_fallida' && i.parada) fallos[i.parada] = (fallos[i.parada] ?? 0) + 1
    }
    ultimoEstado = {
      ahora: new Date().toISOString(),
      total: TOTAL,
      perfil: perfil ? { ...perfil } : null,
      completadas: completadas.map((c) => ({ ...c })),
      fallos_ubicacion: fallos,
      ayuda_usada: [...new Set(intentos.filter((i) => i.tipo === 'ayuda_usada' && i.parada).map((i) => i.parada!))],
    }
    return ultimoEstado
  }

  function guardarDatos(cuerpo: Record<string, string>) {
    expirar()
    if (!perfil || perfil.estado !== 'activo') return { error: 'juego_no_activo' }
    if (completadas.length > 0) return { error: 'datos_bloqueados' }
    const id = String(cuerpo.p_id_estudiantil ?? '').replace(/\s/g, '').toUpperCase()
    const nombre = String(cuerpo.p_nombre ?? '').replace(/\s+/g, ' ').trim()
    const carrera = String(cuerpo.p_carrera ?? '').trim()
    if (!/^[A-Z0-9]{4,15}$/.test(id)) return { error: 'id_invalido' }
    if (nombre.length < 3 || nombre.length > 80) return { error: 'nombre_invalido' }
    if (carrera.length < 2 || carrera.length > 80) return { error: 'carrera_invalida' }
    perfil.id_estudiantil = id
    perfil.nombre = nombre
    perfil.carrera = carrera
    return { error: null }
  }

  function guardarFoto() {
    if (!perfil) return { error: 'sin_perfil' }
    const ruta = `${USUARIO}/foto.jpg`
    if (!objetos.has(ruta)) return { error: 'foto_no_encontrada' }
    perfil.foto_path = ruta
    return { error: null }
  }

  function registrarUbicacion(cuerpo: Record<string, string>) {
    const tipo = String(cuerpo.p_tipo ?? '')
    const parada = String(cuerpo.p_parada ?? '')
    if (tipo !== 'ubicacion_fallida' && tipo !== 'ayuda_usada') return { error: 'tipo_invalido' }
    if (!(parada in POSICION)) return { error: 'parada_invalida' }
    if (intentos.filter((i) => Date.parse(i.creado_en) > Date.now() - MINUTO).length >= 30) return { error: 'demasiados_intentos' }
    anotar(tipo, parada)
    return { error: null }
  }

  function enviarPalabra(cuerpo: Record<string, string>) {
    expirar()
    if (!perfil) return { respuesta: { resultado: 'sin_perfil' } }
    if (perfil.estado === 'expirado') return { respuesta: { resultado: 'expirado' } }
    if (perfil.finalizado_en) return { respuesta: { resultado: 'ya_finalizado' } }
    if (!perfil.nombre || !perfil.foto_path) return { respuesta: { resultado: 'datos_incompletos' } }

    const parada = String(cuerpo.p_parada ?? '')
    if (!(parada in POSICION)) return { respuesta: { resultado: 'parada_invalida' } }
    if (completadas.some((c) => c.parada === parada)) return { respuesta: { resultado: 'ya_completada' } }
    if (POSICION[parada] !== completadas.length + 1) return { respuesta: { resultado: 'fuera_de_orden' } }
    if (contar('palabra_incorrecta', MINUTO) >= 5) return { respuesta: { resultado: 'espera' } }

    const palabra = String(cuerpo.p_palabra ?? '')
    const ok = palabra.length <= 64 && hashPalabra(palabra) === hashPalabra(palabras[parada] ?? '')
    anotar(ok ? 'palabra_correcta' : 'palabra_incorrecta', parada)
    if (!ok) return { respuesta: { resultado: 'incorrecta' } }

    completadas.push({ parada, posicion: POSICION[parada], completado_en: new Date().toISOString() })
    if (POSICION[parada] === TOTAL) perfil.finalizado_en = new Date().toISOString()
    return { respuesta: { resultado: 'correcta', completadas: completadas.length } }
  }

  function activarPasaporte(cuerpo: Record<string, string>) {
    expirar()
    if (!perfil) return { respuesta: { resultado: 'sin_perfil' } }
    if (perfil.activado_en) return { respuesta: { resultado: 'ya_activado' } }
    if (!perfil.finalizado_en) return { respuesta: { resultado: 'faltan_paradas' } }
    if (contar('codigo_incorrecto', 10 * MINUTO) >= 5) return { respuesta: { resultado: 'espera' } }
    if (!codigoBiblioteca) return { respuesta: { resultado: 'sin_codigo_configurado' } }

    const codigo = String(cuerpo.p_codigo ?? '')
    if (codigo.length > 64 || normalizarPalabra(codigo) !== normalizarPalabra(codigoBiblioteca)) {
      anotar('codigo_incorrecto')
      return { respuesta: { resultado: 'incorrecto' } }
    }
    anotar('codigo_correcto')
    perfil.activado_en = new Date().toISOString()
    perfil.estado = 'completado'
    return { respuesta: { resultado: 'activado' } }
  }

  // ─── Respuestas HTTP ───────────────────────────────────────────────────────

  function cors(ruta: Route) {
    const pedidos = ruta.request().headers()['access-control-request-headers']
    return {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': pedidos ?? '*',
      'access-control-expose-headers': '*',
      'access-control-max-age': '600',
    }
  }

  const respuesta = (ruta: Route, cuerpo: unknown, status = 200) =>
    ruta.fulfill({
      status,
      headers: { ...cors(ruta), 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })

  const errorRpc = (ruta: Route, mensaje: string) =>
    respuesta(ruta, { code: 'P0001', message: mensaje, details: null, hint: null }, 400)

  function sesion() {
    const ahoraSeg = Math.floor(Date.now() / 1000)
    return {
      access_token: 'jwt-de-prueba',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: ahoraSeg + 3600,
      refresh_token: 'refresco-de-prueba',
      user: {
        id: USUARIO,
        aud: 'authenticated',
        role: 'authenticated',
        email: correoPendiente,
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        phone: '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: false,
      },
    }
  }

  // Si ya había un escenario montado, se reemplaza.
  await page.unroute(SITIO_FALSO)
  await page.route(
    SITIO_FALSO,
    async (ruta) => {
      const peticion = ruta.request()
      const metodo = peticion.method()
      const url = new URL(peticion.url())
      const camino = url.pathname
      registro.push(`${metodo} ${camino}`)

      if (metodo === 'OPTIONS') return ruta.fulfill({ status: 204, headers: cors(ruta) })

      const cuerpo = (() => {
        try {
          return JSON.parse(peticion.postData() ?? '{}')
        } catch {
          return {}
        }
      })()

      // ── Autenticación por código ──
      if (metodo === 'POST' && camino === '/auth/v1/otp') {
        const correo = String(cuerpo.email ?? '')
        if (!correo.endsWith('@unab.edu.co')) return respuesta(ruta, { message: 'Solo se permiten correos @unab.edu.co' }, 400)
        correoPendiente = correo
        return respuesta(ruta, {})
      }

      if (metodo === 'POST' && camino === '/auth/v1/verify') {
        if (String(cuerpo.token ?? '') !== codigoCorreo)
          return respuesta(ruta, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403)
        return respuesta(ruta, sesion())
      }

      if (metodo === 'GET' && camino === '/auth/v1/user') return respuesta(ruta, sesion().user)
      if (metodo === 'POST' && camino === '/auth/v1/token') return respuesta(ruta, sesion())
      if (metodo === 'POST' && camino === '/auth/v1/logout') return ruta.fulfill({ status: 204, headers: cors(ruta) })

      // ── Funciones del juego ──
      if (camino.startsWith('/rest/v1/rpc/')) {
        if (!(peticion.headers()['authorization'] ?? '').startsWith('Bearer '))
          return respuesta(ruta, { message: 'no_autenticado' }, 401)
        const funcion = camino.slice('/rest/v1/rpc/'.length)

        if (funcion === 'estado_juego') return respuesta(ruta, estadoJuego())

        if (funcion === 'iniciar_juego') {
          if (!perfil) {
            if (cuerpo.p_consentimiento !== true) return errorRpc(ruta, 'consentimiento_requerido')
            perfil = crearPerfil({ correo: correoPendiente })
          }
          return respuesta(ruta, estadoJuego())
        }

        if (funcion === 'guardar_datos') {
          const r = guardarDatos(cuerpo)
          return r.error ? errorRpc(ruta, r.error) : respuesta(ruta, estadoJuego())
        }

        if (funcion === 'guardar_foto') {
          const r = guardarFoto()
          return r.error ? errorRpc(ruta, r.error) : respuesta(ruta, estadoJuego())
        }

        if (funcion === 'registrar_ubicacion') {
          const r = registrarUbicacion(cuerpo)
          return r.error ? errorRpc(ruta, r.error) : respuesta(ruta, estadoJuego())
        }

        if (funcion === 'enviar_palabra') {
          const r = enviarPalabra(cuerpo)
          return r.respuesta ? respuesta(ruta, r.respuesta) : errorRpc(ruta, 'sin_respuesta')
        }

        if (funcion === 'activar_pasaporte') {
          const r = activarPasaporte(cuerpo)
          return r.respuesta ? respuesta(ruta, r.respuesta) : errorRpc(ruta, 'sin_respuesta')
        }

        return errorRpc(ruta, 'funcion_no_simulada')
      }

      // ── Fotos: subida, enlace firmado y descarga ──
      if (metodo === 'POST' && camino.startsWith('/storage/v1/object/sign/fotos/')) {
        const rutaFoto = camino.slice('/storage/v1/object/sign/fotos/'.length)
        return respuesta(ruta, { signedURL: `/object/sign/fotos/${rutaFoto}?token=prueba` })
      }

      if (metodo === 'POST' && camino.startsWith('/storage/v1/object/fotos/')) {
        const rutaFoto = camino.slice('/storage/v1/object/fotos/'.length)
        const bytes = peticion.postDataBuffer()?.length ?? 0
        if (bytes === 0) return respuesta(ruta, { message: 'archivo vacío' }, 400)
        objetos.add(rutaFoto)
        return respuesta(ruta, { Key: `fotos/${rutaFoto}` })
      }

      if (metodo === 'GET' && camino.startsWith('/storage/v1/object/sign/fotos/')) {
        return ruta.fulfill({ status: 200, headers: { ...cors(ruta), 'content-type': 'image/jpeg' }, body: FOTO_JPEG })
      }

      // Cualquier otra cosa: que se note, en vez de fallar en silencio.
      return respuesta(ruta, { message: `Ruta no simulada: ${metodo} ${camino}` }, 501)
    },
  )

  return {
    estado: () => ultimoEstado,
    perfil: () => (perfil ? { ...perfil } : null),
    completadas: () => completadas.map((c) => c.parada),
    intentos: (tipo?: string) => intentos.filter((i) => !tipo || i.tipo === tipo).map((i) => ({ ...i })),
    registro,
  }
}
