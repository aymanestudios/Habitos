-- 0008_challenges.sql
-- Retos cooperativos: tú y un amigo os ponéis una meta de XP conjunta para esta semana (lunes a domingo).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0007.
-- Privacidad: del amigo solo se ve su nombre y la XP que suma esta semana (igual que en el ranking).

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- lunes de la semana del reto
  target_xp integer not null,
  created_at timestamptz not null default now(),
  constraint challenges_not_self check (creator_id <> partner_id),
  constraint challenges_target_range check (target_xp between 50 and 2000),
  constraint challenges_week_is_monday check (extract(isodow from week_start) = 1)
);

-- Un solo reto por pareja y semana, da igual quién lo creó.
create unique index challenges_pair_week_key on public.challenges (
  least(creator_id, partner_id), greatest(creator_id, partner_id), week_start
);
create index challenges_partner_idx on public.challenges (partner_id);

alter table public.challenges enable row level security;

create policy "challenges: ver los propios"
  on public.challenges for select
  to authenticated
  using (creator_id = (select auth.uid()) or partner_id = (select auth.uid()));

-- Sin escritura directa: solo mediante las funciones de abajo.
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

-- Lunes de la semana actual según la zona horaria del usuario. Interna.
create or replace function public.current_week_start(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('week', now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = p_user), 'Europe/Madrid'))::date;
$$;

-- 1. CREAR un reto con un amigo para esta semana.
create or replace function public.create_challenge(p_friend uuid, p_target integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_ws date;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_target is null or p_target < 50 or p_target > 2000 then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_friend is null or p_friend = uid or not public.are_friends(uid, p_friend) then
    raise exception 'not_friends' using errcode = '42501';
  end if;

  v_ws := public.current_week_start(uid);
  if exists (
    select 1 from public.challenges c
    where c.week_start = v_ws
      and least(c.creator_id, c.partner_id) = least(uid, p_friend)
      and greatest(c.creator_id, c.partner_id) = greatest(uid, p_friend)
  ) then
    raise exception 'already_exists' using errcode = '23505';
  end if;

  insert into public.challenges (creator_id, partner_id, week_start, target_xp)
  values (uid, p_friend, v_ws, p_target)
  returning id into v_id;
  return v_id;
end;
$$;

-- 2. MIS RETOS de esta semana y de la anterior (para ver si se cumplieron).
create or replace function public.get_my_challenges()
returns table (
  id uuid, week_start date, target_xp integer, is_current boolean, created_by_me boolean,
  partner_id uuid, partner_name text, my_xp integer, partner_xp integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_ws date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_ws := public.current_week_start(uid);

  return query
  select c.id, c.week_start, c.target_xp, c.week_start >= v_ws, c.creator_id = uid,
    pp.id, pp.display_name,
    (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
     where e.user_id = uid and e.local_date between c.week_start and c.week_start + 6),
    (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
     where e.user_id = pp.id and e.local_date between c.week_start and c.week_start + 6)
  from public.challenges c
  join public.profiles pp on pp.id = case when c.creator_id = uid then c.partner_id else c.creator_id end
  where uid in (c.creator_id, c.partner_id)
    and c.week_start >= v_ws - 7
    and public.are_friends(c.creator_id, c.partner_id)
  order by c.week_start desc, c.created_at desc;
end;
$$;

-- 3. CANCELAR un reto de esta semana (cualquiera de los dos puede).
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
  where c.id = p_id and uid in (c.creator_id, c.partner_id)
    and c.week_start >= public.current_week_start(uid);
  if not found then
    raise exception 'challenge_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 4. PERMISOS
revoke all on function public.current_week_start(uuid) from public, anon, authenticated;
revoke all on function public.create_challenge(uuid, integer) from public, anon;
revoke all on function public.get_my_challenges() from public, anon;
revoke all on function public.cancel_challenge(uuid) from public, anon;
grant execute on function public.create_challenge(uuid, integer) to authenticated;
grant execute on function public.get_my_challenges() to authenticated;
grant execute on function public.cancel_challenge(uuid) to authenticated;
