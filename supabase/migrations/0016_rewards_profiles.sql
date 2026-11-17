-- 0016_rewards_profiles.sql
-- Recompensas cosméticas (insignias, marcos, accesorios, efectos) + perfiles de amigos con privacidad.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0015.
--
-- Seguridad: lo desbloqueado NO se guarda ni lo decide el navegador. Se CALCULA en el servidor
-- con tus datos reales (get_reward_metrics). Equipar algo pasa por equip_rewards, que comprueba
-- que de verdad lo tienes. Son solo cosméticos: no dan XP ni cambian ninguna regla.

-- 1. CATÁLOGO (público para usuarios con sesión: es la "tienda" de lo que se puede conseguir)
create table public.reward_catalog (
  id text primary key,
  kind text not null,      -- badge | frame | accessory | effect
  rarity text not null,    -- common | special | epic | legendary
  title text not null,
  description text not null,
  metric text not null,    -- qué dato se mide (ver get_reward_metrics)
  threshold integer not null,
  sort integer not null default 0,
  constraint reward_kind_values check (kind in ('badge', 'frame', 'accessory', 'effect')),
  constraint reward_rarity_values check (rarity in ('common', 'special', 'epic', 'legendary')),
  constraint reward_threshold_positive check (threshold > 0)
);
alter table public.reward_catalog enable row level security;
create policy "reward_catalog: lo ve cualquiera con sesión"
  on public.reward_catalog for select to authenticated using (true);
revoke all on public.reward_catalog from anon, authenticated;
grant select on public.reward_catalog to authenticated;

insert into public.reward_catalog (id, kind, rarity, title, description, metric, threshold, sort) values
  -- Insignias: constancia
  ('badge_first', 'badge', 'common', 'Primer paso', 'Completa tu primer hábito', 'habits_done', 1, 10),
  ('badge_streak7', 'badge', 'common', 'Constancia I', 'Racha de 7 días', 'best_streak', 7, 20),
  ('badge_streak30', 'badge', 'special', 'Constancia II', 'Racha de 30 días', 'best_streak', 30, 21),
  ('badge_streak100', 'badge', 'epic', 'Constancia III', 'Racha de 100 días', 'best_streak', 100, 22),
  ('badge_streak300', 'badge', 'legendary', 'Constancia legendaria', 'Racha de 300 días', 'best_streak', 300, 23),
  -- Insignias: volumen y nivel
  ('badge_done50', 'badge', 'common', 'Cogiendo ritmo', 'Completa 50 hábitos', 'habits_done', 50, 30),
  ('badge_done250', 'badge', 'special', 'Imparable', 'Completa 250 hábitos', 'habits_done', 250, 31),
  ('badge_done1000', 'badge', 'epic', 'Mil victorias', 'Completa 1000 hábitos', 'habits_done', 1000, 32),
  ('badge_level10', 'badge', 'special', 'Nivel 10', 'Llega al nivel 10', 'level', 10, 40),
  ('badge_level25', 'badge', 'epic', 'Nivel 25', 'Llega al nivel 25', 'level', 25, 41),
  -- Insignias: categorías (cada uno progresa con SUS hábitos)
  ('badge_study', 'badge', 'special', 'Ratón de biblioteca', 'Completa 25 hábitos de Estudio', 'study_done', 25, 50),
  ('badge_sport', 'badge', 'special', 'Atleta', 'Completa 25 hábitos de Deporte', 'sport_done', 25, 51),
  ('badge_health', 'badge', 'special', 'Cuerpo sano', 'Completa 25 hábitos de Salud', 'health_done', 25, 52),
  ('badge_mind', 'badge', 'special', 'Mente en calma', 'Completa 25 hábitos de Mente', 'mind_done', 25, 53),
  -- Insignias: social
  ('badge_friends3', 'badge', 'common', 'Buena compañía', 'Ten 3 amigos', 'friends', 3, 60),
  ('badge_photo5', 'badge', 'common', 'Reportero', 'Comparte 5 fotos de tus logros', 'posts', 5, 61),
  ('badge_challenge', 'badge', 'special', 'Trabajo en equipo', 'Cumple un reto con un amigo', 'challenges_won', 1, 62),
  ('badge_shared30', 'badge', 'epic', 'Fuego compartido', 'Racha compartida de 30 días', 'shared_best', 30, 63),
  -- Marcos para el avatar
  ('frame_teal', 'frame', 'common', 'Marco turquesa', 'Llega al nivel 3', 'level', 3, 100),
  ('frame_flame', 'frame', 'special', 'Marco de fuego', 'Racha de 30 días', 'best_streak', 30, 101),
  ('frame_friends', 'frame', 'epic', 'Marco de la amistad', 'Racha compartida de 50 días', 'shared_best', 50, 102),
  ('frame_gold', 'frame', 'epic', 'Marco dorado', 'Racha de 100 días', 'best_streak', 100, 103),
  ('frame_legend', 'frame', 'legendary', 'Marco legendario', 'Racha de 300 días', 'best_streak', 300, 104),
  -- Accesorios (del panda de Progress&Go)
  ('acc_carrot', 'accessory', 'common', 'Zanahoria', 'Completa 25 hábitos', 'habits_done', 25, 200),
  ('acc_bamboo', 'accessory', 'common', 'Brote de bambú', 'Racha de 14 días', 'best_streak', 14, 201),
  ('acc_headband', 'accessory', 'special', 'Cinta deportiva', 'Completa 25 hábitos de Deporte', 'sport_done', 25, 202),
  ('acc_glasses', 'accessory', 'special', 'Gafas de estudio', 'Completa 25 hábitos de Estudio', 'study_done', 25, 203),
  ('acc_crown', 'accessory', 'epic', 'Corona', 'Llega al nivel 15', 'level', 15, 204),
  ('acc_legend_crown', 'accessory', 'legendary', 'Corona legendaria', 'Racha de 300 días', 'best_streak', 300, 205),
  -- Efectos
  ('fx_sparkles', 'effect', 'epic', 'Destellos', 'Completa 500 hábitos', 'habits_done', 500, 300),
  ('fx_aura', 'effect', 'legendary', 'Aura de fuego', 'Racha compartida de 100 días', 'shared_best', 100, 301);

-- 2. LO EQUIPADO y la PRIVACIDAD, en el perfil
alter table public.profiles
  add column equipped_frame text references public.reward_catalog (id),
  add column equipped_accessory text references public.reward_catalog (id),
  add column equipped_effect text references public.reward_catalog (id),
  add column showcase_badges text[] not null default '{}',
  add column share_streak boolean not null default true,       -- mis amigos ven mi racha
  add column share_stats boolean not null default true,        -- mis amigos ven mis estadísticas y hábitos "Mis amigos"
  add column share_achievements boolean not null default true; -- mis amigos ven mis logros
alter table public.profiles add constraint profiles_showcase_max check (cardinality(showcase_badges) <= 3);

-- La privacidad la cambia cada uno directamente; lo equipado SOLO con equip_rewards (comprueba que lo tienes)
grant update (share_streak, share_stats, share_achievements) on public.profiles to authenticated;

-- 3. MÉTRICAS reales de un usuario (interna: no se da a la app)
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
    and (select coalesce(sum(e.amount), 0) from public.xp_events e
         where e.user_id in (c.creator_id, c.partner_id)
           and e.local_date between c.week_start and c.week_start + 6) >= c.target_xp;

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

-- 4. MIS RECOMPENSAS: catálogo + mi valor actual + si está desbloqueada + qué llevo equipado
create or replace function public.get_my_rewards()
returns table (
  id text, kind text, rarity text, title text, description text, metric text, threshold integer, sort integer,
  value integer, unlocked boolean, equipped boolean, showcased boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m jsonb;
  p record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  m := public.get_reward_metrics(uid);
  select pr.equipped_frame, pr.equipped_accessory, pr.equipped_effect, pr.showcase_badges into p
  from public.profiles pr where pr.id = uid;

  return query
  select c.id, c.kind, c.rarity, c.title, c.description, c.metric, c.threshold, c.sort,
    coalesce((m ->> c.metric)::integer, 0),
    coalesce((m ->> c.metric)::integer, 0) >= c.threshold,
    c.id in (p.equipped_frame, p.equipped_accessory, p.equipped_effect),
    c.id = any (p.showcase_badges)
  from public.reward_catalog c
  order by c.sort;
end;
$$;

-- 5. EQUIPAR: marco, accesorio, efecto y hasta 3 insignias destacadas (null = quitar).
--    Rechaza cualquier cosa que no tengas desbloqueada o que no sea del tipo correcto.
create or replace function public.equip_rewards(p_frame text, p_accessory text, p_effect text, p_badges text[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m jsonb;
  v_badges text[] := coalesce(p_badges, '{}');
  item record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if cardinality(v_badges) > 3 then
    raise exception 'too_many_badges' using errcode = '22023';
  end if;
  m := public.get_reward_metrics(uid);

  for item in
    select x.wanted, x.expected_kind
    from (values (p_frame, 'frame'), (p_accessory, 'accessory'), (p_effect, 'effect')) as x(wanted, expected_kind)
    where x.wanted is not null
    union all
    select b, 'badge' from unnest(v_badges) as b
  loop
    if not exists (
      select 1 from public.reward_catalog c
      where c.id = item.wanted and c.kind = item.expected_kind
        and coalesce((m ->> c.metric)::integer, 0) >= c.threshold
    ) then
      raise exception 'reward_locked' using errcode = '42501';
    end if;
  end loop;

  update public.profiles
  set equipped_frame = p_frame, equipped_accessory = p_accessory, equipped_effect = p_effect,
      showcase_badges = (select coalesce(array_agg(distinct b), '{}') from unnest(v_badges) b)
  where id = uid;
end;
$$;

-- 6. PERFIL DE UN AMIGO (o el tuyo). Solo si sois amigos. Respeta su privacidad:
--    - siempre: nombre, usuario, foto/color, frase, nivel, XP, lo que lleva equipado
--    - racha: si share_streak · logros: si share_achievements
--    - estadísticas y hábitos: si share_stats, y SOLO hábitos con visibilidad "Mis amigos"
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
                from (select hp.id, hp.photo_path, hp.caption, hp.local_date, hp.created_at, h.title
                      from public.habit_posts hp join public.habits h on h.id = hp.habit_id
                      where hp.user_id = p_user and hp.visibility = 'friends'
                      order by hp.created_at desc limit 9) x)
    );
  end if;

  return result;
end;
$$;

-- 7. PERMISOS
revoke all on function public.get_reward_metrics(uuid) from public, anon, authenticated;
revoke all on function public.get_my_rewards() from public, anon;
revoke all on function public.equip_rewards(text, text, text, text[]) from public, anon;
revoke all on function public.get_friend_profile(uuid) from public, anon;
grant execute on function public.get_my_rewards() to authenticated;
grant execute on function public.equip_rewards(text, text, text, text[]) to authenticated;
grant execute on function public.get_friend_profile(uuid) to authenticated;
