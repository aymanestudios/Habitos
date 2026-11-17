-- 0013_shared_streaks.sql
-- Rachas compartidas entre dos amigos (con su propio fuego).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0012.
--
-- Solo se guarda QUIÉN y DESDE CUÁNDO. La racha, el récord y el estado de hoy se CALCULAN
-- con los hábitos reales (day_stats_range), y el fuego (color, etapa) lo calcula la app a partir
-- de los días. Así nada puede desincronizarse.
--
-- Regla de un día compartido (misma idea que la racha individual):
--   cada uno: "ok" si hace al menos el 70 % de sus hábitos diarios, "libre" si ese día no tenía ninguno.
--   El día SUMA si nadie ha fallado y al menos uno ha cumplido. Si alguno falla, la racha se rompe.
--   Los días en que los dos estaban libres no suman ni rompen. Hoy solo suma cuando ya lo habéis logrado.
--   (Las rachas compartidas no usan congelaciones.)

create table public.shared_streaks (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade, -- siempre el id "menor"
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  started_on date not null,
  created_at timestamptz not null default now(),
  constraint shared_streaks_order check (user_a < user_b),
  constraint shared_streaks_pair_key unique (user_a, user_b)
);
create index shared_streaks_user_b_idx on public.shared_streaks (user_b);

alter table public.shared_streaks enable row level security;

create policy "shared_streaks: ver las propias"
  on public.shared_streaks for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

revoke all on public.shared_streaks from anon, authenticated;
grant select on public.shared_streaks to authenticated;

-- Estado de un usuario un día: 'ok', 'free' (sin hábitos) o 'miss'. Interna.
create or replace function public.day_state(p_scheduled integer, p_done integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_scheduled = 0 then 'free'
    when p_done * 100 >= p_scheduled * public.game_rule('streak_percent') then 'ok'
    else 'miss'
  end;
$$;

-- Racha actual y récord de una pareja desde started_on hasta p_today. Interna.
create or replace function public.compute_shared_streak(p_a uuid, p_b uuid, p_from date, p_today date)
returns table (current_streak integer, best_streak integer, today_counted boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_run integer := 0;
  v_best integer := 0;
  v_today_ok boolean := false;
  r record;
  sa text;
  sb text;
begin
  if p_from > p_today then
    return query select 0, 0, false;
    return;
  end if;

  for r in
    select a.day, a.scheduled as sa_s, a.done as sa_d, b.scheduled as sb_s, b.done as sb_d
    from public.day_stats_range(p_a, p_from, p_today) a
    join public.day_stats_range(p_b, p_from, p_today) b on b.day = a.day
    order by a.day
  loop
    sa := public.day_state(r.sa_s, r.sa_d);
    sb := public.day_state(r.sb_s, r.sb_d);

    if r.day = p_today then
      -- Hoy no puede romper: solo suma si ya está logrado
      v_today_ok := sa <> 'miss' and sb <> 'miss' and (sa = 'ok' or sb = 'ok');
    elsif sa = 'free' and sb = 'free' then
      continue; -- día neutro
    elsif sa = 'miss' or sb = 'miss' then
      v_run := 0; -- se rompe
    else
      v_run := v_run + 1;
      v_best := greatest(v_best, v_run);
    end if;
  end loop;

  return query select
    v_run + case when v_today_ok then 1 else 0 end,
    greatest(v_best, v_run + case when v_today_ok then 1 else 0 end),
    v_today_ok;
end;
$$;

-- 1. EMPEZAR una racha compartida con un amigo (empieza hoy).
create or replace function public.start_shared_streak(p_friend uuid)
returns uuid
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
  if p_friend is null or p_friend = uid or not public.are_friends(uid, p_friend) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  if exists (select 1 from public.shared_streaks s
             where s.user_a = least(uid, p_friend) and s.user_b = greatest(uid, p_friend)) then
    raise exception 'already_exists' using errcode = '23505';
  end if;

  insert into public.shared_streaks (user_a, user_b, created_by, started_on)
  values (least(uid, p_friend), greatest(uid, p_friend), uid,
          (now() at time zone coalesce(
            (select p.timezone from public.profiles p where p.id = uid), 'Europe/Madrid'))::date)
  returning id into v_id;
  return v_id;
end;
$$;

-- 2. TERMINAR una racha compartida (cualquiera de los dos).
create or replace function public.end_shared_streak(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from public.shared_streaks s where s.id = p_id and auth.uid() in (s.user_a, s.user_b);
  if not found then
    raise exception 'streak_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 3. MIS RACHAS COMPARTIDAS con todo calculado.
--    Del amigo solo se ve: nombre, avatar y cuánto lleva hoy (hechos / programados).
create or replace function public.get_shared_streaks()
returns table (
  id uuid, started_on date, created_by_me boolean,
  partner_id uuid, partner_name text, partner_avatar_path text, partner_avatar_emoji text, partner_avatar_color text,
  current_streak integer, best_streak integer, today_counted boolean,
  my_scheduled integer, my_done integer, partner_scheduled integer, partner_done integer
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
  v_today := (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = uid), 'Europe/Madrid'))::date;

  return query
  select s.id, s.started_on, s.created_by = uid,
    pp.id, pp.display_name, pp.avatar_path, pp.avatar_emoji, pp.avatar_color,
    c.current_streak, c.best_streak, c.today_counted,
    me.scheduled, me.done, pt.scheduled, pt.done
  from public.shared_streaks s
  join public.profiles pp on pp.id = case when s.user_a = uid then s.user_b else s.user_a end
  cross join lateral public.compute_shared_streak(s.user_a, s.user_b, s.started_on, v_today) c
  cross join lateral public.day_stats_range(uid, v_today, v_today) me
  cross join lateral public.day_stats_range(pp.id, v_today, v_today) pt
  where uid in (s.user_a, s.user_b)
    and public.are_friends(s.user_a, s.user_b)
  order by c.current_streak desc, s.created_at;
end;
$$;

-- 4. PERMISOS
revoke all on function public.day_state(integer, integer) from public, anon, authenticated;
revoke all on function public.compute_shared_streak(uuid, uuid, date, date) from public, anon, authenticated;
revoke all on function public.start_shared_streak(uuid) from public, anon;
revoke all on function public.end_shared_streak(uuid) from public, anon;
revoke all on function public.get_shared_streaks() from public, anon;
grant execute on function public.start_shared_streak(uuid) to authenticated;
grant execute on function public.end_shared_streak(uuid) to authenticated;
grant execute on function public.get_shared_streaks() to authenticated;
