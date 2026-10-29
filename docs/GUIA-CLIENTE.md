# Guía de operación · Pasaporte Lector

Esta guía es para quien administra el juego: cambiar contenido, tomar coordenadas, cargar las palabras de los pósters, exportar datos y resolver problemas durante la semana de actividad. No hace falta saber programar, salvo en los pasos marcados con 🛠️.

## 1. Las piezas y para qué sirve cada una

| Servicio | Para qué | Qué revisar |
|---|---|---|
| **GitHub** (repositorio privado) | Guarda el código y el contenido. Es el respaldo. | Cada cambio queda registrado y se puede deshacer. |
| **Vercel** | Publica la web en el dominio. Cada cambio en GitHub se publica solo en 1 o 2 minutos. | Pestaña *Deployments*: el último debe estar en verde (*Ready*). |
| **Supabase** | Base de datos: personas, progreso, fotos, palabras clave (como hash) y código de la biblioteca. | Que el proyecto esté **activo** (no pausado). |
| **Brevo** | Envía los correos con el código para entrar. | Cuántos correos quedan en el día. |

## 2. Cambiar textos, tarjetas o nombres de las paradas

Todo el contenido está en un solo archivo: **`src/contenido.js`**.

1. En GitHub, abre `src/contenido.js` y toca el lápiz (✏️ *Edit this file*).
2. Cambia solo el texto que está **entre comillas**. No borres comas, llaves `{ }` ni corchetes `[ ]`.
3. Abajo, en *Commit changes*, escribe qué cambiaste (por ejemplo, “Texto de la tarjeta de Neruda”) y confirma.
4. Espera 1 o 2 minutos y recarga la web.

Qué se puede cambiar ahí:

- `textos`: bienvenida, autorización de datos, instrucciones de la biblioteca.
- `bloques`: nombre de cada bloque, nombre del lugar (`lugar`), pista (`pista`), tarjeta cultural (`tarjeta`) y tarjeta final de cada bloque (`tarjetaFinal`).
- `carreras`: la lista que aparece al registrarse.
- `config`: radio de cercanía, intentos antes de la ayuda (3 a 5), formato del ID estudiantil, sellos por bloque o por parada.
- `marcasDeAgua`, marca 13 (UNAB): es la única marca con color editable. Cambia `color: '#f5a300'` por el color que quieran, en formato `#rrggbb` (por ejemplo `'#0f6b57'` verde o `'#ffffff'` blanco). Las otras 19 tienen sus colores propios. Ojo: el blanco casi no se ve sobre el papel crema del pasaporte.

> ⚠️ No cambies los `id` de las paradas (`b1-p1`, `b1-p2`…). Están conectados con las palabras clave.
> Si Vercel marca el cambio en rojo, algo quedó mal escrito (casi siempre una coma o una comilla). Revierte el cambio en GitHub y vuelve a intentarlo.

## 3. Tomar las coordenadas de los pósters

1. En el celular, abre `https://<tu-dominio>/calibrar` y toca **Activar ubicación**.
2. Párate justo donde estará el póster. Espera unos **10 segundos** hasta que la precisión baje (ideal: menos de ±15 m). Funciona mejor al aire libre o junto a una ventana.
3. Elige la parada en la lista y toca **Anotar aquí**. Repite con las 9.
4. Toca **Copiar todas** y envía el texto a quien edita el repositorio, o pégalo tú mismo en `src/contenido.js`: en cada parada van `lat`, `lng` y `radio`.

Cómo elegir el **radio**: debe ser mayor que la precisión que viste. Si marcó ±25 m, usa un radio de 40 m o más. En interiores conviene 50–60 m.

## 4. Palabras de los pósters y código de la biblioteca 🛠️

Las palabras **nunca** se escriben en el código ni en GitHub. Se guardan en Supabase como un hash, así que nadie puede leerlas desde la web.

1. En el computador donde está el proyecto, copia `claves.example.json` con el nombre `claves.json`.
2. Escribe ahí la palabra de cada póster (no importan mayúsculas ni tildes: “Poesía” = “poesia”) y un `codigo_biblioteca` propio.
3. En una terminal dentro de la carpeta del proyecto, ejecuta `npm run claves`.
4. Abre el archivo `scripts/salida/claves.sql`, copia todo y pégalo en **Supabase → SQL Editor → Run**.

Para cambiar una palabra o el código después, repite los pasos 2 a 4. Las paradas que ya hizo cada persona no se pierden.

> El código de la biblioteca solo debe conocerlo el personal de la biblioteca. Si se filtra, cámbialo con estos mismos pasos.

## 5. Exportar los datos

En **Supabase → SQL Editor**, abre `supabase/consultas/exportar.sql`, ejecuta la consulta que necesites y descarga el resultado con **Export → CSV**:

1. **IDs para Bienestar**: los primeros N pasaportes activados, en orden. Cambia `limit 100` por la cantidad de premios.
2. **Datos completos**: para las estadísticas del proyecto.
3. **Resumen**: registrados, terminaron, activados y expirados.
4. **Paradas problemáticas**: dónde falla más el GPS o dónde más se equivocan con la palabra.

> A Bienestar solo se le entregan los **IDs**. Los correos, nombres y fotos son datos personales protegidos por la Ley 1581 de 2012.

## 6. Lista de chequeo

### Una semana antes
- [ ] Coordenadas reales cargadas y probadas caminando el recorrido completo.
- [ ] Palabras y código de la biblioteca cargados (paso 4).
- [ ] Texto de autorización de datos definitivo (de Bienestar) en `textos.autorizacionDatos`.
- [ ] Correo de prueba enviado a 3 o 4 cuentas **@unab.edu.co**: llega en menos de 1 minuto y **no** cae en spam.
- [ ] En Supabase → *Authentication → Rate Limits*, el límite de correos por hora está subido (100 o más).
- [ ] Prueba completa con 5 a 10 personas, con Android y con iPhone.
- [ ] El personal de la biblioteca sabe el código y sabe dónde escribirlo (“Soy del equipo de la biblioteca”).

### El día del lanzamiento
- [ ] Entrar a Supabase y confirmar que el proyecto está activo.
- [ ] Abrir la web desde el QR de un póster impreso, con datos móviles (no con wifi).
- [ ] Hacer un registro de prueba con un correo propio.

### Durante la semana
- [ ] Entrar a Supabase al menos cada 2 días: en el plan gratuito, un proyecto sin uso por unos días puede pausarse.
- [ ] Revisar en Brevo cuántos correos quedan en el día.
- [ ] Mirar la consulta de **resumen** para seguir la meta (150 mínimo, 200 de trabajo).

## 7. Si algo falla

| Problema | Qué hacer |
|---|---|
| **No llega el código al correo** | 1) Que revise spam. 2) Que espere 60 s y toque “Reenviar código”. 3) En Brevo, revisa si se acabó el cupo del día. 4) En Supabase, sube el límite de correos por hora. Si todo está bien y no llega a ningún correo @unab.edu.co, pide a la universidad un remitente institucional. |
| **“Solo se permiten correos @unab.edu.co”** | La persona escribió otro correo. Solo sirve el institucional. |
| **El GPS no deja escribir la palabra** | Tras 3 intentos aparece “¿Ya estás frente al póster y no funciona?”. Ese botón habilita el teclado y queda registrado. Si pasa en una parada concreta, sube su `radio` en `contenido.js`. |
| **“La ubicación está bloqueada”** | iPhone: *Ajustes → Safari → Ubicación → Preguntar*. Android: el candado junto a la dirección → *Permisos → Ubicación*. |
| **La cámara no abre** | Debe abrirse en Chrome (Android) o Safari (iPhone), no dentro de Instagram o WhatsApp: tocar “Abrir en el navegador”. Revisar el permiso de cámara igual que el de ubicación. |
| **“Código incorrecto” en la biblioteca** | Revisar el código. Tras 5 errores hay que esperar 10 minutos. Si se perdió, cargar uno nuevo (paso 4). |
| **Una persona quedó bloqueada por un error nuestro** (por ejemplo, la web se cayó) 🛠️ | En el SQL Editor: `update public.perfiles set vence = now() + interval '3 hours', estado = 'activo' where correo = 'nombre@unab.edu.co';` |
| **La web dice “Sin conexión”** | Si le pasa a una sola persona, es su internet: que toque “Reintentar”. Si les pasa a todos, Supabase puede estar pausado: entrar al panel y reactivarlo. |
| **La web no carga** | Revisar en Vercel que el último *deployment* esté en verde. Si no, en *Deployments* elegir el último que funcionaba → *Promote to Production*. |

**Plan B de correos:** tener una segunda cuenta de correo (por ejemplo, otra cuenta de Brevo) con su usuario y llave a la mano. Si la primera se bloquea o agota el cupo, se cambian en *Supabase → Authentication → SMTP Settings* y los códigos vuelven a salir en minutos.

## 8. Reglas que la web cumple sola

- Solo correos @unab.edu.co, un registro por correo y por ID estudiantil.
- 24 horas desde que verifica el correo. Si no completa las 9 paradas en ese tiempo, queda bloqueada sin reintento.
- Paradas en orden fijo: edificio D → edificio L → biblioteca.
- La foto solo se toma con la cámara en ese momento y no se puede cambiar después de la primera parada.
- La biblioteca puede activar el pasaporte aunque ya pasaron las 24 horas, siempre que la persona haya completado las 9 paradas a tiempo.
- Los sellos se ganan por bloque: 3 sellos, uno por cada bloque de paradas.
- El pasaporte se puede descargar como foto con el botón «Descargar como foto». En iPhone se abre el menú de compartir: ahí se elige «Guardar imagen» y queda en Fotos.
- La web no limita la cantidad de registros ni habla de premios. Eso se maneja con Bienestar.
