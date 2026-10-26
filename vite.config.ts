import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icono.svg'],
      manifest: {
        name: 'Pasaporte Lector',
        short_name: 'Pasaporte',
        description: 'Recorre la universidad, lee y gana tu pasaporte.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b3d34',
        theme_color: '#0f6b57',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Solo se precargan las fuentes latinas; el resto no se usa en español.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,hebrew,vietnamese,math,symbols}-*.woff2'],
        navigateFallback: '/index.html',
        // Supabase siempre va a la red: el progreso y el reloj viven en el servidor.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-osm',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: ['es2022', 'safari16'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet')) return 'leaflet'
          if (id.includes('node_modules/@supabase')) return 'supabase'
        },
      },
    },
  },
})
