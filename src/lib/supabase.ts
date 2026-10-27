import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && llave)

// detectSessionInUrl: si el correo trae un enlace en vez del código (plantilla sin configurar),
// abrirlo en el mismo navegador también inicia la sesión.
export const supabase = createClient(url || 'http://localhost', llave || 'sin-llave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Opciones para pedir el código: crea la cuenta si no existe y, si llega un enlace, vuelve a esta web. */
export const opcionesCodigo = () => ({ shouldCreateUser: true, emailRedirectTo: window.location.origin })
