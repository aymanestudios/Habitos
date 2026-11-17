-- 0011_profile_style.sql
-- Personalizar el perfil: emoji y color del avatar y una frase corta.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0010.
-- Tus amigos ven tu emoji y tu color (no tu frase, que solo sale en tu perfil).

alter table public.profiles
  add column avatar_emoji text,
  add column avatar_color text not null default 'teal',
  add column bio text;

-- Solo valores de la lista (así nadie mete texto raro en el avatar que ven otros)
alter table public.profiles add constraint profiles_avatar_emoji_values check (
  avatar_emoji is null or avatar_emoji in (
    '🐼', '🦊', '🐯', '🐸', '🐙', '🦄', '🐧', '🦁', '🐨', '🐳',
    '🌵', '⚡', '🔥', '🌙', '🎧', '🎮', '⚽', '📚'
  )
);
alter table public.profiles add constraint profiles_avatar_color_values check (
  avatar_color in ('teal', 'coral', 'violet', 'amber', 'green', 'blue', 'pink')
);
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 80);

grant update (avatar_emoji, avatar_color, bio) on public.profiles to authenticated;

-- El ranking de amigos devuelve también emoji y color.
-- Cambia lo que devuelve la función, así que hay que borrarla y crearla de nuevo.
drop function public.get_friends_overview();

create or replace function public.get_friends_overview()
returns table (
  kind text, friendship_id uuid, user_id uuid, display_name text, username text,
  level integer, week_xp integer, current_streak integer, friend_code text,
  avatar_emoji text, avatar_color text
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
    p.avatar_emoji, p.avatar_color
  from people pe
  join public.profiles p on p.id = pe.pid;
end;
$$;

revoke all on function public.get_friends_overview() from public, anon;
grant execute on function public.get_friends_overview() to authenticated;
