import { defineConfig, devices } from '@playwright/test'

// Los datos del Supabase de mentira. La web se compila apuntando a esta URL y
// cada prueba intercepta sus peticiones con tests/e2e/apoyo/mock-supabase.ts:
// nunca se sale a la red real.
const SUPABASE_FALSO = {
  VITE_SUPABASE_URL: 'https://mock.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'prueba',
}

const PUERTO = 4455
// El build de las pruebas va a su propia carpeta: `dist/` lo comparten otras
// personas del repositorio y no queremos pisarlo (ni que nos lo pisen).
const SALIDA = 'dist-e2e'

export default defineConfig({
  testDir: './tests/e2e',
  // El estado del juego vive en el mock y en localStorage; correr en serie
  // dentro de cada archivo evita sorpresas y no necesitamos más velocidad.
  fullyParallel: false,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    // Sin animaciones decorativas: en WebKit sin GPU vuelven lentísimo cada paso y no aportan a la prueba.
    reducedMotion: 'reduce',
    // El service worker de la PWA guarda respuestas en caché y se sale de la
    // intercepción de peticiones: en las pruebas queda desactivado.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'android',
      use: {
        ...devices['Pixel 7'],
        launchOptions: {
          // Cámara y permiso simulados para poder pasar por la pantalla de foto.
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build -- --outDir ${SALIDA} && npm run preview -- --outDir ${SALIDA} --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    // Siempre se compila de nuevo: así la web bajo prueba es la del código actual.
    reuseExistingServer: false,
    timeout: 300_000,
    env: SUPABASE_FALSO,
  },
})
