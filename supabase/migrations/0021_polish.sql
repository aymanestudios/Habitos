-- 0021_polish.sql
-- Repaso de seguridad: las funciones de los triggers no tienen que poder llamarse "a mano".
-- Los triggers siguen funcionando igual (Postgres no pide permiso EXECUTE al dispararlos).
-- Además, textos más amables en dos avisos push (toque de un amigo y racha compartida).
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0020.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.habits_before_insert() from public, anon, authenticated;
revoke all on function public.habits_before_update() from public, anon, authenticated;

-- Avisos: mismo contenido que 0019, solo cambian dos textos (sin presión ni culpa)
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
           ch.created_at, u.uid2, pr.timezone
    from public.challenges ch
    cross join lateral (values (ch.creator_id), (ch.partner_id)) as u(uid2)
    join public.profiles pr on pr.id = u.uid2
    where ch.end_date >= (now() at time zone coalesce(pr.timezone, 'Europe/Madrid'))::date - 1
      and exists (select 1 from public.push_subscriptions ps where ps.user_id = u.uid2)
      and (select count(*) from public.challenge_pings cp where cp.challenge_id = ch.id and cp.user_id = u.uid2) < 3
  loop
    if not public.are_friends(r.creator_id, r.partner_id) then
      continue;
    end if;
    v_today := (now() at time zone coalesce(r.timezone, 'Europe/Madrid'))::date;
    v_hour := extract(hour from now() at time zone coalesce(r.timezone, 'Europe/Madrid'))::integer;
    select p.display_name into v_partner_name
    from public.profiles p where p.id = case when r.uid2 = r.creator_id then r.partner_id else r.creator_id end;

    -- started (solo al invitado y solo si es reciente)
    if r.uid2 = r.partner_id and r.created_at > now() - interval '2 hours' then
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
               public.challenge_label(r.kind, r.category, r.target) || '. Buen trabajo en equipo.',
               '/amigos',
               s.endpoint, s.p256dh, s.auth
        from public.push_subscriptions s where s.user_id = r.uid2;
      end if;
    elsif r.end_date = v_today and v_hour between 18 and 21 and r.end_date > r.start_date then
      insert into public.challenge_pings (challenge_id, user_id, kind) values (r.id, r.uid2, 'last_day')
      on conflict do nothing;
      if found then
        return query
        select 'challenge-' || r.id::text,
               '⚡ Último día del reto con ' || v_partner_name,
               public.challenge_label(r.kind, r.category, r.target) || '. Si os apetece, aún estáis a tiempo.',
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
