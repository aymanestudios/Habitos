-- 0023_skin_silhouettes.sql
-- Apertura de cápsula especial: salen las SOMBRAS de todas las skins y un foco va pasando hasta iluminar la tuya.
--   * Cada skin tiene una silueta (public/skins/sil/<código>.webp) con otro nombre aleatorio: no delata cuál es cuál.
--   * open_skin_capsule devuelve las siluetas en orden aleatorio y la posición de la ganadora (la elige el servidor, como antes).
--   * Las skins se animan por capas (public/skins/<código>/manifest.json); eso es solo del cliente.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0022.

alter table public.skin_catalog add column silhouette text;
update public.skin_catalog set silhouette = 'c96c42e985.webp' where file = 'da84f6836f.webp';
update public.skin_catalog set silhouette = 'a14523f246.webp' where file = 'fb94fd82ab.webp';
update public.skin_catalog set silhouette = 'aa668b2cc0.webp' where file = 'e1969c542c.webp';
update public.skin_catalog set silhouette = 'cfa17371c9.webp' where file = 'ee4f8edd93.webp';
update public.skin_catalog set silhouette = '07416e3023.webp' where file = 'c688da4ae1.webp';

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
  v_sils jsonb;
  v_winner integer;
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

  -- 0023: sombras de TODAS las skins en orden aleatorio (sin nombres ni ids) y en qué posición está la tuya
  select jsonb_agg(x.silhouette order by x.pos), (array_agg(x.pos order by x.pos) filter (where x.id = c.id))[1] - 1
  into v_sils, v_winner
  from (
    select k.id, k.silhouette, row_number() over (order by random()) as pos
    from public.skin_catalog k where k.silhouette is not null
  ) x;

  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'file', c.file, 'width', c.width, 'height', c.height,
    'is_new', v_new, 'available', t.available, 'unlimited', t.unlimited,
    'silhouettes', coalesce(v_sils, '[]'::jsonb), 'winner', coalesce(v_winner, -1));
end;
$$;

revoke all on function public.open_skin_capsule() from public, anon;
grant execute on function public.open_skin_capsule() to authenticated;
