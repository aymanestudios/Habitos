-- 0002_habits.sql
-- Tabla de hábitos + permisos RLS. Se ejecuta UNA vez en el editor SQL de Supabase,
-- después de 0001_profiles.sql. Sigue las decisiones de docs/AJUSTES.md.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  -- Dueño del hábito. Lo rellena el servidor con quien ha iniciado sesión: el navegador no lo envía.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  description text,

  -- Frecuencia (ver docs/AJUSTES.md, apartado 3):
  --   daily         -> todos los días
  --   days_of_week  -> días concretos (days_of_week: 1 = lunes ... 7 = domingo)
  --   weekly_count  -> N veces por semana (weekly_target: 1 a 7)
  --   weekly_total  -> una cantidad total a la semana (por ejemplo 30 km); exige target_value
  frequency_type text not null default 'daily',
  days_of_week smallint[],
  weekly_target smallint,

  -- Objetivo numérico opcional (apartado 2): por ejemplo 8 vasos o 5 km.
  target_value numeric(10, 2),
  unit text,

  difficulty text not null default 'medium',  -- decidirá la XP (parte 1.4)
  visibility text not null default 'private', -- private = solo yo, friends = mis amigos (Fase 2)

  -- Primer día del hábito. Lo fija el servidor con la zona horaria del usuario (apartado 6).
  start_date date not null,
  end_date date,
  archived_at timestamptz, -- archivar conserva el historial; borrar lo perdería

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint habits_title_length check (char_length(title) between 1 and 60),
  constraint habits_description_length check (char_length(description) <= 200),
  constraint habits_unit_length check (char_length(unit) <= 20),
  constraint habits_frequency_values check (
    frequency_type in ('daily', 'days_of_week', 'weekly_count', 'weekly_total')
  ),
  constraint habits_days_valid check (
    days_of_week is null or days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  -- Cada tipo de frecuencia exige sus datos y prohíbe los de los demás.
  -- Ojo: un CHECK que da NULL (desconocido) se acepta, por eso cada dato exigido lleva su "is not null".
  constraint habits_frequency_shape check (
    (frequency_type = 'daily' and days_of_week is null and weekly_target is null)
    or (frequency_type = 'days_of_week' and days_of_week is not null
        and cardinality(days_of_week) between 1 and 7 and weekly_target is null)
    or (frequency_type = 'weekly_count' and weekly_target is not null
        and weekly_target between 1 and 7 and days_of_week is null)
    or (frequency_type = 'weekly_total' and days_of_week is null and weekly_target is null and target_value is not null)
  ),
  constraint habits_target_positive check (target_value is null or (target_value > 0 and target_value <= 100000)),
  constraint habits_difficulty_values check (difficulty in ('easy', 'medium', 'hard')),
  constraint habits_visibility_values check (visibility in ('private', 'friends')),
  constraint habits_end_after_start check (end_date is null or end_date >= start_date)
);

create index habits_user_id_idx on public.habits (user_id);

-- Antes de insertar: limpia el título y fija la fecha de inicio con la zona horaria del usuario.
create or replace function public.habits_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tz text;
begin
  select timezone into tz from public.profiles where id = new.user_id;
  new.title := btrim(new.title);
  new.start_date := (now() at time zone coalesce(tz, 'Europe/Madrid'))::date;
  return new;
end;
$$;

create trigger habits_before_insert
  before insert on public.habits
  for each row execute function public.habits_before_insert();

-- Antes de actualizar: limpia el título y anota cuándo se tocó por última vez.
create or replace function public.habits_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.updated_at := now();
  return new;
end;
$$;

create trigger habits_before_update
  before update on public.habits
  for each row execute function public.habits_before_update();

-- Seguridad por filas (RLS): cada usuario solo ve y toca SUS hábitos.
-- Los amigos podrán ver los hábitos con visibility = 'friends' en la Fase 2, con una política nueva.
alter table public.habits enable row level security;

create policy "habits: ver los propios"
  on public.habits for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "habits: crear los propios"
  on public.habits for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "habits: editar los propios"
  on public.habits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No hay política de DELETE: los hábitos se archivan, no se borran.

-- Permisos por columna. Se quitan los permisos por defecto y se dan solo los necesarios,
-- así el navegador no puede cambiar user_id, start_date ni las fechas de creación.
revoke all on public.habits from anon, authenticated;

grant select on public.habits to authenticated;

grant insert (
  title, description, frequency_type, days_of_week, weekly_target,
  target_value, unit, difficulty, visibility, end_date
) on public.habits to authenticated;

grant update (
  title, description, frequency_type, days_of_week, weekly_target,
  target_value, unit, difficulty, visibility, end_date, archived_at
) on public.habits to authenticated;
