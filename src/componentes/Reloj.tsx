import { useEffect, useState } from 'react'
import { useJuego } from '../juego'
import { formatoRestante, formatoTranscurrido } from '../lib/tiempo'

/** Cuenta regresiva de 24 h calculada con la hora del servidor. */
export function Reloj({ detalle = false }: { detalle?: boolean }) {
  const { estado, desfase, refrescar } = useJuego()
  const [ahora, setAhora] = useState(() => Date.now() + desfase)

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now() + desfase), 15000)
    setAhora(Date.now() + desfase)
    return () => clearInterval(t)
  }, [desfase])

  const p = estado?.perfil
  const restante = p ? Date.parse(p.vence) - ahora : 0

  useEffect(() => {
    // Al llegar a cero, el servidor decide si la cuenta queda bloqueada.
    if (p && !p.finalizado_en && restante <= 0) refrescar().catch(() => {})
  }, [p, restante, refrescar])

  if (!p) return null
  const urgente = restante < 2 * 3600000
  return (
    <span className={`reloj${urgente ? ' urgente' : ''}`} role="timer" aria-live="off">
      ⏳ {detalle ? `Llevas ${formatoTranscurrido(ahora - Date.parse(p.inicio))} · ` : ''}te quedan {formatoRestante(restante)}
    </span>
  )
}
