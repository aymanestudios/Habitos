-- 0027_day_recap.sql
-- "TU DÍA EN PROGRESS&GO": resumen animado de un día que YA ha terminado (en la zona horaria del usuario).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0026. No borra ni cambia nada existente.
--
-- * Solo lectura de datos reales (hábitos, XP, racha, retos en equipo). No modifica estadísticas.
-- * Un día no se resume hasta que ha terminado para ti: nunca "hoy".
-- * "Visto" se guarda en el servidor (day_recaps_seen): la invitación sale una vez, en cualquier dispositivo.
-- * Se puede volver a ver cualquiera de los últimos 30 días (historial).

create table if not exists public.day_recaps_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
alter table public.day_recaps_seen enable row level security; -- sin políticas: solo con las funciones
revoke all on public.day_recaps_seen from anon, authenticated;

create or replace function public.get_day_recap(p_date date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_today date;
  v_day date;
  v_since date;
  s record;
  st record;
  v_best_before integer;
  v_xp integer;
  v_xp_team integer;
  v_xp_until integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_today := public.user_today(uid);
  v_day := coalesce(p_date, v_today - 1);
  if v_day >= v_today then
    raise exception 'day_not_finished' using errcode = '22023';
  end if;
  if v_day < v_today - 30 then
    raise exception 'too_old' using errcode = '22023';
  end if;
  select (p.created_at at time zone coalesce(p.timezone, 'Europe/Madrid'))::date into v_since
  from public.profiles p where p.id = uid;
  if v_day < v_since then
    return jsonb_build_object('date', v_day, 'worth', false, 'before_account', true);
  end if;

  select coalesce(sum(d.scheduled), 0)::integer as scheduled, coalesce(sum(d.done), 0)::integer as done
  into s from public.day_stats_range(uid, v_day, v_day) d;
  select * into st from public.compute_streaks(uid, v_day);
  select cs.best_streak into v_best_before from public.compute_streaks(uid, v_day - 1) cs;

  select coalesce(sum(e.amount), 0)::integer, coalesce(sum(e.amount) filter (where e.kind = 'team_challenge'), 0)::integer
  into v_xp, v_xp_team
  from public.xp_events e where e.user_id = uid and e.local_date = v_day;
  select coalesce(sum(e.amount), 0)::integer into v_xp_until
  from public.xp_events e where e.user_id = uid and e.local_date <= v_day;

  return jsonb_build_object(
    'date', v_day,
    'scheduled', s.scheduled,
    'done', s.done,
    'state', public.day_state(s.scheduled, s.done), -- ok | miss | free
    -- Hábitos completados ese día (cualquiera; los semanales de "total" no, se cuentan por semana)
    'completed', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                  where h.user_id = uid and l.local_date = v_day and h.frequency_type <> 'weekly_total'
                    and l.value >= coalesce(h.target_value, 1)),
    'habits', coalesce((
      select jsonb_agg(jsonb_build_object('title', x.title, 'category', x.category) order by x.title)
      from (select h.title, h.category from public.habit_logs l join public.habits h on h.id = l.habit_id
            where h.user_id = uid and l.local_date = v_day and h.frequency_type <> 'weekly_total'
              and l.value >= coalesce(h.target_value, 1)
            order by h.title limit 6) x), '[]'::jsonb),
    'xp', v_xp,
    'xp_team', v_xp_team,
    'level_before', public.level_for_xp(v_xp_until - v_xp),
    'level_after', public.level_for_xp(v_xp_until),
    'streak', coalesce(st.current_streak, 0),
    'best_streak', coalesce(st.best_streak, 0),
    'new_record', coalesce(st.best_streak, 0) > coalesce(v_best_before, 0) and coalesce(st.best_streak, 0) >= 3,
    -- Retos en equipo: lo que aportaste ese día y los que se cumplieron ese día
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
               'label', public.team_label(c.id), 'unit', c.unit, 'kind', c.kind,
               'partner', pp.display_name,
               'mine_day', coalesce((select sum(k.amount) from public.challenge_contributions k
                                     where k.challenge_id = c.id and k.user_id = uid and k.local_date = v_day), 0),
               'completed', c.status = 'completed'
                 and (c.completed_at at time zone coalesce((select p.timezone from public.profiles p where p.id = uid), 'Europe/Madrid'))::date = v_day))
      from public.challenges c
      join public.profiles pp on pp.id = case when c.creator_id = uid then c.partner_id else c.creator_id end
      where uid in (c.creator_id, c.partner_id) and public.is_team_kind(c.kind)
        and c.status in ('active', 'completed', 'expired', 'cancelled')
        and (exists (select 1 from public.challenge_contributions k
                     where k.challenge_id = c.id and k.user_id = uid and k.local_date = v_day)
             or (c.status = 'completed'
                 and (c.completed_at at time zone coalesce((select p.timezone from public.profiles p where p.id = uid), 'Europe/Madrid'))::date = v_day))
    ), '[]'::jsonb),
    'seen', exists (select 1 from public.day_recaps_seen r where r.user_id = uid and r.local_date = v_day),
    -- ¿Merece la pena enseñarlo? Solo si ese día tenías algo (hábitos programados, XP o retos)
    'worth', s.scheduled > 0 or v_xp > 0
             or exists (select 1 from public.challenge_contributions k where k.user_id = uid and k.local_date = v_day)
  );
end;
$$;

create or replace function public.mark_day_recap_seen(p_date date)
returns void
language plpgsql
volatile
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
  if p_date is null or p_date >= v_today or p_date < v_today - 30 then
    return; -- nada que guardar
  end if;
  insert into public.day_recaps_seen (user_id, local_date) values (uid, p_date) on conflict do nothing;
  -- Limpieza: solo hace falta recordar el último mes
  delete from public.day_recaps_seen r where r.user_id = uid and r.local_date < v_today - 40;
end;
$$;

revoke all on function public.get_day_recap(date) from public, anon;
revoke all on function public.mark_day_recap_seen(date) from public, anon;
grant execute on function public.get_day_recap(date) to authenticated;
grant execute on function public.mark_day_recap_seen(date) to authenticated;
