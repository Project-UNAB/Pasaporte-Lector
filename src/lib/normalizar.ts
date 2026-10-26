// Igual que public.normalizar_palabra y scripts/normalizar.mjs.
const DE = 'áàäâéèëêíìïîóòöôúùüûñç'
const A = 'aaaaeeeeiiiioooouuuunc'

export function normalizarPalabra(p: string): string {
  const s = [...p.toLowerCase()].map((c) => {
    const i = DE.indexOf(c)
    return i === -1 ? c : A[i]
  })
  return s.join('').replace(/\s+/g, ' ').trim()
}

export function normalizarCorreo(c: string): string {
  return c.trim().toLowerCase()
}

export function normalizarId(id: string): string {
  return id.replace(/\s/g, '').toUpperCase()
}
