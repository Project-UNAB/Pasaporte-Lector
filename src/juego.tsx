import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { guardar, leer } from './lib/almacen'
import { supabase, supabaseConfigurado } from './lib/supabase'
import { paradas } from './contenido.js'

export interface Perfil {
  usuario: string
  correo: string
  nombre: string | null
  id_estudiantil: string | null
  carrera: string | null
  foto_path: string | null
  inicio: string
  vence: string
  marca_agua: number
  finalizado_en: string | null
  activado_en: string | null
  estado: 'activo' | 'expirado' | 'completado'
}

export interface Completada {
  parada: string
  posicion: number
  completado_en: string
}

export interface EstadoServidor {
  ahora: string
  total: number
  perfil: Perfil | null
  completadas: Completada[]
  fallos_ubicacion: Record<string, number>
  ayuda_usada: string[]
}

/** En qué etapa está la persona; decide qué pantallas puede ver. */
export type Etapa =
  | 'cargando'
  | 'sin_conexion'
  | 'anonimo'
  | 'consentimiento'
  | 'datos'
  | 'foto'
  | 'juego'
  | 'biblioteca'
  | 'pasaporte'
  | 'bloqueado'

interface Juego {
  sesion: Session | null
  estado: EstadoServidor | null
  etapa: Etapa
  /** Milisegundos a sumar a Date.now() para tener la hora del servidor. */
  desfase: number
  refrescar: () => Promise<EstadoServidor | null>
  aplicar: (e: EstadoServidor) => void
  reintentar: () => void
  salir: () => Promise<void>
}

const Contexto = createContext<Juego | null>(null)

export function useJuego(): Juego {
  const j = use(Contexto)
  if (!j) throw new Error('useJuego fuera de ProveedorJuego')
  return j
}

function calcularEtapa(cargando: boolean, fallo: boolean, sesion: Session | null, e: EstadoServidor | null): Etapa {
  if (cargando) return 'cargando'
  if (!sesion) return 'anonimo'
  if (!e) return fallo ? 'sin_conexion' : 'cargando'
  const p = e.perfil
  if (!p) return 'consentimiento'
  if (p.activado_en) return 'pasaporte'
  if (p.estado === 'expirado') return 'bloqueado'
  if (!p.nombre) return 'datos'
  if (!p.foto_path) return 'foto'
  if (p.finalizado_en) return 'biblioteca'
  return 'juego'
}

export function ProveedorJuego({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [estado, setEstado] = useState<EstadoServidor | null>(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)
  const [fallo, setFallo] = useState(false)
  const [desfase, setDesfase] = useState(0)

  const aplicar = useCallback((e: EstadoServidor) => {
    setEstado(e)
    setFallo(false)
    setDesfase(Date.parse(e.ahora) - Date.now())
  }, [])

  // Recién verificado el correo, iniciar_juego crea el perfil y arranca el reloj;
  // después es igual a estado_juego, así que repetirlo no cambia nada.
  const refrescar = useCallback(async () => {
    const consiente = leer('consentimiento') === 'si'
    const { data, error } = consiente
      ? await supabase.rpc('iniciar_juego', { p_consentimiento: true })
      : await supabase.rpc('estado_juego')
    if (error) throw error
    if (consiente) guardar('consentimiento', null)
    aplicar(data as EstadoServidor)
    return data as EstadoServidor
  }, [aplicar])

  useEffect(() => {
    if (!supabaseConfigurado) return
    let vivo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      if (evento === 'SIGNED_OUT') setEstado(null)
    })
    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Con sesión y sin estado (al abrir la web o recién verificado el correo), pedirlo al servidor.
  // El candado evita pedirlo dos veces a la vez (al abrir llegan varios avisos seguidos).
  const pidiendo = useRef(false)
  useEffect(() => {
    if (cargando || !sesion || estado || fallo || pidiendo.current) return
    pidiendo.current = true
    refrescar()
      .catch(() => setFallo(true))
      .finally(() => (pidiendo.current = false))
  }, [cargando, sesion, estado, fallo, refrescar])

  // Al volver a la pestaña, sincroniza con el servidor (reloj y progreso).
  useEffect(() => {
    if (!sesion || !estado) return
    const alVolver = () => {
      if (document.visibilityState !== 'visible' || pidiendo.current) return
      pidiendo.current = true
      refrescar()
        .catch(() => {})
        .finally(() => (pidiendo.current = false))
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [sesion, estado, refrescar])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
    setEstado(null)
    setFallo(false)
  }, [])

  const reintentar = useCallback(() => setFallo(false), [])

  const valor = useMemo<Juego>(
    () => ({
      sesion,
      estado,
      etapa: calcularEtapa(cargando, fallo, sesion, estado),
      desfase,
      refrescar,
      aplicar,
      reintentar,
      salir,
    }),
    [sesion, estado, cargando, fallo, desfase, refrescar, aplicar, reintentar, salir],
  )

  return <Contexto value={valor}>{children}</Contexto>
}

/** Siguiente parada por completar (o null si ya están todas). */
export function siguienteParada(e: EstadoServidor | null) {
  const hechas = new Set(e?.completadas.map((c) => c.parada))
  return paradas.find((p) => !hechas.has(p.id)) ?? null
}

export function paradaCompletada(e: EstadoServidor | null, id: string) {
  return e?.completadas.find((c) => c.parada === id) ?? null
}
