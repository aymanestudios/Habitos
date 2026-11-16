-- 0003_habit_logs.sql
-- Registro diario de hábitos: marcar, desmarcar y sumar progreso.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001 y 0002.
-- Sigue docs/AJUSTES.md (apartados 1, 2 y 6): una fila por hábito y día, fecha puesta por el servidor.

-- 1. Tabla: una fila por hábito y día. SIN fila = ese día no se ha hecho nada.
--    "value" es el TOTAL acumulado del día: 1 en los hábitos de sí/no; por ejemplo 5 en "5 de 8 vasos".
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null, -- el día en la zona horaria del usuario (no un instante UTC)
  value numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- La clave de todo: no puede haber dos filas del mismo hábito y día.
  -- Así marcar, desmarcar y volver a marcar nunca duplica nada (y, en la parte 1.4, tampoco la XP).
  constraint habit_logs_one_per_day unique (habit_id, local_date),
  constraint habit_logs_value_range check (value > 0 and value <= 100000)
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, local_date);

-- 2. Seguridad por filas (RLS): cada usuario solo LEE sus registros.
alter table public.habit_logs enable row level security;

create policy "habit_logs: ver los propios"
  on public.habit_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No hay políticas de INSERT, UPDATE ni DELETE, y además se quitan los permisos:
-- el navegador no puede escribir aquí directamente, solo a través de la función de abajo.
revoke all on public.habit_logs from anon, authenticated;
grant select on public.habit_logs to authenticated;

-- 3. Única forma de escribir: sumar (o restar) progreso a un día.
--    p_delta     +1 / -1 en hábitos de sí/no; +N / -N en los numéricos.
--    p_day_offset  0 = hoy, -1 = ayer (nada más: así no se rellenan días antiguos).
--    La fecha NO la manda el navegador: la calcula el servidor con la zona horaria del perfil.
--    Si el total llega a 0, se borra la fila (volver a "sin hacer").
create or replace function public.add_habit_progress(
  p_habit_id uuid,
  p_delta numeric,
  p_day_offset integer default 0
)
returns table (log_date date, log_value numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h public.habits%rowtype;
  tz text;
  today date;
  target_date date;
  max_value numeric;
  current_total numeric;
  new_total numeric;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'invalid_delta' using errcode = '22023';
  end if;
  if p_day_offset is null or p_day_offset not in (0, -1) then
    raise exception 'day_not_allowed' using errcode = '22023';
  end if;

  -- Solo hábitos propios. Si no existe o es de otra persona, el mensaje es el mismo.
  select * into h from public.habits where id = p_habit_id and user_id = uid;
  if not found then
    raise exception 'habit_not_found' using errcode = 'P0002';
  end if;
  if h.archived_at is not null then
    raise exception 'habit_archived' using errcode = '22023';
  end if;

  select timezone into tz from public.profiles where id = uid;
  today := (now() at time zone coalesce(tz, 'Europe/Madrid'))::date;
  target_date := today + p_day_offset;

  if target_date < h.start_date then
    raise exception 'before_start' using errcode = '22023';
  end if;
  if h.end_date is not null and target_date > h.end_date then
    raise exception 'after_end' using errcode = '22023';
  end if;
  -- Los hábitos de días concretos solo se marcan en esos días (1 = lunes ... 7 = domingo)
  if h.frequency_type = 'days_of_week'
     and not (extract(isodow from target_date)::smallint = any (h.days_of_week)) then
    raise exception 'not_scheduled' using errcode = '22023';
  end if;

  -- Sí/no: el total máximo es 1. Numérico: puede pasarse de la meta (hacer de más no molesta).
  max_value := case when h.target_value is null then 1 else 100000 end;

  select l.value into current_total
  from public.habit_logs l
  where l.habit_id = h.id and l.local_date = target_date
  for update;

  new_total := round(greatest(0, least(max_value, coalesce(current_total, 0) + p_delta)), 2);

  if new_total = 0 then
    delete from public.habit_logs where habit_id = h.id and local_date = target_date;
  else
    insert into public.habit_logs (habit_id, user_id, local_date, value)
    values (h.id, uid, target_date, new_total)
    on conflict (habit_id, local_date)
    do update set value = excluded.value, updated_at = now();
  end if;

  return query select target_date, new_total;
end;
$$;

-- Solo usuarios con sesión pueden llamarla (los anónimos, no).
revoke all on function public.add_habit_progress(uuid, numeric, integer) from public, anon;
grant execute on function public.add_habit_progress(uuid, numeric, integer) to authenticated;
