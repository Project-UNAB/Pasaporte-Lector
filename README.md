# Pasaporte Lector

Web móvil con forma de juego para la UNAB (sede Jardín). Se abre desde el QR de un póster, **sin instalar ninguna app**: funciona en Android (Chrome) e iPhone (Safari) con solo visitar el dominio. La persona se registra con su correo `@unab.edu.co`, recorre 3 bloques de 3 paradas escribiendo la palabra clave de cada póster y termina en la biblioteca, donde el personal activa su pasaporte digital.

## Tecnología

| Pieza | Elección | Por qué |
|---|---|---|
| Web | React 19 + Vite + TypeScript | Carga rápida en celular, rutas pesadas (mapa, pasaporte) cargadas solo cuando se usan |
| PWA | vite-plugin-pwa (Workbox) | Funciona desde el navegador y se puede “Agregar a pantalla de inicio”; precarga la web y guarda el mapa en caché |
| Datos, login y fotos | Supabase (Postgres, Auth por código, Storage, RLS) | Plan gratuito; reglas y validaciones en el servidor |
| Mapa | Leaflet + OpenStreetMap | Gratis, sin tarjeta; campus en gris y paradas que se colorean |
| Correos | SMTP propio (Brevo) | El correo integrado de Supabase solo envía al equipo |
| Publicación | Vercel (o Cloudflare Pages) | HTTPS obligatorio para cámara y ubicación |

Pensado primero para celular: unidades `dvh`, márgenes seguros del notch, campos de 16 px (evita el zoom de iOS), teclado numérico para el código con autocompletado `one-time-code`, cámara con `playsinline`, fuentes autoalojadas y modo oscuro.

## Estructura

```
src/
  contenido.js        ← TODO lo editable: textos, paradas, coordenadas, tarjetas, marcas de agua
  juego.tsx           ← estado del juego (sesión + servidor) y etapas
  App.tsx             ← rutas; cada etapa solo ve sus pantallas
  pantallas/          ← Bienvenida, Ingresar, Código, Datos, Foto, Ubicación, Mapa,
                        Parada, Tarjeta, Biblioteca, Pasaporte, Bloqueado, Calibrar
  componentes/        ← Mapa del campus, reloj de 24 h, pasos
  lib/                ← Supabase, geolocalización, cámara, normalización
supabase/
  migrations/0001_esquema.sql   ← tablas, seguridad, funciones del servidor, bucket de fotos
  plantillas/codigo.html        ← plantilla de correo con el código
  consultas/exportar.sql        ← exportar IDs para Bienestar y estadísticas
scripts/cargar-claves.mjs       ← convierte claves.json (privado) en SQL con hashes
```

## Puesta en marcha

### 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com) (región más cercana: `us-east`).
2. **SQL Editor** → pegar y ejecutar `supabase/migrations/0001_esquema.sql` completo.
3. **Authentication → Sign In / Providers → Email**: dejar activado el proveedor Email (el código por correo es la verificación).
4. **Authentication → Emails → SMTP Settings**: configurar Brevo (host `smtp-relay.brevo.com`, puerto 587, usuario y llave SMTP de Brevo, remitente verificado).
5. **Authentication → Rate Limits**: subir “emails per hour” (por ejemplo a 100) para los picos frente a los pósters.
6. **Authentication → Emails → Templates**: en **Magic Link** y en **Confirm signup** pegar `supabase/plantillas/codigo.html` (usa `{{ .Token }}`, así llega un código y no un enlace). Asunto sugerido: *Tu código de Pasaporte Lector*. En el plan gratis, Supabase solo deja cambiar las plantillas **después** de configurar el SMTP propio (paso 4); sin este cambio el correo trae un enlace y el registro por código no funciona.
7. **Authentication → URL Configuration**: poner el dominio final en *Site URL*.
8. **Authentication → Hooks → Add hook → Before User Created**: tipo *Postgres Function*, esquema `public`, función `hook_antes_de_crear_usuario`. Rechaza otros dominios antes de crear el usuario o enviar el correo (el disparador sobre `auth.users` queda como segunda barrera).
9. **Authentication → Sign In / Providers → Email**: poner la longitud del código (*Email OTP Length*) en 6. Los proyectos nuevos vienen con 8.

#### Pruebas de la base de datos

Con Docker Desktop abierto: `npx supabase start` y luego `npx supabase test db` (pruebas pgTAP en `supabase/tests/`).

### 2. Palabras clave y código de la biblioteca

Las palabras **nunca** van en el código ni en GitHub.

```bash
cp claves.example.json claves.json   # editar con las palabras reales y el código de la biblioteca
npm run claves                       # genera scripts/salida/claves.sql
```

Pegar `scripts/salida/claves.sql` en el SQL Editor y ejecutarlo. Se puede repetir cada vez que cambien las palabras.

### 3. Correr en local

```bash
npm install
cp .env.example .env.local           # URL y llave pública (anon/publishable) del proyecto
npm run dev                          # https://<IP-del-PC>:5173 en el celular (aceptar el aviso del certificado de prueba)
```

> Cámara y ubicación requieren HTTPS. Para probar desde el celular en local usa un túnel (`npx cloudflared tunnel --url http://localhost:5173`) o despliega una vista previa en Vercel.
> Modo pruebas: con `VITE_IGNORAR_UBICACION=true` el botón «Ya llegué» funciona aunque estés lejos y la parada muestra un aviso. Sirve en local y en Vercel; para el lanzamiento debe estar en `false` o no existir.

### 4. Publicar en Vercel

1. Importar el repositorio en Vercel (framework: Vite).
2. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Conectar el dominio. Cada push a `main` publica automáticamente. `vercel.json` ya trae las reglas de rutas y los permisos de cámara y ubicación.

### 5. Coordenadas reales

Abrir `https://<dominio>/calibrar` en el celular, pararse junto a cada póster, esperar ~10 s a que baje la precisión y tocar **Anotar aquí**. Con **Copiar todas** se obtienen las 9 coordenadas para pegarlas en `src/contenido.js` (`lat`, `lng` y `radio` de cada parada). El radio debe ser mayor que la imprecisión del GPS en ese lugar.

## Reglas implementadas

- Solo correos `@unab.edu.co`, validado en el navegador **y** en la base de datos (disparador sobre `auth.users`).
- Un registro por correo y por ID estudiantil.
- Reloj de 24 h desde la verificación del correo, calculado por el servidor. Al vencer sin terminar las paradas, la cuenta queda bloqueada sin reintento.
- Orden fijo de las 9 paradas (D → L → biblioteca); el servidor rechaza saltos.
- Palabra clave comparada sin mayúsculas, tildes ni espacios sobrantes, contra un hash; máximo 5 errores por minuto.
- El teclado se activa solo cerca del póster (radio configurable, 40 m por defecto). Tras 3 intentos de ubicación fallidos aparece una ayuda discreta; todo queda registrado.
- Foto solo desde la cámara en vivo, comprimida a ~100 KB, en un bucket privado donde cada persona ve únicamente la suya. No se puede cambiar después de la primera parada.
- Pasaporte con foto, datos, sellos con fecha y 1 de 20 marcas de agua asignada al azar una sola vez. Se descarga como foto PNG (en iPhone, desde el menú de compartir).
- La biblioteca activa el pasaporte con un código (hash en el servidor, 5 intentos cada 10 min). Se puede activar si las 9 paradas se completaron dentro de las 24 h.
- Progreso guardado en cada parada: al volver a entrar con el mismo correo se continúa donde iba.

## Operación

La guía para quien administra el juego (contenido, coordenadas, palabras, exportar datos, problemas frecuentes) está en [docs/GUIA-CLIENTE.md](docs/GUIA-CLIENTE.md).

- **Exportar datos**: `supabase/consultas/exportar.sql` (IDs para Bienestar, datos completos y resumen). Ejecutar en el SQL Editor y descargar como CSV.
- **Expirar en bloque (opcional)**: con la extensión `pg_cron` activada,
  `select cron.schedule('expirar', '*/15 * * * *', 'select public.expirar_vencidos()');`
  (no es obligatorio: cada llamada ya revisa el vencimiento).
- **Proyecto pausado**: en el plan gratuito Supabase pausa proyectos inactivos; entrar al panel y reactivarlo antes del lanzamiento.
- **Marcas de agua**: poner los SVG en `public/marcas/` y completar el campo `svg` de cada una en `src/contenido.js` (por ejemplo `'/marcas/01.svg'`). Mientras tanto se muestra un emoji provisional.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisión de tipos + build de producción |
| `npm run preview` | Sirve el build localmente |
| `npm test` | Pruebas unitarias |
| `npm run e2e` | Pruebas de punta a punta en iPhone y Android simulados (ver [tests/e2e/README.md](tests/e2e/README.md)) |
| `npm run claves` | Genera el SQL de palabras clave a partir de `claves.json` |
| `npm run iconos` | Regenera los íconos de la PWA desde `public/icono.svg` |

## Seguridad

- En la web solo van la URL del proyecto y la llave pública. La llave `service_role` nunca va en la web ni en el repositorio.
- `claves.json`, `.env*` y `scripts/salida/` están en `.gitignore`.
- Toda escritura pasa por funciones del servidor (`security definer`); las tablas privadas no tienen acceso desde la web.
