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
import { SinConexion } from './pantallas/SinConexion'
import { AvisoConexion } from './componentes/AvisoConexion'
import { Perfil } from './componentes/Perfil'

const Mapa = lazy(() => import('./pantallas/Mapa'))
const Parada = lazy(() => import('./pantallas/Parada'))
const Pasaporte = lazy(() => import('./pantallas/Pasaporte'))
const Calibrar = lazy(() => import('./pantallas/Calibrar'))

/** Pantalla a la que se envía a la persona según su etapa. */
const INICIO: Record<Exclude<Etapa, 'cargando' | 'sin_conexion'>, string> = {
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
  if (etapas.includes(etapa)) return children
  if (etapa === 'cargando') return <Cargando />
  if (etapa === 'sin_conexion') return <SinConexion />
  const destino = INICIO[etapa]
  return destino === pathname ? null : <Navigate to={destino} replace />
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
      <AvisoConexion />
      <Perfil />
      <Routes>
        <Route path="/" element={<Solo etapas={['anonimo']}><Bienvenida /></Solo>} />
        <Route path="/ingresar" element={<Solo etapas={['anonimo', 'consentimiento']}><Ingresar /></Solo>} />
        {/* Tras verificar el código, la pantalla sigue visible mientras se inicia la partida. */}
        <Route path="/codigo" element={<Solo etapas={['anonimo', 'cargando']}><Codigo /></Solo>} />
        <Route path="/datos" element={<Solo etapas={['datos', 'foto']}><Datos /></Solo>} />
        <Route path="/foto" element={<Solo etapas={['foto', 'juego']}><Foto /></Solo>} />
        <Route path="/ubicacion" element={<Solo etapas={['juego']}><Ubicacion /></Solo>} />
        <Route path="/mapa" element={<Solo etapas={['juego', 'biblioteca']}><Mapa /></Solo>} />
        <Route path="/parada/:id" element={<Solo etapas={['juego', 'biblioteca']}><Parada /></Solo>} />
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
