-- 0017_home_week.sql
-- Datos para Inicio y el resumen semanal. Solo LECTURA: no cambia tablas ni reglas.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0016.

-- 1. De un vistazo (Inicio): XP de hoy y cuántos días llevabas sin entrar a marcar algo.
create or replace function public.get_today_glance()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_today date;
  v_last date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_today := public.user_today(uid);
  select max(l.local_date) into v_last
  from public.habit_logs l where l.user_id = uid and l.local_date < v_today and l.value > 0;

  return jsonb_build_object(
    'today', v_today,
    'xp_today', (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
                 where e.user_id = uid and e.local_date = v_today),
    'last_active', v_last,
    'days_away', case when v_last is null then null else v_today - v_last end
  );
end;
$$;

-- 2. Resumen de la última semana COMPLETA (lunes a domingo) y de la anterior, para comparar.
--    Todo sale de tus datos reales: si una semana no tenía hábitos, scheduled = 0 y la app no compara.
create or replace function public.get_week_recap()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_today date;
  v_ws date; -- lunes de la semana resumida
  v_we date; -- domingo
  v_end record;
  v_before record;
  cur jsonb;
  prev jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_today := public.user_today(uid);
  v_ws := date_trunc('week', v_today)::date - 7;
  v_we := v_ws + 6;

  select coalesce(sum(d.scheduled), 0) as scheduled, coalesce(sum(d.done), 0) as done into v_end
  from public.day_stats_range(uid, v_ws, v_we) d;
  select coalesce(sum(d.scheduled), 0) as scheduled, coalesce(sum(d.done), 0) as done into v_before
  from public.day_stats_range(uid, v_ws - 7, v_we - 7) d;

  cur := jsonb_build_object(
    'scheduled', v_end.scheduled, 'done', v_end.done,
    'completed', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                  where h.user_id = uid and l.local_date between v_ws and v_we
                    and l.value >= coalesce(h.target_value, 1)),
    'xp', (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
           where e.user_id = uid and e.local_date between v_ws and v_we)
  );
  prev := jsonb_build_object(
    'scheduled', v_before.scheduled, 'done', v_before.done,
    'completed', (select count(*) from public.habit_logs l join public.habits h on h.id = l.habit_id
                  where h.user_id = uid and l.local_date between v_ws - 7 and v_we - 7
                    and l.value >= coalesce(h.target_value, 1)),
    'xp', (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
           where e.user_id = uid and e.local_date between v_ws - 7 and v_we - 7)
  );

  return jsonb_build_object(
    'week_start', v_ws, 'week_end', v_we,
    'current', cur, 'previous', prev,
    'streak_end', (select s.current_streak from public.compute_streaks(uid, v_we) s),
    'best_before', (select s.best_streak from public.compute_streaks(uid, v_ws - 1) s),
    'best_after', (select s.best_streak from public.compute_streaks(uid, v_we) s),
    'top_category', (select h.category from public.habit_logs l join public.habits h on h.id = l.habit_id
                     where h.user_id = uid and l.local_date between v_ws and v_we
                       and l.value >= coalesce(h.target_value, 1) and h.category <> 'other'
                     group by h.category order by count(*) desc, h.category limit 1)
  );
end;
$$;

revoke all on function public.get_today_glance() from public, anon;
revoke all on function public.get_week_recap() from public, anon;
grant execute on function public.get_today_glance() to authenticated;
grant execute on function public.get_week_recap() to authenticated;
