-- 0020_lock_done.sql
-- Un hábito HECHO no se puede tocar más: ni sumar ("he bebido 4 de 3 litros") ni quitar.
-- Así el XP de un hábito completado no cambia. Además, el progreso se queda en la meta (3 de 3, no 4 de 3).
-- Para los de "total semanal", hecho = la semana ya llegó a la meta.
-- Solo se cambia add_habit_progress (misma firma). Los registros antiguos no se tocan.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0019.

create or replace function public.add_habit_progress(
  p_habit_id uuid,
  p_delta numeric,
  p_day_offset integer default 0
)
returns table (log_date date, log_value numeric, xp_delta integer)
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
  v_ws date;
  v_before integer;
  v_after integer;
  v_goal numeric;
  v_week numeric := 0;
  v_cap numeric;
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

  -- "for update" bloquea el hábito mientras dura la operación: dos toques casi a la vez se ordenan solos
  select * into h from public.habits where id = p_habit_id and user_id = uid for update;
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
  if h.frequency_type = 'days_of_week'
     and not (extract(isodow from target_date)::smallint = any (h.days_of_week)) then
    raise exception 'not_scheduled' using errcode = '22023';
  end if;

  max_value := case when h.target_value is null then 1 else 100000 end;

  -- XP de esa semana antes del cambio (todo lo que se revisa cae dentro de la misma semana)
  v_ws := (date_trunc('week', target_date::timestamp))::date;
  select coalesce(sum(e.amount), 0)::integer into v_before
  from public.xp_events e
  where e.user_id = uid and e.local_date between v_ws and v_ws + 6;

  select l.value into current_total
  from public.habit_logs l
  where l.habit_id = h.id and l.local_date = target_date
  for update;

  -- 0020: un hábito HECHO se queda así (ni más ni menos). Y nunca se pasa de la meta.
  v_goal := coalesce(h.target_value, 1);
  if h.frequency_type = 'weekly_total' then
    select coalesce(sum(l.value), 0) into v_week
    from public.habit_logs l
    where l.habit_id = h.id and l.local_date between v_ws and v_ws + 6 and l.local_date <> target_date;
  end if;
  if v_week + coalesce(current_total, 0) >= v_goal then
    raise exception 'already_done' using errcode = '22023';
  end if;
  v_cap := least(max_value, v_goal - v_week);

  new_total := round(greatest(0, least(v_cap, coalesce(current_total, 0) + p_delta)), 2);

  if new_total = 0 then
    delete from public.habit_logs where habit_id = h.id and local_date = target_date;
  else
    insert into public.habit_logs (habit_id, user_id, local_date, value)
    values (h.id, uid, target_date, new_total)
    on conflict (habit_id, local_date)
    do update set value = excluded.value, updated_at = now();
  end if;

  perform public.reconcile_habit_xp(h.id, target_date);
  perform public.reconcile_day_bonus(uid, target_date);

  select coalesce(sum(e.amount), 0)::integer into v_after
  from public.xp_events e
  where e.user_id = uid and e.local_date between v_ws and v_ws + 6;

  return query select target_date, new_total, v_after - v_before;
end;
$$;

revoke all on function public.add_habit_progress(uuid, numeric, integer) from public, anon;
grant execute on function public.add_habit_progress(uuid, numeric, integer) to authenticated;
