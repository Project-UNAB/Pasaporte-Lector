# Pruebas de punta a punta (Playwright)

Recorren la web como un iPhone (WebKit) y como un Android (Chromium), con un Supabase de mentira que imita las reglas del servidor. No hay red real: ni Supabase, ni correos, ni losetas del mapa.

## Cómo se corren

```bash
npx playwright install                      # una sola vez: descarga WebKit y Chromium
npm run e2e                                 # compila, sirve y corre los dos proyectos
npx playwright test --project=iphone        # solo iPhone
npx playwright test -g "palabra incorrecta" # un caso suelto
```

El servidor de pruebas se levanta solo (`build` + `preview` en el puerto 4455) contra `https://mock.supabase.co`, con la llave `prueba`. Compila en su propia carpeta, `dist-e2e/`, para no pisar el `dist/` normal, y siempre arranca de cero para probar el código actual.

## Archivos

| Archivo | Qué hace |
|---|---|
| `playwright.config.ts` | Proyectos `iphone` (iPhone 14, WebKit) y `android` (Pixel 7, Chromium con cámara simulada), servidor de vista previa, service worker bloqueado |
| `apoyo/mock-supabase.ts` | Supabase de mentira: `otp`, `verify`, `user`, las 7 funciones `rpc`, la subida y el enlace firmado de la foto, con las reglas de `supabase/migrations/0001_esquema.sql` |
| `apoyo/ayudas.ts` | Pasos repetidos: preparar la página, entrar con el código, ubicarse en una parada, sellarla, medir la pantalla |
| `recorrido.spec.ts` | a) recorrido completo · a2) tarjeta de la novena parada y cierre del bloque 3 · f) recarga a mitad del recorrido |
| `parada.spec.ts` | c) palabra clave · d) ayuda por ubicación |
| `acceso.spec.ts` | b) dominio del correo · e) cuenta expirada · i) `/calibrar` sin sesión |
| `pantallas.spec.ts` | g) sin desplazamiento de lado a 360 px · h) campos de 16 px o más |

## Lo que estas pruebas no cubren

- **Cámara en iPhone:** WebKit no tiene cámara simulada, así que en el proyecto `iphone` las pruebas arrancan con un perfil que ya tiene foto. Ese paso solo se prueba en Chromium. Falta una pasada manual con cámara real en Safari.
- **Supabase real:** el simulador copia las reglas del SQL, pero no prueba Postgres, RLS, disparadores, Storage ni el envío de correo. Eso lo cubren las pruebas pgTAP de `supabase/tests/` (`npx supabase test db`). Las palabras de las pruebas son inventadas.
- **Mapa:** las losetas de OpenStreetMap se cortan; se revisa que el mapa se monte, no que se vea el campus.
- **Service worker / PWA:** desactivado para que la caché no interfiera; no se valida el funcionamiento sin conexión.
- **Teléfono real:** GPS simulado con `setGeolocation` (±6 m) y reloj del servidor igual al del equipo; no reemplaza la prueba en el campus con celulares reales.
