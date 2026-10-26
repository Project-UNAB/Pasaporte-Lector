-- Consultas para el cliente. Ejecutar en Supabase → SQL Editor (acceso de administrador).
-- Descargar el resultado con el botón "Export → CSV".

-- 1) IDs para Bienestar Estudiantil: primeros N pasaportes activados (cambiar el límite).
select row_number() over (order by activado_en) as puesto, id_estudiantil, activado_en
  from public.perfiles
 where activado_en is not null
 order by activado_en
 limit 100;

-- 2) Datos completos para estadísticas.
select p.correo, p.nombre, p.id_estudiantil, p.carrera, p.estado, p.marca_agua,
       p.consentimiento_en, p.inicio, p.vence, p.finalizado_en, p.activado_en,
       (select count(*) from public.progreso g where g.usuario = p.usuario) as paradas_completadas,
       (select count(*) from public.intentos i where i.usuario = p.usuario and i.tipo = 'ayuda_usada') as ayudas
  from public.perfiles p
 order by p.creado_en;

-- 3) Resumen general.
select count(*) as registrados,
       count(*) filter (where nombre is not null) as con_datos,
       count(*) filter (where finalizado_en is not null) as terminaron_paradas,
       count(*) filter (where activado_en is not null) as pasaportes_activados,
       count(*) filter (where estado = 'expirado') as expirados
  from public.perfiles;

-- 4) Paradas donde más se usa la ayuda (GPS impreciso).
select parada, count(*) filter (where tipo = 'ubicacion_fallida') as fallos_ubicacion,
       count(*) filter (where tipo = 'ayuda_usada') as ayudas,
       count(*) filter (where tipo = 'palabra_incorrecta') as palabras_incorrectas
  from public.intentos
 where parada is not null
 group by parada
 order by parada;
