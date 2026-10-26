-- Pruebas pgTAP del esquema y las reglas de seguridad de Pasaporte Lector.
-- Ejecutar con: supabase test db

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(40);

-- Semilla de ejemplo (claves.example.json) dentro de la transacción de prueba.
delete from public.claves_paradas;
insert into public.claves_paradas (parada, posicion, hash) values
  ('b1-p1', 1, public.hash_palabra('estrofa')),
  ('b1-p2', 2, public.hash_palabra('verso')),
  ('b1-p3', 3, public.hash_palabra('poesía')),
  ('b2-p1', 4, public.hash_palabra('escena')),
  ('b2-p2', 5, public.hash_palabra('acto')),
  ('b2-p3', 6, public.hash_palabra('telón')),
  ('b3-p1', 7, public.hash_palabra('novela')),
  ('b3-p2', 8, public.hash_palabra('capítulo')),
  ('b3-p3', 9, public.hash_palabra('relato'));

insert into public.config_privada (clave, valor)
values ('codigo_biblioteca', public.hash_palabra('CAMBIAR-ESTE-CODIGO'))
on conflict (clave) do update set valor = excluded.valor;

-- ─── 1. Dominio distinto a unab.edu.co rechazado ─────────────────────────────

select is(
  (public.hook_antes_de_crear_usuario('{"user":{"email":"intruso@gmail.com"}}'::jsonb))->'error'->>'http_code',
  '400',
  'Auth Hook rechaza correo fuera de unab.edu.co con código 400'
);

select is(
  public.hook_antes_de_crear_usuario('{"user":{"email":"  ESTUDIANTE@UNAB.EDU.CO "}}'::jsonb),
  '{}'::jsonb,
  'Auth Hook acepta correo @unab.edu.co con mayúsculas y espacios'
);

select throws_ok(
  $$ insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', 'intruso@gmail.com') $$,
  'P0001',
  'Solo se permiten correos @unab.edu.co',
  'Disparador en auth.users rechaza correo de otro dominio'
);

select throws_ok(
  $$ insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999998', '@unab.edu.co') $$,
  'P0001',
  'Solo se permiten correos @unab.edu.co',
  'Disparador en auth.users rechaza correo sin usuario antes de @unab.edu.co'
);

select lives_ok(
  $$
    insert into auth.users (id, email, email_confirmed_at) values
      ('11111111-1111-1111-1111-111111111111', '  Ana@UNAB.edu.co ', now()),
      ('22222222-2222-2222-2222-222222222222', 'beto@unab.edu.co', now()),
      ('33333333-3333-3333-3333-333333333333', 'carla@unab.edu.co', now());
  $$,
  'Disparador en auth.users permite correos @unab.edu.co válidos'
);

select is(
  (select email from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  'ana@unab.edu.co',
  'Disparador normaliza el correo a minúsculas y sin espacios'
);

-- ─── 2. Un registro por correo y por ID estudiantil ──────────────────────────

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.iniciar_juego(false) $$,
  'P0001',
  'consentimiento_requerido',
  'iniciar_juego exige aceptar el consentimiento de datos'
);

select lives_ok(
  $$
    select public.iniciar_juego(true);
    select public.iniciar_juego(true);
  $$,
  'Llamadas repetidas a iniciar_juego son idempotentes'
);

select is(
  (select count(*)::int from public.perfiles where usuario = '11111111-1111-1111-1111-111111111111'),
  1,
  'Se crea un único perfil para el usuario 1'
);

select lives_ok(
  $$ select public.guardar_datos('U00182088', 'Ana María Pérez', 'Literatura') $$,
  'Usuario 1 registra su ID estudiantil U00182088'
);

-- Usuario 2 intenta registrar el mismo ID estudiantil (con minúsculas y espacios).
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select public.iniciar_juego(true);

select throws_ok(
  $$ select public.guardar_datos(' u00182088 ', 'Beto Gómez', 'Derecho') $$,
  'P0001',
  'id_duplicado',
  'Rechaza un ID estudiantil ya registrado con otro correo'
);

select lives_ok(
  $$ select public.guardar_datos('U00999999', 'Beto Gómez', 'Derecho') $$,
  'Usuario 2 registra su propio ID estudiantil único'
);

reset role;

select throws_ok(
  $$
    insert into public.perfiles (usuario, correo, consentimiento_en, inicio, vence, marca_agua)
    values ('33333333-3333-3333-3333-333333333333', 'ana@unab.edu.co', now(), now(), now() + interval '24 hours', 5)
  $$,
  '23505',
  null,
  'Restricción unique impide dos perfiles con el mismo correo'
);

-- ─── 3. Orden de paradas y normalización de palabras ─────────────────────────

-- Sube fotos de prueba en storage.objects para los usuarios 1 y 2.
insert into storage.objects (bucket_id, name, owner) values
  ('fotos', '11111111-1111-1111-1111-111111111111/foto.jpg', '11111111-1111-1111-1111-111111111111'),
  ('fotos', '22222222-2222-2222-2222-222222222222/foto.jpg', '22222222-2222-2222-2222-222222222222');

select is(
  public.normalizar_palabra('  POESÍA '),
  'poesia',
  'normalizar_palabra convierte "  POESÍA " en "poesia"'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ select public.guardar_foto() $$,
  'guardar_foto enlaza la foto del usuario 1'
);

select is(
  public.enviar_palabra('b1-p2', 'verso', 7.117, -73.105, 10)->>'resultado',
  'fuera_de_orden',
  'No permite saltar a la parada 2 sin haber hecho la 1'
);

select is(
  public.enviar_palabra('b3-p3', 'relato', 7.117, -73.105, 10)->>'resultado',
  'fuera_de_orden',
  'No permite saltar directamente a la última parada'
);

select is(
  public.enviar_palabra('b1-p1', 'estrofa', 7.117, -73.105, 10)->>'resultado',
  'correcta',
  'Completa la parada 1 en orden'
);

select is(
  public.enviar_palabra('b1-p1', 'estrofa', 7.117, -73.105, 10)->>'resultado',
  'ya_completada',
  'Reenviar la misma parada devuelve ya_completada sin duplicar progreso'
);

select throws_ok(
  $$ select public.guardar_datos('U00182088', 'Otro Nombre', 'Música') $$,
  'P0001',
  'datos_bloqueados',
  'No permite cambiar datos personales después de la primera parada'
);

select is(
  public.enviar_palabra('b1-p2', '  VERSO ', 7.117, -73.105, 10)->>'resultado',
  'correcta',
  'Completa la parada 2 en orden'
);

select is(
  public.enviar_palabra('b1-p3', '  POESÍA ', 7.117, -73.105, 10)->>'resultado',
  'correcta',
  'Acepta palabra con tildes, mayúsculas y espacios ("  POESÍA " = poesia)'
);

-- ─── 4. Límite de 5 errores por minuto ───────────────────────────────────────

select is(
  (select json_agg((public.enviar_palabra('b2-p1', 'error' || g, 7.117, -73.105, 10))->>'resultado')::text
     from generate_series(1, 5) g),
  '["incorrecta", "incorrecta", "incorrecta", "incorrecta", "incorrecta"]',
  'Registra los primeros 5 errores de palabra como incorrecta'
);

select is(
  public.enviar_palabra('b2-p1', 'escena', 7.117, -73.105, 10)->>'resultado',
  'espera',
  'Bloquea con espera al superar 5 errores en un minuto'
);

-- ─── 5. activar_pasaporte solo con las 9 paradas y el código correcto ────────

select is(
  public.activar_pasaporte('CAMBIAR-ESTE-CODIGO')->>'resultado',
  'faltan_paradas',
  'No permite activar el pasaporte si faltan paradas'
);

-- Simula que pasó más de 1 minuto desde los errores para terminar el recorrido.
reset role;
update public.intentos
   set creado_en = now() - interval '2 minutes'
 where usuario = '11111111-1111-1111-1111-111111111111'
   and tipo = 'palabra_incorrecta';

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select public.enviar_palabra('b2-p1', 'escena', 7.117, -73.105, 10);
select public.enviar_palabra('b2-p2', 'acto', 7.117, -73.105, 10);
select public.enviar_palabra('b2-p3', 'TELÓN', 7.117, -73.105, 10);
select public.enviar_palabra('b3-p1', 'novela', 7.117, -73.105, 10);
select public.enviar_palabra('b3-p2', 'CAPÍTULO', 7.117, -73.105, 10);
select public.enviar_palabra('b3-p3', 'relato', 7.117, -73.105, 10);

select ok(
  (select finalizado_en is not null from public.perfiles where usuario = '11111111-1111-1111-1111-111111111111'),
  'Marca finalizado_en al completar la parada 9'
);

select is(
  public.activar_pasaporte('CODIGO-INCORRECTO')->>'resultado',
  'incorrecto',
  'activar_pasaporte rechaza un código de biblioteca incorrecto'
);

select is(
  public.activar_pasaporte('  cambiar-este-codigo ')->>'resultado',
  'activado',
  'activar_pasaporte activa el pasaporte con las 9 paradas y el código correcto'
);

select is(
  (select estado::text from public.perfiles where usuario = '11111111-1111-1111-1111-111111111111'),
  'completado',
  'El perfil queda en estado completado tras activar el pasaporte'
);

-- ─── 6. Expiración a las 24 h (simulando mover "vence") ──────────────────────

set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select public.guardar_foto();
select public.enviar_palabra('b1-p1', 'estrofa', 7.117, -73.105, 10);

reset role;
update public.perfiles
   set inicio = now() - interval '25 hours',
       vence  = now() - interval '1 hour'
 where usuario = '22222222-2222-2222-2222-222222222222';

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  public.enviar_palabra('b1-p2', 'verso', 7.117, -73.105, 10)->>'resultado',
  'expirado',
  'enviar_palabra devuelve expirado cuando han pasado las 24 horas'
);

select is(
  public.estado_juego()->'perfil'->>'estado',
  'expirado',
  'estado_juego reporta el perfil como expirado'
);

select is(
  public.activar_pasaporte('CAMBIAR-ESTE-CODIGO')->>'resultado',
  'faltan_paradas',
  'Un usuario expirado no puede activar el pasaporte'
);

-- ─── 7. RLS y permisos: un usuario no lee datos ni fotos de otro ─────────────

select results_eq(
  $$ select usuario from public.perfiles $$,
  array['22222222-2222-2222-2222-222222222222'::uuid],
  'RLS en perfiles: el usuario 2 solo puede leer su propio perfil'
);

select results_eq(
  $$ select count(*)::int from public.progreso where usuario <> auth.uid() $$,
  array[0],
  'RLS en progreso: el usuario 2 no puede leer el progreso del usuario 1'
);

select throws_ok(
  $$ select count(*) from public.claves_paradas $$,
  '42501',
  null,
  'authenticated no tiene acceso a claves_paradas'
);

select throws_ok(
  $$ select count(*) from public.config_privada $$,
  '42501',
  null,
  'authenticated no tiene acceso a config_privada'
);

select throws_ok(
  $$ select count(*) from public.intentos $$,
  '42501',
  null,
  'authenticated no tiene acceso directo a intentos'
);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'fotos' $$,
  array['22222222-2222-2222-2222-222222222222/foto.jpg'],
  'RLS en storage.objects: el usuario 2 solo ve su propia foto'
);

set local role anon;

select throws_ok(
  $$ select public.estado_juego() $$,
  '42501',
  null,
  'anon no puede ejecutar funciones en public'
);

select throws_ok(
  $$ select count(*) from public.perfiles $$,
  '42501',
  null,
  'anon no puede leer perfiles'
);

select * from finish();
rollback;
