// localStorage puede fallar (modo privado, almacenamiento bloqueado): nunca romper la página.
export function leer(clave: string): string | null {
  try {
    return localStorage.getItem('pl:' + clave)
  } catch {
    return null
  }
}

export function guardar(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem('pl:' + clave)
    else localStorage.setItem('pl:' + clave, valor)
  } catch {
    /* sin almacenamiento local */
  }
}
