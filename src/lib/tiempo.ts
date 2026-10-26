export function formatoRestante(ms: number): string {
  if (ms <= 0) return '0 min'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} h ${m.toString().padStart(2, '0')} min` : `${m} min`
}

export function formatoTranscurrido(ms: number): string {
  const h = Math.floor(Math.max(ms, 0) / 3600000)
  const m = Math.floor((Math.max(ms, 0) % 3600000) / 60000)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function fechaSello(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}
