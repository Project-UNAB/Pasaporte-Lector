-- El ID estudiantil es obligatoriamente U00 + 6 dígitos (ej.: U00182088).
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
  if v_id !~ '^U00[0-9]{6}$' then raise exception 'id_invalido' using errcode = 'P0001'; end if;
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
