-- 0006_friends.sql
-- Amigos: código de amigo, solicitudes y ranking semanal.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0005.
-- Privacidad: de un amigo solo se comparte nombre, usuario, nivel, XP de la semana y racha.
-- Nunca sus hábitos ni sus recordatorios. Todo pasa por funciones del servidor: los perfiles siguen cerrados.

-- 1. CÓDIGO DE AMIGO: 8 letras/números fáciles de dictar (sin 0/O ni 1/I).
create or replace function public.new_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 símbolos
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(uuid_send(gen_random_uuid()), 0) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.friend_code = code);
  end loop;
  return code;
end;
$$;

alter table public.profiles add column friend_code text unique;
update public.profiles set friend_code = public.new_friend_code() where friend_code is null;
alter table public.profiles alter column friend_code set not null;
alter table public.profiles alter column friend_code set default public.new_friend_code();

-- El navegador solo puede cambiar estos datos de su perfil (nunca el id ni el código de amigo).
revoke update on public.profiles from authenticated;
grant update (username, display_name, timezone) on public.profiles to authenticated;

-- 2. AMISTADES: una fila por pareja. pending = solicitud enviada, accepted = ya sois amigos.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade, -- quien la envía
  addressee_id uuid not null references public.profiles (id) on delete cascade, -- quien la recibe
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_status_values check (status in ('pending', 'accepted')),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Una sola fila por pareja, da igual quién envió la solicitud.
create unique index friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "friendships: ver las propias"
  on public.friendships for select
  to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- Sin escritura directa: solo mediante las funciones de abajo.
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

-- 3. ENVIAR SOLICITUD con el código de la otra persona.
--    Si esa persona ya te había enviado una a ti, se acepta directamente.
create or replace function public.send_friend_request(p_code text)
returns table (friend_name text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_other uuid;
  v_name text;
  f public.friendships%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_code) <> 8 then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  -- Límite anti-abuso: como mucho 20 solicitudes enviadas sin responder
  if (select count(*) from public.friendships x where x.requester_id = uid and x.status = 'pending') >= 20 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  select p.id, p.display_name into v_other, v_name from public.profiles p where p.friend_code = v_code;
  if v_other is null then
    raise exception 'code_not_found' using errcode = 'P0002';
  end if;
  if v_other = uid then
    raise exception 'own_code' using errcode = '22023';
  end if;

  select * into f from public.friendships x
  where least(x.requester_id, x.addressee_id) = least(uid, v_other)
    and greatest(x.requester_id, x.addressee_id) = greatest(uid, v_other)
  for update;

  if found then
    if f.status = 'accepted' then
      raise exception 'already_friends' using errcode = '22023';
    end if;
    if f.requester_id = uid then
      raise exception 'already_sent' using errcode = '22023';
    end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
    return query select v_name, 'accepted'::text;
    return;
  end if;

  insert into public.friendships (requester_id, addressee_id) values (uid, v_other);
  return query select v_name, 'pending'::text;
end;
$$;

-- 4. RESPONDER a una solicitud recibida (solo quien la recibe). Rechazar la borra.
create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
    where id = p_id and addressee_id = uid and status = 'pending';
  else
    delete from public.friendships where id = p_id and addressee_id = uid and status = 'pending';
  end if;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 5. QUITAR un amigo o cancelar una solicitud que enviaste.
create or replace function public.remove_friend(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from public.friendships x
  where x.id = p_id
    and ((x.status = 'accepted' and uid in (x.requester_id, x.addressee_id))
      or (x.status = 'pending' and x.requester_id = uid));
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- 6. MI PANEL DE AMIGOS: mi código, las solicitudes y el ranking de la semana (tú + tus amigos).
--    kind: me | friend | incoming (me la han enviado) | outgoing (la envié yo).
--    De las solicitudes solo se ve el nombre; nivel, XP y racha solo de amigos aceptados.
create or replace function public.get_friends_overview()
returns table (
  kind text, friendship_id uuid, user_id uuid, display_name text, username text,
  level integer, week_xp integer, current_streak integer, friend_code text
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
    case when pe.kind = 'me' then p.friend_code end
  from people pe
  join public.profiles p on p.id = pe.pid;
end;
$$;

-- 7. PERMISOS
revoke all on function public.new_friend_code() from public, anon, authenticated;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.get_friends_overview() from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friends_overview() to authenticated;
