-- 0014_streak_nudges.sql
-- Que no se apague la racha compartida:
--   1. "Dar un toque": avisas a tu amigo si aún no ha cumplido (uno al día por persona y racha).
--   2. Aviso automático a las 20:00 (hora de cada uno) si vuestra racha está en peligro y aún no has cumplido.
-- Los avisos los envía la misma Edge Function de los recordatorios (send-reminders), ahora con claim_push_queue.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0013.

create table public.streak_nudges (
  id uuid primary key default gen_random_uuid(),
  streak_id uuid not null references public.shared_streaks (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  local_date date not null, -- el día de quien lo envía
  created_at timestamptz not null default now(),
  sent_at timestamptz, -- cuándo salió el aviso al móvil
  constraint streak_nudges_one_per_day unique (streak_id, from_user, local_date)
);
create index streak_nudges_pending_idx on public.streak_nudges (created_at) where sent_at is null;

alter table public.streak_nudges enable row level security;
create policy "streak_nudges: ver los míos"
  on public.streak_nudges for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));
revoke all on public.streak_nudges from anon, authenticated;
grant select on public.streak_nudges to authenticated;

-- Registro interno: a quién ya se le comprobó el aviso de las 20:00 hoy (para no repetir)
create table public.streak_warnings (
  streak_id uuid not null references public.shared_streaks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  sent boolean not null default false,
  primary key (streak_id, user_id, local_date)
);
alter table public.streak_warnings enable row level security; -- sin políticas: nadie de la app la ve
revoke all on public.streak_warnings from anon, authenticated;

-- Día local de un usuario. Interna.
create or replace function public.user_today(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((select p.timezone from public.profiles p where p.id = p_user), 'Europe/Madrid'))::date;
$$;

-- 1. DAR UN TOQUE a tu amigo de racha (solo si aún no ha cumplido hoy).
create or replace function public.nudge_partner(p_streak uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_partner uuid;
  v_state text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select case when s.user_a = uid then s.user_b else s.user_a end into v_partner
  from public.shared_streaks s where s.id = p_streak and uid in (s.user_a, s.user_b);
  if v_partner is null or not public.are_friends(uid, v_partner) then
    raise exception 'streak_not_found' using errcode = 'P0002';
  end if;

  select public.day_state(d.scheduled, d.done) into v_state
  from public.day_stats_range(v_partner, public.user_today(v_partner), public.user_today(v_partner)) d;
  if v_state <> 'miss' then
    raise exception 'partner_done' using errcode = '22023'; -- ya ha cumplido (o hoy no tiene hábitos)
  end if;

  insert into public.streak_nudges (streak_id, from_user, to_user, local_date)
  values (p_streak, uid, v_partner, public.user_today(uid))
  on conflict (streak_id, from_user, local_date) do nothing;
  if not found then
    raise exception 'already_nudged' using errcode = '23505';
  end if;
end;
$$;

-- 2. COLA DE AVISOS para la Edge Function: recordatorios + toques + racha en peligro.
--    Cada aviso se marca como enviado en el mismo paso (nunca sale dos veces).
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
         '¡Que se apaga vuestra racha! Completa tus hábitos de hoy.',
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
           '🔥 Tu racha con ' || v_partner_name || ' está en peligro',
           'Lleváis ' || c.current_streak || case when c.current_streak = 1 then ' día' else ' días' end
             || '. Completa tus hábitos antes de medianoche.',
           '/',
           s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s where s.user_id = r.uid2;
  end loop;
end;
$$;

-- 3. Rachas compartidas con el estado de los toques (cambia lo que devuelve: borrar y crear)
drop function public.get_shared_streaks();

create or replace function public.get_shared_streaks()
returns table (
  id uuid, started_on date, created_by_me boolean,
  partner_id uuid, partner_name text, partner_avatar_path text, partner_avatar_emoji text, partner_avatar_color text,
  current_streak integer, best_streak integer, today_counted boolean,
  my_scheduled integer, my_done integer, partner_scheduled integer, partner_done integer,
  i_nudged_today boolean, nudged_me_today boolean
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
    me.scheduled, me.done, pt.scheduled, pt.done,
    exists (select 1 from public.streak_nudges n where n.streak_id = s.id and n.from_user = uid and n.local_date = v_today),
    exists (select 1 from public.streak_nudges n where n.streak_id = s.id and n.to_user = uid
            and n.created_at > now() - interval '18 hours')
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
revoke all on function public.user_today(uuid) from public, anon, authenticated;
revoke all on function public.nudge_partner(uuid) from public, anon;
revoke all on function public.claim_push_queue() from public, anon, authenticated;
revoke all on function public.get_shared_streaks() from public, anon;
grant execute on function public.nudge_partner(uuid) to authenticated;
grant execute on function public.get_shared_streaks() to authenticated;
grant execute on function public.claim_push_queue() to service_role;
