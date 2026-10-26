// Genera el SQL que carga las palabras clave y el código de la biblioteca como hash.
// Uso: npm run claves  →  pega scripts/salida/claves.sql en Supabase → SQL Editor.
// Las palabras en claro nunca salen de tu computador.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { paradas } from '../src/contenido.js'
import { normalizarPalabra } from './normalizar.mjs'

const RUTA = new URL('../claves.json', import.meta.url)
if (!existsSync(RUTA)) {
  console.error('Falta claves.json. Copia claves.example.json como claves.json y completa las palabras.')
  process.exit(1)
}

const claves = JSON.parse(readFileSync(RUTA, 'utf8'))
const hash = (p) => createHash('sha256').update('pasaporte-lector:' + normalizarPalabra(p)).digest('hex')
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`

const faltan = paradas.filter((p) => !claves.paradas?.[p.id])
if (faltan.length) {
  console.error('Faltan palabras para: ' + faltan.map((p) => p.id).join(', '))
  process.exit(1)
}
if (!claves.codigo_biblioteca || claves.codigo_biblioteca === 'CAMBIAR-ESTE-CODIGO') {
  console.error('Define un codigo_biblioteca propio en claves.json.')
  process.exit(1)
}

const filas = paradas.map((p) => `  (${sql(p.id)}, ${p.posicion}, ${sql(hash(claves.paradas[p.id]))})`)
const salida = `-- Generado por scripts/cargar-claves.mjs. No subir a GitHub.
begin;
delete from public.claves_paradas;
insert into public.claves_paradas (parada, posicion, hash) values
${filas.join(',\n')};
insert into public.config_privada (clave, valor)
values ('codigo_biblioteca', ${sql(hash(claves.codigo_biblioteca))})
on conflict (clave) do update set valor = excluded.valor;
commit;
`

const dir = new URL('./salida/', import.meta.url)
mkdirSync(dir, { recursive: true })
writeFileSync(new URL('claves.sql', dir), salida)
console.log(`Listo: scripts/salida/claves.sql (${paradas.length} paradas + código de la biblioteca).`)
