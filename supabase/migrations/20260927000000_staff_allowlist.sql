-- ============================================================
-- Allow-list de staff
--
-- El rol ya no se toma ciegamente del metadata del signup: solo los emails
-- presentes en staff_allowlist pueden convertirse en 'profe'. Sin esta tabla,
-- cualquiera que marque "Registrarme como profe" en la app era admin.
-- ============================================================

create table if not exists public.staff_allowlist (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.staff_allowlist enable row level security;
-- Sin policies a propósito: la tabla no es legible ni escribible desde el
-- cliente. Todo acceso pasa por las RPCs de abajo, que validan is_profe().

-- ¿El email está habilitado para registrarse como profe?
-- Solo se usa dentro de triggers/funciones security definer: se le revoca el
-- execute a public para que un usuario anónimo no la use como oráculo de emails.
create or replace function public.is_staff_allowlisted(target_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_allowlist s
    where s.email = lower(btrim(coalesce(target_email, '')))
  );
$$;

revoke execute on function public.is_staff_allowlisted(text) from public;

-- New user → profile row.
-- El rol 'profe' del metadata solo se honra si el email está en la allow-list.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'role' = 'profe'
       and public.is_staff_allowlisted(new.email) then 'profe'
      else 'cliente'
    end
  );
  return new;
end;
$$;

-- profiles tenía columna updated_at pero ningún trigger que la mantuviera.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Gestión de la allow-list (solo un profe autenticado puede llamar esto)
-- ============================================================

create or replace function public.list_staff_allowlist()
returns table (email text, note text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede ver la lista de staff';
  end if;
  return query
    select s.email, s.note, s.created_at
    from public.staff_allowlist s
    order by s.created_at desc;
end;
$$;

-- Habilita un email para registrarse como profe. Si la cuenta ya existe
-- (registro previo como alumno) la promueve en el momento.
create or replace function public.grant_staff_access(target_email text, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede habilitar accesos de staff';
  end if;

  if btrim(coalesce(target_email, '')) = '' then
    raise exception 'Falta el email';
  end if;

  insert into public.staff_allowlist (email, note)
  values (lower(btrim(target_email)), nullif(btrim(coalesce(note, '')), ''))
  on conflict (email) do update set note = excluded.note;

  update public.profiles
     set role = 'profe'
   where email = lower(btrim(target_email)) and role = 'cliente';
end;
$$;

-- Quita el email de la allow-list. Solo baja el rol a 'cliente' si el profe no
-- tiene alumnos ni rutinas: si los tiene, cortarle el acceso los dejaría
-- huérfanos y hay que hacerlo a mano desde el backend.
create or replace function public.revoke_staff_access(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not public.is_profe() then
    raise exception 'Solo un profe puede quitar accesos de staff';
  end if;

  delete from public.staff_allowlist
   where email = lower(btrim(coalesce(target_email, '')));

  select p.id into target
    from public.profiles p
   where p.email = lower(btrim(target_email)) and p.role = 'profe';

  if target is null then
    return;
  end if;

  if exists (select 1 from public.profiles where profe_id = target)
     or exists (select 1 from public.routines where profe_id = target) then
    raise exception 'Ese profe tiene alumnos o rutinas asignadas. Bajalo de rol desde el backend.';
  end if;

  update public.profiles set role = 'cliente' where id = target;
end;
$$;

grant execute on function public.list_staff_allowlist() to authenticated;
grant execute on function public.grant_staff_access(text, text) to authenticated;
grant execute on function public.revoke_staff_access(text) to authenticated;
