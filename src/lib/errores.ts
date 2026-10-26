const MENSAJES: Record<string, string> = {
  consentimiento_requerido: 'Debes aceptar la autorización de datos para continuar.',
  juego_no_activo: 'Tu tiempo de juego terminó.',
  datos_bloqueados: 'Ya empezaste el recorrido; tus datos no se pueden cambiar.',
  id_invalido: 'Revisa tu ID estudiantil.',
  id_duplicado: 'Ese ID estudiantil ya está registrado con otro correo.',
  nombre_invalido: 'Escribe tu nombre completo.',
  carrera_invalida: 'Elige tu carrera.',
  foto_no_encontrada: 'No pudimos guardar tu foto. Intenta de nuevo.',
  demasiados_intentos: 'Vas muy rápido. Espera un momento e intenta de nuevo.',
  'Solo se permiten correos @unab.edu.co': 'Solo se permiten correos @unab.edu.co.',
}

export function mensajeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e)
  for (const [clave, msg] of Object.entries(MENSAJES)) if (texto.includes(clave)) return msg
  if (/Database error saving new user/i.test(texto)) return 'Solo se permiten correos @unab.edu.co.'
  if (/rate limit|security purposes|only request this after/i.test(texto))
    return 'Debes esperar un momento antes de pedir otro código.'
  if (/expired|invalid|Token has expired/i.test(texto)) return 'El código no es válido o ya venció.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(texto)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.'
  return 'Algo salió mal. Intenta de nuevo.'
}
