-- 0005_reminders.sql
-- Recordatorios personales (entregar un trabajo, beber agua, una toma, una tarea...).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0004.
-- Son privados: solo su dueño puede verlos, crearlos, cambiarlos o borrarlos. No dan XP.

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  -- Lo rellena el servidor con quien ha iniciado sesión: el navegador no lo envía.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  note text,
  due_at timestamptz not null,           -- cuándo toca (instante exacto)
  repeat text not null default 'none',   -- none = una vez, daily = cada día, weekly = cada semana
  done_at timestamptz,                   -- solo en los de una vez: cuándo se completó (vacío = pendiente)
  last_done_at timestamptz,              -- en los que se repiten: última vez que se hizo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reminders_title_length check (char_length(title) between 1 and 80),
  constraint reminders_note_length check (note is null or char_length(note) <= 200),
  constraint reminders_repeat_values check (repeat in ('none', 'daily', 'weekly')),
  -- Un recordatorio que se repite nunca queda "terminado": al hacerlo, pasa a la siguiente fecha.
  constraint reminders_done_only_once check (repeat = 'none' or done_at is null)
);

create index reminders_user_due_idx on public.reminders (user_id, due_at);

create or replace function public.reminders_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.note := nullif(btrim(new.note), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger reminders_before_write
  before insert or update on public.reminders
  for each row execute function public.reminders_before_write();

-- Nadie llama a esta función directamente (solo el trigger)
revoke all on function public.reminders_before_write() from public, anon, authenticated;

alter table public.reminders enable row level security;

create policy "reminders: ver los propios"
  on public.reminders for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "reminders: crear los propios"
  on public.reminders for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "reminders: editar los propios"
  on public.reminders for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reminders: borrar los propios"
  on public.reminders for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Permisos por columnas: el navegador no puede tocar user_id, id ni las fechas de creación.
revoke all on public.reminders from anon, authenticated;
grant select, delete on public.reminders to authenticated;
grant insert (title, note, due_at, repeat) on public.reminders to authenticated;
grant update (title, note, due_at, repeat, done_at, last_done_at) on public.reminders to authenticated;
