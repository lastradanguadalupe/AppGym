-- ============================================================
-- Fase 1 · Hardening de seguridad
--
-- Objetivos:
--  * anon pierde todo privilegio sobre las tablas de `public`.
--  * Los roles dejan de darse por sentado: un profe solo accede a los
--    alumnos que tiene asignados (nunca al directorio global).
--  * El `role` y el `profe_id` de `profiles` son intocables desde el cliente
--    (column grants + políticas). El único camino es el RPC assign_profe.
--  * `client_details` (datos de salud) protegido solo para dueño y su profe.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Grants mínimos. anon no tiene nada que leer/escribir en `public`.
--    (Se mantiene el acceso amplio para `authenticated` porque la seguridad
--    real la dan las policies RLS de cada tabla.)
-- ------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;

-- ------------------------------------------------------------
-- 2) Helper para asignación/gestión de alumnos (los policies usan la
--    subconsulta directa para evitar problemas de inline en funciones setof).
--    SECURITY DEFINER + search_path seguro, como el resto de helpers.
-- ------------------------------------------------------------

create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where profe_id = auth.uid();
$$;

-- Conjunto de alumnos del profe actual, para reutilizar en policies.
-- Enfoque con subconsulta directa: profe ve SOLO a sus asignados; un cliente
-- no matchea nada (evita fuga del directorio global).
-- Los policies de `profiles` NO referencian ninguna de estas tablas, así que
-- las subconsultas no generan recursión.

-- ------------------------------------------------------------
-- 3) profiles
-- ------------------------------------------------------------

drop policy if exists profiles_select_own_or_profe on public.profiles;
drop policy if exists profiles_update_own_or_profe on public.profiles;
drop policy if exists profiles_insert_profe on public.profiles;

-- Select: solo mi fila, mis alumnos (profe) o mi profe (alumno).
create policy "profiles_select_own_or_related"
  on public.profiles for select
  using (
    auth.uid() = id
    or profe_id = auth.uid()
    or id = public.my_profe_id()
  );

-- Insert: lo hace el trigger on_auth_user_created. Si alguien llama directo,
-- solo un profe y creando un perfil de cliente suyo (sin auto-elevación).
create policy "profiles_insert_profe"
  on public.profiles for insert
  with check (public.is_profe() and role = 'cliente' and profe_id = auth.uid());

-- Update: propio (sin cambiar rol) o alumno asignado (sin convertir a profe).
create policy "profiles_update_own_or_assigned"
  on public.profiles for update
  using (auth.uid() = id or profe_id = auth.uid())
  with check (
    (auth.uid() = id and role = public.my_role())
    or (profe_id = auth.uid() and role = 'cliente')
  );

-- El rol, el profe asignado y el email no se tocan desde el cliente:
-- solo queda editable name y avatar_url. assign_profe() (security definer)
-- es el único camino permitido para asignar/mover alumnos.
revoke update on public.profiles from authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 4) client_details — DATOS DE SALUD: solo dueño y profe asignado.
-- ------------------------------------------------------------

drop policy if exists client_details_select_own_or_profe on public.client_details;
drop policy if exists client_details_update_own_or_profe on public.client_details;

create policy "client_details_select_own_or_assigned"
  on public.client_details for select
  using (
    user_id = auth.uid()
    or user_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

create policy "client_details_update_own_or_assigned"
  on public.client_details for update
  using (
    user_id = auth.uid()
    or user_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 5) routines — insert/update solo sobre alumnos del profe, y sin que el
--    UPDATE permita reasignar la rutina a otra persona.
-- ------------------------------------------------------------

drop policy if exists routines_insert_profe on public.routines;
drop policy if exists routines_update_profe on public.routines;

create policy "routines_insert_profe_assigned"
  on public.routines for insert
  with check (
    public.is_profe()
    and profe_id = auth.uid()
    and cliente_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

create policy "routines_update_profe"
  on public.routines for update
  using (profe_id = auth.uid())
  with check (
    public.is_profe()
    and profe_id = auth.uid()
    and cliente_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

-- El cliente y el profe de una rutina no se reasignan desde el cliente.
revoke update on public.routines from authenticated;
grant update (title, description, is_active) on public.routines to authenticated;

-- ------------------------------------------------------------
-- 6) routine_blocks y routine_block_exercises — escritura solo del profe de
--    la rutina a la que pertenecen (no de cualquier profe).
-- ------------------------------------------------------------

drop policy if exists blocks_write_profe on public.routine_blocks;

create policy "blocks_write_profe_own"
  on public.routine_blocks for all
  using (
    public.is_profe()
    and public.can_access_routine(routine_id)
  )
  with check (
    public.is_profe()
    and public.can_access_routine(routine_id)
  );

drop policy if exists rbe_write_profe on public.routine_block_exercises;

create policy "rbe_write_profe_own"
  on public.routine_block_exercises for all
  using (
    public.is_profe()
    and public.can_access_routine(
      (select b.routine_id from public.routine_blocks b where b.id = block_id)
    )
  )
  with check (
    public.is_profe()
    and public.can_access_routine(
      (select b.routine_id from public.routine_blocks b where b.id = block_id)
    )
  );

-- ------------------------------------------------------------
-- 7) routine_schedule — semana del alumno: dueño o profe asignado.
-- ------------------------------------------------------------

drop policy if exists schedule_select on public.routine_schedule;
drop policy if exists schedule_write on public.routine_schedule;

create policy "schedule_select_own_or_assigned"
  on public.routine_schedule for select
  using (
    client_id = auth.uid()
    or client_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

create policy "schedule_write_own_or_assigned"
  on public.routine_schedule for all
  using (
    client_id = auth.uid()
    or client_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  )
  with check (
    client_id = auth.uid()
    or client_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 8) workout_sessions — el socio registra sus propias sesiones; el profe
--    solo ve las de sus alumnos.
-- ------------------------------------------------------------

drop policy if exists sessions_select_own_or_profe on public.workout_sessions;
drop policy if exists sessions_write_own on public.workout_sessions;

create policy "sessions_select_own_or_assigned"
  on public.workout_sessions for select
  using (
    client_id = auth.uid()
    or client_id in (select p.id from public.profiles p where p.profe_id = auth.uid())
  );

-- Insert: solo propias, y el routine_id (si viene) debe ser accesible.
create policy "sessions_insert_own"
  on public.workout_sessions for insert
  with check (
    client_id = auth.uid()
    and (routine_id is null or public.can_access_routine(routine_id))
  );

create policy "sessions_update_own"
  on public.workout_sessions for update
  using (client_id = auth.uid());

create policy "sessions_delete_own"
  on public.workout_sessions for delete
  using (client_id = auth.uid());

-- ------------------------------------------------------------
-- 9) Búsqueda de alumnos para asignación (solo profe). El profe ya no puede
--    leer el directorio completo; este RPC devuelve coincidencias acotadas.
-- ------------------------------------------------------------

create or replace function public.search_clients_by_email(query text)
returns table (id uuid, email text, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede buscar alumnos';
  end if;
  return query
    select p.id, p.email, p.name
    from public.profiles p
    where p.role = 'cliente'
      and p.email ilike '%' || btrim(coalesce(query, '')) || '%'
    order by p.name nulls last
    limit 20;
end;
$$;

grant execute on function public.search_clients_by_email(text) to authenticated;
grant execute on function public.my_client_ids() to authenticated;

-- Reasignación: un profe no puede "robar" un alumno que ya tiene otro profe
-- (robar dejaría huérfanas las rutinas del profe anterior). Solo toma alumnos
-- sin asignar o suyos.
create or replace function public.assign_profe(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated int;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede asignarse alumnos';
  end if;
  update public.profiles
     set profe_id = auth.uid(), updated_at = now()
   where id = target
     and role = 'cliente'
     and (profe_id is null or profe_id = auth.uid());
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'Ese alumno ya está asignado a otro profe';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 10) Índices para las consultas más frecuentes (RLS + reportes).
-- ------------------------------------------------------------

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists workout_sessions_routine_idx on public.workout_sessions (routine_id);
create index if not exists workout_sessions_block_idx on public.workout_sessions (block_id);
create index if not exists routine_schedule_block_idx on public.routine_schedule (block_id);