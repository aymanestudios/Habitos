-- 0026_team_challenges.sql
-- RETOS EN EQUIPO: dos amigos SUMAN sus aportaciones para llegar a una meta común
-- (20 km entre los dos, 50 páginas, 300 minutos de estudio...). Sustituyen a los retos relámpago.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0025. No borra nada.
--
-- Decisiones (docs/RETOS.md):
--   * No es un sistema nuevo: se amplía la tabla challenges. Los retos relámpago que ya existen siguen
--     funcionando y quedan en el historial; ya no se pueden crear nuevos.
--   * Invitación → el amigo acepta o rechaza → empieza (dura 1-14 días desde que se acepta).
--   * Cumplido = entre los dos llegáis a la meta Y cada uno aporta al menos el 20 % (min_share).
--     (min_share + mode dejan preparada la modalidad "mínimo individual" para más adelante.)
--   * XP al cumplirse: 20 (1 día), 35 (2-4 días) o 50 (5+ días) para cada uno. Va APARTE del tope
--     diario de 150 de los hábitos, pero solo se premian 2 retos por persona y semana.
--   * Todo pasa por funciones del servidor, con la fila del reto BLOQUEADA (for update): dos personas
--     aportando a la vez no pueden duplicar el cierre ni el XP (además hay una clave única).
--   * Nadie puede registrar progreso por otro, ni negativo, ni cantidades absurdas, ni fuera de fecha.

-- 1. TABLA challenges: columnas nuevas ----------------------------------------------------------
alter table public.challenges
  add column if not exists status text not null default 'active',
  add column if not exists goal numeric(12, 2),
  add column if not exists title text,
  add column if not exists unit text,
  add column if not exists mode text not null default 'shared',
  add column if not exists min_share integer not null default 20,
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.challenges drop constraint if exists challenges_kind_values;
alter table public.challenges drop constraint if exists challenges_target_range;
alter table public.challenges drop constraint if exists challenges_status_values;
alter table public.challenges drop constraint if exists challenges_mode_values;
alter table public.challenges drop constraint if exists challenges_min_share_range;
alter table public.challenges drop constraint if exists challenges_team_shape;
alter table public.challenges
  add constraint challenges_kind_values check (kind in (
    'xp', 'habits', 'category', 'days',                                         -- relámpago (antiguos)
    'distance', 'pages', 'minutes', 'sessions', 'team_habits', 'custom')),      -- en equipo
  add constraint challenges_target_range check (
    (kind = 'xp' and target between 50 and 2000)
    or (kind in ('habits', 'category') and target between 1 and 100)
    or (kind = 'days' and target between 1 and 14)
    or (kind in ('distance', 'pages', 'minutes', 'sessions', 'team_habits', 'custom') and target between 1 and 100000)),
  add constraint challenges_status_values check (status in ('pending', 'active', 'completed', 'declined', 'cancelled', 'expired')),
  add constraint challenges_mode_values check (mode in ('shared', 'min_each')),
  add constraint challenges_min_share_range check (min_share between 0 and 50),
  add constraint challenges_team_shape check (
    kind in ('xp', 'habits', 'category', 'days')
    or (goal is not null and goal > 0 and unit is not null and char_length(unit) between 1 and 12
        and (title is null or char_length(title) between 1 and 40)));

create index if not exists challenges_status_idx on public.challenges (status) where status in ('pending', 'active');

-- 2. APORTACIONES: quién, cuánto y cuándo (solo para los tipos manuales) ------------------------
create table if not exists public.challenge_contributions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  constraint contributions_amount_range check (amount > 0 and amount <= 1000)
);
create index if not exists contributions_challenge_idx on public.challenge_contributions (challenge_id, user_id, local_date);
alter table public.challenge_contributions enable row level security;
drop policy if exists "contributions: ver las de mis retos" on public.challenge_contributions;
create policy "contributions: ver las de mis retos"
  on public.challenge_contributions for select to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = challenge_id and (select auth.uid()) in (c.creator_id, c.partner_id)));
revoke all on public.challenge_contributions from anon, authenticated;
grant select on public.challenge_contributions to authenticated; -- escribir: solo con las funciones

-- 3. XP DE LOS RETOS: un evento por persona y reto (clave única) -------------------------------
alter table public.xp_events add column if not exists challenge_id uuid references public.challenges (id) on delete set null;
alter table public.xp_events drop constraint if exists xp_events_kind_values;
alter table public.xp_events drop constraint if exists xp_events_habit_shape;
alter table public.xp_events
  add constraint xp_events_kind_values check (kind in ('habit', 'weekly_total', 'day_bonus', 'team_challenge')),
  add constraint xp_events_habit_shape check ((kind in ('day_bonus', 'team_challenge')) = (habit_id is null));
create unique index if not exists xp_events_team_key on public.xp_events (user_id, challenge_id) where kind = 'team_challenge';

-- El tope diario de 150 es de los HÁBITOS: el XP de un reto no lo gasta (misma función de 0004, una línea más)
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
  where e.user_id = p_user and e.local_date = p_date and e.kind <> 'team_challenge';

  insert into public.xp_events (user_id, kind, habit_id, local_date, amount)
  values (p_user, p_kind, p_habit, p_date, least(p_base, v_room))
  on conflict do nothing;
end;
$$;
revoke all on function public.xp_set_event(uuid, text, uuid, date, integer) from public, anon, authenticated;

-- 4. REGLAS DE CADA TIPO (un solo sitio para ajustar números) -----------------------------------
--    min_goal / max_goal: meta permitida. max_entry: máximo por aportación. max_day: máximo por persona y día.
create or replace function public.team_rule(p_kind text)
returns table (unit text, min_goal numeric, max_goal numeric, max_entry numeric, max_day numeric, whole boolean)
language sql
immutable
set search_path = ''
as $$
  select r.unit, r.min_goal, r.max_goal, r.max_entry, r.max_day, r.whole from (values
    ('distance', 'km', 2::numeric, 500::numeric, 60::numeric, 100::numeric, false),
    ('pages', 'páginas', 10, 5000, 300, 600, true),
    ('minutes', 'min', 15, 10000, 300, 720, true),
    ('sessions', 'sesiones', 2, 60, 3, 4, true),
    ('team_habits', 'hábitos', 4, 200, 0, 0, true),
    ('custom', null::text, 1, 100000, 1000, 2000, false)
  ) r(kind, unit, min_goal, max_goal, max_entry, max_day, whole)
  where r.kind = p_kind;
$$;
revoke all on function public.team_rule(text) from public, anon, authenticated;

create or replace function public.is_team_kind(p_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$ select p_kind in ('distance', 'pages', 'minutes', 'sessions', 'team_habits', 'custom') $$;
revoke all on function public.is_team_kind(text) from public, anon, authenticated;

-- XP por duración (decisión del 19/11/2026: 20 / 35 / 50)
create or replace function public.team_xp_for(p_days integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select case when p_days <= 1 then 20 when p_days <= 4 then 35 else 50 end $$;
revoke all on function public.team_xp_for(integer) from public, anon, authenticated;

-- 5. TOTALES de un reto en equipo (cuánto lleva cada uno). Interna.
--    team_habits: hábitos completados de cada uno entre las fechas del reto (automático, no se apunta a mano).
create or replace function public.team_totals(p_challenge uuid)
returns table (creator_total numeric, partner_total numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c record;
begin
  select * into c from public.challenges x where x.id = p_challenge;
  if c.id is null then
    return;
  end if;
  if c.kind = 'team_habits' then
    if c.status = 'pending' then
      return query select 0::numeric, 0::numeric;
      return;
    end if;
    return query select
      (select count(*)::numeric from public.habit_logs l join public.habits h on h.id = l.habit_id
       where h.user_id = c.creator_id and l.local_date between c.start_date and c.end_date
         and l.value >= coalesce(h.target_value, 1)),
      (select count(*)::numeric from public.habit_logs l join public.habits h on h.id = l.habit_id
       where h.user_id = c.partner_id and l.local_date between c.start_date and c.end_date
         and l.value >= coalesce(h.target_value, 1));
    return;
  end if;
  return query select
    coalesce((select sum(k.amount) from public.challenge_contributions k where k.challenge_id = c.id and k.user_id = c.creator_id), 0),
    coalesce((select sum(k.amount) from public.challenge_contributions k where k.challenge_id = c.id and k.user_id = c.partner_id), 0);
end;
$$;
revoke all on function public.team_totals(uuid) from public, anon, authenticated;

-- ¿Llega a la meta? Entre los dos ≥ meta y cada uno ≥ min_share % (en "min_each", cada uno ≥ su mitad).
create or replace function public.team_goal_reached(p_goal numeric, p_mode text, p_min_share integer, p_a numeric, p_b numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_mode = 'min_each' then p_a >= p_goal / 2 and p_b >= p_goal / 2
    else p_a + p_b >= p_goal
         and p_a >= p_goal * p_min_share / 100.0
         and p_b >= p_goal * p_min_share / 100.0
  end
$$;
revoke all on function public.team_goal_reached(numeric, text, integer, numeric, numeric) from public, anon, authenticated;

-- 6. CERRAR un reto cuando toca (cumplido o caducado). Idempotente: llamarlo dos veces no hace nada más.
--    Bloquea la fila: si los dos aportan a la vez, el segundo espera y ya lo ve cerrado.
create or replace function public.team_settle(p_challenge uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c record;
  t record;
  u uuid;
  v_day date;
  v_amount integer;
  v_days integer;
begin
  select * into c from public.challenges x where x.id = p_challenge for update;
  if c.id is null or not public.is_team_kind(c.kind) then
    return null;
  end if;

  if c.status = 'pending' then
    -- Las invitaciones sin respuesta caducan a los 3 días
    if c.created_at < now() - interval '3 days' then
      update public.challenges set status = 'expired', closed_at = now() where id = c.id;
      return 'expired';
    end if;
    return 'pending';
  end if;
  if c.status <> 'active' then
    return c.status;
  end if;

  select * into t from public.team_totals(c.id);
  if public.team_goal_reached(c.goal, c.mode, c.min_share, t.creator_total, t.partner_total) then
    update public.challenges set status = 'completed', completed_at = now(), closed_at = now() where id = c.id;
    v_days := c.end_date - c.start_date + 1;
    -- XP para los dos (máx. 2 retos premiados por persona y semana). La clave única impide repetir.
    foreach u in array array[c.creator_id, c.partner_id] loop
      v_day := public.user_today(u);
      select case when count(*) >= 2 then 0 else public.team_xp_for(v_days) end into v_amount
      from public.xp_events e
      where e.user_id = u and e.kind = 'team_challenge' and e.amount > 0
        and e.local_date >= date_trunc('week', v_day)::date and e.local_date < date_trunc('week', v_day)::date + 7;
      insert into public.xp_events (user_id, kind, habit_id, challenge_id, local_date, amount)
      values (u, 'team_challenge', null, c.id, v_day, v_amount)
      on conflict do nothing;
    end loop;
    return 'completed';
  end if;

  -- Caduca cuando el último día ha terminado para LOS DOS (cada uno en su zona horaria)
  if least(public.user_today(c.creator_id), public.user_today(c.partner_id)) > c.end_date then
    update public.challenges set status = 'expired', closed_at = now() where id = c.id;
    return 'expired';
  end if;
  return 'active';
end;
$$;
revoke all on function public.team_settle(uuid) from public, anon, authenticated;

-- 7. CREAR (invitar a un amigo) -----------------------------------------------------------------
create or replace function public.create_team_challenge(
  p_friend uuid, p_kind text, p_goal numeric, p_days integer, p_title text, p_unit text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r record;
  v_today date;
  v_unit text;
  v_title text;
  v_goal numeric;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_friend is null or p_friend = uid or not public.are_friends(uid, p_friend) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  select * into r from public.team_rule(p_kind);
  if r.min_goal is null then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_days is null or p_days < 1 or p_days > 14 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  v_goal := case when r.whole then round(p_goal) else round(p_goal, 1) end;
  if v_goal is null or v_goal < r.min_goal or v_goal > r.max_goal then
    raise exception 'invalid_goal' using errcode = '22023';
  end if;
  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_unit := coalesce(r.unit, nullif(btrim(coalesce(p_unit, '')), ''));
  if p_kind = 'custom' and (v_title is null or v_unit is null) then
    raise exception 'custom_needs_title' using errcode = '22023';
  end if;
  if char_length(coalesce(v_title, '')) > 40 or char_length(v_unit) > 12 then
    raise exception 'text_too_long' using errcode = '22023';
  end if;

  -- Contra el "farmeo": un reto vivo (pendiente o en marcha) por pareja y como mucho 3 por persona
  perform public.team_settle(c.id) from public.challenges c
  where c.status in ('pending', 'active') and uid in (c.creator_id, c.partner_id);
  if exists (select 1 from public.challenges c
             where c.status in ('pending', 'active') and public.is_team_kind(c.kind)
               and least(c.creator_id, c.partner_id) = least(uid, p_friend)
               and greatest(c.creator_id, c.partner_id) = greatest(uid, p_friend)) then
    raise exception 'already_exists' using errcode = '23505';
  end if;
  if (select count(*) from public.challenges c
      where c.status in ('pending', 'active') and public.is_team_kind(c.kind)
        and uid in (c.creator_id, c.partner_id)) >= 3 then
    raise exception 'too_many' using errcode = '23505';
  end if;

  v_today := public.user_today(uid);
  insert into public.challenges (creator_id, partner_id, kind, target, goal, title, unit, status,
                                 start_date, end_date, week_start, target_xp)
  values (uid, p_friend, p_kind, greatest(1, ceil(v_goal))::integer, v_goal, v_title, v_unit, 'pending',
          v_today, v_today + p_days - 1, date_trunc('week', v_today)::date, null)
  returning id into v_id;
  return v_id;
end;
$$;

-- 8. RESPONDER a una invitación (solo el invitado). Al aceptar, el reto empieza HOY para quien acepta.
create or replace function public.respond_team_challenge(p_id uuid, p_accept boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c record;
  v_today date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if public.team_settle(p_id) is distinct from 'pending' then
    raise exception 'challenge_not_pending' using errcode = 'P0002';
  end if;
  select * into c from public.challenges x where x.id = p_id for update;
  if c.partner_id <> uid then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if not p_accept then
    update public.challenges set status = 'declined', closed_at = now() where id = c.id;
    return 'declined';
  end if;
  if not public.are_friends(c.creator_id, c.partner_id) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  v_today := public.user_today(uid);
  update public.challenges
  set status = 'active', accepted_at = now(),
      start_date = v_today, end_date = v_today + (c.end_date - c.start_date),
      week_start = date_trunc('week', v_today)::date
  where id = c.id;
  return 'active';
end;
$$;

-- 9. APORTAR progreso (solo lo tuyo, solo en retos en marcha, dentro de sus fechas)
create or replace function public.add_team_contribution(p_id uuid, p_amount numeric)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c record;
  r record;
  v_today date;
  v_amount numeric;
  v_day_total numeric;
  v_mine numeric;
  v_status text;
  t record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_status := public.team_settle(p_id); -- también bloquea la fila hasta el final de la operación
  select * into c from public.challenges x where x.id = p_id for update;
  if c.id is null or uid not in (c.creator_id, c.partner_id) then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'active' then
    raise exception 'challenge_closed' using errcode = '22023';
  end if;
  if not public.are_friends(c.creator_id, c.partner_id) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  select * into r from public.team_rule(c.kind);
  if r.max_entry is null or r.max_entry = 0 then
    raise exception 'automatic_challenge' using errcode = '22023'; -- los de hábitos cuentan solos
  end if;
  v_today := public.user_today(uid);
  if v_today < c.start_date or v_today > c.end_date then
    raise exception 'challenge_closed' using errcode = '22023';
  end if;
  v_amount := case when r.whole then round(p_amount) else round(p_amount, 1) end;
  if v_amount is null or v_amount <= 0 or v_amount > r.max_entry then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  select coalesce(sum(k.amount), 0) into v_day_total from public.challenge_contributions k
  where k.challenge_id = c.id and k.user_id = uid and k.local_date = v_today;
  if v_day_total + v_amount > r.max_day then
    raise exception 'day_limit' using errcode = '22023';
  end if;
  select coalesce(sum(k.amount), 0) into v_mine from public.challenge_contributions k
  where k.challenge_id = c.id and k.user_id = uid;
  if v_mine + v_amount > c.goal then
    raise exception 'over_goal' using errcode = '22023'; -- nadie puede aportar más que la meta entera
  end if;

  insert into public.challenge_contributions (challenge_id, user_id, amount, local_date)
  values (c.id, uid, v_amount, v_today);

  v_status := public.team_settle(c.id);
  select * into t from public.team_totals(c.id);
  return jsonb_build_object(
    'status', v_status,
    'mine', case when uid = c.creator_id then t.creator_total else t.partner_total end,
    'partner', case when uid = c.creator_id then t.partner_total else t.creator_total end,
    'xp', coalesce((select e.amount from public.xp_events e
                    where e.kind = 'team_challenge' and e.challenge_id = c.id and e.user_id = uid), 0));
end;
$$;

-- 10. DESHACER una aportación tuya (por si te equivocas): 15 minutos y solo si el reto sigue en marcha
create or replace function public.remove_team_contribution(p_contribution uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  k record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into k from public.challenge_contributions x where x.id = p_contribution and x.user_id = uid;
  if k.id is null then
    raise exception 'contribution_not_found' using errcode = 'P0002';
  end if;
  perform 1 from public.challenges c where c.id = k.challenge_id and c.status = 'active' for update;
  if not found or k.created_at < now() - interval '15 minutes' then
    raise exception 'too_late' using errcode = '22023';
  end if;
  delete from public.challenge_contributions where id = k.id;
end;
$$;

-- 11. CANCELAR / SALIR. Retos en equipo: no se borran, quedan como "cancelado" (sin premio).
--     Relámpago antiguos: igual que antes (se borran si están en marcha).
create or replace function public.cancel_challenge(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into c from public.challenges x where x.id = p_id and uid in (x.creator_id, x.partner_id);
  if c.id is null then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
  if public.is_team_kind(c.kind) then
    if public.team_settle(c.id) not in ('pending', 'active') then
      raise exception 'challenge_closed' using errcode = '22023';
    end if;
    update public.challenges set status = 'cancelled', closed_at = now()
    where id = c.id and status in ('pending', 'active');
    return;
  end if;
  delete from public.challenges x
  where x.id = p_id and uid in (x.creator_id, x.partner_id) and x.end_date >= public.user_today(uid);
  if not found then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 12. MIS RETOS EN EQUIPO: invitaciones, en marcha e historial (30 días). Cierra lo que toque antes.
create or replace function public.get_my_team_challenges()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  for v_id in select c.id from public.challenges c
              where c.status in ('pending', 'active') and public.is_team_kind(c.kind) and uid in (c.creator_id, c.partner_id)
  loop
    perform public.team_settle(v_id);
  end loop;

  return coalesce((
    select jsonb_agg(x.item order by x.rank, x.sort_at desc)
    from (
      select
        case c.status when 'pending' then 0 when 'active' then 1 else 2 end as rank,
        coalesce(c.closed_at, c.accepted_at, c.created_at) as sort_at,
        jsonb_build_object(
          'id', c.id, 'kind', c.kind, 'title', c.title, 'unit', c.unit, 'goal', c.goal,
          'mode', c.mode, 'min_share', c.min_share, 'status', c.status,
          'start_date', c.start_date, 'end_date', c.end_date, 'days', c.end_date - c.start_date + 1,
          'created_by_me', c.creator_id = uid, 'created_at', c.created_at, 'completed_at', c.completed_at,
          'today', public.user_today(uid),
          'partner', jsonb_build_object('id', pp.id, 'name', pp.display_name,
                                        'avatar_path', pp.avatar_path, 'avatar_color', pp.avatar_color),
          'mine', case when c.creator_id = uid then t.creator_total else t.partner_total end,
          'theirs', case when c.creator_id = uid then t.partner_total else t.creator_total end,
          'xp', (select e.amount from public.xp_events e
                 where e.kind = 'team_challenge' and e.challenge_id = c.id and e.user_id = uid),
          'xp_reward', public.team_xp_for(c.end_date - c.start_date + 1),
          'still_friends', public.are_friends(c.creator_id, c.partner_id),
          -- Lo último que ha aportado cada uno (para "¡Tu compañero acaba de sumar 3 km!" y para deshacer lo tuyo)
          'recent', coalesce((
            select jsonb_agg(jsonb_build_object('id', k.id, 'mine', k.user_id = uid, 'amount', k.amount,
                                                'at', k.created_at, 'date', k.local_date) order by k.created_at desc)
            from (select * from public.challenge_contributions k0
                  where k0.challenge_id = c.id order by k0.created_at desc limit 8) k), '[]'::jsonb)
        ) as item
      from public.challenges c
      join public.profiles pp on pp.id = case when c.creator_id = uid then c.partner_id else c.creator_id end
      cross join lateral public.team_totals(c.id) t
      where uid in (c.creator_id, c.partner_id) and public.is_team_kind(c.kind)
        and (c.status in ('pending', 'active') or coalesce(c.closed_at, c.created_at) > now() - interval '30 days')
        -- un rechazo o una invitación caducada solo le importan a quien invitó
        and not (c.status in ('declined', 'expired') and c.accepted_at is null and c.partner_id = uid)
      order by 1, 2 desc
      limit 40
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 13. DÚO: cuántos retos habéis cumplido tú y un amigo (también los relámpago). No depende de seguir siendo amigos.
create or replace function public.get_duo(p_friend uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object('completed', (
    select count(*) from public.challenges c
    where least(c.creator_id, c.partner_id) = least(uid, p_friend)
      and greatest(c.creator_id, c.partner_id) = greatest(uid, p_friend)
      and (c.status = 'completed'
           or (not public.is_team_kind(c.kind) and (select v.done from public.challenge_values(c.id) v)))
  ));
end;
$$;

-- 14. challenge_values (relámpago, 0018) entiende los nuevos: cumplido = estado "completed".
--     Así la insignia "Trabajo en equipo", los avisos y get_reward_metrics cuentan los dos tipos.
create or replace function public.challenge_values(p_challenge uuid)
returns table (creator_value integer, partner_value integer, done boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c record;
  v_a integer;
  v_b integer;
  t record;
begin
  select * into c from public.challenges x where x.id = p_challenge;
  if c.id is null then
    return;
  end if;

  if public.is_team_kind(c.kind) then
    select * into t from public.team_totals(c.id);
    return query select floor(t.creator_total)::integer, floor(t.partner_total)::integer, c.status = 'completed';
    return;
  end if;

  if c.kind = 'xp' then
    select coalesce(sum(e.amount), 0) into v_a from public.xp_events e
    where e.user_id = c.creator_id and e.local_date between c.start_date and c.end_date and e.kind <> 'team_challenge';
    select coalesce(sum(e.amount), 0) into v_b from public.xp_events e
    where e.user_id = c.partner_id and e.local_date between c.start_date and c.end_date and e.kind <> 'team_challenge';
  elsif c.kind in ('habits', 'category') then
    select count(*) into v_a from public.habit_logs l join public.habits h on h.id = l.habit_id
    where h.user_id = c.creator_id and l.local_date between c.start_date and c.end_date
      and l.value >= coalesce(h.target_value, 1) and (c.kind = 'habits' or h.category = c.category);
    select count(*) into v_b from public.habit_logs l join public.habits h on h.id = l.habit_id
    where h.user_id = c.partner_id and l.local_date between c.start_date and c.end_date
      and l.value >= coalesce(h.target_value, 1) and (c.kind = 'habits' or h.category = c.category);
  else -- days
    select count(*) into v_a from public.day_stats_range(c.creator_id, c.start_date, c.end_date) d
    where public.day_state(d.scheduled, d.done) = 'ok';
    select count(*) into v_b from public.day_stats_range(c.partner_id, c.start_date, c.end_date) d
    where public.day_state(d.scheduled, d.done) = 'ok';
  end if;

  return query select v_a, v_b,
    case when c.kind = 'days' then v_a >= c.target and v_b >= c.target else v_a + v_b >= c.target end;
end;
$$;
revoke all on function public.challenge_values(uuid) from public, anon, authenticated;

-- 15. Los retos relámpago ya no se crean (la app ya no los ofrece; esto protege versiones viejas en caché)
create or replace function public.create_flash_challenge(
  p_friend uuid, p_kind text, p_target integer, p_days integer, p_category text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  raise exception 'use_team_challenges' using errcode = '0A000';
end;
$$;
create or replace function public.create_challenge(p_friend uuid, p_target integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  raise exception 'use_team_challenges' using errcode = '0A000';
end;
$$;

-- 16. LO CONSEGUIDO NO SE PIERDE ---------------------------------------------------------------
-- Si se borra un reto (cuenta borrada o relámpago cancelado), antes se guarda el récord de retos cumplidos.
create or replace function public.challenges_keep_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
begin
  begin
    foreach u in array array[old.creator_id, old.partner_id] loop
      perform public.save_metric_peak(u, 'challenges_won', (
        select count(*)::integer from public.challenges c
        where u in (c.creator_id, c.partner_id) and (select v.done from public.challenge_values(c.id) v)));
    end loop;
  exception when others then
    null; -- nunca debe impedir borrar una cuenta
  end;
  return old;
end;
$$;
revoke all on function public.challenges_keep_count() from public, anon, authenticated;
drop trigger if exists challenges_keep_count on public.challenges;
create trigger challenges_keep_count
  before delete on public.challenges
  for each row execute function public.challenges_keep_count();

-- Si dos amigos dejan de serlo, sus retos en marcha o pendientes se cancelan (sin premio).
-- Los ya cumplidos se quedan: cuentan para los logros y para el "dúo".
create or replace function public.friendships_cancel_team_challenges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'accepted' then
    update public.challenges c set status = 'cancelled', closed_at = now()
    where c.status in ('pending', 'active') and public.is_team_kind(c.kind)
      and least(c.creator_id, c.partner_id) = least(old.requester_id, old.addressee_id)
      and greatest(c.creator_id, c.partner_id) = greatest(old.requester_id, old.addressee_id);
  end if;
  return old;
end;
$$;
revoke all on function public.friendships_cancel_team_challenges() from public, anon, authenticated;
drop trigger if exists friendships_cancel_team_challenges on public.friendships;
create trigger friendships_cancel_team_challenges
  after delete on public.friendships
  for each row execute function public.friendships_cancel_team_challenges();

-- 17. LOGROS DE EQUIPO (mismo catálogo y misma métrica que "Trabajo en equipo": cuentan todos los retos cumplidos)
insert into public.reward_catalog (id, kind, rarity, title, description, metric, threshold, sort) values
  ('badge_team5', 'badge', 'common', 'Compañeros de aventura', 'Cumple 5 retos en equipo', 'challenges_won', 5, 64),
  ('badge_team10', 'badge', 'special', 'Dúo imparable', 'Cumple 10 retos en equipo', 'challenges_won', 10, 65),
  ('badge_team20', 'badge', 'special', 'Espíritu de equipo', 'Cumple 20 retos en equipo', 'challenges_won', 20, 66),
  ('badge_team50', 'badge', 'epic', 'Equipo legendario', 'Cumple 50 retos en equipo', 'challenges_won', 50, 67),
  ('badge_team100', 'badge', 'legendary', 'Inseparables', 'Cumple 100 retos en equipo', 'challenges_won', 100, 68)
on conflict (id) do nothing;

-- 18. AVISOS (challenge_pings): nuevo tipo "aceptado"
alter table public.challenge_pings drop constraint if exists challenge_pings_kind_check;
alter table public.challenge_pings add constraint challenge_pings_kind_check
  check (kind in ('started', 'accepted', 'last_day', 'done'));

-- Texto corto de un reto en equipo ("20 km entre los dos", "Leer · 50 páginas")
create or replace function public.team_label(p_challenge uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.title || ' · ', '')
         || trim(trailing '.' from trim(trailing '0' from c.goal::text)) || ' ' || c.unit || ' entre los dos'
  from public.challenges c where c.id = p_challenge;
$$;
revoke all on function public.team_label(uuid) from public, anon, authenticated;

-- 19. AVISOS PUSH: mismo contenido que 0021 + retos en equipo (invitación, aceptado, cumplido, último día).
--     Lo envía la misma Edge Function (send-reminders): no hay que redesplegarla.
create or replace function public.claim_push_queue()
returns table (tag text, title text, body text, url text, endpoint text, p256dh text, auth text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
  v_today date;
  v_state text;
  c record;
  v_partner_name text;
  v_hour integer;
begin
  -- a) Recordatorios (igual que claim_due_reminders)
  return query
  with due as (
    update public.reminders rm
    set pushed_for = rm.due_at
    where rm.due_at <= now()
      and rm.due_at > now() - interval '24 hours'
      and rm.done_at is null
      and rm.pushed_for is distinct from rm.due_at
    returning rm.id, rm.user_id, rm.title, rm.note
  )
  select 'reminder-' || d.id::text, d.title, coalesce(d.note, 'Es la hora de tu recordatorio.'), '/recordatorios',
         s.endpoint, s.p256dh, s.auth
  from due d join public.push_subscriptions s on s.user_id = d.user_id;

  -- b) Toques de amigos (los de las últimas 2 h que aún no han salido)
  return query
  with sent as (
    update public.streak_nudges n
    set sent_at = now()
    where n.sent_at is null and n.created_at > now() - interval '2 hours'
    returning n.id, n.from_user, n.to_user
  )
  select 'nudge-' || x.id::text,
         '🔥 ' || p.display_name || ' te da un toque',
         'Os quiere ver a los dos con el día hecho. ¡Vamos juntos!',
         '/',
         s.endpoint, s.p256dh, s.auth
  from sent x
  join public.profiles p on p.id = x.from_user
  join public.push_subscriptions s on s.user_id = x.to_user;

  -- c) Racha en peligro: a partir de las 20:00 de cada uno, una comprobación al día por persona y racha
  for r in
    select st.id, st.user_a, st.user_b, st.started_on, u.uid2, pr.timezone
    from public.shared_streaks st
    cross join lateral (values (st.user_a), (st.user_b)) as u(uid2)
    join public.profiles pr on pr.id = u.uid2
    where extract(hour from now() at time zone coalesce(pr.timezone, 'Europe/Madrid')) >= 20
      and not exists (
        select 1 from public.streak_warnings w
        where w.streak_id = st.id and w.user_id = u.uid2
          and w.local_date = (now() at time zone coalesce(pr.timezone, 'Europe/Madrid'))::date)
  loop
    v_today := (now() at time zone coalesce(r.timezone, 'Europe/Madrid'))::date;
    insert into public.streak_warnings (streak_id, user_id, local_date) values (r.id, r.uid2, v_today)
    on conflict do nothing;

    if not public.are_friends(r.user_a, r.user_b) then
      continue;
    end if;
    select public.day_state(d.scheduled, d.done) into v_state
    from public.day_stats_range(r.uid2, v_today, v_today) d;
    if v_state <> 'miss' then
      continue; -- ya ha cumplido (o hoy no tiene hábitos)
    end if;
    select * into c from public.compute_shared_streak(r.user_a, r.user_b, r.started_on, v_today);
    if c.current_streak = 0 or c.today_counted then
      continue; -- no hay racha que perder
    end if;

    update public.streak_warnings w set sent = true
    where w.streak_id = r.id and w.user_id = r.uid2 and w.local_date = v_today;
    select p.display_name into v_partner_name
    from public.profiles p where p.id = case when r.uid2 = r.user_a then r.user_b else r.user_a end;

    return query
    select 'warning-' || r.id::text,
           '🔥 Vuestra racha con ' || v_partner_name || ' sigue viva',
           'Lleváis ' || c.current_streak || case when c.current_streak = 1 then ' día' else ' días' end
             || '. Si te apetece, aún estás a tiempo hoy.',
           '/',
           s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s where s.user_id = r.uid2;
  end loop;

  -- d) Buenos días: de 9:00 a 11:59 (hora de cada uno), una vez al día, si hoy hay hábitos y aún no ha hecho ninguno
  for r in
    select pr.id, (now() at time zone coalesce(pr.timezone, 'Europe/Madrid'))::date as today
    from public.profiles pr
    where extract(hour from now() at time zone coalesce(pr.timezone, 'Europe/Madrid')) between 9 and 11
      and exists (select 1 from public.push_subscriptions ps where ps.user_id = pr.id)
      and not exists (
        select 1 from public.daily_pings dp
        where dp.user_id = pr.id and dp.local_date = (now() at time zone coalesce(pr.timezone, 'Europe/Madrid'))::date)
  loop
    insert into public.daily_pings (user_id, local_date) values (r.id, r.today) on conflict do nothing;
    select d.scheduled, d.done into c from public.day_stats_range(r.id, r.today, r.today) d;
    if c.scheduled = 0 or c.done > 0 then
      continue; -- día libre o ya ha empezado: no molestamos
    end if;
    return query
    select 'morning-' || r.id::text,
           '☀️ Nuevo día para empezar',
           'Hoy tienes ' || c.scheduled || case when c.scheduled = 1 then ' hábito' else ' hábitos' end
             || '. Empieza por el más fácil.',
           '/',
           s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s where s.user_id = r.id;
  end loop;

  -- e) Retos relámpago (0019). Cada aviso sale UNA vez por persona y reto (challenge_pings).
  --    started: a tu amigo le llega que le has retado.
  --    last_day: último día, de 18:00 a 21:59, si aún no está cumplido. Tono amable.
  --    done: reto cumplido, a los dos.
  for r in
    select ch.id, ch.creator_id, ch.partner_id, ch.kind, ch.category, ch.target, ch.start_date, ch.end_date,
           ch.created_at, ch.status, ch.accepted_at, u.uid2, pr.timezone
    from public.challenges ch
    cross join lateral (values (ch.creator_id), (ch.partner_id)) as u(uid2)
    join public.profiles pr on pr.id = u.uid2
    where ch.end_date >= (now() at time zone coalesce(pr.timezone, 'Europe/Madrid'))::date - 1
      and exists (select 1 from public.push_subscriptions ps where ps.user_id = u.uid2)
      and ch.status in ('pending', 'active', 'completed')
      and (select count(*) from public.challenge_pings cp where cp.challenge_id = ch.id and cp.user_id = u.uid2) < 4
  loop
    if not public.are_friends(r.creator_id, r.partner_id) then
      continue;
    end if;
    v_today := (now() at time zone coalesce(r.timezone, 'Europe/Madrid'))::date;
    v_hour := extract(hour from now() at time zone coalesce(r.timezone, 'Europe/Madrid'))::integer;
    select p.display_name into v_partner_name
    from public.profiles p where p.id = case when r.uid2 = r.creator_id then r.partner_id else r.creator_id end;

    -- Retos en equipo (0026): invitación al amigo y "ha aceptado" a quien invitó
    if public.is_team_kind(r.kind) then
      if r.status = 'pending' then
        if r.uid2 = r.partner_id and r.created_at > now() - interval '2 hours' then
          insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'started')
          on conflict do nothing;
          if found then
            return query
            select 'challenge-' || r.id::text,
                   '🤝 ' || v_partner_name || ' te invita a un reto en equipo',
                   public.team_label(r.id) || ' en ' || (r.end_date - r.start_date + 1)
                     || case when r.end_date = r.start_date then ' día' else ' días' end || '. ¿Os animáis?',
                   '/amigos',
                   s.endpoint, s.p256dh, s.auth
            from public.push_subscriptions s where s.user_id = r.uid2;
          end if;
        end if;
        continue; -- pendiente: nada más que avisar
      end if;
      if r.status = 'active' and r.uid2 = r.creator_id and r.accepted_at > now() - interval '2 hours' then
        insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'accepted')
        on conflict do nothing;
        if found then
          return query
          select 'challenge-' || r.id::text,
                 '🤝 ' || v_partner_name || ' ha aceptado tu reto',
                 public.team_label(r.id) || '. ¡Empieza hoy!',
                 '/amigos',
                 s.endpoint, s.p256dh, s.auth
          from public.push_subscriptions s where s.user_id = r.uid2;
        end if;
      end if;
    end if;

    -- started (relámpago: solo al invitado y solo si es reciente)
    if not public.is_team_kind(r.kind) and r.uid2 = r.partner_id and r.created_at > now() - interval '2 hours' then
      insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'started')
      on conflict do nothing;
      if found then
        return query
        select 'challenge-' || r.id::text,
               '⚡ ' || v_partner_name || ' te propone un reto',
               public.challenge_label(r.kind, r.category, r.target) || ' en '
                 || (r.end_date - r.start_date + 1) || ' días. ¡A por ello juntos!',
               '/amigos',
               s.endpoint, s.p256dh, s.auth
        from public.push_subscriptions s where s.user_id = r.uid2;
      end if;
    end if;

    select * into c from public.challenge_values(r.id);

    if c.done then
      insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'done')
      on conflict do nothing;
      if found then
        return query
        select 'challenge-' || r.id::text,
               '🎉 ¡Reto cumplido con ' || v_partner_name || '!',
               case when public.is_team_kind(r.kind) then public.team_label(r.id)
                    else public.challenge_label(r.kind, r.category, r.target) end || '. Buen trabajo en equipo.',
               '/amigos',
               s.endpoint, s.p256dh, s.auth
        from public.push_subscriptions s where s.user_id = r.uid2;
      end if;
    elsif r.status = 'active' and r.end_date = v_today and v_hour between 18 and 21 and r.end_date > r.start_date then
      insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'last_day')
      on conflict do nothing;
      if found then
        return query
        select 'challenge-' || r.id::text,
               '⚡ Último día del reto con ' || v_partner_name,
               case when public.is_team_kind(r.kind) then public.team_label(r.id)
                    else public.challenge_label(r.kind, r.category, r.target) end || '. Si os apetece, aún estáis a tiempo.',
               '/amigos',
               s.endpoint, s.p256dh, s.auth
        from public.push_subscriptions s where s.user_id = r.uid2;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.claim_push_queue() from public, anon, authenticated;
grant execute on function public.claim_push_queue() to service_role;

-- 20. PERMISOS ----------------------------------------------------------------------------------
revoke all on function public.create_team_challenge(uuid, text, numeric, integer, text, text) from public, anon;
revoke all on function public.respond_team_challenge(uuid, boolean) from public, anon;
revoke all on function public.add_team_contribution(uuid, numeric) from public, anon;
revoke all on function public.remove_team_contribution(uuid) from public, anon;
revoke all on function public.cancel_challenge(uuid) from public, anon;
revoke all on function public.get_my_team_challenges() from public, anon;
revoke all on function public.get_duo(uuid) from public, anon;
grant execute on function public.create_team_challenge(uuid, text, numeric, integer, text, text) to authenticated;
grant execute on function public.respond_team_challenge(uuid, boolean) to authenticated;
grant execute on function public.add_team_contribution(uuid, numeric) to authenticated;
grant execute on function public.remove_team_contribution(uuid) to authenticated;
grant execute on function public.cancel_challenge(uuid) to authenticated;
grant execute on function public.get_my_team_challenges() to authenticated;
grant execute on function public.get_duo(uuid) to authenticated;
