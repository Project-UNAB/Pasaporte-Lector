-- Semilla de desarrollo local (usa solo las palabras de ejemplo de claves.example.json).
insert into public.claves_paradas (parada, posicion, hash) values
  ('b1-p1', 1, public.hash_palabra('estrofa')),
  ('b1-p2', 2, public.hash_palabra('verso')),
  ('b1-p3', 3, public.hash_palabra('poesía')),
  ('b2-p1', 4, public.hash_palabra('escena')),
  ('b2-p2', 5, public.hash_palabra('acto')),
  ('b2-p3', 6, public.hash_palabra('telón')),
  ('b3-p1', 7, public.hash_palabra('novela')),
  ('b3-p2', 8, public.hash_palabra('capítulo')),
  ('b3-p3', 9, public.hash_palabra('relato'))
on conflict (parada) do update
  set posicion = excluded.posicion, hash = excluded.hash;

insert into public.config_privada (clave, valor)
values ('codigo_biblioteca', public.hash_palabra('CAMBIAR-ESTE-CODIGO'))
on conflict (clave) do update set valor = excluded.valor;
