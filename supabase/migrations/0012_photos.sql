-- 0012_photos.sql
-- Fotos de perfil y fotos de hábitos ("compartir tu progreso").
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0011.
--
-- Dónde van las imágenes (Supabase Storage, nunca en la base de datos como texto Base64):
--   avatars   PÚBLICO  avatars/<id usuario>/<aleatorio>.webp   (foto de perfil: la ven amigos y solicitudes)
--   evidence  PRIVADO  evidence/<id usuario>/<aleatorio>.webp  (fotos de hábitos)
-- En la base de datos solo se guarda la RUTA del archivo.
-- Las fotos de hábitos solo se ven con enlaces firmados que caducan (1 h) y la política
-- de Storage comprueba en cada petición que eres el dueño o un amigo con permiso.

-- 1. BUCKETS: tamaño máximo y solo JPG, PNG y WebP (nada de ejecutables, SVG, HTML...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('evidence', 'evidence', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. FOTO DE PERFIL: ruta en profiles (siempre dentro de tu carpeta).
alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profiles_avatar_path_own check (
  avatar_path is null or (avatar_path like id::text || '/%' and char_length(avatar_path) <= 200)
);
grant update (avatar_path) on public.profiles to authenticated;

-- 3. PUBLICACIONES DE HÁBITOS: una por hábito y día, con foto y comentario opcional.
--    Privacidad: 'private' (solo yo) o 'friends' (mis amigos). "Público" no está activado.
create table public.habit_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  local_date date not null,
  photo_path text not null unique,
  caption text,
  visibility text not null default 'friends',
  created_at timestamptz not null default now(),
  constraint habit_posts_one_per_day unique (habit_id, local_date),
  constraint habit_posts_caption_length check (caption is null or char_length(caption) <= 200),
  constraint habit_posts_visibility_values check (visibility in ('private', 'friends')),
  constraint habit_posts_path_own check (photo_path like user_id::text || '/%')
);
create index habit_posts_user_created_idx on public.habit_posts (user_id, created_at desc);

alter table public.habit_posts enable row level security;

create policy "habit_posts: ver las propias"
  on public.habit_posts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "habit_posts: editar las propias"
  on public.habit_posts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "habit_posts: borrar las propias"
  on public.habit_posts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Crear solo con publish_habit_post (comprueba que el hábito está hecho). Editar: comentario y privacidad.
revoke all on public.habit_posts from anon, authenticated;
grant select, delete on public.habit_posts to authenticated;
grant update (caption, visibility) on public.habit_posts to authenticated;

-- ¿Puede quien pregunta ver esta foto de hábito? (dueño, o amigo si la publicación es "Mis amigos")
create or replace function public.can_view_evidence(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.habit_posts hp
      where hp.photo_path = p_name
        and hp.visibility = 'friends'
        and public.are_friends(auth.uid(), hp.user_id)
    )
  );
$$;

-- 4. POLÍTICAS DE STORAGE: cada uno escribe y borra SOLO en su carpeta.
create policy "avatars: subir en mi carpeta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: cambiar en mi carpeta"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: borrar en mi carpeta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: ver mi carpeta"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evidence: subir en mi carpeta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "evidence: borrar en mi carpeta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "evidence: ver si tengo permiso"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.can_view_evidence(name));

-- 5. PUBLICAR (o sustituir la de ese día). Devuelve la ruta de la foto anterior para borrarla.
create or replace function public.publish_habit_post(
  p_habit uuid, p_day_offset integer, p_path text, p_caption text, p_visibility text
)
returns table (post_id uuid, replaced_path text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_date date;
  v_caption text := nullif(btrim(coalesce(p_caption, '')), '');
  v_old text;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_day_offset not in (0, -1) then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  if p_visibility not in ('private', 'friends') then
    raise exception 'invalid_visibility' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 200 then
    raise exception 'caption_too_long' using errcode = '22023';
  end if;
  if not exists (select 1 from public.habits h where h.id = p_habit and h.user_id = uid) then
    raise exception 'habit_not_found' using errcode = 'P0002';
  end if;

  v_date := (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = uid), 'Europe/Madrid'))::date + p_day_offset;

  -- Solo se comparte lo que de verdad has hecho ese día
  if not exists (
    select 1 from public.habit_logs l where l.habit_id = p_habit and l.local_date = v_date and l.value > 0
  ) then
    raise exception 'not_completed' using errcode = '22023';
  end if;

  -- La foto tiene que estar ya subida y en TU carpeta
  if p_path is null or p_path not like uid::text || '/%'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'evidence' and o.name = p_path) then
    raise exception 'photo_not_found' using errcode = 'P0002';
  end if;

  select hp.photo_path into v_old from public.habit_posts hp where hp.habit_id = p_habit and hp.local_date = v_date;

  insert into public.habit_posts (user_id, habit_id, local_date, photo_path, caption, visibility)
  values (uid, p_habit, v_date, p_path, v_caption, p_visibility)
  on conflict (habit_id, local_date) do update
    set photo_path = excluded.photo_path, caption = excluded.caption,
        visibility = excluded.visibility, created_at = now()
  returning id into v_id;

  return query select v_id, case when v_old is distinct from p_path then v_old end;
end;
$$;

-- 6. REACCIONES también a publicaciones (antes solo a eventos de XP).
alter table public.reactions alter column event_id drop not null;
alter table public.reactions add column post_id uuid references public.habit_posts (id) on delete cascade;
alter table public.reactions add constraint reactions_one_target check (num_nonnulls(event_id, post_id) = 1);
alter table public.reactions add constraint reactions_one_per_user_post unique (post_id, user_id);
create index reactions_post_idx on public.reactions (post_id);

create or replace function public.react_to_post(p_post uuid, p_emoji text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
  current_emoji text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_emoji is null or p_emoji not in ('🔥', '👏', '💪', '🎉') then
    raise exception 'invalid_emoji' using errcode = '22023';
  end if;
  select hp.user_id into owner from public.habit_posts hp where hp.id = p_post and hp.visibility = 'friends';
  if owner is null or owner = uid or not public.are_friends(uid, owner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select r.emoji into current_emoji from public.reactions r where r.post_id = p_post and r.user_id = uid;
  if current_emoji = p_emoji then
    delete from public.reactions r where r.post_id = p_post and r.user_id = uid;
    return null;
  end if;
  insert into public.reactions (post_id, user_id, emoji)
  values (p_post, uid, p_emoji)
  on conflict (post_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end;
$$;

-- 7. ACTIVIDAD DE AMIGOS con publicaciones y fotos de perfil.
--    Un hábito con publicación visible sale UNA vez (como publicación, con foto); el resto, como antes.
drop function public.get_friend_activity();

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
    -- Publicaciones con foto (el nombre del hábito se ve: has elegido compartirlo)
    select hp.id, 'post', hp.user_id, 'habit', h.title,
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

-- 8. RANKING DE AMIGOS con foto de perfil (cambia lo que devuelve: borrar y crear).
drop function public.get_friends_overview();

create or replace function public.get_friends_overview()
returns table (
  kind text, friendship_id uuid, user_id uuid, display_name text, username text,
  level integer, week_xp integer, current_streak integer, friend_code text,
  avatar_emoji text, avatar_color text, avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_tz text;
  v_ws date;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select p.timezone into v_tz from public.profiles p where p.id = uid;
  -- La semana del ranking: de lunes a domingo, según tu zona horaria
  v_ws := date_trunc('week', (now() at time zone coalesce(v_tz, 'Europe/Madrid')))::date;

  return query
  with people as (
    select 'me'::text as kind, null::uuid as fid, uid as pid
    union all
    select case when x.status = 'accepted' then 'friend'
                when x.addressee_id = uid then 'incoming' else 'outgoing' end,
           x.id,
           case when x.requester_id = uid then x.addressee_id else x.requester_id end
    from public.friendships x
    where uid in (x.requester_id, x.addressee_id)
  )
  select pe.kind, pe.fid, pe.pid, p.display_name, p.username,
    case when pe.kind in ('me', 'friend') then public.level_for_xp(
      (select coalesce(sum(e.amount), 0)::integer from public.xp_events e where e.user_id = pe.pid)) end,
    case when pe.kind in ('me', 'friend') then
      (select coalesce(sum(e.amount), 0)::integer from public.xp_events e
       where e.user_id = pe.pid and e.local_date between v_ws and v_ws + 6) end,
    case when pe.kind in ('me', 'friend') then
      (select s.current_streak from public.compute_streaks(
         pe.pid, (now() at time zone coalesce(p.timezone, 'Europe/Madrid'))::date) s) end,
    case when pe.kind = 'me' then p.friend_code end,
    p.avatar_emoji, p.avatar_color, p.avatar_path
  from people pe
  join public.profiles p on p.id = pe.pid;
end;
$$;

-- 9. PERMISOS
revoke all on function public.publish_habit_post(uuid, integer, text, text, text) from public, anon;
revoke all on function public.react_to_post(uuid, text) from public, anon;
revoke all on function public.get_friend_activity() from public, anon;
revoke all on function public.get_friends_overview() from public, anon;
revoke all on function public.can_view_evidence(text) from public, anon;
grant execute on function public.publish_habit_post(uuid, integer, text, text, text) to authenticated;
grant execute on function public.react_to_post(uuid, text) to authenticated;
grant execute on function public.get_friend_activity() to authenticated;
grant execute on function public.get_friends_overview() to authenticated;
grant execute on function public.can_view_evidence(text) to authenticated; -- la usa la política de Storage
