-- 0018_flash_challenges.sql
-- Retos relámpago: los retos que ya existían (XP juntos en una semana) ahora tienen TIPOS y DURACIÓN.
-- No es un sistema nuevo: se amplía la tabla challenges (los retos antiguos siguen igual, como tipo "xp").
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0017.
--
-- Tipos (cada uno participa con SUS hábitos):
--   xp        sumar X XP entre los dos
--   habits    completar X hábitos entre los dos
--   category  completar X hábitos de una categoría entre los dos (p. ej. 4 de Deporte)
--   days      CADA UNO cumple su día (70 %) X días
-- Duración: 3 o 7 días desde hoy. Un reto activo por pareja a la vez. El progreso se CALCULA (no se guarda).

-- 1. Columnas nuevas (los retos antiguos se rellenan: tipo xp, de lunes a domingo)
alter table public.challenges
  add column kind text not null default 'xp',
  add column category text,
  add column target integer,
  add column start_date date,
  add column end_date date;

update public.challenges set target = target_xp, start_date = week_start, end_date = week_start + 6;

alter table public.challenges
  alter column target set not null,
  alter column start_date set not null,
  alter column end_date set not null,
  alter column week_start drop not null,
  alter column target_xp drop not null;

-- Las reglas antiguas (solo semanas de lunes, solo XP, uno por semana) pasan a las del reto nuevo
alter table public.challenges drop constraint challenges_target_range;
alter table public.challenges drop constraint challenges_week_is_monday;
drop index public.challenges_pair_week_key;

alter table public.challenges
  add constraint challenges_kind_values check (kind in ('xp', 'habits', 'category', 'days')),
  add constraint challenges_dates check (end_date >= start_date and end_date - start_date <= 13),
  add constraint challenges_category_needed check (
    (kind = 'category') = (category is not null)
    and (category is null or category in ('health', 'sport', 'study', 'mind', 'work', 'home', 'social', 'other'))),
  add constraint challenges_target_range check (
    (kind = 'xp' and target between 50 and 2000)
    or (kind in ('habits', 'category') and target between 1 and 100)
    or (kind = 'days' and target between 1 and 14));
create index challenges_pair_end_idx on public.challenges (
  least(creator_id, partner_id), greatest(creator_id, partner_id), end_date
);

-- 2. Progreso de un reto (cuánto lleva cada uno y si está cumplido). Interna.
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
begin
  select * into c from public.challenges x where x.id = p_challenge;
  if c.id is null then
    return;
  end if;

  if c.kind = 'xp' then
    select coalesce(sum(e.amount), 0) into v_a from public.xp_events e
    where e.user_id = c.creator_id and e.local_date between c.start_date and c.end_date;
    select coalesce(sum(e.amount), 0) into v_b from public.xp_events e
    where e.user_id = c.partner_id and e.local_date between c.start_date and c.end_date;
  elsif c.kind in ('habits', 'category') then
    select count(*) into v_a from public.habit_logs l join public.habits h on h.id = l.habit_id
    where h.user_id = c.creator_id and l.local_date between c.start_date and c.end_date
      and l.value >= coalesce(h.target_value, 1) and (c.kind = 'habits' or h.category = c.category);
    select count(*) into v_b from public.habit_logs l join public.habits h on h.id = l.habit_id
    where h.user_id = c.partner_id and l.local_date between c.start_date and c.end_date
      and l.value >= coalesce(h.target_value, 1) and (c.kind = 'habits' or h.category = c.category);
  else -- days: días en que cada uno llega al 70 %
    select count(*) into v_a from public.day_stats_range(c.creator_id, c.start_date, c.end_date) d
    where public.day_state(d.scheduled, d.done) = 'ok';
    select count(*) into v_b from public.day_stats_range(c.partner_id, c.start_date, c.end_date) d
    where public.day_state(d.scheduled, d.done) = 'ok';
  end if;

  return query select v_a, v_b,
    case when c.kind = 'days' then v_a >= c.target and v_b >= c.target else v_a + v_b >= c.target end;
end;
$$;

-- 3. CREAR un reto relámpago (empieza hoy; 3 o 7 días)
create or replace function public.create_flash_challenge(
  p_friend uuid, p_kind text, p_target integer, p_days integer, p_category text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_today date;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_friend is null or p_friend = uid or not public.are_friends(uid, p_friend) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  if p_days not in (3, 7) then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if p_kind = 'days' and (p_target is null or p_target > p_days) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  v_today := public.user_today(uid);
  if exists (
    select 1 from public.challenges c
    where least(c.creator_id, c.partner_id) = least(uid, p_friend)
      and greatest(c.creator_id, c.partner_id) = greatest(uid, p_friend)
      and c.end_date >= v_today
  ) then
    raise exception 'already_exists' using errcode = '23505';
  end if;

  begin
    insert into public.challenges (creator_id, partner_id, kind, category, target, start_date, end_date, week_start, target_xp)
    values (uid, p_friend, p_kind, case when p_kind = 'category' then p_category end, p_target,
            v_today, v_today + p_days - 1, date_trunc('week', v_today)::date,
            case when p_kind = 'xp' then p_target end)
    returning id into v_id;
  exception when check_violation then
    raise exception 'invalid_target' using errcode = '22023';
  end;
  return v_id;
end;
$$;

-- El botón antiguo (reto de XP de esta semana) sigue funcionando
create or replace function public.create_challenge(p_friend uuid, p_target integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public.create_flash_challenge(p_friend, 'xp', p_target, 7, null);
end;
$$;

-- 4. MIS RETOS: activos y los terminados en los últimos 7 días
drop function public.get_my_challenges();

create or replace function public.get_my_challenges()
returns table (
  id uuid, kind text, category text, target integer, start_date date, end_date date,
  is_current boolean, created_by_me boolean,
  partner_id uuid, partner_name text, partner_avatar_path text, partner_avatar_color text,
  my_value integer, partner_value integer, done boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_today date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_today := public.user_today(uid);

  return query
  select c.id, c.kind, c.category, c.target, c.start_date, c.end_date,
    c.end_date >= v_today, c.creator_id = uid,
    pp.id, pp.display_name, pp.avatar_path, pp.avatar_color,
    case when c.creator_id = uid then v.creator_value else v.partner_value end,
    case when c.creator_id = uid then v.partner_value else v.creator_value end,
    v.done
  from public.challenges c
  join public.profiles pp on pp.id = case when c.creator_id = uid then c.partner_id else c.creator_id end
  cross join lateral public.challenge_values(c.id) v
  where uid in (c.creator_id, c.partner_id)
    and c.end_date >= v_today - 7
    and public.are_friends(c.creator_id, c.partner_id)
  order by (c.end_date >= v_today) desc, c.end_date desc, c.created_at desc;
end;
$$;

-- 5. CANCELAR (solo retos activos)
create or replace function public.cancel_challenge(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from public.challenges c
  where c.id = p_id and uid in (c.creator_id, c.partner_id) and c.end_date >= public.user_today(uid);
  if not found then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 6. La insignia "Trabajo en equipo" cuenta cualquier reto cumplido (de cualquier tipo)
create or replace function public.get_reward_metrics(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.user_today(p_user);
  v_best integer;
  v_shared integer := 0;
  s record;
  v_challenges integer;
begin
  select cs.best_streak into v_best from public.compute_streaks(p_user, v_today) cs;

  for s in select * from public.shared_streaks x where p_user in (x.user_a, x.user_b) loop
    v_shared := greatest(v_shared,
      (select c.best_streak from public.compute_shared_streak(s.user_a, s.user_b, s.started_on, v_today) c));
  end loop;

  select count(*) into v_challenges
  from public.challenges c
  where p_user in (c.creator_id, c.partner_id)
    and (select v.done from public.challenge_values(c.id) v);

  return jsonb_build_object(
    'habits_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                    where h.user_id = p_user and l.value >= coalesce(h.target_value, 1)),
    'best_streak', coalesce(v_best, 0),
    'level', public.level_for_xp((select coalesce(sum(e.amount), 0)::integer from public.xp_events e where e.user_id = p_user)),
    'study_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                   where h.user_id = p_user and h.category = 'study' and l.value >= coalesce(h.target_value, 1)),
    'sport_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                   where h.user_id = p_user and h.category = 'sport' and l.value >= coalesce(h.target_value, 1)),
    'health_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                    where h.user_id = p_user and h.category = 'health' and l.value >= coalesce(h.target_value, 1)),
    'mind_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                  where h.user_id = p_user and h.category = 'mind' and l.value >= coalesce(h.target_value, 1)),
    'friends', (select count(*) from public.friendships f
                where f.status = 'accepted' and p_user in (f.requester_id, f.addressee_id)),
    'posts', (select count(*) from public.habit_posts hp where hp.user_id = p_user),
    'challenges_won', v_challenges,
    'shared_best', v_shared
  );
end;
$$;

-- 7. PERMISOS
revoke all on function public.challenge_values(uuid) from public, anon, authenticated;
revoke all on function public.get_reward_metrics(uuid) from public, anon, authenticated;
revoke all on function public.create_flash_challenge(uuid, text, integer, integer, text) from public, anon;
revoke all on function public.create_challenge(uuid, integer) from public, anon;
revoke all on function public.get_my_challenges() from public, anon;
revoke all on function public.cancel_challenge(uuid) from public, anon;
grant execute on function public.create_flash_challenge(uuid, text, integer, integer, text) to authenticated;
grant execute on function public.create_challenge(uuid, integer) to authenticated;
grant execute on function public.get_my_challenges() to authenticated;
grant execute on function public.cancel_challenge(uuid) to authenticated;
