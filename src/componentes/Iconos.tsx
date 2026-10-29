import { BookOpen, Drama, Feather, type LucideProps } from 'lucide-react'

const MAPA_ICONOS: Record<string, typeof Feather> = {
  pluma: Feather,
  mascaras: Drama,
  libros: BookOpen,
}

export function IconoBloque({
  icono,
  size = 20,
  strokeWidth = 1.75,
  ...props
}: { icono: string } & LucideProps) {
  const Componente = MAPA_ICONOS[icono] ?? BookOpen
  return <Componente size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />
}

