import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
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
export type Etapa = 'cargando' | 'anonimo' | 'consentimiento' | 'datos' | 'foto' | 'juego' | 'biblioteca' | 'pasaporte' | 'bloqueado'

interface Juego {
  sesion: Session | null
  estado: EstadoServidor | null
  etapa: Etapa
  /** Milisegundos a sumar a Date.now() para tener la hora del servidor. */
  desfase: number
  refrescar: () => Promise<EstadoServidor | null>
  aplicar: (e: EstadoServidor) => void
  salir: () => Promise<void>
}

const Contexto = createContext<Juego | null>(null)

export function useJuego(): Juego {
  const j = use(Contexto)
  if (!j) throw new Error('useJuego fuera de ProveedorJuego')
  return j
}

function calcularEtapa(cargando: boolean, sesion: Session | null, e: EstadoServidor | null): Etapa {
  if (cargando) return 'cargando'
  if (!sesion) return 'anonimo'
  if (!e) return 'cargando'
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
  const [desfase, setDesfase] = useState(0)

  const aplicar = useCallback((e: EstadoServidor) => {
    setEstado(e)
    setDesfase(Date.parse(e.ahora) - Date.now())
  }, [])

  const refrescar = useCallback(async () => {
    const { data, error } = await supabase.rpc('estado_juego')
    if (error) throw error
    aplicar(data as EstadoServidor)
    return data as EstadoServidor
  }, [aplicar])

  useEffect(() => {
    if (!supabaseConfigurado) return
    let vivo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      if (data.session) await refrescar().catch(() => setEstado(null))
      if (vivo) setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      if (evento === 'SIGNED_OUT') setEstado(null)
    })
    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [refrescar])

  // Al volver a la pestaña, sincroniza con el servidor (reloj y progreso).
  useEffect(() => {
    if (!sesion) return
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar().catch(() => {})
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [sesion, refrescar])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
    setEstado(null)
  }, [])

  const valor = useMemo<Juego>(
    () => ({ sesion, estado, etapa: calcularEtapa(cargando, sesion, estado), desfase, refrescar, aplicar, salir }),
    [sesion, estado, cargando, desfase, refrescar, aplicar, salir],
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
