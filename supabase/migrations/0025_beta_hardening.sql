-- 0025_beta_hardening.sql
-- Seguridad antes de la beta privada (auditoría del 18/11/2026). No borra datos.
--   1. Zona horaria válida: una zona inventada rompía los avisos de TODOS (claim_push_queue fallaba).
--   2. Hábitos privados: en fotos compartidas, los amigos ya no ven el nombre de un hábito "Solo yo".
--   3. Recompensas que no se pierden: el récord de racha compartida, nº de amigos y fotos
--      se guardan antes de borrarse (terminar racha, quitar amigo, borrar foto).
--   4. Modo prueba de tickets apagado también en instalaciones nuevas.
--   5. Perfiles: la app no puede crearlos ni borrarlos directamente (ya lo impedía RLS; ahora también el permiso).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0024.

-- 1. ZONA HORARIA ------------------------------------------------------------
-- Si alguna ya fuese inválida, vuelve a la de por defecto (no hay ninguna en producción a día de hoy)
update public.profiles p set timezone = 'Europe/Madrid'
where not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p.timezone);

create or replace function public.profiles_check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is distinct from old.timezone
     and not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_check_timezone() from public, anon, authenticated;

drop trigger if exists profiles_check_timezone on public.profiles;
create trigger profiles_check_timezone
  before update of timezone on public.profiles
  for each row execute function public.profiles_check_timezone();

-- 2. NOMBRE DE HÁBITOS PRIVADOS EN FOTOS ----------------------------------------
-- La foto y el comentario se siguen viendo si eliges "Mis amigos"; el NOMBRE del hábito solo
-- si el hábito también es "Mis amigos". (Mismas funciones que 0012 y 0016, con ese único cambio.)
create or replace function public.get_friend_activity()
returns table (
  item_id uuid, item_type text, user_id uuid, display_name text,
  avatar_path text, avatar_emoji text, avatar_color text,
  kind text, habit_title text, amount integer, created_at timestamptz,
  photo_path text, caption text,
  reactions jsonb, my_reaction text, reaction_count integer
)
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

  return query
  with items as (
    -- Eventos de XP sin publicación visible
    select e.id as iid, 'event'::text as itype, e.user_id as uid2, e.kind as k,
      case when h.visibility = 'friends' then h.title end as title,
      e.amount as amt, e.created_at as at, null::text as photo, null::text as cap
    from public.xp_events e
    left join public.habits h on h.id = e.habit_id
    where e.user_id <> uid
      and public.are_friends(uid, e.user_id)
      and e.created_at > now() - interval '7 days'
      and e.amount > 0
      and not (e.kind = 'habit' and exists (
        select 1 from public.habit_posts hp
        where hp.habit_id = e.habit_id and hp.local_date = e.local_date and hp.visibility = 'friends'))
    union all
    -- Publicaciones con foto. El nombre del hábito solo si el hábito es "Mis amigos" (0025)
    select hp.id, 'post', hp.user_id, 'habit', case when h.visibility = 'friends' then h.title end,
      coalesce((select e2.amount from public.xp_events e2
                where e2.kind = 'habit' and e2.habit_id = hp.habit_id and e2.local_date = hp.local_date), 0),
      hp.created_at, hp.photo_path, hp.caption
    from public.habit_posts hp
    join public.habits h on h.id = hp.habit_id
    where hp.user_id <> uid
      and hp.visibility = 'friends'
      and public.are_friends(uid, hp.user_id)
      and hp.created_at > now() - interval '7 days'
  )
  select i.iid, i.itype, i.uid2, p.display_name, p.avatar_path, p.avatar_emoji, p.avatar_color,
    i.k, i.title, i.amt, i.at, i.photo, i.cap,
    coalesce((select jsonb_object_agg(r.emoji, r.n)
              from (select r0.emoji, count(*)::integer as n from public.reactions r0
                    where (i.itype = 'event' and r0.event_id = i.iid) or (i.itype = 'post' and r0.post_id = i.iid)
                    group by r0.emoji) r), '{}'::jsonb),
    (select r1.emoji from public.reactions r1
     where r1.user_id = uid
       and ((i.itype = 'event' and r1.event_id = i.iid) or (i.itype = 'post' and r1.post_id = i.iid))),
    (select count(*)::integer from public.reactions r2
     where (i.itype = 'event' and r2.event_id = i.iid) or (i.itype = 'post' and r2.post_id = i.iid))
  from items i
  join public.profiles p on p.id = i.uid2
  order by i.at desc
  limit 30;
end;
$$;

create or replace function public.get_friend_profile(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  pr record;
  v_today date;
  v_ws date;
  v_streak record;
  v_xp integer;
  m jsonb;
  result jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_user is null or (p_user <> uid and not public.are_friends(uid, p_user)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into pr from public.profiles p where p.id = p_user;
  v_today := public.user_today(p_user);
  v_ws := date_trunc('week', v_today)::date;
  select coalesce(sum(e.amount), 0)::integer into v_xp from public.xp_events e where e.user_id = p_user;

  result := jsonb_build_object(
    'user_id', pr.id, 'display_name', pr.display_name, 'username', pr.username,
    'avatar_path', pr.avatar_path, 'avatar_color', pr.avatar_color, 'bio', pr.bio,
    'level', public.level_for_xp(v_xp), 'xp_total', v_xp,
    'week_xp', (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
                where e.user_id = p_user and e.local_date between v_ws and v_ws + 6),
    'equipped_frame', pr.equipped_frame, 'equipped_accessory', pr.equipped_accessory,
    'equipped_effect', pr.equipped_effect, 'showcase_badges', to_jsonb(pr.showcase_badges),
    'share_streak', pr.share_streak, 'share_stats', pr.share_stats, 'share_achievements', pr.share_achievements
  );

  if pr.share_streak then
    select * into v_streak from public.compute_streaks(p_user, v_today);
    result := result || jsonb_build_object('current_streak', v_streak.current_streak, 'best_streak', v_streak.best_streak);
  end if;

  if pr.share_achievements then
    m := public.get_reward_metrics(p_user);
    result := result || jsonb_build_object('unlocked', (
      select coalesce(jsonb_agg(c.id order by c.sort), '[]'::jsonb) from public.reward_catalog c
      where coalesce((m ->> c.metric)::integer, 0) >= c.threshold));
  end if;

  if pr.share_stats then
    result := result || jsonb_build_object(
      'habits_done', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                      where h.user_id = p_user and l.value >= coalesce(h.target_value, 1)),
      -- últimos 30 días: % de cumplimiento diario (mismos datos que su racha)
      'month', (select jsonb_build_object('scheduled', coalesce(sum(d.scheduled), 0), 'done', coalesce(sum(d.done), 0))
                from public.day_stats_range(p_user, v_today - 29, v_today) d),
      -- SOLO sus hábitos visibles para amigos (nunca los privados)
      'habits', (select coalesce(jsonb_agg(jsonb_build_object(
                    'title', h.title, 'category', h.category,
                    'done_30', (select count(*) from public.habit_logs l
                                where l.habit_id = h.id and l.local_date > v_today - 30
                                  and l.value >= coalesce(h.target_value, 1)))
                  order by h.created_at), '[]'::jsonb)
                 from public.habits h
                 where h.user_id = p_user and h.visibility = 'friends' and h.archived_at is null),
      -- fotos recientes que compartió con amigos (las privadas no salen)
      'posts', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', x.id, 'photo_path', x.photo_path, 'caption', x.caption,
                   'local_date', x.local_date, 'habit_title', x.title) order by x.created_at desc), '[]'::jsonb)
                from (select hp.id, hp.photo_path, hp.caption, hp.local_date, hp.created_at,
                             case when h.visibility = 'friends' then h.title end as title
                      from public.habit_posts hp join public.habits h on h.id = hp.habit_id
                      where hp.user_id = p_user and hp.visibility = 'friends'
                      order by hp.created_at desc limit 9) x)
    );
  end if;

  return result;
end;
$$;

-- 3. RECOMPENSAS QUE NO SE PIERDEN -------------------------------------------
-- Récords guardados por el servidor (nadie puede leerlos ni escribirlos desde la app).
create table if not exists public.reward_metric_peaks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric text not null,
  value integer not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric)
);
alter table public.reward_metric_peaks enable row level security; -- sin políticas: interna
revoke all on public.reward_metric_peaks from anon, authenticated;

create or replace function public.save_metric_peak(p_user uuid, p_metric text, p_value integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Si la cuenta se está borrando, no hay nada que guardar
  if p_user is null or p_value is null or not exists (select 1 from public.profiles p where p.id = p_user) then
    return;
  end if;
  insert into public.reward_metric_peaks (user_id, metric, value)
  values (p_user, p_metric, p_value)
  on conflict (user_id, metric) do update
    set value = greatest(public.reward_metric_peaks.value, excluded.value), updated_at = now();
end;
$$;
revoke all on function public.save_metric_peak(uuid, text, integer) from public, anon, authenticated;

-- Antes de terminar una racha compartida: guardar su récord para los dos
create or replace function public.shared_streaks_keep_best()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_best integer;
begin
  begin
    select c.best_streak into v_best
    from public.compute_shared_streak(old.user_a, old.user_b, old.started_on, public.user_today(old.user_a)) c;
    perform public.save_metric_peak(old.user_a, 'shared_best', v_best);
    perform public.save_metric_peak(old.user_b, 'shared_best', v_best);
  exception when others then
    null; -- guardar el récord nunca debe impedir terminar la racha (ni borrar una cuenta)
  end;
  return old;
end;
$$;
revoke all on function public.shared_streaks_keep_best() from public, anon, authenticated;
drop trigger if exists shared_streaks_keep_best on public.shared_streaks;
create trigger shared_streaks_keep_best
  before delete on public.shared_streaks
  for each row execute function public.shared_streaks_keep_best();

-- Antes de quitar un amigo: guardar cuántos amigos teníais
create or replace function public.friendships_keep_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid;
begin
  if old.status = 'accepted' then
    begin
      foreach u in array array[old.requester_id, old.addressee_id] loop
        perform public.save_metric_peak(u, 'friends', (
          select count(*)::integer from public.friendships f
          where f.status = 'accepted' and u in (f.requester_id, f.addressee_id)));
      end loop;
    exception when others then
      null;
    end;
  end if;
  return old;
end;
$$;
revoke all on function public.friendships_keep_count() from public, anon, authenticated;
drop trigger if exists friendships_keep_count on public.friendships;
create trigger friendships_keep_count
  before delete on public.friendships
  for each row execute function public.friendships_keep_count();

-- Antes de borrar una foto: guardar cuántas habías compartido
create or replace function public.habit_posts_keep_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.save_metric_peak(old.user_id, 'posts',
      (select count(*)::integer from public.habit_posts hp where hp.user_id = old.user_id));
  exception when others then
    null;
  end;
  return old;
end;
$$;
revoke all on function public.habit_posts_keep_count() from public, anon, authenticated;
drop trigger if exists habit_posts_keep_count on public.habit_posts;
create trigger habit_posts_keep_count
  before delete on public.habit_posts
  for each row execute function public.habit_posts_keep_count();

-- Las métricas de recompensas = lo actual o el récord guardado, lo que sea mayor.
-- get_my_rewards, equip_rewards y get_friend_profile siguen llamando a get_reward_metrics: no cambian.
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'reward_metrics_live') then
    alter function public.get_reward_metrics(uuid) rename to reward_metrics_live;
  end if;
end $$;
revoke all on function public.reward_metrics_live(uuid) from public, anon, authenticated;

create or replace function public.get_reward_metrics(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select x.live || coalesce((
    select jsonb_object_agg(k.metric, greatest(k.value, coalesce((x.live ->> k.metric)::integer, 0)))
    from public.reward_metric_peaks k where k.user_id = p_user), '{}'::jsonb)
  from (select public.reward_metrics_live(p_user) as live) x;
$$;
revoke all on function public.get_reward_metrics(uuid) from public, anon, authenticated;

-- Rachas compartidas que YA se terminaron antes de esta migración: su récord no se puede recuperar
-- (no se guardaba). Las que siguen existiendo se guardan ya, por si acaso.
do $$
declare s record;
begin
  for s in select * from public.shared_streaks loop
    begin
      perform public.save_metric_peak(s.user_a, 'shared_best',
        (select c.best_streak from public.compute_shared_streak(s.user_a, s.user_b, s.started_on, public.user_today(s.user_a)) c));
      perform public.save_metric_peak(s.user_b, 'shared_best',
        (select c.best_streak from public.compute_shared_streak(s.user_a, s.user_b, s.started_on, public.user_today(s.user_a)) c));
    exception when others then null;
    end;
  end loop;
end $$;

-- 4. MODO PRUEBA DE TICKETS APAGADO ------------------------------------------
update public.app_flags set value = false where key = 'infinite_tickets';

-- 5. PERFILES: solo los crea el servidor al registrarse ---------------------------
revoke insert, delete on public.profiles from authenticated, anon;
