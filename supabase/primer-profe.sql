-- ============================================================
-- Bootstrap del primer profe
--
-- Corré esto UNA vez en el Supabase SQL Editor (dashboard > SQL > New query).
-- Habilita tu email para que puedas registrarte como profe desde /profe.
-- A partir de acá, cada profe nuevo se habilita desde el panel (pantalla
-- "Equipo") y no necesita tocar la base.
-- ============================================================

insert into public.staff_allowlist (email, note)
values ('TU_EMAIL_AQUI@mail.com', 'profe fundador')
on conflict (email) do update set note = excluded.note;

-- Si ya te habías registrado como alumno con ese email, promovelo a profe:
update public.profiles
   set role = 'profe'
 where email = 'TU_EMAIL_AQUI@mail.com'
   and role = 'cliente';
