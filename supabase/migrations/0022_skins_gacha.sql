-- 0022_skins_gacha.sql
-- Skins del panda: cápsula misteriosa (gacha) que se abre con TICKETS.
--   * Cada 7 días cumplidos (llegar al 70 % de tus hábitos del día; no hace falta que sean seguidos) = 1 ticket.
--   * Una cápsula = una skin al azar entre las que aún NO tienes (el servidor elige; el cliente no puede trucarlo).
--   * Las skins son MISTERIOSAS: el catálogo es interno y solo ves las que has conseguido.
--   * La skin equipada sustituye al panda de la app (compañero).
--   * Solo cosmético: no da XP ni ventajas.
-- MODO PRUEBA: app_flags.infinite_tickets = true da tickets ilimitados (las skins conseguidas así se marcan "free").
--   Para quitarlo:  update public.app_flags set value = false where key = 'infinite_tickets';
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0021.

create table public.app_flags (
  key text primary key,
  value boolean not null
);
alter table public.app_flags enable row level security; -- sin políticas: interna
revoke all on public.app_flags from anon, authenticated;
insert into public.app_flags (key, value) values ('infinite_tickets', true);

create table public.skin_catalog (
  id text primary key,
  name text not null,
  file text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  weight integer not null default 1 check (weight > 0)
);
alter table public.skin_catalog enable row level security; -- sin políticas: interna (nadie lista el catálogo)
revoke all on public.skin_catalog from anon, authenticated;
insert into public.skin_catalog (id, name, file, width, height) values
  ('s_da84f6836f', 'Panda Astronauta', 'da84f6836f.webp', 435, 465),
  ('s_fb94fd82ab', 'Panda Buceador', 'fb94fd82ab.webp', 484, 453),
  ('s_e1969c542c', 'Panda Dino', 'e1969c542c.webp', 447, 462),
  ('s_ee4f8edd93', 'Panda DJ', 'ee4f8edd93.webp', 520, 389),
  ('s_c688da4ae1', 'Rey Panda', 'c688da4ae1.webp', 471, 470);

create table public.user_skins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skin_id text not null references public.skin_catalog (id) on delete cascade,
  obtained_at timestamptz not null default now(),
  free boolean not null default false, -- conseguida en modo prueba (no gastó ticket)
  primary key (user_id, skin_id)
);
alter table public.user_skins enable row level security; -- sin políticas: solo las RPC
revoke all on public.user_skins from anon, authenticated;

alter table public.profiles add column equipped_skin text references public.skin_catalog (id) on delete set null;

-- Tickets de un usuario (interna): días cumplidos, ganados, gastados y disponibles
create or replace function public.skin_tickets(p_user uuid)
returns table (ok_days integer, earned integer, spent integer, available integer, unlimited boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from date;
  v_today date := public.user_today(p_user);
  v_ok integer := 0;
  v_spent integer;
  v_unl boolean;
begin
  select min(h.start_date) into v_from from public.habits h where h.user_id = p_user;
  if v_from is not null and v_from <= v_today then
    select count(*) into v_ok
    from public.day_stats_range(p_user, v_from, v_today) d
    where public.day_state(d.scheduled, d.done) = 'ok';
  end if;
  select count(*) into v_spent from public.user_skins us where us.user_id = p_user and not us.free;
  select coalesce((select f.value from public.app_flags f where f.key = 'infinite_tickets'), false) into v_unl;
  return query select v_ok, v_ok / 7, v_spent, greatest(0, v_ok / 7 - v_spent), v_unl;
end;
$$;

-- Mis skins: tickets, la equipada y las que tengo (nada más: el resto es un misterio)
create or replace function public.get_my_skins()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t record;
  v_equipped text;
  v_owned jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into t from public.skin_tickets(uid);
  select p.equipped_skin into v_equipped from public.profiles p where p.id = uid;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'file', c.file, 'width', c.width, 'height', c.height, 'obtained_at', us.obtained_at)
      order by us.obtained_at), '[]'::jsonb)
  into v_owned
  from public.user_skins us join public.skin_catalog c on c.id = us.skin_id
  where us.user_id = uid;

  return jsonb_build_object(
    'ok_days', t.ok_days, 'earned', t.earned, 'spent', t.spent, 'available', t.available,
    'unlimited', t.unlimited, 'days_per_ticket', 7,
    'equipped', v_equipped, 'owned', v_owned);
end;
$$;

-- ABRIR UNA CÁPSULA: gasta 1 ticket y da una skin que aún no tienes (al azar)
create or replace function public.open_skin_capsule()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t record;
  c public.skin_catalog%rowtype;
  v_new boolean := true;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  -- una sola apertura a la vez por persona (dos toques seguidos no gastan dos veces el mismo ticket)
  perform 1 from public.profiles p where p.id = uid for update;

  select * into t from public.skin_tickets(uid);
  if not t.unlimited and t.available <= 0 then
    raise exception 'no_tickets' using errcode = '22023';
  end if;

  select k.* into c
  from public.skin_catalog k
  where not exists (select 1 from public.user_skins us where us.user_id = uid and us.skin_id = k.id)
  order by -ln(1 - random()) / k.weight
  limit 1;

  if not found then
    if not t.unlimited then
      raise exception 'all_owned' using errcode = '22023'; -- no se gasta el ticket
    end if;
    -- modo prueba: se puede repetir para ver la animación
    select k.* into c from public.skin_catalog k order by random() limit 1;
    v_new := false;
  end if;

  if v_new then
    insert into public.user_skins (user_id, skin_id, free) values (uid, c.id, t.unlimited);
  end if;

  select * into t from public.skin_tickets(uid);
  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'file', c.file, 'width', c.width, 'height', c.height,
    'is_new', v_new, 'available', t.available, 'unlimited', t.unlimited);
end;
$$;

-- EQUIPAR (o quitar con null) una skin que ya tengo
create or replace function public.equip_skin(p_skin text)
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
  if p_skin is not null
     and not exists (select 1 from public.user_skins us where us.user_id = uid and us.skin_id = p_skin) then
    raise exception 'not_owned' using errcode = '42501';
  end if;
  update public.profiles set equipped_skin = p_skin where id = uid;
end;
$$;

-- PERMISOS
revoke all on function public.skin_tickets(uuid) from public, anon, authenticated;
revoke all on function public.get_my_skins() from public, anon;
revoke all on function public.open_skin_capsule() from public, anon;
revoke all on function public.equip_skin(text) from public, anon;
grant execute on function public.get_my_skins() to authenticated;
grant execute on function public.open_skin_capsule() to authenticated;
grant execute on function public.equip_skin(text) to authenticated;
