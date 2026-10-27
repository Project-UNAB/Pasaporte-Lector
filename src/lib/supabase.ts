import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && llave)

// Solo se entra con el código de 6 dígitos: los enlaces del correo no inician sesión.
export const supabase = createClient(url || 'http://localhost', llave || 'sin-llave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
})

/** Crear cuenta registra el correo si no existe; iniciar sesión solo envía código a cuentas existentes. */
export const opcionesCodigo = (crearCuenta: boolean) => ({ shouldCreateUser: crearCuenta })
