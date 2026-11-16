-- 0004_xp_streaks.sql
-- XP, niveles y rachas. Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001, 0002 y 0003.
-- Reglas explicadas en docs/XP-Y-RACHAS.md. Todo se calcula en el servidor: el navegador no puede
-- escribir XP ni rachas, solo pedir que se calculen (add_habit_progress y get_my_progress).

-- 1. REGLAS DEL JUEGO: un solo sitio para ajustar los números.
create or replace function public.game_rule(p_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_name
    when 'xp_easy' then 10            -- XP de un hábito fácil
    when 'xp_medium' then 20          -- ... medio
    when 'xp_hard' then 30            -- ... difícil
    when 'daily_cap' then 150         -- tope de XP por día (evita crear hábitos solo para sumar XP)
    when 'day_bonus' then 20          -- bonus por completar el día
    when 'bonus_min_habits' then 3    -- el bonus exige al menos 3 hábitos diarios ese día
    when 'streak_percent' then 70     -- un día cuenta para la racha con el 70 % hecho
    when 'freezes_per_month' then 2   -- días que se perdonan cada mes sin romper la racha
  end
$$;

create or replace function public.xp_for_difficulty(p_difficulty text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_difficulty
    when 'easy' then public.game_rule('xp_easy')
    when 'hard' then public.game_rule('xp_hard')
    else public.game_rule('xp_medium')
  end
$$;

-- 2. NIVELES. Para llegar al nivel N hacen falta 25 * (N-1) * (N+2) XP en total:
--    nivel 2 = 100, nivel 3 = 250, nivel 4 = 450, nivel 5 = 700, nivel 10 = 2700...
--    (los primeros niveles llegan rápido, para motivar; luego cuestan algo más)
create or replace function public.level_for_xp(p_xp integer)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_xp integer := greatest(coalesce(p_xp, 0), 0);
  v_level integer := greatest(1, floor((sqrt(225 + 4 * v_xp) - 5) / 10)::integer);
begin
  -- Pequeña corrección por si el redondeo de decimales se pasa o se queda corto
  while 25 * v_level * (v_level + 3) <= v_xp loop
    v_level := v_level + 1;
  end loop;
  while v_level > 1 and 25 * (v_level - 1) * (v_level + 2) > v_xp loop
    v_level := v_level - 1;
  end loop;
  return v_level;
end;
$$;

-- 3. TABLA DE XP: un evento por cada premio. La cantidad queda fijada al concederla.
--    Sin política de escritura: solo las funciones de abajo pueden insertar o borrar.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null, -- habit = hábito del día, weekly_total = meta semanal, day_bonus = día completo
  habit_id uuid references public.habits (id) on delete cascade, -- vacío solo en day_bonus
  local_date date not null,
  amount integer not null,
  created_at timestamptz not null default now(),
  constraint xp_events_kind_values check (kind in ('habit', 'weekly_total', 'day_bonus')),
  constraint xp_events_habit_shape check ((kind = 'day_bonus') = (habit_id is null)),
  constraint xp_events_amount_range check (amount >= 0 and amount <= 1000)
);

-- CLAVES ÚNICAS: por aquí es imposible duplicar XP aunque se marque y desmarque mil veces
-- (docs/AJUSTES.md, apartado 1).
create unique index xp_events_habit_day_key
  on public.xp_events (habit_id, local_date) where kind = 'habit';
create unique index xp_events_weekly_key
  on public.xp_events (habit_id, (date_trunc('week', local_date::timestamp)::date)) where kind = 'weekly_total';
create unique index xp_events_bonus_key
  on public.xp_events (user_id, local_date) where kind = 'day_bonus';
create index xp_events_user_date_idx on public.xp_events (user_id, local_date);

alter table public.xp_events enable row level security;

create policy "xp_events: ver los propios"
  on public.xp_events for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;

-- 4. ESTADÍSTICAS POR DÍA: de los hábitos diarios (todos los días o días concretos) que tocaban
--    cada día, cuántos y cuántos se hicieron. Es la base del bonus y de la racha.
--    Un hábito archivado deja de contar desde el día en que se archivó (no cambia el pasado).
create or replace function public.day_stats_range(p_user uuid, p_from date, p_to date)
returns table (day date, scheduled integer, done integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
begin
  select p.timezone into v_tz from public.profiles p where p.id = p_user;
  v_tz := coalesce(v_tz, 'Europe/Madrid');

  return query
  select (p_from + g)::date as day,
         count(h.id)::integer as scheduled,
         (count(l.habit_id) filter (where l.value >= coalesce(h.target_value, 1)))::integer as done
  from generate_series(0, p_to - p_from) as g
  left join public.habits h
    on h.user_id = p_user
   and h.frequency_type in ('daily', 'days_of_week')
   and h.start_date <= (p_from + g)
   and (h.end_date is null or h.end_date >= (p_from + g))
   and (h.archived_at is null or (h.archived_at at time zone v_tz)::date > (p_from + g))
   and (h.frequency_type = 'daily'
        or extract(isodow from (p_from + g))::smallint = any (h.days_of_week))
  left join public.habit_logs l on l.habit_id = h.id and l.local_date = (p_from + g)
  group by g
  order by g;
end;
$$;

-- 5. RACHA. Un día cuenta si se hace al menos el 70 % de lo que tocaba.
--    - Los días sin hábitos programados (por ejemplo el fin de semana de un "lunes a viernes") no suman ni rompen.
--    - Un día fallado se perdona (congelación) hasta 2 veces al mes, solo si había racha que proteger.
--    - Hoy aún no se puede fallar (el día no ha terminado): solo suma si ya llegas al 70 %.
create or replace function public.compute_streaks(p_user uuid, p_today date)
returns table (
  current_streak integer, best_streak integer, freezes_left integer,
  today_scheduled integer, today_done integer, today_ok boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pct integer := public.game_rule('streak_percent');
  v_freezes integer := public.game_rule('freezes_per_month');
  v_first date;
  v_run integer := 0;
  v_best integer := 0;
  v_used integer := 0;
  v_month text := '';
  v_key text;
  v_sched integer;
  v_done integer;
  v_ok boolean;
  v_current integer;
  r record;
begin
  select min(h.start_date) into v_first
  from public.habits h
  where h.user_id = p_user and h.frequency_type in ('daily', 'days_of_week');

  if v_first is not null and v_first < p_today then
    for r in select * from public.day_stats_range(p_user, v_first, p_today - 1) loop
      if r.scheduled = 0 then
        continue; -- día neutro
      end if;

      v_key := to_char(r.day, 'YYYY-MM');
      if v_key <> v_month then
        v_month := v_key;
        v_used := 0; -- cada mes empieza con sus congelaciones completas
      end if;

      if r.done * 100 >= r.scheduled * v_pct then
        v_run := v_run + 1;
        v_best := greatest(v_best, v_run);
      elsif v_run > 0 then
        if v_used < v_freezes then
          v_used := v_used + 1; -- día perdonado: la racha se queda como está
        else
          v_run := 0; -- sin congelaciones: la racha se rompe
        end if;
      end if;
    end loop;
  end if;

  select s.scheduled, s.done into v_sched, v_done
  from public.day_stats_range(p_user, p_today, p_today) s;
  v_ok := v_sched > 0 and v_done * 100 >= v_sched * v_pct;
  v_current := v_run + case when v_ok then 1 else 0 end;

  return query select
    v_current,
    greatest(v_best, v_current),
    v_freezes - case when v_month = to_char(p_today, 'YYYY-MM') then v_used else 0 end,
    v_sched,
    v_done,
    v_ok;
end;
$$;

-- 6. CONCEDER O RETIRAR UN EVENTO DE XP.
--    p_base = XP del hábito (null = ya no corresponde: se retira).
--    Si el evento ya existe, no se toca (así la cantidad no cambia al marcar y desmarcar).
--    Al crearlo se respeta el tope diario: nunca hay más de 150 XP en un mismo día.
create or replace function public.xp_set_event(
  p_user uuid, p_kind text, p_habit uuid, p_date date, p_base integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
  v_room integer;
begin
  if p_base is null then
    delete from public.xp_events e
    where e.user_id = p_user and e.kind = p_kind and e.local_date = p_date
      and e.habit_id is not distinct from p_habit;
    return;
  end if;

  select exists (
    select 1 from public.xp_events e
    where e.user_id = p_user and e.kind = p_kind and e.local_date = p_date
      and e.habit_id is not distinct from p_habit
  ) into v_exists;
  if v_exists then
    return;
  end if;

  select greatest(0, public.game_rule('daily_cap') - coalesce(sum(e.amount), 0))::integer into v_room
  from public.xp_events e
  where e.user_id = p_user and e.local_date = p_date;

  insert into public.xp_events (user_id, kind, habit_id, local_date, amount)
  values (p_user, p_kind, p_habit, p_date, least(p_base, v_room))
  on conflict do nothing;
end;
$$;

-- 7. REVISAR EL XP DE UN HÁBITO EN UN DÍA. Se llama después de cada cambio, y deja los eventos
--    exactamente como tocan según lo que hay marcado (concede lo que falta, retira lo que sobra).
--    - Hábito diario o de días concretos: XP el día en que alcanzas la meta.
--    - N veces por semana: XP en las N primeras veces de esa semana (las demás no dan).
--    - Total semanal: XP una vez por semana, el día en que se alcanza la meta.
--    - El día en que se crea un hábito no da XP (los progresos de ese día no cuentan):
--      así no se puede crear un hábito suelto y cobrarlo al momento.
create or replace function public.reconcile_habit_xp(p_habit_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.habits%rowtype;
  v_threshold numeric;
  v_base integer;
  v_ws date := (date_trunc('week', p_date::timestamp))::date; -- lunes de esa semana
  v_qualifies boolean;
  v_goal integer;
  v_days date[];
  v_day date;
  v_reached date;
begin
  select * into h from public.habits where id = p_habit_id;
  if not found then
    return;
  end if;
  v_threshold := coalesce(h.target_value, 1);
  v_base := public.xp_for_difficulty(h.difficulty);

  if h.frequency_type in ('daily', 'days_of_week') then
    v_qualifies := p_date > h.start_date
      and coalesce((select l.value from public.habit_logs l
                    where l.habit_id = h.id and l.local_date = p_date), 0) >= v_threshold;
    perform public.xp_set_event(h.user_id, 'habit', h.id, p_date, case when v_qualifies then v_base end);

  elsif h.frequency_type = 'weekly_count' then
    v_goal := coalesce(h.weekly_target, 1);
    select coalesce(array_agg(x.d order by x.d), '{}') into v_days
    from (
      select l.local_date as d
      from public.habit_logs l
      where l.habit_id = h.id
        and l.local_date between v_ws and v_ws + 6
        and l.local_date > h.start_date
        and l.value >= v_threshold
      order by l.local_date
      limit v_goal
    ) x;

    delete from public.xp_events e
    where e.habit_id = h.id and e.kind = 'habit'
      and e.local_date between v_ws and v_ws + 6
      and not (e.local_date = any (v_days));
    foreach v_day in array v_days loop
      perform public.xp_set_event(h.user_id, 'habit', h.id, v_day, v_base);
    end loop;

  elsif h.frequency_type = 'weekly_total' then
    select t.local_date into v_reached
    from (
      select l.local_date, sum(l.value) over (order by l.local_date) as cum
      from public.habit_logs l
      where l.habit_id = h.id
        and l.local_date between v_ws and v_ws + 6
        and l.local_date > h.start_date
    ) t
    where t.cum >= v_threshold
    order by t.local_date
    limit 1;

    delete from public.xp_events e
    where e.habit_id = h.id and e.kind = 'weekly_total'
      and e.local_date between v_ws and v_ws + 6
      and (v_reached is null or e.local_date <> v_reached);
    if v_reached is not null then
      perform public.xp_set_event(h.user_id, 'weekly_total', h.id, v_reached, v_base);
    end if;
  end if;
end;
$$;

-- 8. BONUS DE DÍA COMPLETO: todos los hábitos diarios del día hechos (mínimo 3 hábitos).
create or replace function public.reconcile_day_bonus(p_user uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_qualifies boolean;
begin
  select * into s from public.day_stats_range(p_user, p_date, p_date);
  v_qualifies := s.scheduled >= public.game_rule('bonus_min_habits') and s.done = s.scheduled;
  perform public.xp_set_event(p_user, 'day_bonus', null, p_date,
                              case when v_qualifies then public.game_rule('day_bonus') end);
end;
$$;

-- 9. MARCAR PROGRESO (sustituye a la versión de 0003: ahora además concede o retira XP).
--    Devuelve cuánto XP ha cambiado con esta acción (+20 al completar, -20 al desmarcar, 0 si nada).
drop function if exists public.add_habit_progress(uuid, numeric, integer);

create function public.add_habit_progress(
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

  new_total := round(greatest(0, least(max_value, coalesce(current_total, 0) + p_delta)), 2);

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

-- 10. MI PROGRESO: XP, nivel, racha y resumen de hoy, todo de una vez y solo del usuario con sesión.
create or replace function public.get_my_progress()
returns table (
  xp_total integer, level integer, xp_into_level integer, xp_level_size integer,
  current_streak integer, best_streak integer, freezes_left integer,
  today_scheduled integer, today_done integer, today_ok boolean, habits_done integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_xp integer;
  v_level integer;
  v_floor integer;
  v_next integer;
  v_done integer;
  s record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select p.timezone into v_tz from public.profiles p where p.id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'Europe/Madrid'))::date;

  select coalesce(sum(e.amount), 0)::integer into v_xp from public.xp_events e where e.user_id = v_uid;
  v_level := public.level_for_xp(v_xp);
  v_floor := 25 * (v_level - 1) * (v_level + 2); -- XP con la que se llegó a este nivel
  v_next := 25 * v_level * (v_level + 3);        -- XP necesaria para el siguiente

  select * into s from public.compute_streaks(v_uid, v_today);

  select (
    (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
      where l.user_id = v_uid and h.frequency_type <> 'weekly_total'
        and l.value >= coalesce(h.target_value, 1))
    + (select count(*) from public.xp_events e where e.user_id = v_uid and e.kind = 'weekly_total')
  )::integer into v_done;

  return query select v_xp, v_level, v_xp - v_floor, v_next - v_floor,
    s.current_streak, s.best_streak, s.freezes_left, s.today_scheduled, s.today_done, s.today_ok, v_done;
end;
$$;

-- 11. PERMISOS. Las funciones internas no las puede llamar nadie desde el navegador.
revoke all on function public.game_rule(text) from public, anon, authenticated;
revoke all on function public.xp_for_difficulty(text) from public, anon, authenticated;
revoke all on function public.level_for_xp(integer) from public, anon, authenticated;
revoke all on function public.day_stats_range(uuid, date, date) from public, anon, authenticated;
revoke all on function public.compute_streaks(uuid, date) from public, anon, authenticated;
revoke all on function public.xp_set_event(uuid, text, uuid, date, integer) from public, anon, authenticated;
revoke all on function public.reconcile_habit_xp(uuid, date) from public, anon, authenticated;
revoke all on function public.reconcile_day_bonus(uuid, date) from public, anon, authenticated;

-- Las dos que usa la app: solo con sesión iniciada.
revoke all on function public.add_habit_progress(uuid, numeric, integer) from public, anon;
grant execute on function public.add_habit_progress(uuid, numeric, integer) to authenticated;
revoke all on function public.get_my_progress() from public, anon;
grant execute on function public.get_my_progress() to authenticated;

-- 12. Si ya habías marcado hábitos antes de esta migración, se les calcula el XP que les toca.
--     (Se puede repetir sin problema: no duplica nada.)
do $$
declare
  r record;
begin
  for r in
    select distinct l.habit_id, l.user_id, l.local_date
    from public.habit_logs l
    order by l.local_date
  loop
    perform public.reconcile_habit_xp(r.habit_id, r.local_date);
    perform public.reconcile_day_bonus(r.user_id, r.local_date);
  end loop;
end;
$$;
