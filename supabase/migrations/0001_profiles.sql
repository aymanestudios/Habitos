-- 0001_profiles.sql
-- Perfiles de usuario + creación automática al registrarse + permisos RLS.
-- Se ejecuta UNA vez, pegándolo en el editor SQL de Supabase.

-- 1. Tabla de perfiles: una fila por usuario del login (auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 40)
);

-- 2. Seguridad por filas (RLS): sin política, nadie puede tocar la tabla.
alter table public.profiles enable row level security;

-- Cada usuario solo puede LEER su propio perfil (los amigos llegan en la Fase 2).
create policy "profiles: ver el propio"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Cada usuario solo puede EDITAR su propio perfil.
create policy "profiles: editar el propio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No hay política de INSERT ni de DELETE: el perfil lo crea el servidor (paso 3)
-- y se borra solo si se borra el usuario.

-- Permisos de la API: los usuarios con sesión pueden leer y editar; los anónimos, nada.
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

-- 3. Al registrarse alguien, se crea su perfil automáticamente.
--    El nombre y la zona horaria llegan desde el formulario de registro.
--    El nombre de usuario se genera solo a partir del nombre (y se corrige si ya existe).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuario'
  );
  tz text := coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'Europe/Madrid');
  base_username text;
  candidate text;
begin
  -- Solo letras minúsculas, números y guion bajo; mínimo 3 caracteres
  base_username := left(regexp_replace(lower(full_name), '[^a-z0-9_]', '', 'g'), 14);
  if length(base_username) < 3 then
    base_username := 'user';
  end if;

  -- Si ya existe, le añadimos 4 cifras al azar hasta encontrar uno libre
  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base_username || ((floor(random() * 9000) + 1000)::int)::text;
  end loop;

  -- Si la zona horaria no es válida, usamos Europe/Madrid
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'Europe/Madrid';
  end if;

  insert into public.profiles (id, username, display_name, timezone)
  values (new.id, candidate, left(full_name, 40), tz);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
