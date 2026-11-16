-- 0007_activity_categories.sql
-- Actividad de amigos, reacciones y categorías de hábitos.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0006.
-- Privacidad: un amigo solo ve que completaste algo. El nombre del hábito solo se ve
-- si ese hábito tiene visibilidad "Mis amigos". Nunca se ven recordatorios ni hábitos privados.

-- 1. CATEGORÍAS de hábitos (para ordenar y filtrar).
alter table public.habits add column category text not null default 'other';
alter table public.habits add constraint habits_category_values check (
  category in ('health', 'sport', 'study', 'mind', 'work', 'home', 'social', 'other')
);
grant insert (category) on public.habits to authenticated;
grant update (category) on public.habits to authenticated;

-- 2. REACCIONES a la actividad de un amigo. Una por persona y evento (puedes cambiarla o quitarla).
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.xp_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint reactions_emoji_values check (emoji in ('🔥', '👏', '💪', '🎉')),
  constraint reactions_one_per_user unique (event_id, user_id)
);
create index reactions_event_idx on public.reactions (event_id);

alter table public.reactions enable row level security;

create policy "reactions: ver las propias"
  on public.reactions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Sin escritura directa: solo mediante react_to_activity.
revoke all on public.reactions from anon, authenticated;
grant select on public.reactions to authenticated;

-- 3. ¿Somos amigos de verdad? (solicitud aceptada). Interna: no se da a la app.
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a))
  );
$$;

-- 4. ACTIVIDAD RECIENTE de mis amigos (últimos 7 días, máximo 30 eventos).
--    kind: habit | weekly_total | day_bonus. habit_title solo si el hábito es visible para amigos.
create or replace function public.get_friend_activity()
returns table (
  event_id uuid, user_id uuid, display_name text, kind text, habit_title text,
  amount integer, local_date date, created_at timestamptz,
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
  select e.id, e.user_id, p.display_name, e.kind,
    case when h.visibility = 'friends' then h.title end,
    e.amount, e.local_date, e.created_at,
    coalesce((select jsonb_object_agg(r.emoji, r.n)
              from (select r0.emoji, count(*)::integer as n
                    from public.reactions r0 where r0.event_id = e.id group by r0.emoji) r), '{}'::jsonb),
    (select r1.emoji from public.reactions r1 where r1.event_id = e.id and r1.user_id = uid),
    (select count(*)::integer from public.reactions r2 where r2.event_id = e.id)
  from public.xp_events e
  join public.profiles p on p.id = e.user_id
  left join public.habits h on h.id = e.habit_id
  where e.user_id <> uid
    and public.are_friends(uid, e.user_id)
    and e.created_at > now() - interval '7 days'
    and e.amount > 0
  order by e.created_at desc
  limit 30;
end;
$$;

-- 5. REACCIONAR: poner, cambiar o quitar (si repites el mismo emoji se quita).
--    Solo a eventos de amigos. Devuelve la reacción que queda (o null).
create or replace function public.react_to_activity(p_event uuid, p_emoji text)
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

  select e.user_id into owner from public.xp_events e where e.id = p_event;
  if owner is null or owner = uid or not public.are_friends(uid, owner) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select r.emoji into current_emoji
  from public.reactions r where r.event_id = p_event and r.user_id = uid;

  if current_emoji = p_emoji then
    delete from public.reactions r where r.event_id = p_event and r.user_id = uid;
    return null;
  end if;

  insert into public.reactions (event_id, user_id, emoji)
  values (p_event, uid, p_emoji)
  on conflict (event_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end;
$$;

-- 6. PERMISOS: las funciones internas no se dan a nadie; las de la app, solo a usuarios con sesión.
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_friend_activity() from public, anon;
revoke all on function public.react_to_activity(uuid, text) from public, anon;
grant execute on function public.get_friend_activity() to authenticated;
grant execute on function public.react_to_activity(uuid, text) to authenticated;
