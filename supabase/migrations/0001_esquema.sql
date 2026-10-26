-- ═════════════════════════════════════════════════════════════════════════════
--  Pasaporte Lector · esquema, seguridad y funciones del servidor
--  Ejecutar completo en Supabase → SQL Editor (o con `supabase db push`).
--  Las reglas que no admiten trampa (palabra clave, reloj de 24 h, orden de
--  paradas y código de la biblioteca) viven aquí, nunca en el navegador.
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- Evita que objetos futuros en public queden expuestos por defecto a anon/public.
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- ─── Tablas ──────────────────────────────────────────────────────────────────

do $$ begin
  create type public.estado_juego as enum ('activo', 'expirado', 'completado');
exception when duplicate_object then null; end $$;

create table if not exists public.perfiles (
  usuario            uuid primary key references auth.users (id) on delete cascade,
  correo             text not null unique check (correo = lower(btrim(correo)) and correo ~ '^[^\s@]+@unab\.edu\.co$'),
  nombre             text,
  id_estudiantil     text unique,
  carrera            text,
  foto_path          text,
  consentimiento_en  timestamptz not null,
  inicio             timestamptz not null,
  vence              timestamptz not null,
  marca_agua         smallint not null check (marca_agua between 1 and 20),
  finalizado_en      timestamptz,
  activado_en        timestamptz,
  estado             public.estado_juego not null default 'activo',
  creado_en          timestamptz not null default now()
);

create table if not exists public.progreso (
  usuario        uuid not null references public.perfiles (usuario) on delete cascade,
  parada         text not null,
  posicion       smallint not null check (posicion > 0),
  completado_en  timestamptz not null default now(),
  primary key (usuario, parada),
  unique (usuario, posicion)
);

create table if not exists public.intentos (
  id           bigint generated always as identity primary key,
  usuario      uuid not null references public.perfiles (usuario) on delete cascade,
  parada       text,
  tipo         text not null check (tipo in (
                 'ubicacion_fallida', 'ayuda_usada', 'palabra_incorrecta',
                 'palabra_correcta', 'codigo_incorrecto', 'codigo_correcto')),
  lat          double precision,
  lng          double precision,
  precision_m  real,
  creado_en    timestamptz not null default now()
);
create index if not exists intentos_usuario_fecha on public.intentos (usuario, creado_en desc);

-- Palabras clave como hash. Se cargan con `npm run claves`; sin acceso desde la web.
create table if not exists public.claves_paradas (
  parada    text primary key,
  posicion  smallint not null unique check (posicion > 0),
  hash      text not null
);

-- Código de la biblioteca (hash) y otros valores privados. Sin acceso desde la web.
create table if not exists public.config_privada (
  clave  text primary key,
  valor  text not null
);

-- ─── Seguridad por filas y privilegios de tablas ─────────────────────────────

alter table public.perfiles       enable row level security;
alter table public.progreso       enable row level security;
alter table public.intentos       enable row level security;
alter table public.claves_paradas enable row level security;
alter table public.config_privada enable row level security;

drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles
  for select to authenticated using (usuario = (select auth.uid()));

drop policy if exists "progreso propio" on public.progreso;
create policy "progreso propio" on public.progreso
  for select to authenticated using (usuario = (select auth.uid()));

-- Todo cambio pasa por las funciones del servidor; anon no lee ni escribe nada.
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant select on public.perfiles, public.progreso to authenticated;

-- ─── Solo correos @unab.edu.co (Auth Hook + disparador en auth.users) ────────

-- 1) Auth Hook "Before User Created": rechaza el registro antes de crear el
--    usuario o enviar el OTP, devolviendo un error 400 claro a la web.
create or replace function public.hook_antes_de_crear_usuario(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_correo text := lower(btrim(coalesce(event->'user'->>'email', '')));
begin
  if v_correo !~ '^[^\s@]+@unab\.edu\.co$' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Solo se permiten correos @unab.edu.co'
      )
    );
  end if;
  return '{}'::jsonb;
end $$;

-- 2) Defensa en profundidad en la tabla auth.users: protege inserciones directas,
--    cambios de correo (UPDATE) y el caso en que el Hook aún no esté activo.
create or replace function public.validar_dominio_correo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(btrim(new.email)) !~ '^[^\s@]+@unab\.edu\.co$' then
    raise exception 'Solo se permiten correos @unab.edu.co' using errcode = 'P0001';
  end if;
  new.email := lower(btrim(new.email));
  return new;
end $$;

drop trigger if exists validar_dominio_correo on auth.users;
create trigger validar_dominio_correo
  before insert or update of email on auth.users
  for each row execute function public.validar_dominio_correo();

-- ─── Utilidades internas ─────────────────────────────────────────────────────

-- Poesía = poesia = "  POESÍA ". Debe coincidir con scripts/cargar-claves.mjs.
create or replace function public.normalizar_palabra(p text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p, '')), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'),
    '\s+', ' ', 'g'))
$$;

create or replace function public.hash_palabra(p text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest('pasaporte-lector:' || public.normalizar_palabra(p), 'sha256'), 'hex')
$$;

create or replace function public._expirar(p_usuario uuid)
returns void language sql security definer set search_path = '' as $$
  update public.perfiles
     set estado = 'expirado'
   where usuario = p_usuario and estado = 'activo'
     and finalizado_en is null and now() >= vence;
$$;

create or replace function public._total_paradas()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.claves_paradas
$$;

-- ─── Funciones que llama la web ──────────────────────────────────────────────

-- Estado completo del juego de la persona, con la hora del servidor para el reloj.
create or replace function public.estado_juego()
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  perform public._expirar(v_uid);
  return json_build_object(
    'ahora', now(),
    'total', public._total_paradas(),
    'perfil', (select to_json(p) from public.perfiles p where p.usuario = v_uid),
    'completadas', coalesce((
      select json_agg(json_build_object('parada', g.parada, 'posicion', g.posicion,
                                        'completado_en', g.completado_en) order by g.posicion)
        from public.progreso g where g.usuario = v_uid), '[]'::json),
    'fallos_ubicacion', coalesce((
      select json_object_agg(t.parada, t.n) from (
        select i.parada, count(*) as n from public.intentos i
         where i.usuario = v_uid and i.tipo = 'ubicacion_fallida' group by i.parada) t), '{}'::json),
    'ayuda_usada', coalesce((
      select json_agg(distinct i.parada) from public.intentos i
       where i.usuario = v_uid and i.tipo = 'ayuda_usada'), '[]'::json)
  );
end $$;

-- Se llama justo después de verificar el correo. El reloj de 24 h arranca con la
-- verificación del correo, y la marca de agua se asigna una sola vez.
create or replace function public.iniciar_juego(p_consentimiento boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_correo text;
  v_inicio timestamptz;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  -- Serializa llamadas simultáneas del mismo usuario para no duplicar perfil.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if not exists (select 1 from public.perfiles where usuario = v_uid) then
    if not coalesce(p_consentimiento, false) then
      raise exception 'consentimiento_requerido' using errcode = 'P0001';
    end if;
    select lower(btrim(email)), coalesce(email_confirmed_at, now())
      into v_correo, v_inicio
      from auth.users where id = v_uid;
    if v_correo is null then raise exception 'no_autenticado'; end if;
    insert into public.perfiles (usuario, correo, consentimiento_en, inicio, vence, marca_agua)
    values (v_uid, v_correo, now(), v_inicio, v_inicio + interval '24 hours',
            1 + floor(random() * 20)::int)
    on conflict (usuario) do nothing;
  end if;
  return public.estado_juego();
end $$;

create or replace function public.guardar_datos(p_id_estudiantil text, p_nombre text, p_carrera text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id text := upper(regexp_replace(coalesce(p_id_estudiantil, ''), '\s', '', 'g'));
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_carrera text := btrim(coalesce(p_carrera, ''));
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  perform public._expirar(v_uid);
  if not exists (select 1 from public.perfiles where usuario = v_uid and estado = 'activo' for update) then
    raise exception 'juego_no_activo' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.progreso where usuario = v_uid) then
    raise exception 'datos_bloqueados' using errcode = 'P0001';
  end if;
  if v_id !~ '^[A-Z0-9]{4,15}$' then raise exception 'id_invalido' using errcode = 'P0001'; end if;
  if length(v_nombre) not between 3 and 80 then raise exception 'nombre_invalido' using errcode = 'P0001'; end if;
  if length(v_carrera) not between 2 and 80 then raise exception 'carrera_invalida' using errcode = 'P0001'; end if;
  begin
    update public.perfiles
       set id_estudiantil = v_id, nombre = v_nombre, carrera = v_carrera
     where usuario = v_uid;
  exception when unique_violation then
    raise exception 'id_duplicado' using errcode = 'P0001';
  end;
  return public.estado_juego();
end $$;

-- La foto se sube a fotos/<usuario>/foto.jpg desde la cámara; aquí solo se enlaza.
create or replace function public.guardar_foto()
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_path text := v_uid::text || '/foto.jpg';
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  perform public._expirar(v_uid);
  if not exists (select 1 from public.perfiles where usuario = v_uid and estado = 'activo' for update) then
    raise exception 'juego_no_activo' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.progreso where usuario = v_uid) then
    raise exception 'datos_bloqueados' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'fotos' and name = v_path) then
    raise exception 'foto_no_encontrada' using errcode = 'P0001';
  end if;
  update public.perfiles set foto_path = v_path where usuario = v_uid;
  return public.estado_juego();
end $$;

-- Registra un intento de ubicación fallido o el uso del botón de ayuda.
create or replace function public.registrar_ubicacion(
  p_parada text, p_tipo text, p_lat double precision, p_lng double precision, p_precision real)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  if p_tipo not in ('ubicacion_fallida', 'ayuda_usada') then
    raise exception 'tipo_invalido' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.claves_paradas where parada = p_parada) then
    raise exception 'parada_invalida' using errcode = 'P0001';
  end if;
  perform 1 from public.perfiles where usuario = v_uid for update;
  if not found then
    raise exception 'juego_no_activo' using errcode = 'P0001';
  end if;
  if (select count(*) from public.intentos
       where usuario = v_uid and creado_en > now() - interval '1 minute') >= 30 then
    raise exception 'demasiados_intentos' using errcode = 'P0001';
  end if;
  insert into public.intentos (usuario, parada, tipo, lat, lng, precision_m)
  values (v_uid, p_parada, p_tipo, p_lat, p_lng, p_precision);
  return public.estado_juego();
end $$;

create or replace function public.enviar_palabra(
  p_parada text, p_palabra text, p_lat double precision, p_lng double precision, p_precision real)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles;
  v_clave public.claves_paradas;
  v_hechas int;
  v_ok boolean;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;

  -- Bloquea la fila del perfil antes de evaluar vencimiento, orden e intentos.
  select * into v_perfil from public.perfiles where usuario = v_uid for update;
  if not found then return json_build_object('resultado', 'sin_perfil'); end if;

  if v_perfil.estado = 'activo' and v_perfil.finalizado_en is null and now() >= v_perfil.vence then
    update public.perfiles set estado = 'expirado' where usuario = v_uid
    returning * into v_perfil;
  end if;

  if v_perfil.estado = 'expirado' then return json_build_object('resultado', 'expirado'); end if;
  if v_perfil.finalizado_en is not null then return json_build_object('resultado', 'ya_finalizado'); end if;
  if v_perfil.nombre is null or v_perfil.foto_path is null then
    return json_build_object('resultado', 'datos_incompletos');
  end if;

  select * into v_clave from public.claves_paradas where parada = p_parada;
  if not found then return json_build_object('resultado', 'parada_invalida'); end if;
  if exists (select 1 from public.progreso where usuario = v_uid and parada = p_parada) then
    return json_build_object('resultado', 'ya_completada');
  end if;

  select count(*) into v_hechas from public.progreso where usuario = v_uid;
  if v_clave.posicion <> v_hechas + 1 then
    return json_build_object('resultado', 'fuera_de_orden');
  end if;

  -- Las palabras son adivinables: máximo 5 errores por minuto.
  if (select count(*) from public.intentos
       where usuario = v_uid and tipo = 'palabra_incorrecta'
         and creado_en > now() - interval '1 minute') >= 5 then
    return json_build_object('resultado', 'espera');
  end if;

  v_ok := length(coalesce(p_palabra, '')) <= 64 and public.hash_palabra(p_palabra) = v_clave.hash;

  insert into public.intentos (usuario, parada, tipo, lat, lng, precision_m)
  values (v_uid, p_parada, case when v_ok then 'palabra_correcta' else 'palabra_incorrecta' end,
          p_lat, p_lng, p_precision);

  if not v_ok then return json_build_object('resultado', 'incorrecta'); end if;

  insert into public.progreso (usuario, parada, posicion)
  values (v_uid, p_parada, v_clave.posicion)
  on conflict do nothing;
  if not found then
    return json_build_object('resultado', 'ya_completada');
  end if;

  if v_clave.posicion = public._total_paradas() then
    update public.perfiles set finalizado_en = now() where usuario = v_uid;
  end if;
  return json_build_object('resultado', 'correcta', 'completadas', v_hechas + 1);
end $$;

-- El personal de la biblioteca ingresa el código en el celular de la persona.
-- Funciona si completó todas las paradas dentro de sus 24 horas.
create or replace function public.activar_pasaporte(p_codigo text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles;
  v_hash text;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;

  select * into v_perfil from public.perfiles where usuario = v_uid for update;
  if not found then return json_build_object('resultado', 'sin_perfil'); end if;

  if v_perfil.estado = 'activo' and v_perfil.finalizado_en is null and now() >= v_perfil.vence then
    update public.perfiles set estado = 'expirado' where usuario = v_uid
    returning * into v_perfil;
  end if;

  if v_perfil.activado_en is not null then return json_build_object('resultado', 'ya_activado'); end if;
  if v_perfil.estado = 'expirado' then return json_build_object('resultado', 'faltan_paradas'); end if;
  if v_perfil.finalizado_en is null
     or (select count(*) from public.progreso where usuario = v_uid) < public._total_paradas()
     or public._total_paradas() = 0 then
    return json_build_object('resultado', 'faltan_paradas');
  end if;

  if (select count(*) from public.intentos
       where usuario = v_uid and tipo = 'codigo_incorrecto'
         and creado_en > now() - interval '10 minutes') >= 5 then
    return json_build_object('resultado', 'espera');
  end if;

  select valor into v_hash from public.config_privada where clave = 'codigo_biblioteca';
  if v_hash is null then return json_build_object('resultado', 'sin_codigo_configurado'); end if;

  if length(coalesce(p_codigo, '')) > 64 or public.hash_palabra(p_codigo) <> v_hash then
    insert into public.intentos (usuario, tipo) values (v_uid, 'codigo_incorrecto');
    return json_build_object('resultado', 'incorrecto');
  end if;

  insert into public.intentos (usuario, tipo) values (v_uid, 'codigo_correcto');
  update public.perfiles set activado_en = now(), estado = 'completado' where usuario = v_uid;
  return json_build_object('resultado', 'activado');
end $$;

-- Marca como expirados a todos los vencidos. Opcional con pg_cron (ver README).
create or replace function public.expirar_vencidos()
returns int language sql security definer set search_path = '' as $$
  with x as (
    update public.perfiles set estado = 'expirado'
     where estado = 'activo' and finalizado_en is null and now() >= vence
    returning 1)
  select count(*)::int from x;
$$;

-- ─── Permisos de ejecución ───────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.estado_juego(),
  public.iniciar_juego(boolean),
  public.guardar_datos(text, text, text),
  public.guardar_foto(),
  public.registrar_ubicacion(text, text, double precision, double precision, real),
  public.enviar_palabra(text, text, double precision, double precision, real),
  public.activar_pasaporte(text)
to authenticated;

-- El servicio de autenticación ejecuta el Hook y el disparador de dominio.
grant usage on schema public to supabase_auth_admin;
grant execute on function
  public.hook_antes_de_crear_usuario(jsonb),
  public.validar_dominio_correo()
to supabase_auth_admin;

-- ─── Fotos: bucket privado, cada persona sube y ve solo la suya ──────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: ver la propia" on storage.objects;
create policy "fotos: ver la propia" on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/foto.jpg'
  );

-- Solo se puede subir o cambiar la foto antes de completar la primera parada.
drop policy if exists "fotos: subir la propia" on storage.objects;
create policy "fotos: subir la propia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/foto.jpg'
    and not exists (select 1 from public.progreso g where g.usuario = (select auth.uid()))
  );

drop policy if exists "fotos: reemplazar la propia" on storage.objects;
create policy "fotos: reemplazar la propia" on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/foto.jpg'
    and not exists (select 1 from public.progreso g where g.usuario = (select auth.uid()))
  )
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/foto.jpg'
    and not exists (select 1 from public.progreso g where g.usuario = (select auth.uid()))
  );
