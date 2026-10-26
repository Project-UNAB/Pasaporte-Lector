// Misma normalización que public.normalizar_palabra en la base de datos.
const DE = 'áàäâéèëêíìïîóòöôúùüûñç'
const A = 'aaaaeeeeiiiioooouuuunc'

export function normalizarPalabra(p) {
  let s = String(p ?? '').toLowerCase()
  s = [...s].map((c) => {
    const i = DE.indexOf(c)
    return i === -1 ? c : A[i]
  }).join('')
  return s.replace(/\s+/g, ' ').trim()
}
