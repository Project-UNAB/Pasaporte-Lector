import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useJuego, type Etapa } from './juego'
import { supabaseConfigurado } from './lib/supabase'
import { Cargando } from './componentes/Cargando'
import { Bienvenida } from './pantallas/Bienvenida'
import { Ingresar } from './pantallas/Ingresar'
import { Codigo } from './pantallas/Codigo'
import { Datos } from './pantallas/Datos'
import { Foto } from './pantallas/Foto'
import { Ubicacion } from './pantallas/Ubicacion'
import { Tarjeta } from './pantallas/Tarjeta'
import { Biblioteca } from './pantallas/Biblioteca'
import { Bloqueado } from './pantallas/Bloqueado'
import { SinConfigurar } from './pantallas/SinConfigurar'

const Mapa = lazy(() => import('./pantallas/Mapa'))
const Parada = lazy(() => import('./pantallas/Parada'))
const Pasaporte = lazy(() => import('./pantallas/Pasaporte'))
const Calibrar = lazy(() => import('./pantallas/Calibrar'))

/** Pantalla a la que se envía a la persona según su etapa. */
const INICIO: Record<Exclude<Etapa, 'cargando'>, string> = {
  anonimo: '/',
  consentimiento: '/ingresar',
  datos: '/datos',
  foto: '/foto',
  juego: '/mapa',
  biblioteca: '/biblioteca',
  pasaporte: '/pasaporte',
  bloqueado: '/bloqueado',
}

function Solo({ etapas, children }: { etapas: Etapa[]; children: ReactNode }) {
  const { etapa } = useJuego()
  const { pathname } = useLocation()
  if (etapa === 'cargando') return <Cargando />
  if (!etapas.includes(etapa)) {
    const destino = INICIO[etapa]
    return destino === pathname ? null : <Navigate to={destino} replace />
  }
  return children
}

export function App() {
  if (!supabaseConfigurado) {
    return (
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/calibrar" element={<Calibrar />} />
          <Route path="*" element={<SinConfigurar />} />
        </Routes>
      </Suspense>
    )
  }
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/" element={<Solo etapas={['anonimo']}><Bienvenida /></Solo>} />
        <Route path="/ingresar" element={<Solo etapas={['anonimo', 'consentimiento']}><Ingresar /></Solo>} />
        <Route path="/codigo" element={<Solo etapas={['anonimo']}><Codigo /></Solo>} />
        <Route path="/datos" element={<Solo etapas={['datos']}><Datos /></Solo>} />
        <Route path="/foto" element={<Solo etapas={['foto']}><Foto /></Solo>} />
        <Route path="/ubicacion" element={<Solo etapas={['juego']}><Ubicacion /></Solo>} />
        <Route path="/mapa" element={<Solo etapas={['juego']}><Mapa /></Solo>} />
        <Route path="/parada/:id" element={<Solo etapas={['juego']}><Parada /></Solo>} />
        <Route path="/tarjeta/:id" element={<Solo etapas={['juego', 'biblioteca', 'pasaporte']}><Tarjeta /></Solo>} />
        <Route path="/biblioteca" element={<Solo etapas={['biblioteca']}><Biblioteca /></Solo>} />
        <Route path="/pasaporte" element={<Solo etapas={['pasaporte']}><Pasaporte /></Solo>} />
        <Route path="/bloqueado" element={<Solo etapas={['bloqueado']}><Bloqueado /></Solo>} />
        <Route path="/calibrar" element={<Calibrar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
